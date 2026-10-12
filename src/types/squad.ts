import type { WicketDismissal } from './match';

/** One player's batting in a single innings. Dismissal stays null while they are still in. */
export interface BattingLine {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissal: WicketDismissal | null;
}

/** One player's bowling in a single innings. */
export interface BowlingLine {
  playerId: string;
  legalBalls: number;
  runs: number;
  wickets: number;
}

export interface Crease {
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
}

/**
 * Player roles for a group match. Stored on the match so undo restores it
 * and a later API can read the same shape.
 */
export interface MatchSquad {
  groupId: string;
  /** Players batting in innings 0 (the team that bats first). */
  firstInningsPlayerIds: string[];
  /** Players batting in innings 1. */
  secondInningsPlayerIds: string[];
  batting: [BattingLine[], BattingLine[]];
  bowling: [BowlingLine[], BowlingLine[]];
  crease: Crease;
  /** Bowler who finished the last completed over. Excluded from the next pick. */
  lastBowlerId: string | null;
  /**
   * One shared player who bats for both teams. They can bowl only while they
   * are not at the crease. Omitted on older matches.
   */
  wildcardPlayerId?: string | null;
}
