# 🐢 Tortoise Tracker

A small, self-hosted web application for documenting tortoises (built for
Hermann's tortoises, *Testudo hermanni*). For each animal it keeps master data,
a weight history, a photo log and an event timeline. A reminder service notifies
you – in the browser and via Telegram – about due tasks such as a fresh photo
documentation or fitting a transponder chip.

The interface is available in **German and English**, works on mobile (enter data
at the enclosure) and has no login – intended to run on your own home network.

---

## Features

- **Master data** per animal: name, subspecies, hatch date, sex, origin,
  CITES / EU certificate number, transponder number, other markings, acquisition,
  death and sale dates, notes.
- **Profile picture** – photo upload, shown as a round avatar next to the name and
  in the sidebar.
- **Weight history** – quick entry (date pre-filled), a trend chart switchable
  between weight, carapace length (SCL) and Jackson ratio, plus a table.
  Weight accepts one decimal place.
- **Photo log** – drag-and-drop upload (multiple files, incl. HEIC/iPhone). The
  capture date is read from the EXIF data; shown as a vertical timeline
  (old → new) with thumbnails and a lightbox.
- **Timeline** – free-text events typed as: start/end of hibernation, vet visit,
  medication, other.
- **Document store** per animal (PDF/image) for the CITES certificate, proof of
  origin, findings, …
- **Reminder service**
  - *Photo documentation due* – age-dependent interval (default: every 6 months
    up to age 5, yearly after that).
  - *Fit a chip* – as soon as the current weight exceeds a threshold (default
    500 g) and no transponder number is recorded.
  - Shown as a popup in the app **and** sent once as a Telegram message;
    reminders can be marked *done* or *snoozed*.
  - All thresholds are configurable in the settings.
- **Archive** – animals with a death/sale date are removed from the active list
  and moved to a collapsible archive section (still fully accessible). Archived
  animals no longer generate reminders.
- **Reordering** – arrange the active animals in the sidebar via drag-and-drop.
- **Dark / light mode** and **language (German / English)** – both selectable in
  the top right; the defaults follow the system settings.
- **Automatic schema migrations** on startup (idempotent `ALTER TABLE` for
  SQLite – no migration tool required).

---

## Architecture

Two containers:

| Service | Stack | Role |
| ------- | ----- | ---- |
| `api`   | FastAPI · SQLModel · SQLite · Pillow (+ pillow-heif) · APScheduler | REST API under `/api`, file uploads under `/uploads`, reminder evaluation (daily at 08:00, on startup and on every page load) |
| `web`   | React · Vite · TypeScript · Recharts · nginx | Static frontend; nginx serves the app and proxies `/api` and `/uploads` to the `api` container |

```
Browser ──▶ web (nginx :80) ──┬─ static app
                              ├─ /api/…     ─▶ api (uvicorn :8000)
                              └─ /uploads/… ─▶ api
                                                 │
                                       ./data ───┤  schildkroeten.db
                                                 └  uploads/  (+ thumbs/)
```

All persistent state lives in the **`./data`** directory (SQLite file + uploaded
photos/documents), mounted as a volume into the `api` container.

### Repository layout

```
backend/    FastAPI app (app/), tests (tests/), Dockerfile
frontend/   React app (src/), nginx.conf, Dockerfile
docker-compose.yml
.github/workflows/   CI (tests + build) and image publishing
```

---

## Installation

Requires Docker (with the Compose plugin).

### Option A – Docker Compose (recommended)

```bash
mkdir tortoise-tracker && cd tortoise-tracker
curl -O https://raw.githubusercontent.com/benjamira/tortoise-tracker/main/docker-compose.yml
docker compose up -d
```

Then open `http://SERVER-IP:8080` in the browser.

`docker compose up -d` pulls the published images from the GitHub Container
Registry. Update with:

```bash
docker compose pull && docker compose up -d
```

Build the images locally from source (optional, e.g. for development):

```bash
git clone https://github.com/benjamira/tortoise-tracker.git
cd tortoise-tracker
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

### Option B – `docker run`

```bash
docker network create tortoise-tracker

docker run -d --name tortoise-tracker-api \
  --network tortoise-tracker --network-alias api \
  -v "$PWD/data:/data" \
  --restart unless-stopped \
  ghcr.io/benjamira/tortoise-tracker-backend:latest

docker run -d --name tortoise-tracker-web \
  --network tortoise-tracker \
  -p 8080:80 \
  --restart unless-stopped \
  ghcr.io/benjamira/tortoise-tracker-frontend:latest
```

Important: the backend container must be reachable as **`api`** on the network
(`--network-alias api`), because that is where nginx proxies to.

---

## Configuration

| Setting | Where | Default |
| ------- | ----- | ------- |
| Frontend host port | `ports:` in `docker-compose.yml` / `-p` | `8080:80` |
| Data directory in the container | env `DATA_DIR` on the `api` container | `/data` |
| Telegram bot token & chat/channel ID | UI → **Settings** | – |
| Photo intervals, age limit, chip weight threshold | UI → **Settings** | 6 / 12 months, 5 years, 500 g |
| Enable/disable each reminder type | UI → **Settings** | on |
| Language & theme | top-right of the UI (per browser) | follows system settings |

### Setting up Telegram

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Determine the target chat/channel ID (your own numeric ID or `@channelname`;
   add the bot to the group/channel first).
3. Enter both under **Settings** and verify with **"Send test message"**.

Telegram messages are always sent in German, regardless of the UI language.

---

## Backup & restore

The entire state is contained in the `data/` directory.

```bash
# Backup
tar czf tortoise-backup-$(date +%F).tgz data/

# Restore
tar xzf tortoise-backup-YYYY-MM-DD.tgz
docker compose up -d
```

Schema changes from newer versions are applied automatically and idempotently on
startup.

---

## Development

**Backend**

```bash
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements.txt
DATA_DIR=./data .venv/bin/uvicorn app.main:app --reload   # http://localhost:8000
.venv/bin/python -m pytest                                # tests
```

**Frontend**

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, /api + /uploads proxied to :8000
npm run build      # type check (tsc) + production build
```

### Adding a language

1. Copy `frontend/src/i18n/messages/de.ts` to `<code>.ts` and translate every value.
2. Add the code to the `Lang` type and one entry to `LOCALES` in
   `frontend/src/i18n/config.ts`.

`de.ts` is the source of truth – TypeScript fails the build if any locale is
missing a key.

---

## CI/CD

| Workflow | Trigger | Purpose |
| -------- | ------- | ------- |
| `.github/workflows/ci.yml` | push to `main`, pull requests | backend tests (pytest) and frontend build / type check |
| `.github/workflows/docker.yml` | push to `main`, tags `v*`, manual | builds **multi-arch images** (`linux/amd64`, `linux/arm64`) and publishes them to the GitHub Container Registry |

Published images:

- `ghcr.io/benjamira/tortoise-tracker-backend`
- `ghcr.io/benjamira/tortoise-tracker-frontend`

Tags: `latest` (latest `main`), `sha-<short>` per commit, plus `X.Y.Z` / `X.Y`
for a release tag `vX.Y.Z`.

---

## Security

The application has **no authentication** and is meant to run on a trusted home
network. Do not expose it to the internet unprotected – put a reverse proxy with
access control (basic auth, VPN, etc.) in front of it if needed.

---

## License

No license has been chosen yet.
