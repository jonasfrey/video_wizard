## Projekttitel
Video Wizard

## Kurzbeschreibung
Video Wizard ist eine Webapplikation, die Videos mithilfe von KI-Modellen analysieren und schneiden kann. Das Kernfeature ist das wortgenaue Schneiden von Videos: Die Audio-Spur eines Videos wird extrahiert und von einem Speech-to-Text-Modell (OpenAI Whisper) analysiert. Dabei werden einzelne Wörter mit präzisen Zeitstempeln erkannt. Der Benutzer kann anschliessend das Video texbasiert schneiden, indem er Wörter oder Passagen auswählt oder entfernt.

## Alle Gruppenmitglieder (Name, E-Mail)
Jonas Frey, jfr159207@stud.gibb.ch

## Projektziele (SMART formuliert)
1. **Video-Upload und Speicherung**: Bis Projektende kann der Benutzer Videodateien über die Weboberfläche hochladen, die serverseitig im Dateisystem gespeichert und in der Datenbank referenziert werden.
2. **Audio-Extraktion**: Bis Projektende wird die Audio-Spur eines hochgeladenen Videos automatisch mittels FFmpeg extrahiert und als separate Datei gespeichert.
3. **Speech-to-Text-Analyse**: Bis Projektende werden aus der extrahierten Audio-Spur mithilfe des Whisper-Modells alle gesprochenen Wörter mit individuellen Start- und End-Zeitstempeln (in Millisekunden) erkannt und in der Datenbank als Events gespeichert.
4. **Textbasiertes Schneiden**: Bis Projektende kann der Benutzer über die Weboberfläche den transkribierten Text sehen und durch Auswahl oder Entfernung von Wörtern das Video schneiden. Das resultierende Video wird serverseitig mittels FFmpeg zusammengeschnitten.
5. **Weboberfläche**: Bis Projektende existiert eine funktionale Weboberfläche, über die alle Kernfunktionen (Upload, Analyse-Anzeige, Schnitt-Steuerung) bedienbar sind.

## Geplante Features / Anforderungen
- Video-Upload über die Weboberfläche
- Automatische Extraktion der Audio-Spur aus dem Video (FFmpeg)
- Speech-to-Text-Analyse mit wortgenauen Zeitstempeln (OpenAI Whisper)
- Darstellung des transkribierten Textes mit Zeitstempel-Zuordnung
- Textbasiertes Schneiden: Auswahl/Entfernung von Wörtern zum Definieren von Schnittpunkten
- Export des geschnittenen Videos
- Datenmodell mit Entitäten: Video, Audio, Event, Object, Action, Sense (für zukünftige Erweiterung mit Geräusch-/Objekterkennung)
- Echtzeit-Kommunikation zwischen Client und Server via WebSockets

## Gewählte Technologien (Frameworks, APIs, Services)
| Technologie | Verwendungszweck |
|---|---|
| Deno | Server-Runtime (JavaScript/TypeScript) |
| WebSockets | Echtzeit-Kommunikation Client-Server |
| SQLite | Serverseitige Datenbank (via jsr:@db/sqlite) |
| FFmpeg | Video-/Audio-Verarbeitung (Extraktion, Schnitt) |
| OpenAI Whisper | Speech-to-Text-Modell (lokal, open-source, kein Internet nötig) |
| HTML/CSS/JavaScript | Frontend-Weboberfläche |

## Link zum GitLab-Repository
[video_wizard](https://github.com/jonasfrey/video_wizard)