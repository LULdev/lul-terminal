# LUL Terminal

[![Version](https://img.shields.io/badge/version-3.36.69-blue)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)](package.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-orange)](LICENSE)

Community arcade, profiles, tools, and terminal hub — built with **React 19**, **Vite**, and **Express**.

**Repository:** [github.com/LULdev/lul-terminal](https://github.com/LULdev/lul-terminal)

---

## Features

- Session-based auth with roles (admin, VIP, member)
- 14 arcade games with LUL coin escrow
- Paste bin, image hosting, meme editor, tool vault
- Proxy scraper/checker, persona DB, XML link scraper
- Admin dashboard (analytics, moderation, shoutbox, setup notes)
- JSON file stores under `data/` (no external DB required)

---

## Installationsanleitung (Schritt für Schritt)

### Voraussetzungen

| Anforderung | Minimum |
|-------------|---------|
| **Node.js** | 18 oder höher |
| **npm** | 9+ (mit Node mitgeliefert) |
| **Git** | zum Klonen des Repos |
| **Betriebssystem** | Windows, macOS oder Linux |

```bash
node -v    # sollte v18.x oder höher anzeigen
npm -v
```

### Schritt 1 — Repository klonen

```bash
git clone https://github.com/LULdev/lul-terminal.git
cd lul-terminal
```

### Schritt 2 — Abhängigkeiten installieren

```bash
npm install
```

### Schritt 3 — Umgebungsvariablen einrichten

Kopiere die Beispiel-Datei und passe sie an:

**Windows (PowerShell / CMD):**

```bash
copy .env.example .env
```

**Linux / macOS:**

```bash
cp .env.example .env
```

Bearbeite `.env` — mindestens für **Produktion**:

| Variable | Pflicht (Prod) | Beschreibung |
|----------|----------------|--------------|
| `TRUST_PROXY` | Ja (hinter Proxy) | `1` wenn nginx/Caddy/Cloudflare davor |
| `NODE_ENV` | Ja | `production` für Secure-Cookies |
| `SEED_ADMIN_PASSWORD` | Ja (leere DB) | Passwort für ersten `admin`-Account |
| `SEED_VIP_PASSWORD` | Ja (leere DB) | Passwort für `vipdemo` |
| `PREMIUM_VAULT_KEY` | Ja | Verschlüsselung Premium-Vault |
| `PORT` | Nein | Standard: `3000` |

> **Hinweis aus dem Admin-Dashboard (Setup Notes):** Ohne `TRUST_PROXY=1` hinter einem Reverse-Proxy greifen Rate-Limits auf die Proxy-IP statt auf die echte Client-IP zu.

### Schritt 4 — Optional: Seed-Daten laden

Nur nötig bei leerer Installation oder zum Auffüllen von Demo-Daten:

```bash
npm run seed:auth          # Admin + VIP wenn users.json leer
npm run seed:persona-db    # Persona-Adressdatenbank
npm run seed:proxy-sources # Proxy-Scraper-Quellen
```

### Schritt 5 — Entwicklung starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000). Vite liefert Frontend + API-Middleware (gleicher Port).

**Standard-Login nach Seed (nur Dev ohne gesetzte Env-Passwörter):** Passwort wird einmalig in der Server-Konsole generiert — setze `SEED_ADMIN_PASSWORD` in `.env` für ein festes Passwort.

### Schritt 6 — Produktion bauen

```bash
npm run lint    # TypeScript-Prüfung
npm run build   # Erzeugt dist/
```

### Schritt 7 — Produktion starten

```bash
# .env: NODE_ENV=production, TRUST_PROXY=1, alle Secrets gesetzt
npm start
```

Express bedient `dist/` (SPA) und alle `/api/*`-Routen auf `PORT` (Standard 3000).

### Schritt 8 — Reverse-Proxy (nginx Beispiel)

```nginx
server {
    listen 443 ssl;
    server_name terminal.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

In `.env` auf dem Server: `TRUST_PROXY=1`

### Schritt 9 — `data/` sichern

Alle Nutzer-, Chat-, Spiel- und Upload-Metadaten liegen in `data/`. Diesen Ordner **sichern und persistent mounten** (Docker-Volume, Backup, etc.).

Gitignored (Runtime): `data/image-host/`, `data/proxy-scraper/state.json`, `data/proxy-scraper/last-results.json`

---

## Quick start (English)

```bash
git clone https://github.com/LULdev/lul-terminal.git
cd lul-terminal
npm install
cp .env.example .env   # edit for production
npm run dev            # http://localhost:3000
```

Production: `npm run build && npm start`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server + API (port 3000) |
| `npm run build` | Production frontend build → `dist/` |
| `npm start` | Express production server |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm run preview` | Preview production build |
| `npm run seed:auth` | Seed default users if DB empty |
| `npm run seed:persona-db` | Seed persona database |
| `npm run seed:proxy-sources` | Seed proxy scraper sources |

---

## Environment variables

See [`.env.example`](.env.example) for the full template.

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default `3000`) |
| `NODE_ENV` | `production` enables Secure session cookies |
| `TRUST_PROXY` | `1` when behind reverse proxy (rate limits + Express) |
| `SEED_ADMIN_PASSWORD` | Initial admin password (required in prod on empty DB) |
| `SEED_VIP_PASSWORD` | Initial VIP demo password (required in prod on empty DB) |
| `PREMIUM_VAULT_KEY` | AES key for premium account encryption (required in prod) |
| `DISABLE_HMR` | `true` disables Vite HMR |
| `GEMINI_API_KEY` | Optional — Gemini AI features |
| `APP_URL` | Optional — public app URL |

---

## Stack

- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Motion
- **Backend:** Express (`server/start.mjs`), JSON file stores
- **Auth:** Cookie sessions, registration signal registry
- **Games:** 14 titles, coin escrow, matchmaking

---

## Project structure

```
lul-terminal/
├── data/           # JSON stores (persist in production)
├── public/         # Static assets (favicon, memes catalog)
├── server/         # Express API + stores
├── src/            # React app
├── scripts/        # Seed & maintenance scripts
├── dist/           # Build output (gitignored)
├── .env.example    # Environment template
└── vercel.json     # SPA rewrites for static deploy
```

---

## Admin setup notes

In the running app: **Admin Dashboard → Setup Notes** — mirrors deployment reminders from this README (TRUST_PROXY, secrets, `data/` persistence, install checklist).

---

## GitHub / deployment

| Ziel | Hinweis |
|------|---------|
| **Self-hosted VPS** | `npm run build && npm start` + nginx + `TRUST_PROXY=1` |
| **Docker** | Mount `data/`, set env from `.env.example` |
| **Vercel (static only)** | `vercel.json` rewrites SPA routes; **API requires Node server** — use VPS or split frontend/API |

### Repository checklist

- [x] `README.md` — Installationsanleitung
- [x] `.env.example` — alle Env-Variablen
- [x] `LICENSE` — Apache-2.0
- [x] `.gitignore` — `node_modules`, `dist`, secrets, runtime data

### Clone & contribute

```bash
git clone https://github.com/LULdev/lul-terminal.git
git checkout -b feature/my-change
npm run lint && npm run build
git commit -am "feat: …"
git push origin feature/my-change
```

Open a Pull Request against `main`.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).