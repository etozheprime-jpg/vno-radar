import { useState } from 'react';
import type { Flight } from '../../shared/types';
import { useApp } from '../hooks/AppContext';
import { BellIcon } from './Icons';
import { FollowSheet } from './FollowSheet';

export function FollowButton({ flight, block }: { flight: Flight; block?: boolean }) {
  const { t, isFollowing, removeFollow } = useApp();
  const [open, setOpen] = useState(false);
  const on = isFollowing(flight.id);
  const done = flight.direction === 'departure' || flight.status === 'cancelled' || flight.status === 'diverted';
  if (done) return null;
  return (
    <>
      <button
        className={`btn ${on ? 'btn-outline' : 'btn-primary'} ${block ? 'btn-block' : ''}`}
        aria-pressed={on}
        onClick={() => (on ? void removeFollow(flight.id) : setOpen(true))}
      >
        <BellIcon width={18} height={18} />
        {on ? t('flight.following') : t('flight.follow')}
      </button>
      {open && <FollowSheet flight={flight} onClose={() => setOpen(false)} />}
    </>
  );
}
