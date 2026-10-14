/** Legal balls in current over (0–5 typical for 6-ball overs). */
export interface OversBowled {
  fullOvers: number;
  balls: number;
}

export interface InningsExtras {
  wides: number;
  noBalls: number;
  byes?: number;
}

/** Single delivery for replay UI (legal ball or extra). */
export type DeliveryType =
  | 'dot'
  | 'single'
  | 'two'
  | 'three'
  | 'five'
  | 'four'
  | 'six'
  | 'wicket'
  | 'wide'
  | 'no-ball'
  | 'bye'
  | 'leg-bye'
  | 'penalty';

export type WicketDismissal =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run-out'
  | 'stumped'
  | 'hit-wicket'
  | 'retired-hurt'
  | 'other';

/** Players involved in one delivery. Omitted for team-total scoring. */
export interface DeliveryPlayers {
  strikerId: number;
  nonStrikerId?: number;
  bowlerId: number;
  dismissedId?: number;
  /** Catcher, wicketkeeper, or the fielders in a run-out. */
  fielderIds?: number[];
}

export interface Delivery {
  type: DeliveryType;
  /** Short label on the chip, e.g. "0", "1", "4", "6", "W", "Wd", "Wd+2", "Nb+4" */
  label: string;
  /** Runs in addition to the 1 wide penalty (0 = plain wide). */
  wideRuns?: number;
  /** Runs scored off the no-ball in addition to the 1 penalty (0 = none). */
  noBallRuns?: number;
  wicketDismissal?: WicketDismissal;
  /** Team runs completed on this ball before the wicket (e.g. run-out after one run). */
  wicketRuns?: number;
  players?: DeliveryPlayers;
}

export interface SquadPlayer {
  userId: number;
  name: string;
}

/** Playing side for one team, aligned by teamId with an innings. */
export interface MatchSquad {
  teamId: string;
  name: string;
  players: SquadPlayer[];
}

/** Who is at the crease and who has the ball for one innings. */
export interface InningsCrew {
  strikerId: number | null;
  nonStrikerId: number | null;
  bowlerId: number | null;
  /** Batting side still to come in. */
  yetToBat: number[];
  dismissedIds: number[];
}

export interface MatchToss {
  winnerTeamId: string;
  elected: 'bat' | 'bowl';
}

export type MatchResultKind = 'win' | 'tie' | 'draw' | 'no-result';

export interface OverReplay {
  overNumber: number;
  /** Deliveries in chronological order for this over (legal + extras). */
  deliveries: Delivery[];
}

export interface TeamInnings {
  teamId: string;
  teamName: string;
  runs: number;
  wickets: number;
  overs: OversBowled;
  fours: number;
  sixes: number;
  extras: InningsExtras;
  /** Optional explicit ball-by-ball; otherwise derived in the UI layer. */
  overReplay?: OverReplay[];
}

export type MatchMargin =
  | { kind: 'runs'; byRuns: number }
  | {
      kind: 'wickets';
      wicketsRemaining: number;
      ballsRemaining?: number;
    }
  /** Scores level when the second innings ends (same total). */
  | { kind: 'tie' };

export type MatchStatus = 'live' | 'completed';

export interface MatchSummary {
  id: string;
  /** Optional link to a group match session created by the community API. */
  groupId?: number;
  visibility?: 'private' | 'group' | 'public';
  /** Local/cloud sync bookkeeping. It is stripped before a match is sent to the API. */
  syncMeta?: {
    state: 'pending' | 'synced';
    updatedAt: string;
    ownerId?: number;
    clientId?: string;
    revision?: number;
  };
  /** ISO 8601 value used for day grouping and ordering */
  playedAt: string;
  innings: [TeamInnings, TeamInnings];
  winnerTeamId: string;
  loserTeamId: string;
  margin: MatchMargin;
  /** Omitted or `completed` for finished games; `live` while scoring. */
  status?: MatchStatus;
  /** Box limit per innings (for display / future scorer). */
  oversPerSide?: number;
  /**
   * Wickets to lose before an innings is all out (e.g. 4 for 4-a-side, 10 for full sides).
   * Omitted in older saves, treat as 10.
   */
  wicketsPerSide?: number;
  /** While live: which innings index is being scored (0 = first). */
  scoringActiveInnings?: 0 | 1;
  /** Playing sides. Absent for quick team-total matches. */
  squads?: MatchSquad[];
  /** Crease and bowler for each innings. Index matches `innings`. */
  crews?: [InningsCrew, InningsCrew];
  toss?: MatchToss;
  /** Set when the scorer closes the match. */
  result?: MatchResultKind;
  /** Ball-by-ball can no longer change. */
  locked?: boolean;
  /** Group member allowed to enter the live score. */
  scorerUserId?: number;
}
