// Copyright (C) [2026] [Jonas Immanuel Frey] - Licensed under GPLv2. See LICENSE file for details.

// backend utility functions
// add shared server-side helper functions here and import them where needed

import { s_ds } from './runtimedata.js';
import { s_db_create, s_db_read, s_db_update, s_db_delete } from '../localhost/runtimedata.js';
import { a_o_wsmsg, f_o_model_instance, f_s_name_table__from_o_model, f_o_logmsg, s_o_logmsg_s_type__info, s_o_logmsg_s_type__error, o_model__o_fsnode, o_model__o_utterance, o_wsmsg__deno_copy_file, o_wsmsg__deno_mkdir, o_wsmsg__deno_stat, o_wsmsg__deno_remove, o_wsmsg__f_a_o_fsnode, o_wsmsg__f_delete_table_data, o_wsmsg__f_v_crud__indb, o_wsmsg__logmsg, o_wsmsg__set_state_data, o_wsmsg__syncdata, o_wsmsg__f_extract_audio, o_wsmsg__f_analyze_audio, o_wsmsg__f_analyze_video, o_wsmsg__f_render_composition, f_o_wsmsg } from '../localhost/constructors.js';
import { f_v_crud__indb, f_db_delete_table_data } from './database_functions.js';
import { f_o_uttdatainfo, f_extract_audio, f_analyze_audio, f_analyze_video, f_render_composition } from './cli_functions.js';

let f_a_o_fsnode = async function(
    s_path,
    b_recursive = false,
    b_store_in_db = false
) {
    let a_o = [];

    if (!s_path) {
        console.error('Invalid path:', s_path);
        return a_o;
    }
    if (!s_path.startsWith(s_ds)) {
        console.error('Path is not absolute:', s_path);
        return a_o;
    }

    try {
        for await (let o_dir_entry of Deno.readDir(s_path)) {
            let s_path_absolute = `${s_path}${s_ds}${o_dir_entry.name}`;

            let n_bytes = 0;
            if (!o_dir_entry.isDirectory) {
                try { n_bytes = (await Deno.stat(s_path_absolute)).size; } catch { /* ignore */ }
            }
            let o_fsnode = f_o_model_instance(
                o_model__o_fsnode,
                {
                    s_path_absolute,
                    s_name: s_path_absolute.split(s_ds).at(-1),
                    b_folder: o_dir_entry.isDirectory,
                    n_bytes,
                }
            );
            if(b_store_in_db){
                let s_name_table__fsnode = f_s_name_table__from_o_model(o_model__o_fsnode);
                let o_fsnode__fromdb = (o_wsmsg__syncdata.f_v_sync({s_name_table: s_name_table__fsnode, s_operation: 'read', o_data: { s_path_absolute }}) || []).at(0);
                if (o_fsnode__fromdb) {
                    o_fsnode.n_id = o_fsnode__fromdb.n_id;
                } else {
                    let o_fsnode__created = o_wsmsg__syncdata.f_v_sync({s_name_table: s_name_table__fsnode, s_operation: 'create', o_data: { s_path_absolute, b_folder: o_dir_entry.isDirectory }});
                    o_fsnode.n_id = o_fsnode__created.n_id;
                }
                if (o_dir_entry.isDirectory && b_recursive) {
                    o_fsnode.a_o_fsnode = await f_a_o_fsnode(s_path_absolute, b_recursive);
                }
            }

            a_o.push(o_fsnode);
        }
    } catch (o_error) {
        console.error(`Error reading directory: ${s_path}`, o_error.message);
        console.error(o_error.stack);
    }

    a_o.sort(function(o_a, o_b) {
        if (o_a.b_folder === o_b.b_folder) return (o_a.s_name || '').localeCompare(o_b.s_name || '');
        return o_a.b_folder ? -1 : 1;
    });

    return a_o;
};



