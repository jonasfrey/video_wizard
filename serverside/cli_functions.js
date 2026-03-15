// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under GPLv2. See LICENSE file for details.

// functions that spawn CLI subprocesses (python, pip, etc.)

import { s_ds, s_root_dir, s_uuid, s_bin__python, s_path__venv, s_path__audio, s_bin__ffmpeg, s_bin__ffprobe, s_bin__which, s_bin__sudo, s_bin__pip3 } from './runtimedata.js';
import { f_s_name_table__from_o_model, o_model__o_fsnode, o_model__o_utterance, o_model__o_video, o_model__o_audio, o_model__o_audio_event, o_model__o_composition, o_model__o_composition_o_audio_event, o_wsmsg__syncdata } from '../localhost/constructors.js';

let f_install_cli_dependencies = async function(){
    let b_ffmpeg = await f_check_ffmpeg();
    if (!b_ffmpeg) {
        console.log('[f_install_cli_dependencies] ffmpeg not found, attempting install...');
        await f_install_linux_binary(s_bin__ffmpeg);
    }
    await f_init_python();
}
let f_init_python = async function(){
    let a_s_package = ['python-dotenv', 'pyttsx3', 'openai-whisper', 'torch', 'transformers', 'numpy'];

    // check if venv exists
    let b_venv_exists = true;
    try {
        await Deno.stat(s_path__venv);
    } catch {
        b_venv_exists = false;
    }

    if (!b_venv_exists) {
        console.log('[f_init_python] creating venv...');
        let o_proc__venv = new Deno.Command(s_bin__python, {
            args: ['-m', 'venv', s_path__venv],
            stdout: 'inherit',
            stderr: 'inherit',
        });
        let o_result__venv = await o_proc__venv.output();
        if (!o_result__venv.success) {
            console.error('[f_init_python] failed to create venv');
            return;
        }
        console.log('[f_init_python] venv created');
    }

    let s_path__pip = `${s_path__venv}${s_ds}bin${s_ds}pip`;
    if (Deno.build.os === 'windows') {
        s_path__pip = `${s_path__venv}${s_ds}Scripts${s_ds}pip.exe`;
    }

    // get list of already installed packages
    let o_proc__freeze = new Deno.Command(s_path__pip, {
        args: ['freeze'],
        stdout: 'piped',
        stderr: 'piped',
    });
    let o_result__freeze = await o_proc__freeze.output();
    let s_installed = new TextDecoder().decode(o_result__freeze.stdout).toLowerCase();

    // filter to only packages not yet installed
    let a_s_package__missing = a_s_package.filter(function(s_pkg) {
        // pip freeze outputs "package-name==version", compare lowercased
        return !s_installed.includes(s_pkg.toLowerCase());
    });

    if (a_s_package__missing.length === 0) {
        console.log('[f_init_python] all packages already installed');
        return;
    }

    console.log(`[f_init_python] installing: ${a_s_package__missing.join(', ')}...`);
    let o_proc__install = new Deno.Command(s_path__pip, {
        args: ['install', ...a_s_package__missing],
        stdout: 'inherit',
        stderr: 'inherit',
    });
    let o_result__install = await o_proc__install.output();
    if (!o_result__install.success) {
        console.error('[f_init_python] pip install failed');
        return;
    }
    console.log('[f_init_python] packages installed');
}

