import type { Position } from '../../shared/types.js';

/**
 * Position-only fallback (no schedules). Anonymous OpenSky is ~400 credits/day;
 * callsigns are ICAO-style (RYR1234), so matching to IATA flight numbers is best-effort.
 * Use it to feed the map when the primary provider has no live positions.
 */
export async function openSkyPositions(bbox: [number, number, number, number]): Promise<Position[]> {
  const [lamin, lomin, lamax, lomax] = bbox;
  const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`);
  const json = (await res.json()) as { time: number; states: unknown[][] | null };
  return (json.states ?? [])
    .filter((s) => typeof s[6] === 'number' && typeof s[5] === 'number' && s[8] === false)
    .map((s) => ({
      flightIata: null,
      reg: null,
      aircraftIcao: null,
      lat: s[6] as number,
      lon: s[5] as number,
      altM: (s[7] as number | null) ?? null,
      speedKmh: typeof s[9] === 'number' ? Math.round((s[9] as number) * 3.6) : null,
      heading: (s[10] as number | null) ?? null,
      vspeedMs: (s[11] as number | null) ?? null,
      updated: new Date(((s[4] as number) ?? json.time) * 1000).toISOString(),
      // callsign kept in flightIata slot only as a hint for the UI
    }));
}
