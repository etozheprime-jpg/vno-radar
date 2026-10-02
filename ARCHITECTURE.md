# STEPS 2–6 — Architecture

```
iPhone PWA ──poll 30s──▶ Express API ──▶ Cache (Redis | memory) ──▶ FlightProvider ──▶ AirLabs / (OpenSky, FlightAware…)
     ▲                       │                 ▲
     └──── Web Push ◀── Notifier (30s tick) ───┘   Store (JSON → Postgres): subscriptions, follows
```

* **Frontend never sees the API key** and never talks to the provider. All phones share one cache entry (`arrivals`), protected by single-flight so N users ≙ 1 upstream call.
* **Stale-while-error:** if the provider fails or the monthly budget is exhausted, the last good snapshot is served with `stale: true`; the UI shows "temporarily unavailable · updated N min ago".
* **Budget governor** (`AirLabsProvider.minIntervalSec`): refresh interval = max(wanted TTL, seconds-left-in-month / calls-left × calls-per-refresh). The monthly cap (`API_MONTHLY_BUDGET`) is a hard stop.
* **TTL policy** (`FlightService.arrivalTtl`): 45 s if a flight is within −15…+30 min of ETA, 120 s within 2 h, else 300 s. Positions 60 s. Airport metadata is static (no call).
* **Countdown** is client-only (1 s tick against the last known ETA) — no network per second.
* **Provider abstraction:** `server/providers/types.ts` (`getArrivals/getDepartures/getFlight/getAircraft/getPositions`). Add a provider = one file + one line in `server/index.ts`. `MockProvider` makes the app fully runnable without a key and is labelled "demo" in the UI.

## Project layout
```
server/            Node/Express API
  providers/       airlabs.ts · mock.ts · opensky.ts · types.ts (FlightProvider)
  services/        flights.ts (cache, TTL, merge) · status.ts (status derivation) · notifier.ts · push.ts · store.ts · messages.ts
  data/            VNO metadata, airport/airline/aircraft dictionaries
shared/types.ts    Types shared by server and client
src/               React + TS PWA (Vite)
  pages/           Home · Board (search/filters/departures) · FlightPage · MapPage · Settings
  components/      Hero, FlightRow, StatusBadge, FollowSheet, UserLocation, Clock, Banner, TabBar …
  hooks/           AppContext (settings, polling, follows, offline), useNow, useGeo, useInstall, useRoute
  lib/             i18n, time/countdown, push, geo, api
  locales/         lt.json · ru.json · en.json
public/            manifest, sw.js (shell cache, offline, push), icons, iOS splash screens
scripts/           icons.mjs (SVG→PNG), vapid.mjs
```
UI uses hand-written CSS with design tokens instead of Tailwind to keep the bundle at ~106 kB gz; swapping to Tailwind is mechanical.

## Storage
| Data | MVP | Later |
|---|---|---|
| Flight snapshots, positions, API budget counter | Redis or in-memory (TTL) | same |
| Push subscriptions, followed flights + sent-notification flags | `data/store.json` | Postgres tables below |
| Language, theme, prefs, follows, last snapshot (offline) | `localStorage` on device | + synced settings |

Postgres schema for the next step (not required for MVP):
```sql
airports(iata pk, icao, name, city, lat, lon, tz);
airlines(iata pk, icao, name);
aircraft(reg pk, icao_type, airline_iata);
flights(id pk, flight_iata, airline_iata, dep_iata, arr_iata, sched_arr, est_arr, act_arr, status, terminal, gate, baggage, updated_at);
flight_events(id bigserial pk, flight_id fk, kind, payload jsonb, at timestamptz);   -- history, analytics
users(id pk, created_at);                                                              -- optional, only if accounts are added
notification_subscriptions(endpoint pk, user_id fk null, p256dh, auth, lang, created_at);
followed_flights(id pk, endpoint fk, flight_id, prefs jsonb, sent text[], landed_at, baseline jsonb);
settings(user_id fk, key, value jsonb);
```

## Notifications
1. Client: `Notification.requestPermission()` → `pushManager.subscribe(VAPID public key)` → `POST /api/notifications/subscribe`.
2. "Follow" → `POST /api/follow-flight {endpoint, flightId, prefs, lang}`.
3. `Notifier` (every 30 s, reads the *cached* arrivals) fires, once each (dedupe in `sent[]`): `pre3` (ETA−3 min), `landed`, `after20`, `after40` (relative to `actual` or first-seen "landed"), delay ≥10 min / cancelled / diverted, gate change, ETA shift ≥5 min. Stale catch-up guard: after20/40 are skipped if more than ~30 min late.
4. `sw.js` shows the notification and opens `/#/flight/<id>` on tap. 404/410 from the push service deletes the subscription.
5. **iOS:** Web Push works only on iOS/iPadOS 16.4+ **and only for a PWA added to the Home Screen**. The app detects this and explains instead of failing silently; following still works without push (in-app only).
6. Wording of the 20/40-minute messages is deliberately "should be / usually" — the app cannot see actual passengers.

## Security
Keys live only in server env. Input validated and size-limited; per-IP rate limit; push `endpoint` must be https. For MVP the push endpoint acts as the user's bearer id (no accounts); add auth before storing anything personal. GPS never leaves the device — only the derived distance is shown, and it isn't persisted.
