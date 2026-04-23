import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InningsBallByBall } from '../components/InningsBallByBall';
import type { MainStackParamList } from '../navigation/types';
import { useMatchStore } from '../store/useMatchStore';
import { colors } from '../theme/colors';
import type { TeamInnings } from '../types/match';
import {
  formatMatchResult,
  formatOvers,
  formatPlayedDateLong,
  formatPlayedTime,
  isMatchLive,
} from '../utils/cricketFormat';
import { findSavedMatch } from '../utils/matchLookup';
import { fontSize, hp, wp } from '../utils';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type MatchDetailNav = NativeStackNavigationProp<
  MainStackParamList,
  'MatchDetail'
>;
type MatchDetailRoute = RouteProp<MainStackParamList, 'MatchDetail'>;

function InningsDetail({
  label,
  innings,
  isWinner,
}: {
  label: string;
  innings: TeamInnings;
  isWinner: boolean;
}) {
  const e = innings.extras;
  const extrasSum = e.wides + e.noBalls + (e.byes ?? 0);

  return (
    <View style={styles.inningsCard}>
      <View style={styles.inningsCardHeader}>
        <Text style={styles.inningsLabel}>{label}</Text>
        {isWinner ? (
          <View style={styles.winPill}>
            <Text style={styles.winPillText}>Winner</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.inningsTeamName}>{innings.teamName}</Text>
      <Text style={styles.inningsScore}>
        {innings.runs}/{innings.wickets}
        <Text style={styles.inningsOvers}>
          {' '}
          ({formatOvers(innings.overs)} ov)
        </Text>
      </Text>
      <View style={styles.inningsStatsRow}>
        <View style={styles.inningsStat}>
          <Text style={styles.inningsStatLabel}>4s</Text>
          <Text style={styles.inningsStatVal}>{innings.fours}</Text>
        </View>
        <View style={styles.inningsStat}>
          <Text style={styles.inningsStatLabel}>6s</Text>
          <Text style={styles.inningsStatVal}>{innings.sixes}</Text>
        </View>
        <View style={styles.inningsStat}>
          <Text style={styles.inningsStatLabel}>Extras</Text>
          <Text style={styles.inningsStatVal}>{extrasSum}</Text>
        </View>
      </View>
      <Text style={styles.inningsExtrasDetail}>
        Wd {e.wides}
        {e.noBalls > 0 ? ` · Nb ${e.noBalls}` : ''}
        {(e.byes ?? 0) > 0 ? ` · By ${e.byes}` : ''}
      </Text>

      <Text style={styles.ballByBallTitle}>Ball-by-ball</Text>
      <InningsBallByBall innings={innings} />
    </View>
  );
}

function TeamTabs({
  inn1,
  inn2,
  winnerTeamId,
  activeTab,
  onChange,
}: {
  inn1: TeamInnings;
  inn2: TeamInnings;
  winnerTeamId: string | null;
  activeTab: 0 | 1;
  onChange: (tab: 0 | 1) => void;
}) {
  const win1 =
    winnerTeamId != null && inn1.teamId === winnerTeamId;
  const win2 =
    winnerTeamId != null && inn2.teamId === winnerTeamId;

  return (
    <View style={styles.tabSection}>
      <Text style={styles.tabSectionKicker}>Switch innings</Text>
      <View style={styles.tabTrack}>
        <Pressable
          onPress={() => onChange(0)}
          android_ripple={
            Platform.OS === 'android'
              ? { color: 'rgba(1, 180, 137, 0.12)' }
              : undefined
          }
          style={({ pressed }) => [
            styles.tabHit,
            pressed && styles.tabHitPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 0 }}>
          <View
            style={[
              styles.tabSegment,
              activeTab === 0 && styles.tabSegmentActive,
            ]}>
            <View
              style={[
                styles.tabBadge,
                activeTab === 0 ? styles.tabBadgeActive : styles.tabBadgeIdle,
              ]}>
              <Text
                style={[
                  styles.tabBadgeLetter,
                  activeTab === 0 && styles.tabBadgeLetterActive,
                ]}>
                A
              </Text>
            </View>
            <View style={styles.tabTextBlock}>
              <View style={styles.tabMetaRow}>
                <Text
                  style={[
                    styles.tabInningsTag,
                    activeTab === 0 && styles.tabInningsTagActive,
                  ]}>
                  1st
                </Text>
                {win1 ? (
                  <View style={styles.tabWinnerChip}>
                    <Text style={styles.tabWinnerChipText}>Won</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.tabTeamLabel,
                  activeTab === 0 && styles.tabTeamLabelActive,
                ]}
                numberOfLines={1}>
                {inn1.teamName}
              </Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          onPress={() => onChange(1)}
          android_ripple={
            Platform.OS === 'android'
              ? { color: 'rgba(1, 180, 137, 0.12)' }
              : undefined
          }
          style={({ pressed }) => [
            styles.tabHit,
            pressed && styles.tabHitPressed,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 1 }}>
          <View
            style={[
              styles.tabSegment,
              activeTab === 1 && styles.tabSegmentActive,
            ]}>
            <View
              style={[
                styles.tabBadge,
                activeTab === 1 ? styles.tabBadgeActive : styles.tabBadgeIdle,
              ]}>
              <Text
                style={[
                  styles.tabBadgeLetter,
                  activeTab === 1 && styles.tabBadgeLetterActive,
                ]}>
                B
              </Text>
            </View>
            <View style={styles.tabTextBlock}>
              <View style={styles.tabMetaRow}>
                <Text
                  style={[
                    styles.tabInningsTag,
                    activeTab === 1 && styles.tabInningsTagActive,
                  ]}>
                  2nd
                </Text>
                {win2 ? (
                  <View style={styles.tabWinnerChip}>
                    <Text style={styles.tabWinnerChipText}>Won</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.tabTeamLabel,
                  activeTab === 1 && styles.tabTeamLabelActive,
                ]}
                numberOfLines={1}>
                {inn2.teamName}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export function MatchDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<MatchDetailNav>();
  const { params } = useRoute<MatchDetailRoute>();
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const savedMatches = useMatchStore(s => s.matches);

  const handleTabChange = useCallback((tab: 0 | 1) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  }, []);

  const match = useMemo(
    () => findSavedMatch(params.matchId, savedMatches),
    [params.matchId, savedMatches],
  );

  useLayoutEffect(() => {
    if (!match) {
      navigation.goBack();
    }
  }, [match, navigation]);

  if (!match) {
    return null;
  }

  const [inn1, inn2] = match.innings;
  const { headline, loserDetail } = formatMatchResult(match);
  const live = isMatchLive(match);
  const activeInnings = activeTab === 0 ? inn1 : inn2;
  const matchComplete = !live;
  const tied = matchComplete && match.margin.kind === 'tie';
  const activeIsWinner =
    matchComplete && !tied && activeInnings.teamId === match.winnerTeamId;
  const inningsLabel = activeTab === 0 ? '1st innings' : '2nd innings';
  const winnerForTabs = matchComplete && !tied ? match.winnerTeamId : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <Text style={styles.backChevron}>{'\u2039'}</Text>
          <Text style={styles.backLabel}>Matches</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, hp(4)) },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.accentRule} />

        <Text style={styles.screenTitle}>Match summary</Text>
        <Text style={styles.dateLine}>
          {formatPlayedDateLong(match.playedAt)}
        </Text>
        <Text style={styles.timeLine}>{formatPlayedTime(match.playedAt)}</Text>

        <View style={styles.overviewCard}>
          <View style={styles.overviewBadgeRow}>
            <Text
              style={live ? styles.overviewLiveBadge : styles.overviewFinished}>
              {live ? 'Live' : 'Finished'}
            </Text>
          </View>

          <TeamTabs
            inn1={inn1}
            inn2={inn2}
            winnerTeamId={winnerForTabs}
            activeTab={activeTab}
            onChange={handleTabChange}
          />

          <View style={styles.selectedTeamBlock}>
            <View style={styles.selectedNameRow}>
              {activeIsWinner ? (
                <View style={styles.overviewWinDot}>
                  <Text style={styles.overviewWinDotText}>W</Text>
                </View>
              ) : null}
              <Text style={styles.selectedTeamTitle} numberOfLines={2}>
                {activeInnings.teamName}
              </Text>
            </View>
            <Text
              style={[
                styles.selectedScore,
                !activeIsWinner && styles.overviewLoser,
              ]}>
              {activeInnings.runs}/{activeInnings.wickets}
              <Text style={styles.overviewOvers}>
                {' '}
                ({formatOvers(activeInnings.overs)} ov)
              </Text>
            </Text>
            <View style={styles.teamStatRow}>
              <View style={styles.teamStatCell}>
                <Text style={styles.teamStatLbl}>Runs</Text>
                <Text style={styles.teamStatVal}>{activeInnings.runs}</Text>
              </View>
              <View style={styles.teamStatCell}>
                <Text style={styles.teamStatLbl}>4s</Text>
                <Text style={styles.teamStatVal}>{activeInnings.fours}</Text>
              </View>
              <View style={styles.teamStatCell}>
                <Text style={styles.teamStatLbl}>6s</Text>
                <Text style={styles.teamStatVal}>{activeInnings.sixes}</Text>
              </View>
              <View style={styles.teamStatCell}>
                <Text style={styles.teamStatLbl}>Overs</Text>
                <Text style={styles.teamStatVal}>
                  {formatOvers(activeInnings.overs)}
                </Text>
              </View>
            </View>
            <Text style={styles.teamExtrasLine}>
              Extras:{' '}
              {activeInnings.extras.wides +
                activeInnings.extras.noBalls +
                (activeInnings.extras.byes ?? 0)}{' '}
              · Wd {activeInnings.extras.wides}
              {activeInnings.extras.noBalls > 0
                ? ` · Nb ${activeInnings.extras.noBalls}`
                : ''}
              {(activeInnings.extras.byes ?? 0) > 0
                ? ` · By ${activeInnings.extras.byes}`
                : ''}
            </Text>
          </View>

          <View style={styles.overviewResultBox}>
            <Text style={styles.overviewResultLabel}>Result</Text>
            <Text style={styles.overviewHeadline}>{headline}</Text>
            <Text style={styles.overviewLoserLine}>{loserDetail}</Text>
          </View>

          {live && savedMatches.some(m => m.id === match.id) ? (
            <Pressable
              onPress={() =>
                navigation.navigate('NewMatch', { resumeMatchId: match.id })
              }
              style={({ pressed }) => [
                styles.continueScoreCta,
                pressed && styles.continueScoreCtaPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue scoring this match">
              <Text style={styles.continueScoreCtaText}>Continue scoring</Text>
              <Text style={styles.continueScoreCtaChev}>{'\u203A'}</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.sectionHeading}>Scorecard</Text>
        <InningsDetail
          label={inningsLabel}
          innings={activeInnings}
          isWinner={matchComplete && activeInnings.teamId === match.winnerTeamId}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderRadius: wp(2),
  },
  backBtnPressed: {
    backgroundColor: colors.primaryFaint,
  },
  backChevron: {
    fontSize: fontSize(28),
    fontWeight: '300',
    color: colors.primary,
    marginRight: wp(0.5),
    marginTop: -hp(0.2),
  },
  backLabel: {
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.primary,
  },
  scroll: {
    paddingHorizontal: wp(5),
    paddingTop: hp(1.5),
  },
  accentRule: {
    height: hp(0.45),
    backgroundColor: colors.primary,
    borderRadius: wp(1),
    marginBottom: hp(2),
    width: wp(16),
  },
  screenTitle: {
    fontSize: fontSize(26),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: hp(0.5),
  },
  dateLine: {
    fontSize: fontSize(15),
    fontWeight: '700',
    color: colors.textMuted,
  },
  timeLine: {
    fontSize: fontSize(14),
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: hp(2),
  },
  overviewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    padding: wp(4),
    marginBottom: hp(2),
    backgroundColor: colors.background,
  },
  overviewBadgeRow: {
    marginBottom: hp(1),
  },
  overviewFinished: {
    alignSelf: 'flex-start',
    fontSize: fontSize(10),
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.primary,
    textTransform: 'uppercase',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.35),
    backgroundColor: colors.primarySoft,
    borderRadius: wp(1.5),
    overflow: 'hidden',
  },
  overviewLiveBadge: {
    alignSelf: 'flex-start',
    fontSize: fontSize(10),
    fontWeight: '900',
    letterSpacing: 0.9,
    color: colors.background,
    textTransform: 'uppercase',
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.4),
    backgroundColor: colors.primary,
    borderRadius: wp(1.5),
    overflow: 'hidden',
  },
  tabSection: {
    marginBottom: hp(1.75),
  },
  tabSectionKicker: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: hp(0.65),
  },
  tabTrack: {
    flexDirection: 'row',
    padding: wp(1.2),
    borderRadius: wp(4),
    backgroundColor: 'rgba(7, 7, 7, 0.045)',
    borderWidth: 1,
    borderColor: colors.border,
    gap: wp(1),
  },
  tabHit: {
    flex: 1,
    minWidth: 0,
  },
  tabHitPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.96,
  },
  tabSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.15),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(3),
    gap: wp(2.5),
  },
  tabSegmentActive: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'rgba(1, 180, 137, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: '#070707',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  tabBadge: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeIdle: {
    backgroundColor: 'rgba(7, 7, 7, 0.08)',
  },
  tabBadgeActive: {
    backgroundColor: colors.primary,
  },
  tabBadgeLetter: {
    fontSize: fontSize(16),
    fontWeight: '900',
    color: colors.textMuted,
  },
  tabBadgeLetterActive: {
    color: colors.background,
  },
  tabTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  tabMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginBottom: hp(0.15),
  },
  tabInningsTag: {
    fontSize: fontSize(9),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tabInningsTagActive: {
    color: colors.primary,
  },
  tabWinnerChip: {
    paddingHorizontal: wp(1.8),
    paddingVertical: hp(0.15),
    borderRadius: wp(1.5),
    backgroundColor: colors.primarySoft,
  },
  tabWinnerChipText: {
    fontSize: fontSize(8),
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  tabTeamLabel: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabTeamLabelActive: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.text,
  },
  selectedTeamBlock: {
    marginBottom: hp(1.2),
  },
  selectedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginBottom: hp(0.5),
  },
  overviewWinDot: {
    minWidth: wp(5.5),
    height: wp(5.5),
    borderRadius: wp(2.75),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewWinDotText: {
    fontSize: fontSize(10),
    fontWeight: '900',
    color: colors.background,
  },
  selectedTeamTitle: {
    flex: 1,
    fontSize: fontSize(18),
    fontWeight: '800',
    color: colors.text,
  },
  selectedScore: {
    fontSize: fontSize(24),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: hp(1),
  },
  overviewLoser: {
    color: colors.loserMuted,
  },
  overviewOvers: {
    fontSize: fontSize(15),
    fontWeight: '700',
    color: colors.textMuted,
  },
  teamStatRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: wp(1.5),
    marginBottom: hp(0.8),
  },
  teamStatCell: {
    flex: 1,
    minWidth: 0,
    paddingVertical: hp(0.75),
    paddingHorizontal: wp(1),
    borderRadius: wp(2),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  teamStatLbl: {
    fontSize: fontSize(9),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: hp(0.15),
  },
  teamStatVal: {
    fontSize: fontSize(15),
    fontWeight: '900',
    color: colors.text,
  },
  teamExtrasLine: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
  },
  overviewResultBox: {
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    backgroundColor: colors.surfaceMuted,
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: colors.primaryFaint,
  },
  overviewResultLabel: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: hp(0.35),
  },
  overviewHeadline: {
    fontSize: fontSize(14),
    fontWeight: '800',
    color: colors.primary,
    marginBottom: hp(0.35),
  },
  overviewLoserLine: {
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    fontWeight: '600',
    color: colors.textMuted,
  },
  continueScoreCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1),
    marginTop: hp(1.2),
    paddingVertical: hp(1.3),
    paddingHorizontal: wp(3),
    borderRadius: wp(2.5),
    backgroundColor: colors.primary,
  },
  continueScoreCtaPressed: {
    opacity: 0.92,
  },
  continueScoreCtaText: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.background,
  },
  continueScoreCtaChev: {
    fontSize: fontSize(20),
    fontWeight: '300',
    color: colors.background,
  },
  sectionHeading: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: hp(1),
    marginTop: hp(0.5),
  },
  inningsCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    padding: wp(4),
    marginBottom: hp(1.2),
    backgroundColor: colors.background,
  },
  inningsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(0.6),
  },
  inningsLabel: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  winPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.35),
    borderRadius: wp(2),
  },
  winPillText: {
    fontSize: fontSize(10),
    fontWeight: '900',
    color: colors.background,
    letterSpacing: 0.4,
  },
  inningsTeamName: {
    fontSize: fontSize(18),
    fontWeight: '800',
    color: colors.text,
    marginBottom: hp(0.3),
  },
  inningsScore: {
    fontSize: fontSize(22),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  inningsOvers: {
    fontSize: fontSize(15),
    fontWeight: '700',
    color: colors.textMuted,
  },
  inningsStatsRow: {
    flexDirection: 'row',
    marginTop: hp(1.2),
    gap: wp(3),
  },
  inningsStat: {
    minWidth: wp(16),
  },
  inningsStatLabel: {
    fontSize: fontSize(10),
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: hp(0.2),
  },
  inningsStatVal: {
    fontSize: fontSize(17),
    fontWeight: '800',
    color: colors.text,
  },
  inningsExtrasDetail: {
    marginTop: hp(0.8),
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
  },
  ballByBallTitle: {
    marginTop: hp(1.4),
    marginBottom: hp(0.3),
    fontSize: fontSize(11),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});
