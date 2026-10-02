import { useApp } from '../hooks/AppContext';
import type { Route } from '../hooks/useRoute';
import { GearIcon, HomeIcon, ListIcon, MapIcon } from './Icons';

const TABS = [
  { name: 'home', hash: '#/', icon: HomeIcon, key: 'nav.home' },
  { name: 'board', hash: '#/board', icon: ListIcon, key: 'nav.board' },
  { name: 'map', hash: '#/map', icon: MapIcon, key: 'nav.map' },
  { name: 'settings', hash: '#/settings', icon: GearIcon, key: 'nav.settings' },
] as const;

export function TabBar({ route }: { route: Route }) {
  const { t } = useApp();
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ name, hash, icon: Icon, key }) => {
        const active = route.name === name || (name === 'home' && route.name === 'flight');
        return (
          <a key={name} href={hash} className={active ? 'tab active' : 'tab'} aria-current={active ? 'page' : undefined}>
            <Icon />
            <span>{t(key)}</span>
          </a>
        );
      })}
    </nav>
  );
}
