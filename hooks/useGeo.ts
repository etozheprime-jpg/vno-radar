import { useCallback, useEffect, useState } from 'react';
import { AIRPORT } from '../lib/time';
import { bearing, distanceKm } from '../lib/geo';

export interface GeoState {
  status: 'idle' | 'asking' | 'ok' | 'denied' | 'unavailable';
  distanceKm?: number;
  bearing?: number;
  accuracy?: number;
}

/**
 * Coordinates stay in this component's memory: only the derived distance is kept,
 * nothing is stored or sent to the backend.
 */
export function useGeo(): GeoState & { request: () => void } {
  const [s, setS] = useState<GeoState>({ status: 'idle' });

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) return setS({ status: 'unavailable' });
    setS((p) => ({ ...p, status: p.status === 'ok' ? 'ok' : 'asking' }));
    navigator.geolocation.getCurrentPosition(
      (p) => setS({
        status: 'ok',
        distanceKm: distanceKm(p.coords.latitude, p.coords.longitude, AIRPORT.lat, AIRPORT.lon),
        bearing: bearing(p.coords.latitude, p.coords.longitude, AIRPORT.lat, AIRPORT.lon),
        accuracy: p.coords.accuracy,
      }),
      (e) => setS({ status: e.code === 1 ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  }, []);

  // auto-refresh silently if the user already granted permission earlier
  useEffect(() => {
    navigator.permissions?.query({ name: 'geolocation' }).then((p) => { if (p.state === 'granted') request(); }).catch(() => {});
  }, [request]);

  return { ...s, request };
}
