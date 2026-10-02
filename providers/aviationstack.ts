import type { Cache } from '../cache.js';
import type { Flight, Position, ProviderStatus } from '../../shared/types.js';
import { AIRCRAFT, AIRLINES, place } from '../data/lookup.js';
import { ProviderError, type FlightProvider } from './types.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

const str = (s: unknown): string | null => (s === null || s === undefined || s === '' ? null : String(s));

/**
 * Aviationstack returns times like "2026-10-02T19:35:00+00:00" where the wall clock is the AIRPORT's
 * local time even though the offset says +00:00 (documented quirk). With AVIATIONSTACK_LOCAL_TIMES=false
 * the offset is trusted instead. Verify against a known flight on first run.
 */
function wallToUtc(wall: string, tz: string): number {
  const [d, t] = wall.slice(0, 19).split('T');
  const [y, mo, da] = d.split('-').map(Number);
  const [h, mi, s] = t.split(':').map(Number);
  const asUtc = Date.UTC(y, mo - 1, da, h, mi, s || 0);
  const offsetAt = (ms: number) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(ms).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
  };
  let guess = asUtc - offsetAt(asUtc);
  guess = asUtc - offsetAt(guess);
  return guess;
}

export class AviationStackProvider implements FlightProvider {
  readonly name = 'aviationstack';
  readonly demo = false;
  readonly callsPerRefresh = 1; // live positions come inside the same response
  readonly inlinePositions = true;

  constructor(
    private apiKey: string,
    private cache: Cache,
    private monthlyBudget: number,
    private localTimes = process.env.AVIATIONSTACK_LOCAL_TIMES !== 'false',
    private base = process.env.AVIATIONSTACK_BASE_URL || 'https://api.aviationstack.com/v1',
  ) {}

  private monthKey() {
    const d = new Date();
    return `budget:aviationstack:${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
  }

  async minIntervalSec(): Promise<number> {
    const used = (await this.cache.get<number>(this.monthKey())) ?? 0;
    const now = new Date();
    const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
    const secLeft = Math.max(60, (end - now.getTime()) / 1000);
    return (secLeft / Math.max(1, this.monthlyBudget - used)) * this.callsPerRefresh;
  }

  private async call(params: Record<string, string>): Promise<Raw[]> {
    const used = await this.cache.incr(this.monthKey(), 40 * 86400);
    if (used > this.monthlyBudget) throw new ProviderError(`Monthly API budget (${this.monthlyBudget}) exhausted`);
    const qs = new URLSearchParams({ ...params, access_key: this.apiKey, limit: '100' });
    const res = await fetch(`${this.base}/flights?${qs}`, { signal: AbortSignal.timeout(12_000) });
    const json = (await res.json().catch(() => ({}))) as { data?: Raw[]; error?: { code?: string; message?: string } };
    if (json.error) throw new ProviderError(`Aviationstack: ${json.error.code ?? ''} ${json.error.message ?? ''}`.trim());
    if (!res.ok) throw new ProviderError(`Aviationstack HTTP ${res.status}`);
    return json.data ?? [];
  }

  private time(v: unknown, tz: string | null): string | null {
    const s = str(v);
    if (!s) return null;
    const ms = this.localTimes && tz ? wallToUtc(s, tz) : new Date(s).getTime();
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }

  private map(r: Raw, direction: 'arrival' | 'departure'): Flight | null {
    if (r.flight?.codeshared) return null; // codeshare duplicates of the operating flight
    const flightIata = str(r.flight?.iata)?.toUpperCase() ?? (r.airline?.iata && r.flight?.number ? `${r.airline.iata}${r.flight.number}` : null);
    if (!flightIata || !/\d/.test(flightIata)) return null; // feed sometimes has bare airline codes without a flight number
    const arr = direction === 'arrival';
    const here = r[arr ? 'arrival' : 'departure'] ?? {};
    const there = r[arr ? 'departure' : 'arrival'] ?? {};
    const tzHere = str(here.timezone);
    const tzThere = str(there.timezone);
    const sched = this.time(here.scheduled, tzHere);
    const est = this.time(here.estimated, tzHere);
    const act = this.time(here.actual, tzHere) ?? this.time(here.actual_runway, tzHere);

    const raw = String(r.flight_status ?? '');
    const providerStatus: ProviderStatus =
      raw === 'scheduled' || raw === 'active' || raw === 'landed' || raw === 'cancelled' || raw === 'diverted' ? raw : 'unknown';

    const live = r.live;
    const position: Position | null = live && typeof live.latitude === 'number' && typeof live.longitude === 'number' && !live.is_ground
      ? {
          flightIata, reg: str(r.aircraft?.registration), aircraftIcao: str(r.aircraft?.icao),
          lat: live.latitude, lon: live.longitude,
          altM: typeof live.altitude === 'number' ? live.altitude : null,
          speedKmh: typeof live.speed_horizontal === 'number' ? live.speed_horizontal : null,
          heading: typeof live.direction === 'number' ? live.direction : null,
          vspeedMs: typeof live.speed_vertical === 'number' ? live.speed_vertical : null,
          updated: str(live.updated) ? new Date(live.updated).toISOString() : null,
        }
      : null;
    const icao = str(r.aircraft?.icao);
    const reg = str(r.aircraft?.registration);
    const airlineIata = str(r.airline?.iata) ?? flightIata.slice(0, 2);

    return {
      id: `${flightIata}-${Math.floor(new Date(sched ?? Date.now()).getTime() / 1000)}`,
      flightIata,
      direction,
      airline: { iata: airlineIata, name: str(r.airline?.name) ?? AIRLINES[airlineIata] ?? null },
      origin: place(r.departure?.iata),
      destination: place(r.arrival?.iata),
      scheduled: sched,
      estimated: est,
      actual: act,
      delayMin: typeof here.delay === 'number' ? here.delay : null,
      providerStatus,
      status: 'unknown',
      terminal: str(here.terminal),
      gate: str(here.gate),
      baggage: arr ? str(here.baggage) : null,
      aircraft: icao || reg ? { icao, name: icao ? AIRCRAFT[icao] ?? null : null, reg } : null,
      position,
      counterpart: { scheduled: this.time(there.scheduled, tzThere), estimated: this.time(there.estimated, tzThere), actual: this.time(there.actual, tzThere) },
    };
  }

  async getArrivals(iata: string) {
    return (await this.call({ arr_iata: iata })).map((r) => this.map(r, 'arrival')).filter((f): f is Flight => !!f);
  }
  async getDepartures(iata: string) {
    return (await this.call({ dep_iata: iata })).map((r) => this.map(r, 'departure')).filter((f): f is Flight => !!f);
  }
  async getFlight(flightIata: string) {
    const r = (await this.call({ flight_iata: flightIata }))[0];
    return r ? this.map(r, r.arrival?.iata === 'VNO' ? 'arrival' : 'departure') : null;
  }
  async getAircraft(reg: string): Promise<Position | null> {
    const r = (await this.call({ flight_status: 'active' })).find((x) => x.aircraft?.registration === reg);
    return r ? this.map(r, 'arrival')?.position ?? null : null;
  }
}
