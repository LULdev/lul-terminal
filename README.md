# LUL Terminal

Community arcade, profiles, tools, and terminal hub — built with React, Vite, and Express.

## Prerequisites

- Node.js 18+

## Run locally

```bash
npm install
npm run dev
```

The dev server starts on [http://localhost:3000](http://localhost:3000) with API middleware via the Vite image-host plugin.

## Build

```bash
npm run build
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm start` | Run production server (`node server/start.mjs`) |
| `npm run preview` | Preview production build |
| `npm run seed:proxy-sources` | Seed proxy source data |
| `npm run seed:persona-db` | Seed persona database |

## Stack

- **Frontend:** React 19, Vite, Tailwind CSS
- **Backend:** Express (`server/start.mjs`)
- **Auth & games:** Session-based auth with arcade escrow (14 multiplayer games)

## Environment

| Variable | Description |
|----------|-------------|
| `SEED_ADMIN_PASSWORD` | Initial admin password on empty DB (optional) |
| `SEED_VIP_PASSWORD` | Initial VIP password on empty DB (optional) |
| `NODE_ENV=production` | Enables `Secure` session cookies |