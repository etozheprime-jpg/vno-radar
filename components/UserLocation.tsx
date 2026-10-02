import { useApp } from '../hooks/AppContext';
import { useGeo } from '../hooks/useGeo';
import { fmtDistance } from '../lib/geo';
import { PinIcon } from './Icons';

export function UserLocation() {
  const { t } = useApp();
  const g = useGeo();

  if (g.status === 'ok' && g.distanceKm !== undefined) {
    const near = g.distanceKm < 1.5;
    return (
      <div className="chip" role="status">
        <PinIcon width={16} height={16} />
        <span>{near ? t('loc.near') : t('loc.distance', { d: fmtDistance(g.distanceKm) })}</span>
        {!near && g.bearing !== undefined && (
          <span className="compass" style={{ transform: `rotate(${g.bearing}deg)` }} aria-hidden="true">↑</span>
        )}
      </div>
    );
  }
  if (g.status === 'denied' || g.status === 'unavailable') return <div className="chip chip-muted"><PinIcon width={16} height={16} />{t('loc.denied')}</div>;
  return (
    <button className="chip chip-btn" onClick={g.request} disabled={g.status === 'asking'}>
      <PinIcon width={16} height={16} />{t('loc.enable')}
    </button>
  );
}