let f_o_uttdatainfo = async function(s_text){
    let s_name_script = 'f_o_uttdatainfo.py';
    let s_path__script = `${s_root_dir}${s_ds}serverside${s_ds}${s_name_script}`;
    // prefer venv python if it exists, fall back to system python
    let s_path__python = `${s_path__venv}${s_ds}bin${s_ds}python3`;
    try { await Deno.stat(s_path__python); } catch { s_path__python = s_bin__python; }
    let a_s_cmd = [s_path__python, s_path__script, s_text, '--s-uuid', s_uuid];

    let o_process = new Deno.Command(a_s_cmd[0], {
        args: a_s_cmd.slice(1),
        cwd: s_root_dir,
        stdout: 'piped',
        stderr: 'piped',
    });
    let o_output = await o_process.output();
    let s_stdout = new TextDecoder().decode(o_output.stdout);
    let s_stderr = new TextDecoder().decode(o_output.stderr);

    if(o_output.code !== 0){
        console.error(`${s_name_script} python script failed:`, s_stderr);
        throw new Error(`${s_name_script} exited with code ${o_output.code}: ${s_stderr}`);
    }

    // parse IPC block from stdout
    let s_tag__start = `${s_uuid}_start_json`;
    let s_tag__end = `${s_uuid}_end_json`;
    let n_idx__start = s_stdout.indexOf(s_tag__start);
    let n_idx__end = s_stdout.indexOf(s_tag__end);

    if(n_idx__start === -1 || n_idx__end === -1){
        console.error(`${s_name_script}: no IPC block found in stdout:\n`, s_stdout);
        throw new Error(`${s_name_script} did not emit IPC json block`);
    }

    let s_json = s_stdout.slice(n_idx__start + s_tag__start.length, n_idx__end).trim();
    let o_ipc = JSON.parse(s_json);
    // o_ipc: { o_utterance: { s_text, ... }, o_fsnode: { s_path_absolute, s_name, n_bytes, ... } }

    // create o_fsnode in db for the audio file
    let s_name_table__fsnode = f_s_name_table__from_o_model(o_model__o_fsnode);
    let o_fsnode = o_wsmsg__syncdata.f_v_sync({
        s_name_table: s_name_table__fsnode,
        s_operation: 'create',
        o_data: {
            s_path_absolute: o_ipc.o_fsnode.s_path_absolute,
            s_name: o_ipc.o_fsnode.s_name,
            n_bytes: o_ipc.o_fsnode.n_bytes,
            b_folder: false,
        }
    });

    // create o_utterance in db linked to o_fsnode
    let s_name_table__utterance = f_s_name_table__from_o_model(o_model__o_utterance);
    let o_utterance = o_wsmsg__syncdata.f_v_sync({
        s_name_table: s_name_table__utterance,
        s_operation: 'create',
        o_data: {
            s_text: o_ipc.o_utterance.s_text,
            n_o_fsnode_n_id: o_fsnode.n_id,
        }
    });

    return {
        o_utterance,
        o_fsnode,
    };
};


let f_install_linux_binary = async function(s_name_binary){
    // check if already available via PATH (which) before falling back to absolute path
    let o_proc__which = new Deno.Command(s_bin__which, {
        args: [s_name_binary],
        stdout: 'piped',
        stderr: 'piped',
    });
    let o_result__which = await o_proc__which.output();
    if (o_result__which.success) {
        let s_path__found = new TextDecoder().decode(o_result__which.stdout).trim();
        console.log(`[f_install_linux_binary] ${s_name_binary} already installed at ${s_path__found}`);
        return;
    }

    console.log(`[f_install_linux_binary] ${s_name_binary} not found, attempting to install...`);

    // try apt-get first (debian/ubuntu)
    let o_proc__apt = new Deno.Command(s_bin__sudo, {
        args: ['apt-get', 'install', '-y', s_name_binary],
        stdout: 'inherit',
        stderr: 'inherit',
    });
    let o_result__apt = await o_proc__apt.output();
    if (o_result__apt.success) {
        console.log(`[f_install_linux_binary] ${s_name_binary} installed via apt-get`);
        return;
    }

    // try pip (python packages like glances)
    let o_proc__pip = new Deno.Command(s_bin__pip3, {
        args: ['install', s_name_binary],
        stdout: 'inherit',
        stderr: 'inherit',
    });
    let o_result__pip = await o_proc__pip.output();
    if (o_result__pip.success) {
        console.log(`[f_install_linux_binary] ${s_name_binary} installed via pip3`);
        return;
    }

    // try snap as last resort
    let o_proc__snap = new Deno.Command(s_bin__sudo, {
        args: ['snap', 'install', s_name_binary],
        stdout: 'inherit',
        stderr: 'inherit',
    });
    let o_result__snap = await o_proc__snap.output();
    if (o_result__snap.success) {
        console.log(`[f_install_linux_binary] ${s_name_binary} installed via snap`);
        return;
    }

    console.error(`[f_install_linux_binary] failed to install ${s_name_binary} via apt-get, pip3, or snap`);
}



