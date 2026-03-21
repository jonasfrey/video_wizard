# Video Wizard

## Kurzdokumentation

**Modul WEB2 – SPA-Projekt**

Jonas Immanuel Frey

Abgabedatum: 21.03.2026

---

## 1. Projektbeschreibung

Video Wizard ist eine Single Page Application (SPA) für die Analyse und Komposition von Videomaterial. Die Applikation ermöglicht es, aus Videodateien automatisch Audio zu extrahieren, dieses mittels Spracherkennung (OpenAI Whisper) und Audioklassifikation (Hugging Face Transformers) zu analysieren und anschliessend aus den erkannten Audio-Events neue Kompositionen zusammenzustellen, die als fertige Videodateien gerendert werden können.

Die Zielgruppe sind Content Creator und Videoproduzenten, die effizient mit bestehendem Videomaterial arbeiten möchten – etwa um bestimmte Sprachpassagen zu finden, neu zusammenzustellen und als eigenständige Clips zu exportieren. Der Mehrwert liegt in der Kombination aus KI-gestützter Audioanalyse und einem intuitiven Kompositions-Editor, der den Workflow vom Rohmaterial zum fertigen Clip in einer einzigen Anwendung abbildet.

---

## 2. Anforderungen & Zielerreichung

### SMART-Ziele aus der Projekteingabe

| # | SMART-Ziel | Status | Bemerkung |
|---|---|---|---|
| 1 | **Video-Upload und Speicherung:** Benutzer kann Videodateien über die Weboberfläche hochladen, die serverseitig gespeichert und in der Datenbank referenziert werden. | ⚠️ Abweichung | Statt eines klassischen Uploads wurde ein Dateibrowser implementiert, über den Videos direkt aus dem lokalen Dateisystem ausgewählt werden. Da die Applikation lokal läuft (localhost), ist ein Upload nicht nötig – der Dateibrowser ist die effizientere Lösung. |
| 2 | **Audio-Extraktion:** Audio-Spur eines Videos wird automatisch mittels FFmpeg extrahiert und als separate Datei gespeichert. | ✅ Erreicht | FFmpeg extrahiert Audio als WAV (16kHz, Mono). Unterstützt MP4, MKV, AVI, MOV, WebM. |
| 3 | **Speech-to-Text-Analyse:** Aus der Audio-Spur werden mithilfe von Whisper alle gesprochenen Wörter mit Start-/End-Zeitstempeln (ms) erkannt und als Events in der Datenbank gespeichert. | ✅ Erreicht | Whisper erkennt wortgenaue Zeitstempel. Zusätzlich klassifiziert ein Hugging-Face-Transformers-Modell Segmente als Sprache, Musik oder Stille. |
| 4 | **Textbasiertes Schneiden:** Benutzer kann transkribierten Text sehen und durch Auswahl/Entfernung von Wörtern das Video schneiden. Resultat wird serverseitig via FFmpeg zusammengeschnitten. | ✅ Erreicht | Kompositions-Editor mit Wort- und Satz-Ansicht, Volltextsuche, Mehrfachauswahl und FFmpeg-basiertem Rendering. |
| 5 | **Weboberfläche:** Funktionale Weboberfläche, über die alle Kernfunktionen (Upload, Analyse-Anzeige, Schnitt-Steuerung) bedienbar sind. | ✅ Erreicht | Vue-3-SPA mit 5 Ansichten: Data, Filebrowser, Composition, Export, CLI Monitor. |

### Geplante Features aus der Projekteingabe

| Feature | Status | Bemerkung |
|---|---|---|
| Video-Upload über die Weboberfläche | ⚠️ Abweichung | Ersetzt durch Dateibrowser (siehe SMART-Ziel 1) |
| Automatische Extraktion der Audio-Spur (FFmpeg) | ✅ Erreicht | – |
| Speech-to-Text-Analyse mit wortgenauen Zeitstempeln (Whisper) | ✅ Erreicht | Zusätzlich Audioklassifikation (Musik/Stille) implementiert |
| Darstellung des transkribierten Textes mit Zeitstempel-Zuordnung | ✅ Erreicht | Wort- und Satz-Ansicht mit farbiger Typ-Kennzeichnung |
| Textbasiertes Schneiden: Auswahl/Entfernung von Wörtern | ✅ Erreicht | Inklusive Vorschau im Browser vor dem Rendern |
| Export des geschnittenen Videos | ✅ Erreicht | MP4-Download mit Dateigrösse und Render-Status |
| Datenmodell mit Entitäten (Video, Audio, Event, etc.) | ✅ Erreicht | 12 Modelle implementiert; Object, Action, Sense (für zukünftige Erweiterung) noch nicht umgesetzt |
| Echtzeit-Kommunikation via WebSockets | ✅ Erreicht | Bidirektionale Synchronisation mit Auto-Reconnect |

