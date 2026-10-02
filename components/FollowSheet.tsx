import { useState } from 'react';
import { DEFAULT_PREFS, type Flight, type FollowPrefs } from '../../shared/types';
import { useApp } from '../hooks/AppContext';
import { currentEndpoint, enablePush, followOnServer, pushProblem } from '../lib/push';

const KEYS: (keyof FollowPrefs)[] = ['pre3', 'landed', 'after20', 'after40', 'delays', 'gate', 'eta'];

export function FollowSheet({ flight, onClose }: { flight: Flight; onClose: () => void }) {
  const { t, lang, settings, setSettings, addFollow } = useApp();
  const [prefs, setPrefs] = useState<FollowPrefs>({ ...DEFAULT_PREFS, ...settings.prefs });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const problem = pushProblem();

  const finish = (push: boolean) => {
    setSettings({ prefs });
    addFollow({ id: flight.id, flightIata: flight.flightIata, prefs, push });
    onClose();
  };

  const confirm = async () => {
    setBusy(true); setErr(null);
    try {
      const ep = (await currentEndpoint()) ?? (await enablePush(lang));
      await followOnServer(ep, flight.id, flight.flightIata, prefs, lang);
      finish(true);
    } catch (e) {
      const m = (e as Error).message;
      setErr(t(m === 'server' ? 'push.err.server' : m === 'denied' ? 'push.err.denied' : 'push.err.failed'));
    } finally { setBusy(false); }
  };

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={t('push.title', { f: flight.flightIata })} onClick={onClose}>
      <div className="sheet glass" onClick={(e) => e.stopPropagation()}>
        <h2>{t('push.title', { f: flight.flightIata })}</h2>
        <p className="muted">{t('push.choose')}</p>
        <div className="toggles">
          {KEYS.map((k) => (
            <label key={k} className="toggle">
              <span>{t(`pref.${k}`)}</span>
              <input type="checkbox" checked={prefs[k]} onChange={(e) => setPrefs({ ...prefs, [k]: e.target.checked })} />
            </label>
          ))}
        </div>
        <p className="note">{t('pref.note')}</p>
        {problem && <p className="warn-text">{t(`push.err.${problem}`)}</p>}
        {err && <p className="warn-text" role="alert">{err}</p>}
        <div className="col">
          <button className="btn btn-primary" disabled={busy || !!problem} onClick={() => void confirm()}>{t('push.confirm')}</button>
          <button className="btn btn-ghost" onClick={() => finish(false)}>{t('push.localOnly')}</button>
          <button className="btn btn-ghost" onClick={onClose}>{t('push.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
