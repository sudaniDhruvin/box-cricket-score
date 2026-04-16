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
  | 'bye';

export type WicketDismissal =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run-out'
  | 'stumped'
  | 'hit-wicket'
  | 'other';

export interface Delivery {
  type: DeliveryType;
  /** Short label on the chip, e.g. "0", "1", "4", "6", "W", "Wd", "Wd+2", "Nb+4" */
  label: string;
  /** Runs in addition to the 1 wide penalty (0 = plain wide). */
  wideRuns?: number;
  /** Runs scored off the no-ball in addition to the 1 penalty (0 = none). */
  noBallRuns?: number;
  wicketDismissal?: WicketDismissal;
}

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
  /** ISO 8601 — used for day grouping and ordering */
  playedAt: string;
  innings: [TeamInnings, TeamInnings];
  winnerTeamId: string;
  loserTeamId: string;
  margin: MatchMargin;
  /** Omitted or `completed` for finished games; `live` while scoring. */
  status?: MatchStatus;
  /** Box limit per innings (for display / future scorer). */
  oversPerSide?: number;
  /** While live: which innings index is being scored (0 = first). */
  scoringActiveInnings?: 0 | 1;
}
