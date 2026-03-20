// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under GPLv2. See LICENSE file for details.

import { f_o_html_from_o_js } from "./lib/handyhelpers.js";
import { f_send_wsmsg_with_response, o_wsmsg__syncdata, o_state } from './index.js';
import {
    f_o_wsmsg,
    o_wsmsg__f_render_composition,
    o_wsmsg__f_a_o_fsnode,
} from './constructors.js';

let o_component__export = {
    name: 'component-export',
    template: (await f_o_html_from_o_js({
        s_tag: 'div',
        class: 'o_export',
        a_o: [
            {
                s_tag: 'div',
                class: 'o_export__title',
                innerText: 'Export Compositions',
            },
            {
                s_tag: 'div',
                'v-if': 'a_o_composition__display.length === 0',
                class: 'o_export__empty',
                innerText: 'No compositions found. Create one in the Composition editor.',
            },
            {
                s_tag: 'div',
                class: 'o_export__list',
                a_o: [
                    {
                        s_tag: 'div',
                        'v-for': 'o_entry of a_o_composition__display',
                        ':key': 'o_entry.o_composition.n_id',
                        class: 'o_export__entry',
                        a_o: [
                            {
                                s_tag: 'div',
                                class: 'o_export__item',
                                a_o: [
                                    {
                                        s_tag: 'div',
                                        class: 'o_export__item_info',
                                        a_o: [
                                            {
                                                s_tag: 'div',
                                                class: 'o_export__item_name',
                                                innerText: '{{ o_entry.o_composition.s_name }}',
                                            },
                                            {
                                                s_tag: 'div',
                                                class: 'o_export__item_detail',
                                                innerText: '{{ o_entry.s_video_name }} | {{ o_entry.n_cnt__event }} events',
                                            },
                                        ],
                                    },
                                    {
                                        s_tag: 'div',
                                        'v-if': 'o_map__result.has(o_entry.o_composition.n_id)',
                                        class: 'o_export__item_size',
                                        innerText: '{{ f_s_filesize(o_map__result.get(o_entry.o_composition.n_id).n_bytes) }}',
                                    },
                                    {
                                        s_tag: 'div',
                                        'v-if': 'o_map__result.has(o_entry.o_composition.n_id)',
                                        class: 'o_export__preview interactable',
                                        'v-on:click': 'f_toggle_preview(o_entry.o_composition.n_id)',
                                        innerText: "{{ n_id__preview === o_entry.o_composition.n_id ? 'Hide' : 'Preview' }}",
                                    },
                                    {
                                        s_tag: 'a',
                                        'v-if': 'o_map__result.has(o_entry.o_composition.n_id)',
                                        ':href': "'/api/file?path=' + encodeURIComponent(o_map__result.get(o_entry.o_composition.n_id).s_path_output)",
                                        target: '_blank',
                                        download: '',
                                        class: 'o_export__download interactable',
                                        innerText: 'Download',
                                    },
                                    {
                                        s_tag: 'div',
                                        ':class': "'o_export__render interactable' + (o_set__n_id__rendering.has(o_entry.o_composition.n_id) ? ' loading' : '')",
                                        'v-on:click': 'f_render(o_entry.o_composition)',
                                        innerText: "{{ o_set__n_id__rendering.has(o_entry.o_composition.n_id) ? 'Rendering...' : (o_map__result.has(o_entry.o_composition.n_id) ? 'Re-render' : 'Render') }}",
                                    },
                                ],
                            },
                            {
                                s_tag: 'div',
                                'v-if': 'n_id__preview === o_entry.o_composition.n_id && o_map__result.has(o_entry.o_composition.n_id)',
                                class: 'o_export__video_wrap',
                                a_o: [
                                    {
                                        s_tag: 'video',
                                        ':src': "'/api/file?path=' + encodeURIComponent(o_map__result.get(o_entry.o_composition.n_id).s_path_output)",
                                        class: 'o_export__video',
                                        controls: true,
                                        preload: 'auto',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            // disk usage
            {
                s_tag: 'div',
                class: 'o_export__disk',
                a_o: [
                    {
                        s_tag: 'div',
                        class: 'o_export__disk_title',
                        innerText: 'Disk Usage',
                    },
                    {
                        s_tag: 'div',
                        class: 'o_export__disk_row',
                        a_o: [
                            { s_tag: 'div', class: 'o_export__disk_label', innerText: 'Extracted audio' },
                            { s_tag: 'div', class: 'o_export__disk_value', innerText: '{{ f_s_filesize(n_bytes__audio) }}' },
                            {
                                s_tag: 'div',
                                'v-if': 'n_bytes__audio > 0',
                                class: 'o_export__cleanup interactable',
                                'v-on:click': "f_cleanup('audio')",
                                innerText: 'Clean',
                            },
                        ],
                    },
                    {
                        s_tag: 'div',
                        class: 'o_export__disk_row',
                        a_o: [
                            { s_tag: 'div', class: 'o_export__disk_label', innerText: 'Exports' },
                            { s_tag: 'div', class: 'o_export__disk_value', innerText: '{{ f_s_filesize(n_bytes__export) }}' },
                            {
                                s_tag: 'div',
                                'v-if': 'n_bytes__export > 0',
                                class: 'o_export__cleanup interactable',
                                'v-on:click': "f_cleanup('export')",
                                innerText: 'Clean',
                            },
                        ],
                    },
                ],
            },
        ],
    })).outerHTML,
    data: function() {
        return {
            o_set__n_id__rendering: new Set(),
            o_map__result: new Map(),
            n_id__preview: null,
            n_bytes__audio: 0,
            n_bytes__export: 0,
        };
    },
    computed: {
        a_o_composition__display: function(){
            let a_o_composition = o_state.a_o_composition || [];
            let a_o_video = o_state.a_o_video || [];
            let a_o_fsnode = o_state.a_o_fsnode || [];
            let a_o_junction = o_state.a_o_composition_o_audio_event || [];
            return a_o_composition.map(function(o_comp){
                let o_video = a_o_video.find(function(o){ return o.n_id === o_comp.n_o_video_n_id; });
                let o_fsnode = o_video ? a_o_fsnode.find(function(o){ return o.n_id === o_video.n_o_fsnode_n_id; }) : null;
                let n_cnt__event = a_o_junction.filter(function(o){ return o.n_o_composition_n_id === o_comp.n_id; }).length;
                return {
                    o_composition: o_comp,
                    s_video_name: o_fsnode ? o_fsnode.s_name : '(unknown)',
                    n_cnt__event: n_cnt__event,
                };
            });
        },
    },
    methods: {
        f_s_filesize: function(n_bytes){
            if(!n_bytes || n_bytes === 0) return '0 B';
            let a_s_unit = ['B', 'KB', 'MB', 'GB'];
            let n_idx = 0;
            let n_val = n_bytes;
            while(n_val >= 1024 && n_idx < a_s_unit.length - 1){
                n_val /= 1024;
                n_idx++;
            }
            return n_val.toFixed(1) + ' ' + a_s_unit[n_idx];
        },
        f_toggle_preview: function(n_id){
            this.n_id__preview = this.n_id__preview === n_id ? null : n_id;
        },
        f_render: async function(o_composition){
            if(this.o_set__n_id__rendering.has(o_composition.n_id)) return;
            this.o_set__n_id__rendering.add(o_composition.n_id);
            this.o_set__n_id__rendering = new Set(this.o_set__n_id__rendering);

            let o_task = {
                s_name: 'Render: ' + o_composition.s_name,
                s_status: 'running',
                n_ts_ms_start: Date.now(),
                n_ts_ms_end: null,
                a_s_log: [],
            };
            o_state.a_o_cli_task.push(o_task);

            try {
                let o_resp = await f_send_wsmsg_with_response(
                    f_o_wsmsg(o_wsmsg__f_render_composition.s_name, o_composition.n_id),
                    600000
                );
                if(o_resp.s_error) throw new Error(o_resp.s_error);
                let o_result = o_resp.v_result;
                this.o_map__result.set(o_composition.n_id, {
                    s_path_output: o_result.s_path_output,
                    n_bytes: o_result.n_bytes,
                });
                this.o_map__result = new Map(this.o_map__result);
                o_task.s_status = 'done';
                this.f_refresh_disk_usage();
            } catch(o_err) {
                console.error('render failed:', o_err.message);
                o_task.s_status = 'error';
                o_task.a_s_log.push('ERROR: ' + o_err.message);
            } finally {
                o_task.n_ts_ms_end = Date.now();
                this.o_set__n_id__rendering.delete(o_composition.n_id);
                this.o_set__n_id__rendering = new Set(this.o_set__n_id__rendering);
            }
        },
        f_n_bytes__from_dir: async function(s_path){
            if(!s_path) return 0;
            try {
                let o_resp = await f_send_wsmsg_with_response(
                    f_o_wsmsg(o_wsmsg__f_a_o_fsnode.s_name, [s_path, false, false])
                );
                let a_o = o_resp.v_result || [];
                let n_total = 0;
                for(let o of a_o) n_total += (o.n_bytes || 0);
                return n_total;
            } catch{ return 0; }
        },
        f_refresh_disk_usage: async function(){
            this.n_bytes__audio = await this.f_n_bytes__from_dir(o_state.s_path__audio || '');
            this.n_bytes__export = await this.f_n_bytes__from_dir(o_state.s_path__export || '');
        },
        f_cleanup: async function(s_type){
            let s_path = s_type === 'audio' ? o_state.s_path__audio : o_state.s_path__export;
            if(!s_path) return;
            if(!confirm('Delete all files in ' + s_path + '?')) return;
            try {
                let o_resp = await f_send_wsmsg_with_response(
                    f_o_wsmsg(o_wsmsg__f_a_o_fsnode.s_name, [s_path, false, false])
                );
                let a_o = o_resp.v_result || [];
                for(let o of a_o){
                    if(!o.b_folder){
                        try {
                            await f_send_wsmsg_with_response(
                                f_o_wsmsg('deno_remove', o.s_path_absolute)
                            );
                        } catch(o_err){ console.error('failed to remove:', o.s_path_absolute, o_err.message); }
                    }
                }
            } catch(o_err){ console.error('cleanup failed:', o_err.message); }
            await this.f_refresh_disk_usage();
        },
    },
    created: function(){
        let o_self = this;
        // wait for paths to arrive from server
        let n_id__init = setInterval(function(){
            if(o_state.s_path__audio && o_state.s_path__export){
                clearInterval(n_id__init);
                o_self.f_refresh_disk_usage();
            }
        }, 200);
    },
};

export { o_component__export };
