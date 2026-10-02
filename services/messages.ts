import type { Lang } from '../../shared/types.js';

export type NotifyKind = 'pre3' | 'landed' | 'after20' | 'after40' | 'delay' | 'cancelled' | 'diverted' | 'gate' | 'eta';
export interface Vars { f: string; n?: number; gate?: string; delay?: number; time?: string }

type Msg = (v: Vars) => { title: string; body: string };

const M: Record<Lang, Record<NotifyKind, Msg>> = {
  en: {
    pre3: (v) => ({ title: `✈️ ${v.f} is about to land in Vilnius`, body: `Expected arrival in about ${v.n} min.` }),
    landed: (v) => ({ title: `🛬 ${v.f} has landed in Vilnius`, body: 'Touchdown reported by the flight data feed.' }),
    after20: (v) => ({ title: `🧳 ${v.f} passengers`, body: 'Passengers of this flight should be moving through the airport by now. If you are meeting someone, now is a good time to be at the exit.' }),
    after40: (v) => ({ title: `🚶 ${v.f} passengers`, body: 'Passengers usually have left the airport by this time (rough estimate — we cannot see actual passengers).' }),
    delay: (v) => ({ title: `🟡 ${v.f} is delayed`, body: `Delay: +${v.delay} min. New expected time ${v.time}.` }),
    cancelled: (v) => ({ title: `🔴 ${v.f} is cancelled`, body: 'The airline has cancelled this flight.' }),
    diverted: (v) => ({ title: `⚫ ${v.f} was diverted`, body: 'This flight will not land in Vilnius.' }),
    gate: (v) => ({ title: `🚪 ${v.f}: gate changed`, body: `New gate: ${v.gate}.` }),
    eta: (v) => ({ title: `⏱ ${v.f}: arrival time changed`, body: `New expected arrival ${v.time}.` }),
  },
  lt: {
    pre3: (v) => ({ title: `✈️ ${v.f} netrukus leisis Vilniuje`, body: `Numatomas atvykimas po ~${v.n} min.` }),
    landed: (v) => ({ title: `🛬 ${v.f} nusileido Vilniuje`, body: 'Nusileidimą užfiksavo skrydžių duomenų šaltinis.' }),
    after20: (v) => ({ title: `🧳 Reiso ${v.f} keleiviai`, body: 'Šio reiso keleiviai jau turėtų eiti per oro uostą. Jei kažką pasitinkate — pats laikas būti prie išėjimo.' }),
    after40: (v) => ({ title: `🚶 Reiso ${v.f} keleiviai`, body: 'Paprastai šiuo metu keleiviai jau būna išėję iš oro uosto (orientacinis laikas — realių keleivių nematome).' }),
    delay: (v) => ({ title: `🟡 ${v.f} vėluoja`, body: `Vėlavimas: +${v.delay} min. Naujas numatomas laikas ${v.time}.` }),
    cancelled: (v) => ({ title: `🔴 ${v.f} atšauktas`, body: 'Oro bendrovė atšaukė šį reisą.' }),
    diverted: (v) => ({ title: `⚫ ${v.f} nukreiptas kitur`, body: 'Šis reisas nenusileis Vilniuje.' }),
    gate: (v) => ({ title: `🚪 ${v.f}: pasikeitė išėjimas`, body: `Naujas išėjimas: ${v.gate}.` }),
    eta: (v) => ({ title: `⏱ ${v.f}: pasikeitė atvykimo laikas`, body: `Naujas numatomas atvykimas ${v.time}.` }),
  },
  ru: {
    pre3: (v) => ({ title: `✈️ ${v.f} скоро прибывает в Вильнюс`, body: `Ожидаемое прибытие через ~${v.n} мин.` }),
    landed: (v) => ({ title: `🛬 ${v.f} приземлился в Вильнюсе`, body: 'Посадку зафиксировал источник данных о рейсах.' }),
    after20: (v) => ({ title: `🧳 Пассажиры рейса ${v.f}`, body: 'Пассажиры этого рейса уже должны проходить через аэропорт. Если вы кого-то встречаете — самое время быть у выхода.' }),
    after40: (v) => ({ title: `🚶 Пассажиры рейса ${v.f}`, body: 'Обычно к этому времени пассажиры уже выходят из аэропорта (ориентировочно — мы не видим конкретных пассажиров).' }),
    delay: (v) => ({ title: `🟡 Рейс ${v.f} задерживается`, body: `Задержка: +${v.delay} мин. Новое ожидаемое время ${v.time}.` }),
    cancelled: (v) => ({ title: `🔴 Рейс ${v.f} отменён`, body: 'Авиакомпания отменила этот рейс.' }),
    diverted: (v) => ({ title: `⚫ Рейс ${v.f} перенаправлен`, body: 'Этот рейс не сядет в Вильнюсе.' }),
    gate: (v) => ({ title: `🚪 ${v.f}: изменился гейт`, body: `Новый гейт: ${v.gate}.` }),
    eta: (v) => ({ title: `⏱ ${v.f}: изменилось время прибытия`, body: `Новое ожидаемое время ${v.time}.` }),
  },
};

export const message = (lang: Lang, kind: NotifyKind, v: Vars) => (M[lang] ?? M.en)[kind](v);
