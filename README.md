# 🐢 Tortoise Tracker – Schildkröten-Doku

Kleine, selbst-gehostete Web­applikation zur Dokumentation von Landschildkröten
(entwickelt für griechische Landschildkröten, *Testudo hermanni*). Pro Tier werden
Stammdaten, Gewichts­entwicklung, eine Foto­dokumentation und eine Ereignis-Timeline
geführt. Ein Reminder-Dienst erinnert – im Browser und per Telegram – an fällige
Aufgaben wie eine neue Foto­dokumentation oder das Setzen eines Transponders.

Die Oberfläche ist deutsch­sprachig, mobil­tauglich (Eingabe am Gehege) und ohne
Login – gedacht für den Betrieb im eigenen Heimnetz.

---

## Features

- **Stammdaten** je Tier: Name, Unterart, Schlupfdatum, Geschlecht, Herkunft,
  CITES-/EG-Bescheinigungsnummer, Transpondernummer, weitere Kennzeichen,
  Erwerbs-, Sterbe- und Verkaufsdatum, Notizen.
- **Profilbild** – Foto-Upload, wird rund neben dem Namen und in der Seitenleiste
  angezeigt.
- **Gewichtsentwicklung** – Schnell­eingabe (Datum vorbelegt), Verlaufs­diagramm
  umschaltbar zwischen Gewicht, Panzerlänge (SCL) und Jackson-Ratio, plus Tabelle.
- **Fotodokumentation** – Upload per Drag-and-Drop (auch mehrere Dateien, inkl.
  HEIC/iPhone). Das Aufnahmedatum wird aus den EXIF-Daten übernommen; Anzeige als
  vertikale Zeitleiste (alt → neu) mit Thumbnails und Großansicht (Lightbox).
- **Timeline** – Freitext-Ereignisse mit Typ: Einwinterung, Auswinterung,
  Tierarztbesuch, Medikation, Sonstiges.
- **Dokumentenablage** je Tier (PDF/Bild) für CITES-Bescheinigung,
  Herkunftsnachweis, Befunde …
- **Reminder-Dienst**
  - *Fotodokumentation fällig* – altersabhängiges Intervall (Standard: bis 5 Jahre
    alle 6 Monate, danach jährlich).
  - *Chip implantieren* – sobald das aktuelle Gewicht eine Schwelle (Standard
    500 g) überschreitet und keine Transpondernummer hinterlegt ist.
  - Ausgabe als Popup in der App **und** einmalig als Telegram-Nachricht;
    Erinnerungen lassen sich als *erledigt* markieren oder *vertagen*.
  - Alle Schwellen sind im Einstellungs­menü konfigurierbar.
- **Archiv** – Tiere mit Sterbe-/Verkaufsdatum werden aus der aktiven Liste
  ausgeblendet und in eine ausklappbare Archiv­liste einsortiert (weiterhin voll
  einsehbar). Für archivierte Tiere entstehen keine Reminder mehr.
- **Sortierung** – aktive Tiere in der Seitenleiste per Drag-and-Drop ordnen.
- **Dark-/Light-Mode** – folgt der Systemeinstellung, oben rechts umschaltbar.
- Datumsanzeige durchgängig im Format `TT.MM.JJJJ`.
- **Automatische Schema-Migrationen** beim Start (idempotente `ALTER TABLE` für
  SQLite – kein Migrations­tool nötig).

---

## Architektur

Zwei Container:

| Dienst | Technik | Aufgabe |
| ------ | ------- | ------- |
| `api`  | FastAPI · SQLModel · SQLite · Pillow (+ pillow-heif) · APScheduler | REST-API unter `/api`, Datei-Uploads unter `/uploads`, Reminder-Auswertung (täglich 08:00, beim Start und bei jedem Laden der Oberfläche) |
| `web`  | React · Vite · TypeScript · Recharts · nginx | Statisches Frontend; nginx liefert die App aus und leitet `/api` und `/uploads` an den `api`-Container weiter |

```
Browser ──▶ web (nginx :80) ──┬─ statische App
                              ├─ /api/…     ─▶ api (uvicorn :8000)
                              └─ /uploads/… ─▶ api
                                                 │
                                       ./data ───┤  schildkroeten.db
                                                 └  uploads/  (+ thumbs/)
```

Alle persistenten Daten liegen im Verzeichnis **`./data`** (SQLite-Datei +
hochgeladene Fotos/Dokumente). Es wird als Volume in den `api`-Container gemountet.

### Verzeichnisstruktur

```
backend/    FastAPI-App (app/), Tests (tests/), Dockerfile
frontend/   React-App (src/), nginx.conf, Dockerfile
docker-compose.yml
.github/workflows/   CI (Tests + Build) und Image-Veröffentlichung
```

