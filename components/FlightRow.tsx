import type { Flight } from '../../shared/types';
import { useApp } from '../hooks/AppContext';
import { go } from '../hooks/useRoute';
import { airlineColor } from '../lib/airlineColor';
import { exitInfo } from '../lib/exit';
import { fmtTime } from '../lib/time';
import { BellIcon } from './Icons';
import { StatusBadge } from './StatusBadge';

export function FlightRow({ flight: f }: { flight: Flight }) {
  const { locale, t, isFollowing, now } = useApp();
  const exit = exitInfo(f, now, t, locale);
  const planned = fmtTime(f.scheduled, locale);
  const shown = fmtTime(f.actual ?? f.estimated, locale);
  const changed = shown && planned && shown !== planned;
  const route = `${f.origin.city ?? f.origin.iata} → ${f.destination.city ?? f.destination.iata}`;
  return (
    <button className="row-card" style={{ '--accent': airlineColor(f.airline.iata) } as React.CSSProperties} onClick={() => go(`#/flight/${encodeURIComponent(f.id)}`)}>
      <div className="rc-time">
        <span className={changed ? 'struck' : ''}>{planned ?? '—'}</span>
        {changed && <span className="rc-new">{shown}</span>}
      </div>
      <div className="rc-main">
        <div className="rc-title">
          {f.airline.name ?? f.airline.iata ?? ''} <b>{f.flightIata}</b>
          {isFollowing(f.id) && <BellIcon width={14} height={14} aria-label={t('flight.following')} />}
        </div>
        <div className="rc-sub">{route}</div>
        {exit && <div className={`rc-exit ${exit.phase}`}>🚶 {exit.text}</div>}
      </div>
      <StatusBadge flight={f} size="sm" />
    </button>
  );
}
