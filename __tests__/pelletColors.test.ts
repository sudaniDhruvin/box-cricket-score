import { getPelletStyle, PELLET_COLORS } from '../src/theme/pelletColors';
import type { Delivery } from '../src/types/match';

const ball = (
  type: Delivery['type'],
  label: string,
  extra: Partial<Delivery> = {},
): Delivery => ({ type, label, ...extra });

describe('getPelletStyle', () => {
  it('maps dot, single, multi, four, and six runs', () => {
    expect(getPelletStyle(ball('dot', '0'))).toMatchObject({
      ...PELLET_COLORS.dot,
      label: '•',
      a11yLabel: 'Dot ball',
    });
    expect(getPelletStyle(ball('single', '1'))).toMatchObject({
      ...PELLET_COLORS.single,
      label: '1',
      a11yLabel: 'One run',
    });
    expect(getPelletStyle(ball('two', '2'))).toMatchObject({
      ...PELLET_COLORS.multi,
      label: '2',
      a11yLabel: 'Two runs',
    });
    expect(getPelletStyle(ball('four', '4'))).toMatchObject({
      ...PELLET_COLORS.four,
      label: '4',
      a11yLabel: 'Four runs',
    });
    expect(getPelletStyle(ball('six', '6'))).toMatchObject({
      ...PELLET_COLORS.six,
      label: '6',
      a11yLabel: 'Six runs',
    });
  });

  it('maps wickets and gives them priority over no-ball fields', () => {
    expect(
      getPelletStyle(ball('wicket', 'W', { noBallRuns: 2 })),
    ).toMatchObject({
      ...PELLET_COLORS.wicket,
      label: 'W',
      a11yLabel: 'Wicket',
    });
  });

  it('maps wides and no-balls with additional runs', () => {
    expect(
      getPelletStyle(ball('wide', 'Wd+1', { wideRuns: 1 })),
    ).toMatchObject({
      ...PELLET_COLORS.wide,
      label: 'Wd+1',
      a11yLabel: 'Wide, 1 run completed',
    });
    expect(
      getPelletStyle(ball('no-ball', 'Nb+2', { noBallRuns: 2 })),
    ).toMatchObject({
      ...PELLET_COLORS.noBall,
      label: 'Nb+2',
      a11yLabel: 'No-ball, 2 runs off the bat',
    });
  });

  it('maps bye and leg-bye deliveries', () => {
    expect(getPelletStyle(ball('bye', 'B'))).toMatchObject({
      ...PELLET_COLORS.bye,
      label: 'B',
      a11yLabel: 'Bye',
    });
    expect(getPelletStyle(ball('leg-bye', 'Lb'))).toMatchObject({
      ...PELLET_COLORS.bye,
      label: 'Lb',
      a11yLabel: 'Leg bye',
    });
  });

  it('maps penalty deliveries', () => {
    expect(getPelletStyle(ball('penalty', 'P'))).toMatchObject({
      ...PELLET_COLORS.penalty,
      label: 'P',
      a11yLabel: 'Penalty',
    });
  });
});
