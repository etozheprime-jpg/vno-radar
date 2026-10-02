import { Router } from 'express';
import { DEFAULT_PREFS, type FollowPrefs, type Lang } from '../shared/types.js';
import { AIRPORT } from './data/airport.js';
import type { FlightService } from './services/flights.js';
import { pushEnabled, vapidPublicKey } from './services/push.js';
import type { Store } from './services/store.js';

const LANGS: Lang[] = ['lt', 'ru', 'en'];
const lang = (v: unknown): Lang => (LANGS.includes(v as Lang) ? (v as Lang) : 'en');
const isEndpoint = (v: unknown): v is string => typeof v === 'string' && v.startsWith('https://') && v.length < 1024;

function prefs(v: unknown): FollowPrefs {
  const out = { ...DEFAULT_PREFS };
  if (v && typeof v === 'object') for (const k of Object.keys(out) as (keyof FollowPrefs)[]) if (typeof (v as Record<string, unknown>)[k] === 'boolean') out[k] = (v as Record<string, boolean>)[k];
  return out;
}

export function createRouter(flights: FlightService, store: Store) {
  const r = Router();
  const wrap = (fn: (req: import('express').Request, res: import('express').Response) => Promise<unknown>) =>
    (req: import('express').Request, res: import('express').Response) =>
      fn(req, res).catch((e: Error) => {
        console.warn('[api]', req.path, e.message);
        res.status(503).json({ error: 'Flight data temporarily unavailable' });
      });

  r.get('/health', (_req, res) => res.json({ ok: true, provider: flights.provider.name, demo: flights.provider.demo, push: pushEnabled, time: new Date().toISOString() }));
  r.get('/airport', (_req, res) => res.json(AIRPORT));

  r.get('/flights/arrivals', wrap(async (req, res) => res.json(await flights.arrivals(req.query.refresh === '1'))));
  r.get('/flights/departures', wrap(async (_req, res) => res.json(await flights.departures())));
  r.get('/flights/:id', wrap(async (req, res) => {
    const f = await flights.flight(req.params.id);
    return f ? res.json(f) : res.status(404).json({ error: 'Flight not found' });
  }));

  r.get('/positions', wrap(async (_req, res) => {
    const s = await flights.positions();
    res.json({ aircraft: s.data, fetchedAt: new Date(s.fetchedAt).toISOString(), stale: s.stale, available: !!flights.provider.getPositions || !!flights.provider.inlinePositions });
  }));
  r.get('/aircraft/:reg', wrap(async (req, res) => {
    const a = await flights.aircraft(req.params.reg.toUpperCase());
    return a ? res.json(a) : res.status(404).json({ error: 'Aircraft not found' });
  }));

  r.get('/notifications/key', (_req, res) => res.json({ enabled: pushEnabled, publicKey: vapidPublicKey }));

  r.post('/notifications/subscribe', (req, res) => {
    const { subscription, lang: l } = req.body ?? {};
    if (!isEndpoint(subscription?.endpoint) || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return res.status(400).json({ error: 'Invalid subscription' });
    store.upsertSub({ endpoint: subscription.endpoint, subscription, lang: lang(l), createdAt: Date.now() });
    res.json({ ok: true });
  });
  r.delete('/notifications/subscribe', (req, res) => {
    if (!isEndpoint(req.body?.endpoint)) return res.status(400).json({ error: 'Invalid endpoint' });
    store.removeSub(req.body.endpoint);
    res.json({ ok: true });
  });

  r.post('/follow-flight', (req, res) => {
    const { endpoint, flightId, flightIata, prefs: p, lang: l } = req.body ?? {};
    if (!isEndpoint(endpoint) || typeof flightId !== 'string' || typeof flightIata !== 'string') return res.status(400).json({ error: 'Invalid request' });
    if (!store.getSub(endpoint)) return res.status(404).json({ error: 'Subscribe to notifications first' });
    const id = store.followId(endpoint, flightId);
    const prev = store.getFollow(id);
    store.upsertFollow({
      id, endpoint, flightId, flightIata: flightIata.slice(0, 10), prefs: prefs(p), lang: lang(l),
      sent: prev?.sent ?? [], landedAt: prev?.landedAt ?? null, baseline: prev?.baseline ?? null, createdAt: prev?.createdAt ?? Date.now(),
    });
    res.json({ ok: true, id });
  });
  r.delete('/follow-flight', (req, res) => {
    const { endpoint, flightId } = req.body ?? {};
    if (!isEndpoint(endpoint) || typeof flightId !== 'string') return res.status(400).json({ error: 'Invalid request' });
    store.removeFollow(store.followId(endpoint, flightId));
    res.json({ ok: true });
  });

  return r;
}
