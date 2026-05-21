import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { ChaseInfo } from '../utils/cricketFormat';
import { formatRunRate } from '../utils/cricketFormat';
import { fontSize, hp, wp } from '../utils';

export interface ChaseStripProps {
  chase: ChaseInfo;
  currentRunRate: number | null;
  /** Opens scoring guide (UX-045), ideally focused on chase rules. */
  onOpenScoringHelp?: () => void;
}

/**
 * Prominent chase summary for live 2nd innings (AGENTS.md §6.3.3, UX-001).
 */
export function ChaseStrip({
  chase,
  currentRunRate,
  onOpenScoringHelp,
}: ChaseStripProps) {
  const ballsLabel =
    chase.legalBallsRemaining === 1
      ? '1 ball'
      : `${chase.legalBallsRemaining} balls`;

  if (chase.targetReached) {
    return (
      <View
        style={styles.strip}
        accessibilityRole="summary"
        accessibilityLabel={`Target reached. ${chase.target} runs to win.`}
      >
        <Text style={styles.reachedTitle}>Target reached</Text>
        <Text style={styles.reachedSub}>
          {chase.target} runs to win — scores level or ahead
        </Text>
        <View style={styles.ratesRow}>
          <RateCell label="Target" value={String(chase.target)} />
          <RateCell label="Current rate" value={formatRunRate(currentRunRate)} />
        </View>
        {onOpenScoringHelp != null ? (
          <HelpLink onPress={onOpenScoringHelp} />
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={styles.strip}
      accessibilityRole="summary"
      accessibilityLabel={`${chase.need} runs to win from ${ballsLabel}. Target ${chase.target}. Required rate ${formatRunRate(chase.requiredRate)}.`}
    >
      <Text style={styles.heroNumber}>{chase.need}</Text>
      <Text style={styles.heroLabel}>runs to win</Text>
      <Text style={styles.subline}>
        to win from {ballsLabel} ({chase.oversRemainingDisplay} overs)
      </Text>
      <View style={styles.ratesRow}>
        <RateCell
          label="Target"
          value={String(chase.target)}
          hint={`1st innings + 1`}
          highlight
        />
        <RateCell label="Current rate" value={formatRunRate(currentRunRate)} />
        <RateCell
          label="Required rate"
          value={formatRunRate(chase.requiredRate)}
          hint="runs needed per over for the rest of this innings"
          highlight
        />
      </View>
      {onOpenScoringHelp != null ? (
        <HelpLink onPress={onOpenScoringHelp} />
      ) : null}
    </View>
  );
}

function HelpLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.helpLink, pressed && styles.helpLinkPressed]}
      accessibilityRole="button"
      accessibilityLabel="Open scoring guide. Learn about target and required rate."
    >
      <Text style={styles.helpLinkText}>How chase & required rate work</Text>
    </Pressable>
  );
}

function RateCell({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.rateCell, highlight && styles.rateCellHighlight]}>
      <Text style={styles.rateLbl}>{label}</Text>
      <Text style={[styles.rateVal, highlight && styles.rateValHighlight]}>
        {value}
      </Text>
      {hint != null && hint.length > 0 ? (
        <Text style={styles.rateHint} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    marginTop: hp(1.2),
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3.5),
    borderRadius: wp(2.5),
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(1, 180, 137, 0.35)',
  },
  heroNumber: {
    fontSize: fontSize(40),
    fontWeight: '900',
    color: colors.background,
    letterSpacing: -1,
    lineHeight: fontSize(44),
  },
  heroLabel: {
    fontSize: fontSize(14),
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.95)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: -hp(0.2),
  },
  subline: {
    fontSize: fontSize(14),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: hp(0.35),
    marginBottom: hp(1),
  },
  reachedTitle: {
    fontSize: fontSize(22),
    fontWeight: '900',
    color: colors.background,
    letterSpacing: -0.3,
  },
  reachedSub: {
    fontSize: fontSize(15),
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.95)',
    marginTop: hp(0.35),
    marginBottom: hp(1),
  },
  ratesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  rateCell: {
    flexGrow: 1,
    flexBasis: '28%',
    minWidth: wp(28),
    paddingVertical: hp(0.65),
    paddingHorizontal: wp(2),
    borderRadius: wp(2),
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  rateCellHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  rateLbl: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: hp(0.15),
  },
  rateVal: {
    fontSize: fontSize(15),
    fontWeight: '900',
    color: colors.background,
  },
  rateValHighlight: {
    fontSize: fontSize(16),
  },
  rateHint: {
    fontSize: fontSize(9),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: hp(0.25),
    lineHeight: fontSize(12),
  },
  helpLink: {
    marginTop: hp(0.9),
    alignSelf: 'flex-start',
    paddingVertical: hp(0.35),
  },
  helpLinkPressed: {
    opacity: 0.85,
  },
  helpLinkText: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.background,
    textDecorationLine: 'underline',
  },
});
