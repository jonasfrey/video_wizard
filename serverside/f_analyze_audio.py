# Copyright (C) 2026 Jonas Immanuel Frey - Licensed under GPLv2. See LICENSE file for details.

import sys
import os
import time

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
    print(f"{f_s_ts()} {s_msg}")

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

try:
    import torch
except ImportError:
    print("Missing required package: torch")
    print("\nUse a virtual environment:\n")
    print("  python3 -m venv venv")
    print("  source venv/bin/activate")
    print("  pip install torch")
    sys.exit(1)

try:
    import whisper
except ImportError:
    print("Missing required package: openai-whisper")
    print("\nUse a virtual environment:\n")
    print("  python3 -m venv venv")
    print("  source venv/bin/activate")
    print("  pip install openai-whisper")
    sys.exit(1)

try:
    from transformers import AutoProcessor, AutoModelForAudioClassification
except ImportError:
    print("Missing required package: transformers")
    print("\nUse a virtual environment:\n")
    print("  python3 -m venv venv")
    print("  source venv/bin/activate")
    print("  pip install transformers")
    sys.exit(1)

try:
    import numpy as np
except ImportError:
    print("Missing required package: numpy")
    print("\nUse a virtual environment:\n")
    print("  python3 -m venv venv")
    print("  source venv/bin/activate")
    print("  pip install numpy")
    sys.exit(1)

try:
    import wave
except ImportError:
    print("Missing required package: wave (should be in stdlib)")
    sys.exit(1)

# --- 2. argument parsing & summary ---

s_path__script_dir = os.path.dirname(os.path.abspath(__file__))
s_path__root_dir = os.path.dirname(s_path__script_dir)
s_path__env = os.path.join(s_path__root_dir, '.env')
if os.path.exists(s_path__env):
    load_dotenv(s_path__env)

s_uuid__default = os.environ.get('S_UUID', '')

o_parser = argparse.ArgumentParser(
    description="Analyze audio file using Whisper (speech-to-text) and BEATs (audio classification). Outputs JSON array of audio events via IPC."
)
o_parser.add_argument("s_path_audio", help="Path to the .wav audio file to analyze")
o_parser.add_argument("--s-uuid", default=s_uuid__default, help="S_UUID for IPC output (default from .env)")
o_parser.add_argument("--s-whisper-model", default="base", help="Whisper model size: tiny, base, small, medium, large (default: base)")
o_parser.add_argument("--b-skip-beats", action="store_true", help="Skip BEATs classification (only run Whisper)")
o_parser.add_argument("--s-language", default="en", help="Language for Whisper transcription, e.g. en, de, fr (default: en)")

o_arg = o_parser.parse_args()
s_path_audio = o_arg.s_path_audio
s_uuid = o_arg.s_uuid
s_whisper_model = o_arg.s_whisper_model
b_skip_beats = o_arg.b_skip_beats
s_language = o_arg.s_language

# detect which args were explicitly provided via sys.argv
a_s_arg__provided = set()
for s_a in sys.argv[1:]:
    if s_a.startswith('--'):
        a_s_arg__provided.add(s_a.split('=')[0])

def f_s_source(s_flag):
    return "(provided)" if s_flag in a_s_arg__provided else "(default)"

print("  +-Arguments -------------------------------------------+")
print(f"  | s_path_audio        {s_path_audio[:25]:30s} {'(provided)':12s}|")
print(f"  | --s-uuid            {s_uuid[:25]:30s} {f_s_source('--s-uuid'):12s}|")
print(f"  | --s-whisper-model   {s_whisper_model:30s} {f_s_source('--s-whisper-model'):12s}|")
print(f"  | --b-skip-beats      {str(b_skip_beats):30s} {f_s_source('--b-skip-beats'):12s}|")
print(f"  | --s-language        {s_language:30s} {f_s_source('--s-language'):12s}|")
print("  +------------------------------------------------------+")

if not os.path.exists(s_path_audio):
    print(f"Error: audio file not found: {s_path_audio}", file=sys.stderr)
    sys.exit(1)

# --- 3. processing with logging & timing ---

a_o_audio_event = []

# helper: read wav file as float32 numpy array
def f_a_n_sample__from_wav(s_path):
    with wave.open(s_path, 'rb') as o_wav:
        n_channels = o_wav.getnchannels()
        n_sample_width = o_wav.getsampwidth()
        n_framerate = o_wav.getframerate()
        n_frame = o_wav.getnframes()
        a_n_byte = o_wav.readframes(n_frame)

    if n_sample_width == 2:
        a_n_sample = np.frombuffer(a_n_byte, dtype=np.int16).astype(np.float32) / 32768.0
    elif n_sample_width == 4:
        a_n_sample = np.frombuffer(a_n_byte, dtype=np.int32).astype(np.float32) / 2147483648.0
    else:
        print(f"Error: unsupported sample width {n_sample_width}", file=sys.stderr)
        sys.exit(2)

    if n_channels > 1:
        a_n_sample = a_n_sample.reshape(-1, n_channels)[:, 0]

    return a_n_sample, n_framerate

# --- whisper: speech-to-text with word-level timestamps ---

o_timer__whisper_load = f_time_start("whisper_load_model")
f_log(f"Loading Whisper model '{s_whisper_model}'...")
o_model__whisper = whisper.load_model(s_whisper_model)
f_time_end(o_timer__whisper_load)

