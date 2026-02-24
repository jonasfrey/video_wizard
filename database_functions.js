// Copyright (C) [2026] [Jonas Immanuel Frey] - Licensed under GPLv2. See LICENSE file for details.

import { Database } from "jsr:@db/sqlite@0.11";
import {
    a_o_model,
    f_s_name_table__from_o_model,
    f_s_name_foreign_key__from_o_model,
    f_o_model_instance,
    s_name_prop_id,
    f_a_s_error__invalid_model_instance,
    f_o_model__from_s_name_table,
    s_name_prop_ts_created,
    s_name_prop_ts_updated,
    a_o_data_default,
} from "./localhost/constructors.js";
import { s_ds, s_root_dir } from "./runtimedata.js";

let o_db = null;

let s_path_database = Deno.env.get('DB_PATH') ?? './.gitignored/app.db';


let f_init_db = async function(s_path_db = s_path_database) {
    //make sure the folder where db should be stored exists
    await Deno.mkdir(s_path_db.slice(0, s_path_db.lastIndexOf(s_ds)), { recursive: true });

    o_db = new Database(s_path_db);

    for (let o_model of a_o_model) {
        let s_name_table = f_s_name_table__from_o_model(o_model);
        let a_s_column = [];
        let a_s_fk = [];

        for (let o_prop of o_model.a_o_property) {
            if (o_prop.s_name === 'n_id') {
                a_s_column.push('n_id INTEGER PRIMARY KEY');
                continue;
            }

            let s_sql_type = 'TEXT';
            if (o_prop.s_type === 'number') s_sql_type = 'REAL';
            if (o_prop.s_type === 'boolean') s_sql_type = 'INTEGER';

            a_s_column.push(`${o_prop.s_name} ${s_sql_type}`);

            // detect foreign key
            let o_model__foreign = a_o_model.find(function(o) {
                return f_s_name_foreign_key__from_o_model(o) === o_prop.s_name;
            });
            if (o_model__foreign) {
                let s_name_table_ref = f_s_name_table__from_o_model(o_model__foreign);
                a_s_fk.push(`FOREIGN KEY (${o_prop.s_name}) REFERENCES ${s_name_table_ref}(n_id)`);
            }
        }

        let s_sql = `CREATE TABLE IF NOT EXISTS ${s_name_table} (\n${a_s_column.concat(a_s_fk).join(',\n')}\n)`;
        o_db.exec(s_sql);
    }

    f_ensure_default_data();
    return o_db;
};



// generic db CRUD

let f_db_delete_table_data = function(s_name_table){
    let o_model = f_o_model__from_s_name_table(s_name_table);
    if(!o_model) throw new Error(`Unknown table: ${s_name_table}`);
    o_db.exec('PRAGMA foreign_keys = OFF');
    let v_result = o_db.prepare(`DELETE FROM ${s_name_table}`).run();
    o_db.exec('PRAGMA foreign_keys = ON');
    return v_result;
}
let f_v_crud__indb = function(
    s_name_crud_function,
    s_name_table,
    v_o_data,
    v_o_data_update
){
    let o_model = f_o_model__from_s_name_table(s_name_table);
    if(!o_model) throw new Error(`Model not found for table ${s_name_table}`);
    let v_return = null;
    
    if(v_o_data){

        let a_s_error = f_a_s_error__invalid_model_instance(o_model, v_o_data);
        if(a_s_error.length > 0){
            console.log({o_model, v_o_data, a_s_error});
            throw new Error('Invalid model instance: ' + a_s_error.join('; '));
        }
    }

    // set timestamps
    if(s_name_crud_function === 'create'){
        v_o_data[s_name_prop_ts_created] = Date.now();
        v_o_data[s_name_prop_ts_updated] = Date.now();
    }
    if(s_name_crud_function === 'update'){
        v_o_data_update[s_name_prop_ts_updated] = Date.now();
    }

    // validate values
    let o_model_instance = null; 
    let a_s_name_property = null;
    let a_v_value = null;
    if(v_o_data){

        o_model_instance = f_o_model_instance(o_model, v_o_data);
        a_s_name_property = Object.keys(o_model_instance);
        a_v_value = Object.values(o_model_instance);
    }

    if (s_name_crud_function === 'create') {
        // v_o_data should be an instance of o_model
        let s_sql = `INSERT INTO ${s_name_table} (${a_s_name_property.join(', ')}) VALUES (${a_s_name_property.map(function() { return '?'; }).join(', ')})`;
        o_db.prepare(s_sql).run(...a_v_value);


        let o_last = o_db.prepare('SELECT last_insert_rowid() as n_id').get();
        v_return = o_db.prepare(`SELECT * FROM ${s_name_table} WHERE n_id = ?`).get(o_last.n_id)
    }

    if (s_name_crud_function === 'read') {
        // v_o_data is not null we use the specified properties as filters for the query
        let s_query = `SELECT * FROM ${s_name_table}`;
        if (v_o_data) {
            let a_s_filter = [];
            for (let s_key in v_o_data) {
                a_s_filter.push(`${s_key} = ?`);
            }
            if (a_s_filter.length > 0) {
                s_query += ` WHERE ${a_s_filter.join(' AND ')}`;
            }
        }
        // console.log(s_query);
        // console.log(v_o_data);
        let a_o_row = o_db.prepare(s_query).all(...(v_o_data ? Object.values(v_o_data) : []));
        v_return = a_o_row
        
        // v_return = a_o_row.map(function(o_row) { return f_o_row__deserialized(o_model, o_row); });
    }

    if (s_name_crud_function === 'update') {
        // v_o_data identifies the record (must have n_id)
        // v_o_data_update has the fields to change
        if(!v_o_data || v_o_data[s_name_prop_id] === undefined || v_o_data[s_name_prop_id] === null){
            throw new Error(`id property (${s_name_prop_id}) is required for update`);
        }
        let a_s_name_prop__update = Object.keys(v_o_data_update);
        let a_v_value__update = Object.values(v_o_data_update);
        let a_s_set = a_s_name_prop__update.map(function(s_key) { return `${s_key} = ?`; });
        let s_sql = `UPDATE ${s_name_table} SET ${a_s_set.join(', ')} WHERE ${s_name_prop_id} = ?`;
        o_db.prepare(s_sql).run(...a_v_value__update, v_o_data[s_name_prop_id]);
        v_return = o_db.prepare(`SELECT * FROM ${s_name_table} WHERE n_id = ?`).get(v_o_data[s_name_prop_id]);
    }

    if (s_name_crud_function === 'delete') {
        if(!a_s_name_property.includes(s_name_prop_id)){
            throw new Error(`id property (${s_name_prop_id}) is required for delete`);
        }
        // v_o_data should be an instance of o_model, with n_id property set to the id of the row to delete
        if (!v_o_data || v_o_data.n_id === undefined || v_o_data.n_id === null) return false;
        o_db.exec('PRAGMA foreign_keys = OFF');
        o_db.prepare(`DELETE FROM ${s_name_table} WHERE n_id = ?`).run(v_o_data.n_id);
        o_db.exec('PRAGMA foreign_keys = ON');
        v_return = true;
    }

    return v_return;
};

let f_ensure_default_data = function(){
    // reads nested object structure from a_o_data_default and creates corresponding instances in db,
    // minimal example { o_person: {s_name: "Gretel", o_pet: {s_name: "Hansi"}}} with models Person and Pet where Person has a FK to Pet,
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
    f_init_db,
    f_v_crud__indb,
    f_db_delete_table_data,
    f_ensure_default_data
};
