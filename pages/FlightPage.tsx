import { useEffect, useState, type CSSProperties } from 'react';
import type { Flight } from '../../shared/types';
import { FollowButton } from '../components/FollowButton';
import { ChevronLeft } from '../components/Icons';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../hooks/AppContext';
import { go } from '../hooks/useRoute';
import { api } from '../lib/api';
import { airlineColor } from '../lib/airlineColor';
import { exitInfo } from '../lib/exit';
import { countdown, fmtTime } from '../lib/time';

export function FlightPage({ id }: { id: string }) {
  const { list, t, locale, now } = useApp();
  const fromList = list?.flights.find((f) => f.id === id);
  const [fetched, setFetched] = useState<Flight | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => { if (!fromList) api.flight(id).then(setFetched).catch(() => setMissing(true)); }, [id, fromList]);
  const f = fromList ?? fetched;

  const back = <button className="back" onClick={() => (history.length > 1 ? history.back() : go('#/'))}><ChevronLeft />{t('nav.home')}</button>;
  if (!f) return <main className="page">{back}<div className="glass empty">{missing ? t('flight.notFound') : t('banner.waiting')}</div></main>;

  const na = t('na');
  const tm = (v: string | null) => fmtTime(v, locale);
  const delay = f.delayMin;
  const isArr = f.direction === 'arrival';
  const exit = exitInfo(f, now, t, locale);
  const cd = isArr ? countdown(f, now, t) : null;

  const timeline: { label: string; time: string | null; done: boolean }[] = [
    { label: t('flight.departure'), time: tm(f.counterpart?.actual ?? f.counterpart?.scheduled ?? null), done: !!f.counterpart?.actual },
    { label: t('flight.scheduledArrival'), time: tm(f.scheduled), done: true },
    ...(f.estimated && f.estimated !== f.scheduled ? [{ label: t('flight.estimatedArrival'), time: tm(f.estimated), done: !f.actual }] : []),
    ...(f.actual ? [{ label: t('flight.actualLanding'), time: tm(f.actual), done: true }] : []),
  ].filter((x) => x.time);

  const rows: [string, string | null][] = [
    [t('time.scheduled'), tm(f.scheduled)],
    [t('time.estimated'), tm(f.estimated)],
    [t('time.actual'), tm(f.actual)],
    [t('flight.delay'), delay === null ? null : delay > 0 ? t('delay.plus', { n: delay }) : delay < 0 ? t('delay.early', { n: -delay }) : '0'],
  ];

  return (
    <main className="page" style={{ '--accent': airlineColor(f.airline.iata) } as CSSProperties}>
      {back}
      <section className="glass hero">
        <div className="hero-top">
          <div>
            <div className="eyebrow">{f.airline.name ?? f.airline.iata ?? ''}</div>
            <h1 className="flight-no static">{f.flightIata}</h1>
          </div>
          <StatusBadge flight={f} />
        </div>
        <div className="route">
          <div className="city">{f.origin.city ?? f.origin.iata}<small>{f.origin.iata}</small></div>
          <div className="route-line" aria-hidden="true" />
          <div className="city right">{f.destination.city ?? f.destination.iata}<small>{f.destination.iata}</small></div>
        </div>
        {cd && cd.kind !== 'landed' && <div className="count"><div className={`count-big sm ${cd.kind}`}>{cd.big}{cd.unit && <span className="unit">{cd.unit}</span>}</div></div>}
        {cd?.kind === 'landed' && <div className="muted">{cd.text}</div>}
        {exit && <div className={`exit ${exit.phase}`} role="status"><span aria-hidden="true">🚶</span><div>{exit.text}<small>{t('exit.note')}</small></div></div>}
        <FollowButton flight={f} block />
      </section>

      <h2 className="section">{t('flight.status')}</h2>
      <dl className="glass kv">
        {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={v ? '' : 'na'}>{v ?? na}</dd></div>)}
      </dl>

      <h2 className="section">{t('flight.aircraft')}</h2>
      <dl className="glass kv">
        <div><dt>{t('flight.aircraft')}</dt><dd className={f.aircraft?.name || f.aircraft?.icao ? '' : 'na'}>{f.aircraft?.name ?? f.aircraft?.icao ?? na}</dd></div>
        <div><dt>{t('flight.registration')}</dt><dd className={f.aircraft?.reg ? '' : 'na'}>{f.aircraft?.reg ?? na}</dd></div>
      </dl>

      <h2 className="section">{t('flight.airport')} · {t('airport.name')}</h2>
      <dl className="glass kv">
        {([['flight.terminal', f.terminal], ['flight.gate', f.gate], ['flight.baggage', f.baggage]] as const).map(([k, v]) => (
          <div key={k}><dt>{t(k)}</dt><dd className={v ? '' : 'na'}>{v ?? na}</dd></div>
        ))}
      </dl>

      {timeline.length > 1 && (
        <>
          <h2 className="section">{t('flight.timeline')}</h2>
          <ol className="timeline glass">
            {timeline.map((s) => (
              <li key={s.label} className={s.done ? 'done' : ''}><b>{s.time}</b><span>{s.label}</span></li>
            ))}
          </ol>
        </>
      )}

      {f.position && <button className="btn btn-outline btn-block" onClick={() => go(`#/map?flight=${encodeURIComponent(f.flightIata)}`)}>{t('nav.map')}</button>}
    </main>
  );
}