// WARNING: the following deno_copy_file, deno_stat, deno_mkdir handlers expose raw Deno APIs
// to any connected WebSocket client with arbitrary arguments. Fine for local dev use,
// but must be restricted or removed before any network-exposed deployment.
o_wsmsg__deno_copy_file.f_v_server_implementation = function(o_wsmsg){
    let a_v_arg = Array.isArray(o_wsmsg.v_data) ? o_wsmsg.v_data : [];
    return Deno.copyFile(...a_v_arg);
}
o_wsmsg__deno_stat.f_v_server_implementation = function(o_wsmsg){
    let a_v_arg = Array.isArray(o_wsmsg.v_data) ? o_wsmsg.v_data : [];
    return Deno.stat(...a_v_arg);
}
o_wsmsg__deno_mkdir.f_v_server_implementation = function(o_wsmsg){
    let a_v_arg = Array.isArray(o_wsmsg.v_data) ? o_wsmsg.v_data : [];
    return Deno.mkdir(...a_v_arg);
}
o_wsmsg__deno_remove.f_v_server_implementation = async function(o_wsmsg){
    let s_path = o_wsmsg.v_data;
    if(!s_path || typeof s_path !== 'string') throw new Error('deno_remove: v_data must be a path string');
    await Deno.remove(s_path, { recursive: false });
    return true;
}
o_wsmsg__f_v_crud__indb.f_v_server_implementation = function(o_wsmsg){
    let a_v_arg = Array.isArray(o_wsmsg.v_data) ? o_wsmsg.v_data : [];
    return f_v_crud__indb(...a_v_arg);
}
o_wsmsg__f_delete_table_data.f_v_server_implementation = function(o_wsmsg){
    let a_v_arg = Array.isArray(o_wsmsg.v_data) ? o_wsmsg.v_data : [];
    return f_db_delete_table_data(...a_v_arg);
}
o_wsmsg__f_a_o_fsnode.f_v_server_implementation = function(o_wsmsg){
    let a_v_arg = Array.isArray(o_wsmsg.v_data) ? o_wsmsg.v_data : [];
    return f_a_o_fsnode(...a_v_arg);
}
o_wsmsg__logmsg.f_v_server_implementation = function(o_wsmsg){
    let o_logmsg = o_wsmsg.v_data;
    if(o_logmsg.b_consolelog){
        console[o_logmsg.s_type](o_logmsg.s_message);
    }
    return null;
}
o_wsmsg__set_state_data.f_v_server_implementation = function(o_wsmsg, o_wsmsg__existing, o_state){
    o_state[o_wsmsg.v_data.s_property] = o_wsmsg.v_data.value;
    return null;
}
let f_o_uttdatainfo__read_or_create = async function(s_text){
    let s_name_table__utterance = f_s_name_table__from_o_model(o_model__o_utterance);
    let s_name_table__fsnode = f_s_name_table__from_o_model(o_model__o_fsnode);
    let a_o_existing = o_wsmsg__syncdata.f_v_sync({s_name_table: s_name_table__utterance, s_operation: 'read', o_data: { s_text }}) || [];
    if(a_o_existing.length > 0){
        let o_utterance = a_o_existing[0];
        let o_fsnode = o_utterance.n_o_fsnode_n_id
            ? (o_wsmsg__syncdata.f_v_sync({s_name_table: s_name_table__fsnode, s_operation: 'read', o_data: { n_id: o_utterance.n_o_fsnode_n_id }}) || []).at(0)
            : null;
        return { o_utterance, o_fsnode };
    }
    // not found in db, generate new utterance audio
    return await f_o_uttdatainfo(s_text);
};

o_wsmsg__f_extract_audio.f_v_server_implementation = async function(o_wsmsg, o_wsmsg__existing, o_state, o_socket__sender){
    let s_path_video = o_wsmsg.v_data;
    if(!s_path_video || typeof s_path_video !== 'string'){
        throw new Error('f_extract_audio: v_data must be a video file path string');
    }
    // stream ffmpeg progress lines to the requesting client as log messages
    let f_on_progress = function(s_line){
        if(o_socket__sender && o_socket__sender.readyState === WebSocket.OPEN){
            o_socket__sender.send(JSON.stringify(
                f_o_wsmsg(
                    o_wsmsg__logmsg.s_name,
                    f_o_logmsg(
                        `[ffmpeg] ${s_line}`,
                        true,
                        true,
                        s_o_logmsg_s_type__info,
                        Date.now(),
                        3000
                    )
                )
            ));
        }
    };
    let o_result = await f_extract_audio(s_path_video, f_on_progress);
    return o_result;
};

