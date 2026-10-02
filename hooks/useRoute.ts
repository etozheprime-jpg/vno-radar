import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' } | { name: 'board' } | { name: 'map'; flight?: string } | { name: 'settings' }
  | { name: 'flight'; id: string };

function parse(): Route {
  const [path, query] = (location.hash.replace(/^#/, '') || '/').split('?');
  const seg = path.split('/').filter(Boolean);
  if (seg[0] === 'flight' && seg[1]) return { name: 'flight', id: decodeURIComponent(seg[1]) };
  if (seg[0] === 'board') return { name: 'board' };
  if (seg[0] === 'map') return { name: 'map', flight: new URLSearchParams(query).get('flight') ?? undefined };
  if (seg[0] === 'settings') return { name: 'settings' };
  return { name: 'home' };
}

export function useRoute(): Route {
  const [r, setR] = useState<Route>(parse);
  useEffect(() => {
    const on = () => { setR(parse()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

export const go = (hash: string) => { location.hash = hash; };
