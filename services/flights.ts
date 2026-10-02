import type { Cache } from '../cache.js';
import type { Flight, FlightList, Position } from '../../shared/types.js';
import { AIRPORT } from '../data/airport.js';
import { AIRCRAFT } from '../data/lookup.js';
import type { FlightProvider } from '../providers/types.js';
import { etaMs, present } from './status.js';

interface Envelope<T> { value: T; fetchedAt: number; freshUntil: number }
interface Snap<T> { data: T; fetchedAt: number; stale: boolean; error?: string }

const BBOX: [number, number, number, number] = [53.4, 23.4, 55.8, 27.2];

export class FlightService {
  private inflight = new Map<string, Promise<Envelope<unknown>>>();

  constructor(public provider: FlightProvider, private cache: Cache) {}

  /** Stale-while-error cache with single-flight so N phones never cause N provider calls. */
  private async swr<T>(key: string, fetcher: () => Promise<T>, ttlOf: (v: T) => Promise<number> | number, force = false): Promise<Snap<T>> {
    const env = await this.cache.get<Envelope<T>>(key);
    const now = Date.now();
    if (env && !force && env.freshUntil > now) return { data: env.value, fetchedAt: env.fetchedAt, stale: false };
    try {
      let p = this.inflight.get(key) as Promise<Envelope<T>> | undefined;
      if (!p) {
        p = (async () => {
          const value = await fetcher();
          const ttl = await ttlOf(value);
          const e: Envelope<T> = { value, fetchedAt: Date.now(), freshUntil: Date.now() + ttl * 1000 };
          await this.cache.set(key, e, 6 * 3600);
          return e;
        })().finally(() => this.inflight.delete(key));
        this.inflight.set(key, p as Promise<Envelope<unknown>>);
      }
      const e = await p;
      return { data: e.value, fetchedAt: e.fetchedAt, stale: false };
    } catch (err) {
      const error = (err as Error).message;
      console.warn(`[flights] ${key} refresh failed:`, error);
      if (env) {
        // back off 30 s so a failing upstream isn't hammered
        await this.cache.set(key, { ...env, freshUntil: now + 30_000 }, 6 * 3600);
        return { data: env.value, fetchedAt: env.fetchedAt, stale: true, error };
      }
      throw err;
    }
  }

  /** 45 s when a flight is about to land, 2 min within 2 h, otherwise 5 min — never faster than the budget allows. */
  private async arrivalTtl(flights: Flight[]): Promise<number> {
    const now = Date.now();
    let want = 300;
    for (const f of flights) {
      if (f.actual || f.providerStatus === 'landed' || f.providerStatus === 'cancelled') continue;
      const eta = etaMs(f);
      if (eta === null) continue;
      const d = eta - now;
      if (d > -15 * 60_000 && d < 30 * 60_000) { want = Math.min(want, 45); break; }
      if (d > 0 && d < 2 * 3600_000) want = Math.min(want, 120);
    }
    const floor = (await this.provider.minIntervalSec?.()) ?? 0;
    return Math.max(want, floor);
  }

  private merge(flights: Flight[], positions: Position[]): Flight[] {
    const by = new Map(positions.filter((p) => p.flightIata).map((p) => [p.flightIata!, p]));
    return flights.map((f) => {
      const p = by.get(f.flightIata);
      if (!p) return f;
      const icao = p.aircraftIcao;
      return {
        ...f,
        position: p,
        aircraft: f.aircraft ?? (icao || p.reg ? { icao, name: icao ? AIRCRAFT[icao] ?? null : null, reg: p.reg } : null),
      };
    });
  }

  private toList(s: Snap<Flight[]>): FlightList {
    const now = Date.now();
    return {
      flights: s.data.map((f) => present(f, now)),
      fetchedAt: new Date(s.fetchedAt).toISOString(),
      stale: s.stale,
      error: s.error,
      source: this.provider.name,
      demo: this.provider.demo,
    };
  }

  async positions(force = false) {
    const get = this.provider.getPositions?.bind(this.provider);
    if (!get) {
      if (!this.provider.inlinePositions) return { data: [] as Position[], fetchedAt: Date.now(), stale: false };
      const l = await this.arrivals();
      return { data: l.flights.flatMap((f) => (f.position ? [f.position] : [])), fetchedAt: Date.parse(l.fetchedAt), stale: l.stale };
    }
    const floor = (await this.provider.minIntervalSec?.()) ?? 0;
    return this.swr('positions', () => get(AIRPORT.iata, BBOX), () => Math.max(60, floor / 2), force);
  }

  async arrivals(force = false): Promise<FlightList> {
    const s = await this.swr('arrivals', async () => {
      const flights = await this.provider.getArrivals(AIRPORT.iata);
      const airborne = flights.some((f) => f.providerStatus === 'active' || (etaMs(f) ?? Infinity) - Date.now() < 90 * 60_000);
      if (airborne && this.provider.getPositions) {
        try { return this.merge(flights, (await this.positions()).data); } catch { /* positions are optional */ }
      }
      return flights;
    }, (v) => this.arrivalTtl(v), force);
    return this.toList(s);
  }

  async departures(force = false): Promise<FlightList> {
    const s = await this.swr('departures', () => this.provider.getDepartures(AIRPORT.iata), async () => Math.max(300, (await this.provider.minIntervalSec?.()) ?? 0), force);
    return this.toList(s);
  }

  async flight(id: string): Promise<Flight | null> {
    const code = id.split('-')[0];
    for (const list of [await this.arrivals().catch(() => null), await this.departures().catch(() => null)]) {
      const hit = list?.flights.find((f) => f.id === id) ?? list?.flights.find((f) => f.flightIata === code);
      if (hit) return hit;
    }
    const raw = await this.swr(`flight:${code}`, () => this.provider.getFlight(code), () => 120).catch(() => null);
    return raw?.data ? present(raw.data) : null;
  }

  async aircraft(reg: string) {
    return (await this.swr(`aircraft:${reg}`, () => this.provider.getAircraft(reg), () => 60)).data;
  }
}
