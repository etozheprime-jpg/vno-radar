import type { Flight, FlightList } from '../../shared/types';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  arrivals: (refresh = false) => get<FlightList>(`/api/flights/arrivals${refresh ? '?refresh=1' : ''}`),
  departures: () => get<FlightList>('/api/flights/departures'),
  flight: (id: string) => get<Flight>(`/api/flights/${encodeURIComponent(id)}`),
  positions: () => get<{ aircraft: import('../../shared/types').Position[]; fetchedAt: string; stale: boolean; available: boolean }>('/api/positions'),
  pushKey: () => get<{ enabled: boolean; publicKey: string }>('/api/notifications/key'),
};

export async function send(method: 'POST' | 'DELETE', path: string, body: unknown) {
  const res = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
