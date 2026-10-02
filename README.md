# VNO RADAR — live arrivals at Vilnius Airport

React + TypeScript PWA, Node/Express backend proxy, adaptive caching, Web Push. Works out of the box in **demo mode** (synthetic flights); add an API key for real data.

```bash
npm install
cp .env.example .env        # optional: set AVIATION_API_KEY (AirLabs) for real flights
npm run dev                 # web http://localhost:5173 , api :8787
```
Production: `npm run build && npm start` (Express serves `dist/` + API on `$PORT`).

## Real data
1. Create a key at <https://airlabs.co> → `AVIATION_API_KEY=...` in `.env` (server only).
2. Set `API_MONTHLY_BUDGET` to your plan (free = 1000). The backend slows its refresh rate automatically to stay inside it.
3. Read `docs/API_ANALYSIS.md` for limits (free tier is demo-only; check commercial terms).

## On an iPhone
Service workers, install and Web Push need **HTTPS**. Quick test: `cloudflared tunnel --url http://localhost:8787` (after `npm run build && npm start`), open the https URL in Safari → Share → *Add to Home Screen* → open from the Home Screen → follow a flight → allow notifications (iOS 16.4+).

## Deploy
Needs a long-running Node process (the notifier runs every 30 s) → Railway / Render / Fly. Set env from `.env.example`, `npm run vapid` for VAPID keys, add Redis (`REDIS_URL`) and a persistent volume for `DATA_DIR` (or move `Store` to Postgres). Static-only hosts (Vercel/Cloudflare Pages) can serve the frontend, with the API deployed separately.

## Docs
`docs/API_ANALYSIS.md` · `docs/ARCHITECTURE.md`

## Not in MVP (architecture is ready)
Other airports (parametrise `AIRPORT`), Postgres store, FlightAware provider, Telegram/email alerts, widgets.