### Zusätzlich implementierte Features (nicht in Projekteingabe)

- **CLI-Monitor:** Echtzeit-Überwachung aller laufenden Prozesse (Extraktion, Analyse, Rendering)
- **Satz-Gruppierung:** Automatische Gruppierung von Wort-Events zu Sätzen im Kompositions-Editor
- **Lücken-Erkennung:** Automatische Erkennung nicht-klassifizierter Abschnitte zwischen Events
- **Per-Event-Vorschau:** Einzelne Audio-Events können direkt im Editor abgespielt werden
- **CRUD-Interface:** Generisches Datenmanagement für alle Modelle

### Zusammenfassung

Von den 5 SMART-Zielen wurden 4 vollständig erreicht. SMART-Ziel 1 (Video-Upload) wurde bewusst durch einen Dateibrowser ersetzt, da die Applikation lokal läuft und ein Upload-Mechanismus unnötig wäre. Alle 8 geplanten Features wurden umgesetzt, wobei der Video-Upload durch den Dateibrowser abgelöst wurde und die Entitäten Object, Action und Sense als geplante Erweiterung noch ausstehen. Darüber hinaus wurden 5 zusätzliche Features implementiert, die über den ursprünglichen Projektumfang hinausgehen.

---

## 3. Technische Umsetzung

### 3.1 Architektur

Die Applikation basiert auf einer Client-Server-Architektur mit folgenden Technologien:

- **Frontend:** Vue 3 (ESM-Module, kein Build-Step), Vue Router 4 (Hash-basiertes Routing)
- **Backend:** Deno (TypeScript-Runtime) mit WebSocket-Server
- **Datenbank:** SQLite oder JSON (konfigurierbar über Umgebungsvariable `S_DB_TYPE`)
- **CLI-Tools:** FFmpeg/FFprobe (Audioextraktion), Python 3 (Audioanalyse und Rendering)
- **Python-Bibliotheken:** OpenAI Whisper, Hugging Face Transformers, PyTorch, pyttsx3

Die gesamte Kommunikation zwischen Client und Server erfolgt über WebSocket. HTTP wird ausschliesslich für das Ausliefern statischer Dateien und Mediendateien verwendet. Der Server verwaltet einen reaktiven `o_state`, der bei jeder Änderung automatisch an alle verbundenen Clients propagiert wird.

**Projektstruktur:**

```
video_wizard/
├── localhost/          # Frontend (Vue 3 SPA)
│   ├── index.html      # HTML-Shell
│   ├── index.js        # Vue-App, Routing, WebSocket
│   ├── index.css       # Globales Styling (Dark Theme)
│   ├── constructors.js # Datenmodelle & WebSocket-Nachrichten
│   ├── o_component__data.js         # Datenmanagement
│   ├── o_component__filebrowser.js  # Dateibrowser
│   ├── o_component__composition.js  # Kompositions-Editor
│   ├── o_component__export.js       # Export & Rendering
│   ├── o_component__cli_monitor.js  # CLI-Task-Monitor
│   └── lib/            # Vue 3 & Vue Router ESM-Bundles
├── serverside/         # Backend (Deno)
│   ├── functions.js           # Server-Utilities
│   ├── cli_functions.js       # CLI-Subprozesse (FFmpeg, Python)
│   ├── database_functions.js  # SQLite-Operationen
│   ├── f_analyze_audio.py     # Spracherkennung & Klassifikation
│   ├── f_render_composition.py # Video-Rendering
│   └── testing/               # Unit-Tests
├── deno.json           # Deno-Konfiguration & Tasks
├── .env                # Umgebungsvariablen
└── readme.md           # Setup-Anleitung
```

### 3.2 Komponenten

Die Applikation besteht aus fünf Hauptkomponenten, die jeweils eine eigene Verantwortlichkeit haben:

