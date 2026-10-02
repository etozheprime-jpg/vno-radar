import { config } from './config.js';

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSec: number): Promise<void>;
  incr(key: string, ttlSec: number): Promise<number>;
}

class MemoryCache implements Cache {
  private m = new Map<string, { v: unknown; exp: number }>();
  async get<T>(key: string) {
    const e = this.m.get(key);
    if (!e) return null;
    if (e.exp < Date.now()) { this.m.delete(key); return null; }
    return e.v as T;
  }
  async set(key: string, value: unknown, ttlSec: number) {
    this.m.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
  }
  async incr(key: string, ttlSec: number) {
    const cur = (await this.get<number>(key)) ?? 0;
    await this.set(key, cur + 1, ttlSec);
    return cur + 1;
  }
}

class RedisCache implements Cache {
  constructor(private r: import('ioredis').Redis) {}
  async get<T>(key: string) {
    const s = await this.r.get(key);
    return s ? (JSON.parse(s) as T) : null;
  }
  async set(key: string, value: unknown, ttlSec: number) {
    await this.r.set(key, JSON.stringify(value), 'EX', Math.max(1, Math.round(ttlSec)));
  }
  async incr(key: string, ttlSec: number) {
    const n = await this.r.incr(key);
    if (n === 1) await this.r.expire(key, ttlSec);
    return n;
  }
}

export async function createCache(): Promise<Cache> {
  if (!config.redisUrl) return new MemoryCache();
  try {
    const { default: Redis } = await import('ioredis');
    const r = new Redis(config.redisUrl, { maxRetriesPerRequest: 2, lazyConnect: false });
    r.on('error', (e) => console.warn('[redis]', e.message));
    return new RedisCache(r);
  } catch (e) {
    console.warn('[cache] Redis unavailable, falling back to memory:', (e as Error).message);
    return new MemoryCache();
  }
}
