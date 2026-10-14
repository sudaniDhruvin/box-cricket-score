import type { InningsCrew, MatchSquad, MatchSummary, TeamInnings } from '../types/match';
import { DEFAULT_WICKETS_PER_SIDE } from './applyScoringDelivery';
import { emptyCrew } from './playerScoring';

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

export interface NewMatchSquadInput {
  players: Array<{ userId: number; name: string }>;
}

export interface NewMatchInput {
  id?: string;
  groupId?: number;
  teamAName: string;
  teamBName: string;
  oversPerSide: number;
  /** Dismissals before all out (e.g. 4 for four players, 10 for a full team). */
  wicketsPerSide: number;
  /** 0 = team A bats first (1st innings), 1 = team B bats first */
  batFirst?: 0 | 1;
  /** When set, the winner's choice decides who bats first. */
  toss?: { winnerSide: 0 | 1; elected: 'bat' | 'bowl' };
  /** Index 0 is team A and index 1 is team B, before the toss. */
  squads?: [NewMatchSquadInput, NewMatchSquadInput];
  scorerUserId?: number;
  playedAt?: string;
}

export function createLiveMatch(input: NewMatchInput): MatchSummary {
  const ts = Date.now();
  const idA = `u-${ts}-a`;
  const idB = `u-${ts}-b`;

  const innA = emptyInnings(idA, input.teamAName.trim());
  const innB = emptyInnings(idB, input.teamBName.trim());

  const batFirst: 0 | 1 = input.toss
    ? (input.toss.elected === 'bat' ? input.toss.winnerSide : (input.toss.winnerSide === 0 ? 1 : 0))
    : (input.batFirst ?? 0);
  const [first, second] = batFirst === 0 ? [innA, innB] : [innB, innA];
  const squads: MatchSquad[] | undefined = input.squads
    ? [
        { teamId: idA, name: innA.teamName, players: input.squads[0].players.map(player => ({ ...player })) },
        { teamId: idB, name: innB.teamName, players: input.squads[1].players.map(player => ({ ...player })) },
      ]
    : undefined;
  const firstSquad = squads?.find(squad => squad.teamId === first.teamId);
  const secondSquad = squads?.find(squad => squad.teamId === second.teamId);

  return {
    id: input.id ?? `m-${ts}`,
    ...(input.groupId ? { groupId: input.groupId, visibility: 'group' as const } : {}),
    ...(input.scorerUserId != null ? { scorerUserId: input.scorerUserId } : {}),
    ...(input.toss
      ? { toss: { winnerTeamId: input.toss.winnerSide === 0 ? idA : idB, elected: input.toss.elected } }
      : {}),
    ...(squads && firstSquad && secondSquad
      ? { squads, crews: [emptyCrew(firstSquad), emptyCrew(secondSquad)] satisfies [InningsCrew, InningsCrew] }
      : {}),
    playedAt: input.playedAt ?? new Date().toISOString(),
    innings: [first, second],
    winnerTeamId: first.teamId,
    loserTeamId: second.teamId,
    margin: { kind: 'runs', byRuns: 0 },
    status: 'live',
    oversPerSide: input.oversPerSide,
    wicketsPerSide: input.wicketsPerSide,
    scoringActiveInnings: 0,
  };
}

/** Fresh live match with the same teams, overs, wickets, and batting order. */
export function createRepeatMatch(source: MatchSummary): MatchSummary {
  const [first, second] = source.innings;
  return createLiveMatch({
    teamAName: first.teamName,
    teamBName: second.teamName,
    oversPerSide: source.oversPerSide ?? 10,
    wicketsPerSide: source.wicketsPerSide ?? DEFAULT_WICKETS_PER_SIDE,
    batFirst: 0,
  });
}
