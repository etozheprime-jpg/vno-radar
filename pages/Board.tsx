import { useEffect, useMemo, useState } from 'react';
import type { FlightList } from '../../shared/types';
import { Banner } from '../components/Banner';
import { FlightRow } from '../components/FlightRow';
import { SearchIcon } from '../components/Icons';
import { useApp } from '../hooks/AppContext';
import { api } from '../lib/api';
import { ms } from '../lib/time';

type Filter = 'all' | 'landed' | 'delayed' | 'cancelled';
const FILTERS: Filter[] = ['all', 'landed', 'delayed', 'cancelled'];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');

export function Board() {
  const { list: arrivals, t } = useApp();
  const [dir, setDir] = useState<'arrival' | 'departure'>('arrival');
  const [deps, setDeps] = useState<FlightList | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [airline, setAirline] = useState('');

  useEffect(() => { if (dir === 'departure' && !deps) api.departures().then(setDeps).catch(() => {}); }, [dir, deps]);
  const src = dir === 'arrival' ? arrivals : deps;

  const airlines = useMemo(() => [...new Set((src?.flights ?? []).map((f) => f.airline.name ?? f.airline.iata).filter(Boolean) as string[])].sort(), [src]);

  const rows = useMemo(() => {
    const nq = norm(q);
    return (src?.flights ?? [])
      .filter((f) => filter === 'all' || (filter === 'landed' ? f.status === 'landed' : filter === 'delayed' ? f.status === 'delayed' || (f.delayMin ?? 0) >= 5 : f.status === 'cancelled'))
      .filter((f) => !airline || (f.airline.name ?? f.airline.iata) === airline)
      .filter((f) => !nq || norm([f.flightIata, f.airline.name, f.airline.iata, f.origin.city, f.origin.iata, f.destination.city, f.destination.iata].filter(Boolean).join(' ')).includes(nq))
      .sort((a, b) => (ms(a.scheduled) ?? 0) - (ms(b.scheduled) ?? 0));
  }, [src, q, filter, airline]);

  return (
    <main className="page">
      <h1 className="page-title">{t('nav.board')}</h1>
      <Banner />
      <div className="seg" role="tablist">
        {(['arrival', 'departure'] as const).map((d) => (
          <button key={d} role="tab" aria-selected={dir === d} className={dir === d ? 'on' : ''} onClick={() => setDir(d)}>{t(d === 'arrival' ? 'board.arrivals' : 'board.departures')}</button>
        ))}
      </div>
      <label className="search">
        <SearchIcon />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('board.search')} aria-label={t('board.search')} enterKeyHint="search" />
      </label>
      <div className="chips" role="group">
        {FILTERS.map((f) => <button key={f} className={`fchip ${filter === f ? 'on' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>{t(`board.f.${f}`)}</button>)}
        <select className="fchip" value={airline} onChange={(e) => setAirline(e.target.value)} aria-label={t('board.airline')}>
          <option value="">{t('board.allAirlines')}</option>
          {airlines.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>
      <div className="stack">
        {rows.length ? rows.map((f) => <FlightRow key={f.id} flight={f} />) : <div className="muted pad">{t('board.empty')}</div>}
      </div>
    </main>
  );
}
