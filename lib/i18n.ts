import en from '../locales/en.json';
import lt from '../locales/lt.json';
import ru from '../locales/ru.json';
import type { Lang } from '../../shared/types';

export type LangPref = Lang | 'auto';
export const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: 'lt', flag: '🇱🇹', label: 'Lietuvių' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
];

const dict: Record<Lang, Record<string, string>> = { en, lt, ru };

export function detectLang(): Lang {
  for (const l of navigator.languages ?? [navigator.language]) {
    const c = l.slice(0, 2).toLowerCase();
    if (c === 'lt' || c === 'ru' || c === 'en') return c;
  }
  return 'en';
}

export const resolveLang = (p: LangPref): Lang => (p === 'auto' ? detectLang() : p);

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = dict[lang][key] ?? dict.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export const BCP47: Record<Lang, string> = { lt: 'lt-LT', ru: 'ru-RU', en: 'en-GB' };
