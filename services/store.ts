import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type { FollowPrefs, Lang } from '../../shared/types.js';
import { config } from '../config.js';

export interface SubRecord {
  endpoint: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  lang: Lang;
  createdAt: number;
}

export interface FollowRecord {
  id: string;
  endpoint: string;
  flightId: string;
  flightIata: string;
  prefs: FollowPrefs;
  lang: Lang;
  sent: string[];
  landedAt: number | null;
  baseline: { gate: string | null; eta: number | null; delay: number | null } | null;
  createdAt: number;
}

interface Data { subs: Record<string, SubRecord>; follows: Record<string, FollowRecord> }

/**
 * MVP persistence: a JSON file. The surface is tiny (subs + follows) so swapping in
 * Postgres later means re-implementing this one class — see docs/ARCHITECTURE.md for the schema.
 */
export class Store {
  private file = join(config.dataDir, 'store.json');
  private data: Data = { subs: {}, follows: {} };
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    mkdirSync(config.dataDir, { recursive: true });
    if (existsSync(this.file)) {
      try { this.data = JSON.parse(readFileSync(this.file, 'utf8')); } catch { /* start fresh */ }
    }
  }

  private save() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const tmp = this.file + '.tmp';
      writeFileSync(tmp, JSON.stringify(this.data));
      renameSync(tmp, this.file);
    }, 500);
  }

  upsertSub(s: SubRecord) { this.data.subs[s.endpoint] = s; this.save(); }
  getSub(endpoint: string) { return this.data.subs[endpoint]; }
  removeSub(endpoint: string) {
    delete this.data.subs[endpoint];
    for (const [id, f] of Object.entries(this.data.follows)) if (f.endpoint === endpoint) delete this.data.follows[id];
    this.save();
  }

  followId(endpoint: string, flightId: string) { return `${flightId}::${endpoint.slice(-24)}`; }
  upsertFollow(f: FollowRecord) { this.data.follows[f.id] = f; this.save(); }
  getFollow(id: string) { return this.data.follows[id]; }
  removeFollow(id: string) { delete this.data.follows[id]; this.save(); }
  allFollows() { return Object.values(this.data.follows); }
  touch() { this.save(); }
}