let f_check_ffmpeg = async function(){
    let o_proc = new Deno.Command(s_bin__which, {
        args: [s_bin__ffmpeg],
        stdout: 'piped',
        stderr: 'piped',
    });
    let o_result = await o_proc.output();
    if (!o_result.success) {
        console.error('[f_check_ffmpeg] ffmpeg not found on PATH. Install it: sudo apt-get install -y ffmpeg');
        return false;
    }
    let s_path = new TextDecoder().decode(o_result.stdout).trim();
    console.log(`[f_check_ffmpeg] ffmpeg found at ${s_path}`);
    return true;
};

// get video duration in milliseconds using ffprobe
let f_n_ms_duration__from_s_path = async function(s_path_file){
    let o_proc = new Deno.Command(s_bin__ffprobe, {
        args: [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            s_path_file,
        ],
        stdout: 'piped',
        stderr: 'piped',
    });
    let o_result = await o_proc.output();
    if (!o_result.success) {
        let s_err = new TextDecoder().decode(o_result.stderr);
        throw new Error(`ffprobe failed: ${s_err}`);
    }
    let o_json = JSON.parse(new TextDecoder().decode(o_result.stdout));
    let n_seconds = parseFloat(o_json.format.duration);
    return Math.round(n_seconds * 1000);
};

