// Copyright (C) [2026] [Jonas Immanuel Frey] - Licensed under GPLv2. See LICENSE file for details.

import { f_v_crud__indb } from "./database_functions.js";
import {
    a_o_model,
    f_s_name_foreign_key__from_o_model,
    f_s_name_table__from_o_model,
    o_model__o_keyvalpair,
} from "./localhost/constructors.js";

let a_o_data_default = [
    {
        o_student: {
            s_name: 'Alice',
            o_course: {s_name: 'Math 101'}
        },
    },
    {
        o_student: {
            s_name: 'Bob',
            o_course: {s_name: 'Math 101'}
        }
    },
    {
        o_keyvalpair: {
            s_key: 's_path_absolute__filebrowser',
            s_value: '/home'
        }
    }
]
// expected result in db:
// o_student1 = {n_id: 1, s_name: 'Alice'}
// o_student2 = {n_id: 2, s_name: 'Bob'}
// o_course1 = {n_id: 1, s_name: 'Math 101'}
// o_course_o_student1 = {n_id: 1, n_o_student_n_id: 1, n_o_course_n_id: 1}
// o_course_o_student2 = {n_id: 2, n_o_student_n_id: 2, n_o_course_n_id: 1}

let f_ensure_default_data = function(){
    // cache to deduplicate instances: "model_name:key=val,key=val" -> db record
    let o_cache = {};

    let f_s_cache_key = function(s_name_model, o_data){
        let a_s_part = Object.keys(o_data).sort().map(function(s_key){
            return s_key + '=' + o_data[s_key];
        });
        return s_name_model + ':' + a_s_part.join(',');
    };

    let f_o_model__find_by_name = function(s_name){
        return a_o_model.find(function(o){
            return o.s_name === s_name;
        });
    };

    // find a junction model that has foreign keys to both models (many-to-many)
    let f_o_model__junction = function(o_model_a, o_model_b){
        let s_fk_a = f_s_name_foreign_key__from_o_model(o_model_a);
        let s_fk_b = f_s_name_foreign_key__from_o_model(o_model_b);
        return a_o_model.find(function(o_model){
            let a_s_name_prop = o_model.a_o_property.map(function(o_prop){
                return o_prop.s_name;
            });
            return a_s_name_prop.includes(s_fk_a) && a_s_name_prop.includes(s_fk_b);
        });
    };

    // find or create a model instance in db, with caching for deduplication
    let f_o_instance__ensured_in_db = function(o_model, o_data_plain){
        let s_key = f_s_cache_key(o_model.s_name, o_data_plain);
        if(o_cache[s_key]){
            return o_cache[s_key];
        }
        let s_name_table = f_s_name_table__from_o_model(o_model);
        let a_o_existing = f_v_crud__indb('read', s_name_table, o_data_plain);
        let o_instance = null;
        if(a_o_existing && a_o_existing.length > 0){
            o_instance = a_o_existing[0];
        } else {
            o_instance = f_v_crud__indb('create', s_name_table, o_data_plain);
        }
        o_cache[s_key] = o_instance;
        return o_instance;
    };

    // recursively process a model's data: separate plain props from nested model refs,
    // create nested instances first, then handle FK / junction relationships
    let f_o_instance__processed = function(o_model, o_data){
        let o_data_plain = {};
        let a_o_nested = [];

        for(let s_prop in o_data){
            let o_model__nested = f_o_model__find_by_name(s_prop);
            if(o_model__nested){
                // recursively process nested model data
                let o_instance__nested = f_o_instance__processed(o_model__nested, o_data[s_prop]);
                a_o_nested.push({o_model: o_model__nested, o_instance: o_instance__nested});
            } else {
                o_data_plain[s_prop] = o_data[s_prop];
            }
        }

        // if parent model has a direct FK to a nested model (one-to-many), set it
        let a_s_name_prop__parent = o_model.a_o_property.map(function(o_prop){
            return o_prop.s_name;
        });
        for(let o_nested of a_o_nested){
            let s_fk = f_s_name_foreign_key__from_o_model(o_nested.o_model);
            if(a_s_name_prop__parent.includes(s_fk)){
                o_data_plain[s_fk] = o_nested.o_instance.n_id;
            }
        }

        // find or create this instance
        let o_instance = f_o_instance__ensured_in_db(o_model, o_data_plain);

        // for nested models without direct FK, create junction table entries (many-to-many)
        for(let o_nested of a_o_nested){
            let s_fk = f_s_name_foreign_key__from_o_model(o_nested.o_model);
            if(!a_s_name_prop__parent.includes(s_fk)){
                let o_model__junc = f_o_model__junction(o_model, o_nested.o_model);
                if(o_model__junc){
                    let o_junction_data = {};
                    o_junction_data[f_s_name_foreign_key__from_o_model(o_model)] = o_instance.n_id;
                    o_junction_data[f_s_name_foreign_key__from_o_model(o_nested.o_model)] = o_nested.o_instance.n_id;
                    f_o_instance__ensured_in_db(o_model__junc, o_junction_data);
                } else {
                    console.warn(`No junction model found for ${o_model.s_name} <-> ${o_nested.o_model.s_name}`);
                }
            }
        }

        return o_instance;
    };

    // process each entry in the default data array
    for(let o_entry of a_o_data_default){
        for(let s_key in o_entry){
            let o_model = f_o_model__find_by_name(s_key);
            if(!o_model){
                console.warn(`Model '${s_key}' not found in a_o_model, skipping`);
                continue;
            }
            f_o_instance__processed(o_model, o_entry[s_key]);
        }
    }
};

export {
    f_ensure_default_data
}
