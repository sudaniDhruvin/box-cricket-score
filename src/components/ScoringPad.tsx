import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { colors } from '../theme/colors';
import { ScoringExtrasLegend } from './ScoringExtrasLegend';
import { animateScoringLayout } from '../utils/scoringMotion';
import { fontSize, hp, wp } from '../utils';

const RUNS_ROW: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [0, 1, 2, 3, 4, 5, 6];

export interface ScoringPadProps {
  onRun: (runs: 0 | 1 | 2 | 3 | 4 | 5 | 6) => void;
  onWide: () => void;
  onNoBall: () => void;
  onBye: () => void;
  onWidePlus: (n: 1 | 2 | 4) => void;
  onNoBallPlus: (n: 1 | 4 | 6) => void;
  onWicket: () => void;
  extrasMoreOpen: boolean;
  onToggleExtrasMore: () => void;
}

/** Thumb-zone scoring controls — fixed above ad banner. */
export function ScoringPad({
  onRun,
  onWide,
  onNoBall,
  onBye,
  onWidePlus,
  onNoBallPlus,
  onWicket,
  extrasMoreOpen,
  onToggleExtrasMore,
}: ScoringPadProps) {
  const cellW = (wp(100) - wp(8) - wp(1.5) * 3) / 4;

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>Record ball</Text>
      <View style={styles.runsGrid}>
        {RUNS_ROW.map(r => (
          <PressableScale
            key={r}
            onPress={() => onRun(r)}
            scaleTo={0.92}
            feedbackKind="none"
            pressTint
            haptic={false}
            containerStyle={{ width: cellW, maxWidth: wp(22) }}
            style={styles.runCell}
            accessibilityLabel={`${r} runs`}
            accessibilityRole="button"
          >
            <Text style={styles.runText}>{r}</Text>
          </PressableScale>
        ))}
      </View>

      <View style={styles.extrasRow}>
        <PressableScale
          onPress={onWide}
          scaleTo={0.94}
          feedbackKind="none"
          pressTint
          haptic={false}
          containerStyle={styles.extraBtnWrap}
          style={[styles.extraBtn, styles.extraWd]}
          accessibilityRole="button"
          accessibilityLabel="Wide"
        >
          <Text style={styles.extraText}>Wd</Text>
        </PressableScale>
        <PressableScale
          onPress={onNoBall}
          scaleTo={0.94}
          feedbackKind="none"
          pressTint
          haptic={false}
          containerStyle={styles.extraBtnWrap}
          style={[styles.extraBtn, styles.extraNb]}
          accessibilityRole="button"
          accessibilityLabel="No ball"
        >
          <Text style={styles.extraText}>Nb</Text>
        </PressableScale>
        <PressableScale
          onPress={onBye}
          scaleTo={0.94}
          feedbackKind="none"
          pressTint
          haptic={false}
          containerStyle={styles.extraBtnWrap}
          style={[styles.extraBtn, styles.extraBy]}
          accessibilityRole="button"
          accessibilityLabel="Bye"
        >
          <Text style={styles.extraText}>By</Text>
        </PressableScale>
        <PressableScale
          onPress={() => {
            animateScoringLayout();
            onToggleExtrasMore();
          }}
          scaleTo={0.94}
          pressTint
          style={[
            styles.moreBtn,
            extrasMoreOpen && styles.moreBtnOpen,
          ]}
          accessibilityRole="button"
          accessibilityLabel={extrasMoreOpen ? 'Hide extras' : 'More extras'}
        >
          <Text style={styles.moreText}>{extrasMoreOpen ? '−' : '+'}</Text>
        </PressableScale>
      </View>

      {extrasMoreOpen ? (
        <View style={styles.extrasMoreRow}>
          {([1, 2, 4] as const).map(n => (
            <PressableScale
              key={`w${n}`}
              onPress={() => onWidePlus(n)}
              scaleTo={0.93}
              feedbackKind="none"
              pressTint
              haptic={false}
              style={[styles.smallExtra, styles.extraWd]}
              accessibilityRole="button"
            >
              <Text style={styles.smallExtraText}>Wd+{n}</Text>
            </PressableScale>
          ))}
          {([1, 4, 6] as const).map(n => (
            <PressableScale
              key={`n${n}`}
              onPress={() => onNoBallPlus(n)}
              scaleTo={0.93}
              feedbackKind="none"
              pressTint
              haptic={false}
              style={[styles.smallExtra, styles.extraNbRun]}
              accessibilityRole="button"
            >
              <Text style={styles.smallExtraText}>Nb+{n}</Text>
            </PressableScale>
          ))}
        </View>
      ) : (
        <ScoringExtrasLegend />
      )}

      <PressableScale
        onPress={onWicket}
        scaleTo={0.96}
        feedbackKind="none"
        haptic={false}
        containerStyle={styles.wicketBtnWrap}
        style={styles.wicketBtn}
        accessibilityLabel="Log wicket"
        accessibilityRole="button"
      >
        <Text style={styles.wicketText}>Wicket</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: hp(0.6),
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  kicker: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: hp(0.5),
  },
  runsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.4),
    marginBottom: hp(0.6),
  },
  runCell: {
    height: hp(5.8),
    borderRadius: wp(2.5),
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runText: {
    fontSize: fontSize(22),
    fontWeight: '900',
    color: colors.text,
  },
  extrasRow: {
    flexDirection: 'row',
    gap: wp(1.5),
    marginVertical: hp(1),
  },
  extraBtnWrap: {
    flex: 1,
  },
  extraBtn: {
    paddingVertical: hp(1),
    borderRadius: wp(2.5),
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  extraWd: { borderColor: colors.ballWide },
  extraNb: { borderColor: colors.ballNoBall },
  extraBy: { borderColor: colors.ballBye },
  extraText: {
    fontSize: fontSize(15),
    fontWeight: '900',
    color: colors.text,
  },
  moreBtn: {
    width: wp(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: wp(2.5),
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  moreBtnOpen: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  moreText: {
    fontSize: fontSize(20),
    fontWeight: '300',
    color: colors.primary,
  },
  extrasMoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
    marginBottom: hp(0.5),
  },
  smallExtra: {
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2),
    borderWidth: 1.5,
    backgroundColor: colors.background,
  },
  extraNbRun: { borderColor: colors.ballNoBallRuns },
  smallExtraText: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: colors.text,
  },
  wicketBtnWrap: {
    marginTop: hp(0.4),
    width: '100%',
  },
  wicketBtn: {
    paddingVertical: hp(1.35),
    borderRadius: wp(2.5),
    backgroundColor: colors.ballWicket,
    alignItems: 'center',
  },
  wicketText: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.background,
  },
});
