import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MatchChaseBanner } from './MatchChaseBanner';
import { colors } from '../theme/colors';
import type { MatchSummary } from '../types/match';
import { computeLiveMatchPhase } from '../utils/cricketFormat';
import { fontSize, hp, wp } from '../utils';

export interface MatchLiveStatusPanelProps {
  match: MatchSummary;
  variant?: 'card' | 'detail';
}

/**
 * Unified live-match status: 1st innings, innings break, or chase.
 */
export function MatchLiveStatusPanel({
  match,
  variant = 'card',
}: MatchLiveStatusPanelProps) {
  const phase = computeLiveMatchPhase(match);
  if (phase == null) {
    return null;
  }

  if (phase.kind === 'chase') {
    return (
      <MatchChaseBanner
        chase={phase.chase}
        battingTeamName={phase.battingTeamName}
        variant={variant}
      />
    );
  }

  if (phase.kind === 'break') {
    return (
      <View style={[styles.panel, styles.breakPanel, variant === 'detail' && styles.detailPanel]}>
        <Text style={styles.breakLabel}>Innings break</Text>
        <Text style={styles.breakHeadline}>
          {phase.firstTeamName} — {phase.scoreLine}
          <Text style={styles.breakOvers}> ({phase.oversDisplay} ov)</Text>
        </Text>
        <Text style={styles.breakSub}>
          1st innings complete · start 2nd innings when ready
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.panel, styles.livePanel, variant === 'detail' && styles.detailPanel]}>
      <Text style={styles.liveLabel}>Live · 1st innings</Text>
      <Text style={styles.liveHeadline}>
        {phase.battingTeamName} — {phase.scoreLine}
        <Text style={styles.liveOvers}> ({phase.oversDisplay} ov)</Text>
      </Text>
      <Text style={styles.liveSub}>
        {variant === 'detail'
          ? 'Continue scoring below'
          : 'Tap continue scoring to add balls'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: hp(1.2),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    borderRadius: wp(2.5),
    borderWidth: 1,
  },
  detailPanel: {
    marginTop: 0,
    marginBottom: hp(1),
  },
  livePanel: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.primaryFaint,
  },
  breakPanel: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  liveLabel: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: hp(0.35),
  },
  breakLabel: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.ballFour,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: hp(0.35),
  },
  liveHeadline: {
    fontSize: fontSize(15),
    fontWeight: '900',
    color: colors.text,
    lineHeight: fontSize(21),
  },
  breakHeadline: {
    fontSize: fontSize(15),
    fontWeight: '900',
    color: colors.text,
    lineHeight: fontSize(21),
  },
  liveOvers: {
    fontSize: fontSize(13),
    fontWeight: '600',
    color: colors.textMuted,
  },
  breakOvers: {
    fontSize: fontSize(13),
    fontWeight: '600',
    color: colors.textMuted,
  },
  liveSub: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: hp(0.4),
  },
  breakSub: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: hp(0.4),
  },
});