// extract audio from video file as mono 16kHz wav
// f_on_progress: callback(s_line) called with each stderr line from ffmpeg
let f_extract_audio = async function(s_path_video, f_on_progress){
    // ensure audio output directory exists
    try { await Deno.mkdir(s_path__audio, { recursive: true }); } catch { /* exists */ }

    // derive output filename from video filename
    let s_name_video = s_path_video.split(s_ds).at(-1);
    let s_name_audio = s_name_video.replace(/\.[^.]+$/, '.wav');
    let s_path_audio_file = `${s_path__audio}${s_name_audio}`;

    // get video duration before extraction
    let n_ms_duration = await f_n_ms_duration__from_s_path(s_path_video);

    // find or create o_fsnode for the video file
    let s_name_table__fsnode = f_s_name_table__from_o_model(o_model__o_fsnode);
    let a_o_fsnode = o_wsmsg__syncdata.f_v_sync({
        s_name_table: s_name_table__fsnode,
        s_operation: 'read',
        o_data: { s_path_absolute: s_path_video }
    }) || [];
    let o_fsnode = a_o_fsnode[0];
    if (!o_fsnode) {
        o_fsnode = o_wsmsg__syncdata.f_v_sync({
            s_name_table: s_name_table__fsnode,
            s_operation: 'create',
            o_data: {
                s_path_absolute: s_path_video,
                s_name: s_name_video,
                b_folder: false,
                b_video: true,
            }
        });
    }

    // create o_video record with status 'extracting'
    let s_name_table__video = f_s_name_table__from_o_model(o_model__o_video);
    // check if o_video already exists for this fsnode
    let a_o_video = o_wsmsg__syncdata.f_v_sync({
        s_name_table: s_name_table__video,
        s_operation: 'read',
        o_data: { n_o_fsnode_n_id: o_fsnode.n_id }
    }) || [];
    let o_video = a_o_video[0];
    if (o_video) {
        o_wsmsg__syncdata.f_v_sync({
            s_name_table: s_name_table__video,
            s_operation: 'update',
            o_data: { n_id: o_video.n_id, s_status: 'extracting', n_ms_duration: n_ms_duration }
        });
    } else {
        o_video = o_wsmsg__syncdata.f_v_sync({
            s_name_table: s_name_table__video,
            s_operation: 'create',
            o_data: {
                n_o_fsnode_n_id: o_fsnode.n_id,
                n_ms_duration: n_ms_duration,
                s_status: 'extracting',
            }
        });
    }

    // spawn ffmpeg: extract mono 16kHz wav, overwrite if exists
    // -progress pipe:1 outputs machine-readable progress to stdout
    let o_cmd = new Deno.Command(s_bin__ffmpeg, {
        args: [
            '-y',
            '-i', s_path_video,
            '-ac', '1',
            '-ar', '16000',
            '-vn',
            '-progress', 'pipe:1',
            s_path_audio_file,
        ],
        stdout: 'piped',
        stderr: 'piped',
    });

    let o_child = o_cmd.spawn();

    // stream stdout (progress) line by line
    let o_reader__stdout = o_child.stdout.getReader();
    let s_buf__stdout = '';
    let f_read_stdout = async function(){
        while(true){
            let { value, done } = await o_reader__stdout.read();
            if(done) break;
            s_buf__stdout += new TextDecoder().decode(value);
            let a_s_line = s_buf__stdout.split('\n');
            s_buf__stdout = a_s_line.pop(); // keep incomplete last line in buffer
            for(let s_line of a_s_line){
                if(f_on_progress && s_line.trim()) f_on_progress(s_line.trim());
            }
        }
    };

    // collect stderr for error reporting
    let o_reader__stderr = o_child.stderr.getReader();
    let s_stderr = '';
    let f_read_stderr = async function(){
        while(true){
            let { value, done } = await o_reader__stderr.read();
            if(done) break;
            s_stderr += new TextDecoder().decode(value);
        }
    };

    await Promise.all([f_read_stdout(), f_read_stderr()]);
    let o_status = await o_child.status;

    if (!o_status.success) {
        // update video status to error
        o_wsmsg__syncdata.f_v_sync({
            s_name_table: s_name_table__video,
            s_operation: 'update',
            o_data: { n_id: o_video.n_id, s_status: 'error' }
        });
        throw new Error(`ffmpeg failed (code ${o_status.code}): ${s_stderr.slice(-500)}`);
    }

    // get audio file size
    let o_stat = await Deno.stat(s_path_audio_file);

    // get audio duration
    let n_ms_duration__audio = await f_n_ms_duration__from_s_path(s_path_audio_file);

    // create o_audio record
    let s_name_table__audio = f_s_name_table__from_o_model(o_model__o_audio);
    let o_audio = o_wsmsg__syncdata.f_v_sync({
        s_name_table: s_name_table__audio,
        s_operation: 'create',
        o_data: {
            n_o_video_n_id: o_video.n_id,
            n_ms_duration: n_ms_duration__audio,
            s_path_abs: s_path_audio_file,
        }
    });

    // update video status to 'extracted'
    o_wsmsg__syncdata.f_v_sync({
        s_name_table: s_name_table__video,
        s_operation: 'update',
        o_data: { n_id: o_video.n_id, s_status: 'extracted' }
    });

    return {
        o_fsnode,
        o_video,
        o_audio,
    };
};

