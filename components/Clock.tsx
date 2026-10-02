import { useApp } from '../hooks/AppContext';

/** Device date, time and timezone — updates every second. */
export function Clock() {
  const { now, locale } = useApp();
  const d = new Date(now);
  const date = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return (
    <div className="clock">
      <div className="clock-date">{date}</div>
      <div className="clock-time" aria-label={time}>{time}</div>
    </div>
  );
}
