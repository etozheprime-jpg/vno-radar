import type { Flight, FlightStatus } from '../../shared/types.js';
import { AIRPORT } from '../data/airport.js';
import { distanceKm } from './geo.js';

export const etaMs = (f: Flight): number | null => {
  const t = f.estimated ?? f.scheduled;
  return t ? new Date(t).getTime() : null;
};

/** Delay in minutes. Prefers the provider's value, otherwise derives it from timestamps we actually have. */
export function deriveDelay(f: Flight): number | null {
  if (f.delayMin !== null) return f.delayMin;
  if (!f.scheduled) return null;
  const ref = f.actual ?? f.estimated;
  if (!ref) return null;
  return Math.round((new Date(ref).getTime() - new Date(f.scheduled).getTime()) / 60000);
}

export function deriveStatus(f: Flight, now = Date.now()): FlightStatus {
  const p = f.providerStatus;
  if (p === 'cancelled') return 'cancelled';
  if (p === 'diverted') return 'diverted';
  const delay = deriveDelay(f) ?? 0;

  if (f.direction === 'departure') {
    if (f.actual || p === 'active' || p === 'landed') return 'active';
    return delay >= 5 ? 'delayed' : p === 'unknown' ? 'unknown' : 'scheduled';
  }

  if (f.actual || p === 'landed') return 'landed';
  const eta = etaMs(f);
  const airborne = p === 'active' || !!f.position;
  if (airborne) {
    const nearPos = f.position ? distanceKm(f.position.lat, f.position.lon, AIRPORT.lat, AIRPORT.lon) < 60 : false;
    if (nearPos || (eta !== null && eta - now < 10 * 60_000)) return 'approaching';
  }
  if (delay >= 5) return 'delayed';
  if (airborne) return 'en-route';
  return p === 'unknown' ? 'unknown' : 'scheduled';
}

export function present(f: Flight, now = Date.now()): Flight {
  return { ...f, delayMin: deriveDelay(f), status: deriveStatus(f, now) };
}
