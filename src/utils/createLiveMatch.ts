import type { MatchSummary, TeamInnings } from '../types/match';

function emptyInnings(teamId: string, teamName: string): TeamInnings {
  return {
    teamId,
    teamName,
    runs: 0,
    wickets: 0,
    overs: { fullOvers: 0, balls: 0 },
    fours: 0,
    sixes: 0,
    extras: { wides: 0, noBalls: 0, byes: 0 },
    overReplay: [],
  };
}

export interface NewMatchInput {
  teamAName: string;
  teamBName: string;
  oversPerSide: number;
  /** 0 = team A bats first (1st innings), 1 = team B bats first */
  batFirst: 0 | 1;
}

export function createLiveMatch(input: NewMatchInput): MatchSummary {
  const ts = Date.now();
  const idA = `u-${ts}-a`;
  const idB = `u-${ts}-b`;

  const innA = emptyInnings(idA, input.teamAName.trim());
  const innB = emptyInnings(idB, input.teamBName.trim());

  const [first, second] = input.batFirst === 0 ? [innA, innB] : [innB, innA];

  return {
    id: `m-${ts}`,
    playedAt: new Date().toISOString(),
    innings: [first, second],
    winnerTeamId: first.teamId,
    loserTeamId: second.teamId,
    margin: { kind: 'runs', byRuns: 0 },
    status: 'live',
    oversPerSide: input.oversPerSide,
    scoringActiveInnings: 0,
  };
}