o_wsmsg__f_analyze_audio.f_v_server_implementation = async function(o_wsmsg, o_wsmsg__existing, o_state, o_socket__sender){
    let n_o_audio_n_id = o_wsmsg.v_data;
    if(!n_o_audio_n_id || typeof n_o_audio_n_id !== 'number'){
        throw new Error('f_analyze_audio: v_data must be an o_audio n_id (number)');
    }
    let f_on_progress = function(s_line){
        if(o_socket__sender && o_socket__sender.readyState === WebSocket.OPEN){
            o_socket__sender.send(JSON.stringify(
                f_o_wsmsg(
                    o_wsmsg__logmsg.s_name,
                    f_o_logmsg(
                        `[whisper/beats] ${s_line}`,
                        true,
                        true,
                        s_o_logmsg_s_type__info,
                        Date.now(),
                        3000
                    )
                )
            ));
        }
    };
    let o_result = await f_analyze_audio(n_o_audio_n_id, f_on_progress);
    return o_result;
};

o_wsmsg__f_analyze_video.f_v_server_implementation = async function(o_wsmsg, o_wsmsg__existing, o_state, o_socket__sender){
    let s_path_video = o_wsmsg.v_data;
    if(!s_path_video || typeof s_path_video !== 'string'){
        throw new Error('f_analyze_video: v_data must be a video file path string');
    }
    let f_on_progress = function(s_line){
        if(o_socket__sender && o_socket__sender.readyState === WebSocket.OPEN){
            o_socket__sender.send(JSON.stringify(
                f_o_wsmsg(
                    o_wsmsg__logmsg.s_name,
                    f_o_logmsg(
                        `[analyze_video] ${s_line}`,
                        true,
                        true,
                        s_o_logmsg_s_type__info,
                        Date.now(),
                        3000
                    )
                )
            ));
        }
    };
    let o_result = await f_analyze_video(s_path_video, f_on_progress);
    return o_result;
};

o_wsmsg__f_render_composition.f_v_server_implementation = async function(o_wsmsg, o_wsmsg__existing, o_state, o_socket__sender){
    let n_o_composition_n_id = o_wsmsg.v_data;
    if(!n_o_composition_n_id || typeof n_o_composition_n_id !== 'number'){
        throw new Error('f_render_composition: v_data must be an o_composition n_id (number)');
    }
    let f_on_progress = function(s_line){
        if(o_socket__sender && o_socket__sender.readyState === WebSocket.OPEN){
            o_socket__sender.send(JSON.stringify(
                f_o_wsmsg(
                    o_wsmsg__logmsg.s_name,
                    f_o_logmsg(
                        `[render] ${s_line}`,
                        true,
                        true,
                        s_o_logmsg_s_type__info,
                        Date.now(),
                        3000
                    )
                )
            ));
        }
    };
    let o_result = await f_render_composition(n_o_composition_n_id, f_on_progress);
    return o_result;
};

let f_v_result_from_o_wsmsg = async function(
    o_wsmsg,
    o_state,
    o_socket__sender
){
    let o_wsmsg__existing = a_o_wsmsg.find(o=>o.s_name === o_wsmsg.s_name);
    if(!o_wsmsg__existing){
        console.error('No such wsmsg:', o_wsmsg.s_name);
        return null;
    }
    if(!o_wsmsg__existing.f_v_server_implementation) {
        console.error('No server implementation for wsmsg:', o_wsmsg.s_name);
        return null;
    }
    return o_wsmsg__existing.f_v_server_implementation(
        o_wsmsg,
        o_wsmsg__existing,
        o_state,
        o_socket__sender
    );

}

export {
    f_a_o_fsnode,
    f_o_uttdatainfo__read_or_create,
    f_v_result_from_o_wsmsg
};
