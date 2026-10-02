import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import webpush from 'web-push';
import { config } from '../config.js';
import type { SubRecord } from './store.js';

let publicKey = config.vapidPublic;
let privateKey = config.vapidPrivate;

if (!publicKey || !privateKey) {
  const f = join(config.dataDir, 'vapid.json');
  if (config.isProd) {
    console.warn('[push] VAPID keys missing — push disabled. Run `npm run vapid`.');
  } else if (existsSync(f)) {
    ({ publicKey, privateKey } = JSON.parse(readFileSync(f, 'utf8')));
  } else {
    mkdirSync(config.dataDir, { recursive: true });
    const k = webpush.generateVAPIDKeys();
    publicKey = k.publicKey; privateKey = k.privateKey;
    writeFileSync(f, JSON.stringify(k));
    console.log('[push] generated dev VAPID keys in data/vapid.json');
  }
}

export const pushEnabled = !!(publicKey && privateKey);
if (pushEnabled) webpush.setVapidDetails(config.vapidSubject, publicKey, privateKey);

export const vapidPublicKey = publicKey;

/** Returns false when the subscription is gone (404/410) and should be deleted. */
export async function sendPush(sub: SubRecord, payload: { title: string; body: string; tag: string; url: string }): Promise<boolean> {
  if (!pushEnabled) return true;
  try {
    await webpush.sendNotification(sub.subscription, JSON.stringify(payload), { TTL: 600, urgency: 'high' });
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) return false;
    console.warn('[push] send failed', code ?? (e as Error).message);
    return true;
  }
}
