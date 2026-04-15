import type { MatchSummary } from '../types/match';

export function findSavedMatch(
  id: string,
  matches: MatchSummary[],
): MatchSummary | undefined {
  return matches.find(m => m.id === id);
}
