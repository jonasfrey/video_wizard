// Copyright (C) [2026] [Jonas Immanuel Frey] - Licensed under GPLv2. See LICENSE file for details.

// test: phase 1 audio extraction via ffmpeg
// run: deno run --allow-read --allow-write --allow-env --allow-ffi --allow-run --env serverside/testing/audio_extraction.js

// use a separate JSON db so we don't pollute the real one
Deno.env.set('S_PATH__DB_JSON', './.gitignored/testing/appdb_audio_extraction/');
Deno.env.set('S_DB_TYPE', 'json');

import {
    a_o_model,
    f_s_name_table__from_o_model,
    o_model__o_fsnode,
    o_model__o_video,
    o_model__o_audio,
    o_wsmsg__syncdata,
    s_name_prop_id,
    f_apply_crud_to_a_o,
    f_o_relation_map__from_a_o_model,
    f_denormalize_o_state,
    f_denormalize_o_instance,
    f_o_model__from_params,
} from '../../localhost/constructors.js';
import { s_db_create, s_db_read, s_db_update, s_db_delete } from '../../localhost/runtimedata.js';
import { f_init_db, f_v_crud__indb, f_db_delete_table_data } from '../database_functions.js';
import { f_check_ffmpeg, f_extract_audio, f_n_ms_duration__from_s_path } from '../cli_functions.js';
import { s_root_dir, s_ds } from '../runtimedata.js';

let s_path__test_video = `${s_root_dir}${s_ds}testdata${s_ds}lotr.mp4`;
let s_path__test_db = './.gitignored/testing/appdb_audio_extraction/';

// --- setup: init db and wire up syncdata (mimics what the websocket server does) ---

let o_state = {};

await f_init_db();

// minimal syncdata implementation for testing (same logic as websocket server)
o_wsmsg__syncdata.f_v_sync = function({s_name_table, s_operation, o_data}){
    let v_result = null;
    if(s_operation === 'read'){
        v_result = f_v_crud__indb(s_db_read, s_name_table, o_data);
    }
    if(s_operation === 'create'){
        v_result = f_v_crud__indb(s_db_create, s_name_table, o_data);
    }
    if(s_operation === 'update'){
        let n_id = o_data[s_name_prop_id];
        let o_update = {};
        for(let s_key in o_data){
            if(s_key === s_name_prop_id) continue;
            o_update[s_key] = o_data[s_key];
        }
        v_result = f_v_crud__indb(s_db_update, s_name_table, { [s_name_prop_id]: n_id }, o_update);
    }
    if(s_operation === 'delete'){
        v_result = f_v_crud__indb(s_db_delete, s_name_table, o_data);
    }
    // update o_state
    if(v_result && s_operation !== 'read'){
        let o_data__for_state = s_operation === 'delete' ? o_data : v_result;
        f_apply_crud_to_a_o(o_state[s_name_table], s_operation, o_data__for_state, s_name_prop_id);
    }
    return v_result;
};

// initialize o_state arrays
for (let o_model of a_o_model) {
    let s_name_table = f_s_name_table__from_o_model(o_model);
    o_state[s_name_table] = o_wsmsg__syncdata.f_v_sync({s_name_table, s_operation: 'read', o_data: {}}) || [];
}

// --- helpers ---

let n_test_pass = 0;
let n_test_fail = 0;

let f_assert = function(b_condition, s_label){
    if(b_condition){
        n_test_pass++;
        console.log(`  PASS: ${s_label}`);
    } else {
        n_test_fail++;
        console.error(`  FAIL: ${s_label}`);
    }
};

// --- test 1: f_check_ffmpeg ---

console.log('\n--- test 1: f_check_ffmpeg ---');
let b_ffmpeg = await f_check_ffmpeg();
f_assert(b_ffmpeg === true, 'ffmpeg is available on PATH');

// --- test 2: f_n_ms_duration__from_s_path ---

