import type { Flight } from '../../shared/types';

export const AIRPORT_TZ = 'Europe/Vilnius';
export const AIRPORT = { iata: 'VNO', lat: 54.6341, lon: 25.2858 };

export const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : null);
export const eta = (f: Flight) => ms(f.estimated ?? f.scheduled);

/** Flight times are shown in airport time, wherever the phone is. */
export function fmtTime(iso: string | number | null | undefined, locale: string, tz = AIRPORT_TZ): string | null {
  if (iso === null || iso === undefined) return null;
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(new Date(iso));
}

export function deviceTzDiffersFromAirport(): boolean {
  const now = new Date();
  const off = (tz: string) => {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(now).find((x) => x.type === 'timeZoneName')?.value;
    return p;
  };
  return off(Intl.DateTimeFormat().resolvedOptions().timeZone) !== off(AIRPORT_TZ);
}

export type T = (key: string, vars?: Record<string, string | number>) => string;

export function durationText(diffMs: number, t: T): string {
  const mins = Math.max(0, Math.ceil(diffMs / 60000));
  if (mins < 60) return t('cd.min', { n: mins });
  return t('cd.hm', { h: Math.floor(mins / 60), m: mins % 60 });
}

export interface Countdown {
  kind: 'future' | 'now' | 'overdue' | 'landed';
  /** Big number for the hero card, e.g. "18" / "1:05" / "04:37". */
  big: string;
  unit: string;
  text: string;
}

export function countdown(f: Flight, now: number, t: T): Countdown {
  if (f.status === 'landed') {
    const a = ms(f.actual);
    const text = a === null ? t('cd.landed') : t('cd.landedAgo', { t: ago(now - a, t) });
    return { kind: 'landed', big: t('cd.landed'), unit: '', text };
  }
  const e = eta(f);
  if (e === null) return { kind: 'overdue', big: '—', unit: '', text: t('na') };
  const d = e - now;
  if (d <= -10 * 60000) return { kind: 'overdue', big: '—', unit: '', text: t('cd.overdue') };
  if (d <= 60000) return { kind: 'now', big: t('cd.now'), unit: '', text: t('cd.now') };
  if (d < 10 * 60000) {
    const s = Math.ceil(d / 1000);
    return { kind: 'future', big: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, unit: '', text: t('cd.in', { t: durationText(d, t) }) };
  }
  const mins = Math.ceil(d / 60000);
  if (mins < 60) return { kind: 'future', big: String(mins), unit: t('cd.min', { n: '' }).trim(), text: t('cd.in', { t: durationText(d, t) }) };
  return { kind: 'future', big: `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`, unit: '', text: t('cd.in', { t: durationText(d, t) }) };
}

export function ago(diffMs: number, t: T): string {
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return t('cd.justNow');
  if (m < 60) return t('cd.min', { n: m });
  return t('cd.hm', { h: Math.floor(m / 60), m: m % 60 });
}