// analyze audio file using whisper + BEATs, returns array of o_audio_event
// f_on_progress: callback(s_line) called with stdout lines for progress streaming
let f_analyze_audio = async function(n_o_audio_n_id, f_on_progress){
    // look up the o_audio record
    let s_name_table__audio = f_s_name_table__from_o_model(o_model__o_audio);
    let a_o_audio = o_wsmsg__syncdata.f_v_sync({
        s_name_table: s_name_table__audio,
        s_operation: 'read',
        o_data: { n_id: n_o_audio_n_id }
    }) || [];
    let o_audio = a_o_audio[0];
    if (!o_audio) {
        throw new Error(`f_analyze_audio: o_audio with n_id=${n_o_audio_n_id} not found`);
    }

    // update o_video status to 'analyzing'
    let s_name_table__video = f_s_name_table__from_o_model(o_model__o_video);
    let a_o_video = o_wsmsg__syncdata.f_v_sync({
        s_name_table: s_name_table__video,
        s_operation: 'read',
        o_data: { n_id: o_audio.n_o_video_n_id }
    }) || [];
    let o_video = a_o_video[0];
    if (o_video) {
        o_wsmsg__syncdata.f_v_sync({
            s_name_table: s_name_table__video,
            s_operation: 'update',
            o_data: { n_id: o_video.n_id, s_status: 'analyzing' }
        });
    }

    let s_name_script = 'f_analyze_audio.py';
    let s_path__script = `${s_root_dir}${s_ds}serverside${s_ds}${s_name_script}`;
    // prefer venv python if it exists, fall back to system python
    let s_path__python = `${s_path__venv}${s_ds}bin${s_ds}python3`;
    try { await Deno.stat(s_path__python); } catch { s_path__python = s_bin__python; }

    let a_s_cmd = [s_path__python, s_path__script, o_audio.s_path_abs, '--s-uuid', s_uuid];

    let o_cmd = new Deno.Command(a_s_cmd[0], {
        args: a_s_cmd.slice(1),
        cwd: s_root_dir,
        stdout: 'piped',
        stderr: 'piped',
    });

    let o_child = o_cmd.spawn();

    // stream stdout line by line for progress
    let o_reader__stdout = o_child.stdout.getReader();
    let s_buf__stdout = '';
    let s_stdout__full = '';
    let f_read_stdout = async function(){
        while(true){
            let { value, done } = await o_reader__stdout.read();
            if(done) break;
            let s_chunk = new TextDecoder().decode(value);
            s_stdout__full += s_chunk;
            s_buf__stdout += s_chunk;
            let a_s_line = s_buf__stdout.split('\n');
            s_buf__stdout = a_s_line.pop();
            for(let s_line of a_s_line){
                if(f_on_progress && s_line.trim()) f_on_progress(s_line.trim());
            }
        }
    };

    // collect stderr
    let o_reader__stderr = o_child.stderr.getReader();
    let s_stderr = '';
    let f_read_stderr = async function(){
        while(true){
            let { value, done } = await o_reader__stderr.read();
            if(done) break;
            s_stderr += new TextDecoder().decode(value);
        }
    };

    await Promise.all([f_read_stdout(), f_read_stderr()]);
    let o_status = await o_child.status;

    if (!o_status.success) {
        if (o_video) {
            o_wsmsg__syncdata.f_v_sync({
                s_name_table: s_name_table__video,
                s_operation: 'update',
                o_data: { n_id: o_video.n_id, s_status: 'error' }
            });
        }
        let s_error_detail = s_stderr.trim() || s_stdout__full.slice(-500);
        throw new Error(`${s_name_script} failed (code ${o_status.code}): ${s_error_detail.slice(-500)}`);
    }

    // parse IPC block from stdout
    let s_tag__start = `${s_uuid}_start_json`;
    let s_tag__end = `${s_uuid}_end_json`;
    let n_idx__start = s_stdout__full.indexOf(s_tag__start);
    let n_idx__end = s_stdout__full.indexOf(s_tag__end);

    if(n_idx__start === -1 || n_idx__end === -1){
        if (o_video) {
            o_wsmsg__syncdata.f_v_sync({
                s_name_table: s_name_table__video,
                s_operation: 'update',
                o_data: { n_id: o_video.n_id, s_status: 'error' }
            });
        }
        console.error(`${s_name_script}: no IPC block found in stdout:\n`, s_stdout__full);
        throw new Error(`${s_name_script} did not emit IPC json block`);
    }

    let s_json = s_stdout__full.slice(n_idx__start + s_tag__start.length, n_idx__end).trim();
    let a_o_event = JSON.parse(s_json);

    // bulk-insert o_audio_event records
    let s_name_table__audio_event = f_s_name_table__from_o_model(o_model__o_audio_event);
    let a_o_audio_event = [];
    for (let o_event of a_o_event) {
        let o_audio_event = o_wsmsg__syncdata.f_v_sync({
            s_name_table: s_name_table__audio_event,
            s_operation: 'create',
            o_data: {
                n_o_audio_n_id: n_o_audio_n_id,
                n_ms_start: o_event.n_ms_start,
                n_ms_duration: o_event.n_ms_duration,
                s_type: o_event.s_type,
                s_text: o_event.s_text || '',
            }
        });
        a_o_audio_event.push(o_audio_event);
    }

    // update o_video status to 'done'
    if (o_video) {
        o_wsmsg__syncdata.f_v_sync({
            s_name_table: s_name_table__video,
            s_operation: 'update',
            o_data: { n_id: o_video.n_id, s_status: 'done' }
        });
    }

    return {
        o_audio,
        o_video,
        a_o_audio_event,
    };
};

