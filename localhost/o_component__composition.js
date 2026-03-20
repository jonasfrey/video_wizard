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
                        controls: true,
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
                        class: 'o_composition__mode interactable',
                        'v-on:click': "s_mode__view = s_mode__view === 'word' ? 'sentence' : 'word'",
                        innerText: "{{ s_mode__view === 'word' ? 'Words' : 'Sentences' }}",
                    },
                    {
                        s_tag: 'div',
                        ':class': "'o_composition__filter_speech interactable' + (b_speech_only ? ' active' : '')",
                        'v-on:click': 'b_speech_only = !b_speech_only',
                        innerText: 'Speech only',
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
                                ':class': "'o_event o_event__selected interactable event_type__' + o_event.s_type + (n_idx === n_idx__preview ? ' o_event__active' : '')",
                                draggable: 'true',
                                'v-on:dragstart': 'f_drag_start(n_idx, $event)',
                                'v-on:dragover.prevent': 'f_drag_over(n_idx, $event)',
                                'v-on:drop': 'f_drop(n_idx, $event)',
                                'v-on:click': 'f_jump_to_event(o_event)',
                                ':title': "'Click to jump to this event. ' + o_event.s_text",
                                a_o: [
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__progress_bar',
                                        'v-if': 'n_idx === n_idx__preview',
                                        ':style': "'width:' + (n_nor__preview_progress * 100) + '%'",
                                    },
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
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__remove interactable',
                                        'v-on:click.stop': 'f_deselect(o_event)',
                                        innerText: '✕',
                                        title: 'Remove from selection',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            // --- timeline: all events (word mode) ---
            {
                s_tag: 'div',
                'v-if': "a_o_audio_event__all.length > 0 && s_mode__view === 'word'",
                class: 'o_composition__timeline',
                a_o: [
                    {
                        s_tag: 'div',
                        class: 'o_composition__section_title',
                        innerText: 'All Events (words)',
                    },
                    {
                        s_tag: 'div',
                        class: 'o_timeline__all',
                        a_o: [
                            {
                                s_tag: 'div',
                                'v-for': 'o_event of a_o_audio_event__filtered',
                                ':key': 'o_event.n_id',
                                ':ref': "'el_event_' + o_event.n_id",
                                ':class': "'o_event interactable event_type__' + o_event.s_type + (o_set__n_id__selected.has(o_event.n_id) ? ' selected' : '')",
                                'v-on:click': 'f_toggle_select(o_event)',
                                ':title': 'o_event.s_text',
                                a_o: [
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__play interactable',
                                        'v-on:click.stop': 'f_preview_single(o_event.n_ms_start, o_event.n_ms_duration)',
                                        innerText: '\u25B6',
                                        title: 'Preview this event',
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
                                        innerText: '{{ f_s_time(o_event.n_ms_start) }} ({{ (o_event.n_ms_duration / 1000).toFixed(1) }}s)',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            // --- timeline: all events (sentence mode) ---
            {
                s_tag: 'div',
                'v-if': "a_o_audio_event__all.length > 0 && s_mode__view === 'sentence'",
                class: 'o_composition__timeline',
                a_o: [
                    {
                        s_tag: 'div',
                        class: 'o_composition__section_title',
                        innerText: 'All Events (sentences)',
                    },
                    {
                        s_tag: 'div',
                        class: 'o_timeline__all',
                        a_o: [
                            {
                                s_tag: 'div',
                                'v-for': 'o_sentence of a_o_sentence',
                                ':key': 'o_sentence.s_key',
                                ':ref': "'el_sentence_' + o_sentence.s_key",
                                ':class': "'o_event o_event__sentence interactable event_type__' + o_sentence.s_type + (f_b_sentence_selected(o_sentence) ? ' selected' : '')",
                                'v-on:click': 'f_toggle_select_sentence(o_sentence)',
                                ':title': 'o_sentence.s_text',
                                a_o: [
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__play interactable',
                                        'v-on:click.stop': 'f_preview_single(o_sentence.n_ms_start, o_sentence.n_ms_duration)',
                                        innerText: '\u25B6',
                                        title: 'Preview this event',
                                    },
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__text',
                                        innerText: '{{ o_sentence.s_text }}',
                                    },
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__type',
                                        innerText: '{{ o_sentence.s_type }}',
                                    },
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__time',
                                        innerText: '{{ f_s_time(o_sentence.n_ms_start) }} ({{ (o_sentence.n_ms_duration / 1000).toFixed(1) }}s)',
                                    },
                                    {
                                        s_tag: 'div',
                                        class: 'o_event__word_count',
                                        'v-if': 'o_sentence.a_o_event.length > 1',
                                        innerText: '{{ o_sentence.a_o_event.length }} words',
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
            s_mode__view: 'sentence',  // 'word' or 'sentence'
            b_speech_only: false,
            b_previewing: false,
            n_id__raf: null,
            n_idx__preview: -1,
            n_nor__preview_progress: 0,
            n_id__raf__single: null,
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
            let o_self = this;
            let a_o = this.a_o_audio_event__all;
            if(this.b_speech_only){
                a_o = a_o.filter(function(o){ return o.s_type === 'speech'; });
            }
            if(this.s_search){
                let s_lower = o_self.s_search.toLowerCase();
                a_o = a_o.filter(function(o){
                    return (o.s_text || '').toLowerCase().includes(s_lower)
                        || (o.s_type || '').toLowerCase().includes(s_lower);
                });
            }
            return a_o;
        },
        a_o_sentence: function(){
            let a_o_event = this.a_o_audio_event__filtered;
            let a_o_result = [];
            let a_o_current = [];
            let n_ms__gap_max = 700;
            for(let n_idx = 0; n_idx < a_o_event.length; n_idx++){
                let o_event = a_o_event[n_idx];
                if(o_event.s_type !== 'speech'){
                    // flush current sentence
                    if(a_o_current.length > 0){
                        a_o_result.push(a_o_current);
                        a_o_current = [];
                    }
                    // non-speech events become their own entry
                    a_o_result.push([o_event]);
                    continue;
                }
                if(a_o_current.length === 0){
                    a_o_current.push(o_event);
                    continue;
                }
                let o_prev = a_o_current[a_o_current.length - 1];
                let n_ms__end_prev = o_prev.n_ms_start + o_prev.n_ms_duration;
                let n_ms__gap = o_event.n_ms_start - n_ms__end_prev;
                if(n_ms__gap <= n_ms__gap_max){
                    a_o_current.push(o_event);
                } else {
                    a_o_result.push(a_o_current);
                    a_o_current = [o_event];
                }
            }
            if(a_o_current.length > 0) a_o_result.push(a_o_current);
            // build sentence display objects
            return a_o_result.map(function(a_o_word){
                let o_first = a_o_word[0];
                let o_last = a_o_word[a_o_word.length - 1];
                let n_ms_start = o_first.n_ms_start;
                let n_ms_end = o_last.n_ms_start + o_last.n_ms_duration;
                return {
                    s_key: a_o_word.map(function(o){ return o.n_id; }).join('_'),
                    s_text: a_o_word.map(function(o){ return o.s_text; }).join(' '),
                    s_type: o_first.s_type,
                    n_ms_start: n_ms_start,
                    n_ms_duration: n_ms_end - n_ms_start,
                    a_o_event: a_o_word,
                    a_n_id: a_o_word.map(function(o){ return o.n_id; }),
                };
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
        f_preview_single: function(n_ms_start, n_ms_duration){
            let el_video = this.$refs.el_video;
            if(!el_video) return;
            // stop any ongoing composition preview
            if(this.b_previewing) this.f_stop_preview();
            // cancel any previous single preview
            if(this.n_id__raf__single){
                cancelAnimationFrame(this.n_id__raf__single);
                this.n_id__raf__single = null;
            }
            let n_sec__start = n_ms_start / 1000;
            let n_sec__end = (n_ms_start + n_ms_duration) / 1000;
            el_video.currentTime = n_sec__start;
            el_video.play().catch(function(){});
            let o_self = this;
            let f_frame = function(){
                if(el_video.currentTime >= n_sec__end || el_video.paused){
                    el_video.pause();
                    o_self.n_id__raf__single = null;
                    return;
                }
                o_self.n_id__raf__single = requestAnimationFrame(f_frame);
            };
            this.n_id__raf__single = requestAnimationFrame(f_frame);
        },
        f_b_sentence_selected: function(o_sentence){
            let o_set = this.o_set__n_id__selected;
            return o_sentence.a_n_id.every(function(n_id){ return o_set.has(n_id); });
        },
        f_toggle_select_sentence: function(o_sentence){
            let o_self = this;
            let b_all_selected = this.f_b_sentence_selected(o_sentence);
            if(b_all_selected){
                // deselect all words in this sentence
                for(let n_id of o_sentence.a_n_id){
                    let n_idx = o_self.a_n_id__selected.indexOf(n_id);
                    if(n_idx !== -1) o_self.a_n_id__selected.splice(n_idx, 1);
                    o_self.o_set__n_id__selected.delete(n_id);
                }
            } else {
                // select all words in this sentence (in order)
                for(let n_id of o_sentence.a_n_id){
                    if(!o_self.o_set__n_id__selected.has(n_id)){
                        o_self.a_n_id__selected.push(n_id);
                        o_self.o_set__n_id__selected.add(n_id);
                    }
                }
            }
            this.o_set__n_id__selected = new Set(this.o_set__n_id__selected);
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
        f_jump_to_event: function(o_event){
            let el_video = this.$refs.el_video;
            if(!el_video) return;
            el_video.currentTime = o_event.n_ms_start / 1000;
            el_video.play().catch(function(){});
            // scroll to matching event in "all events" list
            let v_ref = this.$refs['el_event_' + o_event.n_id];
            let el_target = Array.isArray(v_ref) ? v_ref[0] : v_ref;
            if(el_target){
                el_target.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        // preview playback using requestAnimationFrame
        f_preview: function(){
            if(this.b_previewing){
                this.f_stop_preview();
                return;
            }
            let el_video = this.$refs.el_video;
            console.log('[f_preview] el_video:', el_video);
            console.log('[f_preview] readyState:', el_video ? el_video.readyState : 'N/A');
            console.log('[f_preview] duration:', el_video ? el_video.duration : 'N/A');
            console.log('[f_preview] selected events:', this.a_o_audio_event__selected.length);
            if(!el_video || this.a_o_audio_event__selected.length === 0) return;
            this.b_previewing = true;
            this.n_idx__preview = 0;
            this.n_nor__preview_progress = 0;
            let a_o_event = this.a_o_audio_event__selected;
            let o_self = this;

            // seek to first event start and begin playing
            let n_sec__first = a_o_event[0].n_ms_start / 1000;
            console.log('[f_preview] seeking to first event at', n_sec__first, 'sec');
            el_video.currentTime = n_sec__first;
            let o_play_promise = el_video.play();
            if(o_play_promise){
                o_play_promise.then(function(){
                    console.log('[f_preview] play() resolved, currentTime:', el_video.currentTime);
                }).catch(function(o_err){
                    console.error('[f_preview] play() rejected:', o_err);
                });
            }

            let n_frame_count = 0;
            let f_frame = function(){
                if(!o_self.b_previewing) return;
                let n_idx = o_self.n_idx__preview;
                if(n_idx < 0 || n_idx >= a_o_event.length){
                    console.log('[f_preview] done, stopping');
                    o_self.f_stop_preview();
                    return;
                }
                let o_event = a_o_event[n_idx];
                let n_sec__start = o_event.n_ms_start / 1000;
                let n_sec__end = (o_event.n_ms_start + o_event.n_ms_duration) / 1000;
                let n_sec__current = el_video.currentTime;

                // log every 30 frames (~0.5s)
                n_frame_count++;
                if(n_frame_count % 30 === 0){
                    console.log('[f_preview frame]', 'idx:', n_idx, 'currentTime:', n_sec__current.toFixed(3), 'event range:', n_sec__start.toFixed(3), '-', n_sec__end.toFixed(3), 'paused:', el_video.paused);
                }

                // update progress bar (normalized 0..1)
                let n_sec__duration = n_sec__end - n_sec__start;
                if(n_sec__duration > 0){
                    o_self.n_nor__preview_progress = Math.min(1, Math.max(0,
                        (n_sec__current - n_sec__start) / n_sec__duration
                    ));
                }

                // if video time passed the end of this event, jump to next
                if(n_sec__current >= n_sec__end){
                    o_self.n_idx__preview = n_idx + 1;
                    o_self.n_nor__preview_progress = 0;
                    if(o_self.n_idx__preview < a_o_event.length){
                        let o_next = a_o_event[o_self.n_idx__preview];
                        let n_sec__next = o_next.n_ms_start / 1000;
                        console.log('[f_preview] advancing to event', o_self.n_idx__preview, 'at', n_sec__next, 'sec');
                        el_video.currentTime = n_sec__next;
                    } else {
                        console.log('[f_preview] all events played, stopping');
                        o_self.f_stop_preview();
                        return;
                    }
                }
                o_self.n_id__raf = requestAnimationFrame(f_frame);
            };

            o_self.n_id__raf = requestAnimationFrame(f_frame);
        },
        f_stop_preview: function(){
            this.b_previewing = false;
            this.n_idx__preview = -1;
            this.n_nor__preview_progress = 0;
            if(this.n_id__raf){
                cancelAnimationFrame(this.n_id__raf);
                this.n_id__raf = null;
            }
            if(this.n_id__raf__single){
                cancelAnimationFrame(this.n_id__raf__single);
                this.n_id__raf__single = null;
            }
            let el_video = this.$refs.el_video;
            if(el_video) el_video.pause();
        },
    },
};

export { o_component__composition };
