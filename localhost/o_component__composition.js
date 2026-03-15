// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under GPLv2. See LICENSE file for details.

import { f_o_html_from_o_js } from "./lib/handyhelpers.js";
import { f_send_wsmsg_with_response, o_wsmsg__syncdata, o_state } from './index.js';
import {
    f_o_wsmsg,
    f_s_name_table__from_o_model,
    o_model__o_composition,
    o_model__o_composition_o_audio_event,
    s_name_prop_id,
} from './constructors.js';

let o_component__composition = {
    name: 'component-composition',
    template: (await f_o_html_from_o_js({
        s_tag: 'div',
        class: 'o_composition',
        a_o: [
            // --- top: video selector + composition name ---
            {
                s_tag: 'div',
                class: 'o_composition__toolbar',
                a_o: [
                    {
                        s_tag: 'select',
                        class: 'o_composition__select_video',
                        'v-model': 'n_o_video_n_id__selected',
                        'v-on:change': 'f_on_video_change',
                        a_o: [
                            {
                                s_tag: 'option',
                                ':value': '0',
                                innerText: '-- select video --',
                            },
                            {
                                s_tag: 'option',
                                'v-for': 'o_entry of a_o_video__done',
                                ':value': 'o_entry.o_video.n_id',
                                innerText: '{{ o_entry.o_fsnode.s_name }}',
                            },
                        ],
                    },
                    {
                        s_tag: 'input',
                        'v-if': 'o_composition',
                        'v-model': 's_name__composition',
                        placeholder: 'Composition name',
                        'v-on:change': 'f_save_name',
                        class: 'o_composition__name_input',
                    },
                    {
                        s_tag: 'div',
                        'v-if': 'o_composition',
                        class: 'o_composition__save interactable',
                        'v-on:click': 'f_save_composition',
                        innerText: 'Save',
                    },
                    {
                        s_tag: 'div',
                        'v-if': 'o_composition && a_n_id__selected.length > 0',
                        class: 'o_composition__preview interactable',
                        'v-on:click': 'f_preview',
                        innerText: "{{ b_previewing ? 'Stop' : 'Preview' }}",
                    },
                ],
            },
            // --- video preview ---
            {
                s_tag: 'div',
                'v-if': 's_path__video',
                class: 'o_composition__video_wrap',
                a_o: [
                    {
                        s_tag: 'video',
                        ref: 'el_video',
                        ':src': 's_url__video',
                        class: 'o_composition__video',
                        preload: 'auto',
                    },
                ],
            },
            // --- search / filter ---
            {
                s_tag: 'div',
                'v-if': 'a_o_audio_event__all.length > 0',
                class: 'o_composition__search_bar',
                a_o: [
                    {
                        s_tag: 'input',
                        'v-model': 's_search',
                        placeholder: 'Search text / select by phrase...',
                        class: 'o_composition__search_input',
                        'v-on:keyup.enter': 'f_select_by_text',
                    },
                    {
                        s_tag: 'div',
                        class: 'o_composition__select_text interactable',
                        'v-on:click': 'f_select_by_text',
                        innerText: 'Select matches',
                    },
                    {
                        s_tag: 'div',
                        class: 'o_composition__clear interactable',
                        'v-on:click': 'f_clear_selection',
                        innerText: 'Clear',
                    },
                    {
                        s_tag: 'div',
                        class: 'o_composition__info',
                        innerText: '{{ a_n_id__selected.length }} selected / {{ a_o_audio_event__filtered.length }} shown',
                    },
                ],
            },
            // --- timeline: selected events (reorderable) ---
            {
                s_tag: 'div',
                'v-if': 'a_o_audio_event__selected.length > 0',
                class: 'o_composition__selected',
                a_o: [
                    {
                        s_tag: 'div',
                        class: 'o_composition__section_title',
                        innerText: 'Selected Events (drag to reorder)',
                    },
                    {
                        s_tag: 'div',
                        class: 'o_timeline__selected',
                        a_o: [
                            {
                                s_tag: 'div',
                                'v-for': '(o_event, n_idx) of a_o_audio_event__selected',
                                ':key': 'o_event.n_id',
                                ':class': "'o_event o_event__selected interactable event_type__' + o_event.s_type",
                                draggable: 'true',
                                'v-on:dragstart': 'f_drag_start(n_idx, $event)',
                                'v-on:dragover.prevent': 'f_drag_over(n_idx, $event)',
                                'v-on:drop': 'f_drop(n_idx, $event)',
                                'v-on:click': 'f_deselect(o_event)',
                                ':title': "'Click to deselect. ' + o_event.s_text",
                                a_o: [
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__order',
                                        innerText: '{{ n_idx + 1 }}',
                                    },
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__text',
                                        innerText: '{{ o_event.s_text }}',
                                    },
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__type',
                                        innerText: '{{ o_event.s_type }}',
                                    },
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__time',
                                        innerText: '{{ f_s_time(o_event.n_ms_start) }}',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            // --- timeline: all events ---
            {
                s_tag: 'div',
                'v-if': 'a_o_audio_event__all.length > 0',
                class: 'o_composition__timeline',
                a_o: [
                    {
                        s_tag: 'div',
                        class: 'o_composition__section_title',
                        innerText: 'All Events',
                    },
                    {
                        s_tag: 'div',
                        class: 'o_timeline__all',
                        a_o: [
                            {
                                s_tag: 'div',
                                'v-for': 'o_event of a_o_audio_event__filtered',
                                ':key': 'o_event.n_id',
                                ':class': "'o_event interactable event_type__' + o_event.s_type + (o_set__n_id__selected.has(o_event.n_id) ? ' selected' : '')",
                                'v-on:click': 'f_toggle_select(o_event)',
                                ':title': 'o_event.s_text',
                                a_o: [
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__text',
                                        innerText: '{{ o_event.s_text }}',
                                    },
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__type',
                                        innerText: '{{ o_event.s_type }}',
                                    },
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__time',
                                        innerText: '{{ f_s_time(o_event.n_ms_start) }} ({{ (o_event.n_ms_duration / 1000).toFixed(1) }}s)',
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
            n_o_video_n_id__selected: 0,
            o_composition: null,
            s_name__composition: '',
            s_search: '',
            a_n_id__selected: [],    // ordered array of selected event n_id
            o_set__n_id__selected: new Set(),
            n_idx__drag: -1,
            b_previewing: false,
            n_id__preview_timeout: null,
        };
    },
    computed: {
        a_o_video__done: function(){
            let a_o_video = o_state.a_o_video || [];
            let a_o_fsnode = o_state.a_o_fsnode || [];
            let a_o = [];
            for(let o_video of a_o_video){
                if(o_video.s_status !== 'done') continue;
                let o_fsnode = a_o_fsnode.find(function(o){ return o.n_id === o_video.n_o_fsnode_n_id; });
                if(o_fsnode) a_o.push({ o_video, o_fsnode });
            }
            return a_o;
        },
        s_path__video: function(){
            if(!this.n_o_video_n_id__selected) return '';
            let o_entry = this.a_o_video__done.find(function(o){ return o.o_video.n_id === this.n_o_video_n_id__selected; }.bind(this));
            return o_entry ? o_entry.o_fsnode.s_path_absolute : '';
        },
        s_url__video: function(){
            if(!this.s_path__video) return '';
            return '/api/file?path=' + encodeURIComponent(this.s_path__video);
        },
        a_o_audio_event__all: function(){
            if(!this.n_o_video_n_id__selected) return [];
            let a_o_audio = o_state.a_o_audio || [];
            let a_o_audio_event = o_state.a_o_audio_event || [];
            // find audio records for this video
            let o_set__n_id__audio = new Set();
            for(let o_audio of a_o_audio){
                if(o_audio.n_o_video_n_id === this.n_o_video_n_id__selected){
                    o_set__n_id__audio.add(o_audio.n_id);
                }
            }
            return a_o_audio_event
                .filter(function(o){ return o_set__n_id__audio.has(o.n_o_audio_n_id); })
                .sort(function(a, b){ return a.n_ms_start - b.n_ms_start; });
        },
        a_o_audio_event__filtered: function(){
            if(!this.s_search) return this.a_o_audio_event__all;
            let s_lower = this.s_search.toLowerCase();
            return this.a_o_audio_event__all.filter(function(o){
                return (o.s_text || '').toLowerCase().includes(s_lower)
                    || (o.s_type || '').toLowerCase().includes(s_lower);
            });
        },
        a_o_audio_event__selected: function(){
            let o_self = this;
            let o_map = new Map();
            for(let o_event of this.a_o_audio_event__all){
                o_map.set(o_event.n_id, o_event);
            }
            return this.a_n_id__selected
                .map(function(n_id){ return o_map.get(n_id); })
                .filter(function(o){ return o != null; });
        },
    },
    methods: {
        f_s_time: function(n_ms){
            let n_sec = Math.floor(n_ms / 1000);
            let n_min = Math.floor(n_sec / 60);
            n_sec = n_sec % 60;
            let n_ms_rem = n_ms % 1000;
            return n_min + ':' + String(n_sec).padStart(2, '0') + '.' + String(n_ms_rem).padStart(3, '0');
        },
        f_on_video_change: async function(){
            this.a_n_id__selected = [];
            this.o_set__n_id__selected = new Set();
            this.o_composition = null;
            this.s_name__composition = '';
            this.f_stop_preview();
            if(!this.n_o_video_n_id__selected) return;
            // find or create composition for this video
            let a_o_composition = o_state.a_o_composition || [];
            let n_vid = this.n_o_video_n_id__selected;
            let o_existing = a_o_composition.find(function(o){ return o.n_o_video_n_id === n_vid; });
            if(o_existing){
                this.o_composition = o_existing;
                this.s_name__composition = o_existing.s_name;
                this.f_load_selection();
            } else {
                let s_name_table = f_s_name_table__from_o_model(o_model__o_composition);
                let o_entry = this.a_o_video__done.find(function(o){ return o.o_video.n_id === n_vid; });
                let s_default_name = o_entry ? o_entry.o_fsnode.s_name.replace(/\.[^.]+$/, '') : 'Untitled';
                let o_created = await o_wsmsg__syncdata.f_v_sync({
                    s_name_table: s_name_table,
                    s_operation: 'create',
                    o_data: {
                        n_o_video_n_id: n_vid,
                        s_name: s_default_name,
                    }
                });
                this.o_composition = o_created;
                this.s_name__composition = o_created.s_name;
            }
        },
        f_load_selection: function(){
            if(!this.o_composition) return;
            let a_o_junction = o_state.a_o_composition_o_audio_event || [];
            let n_comp_id = this.o_composition.n_id;
            let a_o_for_comp = a_o_junction
                .filter(function(o){ return o.n_o_composition_n_id === n_comp_id; })
                .sort(function(a, b){ return a.n_order - b.n_order; });
            this.a_n_id__selected = a_o_for_comp.map(function(o){ return o.n_o_audio_event_n_id; });
            this.o_set__n_id__selected = new Set(this.a_n_id__selected);
        },
        f_save_name: async function(){
            if(!this.o_composition) return;
            let s_name_table = f_s_name_table__from_o_model(o_model__o_composition);
            await o_wsmsg__syncdata.f_v_sync({
                s_name_table: s_name_table,
                s_operation: 'update',
                o_data: { n_id: this.o_composition.n_id, s_name: this.s_name__composition }
            });
        },
        f_toggle_select: function(o_event){
            if(this.o_set__n_id__selected.has(o_event.n_id)){
                this.f_deselect(o_event);
            } else {
                this.a_n_id__selected.push(o_event.n_id);
                this.o_set__n_id__selected.add(o_event.n_id);
                this.o_set__n_id__selected = new Set(this.o_set__n_id__selected);
            }
        },
        f_deselect: function(o_event){
            let n_idx = this.a_n_id__selected.indexOf(o_event.n_id);
            if(n_idx !== -1) this.a_n_id__selected.splice(n_idx, 1);
            this.o_set__n_id__selected.delete(o_event.n_id);
            this.o_set__n_id__selected = new Set(this.o_set__n_id__selected);
        },
        f_clear_selection: function(){
            this.a_n_id__selected = [];
            this.o_set__n_id__selected = new Set();
        },
        f_select_by_text: function(){
            if(!this.s_search) return;
            let s_lower = this.s_search.toLowerCase();
            let o_self = this;
            for(let o_event of this.a_o_audio_event__all){
                if((o_event.s_text || '').toLowerCase().includes(s_lower)){
                    if(!o_self.o_set__n_id__selected.has(o_event.n_id)){
                        o_self.a_n_id__selected.push(o_event.n_id);
                        o_self.o_set__n_id__selected.add(o_event.n_id);
                    }
                }
            }
            this.o_set__n_id__selected = new Set(this.o_set__n_id__selected);
        },
        // drag reorder
        f_drag_start: function(n_idx, o_evt){
            this.n_idx__drag = n_idx;
            o_evt.dataTransfer.effectAllowed = 'move';
        },
        f_drag_over: function(n_idx, o_evt){
            o_evt.dataTransfer.dropEffect = 'move';
        },
        f_drop: function(n_idx__target, o_evt){
            o_evt.preventDefault();
            if(this.n_idx__drag === -1 || this.n_idx__drag === n_idx__target) return;
            let n_id = this.a_n_id__selected.splice(this.n_idx__drag, 1)[0];
            this.a_n_id__selected.splice(n_idx__target, 0, n_id);
            this.n_idx__drag = -1;
        },
        // save composition to DB
        f_save_composition: async function(){
            if(!this.o_composition) return;
            let s_name_table = f_s_name_table__from_o_model(o_model__o_composition_o_audio_event);
            let n_comp_id = this.o_composition.n_id;
            // delete existing junction records for this composition
            let a_o_junction = (o_state.a_o_composition_o_audio_event || [])
                .filter(function(o){ return o.n_o_composition_n_id === n_comp_id; });
            for(let o_j of a_o_junction){
                await o_wsmsg__syncdata.f_v_sync({
                    s_name_table: s_name_table,
                    s_operation: 'delete',
                    o_data: { n_id: o_j.n_id }
                });
            }
            // create new junction records in order
            for(let n_idx = 0; n_idx < this.a_n_id__selected.length; n_idx++){
                await o_wsmsg__syncdata.f_v_sync({
                    s_name_table: s_name_table,
                    s_operation: 'create',
                    o_data: {
                        n_o_composition_n_id: n_comp_id,
                        n_o_audio_event_n_id: this.a_n_id__selected[n_idx],
                        n_order: n_idx,
                    }
                });
            }
            // also save name
            await this.f_save_name();
        },
        // preview playback
        f_preview: function(){
            if(this.b_previewing){
                this.f_stop_preview();
                return;
            }
            let el_video = this.$refs.el_video;
            if(!el_video || this.a_o_audio_event__selected.length === 0) return;
            this.b_previewing = true;
            let a_o_event = this.a_o_audio_event__selected;
            let n_idx = 0;
            let o_self = this;
            let f_play_next = function(){
                if(n_idx >= a_o_event.length || !o_self.b_previewing){
                    o_self.f_stop_preview();
                    return;
                }
                let o_event = a_o_event[n_idx];
                el_video.currentTime = o_event.n_ms_start / 1000;
                el_video.play();
                n_idx++;
                o_self.n_id__preview_timeout = setTimeout(function(){
                    el_video.pause();
                    f_play_next();
                }, o_event.n_ms_duration);
            };
            f_play_next();
        },
        f_stop_preview: function(){
            this.b_previewing = false;
            if(this.n_id__preview_timeout){
                clearTimeout(this.n_id__preview_timeout);
                this.n_id__preview_timeout = null;
            }
            let el_video = this.$refs.el_video;
            if(el_video) el_video.pause();
        },
    },
};

export { o_component__composition };
