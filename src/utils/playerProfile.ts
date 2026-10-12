import type { MatchSummary } from '../types/match';
import type { BattingLine, BowlingLine } from '../types/squad';

export interface PlayerMatchRow {
  matchId: string;
  playedAt: string;
  title: string;
  batting: BattingLine[];
  bowling: BowlingLine[];
}

export interface PlayerProfile {
  matchCount: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  highScore: number | null;
  dismissals: number;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
  rows: PlayerMatchRow[];
}

function findLine<T extends { playerId: string }>(
  lines: T[] | undefined,
  playerId: string,
): T | null {
  return lines?.find(line => line.playerId === playerId) ?? null;
}

export function buildPlayerProfile(
  playerId: string,
  matches: MatchSummary[],
): PlayerProfile {
  const rows: PlayerMatchRow[] = [];
  let runs = 0;
  let balls = 0;
  let fours = 0;
  let sixes = 0;
  let highScore: number | null = null;
  let dismissals = 0;
  let wickets = 0;
  let ballsBowled = 0;
  let runsConceded = 0;

  const ordered = [...matches].sort(
    (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime(),
  );

  for (const match of ordered) {
    const squad = match.squad;
    if (squad == null) {
      continue;
    }
    const involved =
      squad.firstInningsPlayerIds.includes(playerId) ||
      squad.secondInningsPlayerIds.includes(playerId) ||
      squad.wildcardPlayerId === playerId;
    if (!involved) {
      continue;
    }

    const batting: BattingLine[] = [];
    const bowling: BowlingLine[] = [];
    for (const index of [0, 1] as const) {
      const bat = findLine(squad.batting[index], playerId);
      const bowl = findLine(squad.bowling[index], playerId);
      if (bat != null) {
        batting.push(bat);
        runs += bat.runs;
        balls += bat.balls;
        fours += bat.fours;
        sixes += bat.sixes;
        if (highScore == null || bat.runs > highScore) {
          highScore = bat.runs;
        }
        if (bat.dismissal != null) {
          dismissals += 1;
        }
      }
      if (bowl != null) {
        bowling.push(bowl);
        wickets += bowl.wickets;
        ballsBowled += bowl.legalBalls;
        runsConceded += bowl.runs;
      }
    }

    rows.push({
      matchId: match.id,
      playedAt: match.playedAt,
      title: `${match.innings[0].teamName} vs ${match.innings[1].teamName}`,
      batting,
      bowling,
    });
  }

  return {
    matchCount: rows.length,
    runs,
    balls,
    fours,
    sixes,
    highScore,
    dismissals,
    wickets,
    ballsBowled,
    runsConceded,
    rows,
  };
}

export function formatStrikeRate(runs: number, balls: number): string {
  if (balls <= 0) {
    return '–';
  }
  return ((runs * 100) / balls).toFixed(1);
}

export function formatAverage(runs: number, dismissals: number): string {
  if (dismissals <= 0) {
    return '–';
  }
  return (runs / dismissals).toFixed(1);
}

export function formatEconomy(runs: number, ballsBowled: number): string {
  if (ballsBowled <= 0) {
    return '–';
  }
  const overs = ballsBowled / 6;
  return (runs / overs).toFixed(1);
}

export function formatBowlerOvers(ballsBowled: number): string {
  return `${Math.floor(ballsBowled / 6)}.${ballsBowled % 6}`;
}

export function shareProfileText(input: {
  playerName: string;
  groupName: string;
  profile: PlayerProfile;
}): string {
  const { playerName, groupName, profile } = input;
  const high =
    profile.highScore == null ? '–' : String(profile.highScore);
  return [
    `${playerName} · ${groupName}`,
    `${profile.matchCount} ${profile.matchCount === 1 ? 'match' : 'matches'}`,
    `Batting ${profile.runs} runs · HS ${high} · SR ${formatStrikeRate(
      profile.runs,
      profile.balls,
    )}`,
    `Bowling ${profile.wickets} wickets · Econ ${formatEconomy(
      profile.runsConceded,
      profile.ballsBowled,
    )}`,
  ].join('\n');
}
