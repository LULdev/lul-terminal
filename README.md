# LUL Terminal

[![Version](https://img.shields.io/badge/version-3.46.0-blue)](package.json)
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
| `ALLOWED_PUBLIC_HOSTS` | Ja (Prod + Proxy) | Komma-getrennte Hosts für `X-Forwarded-Host` (wenn kein `PUBLIC_BASE_URL`) |
| `SEED_ADMIN_PASSWORD` | Ja (leere DB) | Passwort für ersten `admin`-Account |
| `SEED_VIP_PASSWORD` | Ja (leere DB) | Passwort für `vipdemo` |
| `PREMIUM_VAULT_KEY` | Ja | AES-Verschlüsselung Premium-Vault |
| `PORT` | Nein | Standard: `3000` |
| `RATE_LIMIT_BACKEND` | Nein | `auto` \| `memory` \| `file` \| `redis` — siehe [Rate Limits](#rate-limits--multi-process) |
| `RATE_LIMIT_SHARED` | Nein | `1` = File-Backend für mehrere Node-Prozesse auf demselben Host |
| `REDIS_URL` | Empfohlen (Multi-Instance) | Redis-Verbindungs-URL — siehe [Redis-Anleitung](#redis-anleitung-redis_url) |
| `GUEST_VIEW_DEDUP_BACKEND` | Nein | `auto` \| `file` \| `redis` — Guest-View-Dedup (auto: Redis wenn `REDIS_URL`) |
| `GUEST_VIEW_DEDUP_FAIL_OPEN` | Nein | `1` (Standard) = bei Store-Fehler View zählen; `0` = fail-closed |

> **Wichtig hinter Reverse-Proxy:** Ohne `TRUST_PROXY=1` greifen Rate-Limits auf die Proxy-IP statt auf die echte Client-IP. `X-Forwarded-Host` wird nur akzeptiert wenn der Host in `ALLOWED_PUBLIC_HOSTS` oder `PUBLIC_BASE_URL` steht — sonst Fallback auf `Host` (Phishing-Schutz für Share-Links).

> **Multi-Process / Cluster:** In `NODE_ENV=production` nutzt `RATE_LIMIT_BACKEND=auto` standardmäßig das **File-Backend** (PM2-tauglich). Für **mehrere Server** hinter einem Load Balancer: `REDIS_URL` setzen (Rate-Limits + Guest-View-Dedup).

### Schritt 3b — Redis einrichten (optional)

Nur nötig wenn du **mehrere App-Instanzen** betreibst (Load Balancer, Kubernetes, mehrere VPS). Ein einzelner `npm start`-Prozess braucht kein Redis.

**Kurz:** Redis installieren/starten → `REDIS_URL` in `.env` → App neu starten. Details: [Redis-Anleitung](#redis-anleitung-redis_url).

```env
# .env — lokaler Redis (Standard-Port)
REDIS_URL=redis://127.0.0.1:6379
```

Nach dem Start erscheint in der Server-Konsole u. a. `[redis] shared client connected`. Rate-Limits und Guest-View-Dedup nutzen dann automatisch Redis (`RATE_LIMIT_BACKEND=auto`, `GUEST_VIEW_DEDUP_BACKEND=auto`).

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
# Optional — nur bei mehreren App-Instanzen hinter Load Balancer:
REDIS_URL=redis://127.0.0.1:6379
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

Das Projekt durchläuft regelmäßige **Extreme Deep Audits** (Server + Client). Aktuelle Version: **3.46.0**. Changelog in der App unter **Changelog**-Tab oder in `src/data/changelog.ts`.

### Letzte 10 Audit-Runden (Kurzüberblick)

| Version | Runde | Schwerpunkte |
|---------|-------|--------------|
| **3.45.0** | 45 | Orphan escrow refund, burn-after-read GET fix, /i/ deep-link auth parity |
| **3.44.0** | 44 | Paste deep-link views+auth, ban arcade cleanup, reg challenge timing, email step-up |
| **3.43.0** | 43 | Arcade cleanup on 401, password step-up, meme notify session bus, admin paste stats |
| **3.42.0** | 42 | Login gate preservation, guest shoutbox stale cookie, arcade waiting logout, soft401 parity |
| **3.41.0** | 41 | Paste burn atomicity, session race guards, login session revoke, arcade queue/orphan fixes |
| **3.40.0** | 40 | Shoutbox guest read, paste deadlock, escrow logout parity, chat 401 refresh |
| **3.39.0** | 39 | Queue heartbeatAt, logout arcade cleanup, analytics proof remint |
| **3.38.1** | Sweep | Burn-after-read viewer, paste rating NaN guard, games auth gate |
| **3.38.0** | 38 | Session-bus soft-401, emote SVG sanitize, registration challenge caps |
| **3.37.0** | 37 | invalidateSession single-flight, guest analytics scope, view ID validation |
| **3.36.99** | Hardening | Redis/file rate limits, guest dedup Redis, delete password confirm |
| **3.36.98** | 36 | Analytics ordering, tab_visit ok:false rollback, view session keys |
| **3.36.97** | 35 | Tab ref integrity, image upload cap, guest dedup TOCTOU |
| **3.36.96** | 34 | profileTabReadyTick proof gate, shoutbox gated poll, view inflight coalesce |

> **Round 45 Hinweis:** Orphan-Escrow-Refund nach Logout/Ban/Delete/Deactivate; Burn-after-read nur via POST `/view` oder `/unlock`; `/i/:id` Deep-Links nutzen Session-Cookie + AuthModal wie `/p/:id`.

> **Round 44 Hinweis:** `/p/:id` Deep-Links zählen Views und öffnen AuthModal; Registrierungs-Bot-Gate nutzt Challenge-`issuedAt` (nicht forgeable `firstVisitAt`); `/ban` räumt Arcade-Queues + Escrow auf; E-Mail-Änderung erfordert `currentPassword`.

> **Round 43 Hinweis:** Passwortänderung erfordert `currentPassword`; passive Session-Invalidierung triggert Arcade-Queue-Cleanup; Stale-Cookie-Shoutbox-Read invalidiert Session sauber.

> **Round 42 Hinweis:** `/me` nutzt soft-401 (kein Login-Gate-Wipe bei Tab-Fokus); Gäste mit abgelaufenem Session-Cookie können Shoutbox weiter lesen (Retry ohne Credentials).

### Wichtige Sicherheitsmaßnahmen

| Thema | Verhalten |
|-------|-----------|
| **Rate Limits** | Auth, Admin, Paste, Chat, News, Games, Proxy, Analytics — Backends: memory / file / Redis |
| **TRUST_PROXY** | Echte Client-IPs nur wenn Proxy-Hop in `TRUSTED_PROXY_IPS` |
| **Öffentliche URLs** | `resolvePublicOrigin` — kein blindes Vertrauen in `X-Forwarded-Host` |
| **Paste** | Kein `?password=` in URLs; private/geschützte Pastes → 404 für Fremde; Burn-Dedup; max. 512 KB |
| **View-Dedup** | Flag-first mit Rollback (Paste, Image, Post, Page, Vault, Profile) |
| **Guest View-Dedup** | Anonyme Paste/Image-Views pro IP+Resource; **Prod default fail-closed** (`GUEST_VIEW_DEDUP_FAIL_OPEN=0`) |
| **Login** | Neue Session widerruft alle älteren Sessions desselben Users (Single active session) |
| **Passwort ändern** | Server verlangt `currentPassword` bei Profil-Passwort-Update |
| **Shoutbox** | Gäste können lesen (30s Poll); Logout leert lokale Messages sofort |
| **Achievements** | Server-minted Proof (120s TTL, Single-Slot); Tab-Integrity-Kette |
| **Avatare / Cover** | Server-Allowlist + 2 MB Cap + Magic-Bytes; Client `imageMime.ts` pre-check |
| **Account löschen** | Passwort-Bestätigung serverseitig (`verifyPassword`) + UI-Prompt |
| **Analytics** | Gäste nur `session_start`; Members `tab_visit`/`tab_dwell`; `login`/`logout` server-only; denied tab → `ok:false` |
| **Session-Bus** | `invalidateSession` single-flight; Analytics/Public-Views soft-401 (kein Logout-Storm) |
| **View-IDs** | Post-Views: News-Artikel + Changelog-Version validiert; Page-Views: nur `ALL_MANAGEABLE_TAB_IDS` |
| **Chat / Shoutbox** | **Immer Login + `assertCanChat`** — auch wenn Fun-Tab öffentlich ist |
| **Registrierung** | Challenge + Signal-Registry; fail-closed bei unbekannter IP (Prod) |
| **Premium Vault** | AES-GCM at rest; passwords via POST `/reveal` only (not in list JSON); server-side export endpoint |

### Redis-Anleitung (`REDIS_URL`)

`REDIS_URL` verbindet LUL Terminal mit einem Redis-Server. **Eine URL** aktiviert zwei Features:

| Feature | Redis-Keys (Beispiel) | Ohne Redis |
|---------|----------------------|------------|
| **Rate Limits** | `rl:login:1.2.3.4`, `rl:analytics:…` | memory / file (`RATE_LIMIT_SHARED=1`) |
| **Guest View Dedup** | `gv:paste:1.2.3.4:abc123` | `data/analytics/guest-views.json` |

#### URL-Formate

| Szenario | `REDIS_URL` Beispiel |
|----------|----------------------|
| Lokal (Dev/Prod auf gleichem Host) | `redis://127.0.0.1:6379` |
| Passwort (Redis 6+ ACL / `requirepass`) | `redis://:mein-passwort@127.0.0.1:6379` |
| Benutzer + Passwort | `redis://benutzer:passwort@redis.example.com:6379` |
| Andere DB-Nummer (Standard: 0) | `redis://127.0.0.1:6379/1` |
| TLS (Redis Cloud, Upstash, etc.) | `rediss://default:token@host.upstash.io:6379` |

> **`redis://`** = unverschlüsselt (typisch localhost/VPC). **`rediss://`** = TLS — bei Managed-Redis in der Cloud meist Pflicht.

#### Schritt-für-Schritt (Linux / VPS)

**1. Redis installieren**

```bash
# Debian / Ubuntu
sudo apt update && sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

**2. Erreichbarkeit prüfen**

```bash
redis-cli ping
# Erwartete Antwort: PONG
```

**3. `.env` setzen**

```env
REDIS_URL=redis://127.0.0.1:6379
# Optional explizit (auto ist Standard):
# RATE_LIMIT_BACKEND=redis
# GUEST_VIEW_DEDUP_BACKEND=redis
```

**4. App starten**

```bash
npm run build && npm start
```

In der Konsole: `[redis] shared client connected` und `[rate-limit] Redis backend active` (bzw. Redis als Backend über `auto`).

**5. Verifizieren**

- Mehrfach schnell einloggen → Rate-Limit greift app-übergreifend (gleiche IP).
- Zwei Worker/Instanzen: Guest-Paste-View zählt nur einmal pro IP (Dedup über Redis).

#### Schritt-für-Schritt (Windows / Dev)

**Option A — Docker (empfohlen)**

```bash
docker run -d --name lul-redis -p 6379:6379 redis:7-alpine
```

In `.env`:

```env
REDIS_URL=redis://127.0.0.1:6379
```

**Option B — WSL2**

Redis in WSL installieren (`sudo apt install redis-server`), `REDIS_URL=redis://127.0.0.1:6379` — von Windows-Node aus erreichbar, wenn Redis auf `0.0.0.0` oder WSL-IP lauscht.

#### Docker Compose (App + Redis)

```yaml
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
  app:
    build: .
    restart: unless-stopped
    environment:
      NODE_ENV: production
      TRUST_PROXY: "1"
      REDIS_URL: redis://redis:6379
      PREMIUM_VAULT_KEY: ${PREMIUM_VAULT_KEY}
      SEED_ADMIN_PASSWORD: ${SEED_ADMIN_PASSWORD}
      SEED_VIP_PASSWORD: ${SEED_VIP_PASSWORD}
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    depends_on:
      - redis
volumes:
  redis-data:
```

#### Wann Redis, wann File?

| Setup | Empfehlung |
|-------|------------|
| 1× `npm start` / 1× PM2-Worker | Kein Redis nötig |
| PM2-Cluster, **ein** Server, gemeinsames `data/` | `RATE_LIMIT_SHARED=1` (File + Lock) |
| 2+ Server / Pods hinter Load Balancer | **`REDIS_URL` Pflicht** |
| Managed Redis (Upstash, Redis Cloud, ElastiCache) | `rediss://…` aus Provider-Dashboard kopieren |

#### Fehlerbehebung

| Symptom | Lösung |
|---------|--------|
| `[redis] unavailable` in Logs | Redis läuft nicht / falsche URL / Firewall |
| Rate-Limits wirken pro Instanz unterschiedlich | `REDIS_URL` fehlt oder Instanzen nutzen verschiedene Redis-DBs |
| `NOAUTH Authentication required` | Passwort in URL: `redis://:passwort@host:6379` |
| TLS-Fehler bei Cloud-Redis | `rediss://` statt `redis://` verwenden |

Redis-Daten (Rate-Limit-Keys, Guest-Dedup) sind **ephemeral** — kein Backup nötig für App-Betrieb. `data/` (Nutzer, Uploads) bleibt weiterhin auf dem Dateisystem.

---

### Rate Limits & Multi-Process

`server/rateLimitStore.mjs` wählt das Backend automatisch:

| Backend | Wann | Env |
|---------|------|-----|
| **memory** | Standard (ein Prozess) | — |
| **file** | Mehrere Node-Prozesse, gleicher Host | `RATE_LIMIT_SHARED=1` |
| **redis** | Multi-Instance / Cluster | `REDIS_URL=redis://…` |
| **explizit** | Override | `RATE_LIMIT_BACKEND=memory\|file\|redis` |

Priorität bei `auto`: Redis wenn `REDIS_URL` gesetzt, sonst File wenn `RATE_LIMIT_SHARED=1` **oder** `NODE_ENV=production`, sonst Memory.

**File-Backend (v3.36.99+):** Cross-Process-Lock unter `data/locks/` serialisiert RMW auf `buckets.json` — kein Lost-Update mehr bei PM2-Cluster auf einem Host.

**Redis-Backend:** Atomisches `INCR` + `PEXPIRE` per Lua-Script (kein TTL-Leak-Fenster).

```env
# Ein VPS, PM2 mit 4 Workern — kein Redis nötig:
RATE_LIMIT_SHARED=1

# Zwei+ Server hinter Load Balancer — Redis Pflicht:
REDIS_URL=redis://127.0.0.1:6379
# oder mit Passwort:
# REDIS_URL=redis://:geheim@127.0.0.1:6379
# oder Cloud (TLS):
# REDIS_URL=rediss://default:token@eu1-example.upstash.io:6379
```

### Chat & Shoutbox (Wichtig)

- **Lesen** der Shoutbox + Emotes ist für Gäste offen (Rate-Limits); **Schreiben** erfordert Login + `assertCanChat`.
- Abgelaufene Session-Cookies liefern **401** (kein stilles Guest-Fallback) — Client refresht Session.
- Terminal-Shoutbox pollt wenn Panel expandiert: Gäste **30s**, Mitglieder **4s**.
- Bei `gated` (403): schneller Poll stoppt; **60s Recovery-Poll** + Probe bei Tab-Visibility.
- Chat-Cooldown wird bei fehlgeschlagenem Message-Write **zurückgerollt** (`rollbackChatRateLimit`).
- Nachrichten max. **280 Zeichen** (Client + Server).

### Profile Views & Tab-Integrity

| Regel | Detail |
|-------|--------|
| **Nur eingeloggt** | Gäste sehen Profile, erhöhen aber keine `profileViews` |
| **Profile-Tab** | Server prüft `session.analyticsLastTab === 'profile'` |
| **Dwell-Gate** | Mind. **2s** seit letztem `tab_visit` auf Profile-Tab |
| **Burst-Cap** | Max. **5** unique credited Views pro Profile-Tab-Stint (`profileViewCreditsUsed`) |
| **Client-Sync** | `profileTabReadyTick` wartet auf erfolgreichen `tab_visit` vor POST `/view` |
| **Dedup** | Session-Dedup bei jedem erfolgreichen POST (auch `credited: false` / `deduped: true`); inflight-Coalescing |
| **Soft-401** | Profile-View-POST nutzt plain `fetch` — 401 erzwingt kein globales Logout |
| **Username-Wechsel** | In-Tab `@user`-Wechsel resettet `profileTabReadyTick` und erzwingt neuen `tab_visit` |

### Achievement Proof (Anti-Farm)

1. `tab_visit` / `faq_visit` mintet serverseitig einen **Proof** (Nonce + Tab + 120s TTL).
2. Client spiegelt Single-Slot (`achievementProof.ts`).
3. Terminal-Commands (`matrix`, `self-destruct`) und `claw_victim` **verbrauchen** Proof via `takeAchievementProof`.
4. Bei Fehler: **Remint** (kein Proof-Verlust durch blindes Clear).
5. **Tab-Dwell-Kette:** Tab-Wechsel braucht ≥2s Dwell auf vorherigem Tab (`analyticsDwellReady`).
6. **Atomischer Claim:** `tryClaimTabVisitCredit` unter `withSessionsWrite` — parallele `tab_visit`-Farms blockiert.
7. Gleicher Tab erneut: kein Aggregate-Spam (Event nur bei erfolgreichem Claim).

### Guest View Dedup

Anonyme Views auf Paste/Image werden in `data/analytics/guest-views.json` dedupliziert (Scope + IP + Resource-ID, 90-Tage-Prune).

| `GUEST_VIEW_DEDUP_FAIL_OPEN` | Verhalten bei Persist-Fehler |
|------------------------------|------------------------------|
| `1` (Standard) | View zählen (fail-open — kein Under-Count) |
| `0` | View nicht zählen (fail-closed) |

Paste- und Image-**Owner-Self-Views** zählen nicht (Dedup wie bei Image Host seit v3.36.98).

| Backend | Wann | Env |
|---------|------|-----|
| **file** | Ein Host, mehrere Worker (Cross-Process-Lock) | Standard ohne `REDIS_URL` |
| **redis** | Multi-Instance / Load Balancer | `REDIS_URL` oder `GUEST_VIEW_DEDUP_BACKEND=redis` |

Redis nutzt `SET gv:{scope}:{ip}:{id} NX EX` (90-Tage-TTL). File-Mode lädt `guest-views.json` pro Claim unter Lock neu.

### Analytics-Integrität

- Client-`track` für `profile_view`, `command_run`, `login` und `logout` wird **abgelehnt** — nur Server schreibt diese Events.
- `login` / `logout` / `session_start` (nach Login) werden in `authApi.mjs` beim Login/Logout persistiert.
- `profile_view` bei credited `incrementProfileView`; `command_run` bei `recordTerminalCommand`.
- Gäste: `session_start` weiterhin clientseitig (einmal pro Mount); kein `tab_dwell` persistiert.
- `tab_dwell` nur wenn `session.analyticsLastTab` passt und ≥2s Dwell seit `tab_visit`.
- Abgelehnte/gated `tab_visit`/`tab_dwell`: API antwortet `ok:false` (Client aktualisiert Tab-Refs nicht).
- `recordEvent` vor `recordTabVisitFromAnalytics` — kein orphan User-Activity bei Event-Fehler.

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
| `RATE_LIMIT_BACKEND` | `auto` (default), `memory`, `file`, or `redis` |
| `RATE_LIMIT_SHARED` | `1` — file-backed rate limits for multi-process same host |
| `REDIS_URL` | Redis URL — `redis://127.0.0.1:6379` (local), `redis://:pass@host:6379` (auth), `rediss://…` (TLS). Enables shared rate limits + guest view dedup. See [Redis-Anleitung](#redis-anleitung-redis_url). |
| `GUEST_VIEW_DEDUP_BACKEND` | `auto` (default), `file`, or `redis` for anonymous view dedup |
| `GUEST_VIEW_DEDUP_FAIL_OPEN` | `1` (default) fail-open on dedup store errors; `0` fail-closed |
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
- **Security libs:** `resolvePublicOrigin`, `safeMediaUrl`, `viewDedup`, `rateLimitStore`, `analyticsTabIntegrity`, `tabAccessGuard`, `asyncMiddleware`, `jobPrune`

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
│   ├── analytics/     # guest-views.json (runtime, gitignored)
│   └── rate-limits/   # buckets.json (RATE_LIMIT_SHARED)
├── public/            # Static assets (favicon, memes catalog)
├── server/            # Express API + stores
│   ├── auth/          # Auth, achievements, safeMediaUrl
│   ├── resolvePublicOrigin.mjs
│   ├── asyncMiddleware.mjs
│   ├── viewDedup.mjs
│   ├── rateLimitStore.mjs
│   ├── analyticsTabIntegrity.mjs
│   ├── tabAccessGuard.mjs
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
| **PM2 / Cluster (1 Host)** | `RATE_LIMIT_SHARED=1` + `data/` persistent mounten |
| **Multi-Instance / LB** | `REDIS_URL=redis://…` — Rate-Limits + Guest-Dedup (siehe [Redis-Anleitung](#redis-anleitung-redis_url)) |
| **Docker** | Mount `data/`, set env from `.env.example` |
| **Vercel (static only)** | `vercel.json` rewrites SPA routes; **API requires Node server** — use VPS or split frontend/API |

### Produktions-Checkliste

- [ ] `NODE_ENV=production`
- [ ] `TRUST_PROXY=1` + `TRUSTED_PROXY_IPS` (hinter Proxy)
- [ ] `PREMIUM_VAULT_KEY`, `SEED_*`-Passwörter gesetzt
- [ ] `PUBLIC_BASE_URL` = kanonische HTTPS-URL
- [ ] `data/` persistent (Backup, Volume)
- [ ] Multi-Process (1 Host): `RATE_LIMIT_SHARED=1` **oder** Multi-Instance (LB): `REDIS_URL=redis://127.0.0.1:6379` (siehe [Redis-Anleitung](#redis-anleitung-redis_url))
- [ ] `npm run lint && npm run build` vor Deploy
- [ ] `data/analytics/guest-views.json` nicht committen (Runtime)

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