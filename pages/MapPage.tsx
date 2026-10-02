import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import type { Position } from '../../shared/types';
import { Banner } from '../components/Banner';
import { useApp } from '../hooks/AppContext';
import { go } from '../hooks/useRoute';
import { api } from '../lib/api';
import { AIRPORT, eta, fmtTime } from '../lib/time';

const planeIcon = (heading: number, selected: boolean) =>
  L.divIcon({
    className: 'plane-marker',
    html: `<div style="transform:rotate(${heading}deg)" class="${selected ? 'sel' : ''}"><svg viewBox="0 0 24 24" width="30" height="30"><path fill="currentColor" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

export function MapPage({ flight }: { flight?: string }) {
  const { t, list, locale } = useApp();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [positions, setPositions] = useState<Position[] | null>(null);
  const [available, setAvailable] = useState(true);
  const fitted = useRef(false);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([AIRPORT.lat, AIRPORT.lon], 8);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(m);
    L.control.zoom({ position: 'topright' }).addTo(m);
    L.marker([AIRPORT.lat, AIRPORT.lon], { icon: L.divIcon({ className: 'airport-marker', html: '<span>VNO</span>', iconSize: [48, 24], iconAnchor: [24, 12] }) }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => api.positions().then((r) => { if (alive) { setPositions(r.aircraft); setAvailable(r.available); } }).catch(() => {});
    void load();
    const id = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const g = layer.current; const m = map.current;
    if (!g || !m || !positions) return;
    g.clearLayers();
    let focus: L.LatLng | null = null;
    for (const p of positions) {
      const f = list?.flights.find((x) => x.flightIata === p.flightIata);
      const sel = !!flight && p.flightIata === flight;
      const mk = L.marker([p.lat, p.lon], { icon: planeIcon(p.heading ?? 0, sel), keyboard: true, title: p.flightIata ?? '' }).addTo(g);
      const n = (v: number | null, u: string) => (v === null ? t('na') : `${Math.round(v)} ${u}`);
      const e = f ? eta(f) : null;
      const pop = document.createElement('div');
      pop.className = 'pop';
      pop.innerHTML = `<b>${p.flightIata ?? '—'}</b> ${f?.airline.name ?? ''}<br>${f ? `${f.origin.city ?? f.origin.iata} → ${f.destination.city ?? f.destination.iata}<br>` : ''}
        ${t('map.altitude')}: ${n(p.altM, 'm')}<br>${t('map.speed')}: ${n(p.speedKmh, 'km/h')}<br>${t('map.heading')}: ${n(p.heading, '°')}<br>ETA: ${e ? fmtTime(e, locale) : t('na')}`;
      if (f) {
        const a = document.createElement('a'); a.href = `#/flight/${encodeURIComponent(f.id)}`; a.textContent = t('map.openFlight'); pop.append(document.createElement('br'), a);
      }
      mk.bindPopup(pop);
      if (sel) { focus = L.latLng(p.lat, p.lon); mk.openPopup(); }
      if (sel && f?.origin.lat != null && f.origin.lon != null) L.polyline([[f.origin.lat, f.origin.lon], [AIRPORT.lat, AIRPORT.lon]], { color: '#5b8cff', weight: 2, dashArray: '6 8' }).addTo(g);
    }
    if (focus) m.setView(focus, 8);
    else if (positions.length && !fitted.current) {
      fitted.current = true;
      m.fitBounds(L.latLngBounds([[AIRPORT.lat, AIRPORT.lon], ...positions.map((p) => [p.lat, p.lon] as [number, number])]).pad(0.15), { maxZoom: 9 });
    }
  }, [positions, flight, list, t, locale]);

  return (
    <main className="page map-page">
      <h1 className="page-title">{t('map.title')}</h1>
      <Banner />
      <div ref={el} className="map" role="application" aria-label={t('map.title')} />
      {(!available || (positions && positions.length === 0)) && <p className="muted pad">{t('map.noPositions')}</p>}
      {flight && <button className="btn btn-ghost" onClick={() => go('#/map')}>×</button>}
    </main>
  );
}