o_timer__whisper_transcribe = f_time_start("whisper_transcribe")
f_log(f"Transcribing audio: {s_path_audio}")
o_result__whisper = whisper.transcribe(
    o_model__whisper,
    s_path_audio,
    language=s_language,
    word_timestamps=True,
    verbose=False
)
f_time_end(o_timer__whisper_transcribe)

# extract atomic word-level events from whisper segments
o_timer__whisper_parse = f_time_start("whisper_parse_event")
n_cnt__utterance = 0
for o_segment in o_result__whisper.get('segments', []):
    for o_word in o_segment.get('words', []):
        n_ms_start__word = int(o_word['start'] * 1000)
        n_ms_end__word = int(o_word['end'] * 1000)
        n_ms_duration__word = n_ms_end__word - n_ms_start__word
        s_text__word = o_word.get('word', '').strip()
        if s_text__word:
            a_o_audio_event.append({
                'n_ms_start': n_ms_start__word,
                'n_ms_duration': n_ms_duration__word,
                's_type': 'speech',
                's_text': s_text__word,
            })
            n_cnt__utterance += 1

f_log(f"Found {n_cnt__utterance} word-level speech events")
f_time_end(o_timer__whisper_parse)

# --- BEATs: non-speech audio classification ---

if not b_skip_beats:
    o_timer__beats_load = f_time_start("beats_load_model")
    f_log("Loading BEATs model (MIT/ast-finetuned-audioset-10-10-0.4593)...")
    s_beats_model_name = "MIT/ast-finetuned-audioset-10-10-0.4593"
    o_processor__beats = AutoProcessor.from_pretrained(s_beats_model_name)
    o_model__beats = AutoModelForAudioClassification.from_pretrained(s_beats_model_name)
    o_model__beats.eval()
    f_time_end(o_timer__beats_load)

    o_timer__beats_classify = f_time_start("beats_classify")
    f_log("Running audio classification...")

    # load audio samples
    a_n_sample, n_framerate = f_a_n_sample__from_wav(s_path_audio)
    n_ms_total = int(len(a_n_sample) / n_framerate * 1000)

    # process in chunks of 10 seconds for temporal resolution
    n_sec__chunk = 10
    n_sample__chunk = n_framerate * n_sec__chunk
    n_cnt__chunk = max(1, len(a_n_sample) // n_sample__chunk)
    n_cnt__music_event = 0

    for n_it__chunk in range(n_cnt__chunk):
        n_idx__start = n_it__chunk * n_sample__chunk
        n_idx__end = min(n_idx__start + n_sample__chunk, len(a_n_sample))
        a_n_sample__chunk = a_n_sample[n_idx__start:n_idx__end]

        if len(a_n_sample__chunk) < n_framerate:
            continue

        # resample to 16kHz if needed (BEATs/AST expects 16kHz)
        if n_framerate != 16000:
            n_len__resampled = int(len(a_n_sample__chunk) * 16000 / n_framerate)
            a_n_idx = np.linspace(0, len(a_n_sample__chunk) - 1, n_len__resampled)
            a_n_sample__chunk = np.interp(a_n_idx, np.arange(len(a_n_sample__chunk)), a_n_sample__chunk)

        o_input = o_processor__beats(
            a_n_sample__chunk,
            sampling_rate=16000,
            return_tensors="pt"
        )

        with torch.no_grad():
            o_output = o_model__beats(**o_input)

        a_n_logit = o_output.logits[0]
        a_n_prob = torch.softmax(a_n_logit, dim=-1)

        # get top predictions
        n_top_k = 3
        a_n_val__top, a_n_idx__top = torch.topk(a_n_prob, n_top_k)

        n_ms_start__chunk = int(n_idx__start / n_framerate * 1000)
        n_ms_duration__chunk = int((n_idx__end - n_idx__start) / n_framerate * 1000)

        for n_it__top in range(n_top_k):
            n_idx__label = a_n_idx__top[n_it__top].item()
            n_prob = a_n_val__top[n_it__top].item()
            s_label = o_model__beats.config.id2label[n_idx__label]

            # only include events with reasonable confidence
            if n_prob < 0.1:
                continue

            # skip speech-like labels (already covered by whisper)
            a_s_label__speech = ['speech', 'talking', 'narration', 'conversation', 'male speech', 'female speech']
            if any(s_l in s_label.lower() for s_l in a_s_label__speech):
                continue

            a_o_audio_event.append({
                'n_ms_start': n_ms_start__chunk,
                'n_ms_duration': n_ms_duration__chunk,
                's_type': 'music' if 'music' in s_label.lower() else s_label.lower(),
                's_text': f"{s_label} ({n_prob:.2f})",
            })
            n_cnt__music_event += 1

        if (n_it__chunk + 1) % 10 == 0 or n_it__chunk == n_cnt__chunk - 1:
            f_log(f"Classified chunk {n_it__chunk + 1}/{n_cnt__chunk}")

    f_log(f"Found {n_cnt__music_event} non-speech audio events")
    f_time_end(o_timer__beats_classify)

# sort all events by start time
a_o_audio_event.sort(key=lambda o: o['n_ms_start'])

f_log(f"Total audio events: {len(a_o_audio_event)}")

# --- 4. machine-readable output (IPC protocol) ---

if s_uuid:
    s_json = json.dumps(a_o_audio_event)
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
