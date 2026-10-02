import type { Flight } from '../../shared/types.js';
import { AIRPORT } from '../data/airport.js';
import type { FlightService } from './flights.js';
import { message, type NotifyKind } from './messages.js';
import { sendPush } from './push.js';
import { etaMs } from './status.js';
import type { FollowRecord, Store } from './store.js';

const MIN = 60_000;

const fmtTime = (iso: number | null, lang: string) =>
  iso === null ? '—' : new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', timeZone: AIRPORT.timezone }).format(iso);

/**
 * Every 30 s walks over followed flights and fires each notification at most once (dedupe via `sent`).
 * It reads the same cache the web app reads, so it never spends extra provider calls beyond the adaptive refresh.
 */
export class Notifier {
  private running = false;
  constructor(private flights: FlightService, private store: Store) {}

  start() {
    setInterval(() => void this.tick().catch((e) => console.warn('[notifier]', e)), 30_000).unref();
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const follows = this.store.allFollows();
      if (!follows.length) return;
      const list = await this.flights.arrivals();
      const now = Date.now();
      for (const fol of follows) {
        const f = list.flights.find((x) => x.id === fol.flightId) ?? list.flights.find((x) => x.flightIata === fol.flightIata);
        if (!f) {
          if (now - fol.createdAt > 12 * 3600_000) this.store.removeFollow(fol.id);
          continue;
        }
        await this.evaluate(fol, f, now);
      }
    } finally {
      this.running = false;
    }
  }

  private async fire(fol: FollowRecord, kind: NotifyKind, key: string, f: Flight, extra: { n?: number; gate?: string; delay?: number; time?: string } = {}) {
    if (fol.sent.includes(key)) return;
    fol.sent.push(key);
    this.store.touch();
    const sub = this.store.getSub(fol.endpoint);
    if (!sub) return;
    const { title, body } = message(fol.lang, kind, { f: f.flightIata, ...extra });
    const ok = await sendPush(sub, { title, body, tag: `${f.id}:${kind}`, url: `/#/flight/${f.id}` });
    if (!ok) this.store.removeSub(fol.endpoint);
  }

  private async evaluate(fol: FollowRecord, f: Flight, now: number) {
    const p = fol.prefs;
    const eta = etaMs(f);
    const landed = f.status === 'landed';
    const base = (fol.baseline ??= { gate: f.gate, eta, delay: f.delayMin });

    if (f.status === 'cancelled') {
      if (p.delays) await this.fire(fol, 'cancelled', 'cancelled', f);
      return;
    }
    if (f.status === 'diverted') {
      if (p.delays) await this.fire(fol, 'diverted', 'diverted', f);
      return;
    }

    if (!landed) {
      if (p.pre3 && eta !== null && eta - now <= 3 * MIN && eta - now > -15 * MIN) {
        await this.fire(fol, 'pre3', 'pre3', f, { n: Math.max(1, Math.round((eta - now) / MIN)) });
      }
      if (p.delays && (f.delayMin ?? 0) >= 10 && f.delayMin !== base.delay) {
        await this.fire(fol, 'delay', `delay:${f.delayMin}`, f, { delay: f.delayMin ?? 0, time: fmtTime(eta, fol.lang) });
        base.delay = f.delayMin;
      }
      if (p.eta && eta !== null && base.eta !== null && Math.abs(eta - base.eta) >= 5 * MIN) {
        await this.fire(fol, 'eta', `eta:${eta}`, f, { time: fmtTime(eta, fol.lang) });
        base.eta = eta;
      }
    }
    if (p.gate && f.gate && f.gate !== base.gate) {
      if (base.gate) await this.fire(fol, 'gate', `gate:${f.gate}`, f, { gate: f.gate });
      base.gate = f.gate;
    }

    if (landed) {
      // Honest timing: prefer the provider's actual time; otherwise the moment we first saw "landed".
      fol.landedAt ??= f.actual ? new Date(f.actual).getTime() : now;
      const since = now - fol.landedAt;
      if (p.landed) await this.fire(fol, 'landed', 'landed', f);
      if (p.after20 && since >= 20 * MIN && since < 50 * MIN) await this.fire(fol, 'after20', 'after20', f);
      if (p.after40 && since >= 40 * MIN && since < 80 * MIN) await this.fire(fol, 'after40', 'after40', f);
      if (since > 90 * MIN) this.store.removeFollow(fol.id);
    }
  }
}
