import { useMemo } from 'react';
import { Banner } from '../components/Banner';
import { Clock } from '../components/Clock';
import { FlightRow } from '../components/FlightRow';
import { Hero } from '../components/Hero';
import { GlobeIcon, GearIcon, RefreshIcon } from '../components/Icons';
import { InstallCard } from '../components/InstallCard';
import { Logo } from '../components/Logo';
import { UserLocation } from '../components/UserLocation';
import { useApp } from '../hooks/AppContext';
import { LANGS } from '../lib/i18n';
import { ago, eta, fmtTime, ms } from '../lib/time';
import { go } from '../hooks/useRoute';

export function Home() {
  const { list, t, lang, settings, setSettings, now, locale, fetchedAt, refresh, loading } = useApp();

  const { next, upcoming, recent } = useMemo(() => {
    const arr = (list?.flights ?? []).filter((f) => f.direction === 'arrival');
    const open = arr
      .filter((f) => f.status !== 'landed' && f.status !== 'cancelled' && f.status !== 'diverted')
      .filter((f) => (eta(f) ?? Infinity) > now - 10 * 60_000)
      .sort((a, b) => (eta(a) ?? 0) - (eta(b) ?? 0));
    const cancelled = arr.filter((f) => f.status === 'cancelled' || f.status === 'diverted').filter((f) => (ms(f.scheduled) ?? 0) > now - 30 * 60_000);
    const rest = [...open.slice(1), ...cancelled].sort((a, b) => (ms(a.scheduled) ?? 0) - (ms(b.scheduled) ?? 0)).slice(0, 10);
    const rec = arr.filter((f) => f.status === 'landed')
      .sort((a, b) => (ms(b.actual ?? b.estimated) ?? 0) - (ms(a.actual ?? a.estimated) ?? 0))
      .filter((f) => now - (ms(f.actual ?? f.estimated) ?? 0) < 3 * 3600_000)
      .slice(0, 5);
    return { next: open[0], upcoming: rest, recent: rec };
  }, [list, now]);

  const cycleLang = () => {
    const i = LANGS.findIndex((l) => l.code === lang);
    setSettings({ lang: LANGS[(i + 1) % LANGS.length].code });
  };
  const flag = LANGS.find((l) => l.code === lang)?.flag;

  return (
    <main className="page">
      <header className="top">
        <div className="brand">
          <Logo />
          <div>
            <h1>{t('app.name')}</h1>
            <div className="muted">{t('airport.name')}</div>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={cycleLang} aria-label={`${t('settings.language')}: ${LANGS.find((l) => l.code === lang)?.label}`}>
            <GlobeIcon /><span aria-hidden="true">{flag}</span>
          </button>
          <button className="icon-btn" onClick={() => go('#/settings')} aria-label={t('nav.settings')}><GearIcon /></button>
        </div>
      </header>

      <Clock />
      <div className="loc"><UserLocation /></div>
      <Banner />

      {next ? <Hero flight={next} /> : (
        <div className="glass empty">{loading ? t('banner.waiting') : list ? t('home.none') : t('banner.unavailable')}</div>
      )}

      <InstallCard />

      {upcoming.length > 0 && (
        <section aria-labelledby="h-next">
          <h2 id="h-next" className="section">{t('home.nextList')}</h2>
          <div className="stack">{upcoming.map((f) => <FlightRow key={f.id} flight={f} />)}</div>
        </section>
      )}

      <section aria-labelledby="h-recent">
        <h2 id="h-recent" className="section">{t('home.recent')}</h2>
        {recent.length ? <div className="stack">{recent.map((f) => <FlightRow key={f.id} flight={f} />)}</div> : <div className="muted pad">{t('home.noneRecent')}</div>}
      </section>

      <footer className="updated">
        {fetchedAt ? <span>{t('updated.last', { t: fmtTime(fetchedAt, locale, undefined) ?? '' })} · {ago(now - fetchedAt, t)}</span> : null}
        <button className="btn btn-ghost btn-sm" onClick={() => void refresh()}><RefreshIcon width={16} height={16} />{t('refresh')}</button>
      </footer>
    </main>
  );
}
