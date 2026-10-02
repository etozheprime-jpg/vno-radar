import { TabBar } from './components/TabBar';
import { AppProvider } from './hooks/AppContext';
import { useRoute } from './hooks/useRoute';
import { Board } from './pages/Board';
import { FlightPage } from './pages/FlightPage';
import { Home } from './pages/Home';
import { MapPage } from './pages/MapPage';
import { Settings } from './pages/Settings';

function Shell() {
  const route = useRoute();
  return (
    <>
      <div className="bg" aria-hidden="true" />
      {route.name === 'home' && <Home />}
      {route.name === 'board' && <Board />}
      {route.name === 'map' && <MapPage flight={route.flight} />}
      {route.name === 'settings' && <Settings />}
      {route.name === 'flight' && <FlightPage id={route.id} />}
      <TabBar route={route} />
    </>
  );
}

export const App = () => <AppProvider><Shell /></AppProvider>;
