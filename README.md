# Self Check-in Web Application

A simple full-stack check-in app with a realtime clock (Asia/Ho_Chi_Minh), one check-in per day, and JSON file persistence. Runs in Docker with a single command.

## Quick Start

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

```bash
docker compose up
```

Open [http://localhost:3000](http://localhost:3000).

To rebuild after code changes:

```bash
docker compose up --build
```

## Local Development (without Docker)

```bash
npm install
npm start
```

Visit [http://localhost:3000](http://localhost:3000).

## Features

- **Realtime clock** — Updates every second in `Asia/Ho_Chi_Minh` (UTC+7)
- **Daily check-in** — One check-in per calendar day; duplicate attempts are rejected
- **Check-in history** — Newest first, responsive card layout
- **Status card** — Shows today's check-in time when applicable
- **Streak counter** — Consecutive days with check-ins
- **Material Design UI** — Custom palette, ripple button, snackbar notifications

## API

### `POST /api/checkin`

Save today's check-in.

- **201** — `{ "date": "2026-05-20", "checked_in_at": "07:00:00" }`
- **409** — Already checked in today

### `GET /api/checkins`

Return all check-ins, sorted newest first.

### `DELETE /api/checkins/:date`

Remove a check-in by date (e.g. `2026-05-20`).

- **200** — Deleted record
- **404** — Check-in not found

### `GET /api/status`

Return today's status and streak.

```json
{
  "checkedInToday": true,
  "todayRecord": { "date": "2026-05-20", "checked_in_at": "07:00:00" },
  "streak": 3
}
```

## Data Storage

Check-ins are stored in `data/checkins.json`:

```json
[
  {
    "date": "2026-05-20",
    "checked_in_at": "07:00:00"
  }
]
```

With Docker, a named volume (`checkins_data`) persists data across container restarts.

## Project Structure

```
├── server.js
├── package.json
├── Dockerfile
├── docker-compose.yml
├── lib/
│   └── checkinsStore.js
├── data/
│   └── checkins.json
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## Timezone

All dates and times use **Asia/Ho_Chi_Minh** (UTC+7) on both server and client.
