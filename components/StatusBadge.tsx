import type { Flight } from '../../shared/types';
import { useApp } from '../hooks/AppContext';

export function StatusBadge({ flight, size = 'md' }: { flight: Flight; size?: 'sm' | 'md' }) {
  const { t } = useApp();
  const s = flight.status;
  const key = flight.direction === 'departure' && s === 'active' ? 'status.departed' : `status.${s}`;
  const delay = flight.delayMin ?? 0;
  const label = t(key) + (s === 'delayed' && delay > 0 ? ` ${t('delay.plus', { n: delay })}` : '');
  return (
    <span className={`badge badge-${s} badge-${size}`}>
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
  );
}
