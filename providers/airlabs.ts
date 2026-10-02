import type { Cache } from '../cache.js';
import type { Flight, Position, ProviderStatus } from '../../shared/types.js';
import { AIRCRAFT, AIRLINES, place } from '../data/lookup.js';
import { ProviderError, type FlightProvider } from './types.js';

const BASE = 'https://airlabs.co/api/v9';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

const ts = (s: unknown): string | null => (typeof s === 'number' && s > 0 ? new Date(s * 1000).toISOString() : null);
const str = (s: unknown): string | null => (s === null || s === undefined || s === '' ? null : String(s));

function mapStatus(s: unknown): ProviderStatus {
  switch (s) {
    case 'scheduled': case 'active': case 'landed': case 'cancelled': return s;
    case 'diverted': return s;
    default: return 'unknown';
  }
}

export class AirLabsProvider implements FlightProvider {
  readonly name = 'airlabs';
  readonly demo = false;
  readonly callsPerRefresh = 2; // schedules + live positions

  constructor(
    private apiKey: string,
    private cache: Cache,
    private monthlyBudget: number,
  ) {}

  private monthKey() {
    const d = new Date();
    return `budget:airlabs:${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
  }

  async minIntervalSec(): Promise<number> {
    const used = (await this.cache.get<number>(this.monthKey())) ?? 0;
    const now = new Date();
    const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
    const secLeft = Math.max(60, (end - now.getTime()) / 1000);
    const remaining = Math.max(1, this.monthlyBudget - used);
    return (secLeft / remaining) * this.callsPerRefresh;
  }

  private async call(path: string, params: Record<string, string>): Promise<Raw[]> {
    const used = await this.cache.incr(this.monthKey(), 40 * 86400);
    if (used > this.monthlyBudget) throw new ProviderError(`Monthly API budget (${this.monthlyBudget}) exhausted`);
    const qs = new URLSearchParams({ ...params, api_key: this.apiKey });
    const res = await fetch(`${BASE}/${path}?${qs}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new ProviderError(`AirLabs HTTP ${res.status}`);
    const json = (await res.json()) as { response?: Raw[]; error?: { message?: string } };
    if (json.error) throw new ProviderError(`AirLabs: ${json.error.message ?? 'error'}`);
    return json.response ?? [];
  }

  private mapSchedule(r: Raw, direction: 'arrival' | 'departure'): Flight | null {
    const flightIata = str(r.flight_iata) ?? str(r.cs_flight_iata);
    if (!flightIata) return null;
    const arr = direction === 'arrival';
    const sched = ts(r[arr ? 'arr_time_ts' : 'dep_time_ts']);
    const est = ts(r[arr ? 'arr_estimated_ts' : 'dep_estimated_ts']);
    const act = ts(r[arr ? 'arr_actual_ts' : 'dep_actual_ts']);
    const otherSched = ts(r[arr ? 'dep_time_ts' : 'arr_time_ts']);
    const delay = r[arr ? 'arr_delayed' : 'dep_delayed'];
    const airlineIata = str(r.airline_iata);
    const al = (flightIata.match(/^[A-Z0-9]{2}/)?.[0] ?? airlineIata) as string | null;
    return {
      id: `${flightIata}-${Math.floor(new Date(sched ?? Date.now()).getTime() / 1000)}`,
      flightIata,
      direction,
      airline: { iata: airlineIata ?? al, name: AIRLINES[airlineIata ?? al ?? ''] ?? null },
      origin: place(r.dep_iata),
      destination: place(r.arr_iata),
      scheduled: sched,
      estimated: est,
      actual: act,
      delayMin: typeof delay === 'number' ? delay : null,
      providerStatus: mapStatus(r.status),
      status: 'unknown',
      terminal: str(r[arr ? 'arr_terminal' : 'dep_terminal']),
      gate: str(r[arr ? 'arr_gate' : 'dep_gate']),
      baggage: arr ? str(r.arr_baggage) : null,
      aircraft: null, // schedules endpoint does not carry aircraft; merged from live positions when available
      position: null,
      counterpart: {
        scheduled: otherSched,
        estimated: ts(r[arr ? 'dep_estimated_ts' : 'arr_estimated_ts']),
        actual: ts(r[arr ? 'dep_actual_ts' : 'arr_actual_ts']),
      },
    };
  }

  async getArrivals(iata: string) {
    const rows = await this.call('schedules', { arr_iata: iata, limit: '100' });
    return rows.map((r) => this.mapSchedule(r, 'arrival')).filter((f): f is Flight => !!f);
  }
  async getDepartures(iata: string) {
    const rows = await this.call('schedules', { dep_iata: iata, limit: '100' });
    return rows.map((r) => this.mapSchedule(r, 'departure')).filter((f): f is Flight => !!f);
  }

  async getFlight(flightIata: string): Promise<Flight | null> {
    const rows = await this.call('flight', { flight_iata: flightIata });
    const r = rows[0] as Raw | undefined;
    if (!r) return null;
    const f = this.mapSchedule(r, r.arr_iata === 'VNO' ? 'arrival' : 'departure');
    if (!f) return null;
    const icao = str(r.aircraft_icao);
    f.aircraft = icao || r.reg_number ? { icao, name: icao ? AIRCRAFT[icao] ?? null : null, reg: str(r.reg_number) } : null;
    return f;
  }

  private mapPosition(r: Raw): Position | null {
    if (typeof r.lat !== 'number' || typeof r.lng !== 'number') return null;
    return {
      flightIata: str(r.flight_iata),
      reg: str(r.reg_number),
      aircraftIcao: str(r.aircraft_icao),
      lat: r.lat,
      lon: r.lng,
      altM: typeof r.alt === 'number' ? r.alt : null,
      speedKmh: typeof r.speed === 'number' ? r.speed : null,
      heading: typeof r.dir === 'number' ? r.dir : null,
      vspeedMs: typeof r.v_speed === 'number' ? r.v_speed : null,
      updated: ts(r.updated),
    };
  }

  async getAircraft(reg: string) {
    const rows = await this.call('flights', { reg_number: reg });
    return rows.map((r) => this.mapPosition(r)).find(Boolean) ?? null;
  }

  async getPositions(iata: string): Promise<Position[]> {
    const rows = await this.call('flights', { arr_iata: iata });
    return rows.map((r) => this.mapPosition(r)).filter((p): p is Position => !!p);
  }
}
