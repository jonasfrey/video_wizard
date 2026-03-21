![Video Wizard Banner](banner.png)

# Video Wizard

KI-gestützte Videoanalyse und Komposition — Videos analysieren, Sprache erkennen, textbasiert schneiden und exportieren.

Deno · Vue 3 · WebSocket · FFmpeg · OpenAI Whisper

---

## Voraussetzungen

| Abhängigkeit | Version | Zweck |
|---|---|---|
| [Deno](https://deno.land/) | 2.x | Server-Runtime |
| [Python](https://www.python.org/) | 3.9+ | Audioanalyse & Rendering-Scripts |
| [FFmpeg](https://ffmpeg.org/) | beliebig | Audio-/Videoextraktion und Rendering |
| pip3 | beliebig | Python-Paketmanager |

> **GPU nicht erforderlich.** PyTorch, Whisper und Transformers laufen standardmässig auf der CPU. Eine NVIDIA-GPU mit CUDA beschleunigt die Audioanalyse, ist aber keine Voraussetzung.

### Systemabhängigkeiten installieren (Linux / Debian / Ubuntu)

```bash
# Deno
curl -fsSL https://deno.land/install.sh | sh

# FFmpeg & Python
sudo apt-get update
sudo apt-get install -y ffmpeg python3 python3-pip python3-venv
```

### Systemabhängigkeiten installieren (macOS)

```bash
# Deno
curl -fsSL https://deno.land/install.sh | sh

# FFmpeg & Python
brew install ffmpeg python3
```

> **Windows wird derzeit nicht unterstützt.**

---

## Installation

```bash
# 1. Repository klonen
git clone https://github.com/jonasfrey/video_wizard.git
cd video_wizard

# 2. Umgebungsvariablen konfigurieren
cp .env.example .env
# Optional: PORT, S_DB_TYPE etc. in .env anpassen

# 3. Python Virtual Environment einrichten & Pakete installieren
python3 -m venv venv
source venv/bin/activate
pip install python-dotenv openai-whisper torch transformers numpy pyttsx3

# 4. Server starten
deno task run
```

Beim ersten Start erstellt Deno automatisch fehlende Verzeichnisse und prüft Abhängigkeiten.

Öffne danach im Browser: **http://localhost:8000**

> **Hinweis:** Beim ersten Analysieren eines Videos lädt Whisper das Sprachmodell herunter (~1 GB). Dies kann je nach Internetverbindung einige Minuten dauern.

---

## Verwendung

1. **Filebrowser** — Navigiere zu einer Videodatei (MP4, MKV, AVI, MOV, WebM) und klicke «Analyze»
2. **Composition** — Wähle das analysierte Video, durchsuche die Transkription und wähle Wörter/Sätze aus
3. **Export** — Rendere die Komposition als MP4 und lade sie herunter
4. **CLI Monitor** — Überwache laufende Prozesse (Extraktion, Analyse, Rendering)
5. **Data** — CRUD-Verwaltung aller Datenmodelle

---

## Projektstruktur

```
video_wizard/
├── localhost/                   # Frontend (Vue 3 SPA)
│   ├── index.html               # HTML-Shell
│   ├── index.js                 # Vue-App, Routing, WebSocket
│   ├── index.css                # Globales Styling (Dark Theme)
│   ├── constructors.js          # Datenmodelle & WebSocket-Nachrichten
│   ├── o_component__data.js     # Datenmanagement-Komponente
│   ├── o_component__filebrowser.js  # Dateibrowser-Komponente
│   ├── o_component__composition.js  # Kompositions-Editor
│   ├── o_component__export.js   # Export & Rendering
│   ├── o_component__cli_monitor.js  # CLI-Task-Monitor
│   └── lib/                     # Vue 3 & Vue Router ESM-Bundles
├── serverside/                  # Backend (Deno)
│   ├── functions.js             # Server-Utilities
│   ├── cli_functions.js         # CLI-Subprozesse (FFmpeg, Python)
│   ├── database_functions.js    # SQLite-Operationen
│   ├── database_functions_json.js   # JSON-Datenbank-Operationen
│   ├── f_analyze_audio.py       # Whisper Speech-to-Text + Audioklassifikation
│   ├── f_render_composition.py  # FFmpeg Video-Rendering
│   └── testing/                 # Unit-Tests
├── deno.json                    # Deno-Konfiguration & Tasks
├── .env.example                 # Vorlage für Umgebungsvariablen
└── readme.md
```

---

## Umgebungsvariablen

| Variable | Standardwert | Beschreibung |
|---|---|---|
| `PORT` | `8000` | HTTP- und WebSocket-Port |
| `S_DB_TYPE` | `json` | Datenbanktyp (`json` oder `sqlite`) |
| `S_PATH__DB_JSON` | `./.gitignored/appdb/` | Pfad zur JSON-Datenbank |
| `STATIC_DIR` | `./localhost` | Frontend-Verzeichnis |
| `S_UUID` | (generiert) | Eindeutige ID für IPC-Protokoll |
| `BIN_PYTHON` | `python3` | Python-Binary |
| `PATH_VENV` | `./venv` | Pfad zum Python-venv |
| `BIN_FFMPEG` | `ffmpeg` | FFmpeg-Binary |
| `S_PATH__AUDIO` | `./.gitignored/audio/` | Extrahierte Audiodateien |

---

## Tasks

```bash
deno task run       # Server starten
deno task stop      # Server stoppen
deno task restart   # Server neu starten
deno task test      # Alle Tests ausführen
deno task uninit    # Datenbank zurücksetzen
deno task rmdb      # Datenbankdateien löschen
```

---

## Technologien

| Technologie | Verwendung |
|---|---|
| **Deno** | Server-Runtime (JavaScript) |
| **Vue 3** | Frontend-Framework (ESM, kein Build-Step) |
| **Vue Router 4** | Hash-basiertes SPA-Routing |
| **WebSocket** | Echtzeit-Kommunikation Client ↔ Server |
| **SQLite / JSON** | Datenbank (konfigurierbar) |
| **FFmpeg** | Audio-Extraktion & Video-Rendering |
| **OpenAI Whisper** | Speech-to-Text mit wortgenauen Zeitstempeln |
| **Hugging Face Transformers** | Audioklassifikation (Sprache/Musik/Stille) |
| **PyTorch** | ML-Framework (CPU-Inferenz) |

---

## APN

Dieses Projekt verwendet durchgehend [Abstract Prefix Notation (APN)](https://www.techrxiv.org/users/1031649/articles/1391488-abstract-prefix-notation-apn-a-type-encoding-naming-methodology-for-programming?commit=571d0b8647fbee85c242544375a07d5cf4238bef) — eine Namenskonvention, bei der der Datentyp als Präfix im Variablennamen kodiert wird (z.B. `s_name`, `n_age`, `a_o_video`, `f_render`).

---

## Quellen

| Tool / Bibliothek | Repository |
|---|---|
| Deno | https://github.com/denoland/deno |
| FFmpeg | https://github.com/FFmpeg/FFmpeg |
| OpenAI Whisper | https://github.com/openai/whisper |
| PyTorch | https://github.com/pytorch/pytorch |
| Hugging Face Transformers | https://github.com/huggingface/transformers |
| Vue 3 | https://github.com/vuejs/core |
| Vue Router 4 | https://github.com/vuejs/router |
| pyttsx3 | https://github.com/nateshmbhat/pyttsx3 |
| python-dotenv | https://github.com/theskumar/python-dotenv |
| NumPy | https://github.com/numpy/numpy |

---

## Lizenz

GPLv2 — siehe [LICENSE](LICENSE)

Jonas Immanuel Frey — 2026
