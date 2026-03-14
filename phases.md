# phases

## phase 0 — data model setup (done)

added `o_video` and `o_audio` models to `localhost/constructors.js`.

### o_video
- `n_id` (PK)
- `n_o_fsnode_n_id` (FK to o_fsnode) — links to the source video file
- `n_ms_duration` — video duration in milliseconds
- `s_status` — pipeline status: `pending`, `extracting`, `extracted`, `analyzing`, `done`, `error`
- timestamps

### o_audio
- `n_id` (PK)
- `n_o_video_n_id` (FK to o_video) — one-to-one with video
- `n_ms_duration` — audio duration in milliseconds
- `s_path_abs` — absolute path to the extracted .wav file on disk
- timestamps

both models are registered in `a_o_model`, exported, and will auto-create DB tables on server start. denormalized relation getters (e.g. `o_video.o_fsnode`, `o_fsnode.a_o_video`) work automatically via the existing relation system.

---

## phase 1 — audio extraction via ffmpeg (done)

### what was added

**config**
- `S_PATH__AUDIO` env var (`.env.example`, `serverside/runtimedata.js`) — directory where extracted .wav files are stored (default: `./.gitignored/audio/`)

**cli_functions.js — new functions**
- `f_check_ffmpeg()` — checks ffmpeg is on PATH at server startup, logs result
- `f_n_ms_duration__from_s_path(s_path)` — uses ffprobe to get file duration in ms
- `f_extract_audio(s_path_video, f_on_progress)` — core extraction function:
  1. ensures audio output directory exists
  2. finds or creates `o_fsnode` for the video file
  3. creates/updates `o_video` record with status `extracting`
  4. spawns `ffmpeg -y -i <video> -ac 1 -ar 16000 -vn -progress pipe:1 <output.wav>`
  5. streams progress lines to `f_on_progress` callback in real time
  6. on success: creates `o_audio` record, updates `o_video.s_status` to `extracted`
  7. on failure: sets `o_video.s_status` to `error`, throws with ffmpeg stderr

**websocket message: `f_extract_audio`**
- client sends: `f_o_wsmsg('f_extract_audio', '/absolute/path/to/video.mp4')`
- server streams `[ffmpeg] ...` progress lines as GUI toast log messages to the requesting client
- server responds with `{ o_fsnode, o_video, o_audio }` on completion

**HTTP server**
- added video MIME types (mp4, webm, mkv, avi, mov) to `/api/file` endpoint so videos can be served for browser playback

### how to use from the client
```js
let o_resp = await f_send_wsmsg_with_response(
    f_o_wsmsg('f_extract_audio', '/path/to/video.mp4')
);
// o_resp.v_result = { o_fsnode, o_video, o_audio }
```

### dependencies
- ffmpeg must be installed on the system (`sudo apt-get install -y ffmpeg`)
- ffprobe (bundled with ffmpeg) is used for duration detection
