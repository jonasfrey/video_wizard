// Copyright (C) [2026] [Jonas Immanuel Frey] - Licensed under GPLv2. See LICENSE file for details.

import { f_o_html_from_o_js } from "./lib/handyhelpers.js";
import { f_send_wsmsg_with_response, o_wsmsg__syncdata, o_state } from './index.js';
import { f_s_path_parent } from './functions.js';
import {
    f_o_wsmsg,
    o_wsmsg__f_a_o_fsnode,
    o_wsmsg__f_analyze_video,
} from './constructors.js';

let a_s_ext__video = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];

let f_b_video = function(s_name){
    if(!s_name) return false;
    let s_lower = s_name.toLowerCase();
    return a_s_ext__video.some(function(s_ext){ return s_lower.endsWith(s_ext); });
};

let o_component__filebrowser = {
    name: 'component-filebrowser',
    template: (await f_o_html_from_o_js({
        s_tag: 'div',
        class: 'o_filebrowser__layout',
        a_o: [
            // --- main file browser column ---
            {
                s_tag: 'div',
                class: 'o_filebrowser',
                a_o: [
                    {
                        s_tag: 'div',
                        class: 'o_filebrowser__path_bar',
                        a_o: [
                            {
                                s_tag: 'div',
                                ':class': "'interactable' + (s_path_absolute === s_ds ? ' disabled' : '')",
                                'v-on:click': 'f_navigate_up',
                                innerText: '..',
                            },
                            {
                                s_tag: 'div',
                                class: 'o_filebrowser__path',
                                innerText: '{{ s_path_absolute }}',
                            },
                        ],
                    },
                    {
                        s_tag: 'div',
                        class: 'o_filebrowser__list',
                        a_o: [
                            {
                                s_tag: 'div',
                                'v-for': 'o_fsnode of a_o_fsnode',
                                ':class': "'o_fsnode ' + (o_fsnode.b_folder ? 'interactable' : 'file')",
                                'v-on:click': 'f_click_fsnode(o_fsnode)',
                                a_o: [
                                    {
                                        s_tag: 'div',
                                        class: 'o_fsnode__type',
                                        innerText: "{{ o_fsnode.b_folder ? 'dir' : 'file' }}",
                                    },
                                    {
                                        s_tag: 'div',
                                        class: 'o_fsnode__name',
                                        innerText: '{{ o_fsnode.s_name }}',
                                    },
                                    {
                                        s_tag: 'div',
                                        'v-if': 'f_b_video(o_fsnode.s_name) && !o_fsnode.b_folder',
                                        ':class': "'o_fsnode__analyze interactable' + (o_set__s_path__analyzing.has(o_fsnode.s_path_absolute) ? ' loading' : '')",
                                        'v-on:click.stop': 'f_analyze(o_fsnode)',
                                        innerText: "{{ o_set__s_path__analyzing.has(o_fsnode.s_path_absolute) ? 'Analyzing...' : (f_b_analyzed(o_fsnode) ? 'Re-analyze' : 'Analyze') }}",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            // --- sidebar: analyzed videos ---
            {
                s_tag: 'div',
                class: 'o_sidebar__analyzed',
                a_o: [
                    {
                        s_tag: 'div',
                        class: 'o_sidebar__title',
                        innerText: 'Analyzed Videos',
                    },
                    {
                        s_tag: 'div',
                        'v-if': 'a_o_video__with_fsnode.length === 0',
                        class: 'o_sidebar__empty',
                        innerText: 'No videos analyzed yet.',
                    },
                    {
                        s_tag: 'div',
                        class: 'o_sidebar__list',
                        a_o: [
                            {
                                s_tag: 'div',
                                'v-for': 'o_entry of a_o_video__with_fsnode',
                                class: 'o_sidebar__item interactable',
                                'v-on:click': 'f_jump_to_video(o_entry.o_fsnode)',
                                a_o: [
                                    {
                                        s_tag: 'div',
                                        class: 'o_sidebar__item_name',
                                        innerText: '{{ o_entry.o_fsnode.s_name }}',
                                    },
                                    {
                                        s_tag: 'div',
                                        ':class': "'o_sidebar__item_status status__' + o_entry.o_video.s_status",
                                        innerText: '{{ o_entry.o_video.s_status }}',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    })).outerHTML,
    data: function() {
        return {
            s_path_absolute: '/',
            s_ds: '/',
            a_o_fsnode: [],
            o_set__s_path__analyzing: new Set(),
        };
    },
    computed: {
        a_o_video__with_fsnode: function(){
            let a_o_video = o_state.a_o_video || [];
            let a_o_fsnode = o_state.a_o_fsnode || [];
            let a_o_result = [];
            for(let o_video of a_o_video){
                let o_fsnode = a_o_fsnode.find(function(o){ return o.n_id === o_video.n_o_fsnode_n_id; });
                if(o_fsnode){
                    a_o_result.push({ o_video, o_fsnode });
                }
            }
            return a_o_result;
        },
    },
    methods: {
        f_b_video: f_b_video,
        f_b_analyzed: function(o_fsnode){
            let a_o_video = o_state.a_o_video || [];
            return a_o_video.some(function(o){ return o.n_o_fsnode_n_id === o_fsnode.n_id && o.s_status === 'done'; });
        },
        f_load_a_o_fsnode: async function() {
            let o_resp = await f_send_wsmsg_with_response(
                f_o_wsmsg(o_wsmsg__f_a_o_fsnode.s_name, [
                    this.s_path_absolute,
                    false,
                    false
                ])
            );
            this.a_o_fsnode = o_resp.v_result || [];
        },
        f_save_path: async function(s_path_absolute) {
            await o_wsmsg__syncdata.f_v_sync({
                s_name_table: 'a_o_keyvalpair',
                s_operation: 'update',
                o_data: { n_id: o_state.o_keyvalpair__s_path_absolute__filebrowser.n_id, s_value: s_path_absolute }
            });
        },
        f_click_fsnode: async function(o_fsnode) {
            if (!o_fsnode.b_folder) return;
            this.s_path_absolute = o_fsnode.s_path_absolute;
            await this.f_save_path(this.s_path_absolute);
            await this.f_load_a_o_fsnode();
        },
        f_navigate_up: async function() {
            let s_path_parent = f_s_path_parent(this.s_path_absolute, this.s_ds);
            if (s_path_parent === this.s_path_absolute) return;
            this.s_path_absolute = s_path_parent;
            await this.f_save_path(this.s_path_absolute);
            await this.f_load_a_o_fsnode();
        },
        f_analyze: async function(o_fsnode){
            if(this.o_set__s_path__analyzing.has(o_fsnode.s_path_absolute)) return;
            this.o_set__s_path__analyzing.add(o_fsnode.s_path_absolute);
            this.o_set__s_path__analyzing = new Set(this.o_set__s_path__analyzing);

            // create CLI task entry
            let o_task = {
                s_name: 'Analyze: ' + o_fsnode.s_name,
                s_status: 'running',
                n_ts_ms_start: Date.now(),
                n_ts_ms_end: null,
                a_s_log: [],
            };
            o_state.a_o_cli_task.push(o_task);

            try {
                await f_send_wsmsg_with_response(
                    f_o_wsmsg(o_wsmsg__f_analyze_video.s_name, o_fsnode.s_path_absolute),
                    600000 // 10 minute timeout for analysis
                );
                o_task.s_status = 'done';
            } catch(o_err) {
                console.error('analyze failed:', o_err.message);
                o_task.s_status = 'error';
                o_task.a_s_log.push('ERROR: ' + o_err.message);
            } finally {
                o_task.n_ts_ms_end = Date.now();
                this.o_set__s_path__analyzing.delete(o_fsnode.s_path_absolute);
                this.o_set__s_path__analyzing = new Set(this.o_set__s_path__analyzing);
            }
        },
        f_jump_to_video: async function(o_fsnode){
            let s_path_parent = f_s_path_parent(o_fsnode.s_path_absolute, this.s_ds);
            this.s_path_absolute = s_path_parent;
            await this.f_save_path(this.s_path_absolute);
            await this.f_load_a_o_fsnode();
        },
    },
    created: function() {
        let o_self = this;
        let n_id__init = setInterval(async function() {
            let o_kv_path = o_state.o_keyvalpair__s_path_absolute__filebrowser;
            let o_kv_ds = o_state.o_keyvalpair__s_ds;
            if (o_kv_path && o_kv_path.s_value && o_kv_ds && o_kv_ds.s_value) {
                clearInterval(n_id__init);
                o_self.s_ds = o_kv_ds.s_value;
                o_self.s_path_absolute = o_kv_path.s_value;
                await o_self.f_load_a_o_fsnode();
            }
        }, 50);
    },
};

export { o_component__filebrowser };
