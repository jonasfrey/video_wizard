phase 1 
---
cli_functions has the binaries as hardcoded strings. make variables in runtimedata.js and use them . 
for eaxmple let s_path__ffprobe = Deno.env.get('S_PATH__ffprobe') ?? './.gitignored/ffprobe/';
