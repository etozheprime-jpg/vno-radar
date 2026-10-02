import 'dotenv/config';

const key = process.env.AVIATION_API_KEY ?? '';

export const config = {
  port: Number(process.env.PORT ?? 8787),
  isProd: process.env.NODE_ENV === 'production',
  provider: (process.env.FLIGHT_PROVIDER || (key ? 'aviationstack' : 'mock')) as 'airlabs' | 'aviationstack' | 'mock',
  apiKey: key,
  monthlyBudget: Number(process.env.API_MONTHLY_BUDGET ?? 1000),
  redisUrl: process.env.REDIS_URL ?? '',
  dataDir: process.env.DATA_DIR ?? 'data',
  vapidPublic: process.env.VAPID_PUBLIC_KEY ?? '',
  vapidPrivate: process.env.VAPID_PRIVATE_KEY ?? '',
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
};
