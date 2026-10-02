import type { Flight } from '../../shared/types';
import { eta, fmtTime, ms, type T } from './time';

export const EXIT_FROM_MIN = 20;
export const EXIT_TO_MIN = 45;

export interface ExitInfo { phase: 'before' | 'now' | 'done'; text: string }

/**
 * Rough passenger-exit estimate: 20–45 min after landing. Based on the actual landing time when known,
 * otherwise on the expected arrival time. It is an estimate, never a claim about specific passengers.
 */
export function exitInfo(f: Flight, now: number, t: T, locale: string): ExitInfo | null {
  if (f.direction !== 'arrival' || f.status === 'cancelled' || f.status === 'diverted') return null;
  const landed = f.status === 'landed';
  const base = landed ? ms(f.actual) : eta(f);
  if (base === null) return null;
  const from = base + EXIT_FROM_MIN * 60_000;
  const to = base + EXIT_TO_MIN * 60_000;
  const a = fmtTime(from, locale) ?? '';
  const b = fmtTime(to, locale) ?? '';
  if (!landed || now < from) return { phase: 'before', text: t('exit.window', { a, b }) };
  if (now <= to) return { phase: 'now', text: t('exit.now', { b }) };
  return { phase: 'done', text: t('exit.done') };
}
