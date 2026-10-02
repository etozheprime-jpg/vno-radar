import type { Flight, Position, ProviderStatus } from '../../shared/types.js';
import { AIRPORT } from '../data/airport.js';
import { AIRLINES, AIRCRAFT, place } from '../data/lookup.js';
import { distanceKm } from '../services/geo.js';
import type { FlightProvider } from './types.js';

// Synthetic, deterministic schedule so the whole app runs without an API key.
const LINES: [string, string, string, string][] = [
  ['FR', '1234', 'BCN', 'B738'], ['W6', '1902', 'FCO', 'A321'], ['BT', '342', 'RIX', 'BCS3'],
  ['LO', '775', 'WAW', 'E195'], ['FR', '4321', 'STN', 'B738'], ['W6', '4404', 'LTN', 'A20N'],
  ['LH', '2518', 'FRA', 'A320'], ['SK', '1989', 'CPH', 'A320'], ['AY', '1085', 'HEL', 'A320'],
  ['FR', '8312', 'DUB', 'B738'], ['TK', '1403', 'IST', 'A321'], ['BT', '346', 'TLL', 'BCS3'],
  ['W6', '3604', 'AGP', 'A321'], ['FR', '2091', 'MAN', 'B738'], ['KL', '1171', 'AMS', 'E190'],
  ['LO', '779', 'WAW', 'DH8D'], ['FR', '1180', 'BGY', 'B738'], ['W6', '1706', 'BER', 'A320'],
];
const DELAYS = [0, 0, 0, 4, 0, 9, 0, 15, -3, 0, 0, 27, 0, 6];
const SLOT_MIN = 17;

const seed = (n: number) => Math.abs(Math.sin(n * 9301 + 49297) * 233280) % 1;
const iso = (t: number) => new Date(t).toISOString();

function build(direction: 'arrival' | 'departure', now: number): { flights: Flight[]; positions: Position[] } {
  const base = Math.floor(now / (SLOT_MIN * 60000));
  const flights: Flight[] = [];
  const positions: Position[] = [];
  for (let k = -10; k <= 36; k++) {
    const n = base + k + (direction === 'departure' ? 7777 : 0);
    const [al, num, other, type] = LINES[((n % LINES.length) + LINES.length) % LINES.length];
    const sched = (base + k) * SLOT_MIN * 60000 + Math.floor(seed(n) * 5) * 60000;
    const delay = DELAYS[((n % DELAYS.length) + DELAYS.length) % DELAYS.length];
    const cancelled = n % 31 === 0;
    const est = sched + delay * 60000;
    const o = place(other);
    const vno = place('VNO');
    const dist = o.lat != null && o.lon != null ? distanceKm(o.lat, o.lon, vno.lat!, vno.lon!) : 1200;
    const durMs = (dist / 780 + 0.4) * 3600000;
    const done = est <= now;
    let status: ProviderStatus = cancelled ? 'cancelled' : done ? 'landed' : est - durMs <= now ? 'active' : 'scheduled';
    const reg = seed(n + 3) > 0.35 ? `${al === 'LO' ? 'SP' : al === 'BT' ? 'YL' : 'EI'}-${String.fromCharCode(65 + (n % 26))}${String.fromCharCode(65 + ((n * 7) % 26))}${String.fromCharCode(65 + ((n * 3) % 26))}` : null;
    const f: Flight = {
      id: `${al}${num}-${Math.floor(sched / 1000)}`,
      flightIata: `${al}${num}`,
      direction,
      airline: { iata: al, name: AIRLINES[al] ?? null },
      origin: direction === 'arrival' ? o : vno,
      destination: direction === 'arrival' ? vno : o,
      scheduled: iso(sched),
      estimated: cancelled ? null : iso(est),
      actual: !cancelled && done ? iso(est) : null,
      delayMin: cancelled ? null : delay,
      providerStatus: status,
      status: 'unknown',
      terminal: '1',
      // Honest gaps: gate/baggage only sometimes known, like a real feed.
      gate: seed(n + 11) > 0.45 && !cancelled ? `${['A', 'B'][n % 2]}${3 + (n % 12)}` : null,
      baggage: direction === 'arrival' && seed(n + 5) > 0.5 && est - now < 20 * 60000 && !cancelled ? String(1 + (n % 5)) : null,
      aircraft: seed(n + 3) > 0.35 ? { icao: type, name: AIRCRAFT[type] ?? null, reg } : null,
      position: null,
      counterpart: { scheduled: iso(sched - durMs), estimated: null, actual: cancelled ? null : iso(est - durMs) },
    };
    if (direction === 'arrival' && status === 'active' && o.lat != null && o.lon != null) {
      const frac = Math.min(0.99, Math.max(0, 1 - (est - now) / durMs));
      const lat = o.lat + (vno.lat! - o.lat) * frac;
      const lon = o.lon + (vno.lon! - o.lon) * frac;
      const heading = (Math.atan2(vno.lon! - o.lon, vno.lat! - o.lat) * 180) / Math.PI;
      const p: Position = {
        flightIata: f.flightIata, reg, aircraftIcao: type, lat, lon,
        altM: Math.round(Math.min(11000, (1 - frac) * 60000)),
        speedKmh: Math.round(frac > 0.9 ? 300 : 800), heading: (heading + 360) % 360,
        vspeedMs: frac > 0.9 ? -4 : 0, updated: iso(now),
      };
      positions.push(p);
      f.position = p;
    }
    flights.push(f);
  }
  return { flights, positions };
}

export class MockProvider implements FlightProvider {
  readonly name = 'mock';
  readonly demo = true;
  readonly callsPerRefresh = 0;
  async getArrivals() { return build('arrival', Date.now()).flights; }
  async getDepartures() { return build('departure', Date.now()).flights; }
  async getFlight(flightIata: string) {
    const all = [...build('arrival', Date.now()).flights, ...build('departure', Date.now()).flights];
    return all.find((f) => f.flightIata === flightIata) ?? null;
  }
  async getAircraft(reg: string) {
    return build('arrival', Date.now()).positions.find((p) => p.reg === reg) ?? null;
  }
  async getPositions(): Promise<Position[]> { return build('arrival', Date.now()).positions; }
  async minIntervalSec() { return 0; }
}

export { AIRPORT };