| Komponente | Datei | Beschreibung |
|---|---|---|
| **Data** | `o_component__data.js` | CRUD-Interface für alle Datenmodelle (Erstellen, Bearbeiten, Löschen) |
| **Filebrowser** | `o_component__filebrowser.js` | Dateisystem-Navigation, Videoauswahl, Analyse-Trigger |
| **Composition** | `o_component__composition.js` | Audio-Event-Auswahl, Volltextsuche, Kompositions-Vorschau |
| **Export** | `o_component__export.js` | Rendering-Auslösung, Download, Vorschau gerenderter Videos |
| **CLI Monitor** | `o_component__cli_monitor.js` | Echtzeit-Überwachung aller laufenden CLI-Tasks |

Zusätzlich gibt es übergreifende Module:

- **constructors.js** — Definiert alle 12 Datenmodelle (o_video, o_audio, o_audio_event, o_composition, etc.) und WebSocket-Nachrichtentypen
- **functions.js** — Gemeinsame Hilfsfunktionen (Client & Server)
- **bgshader.js** — Animierter Canvas-Hintergrund

Die Kommunikation zwischen Komponenten erfolgt über den gemeinsamen reaktiven `o_state` und WebSocket-Nachrichten. Props und Events werden für den direkten Datenaustausch zwischen Eltern- und Kindkomponenten verwendet.

### 3.3 Routing

Das Routing ist mit Vue Router 4 und Hash-basierter Navigation (`createWebHashHistory`) implementiert:

| Route | Komponente | Beschreibung |
|---|---|---|
| `/` | – | Redirect auf `/data` |
| `/data` | Data | Datenmanagement aller Modelle |
| `/filebrowser` | Filebrowser | Dateisystem-Navigation & Videoanalyse |
| `/composition` | Composition | Audio-Event-Komposition |
| `/export` | Export | Video-Rendering & Download |
| `/cli` | CLI Monitor | Prozessüberwachung |

Die Navigation erfolgt über eine persistente Navigationsleiste. Deep Links funktionieren dank Hash-Routing. Die zuletzt besuchte Seite wird in der Datenbank gespeichert und beim nächsten Start wiederhergestellt.

### 3.4 State-Management

Anstelle eines klassischen Store-Frameworks (Pinia, Vuex) wird ein eigenes reaktives State-Management-System verwendet. Diese bewusste Entscheidung basiert auf folgenden Gründen:

- **Echtzeit-Synchronisation:** Der State wird über WebSocket bidirektional zwischen Server und allen Clients synchronisiert. Ein klassischer clientseitiger Store würde diese Architektur verkomplizieren.
- **Einheitliches Datenmodell:** `o_state` ist ein Vue-3-`reactive`-Objekt, das alle Datenmodelle als Arrays enthält (z.B. `o_state.a_o_video`, `o_state.a_o_composition`). CRUD-Operationen werden über die zentrale Funktion `f_v_sync()` ausgeführt, die gleichzeitig die Datenbank, den Server-State und alle verbundenen Clients aktualisiert.
- **Automatische Denormalisierung:** Fremdschlüssel-Beziehungen werden automatisch aufgelöst (z.B. `o_video.o_fsnode` wird aus `n_o_fsnode_n_id` denormalisiert).

**State-Bereiche:**
1. **Anwendungsdaten:** Alle Modelle (Videos, Audios, Audio-Events, Kompositionen, etc.)
2. **UI-State:** Ladefortschritt, Toast-Nachrichten, CLI-Task-Status, aktive Route

---

## 4. Visualisierungen

### 4.1 GUI-Entwurf (Wireframe)

Der folgende handgezeichnete Wireframe zeigt den frühen GUI-Entwurf der Applikation. Er zeigt die Grundstruktur mit Navigationsleiste, Videoanzeige und den verschiedenen Bedienelementen für die Videoanalyse und den Kompositions-Editor.

![Abbildung 1: Früher GUI-Entwurf (Wireframe) der Video Wizard Applikation](planning/gui.jpeg)

### 4.2 Entity-Relationship-Modell (ERM)

