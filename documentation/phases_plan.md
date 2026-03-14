# phases plan

## phase 0 — data model setup
- define `o_video` and `o_audio` models in `localhost/constructors.js`
- `o_video`: `n_id`, `n_o_fsnode_n_id` (FK), `n_ms_duration`, `s_status`
- `o_audio`: `n_id`, `n_o_video_n_id` (FK), `n_ms_duration`, `s_path_abs`
- register in `a_o_model`, export, denormalized getters auto-detected

## phase 1 — audio extraction (ffmpeg)
- add `S_PATH__AUDIO` env var for extracted audio storage
- add binary path vars (`BIN_FFMPEG`, `BIN_FFPROBE`, `BIN_WHICH`, `BIN_SUDO`, `BIN_PIP3`) to runtimedata.js
- `f_check_ffmpeg()` — verify ffmpeg on PATH at startup
- `f_n_ms_duration__from_s_path()` — get duration via ffprobe
- `f_extract_audio(s_path_video, f_on_progress)` — spawn ffmpeg, extract mono 16kHz wav, stream progress, create DB records
- `o_wsmsg__f_extract_audio` — websocket handler, streams progress as GUI toasts
- add video MIME types to HTTP `/api/file` endpoint
- test: `serverside/testing/audio_extraction.js`

## phase 2 — audio analysis (whisper + BEATs)
- define `o_audio_event` model: `n_id`, `n_o_audio_n_id` (FK), `n_ms_start`, `n_ms_duration`, `s_type` (speech/music/utterance), `s_text`
- create `serverside/f_analyze_audio.py`:
  - run whisper with word-level timestamps for speech events
  - run BEATs for non-speech classification (music, sounds)
  - output JSON array of events via IPC protocol
- add pip dependencies to `f_init_python()`: `openai-whisper`, `torch`, `transformers`
- add server handler `f_analyze_audio` — spawn script, parse IPC output, bulk-insert `o_audio_event` records
- add combined handler `f_analyze_video` — chains: extract audio → analyze audio → update status to `done`
- update `o_video.s_status` flow: `pending` → `extracting` → `extracted` → `analyzing` → `done`
- test: `serverside/testing/audio_analysis.js`

## phase 3 — filebrowser page enhancements
- extend `o_component__filebrowser.js`:
  - add "Analyze" button next to video files (filter by extension: .mp4, .mkv, .avi, .mov, .webm)
  - clicking "Analyze" sends `f_extract_audio` (or `f_analyze_video` if phase 2 is done)
- add "analyzed videos" sidebar panel:
  - list all `o_fsnode` that have a related `o_video`
  - show status (pending/extracting/analyzing/done/error)
  - clickable `s_path_abs` jumps filebrowser to that folder
- add CLI process monitor component `o_component__cli_monitor`:
  - scrollable log panel of running/completed CLI tasks
  - real-time stdout streaming
  - each task shows: name, status, elapsed time, expandable log

## phase 4 — composition editor page
- define `o_composition` model: `n_id`, `n_o_video_n_id` (FK), `s_name`
- define `o_composition_o_audio_event` junction table: `n_id`, `n_o_composition_n_id` (FK), `n_o_audio_event_n_id` (FK), `n_order`
- add route `/composition` in `localhost/index.js`
- create `o_component__composition.js` with two sections:
  - **top: video preview** — `<video>` element, loads source via `/api/file?path=...`
  - **bottom: timeline editor** — displays `o_audio_event` as colored blocks (speech=blue, music=green, utterance=orange)
- video source selector — dropdown of analyzed videos, creates/loads `o_composition`
- timeline features:
  - click to select/deselect events
  - drag to reorder selected events
  - text search/filter input to find words
- "select by text" — type a phrase, auto-select matching `o_audio_event` sequences
- preview playback — play button seeks through selected events using `video.currentTime`
- persist composition — save selected events + order to junction table via syncdata

## phase 5 — export page
- add route `/export` in `localhost/index.js`
- create `o_component__export.js` — list all `o_composition` with name, source video, event count
- create `serverside/f_render_composition.py`:
  - takes composition ID, queries DB for audio events + order
  - builds ffmpeg filter complex to cut and concat video segments
  - outputs to `.gitignored/exports/{s_name}.mp4`
  - streams progress via stdout
- add server handler `f_render_composition` — spawn script, stream progress
- export UI — render button per composition, progress bar, download link via `/api/file`

## phase 6 — polish
- add all pages (filebrowser, composition, export) to top nav bar
- error handling — display ffmpeg/whisper errors in CLI monitor, allow retry
- file management — show disk usage of extracted audio and exports, allow cleanup

---

## dependency graph
```
phase 0 (models)
  → phase 1 (ffmpeg extraction)
    → phase 2 (whisper/BEATs analysis)
      → phase 3 (filebrowser UI)
      → phase 4 (composition editor)
        → phase 5 (export)
          → phase 6 (polish)
```

phases 3 and 4 can be developed in parallel once phase 2 is done.

## system dependencies
| tool | purpose |
|------|---------|
| ffmpeg / ffprobe | audio extraction, video rendering |
| whisper | speech-to-text with timestamps |
| BEATs | non-speech audio classification |
| python 3 | runs analysis scripts |
| deno | server runtime |
