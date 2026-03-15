// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under GPLv2. See LICENSE file for details.

// test: phase 2 audio analysis via whisper + BEATs
// run: deno run --allow-read --allow-write --allow-env --allow-ffi --allow-run --env serverside/testing/audio_analysis.js

// use a separate JSON db so we don't pollute the real one
Deno.env.set('S_PATH__DB_JSON', './.gitignored/testing/appdb_audio_analysis/');
Deno.env.set('S_DB_TYPE', 'json');

import {
    a_o_model,
    f_s_name_table__from_o_model,
    o_model__o_fsnode,
    o_model__o_video,
    o_model__o_audio,
    o_model__o_audio_event,
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
import { f_check_ffmpeg, f_extract_audio, f_analyze_audio, f_analyze_video } from '../cli_functions.js';
import { s_root_dir, s_ds } from '../runtimedata.js';

let s_path__test_video = `${s_root_dir}${s_ds}testdata${s_ds}lotr.mp4`;
let s_path__test_db = './.gitignored/testing/appdb_audio_analysis/';

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

// --- test 1: extract audio first (prerequisite for analysis) ---

console.log('\n--- test 1: extract audio (prerequisite) ---');
let b_ffmpeg = await f_check_ffmpeg();
f_assert(b_ffmpeg === true, 'ffmpeg is available on PATH');

let a_s_progress__extract = [];
let o_result__extract = await f_extract_audio(s_path__test_video, function(s_line){
    a_s_progress__extract.push(s_line);
});
f_assert(o_result__extract.o_audio !== null, 'audio extraction produced o_audio');
f_assert(o_result__extract.o_audio.s_path_abs.endsWith('.wav'), 'extracted audio is .wav');
console.log(`  extracted audio: ${o_result__extract.o_audio.s_path_abs}`);

// --- test 2: f_analyze_audio ---

console.log('\n--- test 2: f_analyze_audio ---');
let a_s_progress__analyze = [];
let n_ts_start = performance.now();
let o_result__analyze = await f_analyze_audio(o_result__extract.o_audio.n_id, function(s_line){
    a_s_progress__analyze.push(s_line);
});
let n_ms_elapsed = performance.now() - n_ts_start;

console.log(`  analysis took ${(n_ms_elapsed / 1000).toFixed(1)}s`);
console.log(`  progress lines received: ${a_s_progress__analyze.length}`);

// check result structure
f_assert(o_result__analyze !== null && typeof o_result__analyze === 'object', 'result is an object');
f_assert(o_result__analyze.o_audio !== null, 'result has o_audio');
f_assert(o_result__analyze.o_video !== null, 'result has o_video');
f_assert(Array.isArray(o_result__analyze.a_o_audio_event), 'result has a_o_audio_event array');
f_assert(o_result__analyze.a_o_audio_event.length > 0, 'at least one audio event detected');

// check o_video status updated to 'done'
let a_o_video__db = f_v_crud__indb(s_db_read, f_s_name_table__from_o_model(o_model__o_video), {});
f_assert(a_o_video__db.length === 1, 'exactly 1 o_video in DB');
f_assert(a_o_video__db[0].s_status === 'done', 'o_video status is done');

// check audio events in DB
let a_o_audio_event__db = f_v_crud__indb(s_db_read, f_s_name_table__from_o_model(o_model__o_audio_event), {});
f_assert(a_o_audio_event__db.length === o_result__analyze.a_o_audio_event.length, 'DB event count matches result');
console.log(`  total audio events in DB: ${a_o_audio_event__db.length}`);

// check event structure
if(a_o_audio_event__db.length > 0){
    let o_event = a_o_audio_event__db[0];
    f_assert(typeof o_event.n_id === 'number' && o_event.n_id > 0, 'event has valid n_id');
    f_assert(o_event.n_o_audio_n_id === o_result__extract.o_audio.n_id, 'event FK points to o_audio');
    f_assert(typeof o_event.n_ms_start === 'number', 'event has n_ms_start');
    f_assert(typeof o_event.n_ms_duration === 'number', 'event has n_ms_duration');
    f_assert(typeof o_event.s_type === 'string' && o_event.s_type.length > 0, 'event has s_type');
}

// check event types present
let o_set__type = new Set(a_o_audio_event__db.map(function(o){ return o.s_type; }));
console.log(`  event types found: ${[...o_set__type].join(', ')}`);
f_assert(o_set__type.has('speech') || o_set__type.has('utterance'), 'at least speech or utterance events detected');

// --- test 3: f_analyze_video (combined handler) ---

console.log('\n--- test 3: f_analyze_video (combined: extract + analyze) ---');

// clean up previous data to test the combined flow
f_db_delete_table_data(f_s_name_table__from_o_model(o_model__o_audio_event));
f_db_delete_table_data(f_s_name_table__from_o_model(o_model__o_audio));
f_db_delete_table_data(f_s_name_table__from_o_model(o_model__o_video));
f_db_delete_table_data(f_s_name_table__from_o_model(o_model__o_fsnode));

// reinitialize o_state
for (let o_model of a_o_model) {
    let s_name_table = f_s_name_table__from_o_model(o_model);
    o_state[s_name_table] = o_wsmsg__syncdata.f_v_sync({s_name_table, s_operation: 'read', o_data: {}}) || [];
}

let a_s_progress__combined = [];
let n_ts_start__combined = performance.now();
let o_result__combined = await f_analyze_video(s_path__test_video, function(s_line){
    a_s_progress__combined.push(s_line);
});
let n_ms_elapsed__combined = performance.now() - n_ts_start__combined;

console.log(`  combined analysis took ${(n_ms_elapsed__combined / 1000).toFixed(1)}s`);

f_assert(o_result__combined.o_fsnode !== null, 'combined result has o_fsnode');
f_assert(o_result__combined.o_video !== null, 'combined result has o_video');
f_assert(o_result__combined.o_audio !== null, 'combined result has o_audio');
f_assert(Array.isArray(o_result__combined.a_o_audio_event), 'combined result has a_o_audio_event');
f_assert(o_result__combined.a_o_audio_event.length > 0, 'combined result has events');

// verify final status is 'done'
let a_o_video__db2 = f_v_crud__indb(s_db_read, f_s_name_table__from_o_model(o_model__o_video), {});
f_assert(a_o_video__db2[0].s_status === 'done', 'o_video final status is done after combined flow');

// --- summary ---

console.log(`\n=== results: ${n_test_pass} passed, ${n_test_fail} failed ===\n`);

// cleanup test db
try { await Deno.remove(s_path__test_db, { recursive: true }); } catch { /* ignore */ }

if(n_test_fail > 0) Deno.exit(1);
