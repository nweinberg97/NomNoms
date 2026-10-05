import type { Baby, Chapter, Memory } from '../lib/types';
import { fmtMonthYear, monthKey, monthOfLife, parseISODate, monthName } from '../lib/util';

/**
 * Chapters are derived, never hand-made: memories are grouped by calendar
 * month, very thin months fold into their neighbour, and each chapter gets a
 * title from what actually happened in it (a first smile → "Finding Your
 * Smile") or, failing that, from the baby's month of life.
 */

const CONTENT_TITLES: [RegExp, string][] = [
  [/\b(born|hello|birth)\b/i, 'Hello, World'],
  [/first smile/i, 'Finding Your Smile'],
  [/first laugh/i, 'Learning to Laugh'],
  [/christmas|hanukkah|holiday/i, 'Your First Holidays'],
  [/snow/i, 'First Snow'],
  [/rolled|roll over/i, 'Rolling Into Things'],
  [/solid|sweet potato|first taste/i, 'Tasting Everything'],
  [/sitting|sat up/i, 'Sitting Up, Looking Out'],
  [/crawl/i, 'On the Move'],
  [/flight|first trip/i, 'Big Wide World'],
  [/beach|ocean/i, 'Salt Air & Summer Light'],
  [/first steps?/i, 'First Steps'],
  [/first word/i, 'Your First Words'],
  [/birthday|one whole year/i, 'One Whole Year'],
  [/halloween|leaves|autumn/i, 'Leaves & Little Fingers'],
];

const BY_MONTH_OF_LIFE = [
  'Hello, World', 'Becoming Curious', 'Little Hands', 'Learning to Laugh', 'Rolling Into Things',
  'Tasting Everything', 'Sitting Up, Looking Out', 'On the Move', 'Pulling Up', 'Big Wide World',
  'Almost Walking', 'First Steps', 'One Whole Year', 'Toddling On',
];

const SEASON = (m: number) => (m <= 1 || m === 11 ? 'Winter' : m <= 4 ? 'Spring' : m <= 7 ? 'Summer' : 'Autumn');

export function buildChapters(baby: Baby, memories: Memory[], overrides: Record<string, string> = {}): Chapter[] {
  const sorted = [...memories].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const months = new Map<string, Memory[]>();
  for (const m of sorted) {
    const k = monthKey(m.date);
    if (!months.has(k)) months.set(k, []);
    months.get(k)!.push(m);
  }

  // fold months with fewer than 3 memories into the previous chapter
  const groups: { keys: string[]; items: Memory[] }[] = [];
  for (const [k, items] of months) {
    const prev = groups[groups.length - 1];
    if (prev && (items.length < 3 || prev.items.length < 3) && prev.keys.length < 2) {
      prev.keys.push(k);
      prev.items.push(...items);
    } else groups.push({ keys: [k], items: [...items] });
  }

  const used = new Set<string>();
  return groups.map((g, index) => {
    const id = `ch-${g.keys[0]}`;
    const start = g.items[0].date;
    const end = g.items[g.items.length - 1].date;
    const text = g.items
      .filter((m) => m.type === 'milestone' || m.type === 'first' || m.milestoneId)
      .map((m) => `${m.title ?? ''}`)
      .join(' | ');
    let title = overrides[id];
    if (!title) {
      for (const [re, t] of CONTENT_TITLES) {
        if (re.test(text) && !used.has(t)) {
          title = t;
          break;
        }
      }
    }
    if (!title) {
      const mol = monthOfLife(baby.birthDate, start);
      const cand = BY_MONTH_OF_LIFE[Math.min(mol, BY_MONTH_OF_LIFE.length - 1)];
      title = used.has(cand) ? `${SEASON(parseISODate(start).getMonth())} Days` : cand;
      if (used.has(title)) title = `${monthName(parseISODate(start).getMonth())} Days`;
    }
    used.add(title);
    const subtitle =
      g.keys.length > 1
        ? `${monthName(parseISODate(start).getMonth())} – ${fmtMonthYear(end)}`
        : fmtMonthYear(start);
    return { id, babyId: baby.id, index, title, subtitle, startDate: start, endDate: end, memoryIds: g.items.map((m) => m.id) };
  });
}
