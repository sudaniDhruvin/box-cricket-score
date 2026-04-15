import type { MatchSummary } from '../types/match';

export interface MatchDaySection {
  title: string;
  sortKey: string;
  data: MatchSummary[];
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function formatSectionTitle(day: Date, now: Date): string {
  if (isSameDay(day, now)) {
    return 'Today';
  }
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (isSameDay(day, y)) {
    return 'Yesterday';
  }
  return day.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function daySortKey(day: Date): string {
  const s = startOfDay(day);
  return s.toISOString().slice(0, 10);
}

/**
 * Groups matches by calendar day (local). Newest day first; within a day, newest match first.
 */
export function groupMatchesByDay(
  matches: MatchSummary[],
  now: Date = new Date(),
): MatchDaySection[] {
  const sorted = [...matches].sort(
    (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime(),
  );

  const map = new Map<string, { day: Date; items: MatchSummary[] }>();

  for (const m of sorted) {
    const d = new Date(m.playedAt);
    const key = daySortKey(d);
    const bucket = map.get(key);
    if (bucket) {
      bucket.items.push(m);
    } else {
      map.set(key, { day: startOfDay(d), items: [m] });
    }
  }

  const keys = [...map.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  return keys.map(k => {
    const { day, items } = map.get(k)!;
    return {
      title: formatSectionTitle(day, now),
      sortKey: k,
      data: items,
    };
  });
}
