# LUL Terminal

[![Version](https://img.shields.io/badge/version-3.36.79-blue)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)](package.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-orange)](LICENSE)

Community arcade, profiles, tools, and terminal hub — built with **React 19**, **Vite**, and **Express**.

**Repository:** [github.com/LULdev/lul-terminal](https://github.com/LULdev/lul-terminal)

---

## Features

| Bereich | Inhalt |
|---------|--------|
| **Auth** | Session-Cookies, Rollen (admin / VIP / member / bot), Registrierungs-Challenge, Referral-System |
| **Arcade** | 14 Spiele, LUL-Coin-Escrow, Matchmaking, Leaderboards |
| **Paste** | Öffentlich / geschützt / privat, Burn-after-read, View-Dedup, Admin-CRUD |
| **Image Host** | Upload, Galerie, View-Tracking |
| **Premium Vault** | Account-Vault (VIP), Admin-CRUD + Bulk-Import, verschlüsselte Passwörter |
| **Proxy** | Scraper (~146 Quellen), Checker, Proxy-Datenbank |
| **Tools** | Persona-DB, XML-Link-Scraper, Colon-DB, Meme-Editor, Tool Vault, Net Toolkit |
| **News & Chat** | LUL Wire (News-Feed), Shoutbox, Emotes, Moderation |
| **Admin** | Analytics, Heatmap, Moderation, Page Visibility, Setup Notes, System Pulse |
| **Terminal** | Diagnostics-Pane, Achievements, Matrix/Self-Destruct Easter Eggs |

**Daten:** JSON-File-Stores unter `data/` — keine externe Datenbank nötig.

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
| `NODE_ENV` | Ja | `production` für Secure-Cookies |
| `TRUST_PROXY` | Ja (hinter Proxy) | `1` wenn nginx/Caddy/Cloudflare davor |
| `TRUSTED_PROXY_IPS` | Empfohlen | Komma-getrennte Proxy-Hop-IPs (Standard: Loopback) |
| `PUBLIC_BASE_URL` | Optional | Kanonische öffentliche URL für Paste/Image/Referral-Links in API-Antworten |
| `SEED_ADMIN_PASSWORD` | Ja (leere DB) | Passwort für ersten `admin`-Account |
| `SEED_VIP_PASSWORD` | Ja (leere DB) | Passwort für `vipdemo` |
| `PREMIUM_VAULT_KEY` | Ja | AES-Verschlüsselung Premium-Vault |
| `PORT` | Nein | Standard: `3000` |

> **Wichtig hinter Reverse-Proxy:** Ohne `TRUST_PROXY=1` greifen Rate-Limits auf die Proxy-IP statt auf die echte Client-IP. `X-Forwarded-Host` / `X-Forwarded-Proto` werden nur von IPs in `TRUSTED_PROXY_IPS` akzeptiert (Phishing-Schutz für Share-Links).

### Schritt 4 — Optional: Seed-Daten laden

Siehe Abschnitt **[Seed-Skripte](#seed-skripte)**. Kurzfassung für eine frische Installation:

```bash
# .env vorher setzen: SEED_ADMIN_PASSWORD, SEED_VIP_PASSWORD (Prod Pflicht)
npm run seed:auth            # Admin + VIP + Bot (nur wenn users.json leer)
npm run seed:persona-db      # 250 Persona-Adressen
npm run seed:proxy-sources   # ~146 Proxy-Listen-URLs
npm run seed:news            # 40 LUL-Wire-Artikel (überschreibt news.json)
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

In `.env` auf dem Server:

```env
NODE_ENV=production
TRUST_PROXY=1
PUBLIC_BASE_URL=https://terminal.example.com
PREMIUM_VAULT_KEY=<langer-zufälliger-string>
SEED_ADMIN_PASSWORD=<starkes-passwort>
SEED_VIP_PASSWORD=<starkes-passwort>
```

### Schritt 9 — `data/` sichern

Alle Nutzer-, Chat-, Spiel- und Upload-Metadaten liegen in `data/`. Diesen Ordner **sichern und persistent mounten** (Docker-Volume, Backup, etc.).

Gitignored (Runtime): `data/image-host/`, `data/proxy-scraper/state.json`, `data/proxy-scraper/last-results.json`

---

## Seed-Skripte

Seed-Skripte füllen JSON-Stores unter `data/` mit Startdaten. Es gibt **manuelle** npm-Befehle und **automatische** Seeds beim ersten API-Zugriff.

### Übersicht

| Befehl / Mechanismus | Zieldatei | Was passiert |
|----------------------|-----------|--------------|
| `npm run seed:auth` | `data/auth/users.json` | Legt `admin`, `vipdemo` und `bot` an (nur wenn die Datei leer ist) |
| `npm run seed:persona-db` | `data/persona-database/entries.json` | Schreibt 250 öffentliche Adressen (Land, Stadt, Straße, Zeitzone, Venue) |
| `npm run seed:proxy-sources` | `data/proxy-scraper/sources.json` | Schreibt ~146 eindeutige Proxy-Listen-URLs (GitHub-Repos + Proxifly) |
| `npm run seed:news` | `data/feeds/news.json` | Überschreibt den News-Feed mit 40 Demo-Artikeln (Features, Spiele, Plattform) |
| Auth (automatisch) | `data/auth/users.json` | Beim ersten Login/API-Start: gleich wie `seed:auth`, wenn `users.json` fehlt oder leer |
| News (automatisch) | `data/feeds/news.json` | Nur wenn `news.json` **fehlt**: 2 Minimal-Bulletins (kein voller Wire-Feed) |
| Chat-Emotes (automatisch) | `data/chat/emotes.json` + `data/chat/emotes/files/` | Beim ersten Emote-Zugriff: 5 Platzhalter-SVG-Emotes, wenn die DB leer ist |
| Proxy-Quellen (automatisch) | `data/proxy-scraper/sources.json` | Nur wenn `sources.json` **fehlt**: führt intern `seed-proxy-sources` aus |

### `npm run seed:auth`

**Befehl:** `npm run seed:auth` (ruft `seedDefaultUsersIfEmpty()` in `server/auth/authStore.mjs` auf)

**Bewirkt:**

- Wenn `data/auth/users.json` **bereits Nutzer enthält**: nichts Neues — nur der Bot-User `bot` wird ggf. ergänzt/korrigiert (Rolle `bot`, Anzeigename „BOT“).
- Wenn die Datei **leer oder neu** ist: erstellt
  - `admin` (Rolle `admin`) — Passwort aus `SEED_ADMIN_PASSWORD`
  - `vipdemo` (Rolle `vip`) — Passwort aus `SEED_VIP_PASSWORD`
  - `bot` (Rolle `bot`) — zufälliges Passwort (nur System-Announcements)

**Wann ausführen:**

- Frische Installation, bevor du dich das erste Mal einloggst
- Nach bewusstem Löschen von `data/auth/users.json` (Reset)
- In **Produktion**: `.env` mit starken `SEED_*`-Passwörtern **vor** dem ersten Start setzen

> Der Server ruft denselben Seed **automatisch** beim Auth-Start auf — `npm run seed:auth` ist nur nötig, wenn du Accounts **vor** `npm run dev` / `npm start` anlegen willst.

### `npm run seed:persona-db`

**Befehl:** `npm run seed:persona-db` → `scripts/seed-persona-database.mjs`

Schreibt **250 Einträge** in `data/persona-database/entries.json`. **Überschreibt** die Datei vollständig.

### `npm run seed:proxy-sources`

**Befehl:** `npm run seed:proxy-sources` → `scripts/seed-proxy-sources.mjs`

Schreibt **~146 Quellen** in `data/proxy-scraper/sources.json`. **Überschreibt** die Datei vollständig.

### `npm run seed:news`

**Befehl:** `npm run seed:news` → `scripts/seed-news-articles.mjs`

**Überschreibt** `data/feeds/news.json` mit **40 Artikeln** (Spiele, Features, Plattform-Bulletins).

### Automatische Seeds (kein manueller Befehl)

| Feature | Auslöser | Ergebnis |
|---------|----------|----------|
| **Auth** | Erster Auth-Service-Start / API-Login | `admin` + `vipdemo` + `bot` wie oben, nur bei leerer `users.json` |
| **News (minimal)** | Erster Zugriff auf News-API, `news.json` fehlt | 2 System-Bulletins |
| **Chat-Emotes** | Erster Emote-Listen-/Admin-Zugriff, leere Emote-DB | 5 Platzhalter-SVGs |
| **Proxy-Quellen** | Erster Proxy-Scraper-Zugriff, `sources.json` fehlt | Führt `seed-proxy-sources` aus |

### Empfohlene Reihenfolge

**Frische Dev-Installation (volles Demo):**

```bash
cp .env.example .env          # SEED_ADMIN_PASSWORD + SEED_VIP_PASSWORD setzen
npm install
npm run seed:auth
npm run seed:persona-db
npm run seed:proxy-sources
npm run seed:news             # optional — sonst nur 2 Auto-News beim ersten Start
npm run dev
```

**Produktion (Minimal):**

```bash
npm run build && npm start
# Auth-Seed automatisch bei leerer users.json
# seed:persona-db / seed:proxy-sources nur wenn Module gebraucht werden
# seed:news in Prod meist weglassen — eigene Inhalte über Admin → News
```

**Reset einzelner Module:**

| Ziel | Aktion |
|------|--------|
| Nur Auth zurücksetzen | `data/auth/users.json` löschen → Server neu starten oder `npm run seed:auth` |
| Nur News zurücksetzen | `news.json` löschen (2 Auto-Bulletins) **oder** `npm run seed:news` (40 Artikel) |
| Nur Proxy-Quellen | `sources.json` löschen → `npm run seed:proxy-sources` |
| Nur Persona-DB | `npm run seed:persona-db` |
| Nur Emotes | `data/chat/emotes.json` + `data/chat/emotes/files/` löschen |

---

## Sicherheit & Härtung (v3.36.x)

Das Projekt durchläuft regelmäßige **Extreme Deep Audits** (Server + Client). Changelog in der App unter **Changelog**-Tab oder in `src/data/changelog.ts`.

### Wichtige Sicherheitsmaßnahmen

| Thema | Verhalten |
|-------|-----------|
| **Rate Limits** | Auth, Admin, Paste, Chat, News, Games, Proxy, Analytics |
| **TRUST_PROXY** | Echte Client-IPs nur wenn Proxy-Hop in `TRUSTED_PROXY_IPS` |
| **Öffentliche URLs** | `resolvePublicOrigin` — kein blindes Vertrauen in `X-Forwarded-Host` |
| **Paste** | Kein `?password=` in URLs; private/geschützte Pastes → 404 für Fremde; Burn-Dedup |
| **View-Dedup** | Flag-first mit Rollback (Paste, Image, Post, Page, Vault) |
| **Achievements** | `matrix` / `self_destruct` nur via Terminal-Command; `claw_victim` via Event |
| **Avatare / Cover** | Server-Allowlist + Client `safeAvatarUrl` / `safeCoverStyle` |
| **Analytics** | `guestId` / `sessionId` serverseitig abgeleitet; `tab_visit` ohne Achievement-Spoof |
| **Registrierung** | Challenge + Signal-Registry; fail-closed bei unbekannter IP (Prod) |
| **Premium Vault** | AES-GCM mit `PREMIUM_VAULT_KEY`; Bulk-Import im Admin-Panel |

### Admin: Premium Account Vault

Im **Admin Dashboard → Vault**:

- Accounts anlegen, bearbeiten, löschen
- Bulk-Import (Text/CSV-Format)
- Freigabe / Ablehnung eingereichter Accounts
- View-Tracking mit Dedup

---

## Quick start (English)

```bash
git clone https://github.com/LULdev/lul-terminal.git
cd lul-terminal
npm install
cp .env.example .env   # edit for production
npm run dev            # http://localhost:3000
```

Production:

```bash
npm run lint && npm run build && npm start
```

Set `TRUST_PROXY=1`, `PREMIUM_VAULT_KEY`, and seed passwords before first production boot.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server + API (port 3000) |
| `npm run build` | Production frontend build → `dist/` |
| `npm start` | Express production server |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm run preview` | Preview production build |
| `npm run seed:auth` | Seed admin + VIP + bot if `users.json` empty |
| `npm run seed:persona-db` | Write 250 persona addresses → `entries.json` |
| `npm run seed:proxy-sources` | Write ~146 proxy list URLs → `sources.json` |
| `npm run seed:news` | Overwrite LUL Wire feed with 40 demo articles |

---

## Environment variables

See [`.env.example`](.env.example) for the full template.

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default `3000`) |
| `NODE_ENV` | `production` enables Secure session cookies |
| `TRUST_PROXY` | `1` when behind reverse proxy |
| `TRUSTED_PROXY_IPS` | Comma-separated IPs allowed to set forwarded headers |
| `PUBLIC_BASE_URL` | Optional canonical origin for API share URLs |
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
- **Auth:** Cookie sessions (`HttpOnly`, `SameSite=Lax`), registration signal registry
- **Games:** 14 titles, coin escrow, matchmaking
- **Security libs:** `resolvePublicOrigin`, `safeMediaUrl`, `viewDedup`, `asyncMiddleware`, `jobPrune`

---

## Project structure

```
lul-terminal/
├── data/              # JSON stores (persist in production)
│   ├── auth/          # users.json, sessions.json, registration-registry.json
│   ├── chat/          # lobby, emotes
│   ├── feeds/         # news.json, post-views.json
│   ├── games/         # history, jackpot, state
│   ├── premium-accounts/
│   ├── proxy-scraper/ # sources.json (+ runtime state/results)
│   └── …
├── public/            # Static assets (favicon, memes catalog)
├── server/            # Express API + stores
│   ├── auth/          # Auth, achievements, safeMediaUrl
│   ├── resolvePublicOrigin.mjs
│   ├── asyncMiddleware.mjs
│   ├── viewDedup.mjs
│   └── …
├── src/               # React app
│   ├── components/    # Pages, admin panels, chat, paste, profile
│   ├── hooks/         # Stats, polling, useMountedLoad
│   ├── lib/           # API clients, safeAvatarUrl, safeHref, safeCoverStyle
│   └── data/          # Changelog, setup notes
├── scripts/           # Seed & maintenance scripts
├── dist/              # Build output (gitignored)
├── .env.example       # Environment template
└── vercel.json        # SPA rewrites for static deploy
```

---

## Admin setup notes

In der laufenden App: **Admin Dashboard → Setup Notes** — spiegelt Deployment-Hinweise aus dieser README (TRUST_PROXY, Secrets, `data/`-Persistenz, Install-Checkliste).

---

## GitHub / deployment

| Ziel | Hinweis |
|------|---------|
| **Self-hosted VPS** | `npm run build && npm start` + nginx + `TRUST_PROXY=1` + `PUBLIC_BASE_URL` |
| **Docker** | Mount `data/`, set env from `.env.example` |
| **Vercel (static only)** | `vercel.json` rewrites SPA routes; **API requires Node server** — use VPS or split frontend/API |

### Clone & contribute

```bash
git clone https://github.com/LULdev/lul-terminal.git
git checkout -b feature/my-change
npm run lint && npm run build
git commit -am "feat: …"
git push origin feature/my-change
```

Open a Pull Request against `main`.

### Releases

Version in `package.json`, `src/config/version.ts`, und Changelog-Eintrag in `src/data/changelog.ts` pflegen. Vor Push:

```bash
npm run lint && npm run build
```

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).