---

## Installation

Voraussetzung: Docker (mit Compose-Plugin).

### Variante A – Docker Compose (empfohlen)

```bash
mkdir tortoise-tracker && cd tortoise-tracker
curl -O https://raw.githubusercontent.com/benjamira/tortoise-tracker/main/docker-compose.yml
docker compose up -d
```

Danach im Browser: `http://SERVER-IP:8080`

`docker compose up -d` zieht die veröffentlichten Images von der GitHub Container
Registry. Aktualisieren:

```bash
docker compose pull && docker compose up -d
```

Images lokal aus dem Quellcode bauen (optional, z. B. für Entwicklung):

```bash
git clone https://github.com/benjamira/tortoise-tracker.git
cd tortoise-tracker
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

### Variante B – `docker run`

```bash
docker network create tortoise

docker run -d --name tortoise-api \
  --network tortoise --network-alias api \
  -v "$PWD/data:/data" \
  --restart unless-stopped \
  ghcr.io/benjamira/tortoise-tracker-backend:latest

docker run -d --name tortoise-web \
  --network tortoise \
  -p 8080:80 \
  --restart unless-stopped \
  ghcr.io/benjamira/tortoise-tracker-frontend:latest
```

Wichtig: Der Backend-Container muss im Netzwerk als **`api`** erreichbar sein
(`--network-alias api`), da nginx dorthin weiterleitet.

---

## Konfiguration

| Einstellung | Wo | Standard |
| ----------- | -- | -------- |
| Host-Port des Frontends | `ports:` in `docker-compose.yml` bzw. `-p` | `8080:80` |
| Datenverzeichnis im Container | Env `DATA_DIR` am `api`-Container | `/data` |
| Telegram Bot-Token & Chat-/Channel-ID | Oberfläche → **Einstellungen** | – |
| Foto-Intervalle, Altersgrenze, Chip-Gewichtsschwelle | Oberfläche → **Einstellungen** | 6 / 12 Monate, 5 Jahre, 500 g |
| Reminder je Typ ein-/ausschalten | Oberfläche → **Einstellungen** | an |

### Telegram einrichten

1. Bei [@BotFather](https://t.me/BotFather) einen Bot anlegen und den Token kopieren.
2. Chat-/Channel-ID des Ziels ermitteln (eigene numerische ID oder `@kanalname`;
   den Bot vorher der Gruppe/dem Kanal hinzufügen).
3. Unter **Einstellungen** eintragen und **„Testnachricht senden“** prüfen.

---

## Backup & Wiederherstellung

Der gesamte Zustand steckt im `data/`-Verzeichnis.

```bash
# Sichern
tar czf tortoise-backup-$(date +%F).tgz data/

# Wiederherstellen
tar xzf tortoise-backup-YYYY-MM-DD.tgz
docker compose up -d
```

Schema-Anpassungen neuerer Versionen werden beim Start automatisch und idempotent
angewandt.

---

## Entwicklung

**Backend**

```bash
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements.txt
DATA_DIR=./data .venv/bin/uvicorn app.main:app --reload   # http://localhost:8000
.venv/bin/python -m pytest                                # Tests
```

**Frontend**

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, /api + /uploads werden auf :8000 geproxyt
npm run build      # Typecheck (tsc) + Produktions-Build
```

---

## CI/CD

| Workflow | Auslöser | Zweck |
| -------- | -------- | ----- |
| `.github/workflows/ci.yml` | Push auf `main`, Pull Requests | Backend-Tests (pytest) und Frontend-Build/Typecheck |
| `.github/workflows/docker.yml` | Push auf `main`, Tags `v*`, manuell | Baut **Multi-Arch-Images** (`linux/amd64`, `linux/arm64`) und veröffentlicht sie in der GitHub Container Registry |

Veröffentlichte Images:

- `ghcr.io/benjamira/tortoise-tracker-backend`
- `ghcr.io/benjamira/tortoise-tracker-frontend`

Tags: `latest` (letzter `main`-Stand), `sha-<kurz>` je Commit, sowie `X.Y.Z` /
`X.Y` bei einem Release-Tag `vX.Y.Z`.

---

## Sicherheit

Die Anwendung hat **keine Authentifizierung** und ist für den Betrieb in einem
vertrauens­würdigen Heimnetz gedacht. Nicht ungeschützt ins Internet stellen –
bei Bedarf einen Reverse-Proxy mit Zugriffsschutz (Basic-Auth, VPN, o. Ä.)
davorschalten.

---

## Lizenz

Bislang keine Lizenz festgelegt.