// combined handler: extract audio -> analyze audio -> update status to done
let f_analyze_video = async function(s_path_video, f_on_progress){
    // step 1: extract audio
    if(f_on_progress) f_on_progress('[analyze_video] starting audio extraction...');
    let o_result__extract = await f_extract_audio(s_path_video, f_on_progress);

    // step 2: analyze extracted audio
    if(f_on_progress) f_on_progress('[analyze_video] starting audio analysis...');
    let o_result__analyze = await f_analyze_audio(o_result__extract.o_audio.n_id, f_on_progress);

    if(f_on_progress) f_on_progress('[analyze_video] analysis complete');

    return {
        o_fsnode: o_result__extract.o_fsnode,
        o_video: o_result__analyze.o_video,
        o_audio: o_result__analyze.o_audio,
        a_o_audio_event: o_result__analyze.a_o_audio_event,
    };
};

// render a composition: query DB for events, spawn ffmpeg via Python script
let f_render_composition = async function(n_o_composition_n_id, f_on_progress){
    // look up composition
    let s_name_table__composition = f_s_name_table__from_o_model(o_model__o_composition);
    let a_o_comp = o_wsmsg__syncdata.f_v_sync({
        s_name_table: s_name_table__composition,
        s_operation: 'read',
        o_data: { n_id: n_o_composition_n_id }
    }) || [];
    let o_composition = a_o_comp[0];
    if (!o_composition) {
        throw new Error(`f_render_composition: o_composition with n_id=${n_o_composition_n_id} not found`);
    }

    // look up video + fsnode to get source path
    let s_name_table__video = f_s_name_table__from_o_model(o_model__o_video);
    let a_o_video = o_wsmsg__syncdata.f_v_sync({
        s_name_table: s_name_table__video,
        s_operation: 'read',
        o_data: { n_id: o_composition.n_o_video_n_id }
    }) || [];
    let o_video = a_o_video[0];
    if (!o_video) throw new Error('f_render_composition: o_video not found');

    let s_name_table__fsnode = f_s_name_table__from_o_model(o_model__o_fsnode);
    let a_o_fsnode = o_wsmsg__syncdata.f_v_sync({
        s_name_table: s_name_table__fsnode,
        s_operation: 'read',
        o_data: { n_id: o_video.n_o_fsnode_n_id }
    }) || [];
    let o_fsnode = a_o_fsnode[0];
    if (!o_fsnode) throw new Error('f_render_composition: o_fsnode not found');

    // look up junction table entries, ordered
    let s_name_table__junction = f_s_name_table__from_o_model(o_model__o_composition_o_audio_event);
    let a_o_junction = o_wsmsg__syncdata.f_v_sync({
        s_name_table: s_name_table__junction,
        s_operation: 'read',
        o_data: { n_o_composition_n_id: n_o_composition_n_id }
    }) || [];
    a_o_junction.sort(function(a, b){ return a.n_order - b.n_order; });

    if (a_o_junction.length === 0) {
        throw new Error('f_render_composition: no events in composition');
    }

    // look up audio events
    let s_name_table__audio_event = f_s_name_table__from_o_model(o_model__o_audio_event);
    let a_o_audio_event_all = o_wsmsg__syncdata.f_v_sync({
        s_name_table: s_name_table__audio_event,
        s_operation: 'read',
        o_data: {}
    }) || [];
    let o_map__event = new Map();
    for (let o_ev of a_o_audio_event_all) o_map__event.set(o_ev.n_id, o_ev);

    let a_o_event__ordered = [];
    for (let o_j of a_o_junction) {
        let o_ev = o_map__event.get(o_j.n_o_audio_event_n_id);
        if (o_ev) {
            a_o_event__ordered.push({
                n_ms_start: o_ev.n_ms_start,
                n_ms_duration: o_ev.n_ms_duration,
            });
        }
    }

    // spawn python script
    let s_name_script = 'f_render_composition.py';
    let s_path__script = `${s_root_dir}${s_ds}serverside${s_ds}${s_name_script}`;
    let s_path__python = `${s_path__venv}${s_ds}bin${s_ds}python3`;
    try { await Deno.stat(s_path__python); } catch { s_path__python = s_bin__python; }

    let a_s_cmd = [
        s_path__python, s_path__script,
        o_fsnode.s_path_absolute,
        '--s-uuid', s_uuid,
        '--s-name', o_composition.s_name,
    ];

    let s_json__event = JSON.stringify(a_o_event__ordered);

    let o_cmd = new Deno.Command(a_s_cmd[0], {
        args: a_s_cmd.slice(1),
        cwd: s_root_dir,
        stdin: 'piped',
        stdout: 'piped',
        stderr: 'piped',
    });

    let o_child = o_cmd.spawn();

    // write event data to stdin
    let o_writer = o_child.stdin.getWriter();
    await o_writer.write(new TextEncoder().encode(s_json__event));
    await o_writer.close();

    // stream stdout
    let o_reader__stdout = o_child.stdout.getReader();
    let s_buf__stdout = '';
    let s_stdout__full = '';
    let f_read_stdout = async function(){
        while(true){
            let { value, done } = await o_reader__stdout.read();
            if(done) break;
            let s_chunk = new TextDecoder().decode(value);
            s_stdout__full += s_chunk;
            s_buf__stdout += s_chunk;
            let a_s_line = s_buf__stdout.split('\n');
            s_buf__stdout = a_s_line.pop();
            for(let s_line of a_s_line){
                if(f_on_progress && s_line.trim()) f_on_progress(s_line.trim());
            }
        }
    };

    let o_reader__stderr = o_child.stderr.getReader();
    let s_stderr = '';
    let f_read_stderr = async function(){
        while(true){
            let { value, done } = await o_reader__stderr.read();
            if(done) break;
            s_stderr += new TextDecoder().decode(value);
        }
    };

    await Promise.all([f_read_stdout(), f_read_stderr()]);
    let o_status = await o_child.status;

    if (!o_status.success) {
        let s_error_detail = s_stderr.trim() || s_stdout__full.slice(-500);
        throw new Error(`${s_name_script} failed (code ${o_status.code}): ${s_error_detail.slice(-500)}`);
    }

    // parse IPC
    let s_tag__start = `${s_uuid}_start_json`;
    let s_tag__end = `${s_uuid}_end_json`;
    let n_idx__start = s_stdout__full.indexOf(s_tag__start);
    let n_idx__end = s_stdout__full.indexOf(s_tag__end);

    if(n_idx__start === -1 || n_idx__end === -1){
        throw new Error(`${s_name_script} did not emit IPC json block`);
    }

    let s_json = s_stdout__full.slice(n_idx__start + s_tag__start.length, n_idx__end).trim();
    let o_ipc = JSON.parse(s_json);

    return {
        o_composition,
        s_path_output: o_ipc.s_path_output,
        n_bytes: o_ipc.n_bytes,
        n_cnt__event: o_ipc.n_cnt__event,
        n_sec__render: o_ipc.n_sec__render,
    };
};

export {
    f_install_cli_dependencies,
    f_init_python,
    f_o_uttdatainfo,
    f_install_linux_binary,
    f_check_ffmpeg,
    f_n_ms_duration__from_s_path,
    f_extract_audio,
    f_analyze_audio,
    f_analyze_video,
    f_render_composition,
};