console.log('\n--- test 2: f_n_ms_duration__from_s_path ---');
let n_ms_duration = await f_n_ms_duration__from_s_path(s_path__test_video);
console.log(`  video duration: ${n_ms_duration}ms (${(n_ms_duration / 1000).toFixed(1)}s)`);
f_assert(typeof n_ms_duration === 'number', 'duration is a number');
f_assert(n_ms_duration > 0, 'duration is greater than 0');

// --- test 3: f_extract_audio ---

console.log('\n--- test 3: f_extract_audio ---');
let a_s_progress = [];
let f_on_progress = function(s_line){
    a_s_progress.push(s_line);
};

let n_ts_start = performance.now();
let o_result = await f_extract_audio(s_path__test_video, f_on_progress);
let n_ms_elapsed = performance.now() - n_ts_start;

console.log(`  extraction took ${n_ms_elapsed.toFixed(0)}ms`);
console.log(`  progress lines received: ${a_s_progress.length}`);

// check result structure
f_assert(o_result !== null && typeof o_result === 'object', 'result is an object');
f_assert(o_result.o_fsnode !== null, 'result has o_fsnode');
f_assert(o_result.o_video !== null, 'result has o_video');
f_assert(o_result.o_audio !== null, 'result has o_audio');

// check o_fsnode
f_assert(o_result.o_fsnode.s_path_absolute === s_path__test_video, 'o_fsnode.s_path_absolute matches input');
f_assert(o_result.o_fsnode.n_id > 0, 'o_fsnode has a valid n_id');

// check o_video
f_assert(o_result.o_video.n_o_fsnode_n_id === o_result.o_fsnode.n_id, 'o_video FK points to o_fsnode');
f_assert(o_result.o_video.n_ms_duration > 0, 'o_video has duration');
f_assert(o_result.o_video.s_status === 'extracted', 'o_video status is extracted');

// check o_audio
f_assert(o_result.o_audio.n_o_video_n_id === o_result.o_video.n_id, 'o_audio FK points to o_video');
f_assert(o_result.o_audio.n_ms_duration > 0, 'o_audio has duration');
f_assert(typeof o_result.o_audio.s_path_abs === 'string' && o_result.o_audio.s_path_abs.endsWith('.wav'), 'o_audio.s_path_abs is a .wav path');

// check the .wav file actually exists on disk
let b_wav_exists = false;
try {
    let o_stat = await Deno.stat(o_result.o_audio.s_path_abs);
    b_wav_exists = o_stat.isFile && o_stat.size > 0;
} catch { /* file not found */ }
f_assert(b_wav_exists, 'extracted .wav file exists on disk and is non-empty');

// check progress callback was called
f_assert(a_s_progress.length > 0, 'progress callback was called at least once');

// check DB state
let a_o_video__db = f_v_crud__indb(s_db_read, f_s_name_table__from_o_model(o_model__o_video), {});
let a_o_audio__db = f_v_crud__indb(s_db_read, f_s_name_table__from_o_model(o_model__o_audio), {});
f_assert(a_o_video__db.length === 1, 'exactly 1 o_video in DB');
f_assert(a_o_audio__db.length === 1, 'exactly 1 o_audio in DB');
f_assert(a_o_video__db[0].s_status === 'extracted', 'o_video in DB has status extracted');

// --- test 4: re-extraction (idempotency) ---

console.log('\n--- test 4: re-extraction (should reuse o_fsnode and o_video) ---');
let o_result2 = await f_extract_audio(s_path__test_video, null);
f_assert(o_result2.o_fsnode.n_id === o_result.o_fsnode.n_id, 'same o_fsnode reused');
f_assert(o_result2.o_video.n_id === o_result.o_video.n_id, 'same o_video reused');

let a_o_audio__db2 = f_v_crud__indb(s_db_read, f_s_name_table__from_o_model(o_model__o_audio), {});
f_assert(a_o_audio__db2.length === 2, '2 o_audio records after re-extraction (new audio created)');

// --- summary ---

console.log(`\n=== results: ${n_test_pass} passed, ${n_test_fail} failed ===\n`);

// cleanup test db
try { await Deno.remove(s_path__test_db, { recursive: true }); } catch { /* ignore */ }

if(n_test_fail > 0) Deno.exit(1);
