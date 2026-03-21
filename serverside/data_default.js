import { s_ds, s_root_dir } from "./runtimedata.js";


let o_o_keyvalpair__default = {

    o_keyvalpair__s_path_absolute__filebrowser : {
        s_key: 's_path_absolute__filebrowser',
        s_value: s_root_dir
    },
    o_keyvalpair__s_name_model_selected : {
        s_key: 's_name_model_selected',
        s_value: 'o_keyvalpair',
    },
    o_keyvalpair__s_path_page_selected : {
        s_key: 's_path_page_selected',
        s_value: '/data',
    },
    o_keyvalpair__s_root_dir : {
        s_key: 's_root_dir',
        s_value: s_root_dir,
    },
    o_keyvalpair__s_ds : {
        s_key: 's_ds',
        s_value: s_ds,
    },
}

let a_o_data_default = [
        ...Object.values(o_o_keyvalpair__default).map(o=>{
            return {o_keyvalpair: o}
    }),
]
// console.log({a_o_data_default})



export {
    a_o_data_default,
    o_o_keyvalpair__default
}