Das Entity-Relationship-Modell zeigt die Datenstruktur der Applikation. Die zentralen Entitäten sind fsnode (Dateisystem-Knoten), Video, Audio, AudioEvent und Composition. Ein fsnode verweist auf eine Videodatei, aus der ein Audio extrahiert wird. Das Audio wird in einzelne AudioEvents aufgeteilt (Sprache, Musik, Stille). Der Benutzer wählt AudioEvents aus und fasst sie zu einer Composition zusammen, die als neues Video gerendert werden kann.

![Abbildung 2: Entity-Relationship-Modell der Video Wizard Datenstruktur](planning/erm.jpeg)

### 4.3 Architekturübersicht

Die folgende Übersicht zeigt den Datenfluss der Video-Analysepipeline:

| Schritt | Prozess | Technologie | Ergebnis |
|---|---|---|---|
| 1 | Videodatei auswählen | Dateibrowser (Vue 3) | o_fsnode + o_video in DB |
| 2 | Audio extrahieren | FFmpeg (serverseitig) | WAV-Datei + o_audio in DB |
| 3 | Audio analysieren | Whisper + Transformers (Python) | o_audio_event Einträge in DB |
| 4 | Komposition erstellen | Kompositions-Editor (Vue 3) | o_composition + Zuordnungstabelle |
| 5 | Video rendern | FFmpeg (serverseitig) | Fertiges MP4-Video |

---

## 5. Fazit & Lessons Learned

### Herausforderungen

1. **Spracherkennung und Sprachklassifikation:**
   Bei einem Testvideo wurde die Sprache fälschlicherweise als Chinesisch erkannt, was die gesamte Transkription unbrauchbar machte. Die Ursache liegt im Whisper-Modell, das bei kurzen oder undeutlichen Audiopassagen die Sprache falsch identifizieren kann. Als möglicher Lösungsansatz könnte man dem Benutzer erlauben, die Sprache manuell vorzugeben, anstatt sich vollständig auf die automatische Erkennung zu verlassen.

2. **Richtiges Prompting mit KI-Werkzeugen:**
   Die Entwicklung erfolgte unter starkem Einsatz von Claude Code als KI-Assistenten. Eine zentrale Herausforderung war das präzise Formulieren von Anweisungen (Prompts). Oft programmierte die KI nicht exakt nach Vorstellung oder liess gewünschte Funktionalitäten weg. Es war schwierig nachzuvollziehen, was im Hintergrund mit den Prompts geschieht und wie diese verarbeitet werden. Richtiges Prompting ist eine Fähigkeit, die erlernt und geübt werden muss.

3. **Echtzeit-Synchronisation über WebSocket:**
   Die bidirektionale Echtzeit-Synchronisation des Anwendungsstatus über WebSocket stellte sich als komplex heraus. Die Herausforderung bestand darin, CRUD-Operationen konsistent auf Server, Datenbank und allen verbundenen Clients gleichzeitig auszuführen, ohne Race Conditions zu erzeugen. Die Lösung war eine zentrale `f_v_sync()`-Funktion, die als einziger Eingangspunkt für alle Datenänderungen dient.

### Persönliche Erkenntnisse

Das Arbeiten mit KI ist durchaus praktisch und beschleunigt die Entwicklung erheblich. Dennoch ersetzt es nicht das Verständnis der zugrunde liegenden Technologien. Es ist immer wieder spannend zu sehen, wie mächtig kontextbewusste KI-Werkzeuge sind, aber man muss lernen, sie effektiv einzusetzen. Die Kombination aus eigenem Fachwissen und KI-Unterstützung ergibt das beste Resultat.

### Verbesserungsvorschläge

- **FFmpeg im Browser:** Für eine rein clientseitige Lösung könnte FFmpeg mit WebAssembly (ffmpeg.wasm) direkt im Browser ausgeführt werden, was den Server-Prozess eliminieren würde.
- **Optische Videoanalyse:** Neben der Audioanalyse könnte eine Bildanalyse (z.B. Szenerkennung, Objekterkennung) zusätzliche Kontextinformationen für den Editor liefern.
- **Manuelle Sprachauswahl:** Um das Problem der falschen Spracherkennung zu umgehen, könnte eine manuelle Spracheinstellung als Fallback angeboten werden.
- **Detaillierteres Fehlerhandling:** Bei fehlgeschlagenen Analysen könnte dem Benutzer genauer erklärt werden, warum der Prozess gescheitert ist und welche Schritte zur Behebung möglich sind.
