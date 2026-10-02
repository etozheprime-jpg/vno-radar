import { useEffect, useState } from 'react';
import { isIOS, isStandalone } from '../lib/push';

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function useInstall() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  const installed = isStandalone();
  return {
    canPrompt: !!evt && !installed,
    ios: isIOS() && !installed,
    installed,
    install: async () => { if (evt) { await evt.prompt(); setEvt(null); } },
  };
}
