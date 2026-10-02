import express from 'express';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createCache } from './cache.js';
import { config } from './config.js';
import { AviationStackProvider } from './providers/aviationstack.js';
import { AirLabsProvider } from './providers/airlabs.js';
import { MockProvider } from './providers/mock.js';
import { createRouter } from './routes.js';
import { FlightService } from './services/flights.js';
import { Notifier } from './services/notifier.js';
import { Store } from './services/store.js';

const cache = await createCache();
const provider = config.apiKey && config.provider === 'aviationstack'
  ? new AviationStackProvider(config.apiKey, cache, config.monthlyBudget)
  : config.apiKey && config.provider === 'airlabs'
    ? new AirLabsProvider(config.apiKey, cache, config.monthlyBudget)
    : new MockProvider();
if (provider.demo) console.log('[provider] DEMO mode: synthetic flights (set AVIATION_API_KEY for real data)');
else console.log(`[provider] ${provider.name}, monthly budget ${config.monthlyBudget}`);

const flights = new FlightService(provider, cache);
const store = new Store();
new Notifier(flights, store).start();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '10kb' }));

// tiny per-IP rate limit for the whole API
const hits = new Map<string, { n: number; reset: number }>();
app.use('/api', (req, res, next) => {
  const now = Date.now();
  const e = hits.get(req.ip ?? '') ?? { n: 0, reset: now + 60_000 };
  if (e.reset < now) { e.n = 0; e.reset = now + 60_000; }
  e.n++;
  hits.set(req.ip ?? '', e);
  if (e.n > 120) return res.status(429).json({ error: 'Too many requests' });
  res.setHeader('Cache-Control', 'no-store');
  next();
});
setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (v.reset < n) hits.delete(k); }, 5 * 60_000).unref();

app.use('/api', createRouter(flights, store));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

const dist = resolve('dist');
if (existsSync(dist)) {
  app.use('/assets', express.static(join(dist, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(dist, {
    setHeaders: (res, p) => { if (/(sw\.js|index\.html|manifest\.webmanifest)$/.test(p)) res.setHeader('Cache-Control', 'no-cache'); },
  }));
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.listen(config.port, () => console.log(`[server] http://localhost:${config.port}`));
