# Copyright (C) 2026 Jonas Immanuel Frey - Licensed under GPLv2. See LICENSE file for details.

import sys
import os
import time
import subprocess

n_sec__start = time.monotonic()
a_o_timing = []

def f_n_sec__elapsed():
    return time.monotonic() - n_sec__start

def f_s_ts():
    n_elapsed = f_n_sec__elapsed()
    n_min = int(n_elapsed // 60)
    n_sec = n_elapsed % 60
    return f"[{n_min:02d}:{n_sec:06.3f}]"

def f_log(s_msg):
    print(f"{f_s_ts()} {s_msg}", flush=True)

def f_time_start(s_name):
    return { 's_name': s_name, 'n_sec__start': time.monotonic() }

def f_time_end(o_timer):
    n_sec__elapsed = time.monotonic() - o_timer['n_sec__start']
    a_o_timing.append({ 's_name': o_timer['s_name'], 'n_sec': n_sec__elapsed })
    f_log(f"{o_timer['s_name']} ({n_sec__elapsed:.3f}s)")
    return n_sec__elapsed

# --- 1. dependency guard ---

try:
    import json
except ImportError:
    print("Missing required package: json")
    sys.exit(1)

try:
    import argparse
except ImportError:
    print("Missing required package: argparse")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("Missing required package: python-dotenv")
    print("\nUse a virtual environment:\n")
    print("  python3 -m venv venv")
    print("  source venv/bin/activate")
    print("  pip install python-dotenv")
    sys.exit(1)

# check ffmpeg
try:
    subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
except (FileNotFoundError, subprocess.CalledProcessError):
    print("Missing required binary: ffmpeg")
    print("Install it: sudo apt-get install -y ffmpeg")
    sys.exit(1)

# --- 2. argument parsing & summary ---

s_path__script_dir = os.path.dirname(os.path.abspath(__file__))
s_path__root_dir = os.path.dirname(s_path__script_dir)
s_path__env = os.path.join(s_path__root_dir, '.env')
if os.path.exists(s_path__env):
    load_dotenv(s_path__env)

s_uuid__default = os.environ.get('S_UUID', '')
s_path_dir__export_default = os.path.join(s_path__root_dir, '.gitignored', 'export')

o_parser = argparse.ArgumentParser(
    description="Render a composition by cutting and concatenating video segments via ffmpeg. Reads event data from stdin as JSON."
)
o_parser.add_argument("s_path_video", help="Path to the source video file")
o_parser.add_argument("--s-uuid", default=s_uuid__default, help="S_UUID for IPC output (default from .env)")
o_parser.add_argument("--s-name", default="composition", help="Output filename (without extension)")
o_parser.add_argument("--s-path-dir-output", default=s_path_dir__export_default, help="Output directory for rendered video")

o_arg = o_parser.parse_args()
s_path_video = o_arg.s_path_video
s_uuid = o_arg.s_uuid
s_name = o_arg.s_name
s_path_dir__output = o_arg.s_path_dir_output

# detect which args were explicitly provided via sys.argv
a_s_arg__provided = set()
for s_a in sys.argv[1:]:
    if s_a.startswith('--'):
        a_s_arg__provided.add(s_a.split('=')[0])

def f_s_source(s_flag):
    return "(provided)" if s_flag in a_s_arg__provided else "(default)"

print("  +-Arguments -------------------------------------------+")
print(f"  | s_path_video        {s_path_video[:25]:30s} {'(provided)':12s}|")
print(f"  | --s-uuid            {s_uuid[:25]:30s} {f_s_source('--s-uuid'):12s}|")
print(f"  | --s-name            {s_name[:25]:30s} {f_s_source('--s-name'):12s}|")
print(f"  | --s-path-dir-output {s_path_dir__output[:25]:30s} {f_s_source('--s-path-dir-output'):12s}|")
print("  +------------------------------------------------------+", flush=True)

if not os.path.exists(s_path_video):
    print(f"Error: video file not found: {s_path_video}", file=sys.stderr)
    sys.exit(1)

# read event data from stdin
f_log("Reading event data from stdin...")
s_stdin = sys.stdin.read().strip()
if not s_stdin:
    print("Error: no event data on stdin", file=sys.stderr)
    sys.exit(1)

a_o_event = json.loads(s_stdin)
if not a_o_event or len(a_o_event) == 0:
    print("Error: empty event list", file=sys.stderr)
    sys.exit(1)

f_log(f"Received {len(a_o_event)} events to render")

# --- 3. processing with logging & timing ---

o_timer__mkdir = f_time_start("create_output_dir")
os.makedirs(s_path_dir__output, exist_ok=True)
f_time_end(o_timer__mkdir)

# sanitize filename
s_name_safe = "".join(c if c.isalnum() or c in '-_' else '_' for c in s_name)
s_path_output = os.path.join(s_path_dir__output, f"{s_name_safe}.mp4")

# build ffmpeg filter complex: trim each segment, concat them
o_timer__build_filter = f_time_start("build_filter_complex")

a_s_filter = []
a_s_concat_input = []
n_cnt = len(a_o_event)

for n_idx, o_event in enumerate(a_o_event):
    n_sec_start = o_event['n_ms_start'] / 1000.0
    n_sec_duration = o_event['n_ms_duration'] / 1000.0
    n_sec_end = n_sec_start + n_sec_duration

    # trim video and audio
    a_s_filter.append(
        f"[0:v]trim=start={n_sec_start:.3f}:end={n_sec_end:.3f},setpts=PTS-STARTPTS[v{n_idx}]"
    )
    a_s_filter.append(
        f"[0:a]atrim=start={n_sec_start:.3f}:end={n_sec_end:.3f},asetpts=PTS-STARTPTS[a{n_idx}]"
    )
    a_s_concat_input.append(f"[v{n_idx}][a{n_idx}]")

s_concat = "".join(a_s_concat_input) + f"concat=n={n_cnt}:v=1:a=1[outv][outa]"
a_s_filter.append(s_concat)

s_filter_complex = ";".join(a_s_filter)
f_log(f"Filter complex: {len(a_s_filter)} filter stages for {n_cnt} segments")
f_time_end(o_timer__build_filter)

# run ffmpeg
o_timer__render = f_time_start("ffmpeg_render")
f_log(f"Rendering to: {s_path_output}")

a_s_cmd = [
    "ffmpeg", "-y",
    "-i", s_path_video,
    "-filter_complex", s_filter_complex,
    "-map", "[outv]",
    "-map", "[outa]",
    "-c:v", "libx264",
    "-preset", "fast",
    "-c:a", "aac",
    "-progress", "pipe:1",
    s_path_output,
]

o_proc = subprocess.Popen(
    a_s_cmd,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    universal_newlines=True,
)

# stream progress
for s_line in o_proc.stdout:
    s_line = s_line.strip()
    if s_line:
        print(f"[render] {s_line}", flush=True)

o_proc.wait()
s_stderr = o_proc.stderr.read()

if o_proc.returncode != 0:
    print(f"Error: ffmpeg failed (code {o_proc.returncode}): {s_stderr[-500:]}", file=sys.stderr)
    sys.exit(2)

n_sec__render = f_time_end(o_timer__render)

# get output file size
n_bytes = os.path.getsize(s_path_output)
f_log(f"Output: {s_path_output} ({n_bytes} bytes)")

# --- 4. machine-readable output (IPC protocol) ---

o_result = {
    's_path_output': os.path.abspath(s_path_output),
    's_name': s_name_safe,
    'n_bytes': n_bytes,
    'n_cnt__event': n_cnt,
    'n_sec__render': round(n_sec__render, 3),
}

if s_uuid:
    s_json = json.dumps(o_result)
    print(f"{s_uuid}_start_json")
    print(s_json)
    print(f"{s_uuid}_end_json")

# --- 5. performance summary ---

n_sec__total = f_n_sec__elapsed()
print("  +-Performance -----------------------------------------+")
for o_t in a_o_timing:
    print(f"  | {o_t['s_name']:25s} {o_t['n_sec']:8.3f}s               |")
print(f"  | {'---':25s} {'--------':8s}                |")
print(f"  | {'Total':25s} {n_sec__total:8.3f}s               |")
print("  +------------------------------------------------------+")

sys.exit(0)
