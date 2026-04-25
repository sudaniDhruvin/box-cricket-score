import type { MatchSummary, OversBowled } from '../types/match';

export function formatPlayedTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatPlayedDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatOvers(o: OversBowled): string {
  return `${o.fullOvers}.${o.balls}`;
}

/** Completed legal deliveries in the innings (6 per full over + balls in the current over). */
export function legalBallsBowled(o: OversBowled): number {
  return o.fullOvers * 6 + o.balls;
}

/**
 * Runs per over from legal balls faced.
 * Returns null when no legal ball has been bowled yet.
 */
export function runRateFromLegalBalls(
  runs: number,
  legalBalls: number,
): number | null {
  if (legalBalls <= 0) {
    return null;
  }
  return (runs * 6) / legalBalls;
}

export function formatRunRate(rr: number | null): string {
  if (rr == null) {
    return '—';
  }
  return rr.toFixed(2);
}

export function matchAggregateRuns(m: MatchSummary): number {
  return m.innings[0].runs + m.innings[1].runs;
}

export function matchAggregateFours(m: MatchSummary): number {
  return m.innings[0].fours + m.innings[1].fours;
}

export function matchAggregateSixes(m: MatchSummary): number {
  return m.innings[0].sixes + m.innings[1].sixes;
}

/** Total legal overs as a display string (sum of both innings). */
export function matchTotalOversDisplay(m: MatchSummary): string {
  const a = m.innings[0].overs;
  const b = m.innings[1].overs;
  const totalBalls = a.fullOvers * 6 + a.balls + (b.fullOvers * 6 + b.balls);
  const full = Math.floor(totalBalls / 6);
  const balls = totalBalls % 6;
  return `${full}.${balls}`;
}

export function matchTotalExtras(m: MatchSummary): {
  wides: number;
  noBalls: number;
  byes: number;
} {
  const [i0, i1] = m.innings;
  return {
    wides: i0.extras.wides + i1.extras.wides,
    noBalls: i0.extras.noBalls + i1.extras.noBalls,
    byes: (i0.extras.byes ?? 0) + (i1.extras.byes ?? 0),
  };
}

export function teamById(m: MatchSummary, teamId: string) {
  return m.innings.find(i => i.teamId === teamId)!;
}

export function isMatchLive(m: MatchSummary): boolean {
  return m.status === 'live';
}

export function formatMatchResult(m: MatchSummary): {
  headline: string;
  loserDetail: string;
} {
  if (m.status === 'live') {
    const wk = m.wicketsPerSide ?? 10;
    const lim =
      m.oversPerSide != null
        ? `${m.oversPerSide} overs · max ${wk} wkts per innings`
        : 'Overs limit not set';
    return {
      headline: 'Match in progress',
      loserDetail: `${lim} · scores update when you add ball-by-ball scoring.`,
    };
  }

  if (m.margin.kind === 'tie') {
    const runs = m.innings[0].runs;
    return {
      headline: 'Match tied',
      loserDetail: `Scores level at ${runs} · ${m.innings[0].teamName} & ${m.innings[1].teamName}`,
    };
  }

  const winner = teamById(m, m.winnerTeamId);
  const loser = teamById(m, m.loserTeamId);

  let headline: string;
  if (m.margin.kind === 'runs') {
    headline = `${winner.teamName} won by ${m.margin.byRuns} runs`;
  } else {
    const balls = m.margin.ballsRemaining;
    const tail =
      balls != null && balls > 0 ? ` · ${balls} balls left` : '';
    headline = `${winner.teamName} won by ${m.margin.wicketsRemaining} wickets${tail}`;
  }

  let loserDetail: string;
  if (m.margin.kind === 'runs') {
    loserDetail = `${loser.teamName} lost by ${m.margin.byRuns} runs`;
  } else {
    const br = m.margin.ballsRemaining;
    const ballsPart =
      br != null && br > 0 ? ` · ${br} balls left` : '';
    loserDetail = `${loser.teamName} lost by ${m.margin.wicketsRemaining} wickets${ballsPart}`;
  }

  return { headline, loserDetail };
}
