import { useApp, type ThemePref } from '../hooks/AppContext';
import { useInstall } from '../hooks/useInstall';
import { LANGS, type LangPref } from '../lib/i18n';
import type { FollowPrefs } from '../../shared/types';

const PREF_KEYS: (keyof FollowPrefs)[] = ['pre3', 'landed', 'after20', 'after40', 'delays', 'gate', 'eta'];
const THEMES: ThemePref[] = ['dark', 'light', 'system'];

export function Settings() {
  const { t, settings, setSettings } = useApp();
  const inst = useInstall();
  return (
    <main className="page">
      <h1 className="page-title">{t('settings.title')}</h1>

      <h2 className="section">{t('settings.language')}</h2>
      <div className="glass list">
        {LANGS.map((l) => (
          <label key={l.code} className="opt">
            <input type="radio" name="lang" checked={settings.lang === l.code} onChange={() => setSettings({ lang: l.code as LangPref })} />
            <span>{l.flag} {l.label}</span>
          </label>
        ))}
      </div>

      <h2 className="section">{t('settings.theme')}</h2>
      <div className="seg">
        {THEMES.map((th) => <button key={th} className={settings.theme === th ? 'on' : ''} aria-pressed={settings.theme === th} onClick={() => setSettings({ theme: th })}>{t(`settings.${th}`)}</button>)}
      </div>

      <h2 className="section">{t('settings.notifications')}</h2>
      <div className="glass list">
        {PREF_KEYS.map((k) => (
          <label key={k} className="toggle">
            <span>{t(`pref.${k}`)}</span>
            <input type="checkbox" checked={settings.prefs[k]} onChange={(e) => setSettings({ prefs: { ...settings.prefs, [k]: e.target.checked } })} />
          </label>
        ))}
      </div>
      <p className="note">{t('pref.note')}</p>

      <h2 className="section">{t('settings.airport')}</h2>
      <div className="glass list"><div className="opt"><span>🛬 {t('airport.name')} · VNO / EYVI</span></div></div>

      {(inst.canPrompt || inst.ios) && (
        <div className="glass list" style={{ marginTop: 16 }}>
          <div className="opt col">
            <strong>{t('settings.install')}</strong>
            {inst.ios && <span className="muted">{t('install.ios')}</span>}
            {inst.canPrompt && <button className="btn btn-primary btn-sm" onClick={() => void inst.install()}>{t('install.button')}</button>}
          </div>
        </div>
      )}
      <p className="muted pad center">{t('settings.version')} 0.1.0 · {t('app.subtitle')}</p>
    </main>
  );
}
