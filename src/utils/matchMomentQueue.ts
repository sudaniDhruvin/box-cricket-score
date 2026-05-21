import type { MatchMomentKind } from './matchEventFeedback';
import { playMatchMoment } from './matchEventFeedback';

/** Higher = wins when multiple moments fire on one delivery. */
const MOMENT_PRIORITY: Record<MatchMomentKind, number> = {
  'match-complete': 100,
  'innings-break': 90,
  six: 80,
  four: 70,
  wicket: 65,
  'run-out': 64,
  'free-hit': 50,
  'no-ball': 40,
  wide: 35,
  'over-complete': 30,
};

export function pickPrimaryMoment(
  kinds: readonly MatchMomentKind[],
): MatchMomentKind | null {
  if (kinds.length === 0) {
    return null;
  }
  return kinds.reduce((best, k) =>
    MOMENT_PRIORITY[k] > MOMENT_PRIORITY[best] ? k : best,
  );
}

/**
 * Haptic + sound after the score UI has committed — no on-screen overlay.
 */
function deferToNextFrame(fn: () => void): void {
  Promise.resolve().then(() => {
    requestAnimationFrame(fn);
  });
}

export function runAfterScoreCommit(kind: MatchMomentKind): void {
  deferToNextFrame(() => {
    playMatchMoment(kind);
  });
}
