import { useState } from 'react';
import { useApp } from '../hooks/AppContext';
import { useInstall } from '../hooks/useInstall';
import { load, save } from '../lib/storage';

export function InstallCard() {
  const { t } = useApp();
  const inst = useInstall();
  const [hidden, setHidden] = useState(() => load('vno.installDismissed', false));
  if (hidden || (!inst.canPrompt && !inst.ios)) return null;
  const dismiss = () => { save('vno.installDismissed', true); setHidden(true); };
  return (
    <div className="glass install">
      <div>
        <strong>{t('install.title')}</strong>
        {inst.ios && <p>{t('install.ios')}</p>}
      </div>
      <div className="row">
        {inst.canPrompt && <button className="btn btn-primary btn-sm" onClick={() => void inst.install()}>{t('install.button')}</button>}
        <button className="btn btn-ghost btn-sm" onClick={dismiss}>{t('install.dismiss')}</button>
      </div>
    </div>
  );
}
