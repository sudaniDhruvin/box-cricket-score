import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import type { MatchSummary } from '../types/match';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';
import {
  formatMatchResult,
  formatOvers,
  formatPlayedTime,
  isMatchLive,
  matchAggregateFours,
  matchAggregateRuns,
  matchAggregateSixes,
  matchTotalExtras,
  matchTotalOversDisplay,
} from '../utils/cricketFormat';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MatchCardProps {
  match: MatchSummary;
  /** Optional — e.g. navigate to match detail */
  onPress?: () => void;
}

const SPRING = {
  friction: 7,
  tension: 320,
  useNativeDriver: true as const,
};

export function MatchCard({ match: m, onPress }: MatchCardProps) {
  const [first, second] = m.innings;
  const live = isMatchLive(m);
  const { headline, loserDetail } = formatMatchResult(m);
  const extras = matchTotalExtras(m);
  const extrasTotal = extras.wides + extras.noBalls + extras.byes;

  const scale = useRef(new Animated.Value(1)).current;
  const [extrasOpen, setExtrasOpen] = useState(false);

  const pump = useCallback(() => {
    Animated.spring(scale, { toValue: 0.98, ...SPRING }).start();
  }, [scale]);

  const release = useCallback(() => {
    Animated.spring(scale, { toValue: 1, ...SPRING }).start();
  }, [scale]);

  const toggleExtras = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExtrasOpen(v => !v);
  }, []);

  const ripple =
    Platform.OS === 'android'
      ? { color: 'rgba(1, 180, 137, 0.18)', foreground: false }
      : undefined;

  const winnerFirst =
    !live && first.teamId === m.winnerTeamId;
  const winnerSecond =
    !live && second.teamId === m.winnerTeamId;

  return (
    <Animated.View style={[styles.cardOuter, { transform: [{ scale }] }]}>
      <View style={styles.accentBar} />
      <View style={styles.cardInner}>
        <Pressable
          onPress={onPress}
          onPressIn={pump}
          onPressOut={release}
          android_ripple={ripple}
          style={({ pressed }) => [
            styles.mainPressable,
            pressed && Platform.OS === 'ios' && styles.mainPressed,
          ]}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityHint={
            onPress ? 'Opens match details' : undefined
          }>
          <View style={styles.cardTop}>
            <Text style={live ? styles.liveBadge : styles.liveHint}>
              {live ? 'Live' : 'Finished'}
            </Text>
            <Text style={styles.time}>{formatPlayedTime(m.playedAt)}</Text>
          </View>

          <View style={styles.teamsRow}>
            <View style={styles.teamCol}>
              <View
                style={[
                  styles.nameRow,
                  !winnerFirst && styles.nameRowLoser,
                ]}>
                {winnerFirst ? (
                  <View style={styles.winBadge}>
                    <Text style={styles.winBadgeText}>W</Text>
                  </View>
                ) : null}
                <Text
                  style={[
                    styles.teamName,
                    !winnerFirst && styles.teamNameLoser,
                  ]}
                  numberOfLines={1}>
                  {first.teamName}
                </Text>
              </View>
              <Text
                style={[
                  styles.scoreLine,
                  !winnerFirst && styles.scoreLineLoser,
                ]}>
                {first.runs}/{first.wickets}{' '}
                <Text style={styles.oversInline}>({formatOvers(first.overs)})</Text>
              </Text>
            </View>

            <View style={styles.vsPill}>
              <Text style={styles.vsText}>vs</Text>
            </View>

            <View style={[styles.teamCol, styles.teamColRight]}>
              <View
                style={[
                  styles.nameRow,
                  styles.nameRowRight,
                  !winnerSecond && styles.nameRowLoser,
                ]}>
                <Text
                  style={[
                    styles.teamName,
                    styles.teamNameRight,
                    !winnerSecond && styles.teamNameLoser,
                  ]}
                  numberOfLines={1}>
                  {second.teamName}
                </Text>
                {winnerSecond ? (
                  <View style={styles.winBadge}>
                    <Text style={styles.winBadgeText}>W</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.scoreLine,
                  styles.scoreLineRight,
                  !winnerSecond && styles.scoreLineLoser,
                ]}>
                {second.runs}/{second.wickets}{' '}
                <Text style={styles.oversInline}>
                  ({formatOvers(second.overs)})
                </Text>
              </Text>
            </View>
          </View>

          <View style={styles.resultPanel}>
            <Text style={styles.resultLabel}>Result</Text>
            <Text style={styles.resultHeadline}>{headline}</Text>
            <Text style={styles.loserLine}>{loserDetail}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>Runs</Text>
              <Text style={styles.statValue}>{matchAggregateRuns(m)}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>4s</Text>
              <Text style={styles.statValue}>{matchAggregateFours(m)}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>6s</Text>
              <Text style={styles.statValue}>{matchAggregateSixes(m)}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>Ov</Text>
              <Text style={styles.statValue}>{matchTotalOversDisplay(m)}</Text>
            </View>
          </View>

          {onPress ? (
            <View style={styles.ctaRow}>
              <Text style={styles.ctaText}>View match</Text>
              <Text style={styles.ctaChevron}>›</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={toggleExtras}
          onPressIn={pump}
          onPressOut={release}
          android_ripple={ripple}
          style={({ pressed }) => [
            styles.extrasPressable,
            pressed && Platform.OS === 'ios' && styles.extrasPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            extrasOpen ? 'Hide extras breakdown' : 'Show extras breakdown'
          }>
          <View style={styles.extrasHeader}>
            <Text style={styles.extrasLabel}>Extras</Text>
            <Text style={styles.extrasSummary}>
              {extrasTotal} total
              {!extrasOpen ? (
                <Text style={styles.extrasHint}> · tap to expand</Text>
              ) : null}
            </Text>
            <Text style={[styles.extrasCaret, extrasOpen && styles.extrasCaretOpen]}>
              {'\u25BC'}
            </Text>
          </View>
          {extrasOpen ? (
            <View style={styles.extrasBreakdown}>
              <View style={styles.extrasLine}>
                <Text style={styles.extrasLineLabel}>Wides</Text>
                <Text style={styles.extrasLineVal}>{extras.wides}</Text>
              </View>
              <View style={styles.extrasLine}>
                <Text style={styles.extrasLineLabel}>No-balls</Text>
                <Text style={styles.extrasLineVal}>{extras.noBalls}</Text>
              </View>
              <View style={styles.extrasLine}>
                <Text style={styles.extrasLineLabel}>Byes</Text>
                <Text style={styles.extrasLineVal}>{extras.byes}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.extrasInline} numberOfLines={1}>
              Wd {extras.wides}
              {extras.noBalls > 0 ? ` · Nb ${extras.noBalls}` : ''}
              {extras.byes > 0 ? ` · By ${extras.byes}` : ''}
            </Text>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    marginBottom: hp(1.4),
    borderRadius: wp(3.5),
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#070707',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  accentBar: {
    height: hp(0.45),
    backgroundColor: colors.primary,
    width: '100%',
  },
  cardInner: {
    overflow: 'hidden',
  },
  mainPressable: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1.4),
    paddingBottom: hp(1),
  },
  mainPressed: {
    backgroundColor: colors.primaryFaint,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  liveHint: {
    fontSize: fontSize(10),
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.primary,
    textTransform: 'uppercase',
    overflow: 'hidden',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.35),
    backgroundColor: colors.primarySoft,
    borderRadius: wp(1.5),
  },
  liveBadge: {
    fontSize: fontSize(10),
    fontWeight: '900',
    letterSpacing: 0.9,
    color: colors.background,
    textTransform: 'uppercase',
    overflow: 'hidden',
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.35),
    backgroundColor: colors.primary,
    borderRadius: wp(1.5),
  },
  time: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.textMuted,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  teamCol: {
    flex: 1,
    minWidth: 0,
  },
  teamColRight: {
    alignItems: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginBottom: hp(0.35),
    maxWidth: '100%',
  },
  nameRowRight: {
    flexDirection: 'row-reverse',
  },
  nameRowLoser: {
    opacity: 0.92,
  },
  winBadge: {
    minWidth: wp(5.5),
    height: wp(5.5),
    borderRadius: wp(2.75),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winBadgeText: {
    fontSize: fontSize(10),
    fontWeight: '900',
    color: colors.background,
  },
  teamName: {
    flexShrink: 1,
    fontSize: fontSize(15),
    fontWeight: '800',
    color: colors.text,
  },
  teamNameRight: {
    textAlign: 'right',
  },
  teamNameLoser: {
    color: colors.loserMuted,
  },
  scoreLine: {
    fontSize: fontSize(17),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.3,
  },
  scoreLineRight: {
    textAlign: 'right',
  },
  scoreLineLoser: {
    color: colors.textMuted,
  },
  oversInline: {
    fontSize: fontSize(13),
    fontWeight: '700',
    color: colors.textMuted,
  },
  vsPill: {
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.45),
    borderRadius: wp(2.5),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    marginHorizontal: wp(1.5),
    marginTop: hp(0.35),
  },
  vsText: {
    fontSize: fontSize(11),
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  resultPanel: {
    marginTop: hp(1.2),
    paddingVertical: hp(1.1),
    paddingHorizontal: wp(3),
    backgroundColor: colors.surfaceMuted,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: colors.primaryFaint,
  },
  resultLabel: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: hp(0.35),
  },
  resultHeadline: {
    fontSize: fontSize(14),
    fontWeight: '800',
    color: colors.primary,
    marginBottom: hp(0.35),
  },
  loserLine: {
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    fontWeight: '600',
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginTop: hp(1.2),
    gap: wp(1.8),
  },
  statPill: {
    flex: 1,
    minWidth: 0,
    paddingVertical: hp(0.85),
    paddingHorizontal: wp(1),
    borderRadius: wp(2),
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize(9),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: hp(0.15),
  },
  statValue: {
    fontSize: fontSize(15),
    fontWeight: '900',
    color: colors.text,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(1.1),
    paddingVertical: hp(0.5),
    gap: wp(0.5),
  },
  ctaText: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.primary,
  },
  ctaChevron: {
    fontSize: fontSize(18),
    fontWeight: '400',
    color: colors.primary,
    marginTop: -hp(0.2),
  },
  extrasPressable: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: hp(1.4),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  extrasPressed: {
    backgroundColor: colors.primaryFaint,
  },
  extrasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: hp(0.35),
  },
  extrasLabel: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.text,
    marginRight: wp(2),
  },
  extrasSummary: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  extrasHint: {
    fontWeight: '600',
    color: colors.textMuted,
  },
  extrasCaret: {
    fontSize: fontSize(14),
    color: colors.primary,
    fontWeight: '800',
    marginLeft: wp(1),
  },
  extrasCaretOpen: {
    transform: [{ rotate: '180deg' }],
  },
  extrasInline: {
    fontSize: fontSize(11),
    fontWeight: '600',
    color: colors.textMuted,
  },
  extrasBreakdown: {
    marginTop: hp(0.6),
    gap: hp(0.5),
  },
  extrasLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(0.35),
    paddingHorizontal: wp(2),
    backgroundColor: colors.surfaceMuted,
    borderRadius: wp(1.5),
  },
  extrasLineLabel: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
  },
  extrasLineVal: {
    fontSize: fontSize(14),
    fontWeight: '900',
    color: colors.text,
  },
});
