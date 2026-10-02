export type Lang = 'lt' | 'ru' | 'en';

export type FlightStatus =
  | 'scheduled' | 'active' | 'en-route' | 'approaching'
  | 'landed' | 'delayed' | 'cancelled' | 'diverted' | 'unknown';

export type ProviderStatus = 'scheduled' | 'active' | 'landed' | 'cancelled' | 'diverted' | 'unknown';

export interface Place {
  iata: string;
  city: string | null;
  lat: number | null;
  lon: number | null;
}

export interface Position {
  flightIata: string | null;
  reg: string | null;
  aircraftIcao: string | null;
  lat: number;
  lon: number;
  altM: number | null;
  speedKmh: number | null;
  heading: number | null;
  vspeedMs: number | null;
  updated: string | null;
}

export interface Flight {
  id: string;
  flightIata: string;
  direction: 'arrival' | 'departure';
  airline: { iata: string | null; name: string | null };
  origin: Place;
  destination: Place;
  /** ISO UTC. null = provider did not supply the value (never invented). */
  scheduled: string | null;
  estimated: string | null;
  actual: string | null;
  delayMin: number | null;
  providerStatus: ProviderStatus;
  status: FlightStatus;
  terminal: string | null;
  gate: string | null;
  baggage: string | null;
  aircraft: { icao: string | null; name: string | null; reg: string | null } | null;
  position: Position | null;
  /** Times at the other end of the route (departure for arrivals). */
  counterpart: { scheduled: string | null; estimated: string | null; actual: string | null } | null;
}

export interface FlightList {
  flights: Flight[];
  fetchedAt: string;
  stale: boolean;
  error?: string;
  source: string;
  demo: boolean;
}

export interface AirportInfo {
  iata: string;
  icao: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface FollowPrefs {
  pre3: boolean;
  landed: boolean;
  after20: boolean;
  after40: boolean;
  delays: boolean;
  gate: boolean;
  eta: boolean;
}

export const DEFAULT_PREFS: FollowPrefs = {
  pre3: true, landed: true, after20: true, after40: true, delays: true, gate: true, eta: true,
};
