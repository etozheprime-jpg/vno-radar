import type { CSSProperties } from 'react';
import type { Flight } from '../../shared/types';
import { useApp } from '../hooks/AppContext';
import { go } from '../hooks/useRoute';
import { airlineColor } from '../lib/airlineColor';
import { exitInfo } from '../lib/exit';
import { countdown, deviceTzDiffersFromAirport, fmtTime } from '../lib/time';
import { FollowButton } from './FollowButton';
import { PlaneIcon } from './Icons';
import { StatusBadge } from './StatusBadge';

export function Hero({ flight: f }: { flight: Flight }) {
  const { t, locale, now } = useApp();
  const cd = countdown(f, now, t);
  const exit = exitInfo(f, now, t, locale);
  const sched = fmtTime(f.scheduled, locale);
  const est = fmtTime(f.estimated, locale);
  const showEst = est && est !== sched;
  const na = t('na');
  const details: [string, string | null][] = [
    [t('flight.terminal'), f.terminal],
    [t('flight.gate'), f.gate],
    [t('flight.baggage'), f.baggage],
    [t('flight.aircraft'), f.aircraft?.name ?? f.aircraft?.icao ?? null],
  ];

  return (
    <section className="hero glass" style={{ '--accent': airlineColor(f.airline.iata) } as CSSProperties} aria-label={t('home.next')}>
      <div className="radar" aria-hidden="true" />
      <div className="hero-top">
        <div>
          <div className="eyebrow">{f.airline.name ?? f.airline.iata ?? ''}</div>
          <button className="flight-no" onClick={() => go(`#/flight/${encodeURIComponent(f.id)}`)}>{f.flightIata}</button>
        </div>
        <StatusBadge flight={f} />
      </div>

      <div className="route">
        <div className="city">{f.origin.city ?? f.origin.iata}<small>{f.origin.iata}</small></div>
        <div className="route-line" aria-hidden="true"><PlaneIcon className="route-plane" /></div>
        <div className="city right">{f.destination.city ?? f.destination.iata}<small>{f.destination.iata}</small></div>
      </div>

      <div className="count" aria-live="polite" aria-atomic="true">
        {cd.kind === 'future' && <div className="eyebrow">{t('cd.arrivingIn')}</div>}
        <div className={`count-big ${cd.kind}`}>
          {cd.big}{cd.unit && <span className="unit">{cd.unit}</span>}
        </div>
        {cd.kind === 'overdue' && <div className="muted">{cd.text}</div>}
      </div>

      <div className="times">
        <span className="t-sched">{sched ?? na}</span>
        {showEst && <span className="t-est">{t('time.expected', { t: est })}</span>}
        {deviceTzDiffersFromAirport() && <span className="t-tz">{t('time.vnoTime')}</span>}
      </div>

      {exit && <div className={`exit ${exit.phase}`} role="status"><span aria-hidden="true">🚶</span><div>{exit.text}<small>{t('exit.note')}</small></div></div>}

      <dl className="details">
        {details.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd className={v ? '' : 'na'}>{v ?? na}</dd></div>
        ))}
      </dl>

      <FollowButton flight={f} block />
    </section>
  );
}
