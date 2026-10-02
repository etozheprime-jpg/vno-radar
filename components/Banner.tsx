import { useApp } from '../hooks/AppContext';
import { ago } from '../lib/time';

export function Banner() {
  const { t, list, fetchedAt, failed, online, now, loading } = useApp();
  const when = fetchedAt ? ago(now - fetchedAt, t) : '';
  const age = fetchedAt ? t('updated.ago', { t: when }) : '';
  const items: { kind: string; text: string }[] = [];

  if (!online) items.push({ kind: 'warn', text: fetchedAt ? t('banner.offline', { t: age }) : t('banner.unavailable') });
  else if (list?.stale || failed) items.push({ kind: 'warn', text: fetchedAt ? t('banner.stale', { t: age }) : t('banner.unavailable') });
  else if (!list && loading) items.push({ kind: 'info', text: t('banner.waiting') });
  if (list?.demo) items.push({ kind: 'info', text: t('banner.demo') });

  if (!items.length) return null;
  return <div className="banners">{items.map((b) => <div key={b.kind + b.text} className={`banner banner-${b.kind}`} role="status">{b.text}</div>)}</div>;
}
