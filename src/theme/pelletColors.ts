import type { Delivery } from '../types/match';

export const PELLET_COLORS = {
  dot: { bg: '#64748B', fg: '#FFFFFF' },
  single: { bg: '#2563EB', fg: '#FFFFFF' },
  multi: { bg: '#0F766E', fg: '#FFFFFF' },
  four: { bg: '#15803D', fg: '#FFFFFF' },
  six: { bg: '#7C3AED', fg: '#FFFFFF' },
  wicket: { bg: '#DC2626', fg: '#FFFFFF' },
  wide: { bg: '#F59E0B', fg: '#1F2937' },
  noBall: { bg: '#C2410C', fg: '#FFFFFF' },
  bye: { bg: '#0E7490', fg: '#FFFFFF' },
  penalty: { bg: '#BE185D', fg: '#FFFFFF' },
} as const;

export interface PelletStyle {
  bg: string;
  fg: string;
  label: string;
  a11yLabel: string;
}

function extraRunsLabel(prefix: string, runs: number | undefined): string {
  return runs != null && runs > 0 ? `${prefix}+${runs}` : prefix;
}

function runCountLabel(count: number): string {
  return count === 1 ? '1 run' : `${count} runs`;
}

function isLegBye(ball: Delivery): boolean {
  return ball.type === 'leg-bye' ||
    (ball.type === 'bye' && /^lb\b/i.test(ball.label));
}

function penaltyRuns(ball: Delivery): number | undefined {
  if (ball.type !== 'penalty') {
    return undefined;
  }
  const match = /^p\+(\d+)$/i.exec(ball.label);
  return match ? Number(match[1]) : undefined;
}

export function getPelletStyle(ball: Delivery): PelletStyle {
  switch (ball.type) {
    case 'wicket':
      return { ...PELLET_COLORS.wicket, label: 'W', a11yLabel: 'Wicket' };
    case 'no-ball': {
      const label = extraRunsLabel('Nb', ball.noBallRuns);
      const a11yLabel = ball.noBallRuns
        ? `No-ball, ${runCountLabel(ball.noBallRuns)} off the bat`
        : 'No-ball';
      return { ...PELLET_COLORS.noBall, label, a11yLabel };
    }
    case 'wide': {
      const label = extraRunsLabel('Wd', ball.wideRuns);
      const a11yLabel = ball.wideRuns
        ? `Wide, ${runCountLabel(ball.wideRuns)} completed`
        : 'Wide';
      return { ...PELLET_COLORS.wide, label, a11yLabel };
    }
    case 'bye':
    case 'leg-bye': {
      const legBye = isLegBye(ball);
      return {
        ...PELLET_COLORS.bye,
        label: legBye ? 'Lb' : 'B',
        a11yLabel: legBye ? 'Leg bye' : 'Bye',
      };
    }
    case 'penalty': {
      const runs = penaltyRuns(ball);
      return {
        ...PELLET_COLORS.penalty,
        label: runs ? `P+${runs}` : 'P',
        a11yLabel: runs ? `Penalty, ${runCountLabel(runs)}` : 'Penalty',
      };
    }
    case 'dot':
      return { ...PELLET_COLORS.dot, label: '•', a11yLabel: 'Dot ball' };
    case 'single':
      return { ...PELLET_COLORS.single, label: '1', a11yLabel: 'One run' };
    case 'two':
      return { ...PELLET_COLORS.multi, label: '2', a11yLabel: 'Two runs' };
    case 'three':
      return { ...PELLET_COLORS.multi, label: '3', a11yLabel: 'Three runs' };
    case 'five':
      return { ...PELLET_COLORS.multi, label: '5', a11yLabel: 'Five runs' };
    case 'four':
      return { ...PELLET_COLORS.four, label: '4', a11yLabel: 'Four runs' };
    case 'six':
      return { ...PELLET_COLORS.six, label: '6', a11yLabel: 'Six runs' };
  }
}
