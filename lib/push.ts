import type { FollowPrefs, Lang } from '../../shared/types';
import { api, send } from './api';

export type PushProblem = 'insecure' | 'ios' | 'unsupported' | 'denied' | 'server' | null;

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Why push can't work right now (null = it can be attempted). Never promises more than the platform offers. */
export function pushProblem(): PushProblem {
  if (!window.isSecureContext) return 'insecure';
  if (isIOS() && !isStandalone()) return 'ios';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return isIOS() ? 'ios' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return null;
}

const b64ToBytes = (s: string) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export async function currentEndpoint(): Promise<string | null> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return (await reg?.pushManager.getSubscription())?.endpoint ?? null;
  } catch { return null; }
}

export async function enablePush(lang: Lang): Promise<string> {
  const key = await api.pushKey();
  if (!key.enabled) throw new Error('server');
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('denied');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key.publicKey) }));
  await send('POST', '/api/notifications/subscribe', { subscription: sub.toJSON(), lang });
  return sub.endpoint;
}

export const followOnServer = (endpoint: string, flightId: string, flightIata: string, prefs: FollowPrefs, lang: Lang) =>
  send('POST', '/api/follow-flight', { endpoint, flightId, flightIata, prefs, lang });
export const unfollowOnServer = (endpoint: string, flightId: string) => send('DELETE', '/api/follow-flight', { endpoint, flightId });
