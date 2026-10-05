import type { ISODate } from './types';

export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const nowISO = () => new Date().toISOString();

export function todayISO(): ISODate {
  const d = new Date();
  return toISODate(d);
}

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as a local date (avoids UTC off-by-one). */
export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmtLong = (s: ISODate) => {
  const d = parseISODate(s);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};
export const fmtShort = (s: ISODate) => {
  const d = parseISODate(s);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
};
export const fmtMonthYear = (s: ISODate) => {
  const d = parseISODate(s);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
export const monthKey = (s: ISODate) => s.slice(0, 7);
export const monthName = (i: number) => MONTHS[i];

/** "3 months, 2 weeks" — the way parents actually say it. */
export function ageLabel(birth: ISODate, on: ISODate = todayISO()): string {
  const b = parseISODate(birth);
  const t = parseISODate(on);
  if (t < b) return 'Arriving soon';
  const days = Math.round((t.getTime() - b.getTime()) / 86400000);
  if (days === 0) return 'Born today';
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} old`;
  let months = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
  if (t.getDate() < b.getDate()) months -= 1;
  if (months < 1) {
    const w = Math.floor(days / 7);
    return `${w} weeks`;
  }
  const anchor = new Date(b.getFullYear(), b.getMonth() + months, b.getDate());
  const rem = Math.round((t.getTime() - anchor.getTime()) / 86400000);
  const weeks = Math.floor(rem / 7);
  if (months < 24) {
    if (months % 12 === 0 && months > 0 && weeks === 0) return `${months / 12} year${months > 12 ? 's' : ''} old`;
    const ml = months >= 12 ? `${Math.floor(months / 12)} year${months >= 24 ? 's' : ''}${months % 12 ? `, ${months % 12} month${months % 12 > 1 ? 's' : ''}` : ''}` : `${months} month${months > 1 ? 's' : ''}`;
    if (weeks > 0 && (months < 12 || months % 12 === 0)) return `${ml}, ${weeks} week${weeks > 1 ? 's' : ''}`;
    return ml;
  }
  return `${Math.floor(months / 12)} years old`;
}

/** Month of life (0 = birth month span) for a date. */
export function monthOfLife(birth: ISODate, on: ISODate): number {
  const b = parseISODate(birth);
  const t = parseISODate(on);
  let months = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
  if (t.getDate() < b.getDate()) months -= 1;
  return Math.max(0, months);
}

export function fmtDuration(sec?: number) {
  if (!sec && sec !== 0) return '';
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || full;
}

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

export function plural(n: number, one: string, many = one + 's') {
  return `${n} ${n === 1 ? one : many}`;
}
