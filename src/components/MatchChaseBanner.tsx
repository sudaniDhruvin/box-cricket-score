import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { ChaseInfo } from '../utils/cricketFormat';
import { formatChaseHomeLine } from '../utils/cricketFormat';
import { fontSize, hp, wp } from '../utils';

export interface MatchChaseBannerProps {
  chase: ChaseInfo;
  battingTeamName: string;
  variant?: 'card' | 'detail';
}

/** Shared chase summary for home cards and match detail (UX-020). */
export function MatchChaseBanner({
  chase,
  battingTeamName,
  variant = 'card',
}: MatchChaseBannerProps) {
  const isDetail = variant === 'detail';
  return (
    <View style={[styles.wrap, isDetail && styles.wrapDetail]}>
      <Text style={styles.label}>Chase</Text>
      <Text style={styles.headline}>{formatChaseHomeLine(chase)}</Text>
      <Text style={styles.sub}>
        {battingTeamName} batting
        {isDetail ? '' : ' · tap to score or view'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: hp(1.2),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    backgroundColor: colors.primary,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: 'rgba(1, 180, 137, 0.35)',
  },
  wrapDetail: {
    marginTop: 0,
    marginBottom: hp(1),
  },
  label: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: hp(0.35),
  },
  headline: {
    fontSize: fontSize(15),
    fontWeight: '900',
    color: colors.background,
    lineHeight: fontSize(21),
  },
  sub: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: hp(0.4),
  },
});
