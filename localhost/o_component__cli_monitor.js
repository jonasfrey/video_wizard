// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under GPLv2. See LICENSE file for details.

import { f_o_html_from_o_js } from "./lib/handyhelpers.js";
import { o_state } from './index.js';

let o_component__cli_monitor = {
    name: 'component-cli-monitor',
    template: (await f_o_html_from_o_js({
        s_tag: 'div',
        class: 'o_cli_monitor',
        a_o: [
            {
                s_tag: 'div',
                class: 'o_cli_monitor__header',
                a_o: [
                    {
                        s_tag: 'div',
                        class: 'o_cli_monitor__title',
                        innerText: 'CLI Tasks',
                    },
                    {
                        s_tag: 'div',
                        'v-if': 'a_o_task.length > 0',
                        class: 'o_cli_monitor__clear interactable',
                        'v-on:click': 'f_clear_finished',
                        innerText: 'Clear finished',
                    },
                ],
            },
            {
                s_tag: 'div',
                'v-if': 'a_o_task.length === 0',
                class: 'o_cli_monitor__empty',
                innerText: 'No tasks.',
            },
            {
                s_tag: 'div',
                class: 'o_cli_monitor__list',
                a_o: [
                    {
                        s_tag: 'div',
                        'v-for': '(o_task, n_idx) of a_o_task',
                        ':key': 'n_idx',
                        ':class': "'o_task' + (o_task.s_status === 'error' ? ' o_task__error' : '')",
                        a_o: [
                            {
                                s_tag: 'div',
                                class: 'o_task__header interactable',
                                'v-on:click': 'f_toggle_task(n_idx)',
                                a_o: [
                                    {
                                        s_tag: 'div',
                                        ':class': "'o_task__status status__' + o_task.s_status",
                                        innerText: '{{ o_task.s_status }}',
                                    },
                                    {
                                        s_tag: 'div',
                                        class: 'o_task__name',
                                        innerText: '{{ o_task.s_name }}',
                                    },
                                    {
                                        s_tag: 'div',
                                        class: 'o_task__elapsed',
                                        innerText: '{{ f_s_elapsed(o_task) }}',
                                    },
                                    {
                                        s_tag: 'div',
                                        class: 'o_task__toggle',
                                        innerText: "{{ o_set__n_idx__expanded.has(n_idx) ? 'v' : '>' }}",
                                    },
                                ],
                            },
                            {
                                s_tag: 'div',
                                'v-if': "o_task.s_status === 'error' && !o_set__n_idx__expanded.has(n_idx)",
                                class: 'o_task__error_preview',
                                innerText: "{{ o_task.a_s_log.filter(s => s.startsWith('ERROR')).join(' ') || 'Error occurred — expand for details' }}",
                            },
                            {
                                s_tag: 'div',
                                'v-if': 'o_set__n_idx__expanded.has(n_idx)',
                                class: 'o_task__log',
                                a_o: [
                                    {
                                        s_tag: 'div',
                                        'v-for': '(s_line, n_idx_line) of o_task.a_s_log',
                                        ':key': 'n_idx_line',
                                        ':class': "'o_task__log_line' + (s_line.startsWith('ERROR') ? ' o_task__log_line__error' : '')",
                                        innerText: '{{ s_line }}',
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
            o_set__n_idx__expanded: new Set(),
        };
    },
    computed: {
        a_o_task: function(){
            return o_state.a_o_cli_task || [];
        },
    },
    methods: {
        f_toggle_task: function(n_idx){
            if(this.o_set__n_idx__expanded.has(n_idx)){
                this.o_set__n_idx__expanded.delete(n_idx);
            } else {
                this.o_set__n_idx__expanded.add(n_idx);
            }
            this.o_set__n_idx__expanded = new Set(this.o_set__n_idx__expanded);
        },
        f_s_elapsed: function(o_task){
            let n_ms = 0;
            if(o_task.s_status === 'running'){
                n_ms = o_state.n_ts_ms_now - o_task.n_ts_ms_start;
            } else if(o_task.n_ts_ms_end){
                n_ms = o_task.n_ts_ms_end - o_task.n_ts_ms_start;
            }
            let n_sec = Math.floor(n_ms / 1000);
            let n_min = Math.floor(n_sec / 60);
            n_sec = n_sec % 60;
            return `${n_min}:${String(n_sec).padStart(2, '0')}`;
        },
        f_clear_finished: function(){
            o_state.a_o_cli_task = o_state.a_o_cli_task.filter(function(o){
                return o.s_status === 'running';
            });
            this.o_set__n_idx__expanded = new Set();
        },
    },
};

export { o_component__cli_monitor };
