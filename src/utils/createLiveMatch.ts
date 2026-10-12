import type { MatchSummary, TeamInnings } from '../types/match';
import { emptySquad } from './playerInnings';
import { DEFAULT_WICKETS_PER_SIDE } from './applyScoringDelivery';

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
  /** Dismissals before all out (e.g. 4 for four players, 10 for a full team). */
  wicketsPerSide: number;
  /** 0 = team A bats first (1st innings), 1 = team B bats first */
  batFirst: 0 | 1;
  groupId?: string;
  /** Players on team A, not including the shared W player. */
  teamAPlayerIds?: string[];
  /** Players on team B, not including the shared W player. */
  teamBPlayerIds?: string[];
  /** One player who bats for both teams. */
  wildcardPlayerId?: string | null;
}

export function createLiveMatch(input: NewMatchInput): MatchSummary {
  const ts = Date.now();
  const idA = `u-${ts}-a`;
  const idB = `u-${ts}-b`;

  const innA = emptyInnings(idA, input.teamAName.trim());
  const innB = emptyInnings(idB, input.teamBName.trim());

  const [first, second] = input.batFirst === 0 ? [innA, innB] : [innB, innA];
  const teamAIds = input.teamAPlayerIds ?? [];
  const teamBIds = input.teamBPlayerIds ?? [];
  const squad =
    input.groupId != null
      ? emptySquad(
          input.groupId,
          input.batFirst === 0 ? teamAIds : teamBIds,
          input.batFirst === 0 ? teamBIds : teamAIds,
          input.wildcardPlayerId ?? null,
        )
      : undefined;

  return {
    id: `m-${ts}`,
    playedAt: new Date().toISOString(),
    innings: [first, second],
    winnerTeamId: first.teamId,
    loserTeamId: second.teamId,
    margin: { kind: 'runs', byRuns: 0 },
    status: 'live',
    oversPerSide: input.oversPerSide,
    wicketsPerSide: input.wicketsPerSide,
    scoringActiveInnings: 0,
    ...(squad != null ? { squad } : {}),
  };
}

/** Fresh live match with the same teams, overs, wickets, and batting order. */
export function createRepeatMatch(source: MatchSummary): MatchSummary {
  const [first, second] = source.innings;
  const squad = source.squad;
  return createLiveMatch({
    teamAName: first.teamName,
    teamBName: second.teamName,
    oversPerSide: source.oversPerSide ?? 10,
    wicketsPerSide: source.wicketsPerSide ?? DEFAULT_WICKETS_PER_SIDE,
    batFirst: 0,
    groupId: squad?.groupId,
    teamAPlayerIds: squad?.firstInningsPlayerIds,
    teamBPlayerIds: squad?.secondInningsPlayerIds,
    wildcardPlayerId: squad?.wildcardPlayerId,
  });
}
