import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_PREFS, type FlightList, type FollowPrefs, type Lang } from '../../shared/types';
import { api } from '../lib/api';
import { BCP47, resolveLang, translate, type LangPref } from '../lib/i18n';
import { currentEndpoint, followOnServer, unfollowOnServer } from '../lib/push';
import { load, save } from '../lib/storage';
import { useNow } from './useNow';

export type ThemePref = 'dark' | 'light' | 'system';
interface Settings { lang: LangPref; theme: ThemePref; prefs: FollowPrefs }
export interface Follow { id: string; flightIata: string; prefs: FollowPrefs; push: boolean }

interface Ctx {
  now: number;
  lang: Lang;
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  settings: Settings;
  setSettings: (p: Partial<Settings>) => void;
  list: FlightList | null;
  fetchedAt: number | null;
  loading: boolean;
  failed: boolean;
  online: boolean;
  refresh: () => Promise<void>;
  follows: Follow[];
  isFollowing: (id: string) => boolean;
  addFollow: (f: Follow) => void;
  removeFollow: (id: string) => Promise<void>;
}

const C = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(C);

const POLL_MS = 30_000; // polls OUR backend (cached) — never the external provider
const CACHE_KEY = 'vno.lastList';

export function AppProvider({ children }: { children: ReactNode }) {
  const now = useNow();
  const [settings, setS] = useState<Settings>(() => ({ lang: 'auto', theme: 'dark', prefs: DEFAULT_PREFS, ...load<Partial<Settings>>('vno.settings', {}) }));
  const [list, setList] = useState<FlightList | null>(() => load<FlightList | null>(CACHE_KEY, null));
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [follows, setFollows] = useState<Follow[]>(() => load<Follow[]>('vno.follows', []));
  const busy = useRef(false);

  const lang = resolveLang(settings.lang);
  const locale = BCP47[lang];
  const t = useCallback((k: string, v?: Record<string, string | number>) => translate(lang, k, v), [lang]);

  const setSettings = useCallback((p: Partial<Settings>) => setS((s) => { const n = { ...s, ...p }; save('vno.settings', n); return n; }), []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    const apply = () => {
      const light = settings.theme === 'light' || (settings.theme === 'system' && matchMedia('(prefers-color-scheme: light)').matches);
      document.documentElement.dataset.theme = light ? 'light' : 'dark';
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', light ? '#eef2fb' : '#070b16');
    };
    apply();
    const mq = matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.theme]);

  const refresh = useCallback(async (force = false) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const l = await api.arrivals(force);
      setList(l); save(CACHE_KEY, l); setFailed(false);
    } catch { setFailed(true); }
    finally { busy.current = false; setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine) void refresh(); }, POLL_MS);
    const vis = () => { if (document.visibilityState === 'visible') void refresh(); };
    const on = () => { setOnline(true); void refresh(); };
    const off = () => setOnline(false);
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [refresh]);

  // drop followed flights that are long gone
  useEffect(() => {
    if (!list) return;
    setFollows((fs) => {
      const keep = fs.filter((f) => { const x = list.flights.find((y) => y.id === f.id); return !x || x.status !== 'landed' || Date.now() - new Date(x.actual ?? list.fetchedAt).getTime() < 3 * 3600_000; });
      if (keep.length !== fs.length) save('vno.follows', keep);
      return keep.length !== fs.length ? keep : fs;
    });
  }, [list]);

  const addFollow = useCallback((f: Follow) => setFollows((fs) => { const n = [...fs.filter((x) => x.id !== f.id), f]; save('vno.follows', n); return n; }), []);
  const removeFollow = useCallback(async (id: string) => {
    setFollows((fs) => { const n = fs.filter((x) => x.id !== id); save('vno.follows', n); return n; });
    const ep = await currentEndpoint();
    if (ep) unfollowOnServer(ep, id).catch(() => {});
  }, []);
  const isFollowing = useCallback((id: string) => follows.some((f) => f.id === id), [follows]);

  // keep the server-side language in sync if the user switches language later
  useEffect(() => {
    void (async () => {
      const ep = await currentEndpoint();
      if (!ep) return;
      for (const f of follows) if (f.push) followOnServer(ep, f.id, f.flightIata, f.prefs, lang).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const fetchedAt = list ? new Date(list.fetchedAt).getTime() : null;
  const value = useMemo<Ctx>(() => ({
    now, lang, locale, t, settings, setSettings, list, fetchedAt, loading, failed, online,
    refresh: () => refresh(true), follows, isFollowing, addFollow, removeFollow,
  }), [now, lang, locale, t, settings, setSettings, list, fetchedAt, loading, failed, online, refresh, follows, isFollowing, addFollow, removeFollow]);

  return <C.Provider value={value}>{children}</C.Provider>;
}
