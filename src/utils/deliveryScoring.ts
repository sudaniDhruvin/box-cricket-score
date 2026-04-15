import type { Delivery } from '../types/match';

/** Wide and no-ball do not consume a legal ball; all other types do (including bye). */
export function countsAsLegalBall(d: Delivery): boolean {
  return d.type !== 'wide' && d.type !== 'no-ball';
}

/** Total runs credited to the team from this delivery (approximation for extras). */
export function tallyDeliveryRuns(d: Delivery): number {
  switch (d.type) {
    case 'dot':
    case 'wicket':
      return 0;
    case 'single':
      return 1;
    case 'two':
      return 2;
    case 'three':
      return 3;
    case 'five':
      return 5;
    case 'four':
      return 4;
    case 'six':
      return 6;
    case 'wide':
      return 1 + (d.wideRuns ?? 0);
    case 'no-ball':
      return 1 + (d.noBallRuns ?? 0);
    case 'bye':
      return 1;
    default:
      return 0;
  }
}
