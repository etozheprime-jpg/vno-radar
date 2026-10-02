import type { Flight, Position } from '../../shared/types.js';

export interface FlightProvider {
  readonly name: string;
  /** true = synthetic data; UI must say so. */
  readonly demo: boolean;
  /** Provider calls one arrivals refresh costs (for budget planning). */
  readonly callsPerRefresh: number;
  /** Positions arrive inside arrivals (no separate positions call). */
  readonly inlinePositions?: boolean;
  getArrivals(airportIata: string): Promise<Flight[]>;
  getDepartures(airportIata: string): Promise<Flight[]>;
  getFlight(flightIata: string): Promise<Flight | null>;
  getAircraft(reg: string): Promise<Position | null>;
  getPositions?(airportIata: string, bbox: [number, number, number, number]): Promise<Position[]>;
  /** Minimum seconds between refreshes to stay inside the monthly budget. */
  minIntervalSec?(): Promise<number>;
}

export class ProviderError extends Error {}
