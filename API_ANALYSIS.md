# STEP 1 — Aviation API analysis (checked 2026-10-02)

Figures marked ✔ were read from the vendors' public pages/docs on that date; **prices and limits change — re-verify before committing**.
Items marked ? could not be confirmed from public docs and must be tested with a trial key.

| API | Free tier | Update freshness | Airport arrivals (VNO) | Aircraft type / reg | Live position | Delay / est. / actual | Gate / terminal / baggage | Price |
|---|---|---|---|---|---|---|---|---|
| **AirLabs** | ✔ 1,000 calls/mo, no card | "live" schedules; exact interval not published | ✔ `/schedules?arr_iata=VNO` (≤10 h ahead) | reg + ICAO type only via `/flights`, `/flight` (not in `/schedules`) | ✔ `/flights` (lat/lng/alt/dir/speed/v_speed) | ✔ `arr_delayed`, `arr_estimated`, `arr_actual`, status scheduled/active/landed/cancelled | ✔ `arr_terminal`, `arr_gate`, `arr_baggage` (filled only when the airport/airline feeds them) | $49 (25k) · $99 (100k) · $499 (1M) |
| Aviationstack | ✔ 100 req/mo, **non-commercial only**, HTTPS | ✔ "delayed 30–60 s" | ✔ `flights?arr_iata=VNO` | partial | limited | ✔ delay, estimated, actual | ✔ terminal/gate/baggage fields exist ? coverage | $49.99 (10k) · $149.99 (50k) |
| Aviation Edge | ✘ no free plan | real-time timetable | ✔ airport timetable | ✔ | ✔ separate endpoint | ✔ | ✔ | from ~$299/mo ✔ |
| FlightAware AeroAPI | ✔ Personal: ≤$5 usage/mo, 10 result-sets/min, **not for commercial use** ? | best-in-class (ADS-B + FA data) | ✔ `/airports/EYVI/flights/arrivals` | ✔ | ✔ | ✔ `estimated_in`, `actual_in` | ✔ ? | Standard $100/mo minimum, per-result-set metering; Premium $1,000/mo |
| FlightRadar24 API | ✘ | very fast | ✔ | ✔ | ✔ | ✔ | ? | paid subscription, enterprise-style |
| FlightLabs | ? trial | ? | ✔ | ? | ✔ | ? | ? | paid |
| OpenSky Network | ✔ anonymous ~400 credits/day, free for research / non-commercial | state vectors 5–10 s | ✘ no schedules (only ADS-B arrivals by ICAO24, delayed) | ✘ type from DB only | ✔ best free source | ✘ | ✘ | free (commercial use needs agreement) |

## Verdict
* **MVP primary: AirLabs.** It is the cheapest source that returns *everything the home screen needs for VNO* in one call (scheduled / estimated / actual, delay, terminal, gate, baggage) and gives live positions + registration in a second endpoint.
* **Map fallback:** OpenSky (`server/providers/opensky.ts`) — positions only.
* **Upgrade path if accuracy matters most:** FlightAware AeroAPI (implement `FlightAwareProvider` behind the same interface).
* The free AirLabs tier is **demo-only**: 1,000 calls/month ≈ 33/day. For real use take the $49 plan (25k ≈ 830 calls/day ≈ one arrivals+positions refresh every ~3.5 min around the clock; we spend faster only when a plane is about to land).
* **Commercial use:** Aviationstack free and FlightAware Personal are non-commercial. AirLabs' terms for the free tier must be confirmed with them before launching publicly.

## What the data can and cannot give (honest limits)
| Wanted | Reality |
|---|---|
| Actual landing time | `arr_actual` appears only after the provider ingests the event — expect a lag (tens of seconds to minutes). The app labels "Landed" without inventing a time when it's absent. |
| Gate / baggage belt | Often **null**, especially for small low-cost carriers and before ~30 min to arrival. UI shows "Not available". |
| Aircraft type | Not in `/schedules`; filled from `/flights` only while the plane is airborne and tracked. |
| "Approaching" | Derived by us: airborne and (ETA < 10 min or < 60 km from VNO). Not a provider status. |
| Diverted | AirLabs does not publish a diverted status in `/schedules`; supported in the model, shown only if a provider supplies it. |
| ETA accuracy | `arr_estimated` is only as good as the airline/ADS-B feed; the free feed may lack it → we fall back to scheduled time. |
| Passenger exit time | **Unknowable.** 20/40-min reminders are generic estimates and are worded that way. |
| Latency to the phone | provider lag + our TTL (45 s near landing, 2 min within 2 h, 5 min otherwise) + 30 s client poll. |
