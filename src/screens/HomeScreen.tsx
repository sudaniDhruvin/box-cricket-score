import { DrawerActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  Alert,
  ListRenderItemInfo,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInterstitialAd } from 'react-native-google-mobile-ads';
import { HomeEmptyBannerAd } from '../components/HomeEmptyBannerAd';
import { HomeListNativeAd } from '../components/HomeListNativeAd';
import { MatchCard } from '../components/MatchCard';
import {
  CricketBatBallIcon,
  CricketScorebookIcon,
  CricketStumpsIcon,
  CricketTrophyIcon,
  MenuIcon,
  QrScanIcon,
  TrashIcon,
} from '../components/ui';
import type { MainStackParamList } from '../navigation/types';
import { useMatchStore } from '../store/useMatchStore';
import { colors } from '../theme/colors';
import { GOLDEN_SPLIT, GOLDEN_SPACING } from '../theme/golden';
import type { MatchSummary } from '../types/match';
import type { MatchDaySection } from '../utils/groupMatchesByDay';
import { groupMatchesByDay } from '../utils/groupMatchesByDay';
import { fontSize, hp, wp } from '../utils';
import { INTERSTITIAL_AD_UNIT_ID } from '../config/adUnitIds';
import { useAdFlags } from '../hooks/useAdFlags';
import {
  formatMatchResult,
  formatOvers,
  formatPlayedDateCompact,
  isMatchLive,
  seasonAggregateRuns,
  seasonAggregateWickets,
} from '../utils/cricketFormat';

/** Show FAB after user scrolls past the header CTA (~thumb-friendly). */
const FAB_SHOW_Y = 280;
const FAB_HIDE_Y = 180;

type HomeListRow =
  | { kind: 'match'; match: MatchSummary }
  | { kind: 'ad'; id: string };

/** Insert a native ad after every N matches within a day section. */
const NATIVE_AD_EVERY_N_MATCHES = 4;

function sectionsWithNativeAdsBetweenMatches(
  sections: MatchDaySection[],
): { title: string; sortKey: string; data: HomeListRow[] }[] {
  return sections.map(section => {
    const data: HomeListRow[] = [];
    for (let i = 0; i < section.data.length; i += 1) {
      const match = section.data[i];
      data.push({ kind: 'match', match });
      const matchIndex = i + 1;
      const isLast = i === section.data.length - 1;
      if (
        matchIndex % NATIVE_AD_EVERY_N_MATCHES === 0 &&
        !isLast
      ) {
        data.push({
          kind: 'ad',
          id: `ad-${section.sortKey}-after-${match.id}`,
        });
      }
    }
    return { title: section.title, sortKey: section.sortKey, data };
  });
}

function matchCountInSection(data: HomeListRow[]): number {
  return data.filter(r => r.kind === 'match').length;
}

type LastMatchPreviewProps = {
  match: MatchSummary;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
};

function LastMatchPreview({
  match: m,
  onPress,
  onLongPress,
  onDelete,
}: LastMatchPreviewProps) {
  const [first, second] = m.innings;
  const live = isMatchLive(m);
  const { headline } = formatMatchResult(m);
  const tied = !live && m.margin.kind === 'tie';
  const winnerFirst = !live && !tied && first.teamId === m.winnerTeamId;
  const winnerSecond = !live && !tied && second.teamId === m.winnerTeamId;

  return (
    <View style={styles.lastMatchCard}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={420}
        style={({ pressed }) => [
          styles.lastMatchCardMain,
          pressed && styles.lastMatchCardPressed,
        ]}
        android_ripple={{ color: colors.primarySoft, foreground: true }}
        accessibilityRole="button"
        accessibilityLabel="Open last match details"
        accessibilityHint="Use the Delete match button below to remove it"
      >
      <View style={styles.lastMatchTop}>
        <View style={styles.lastMatchStatusRow}>
          <View
            style={[
              styles.lastMatchDot,
              live ? styles.lastMatchDotLive : styles.lastMatchDotFinal,
            ]}
          />
          <Text style={styles.lastMatchStatus}>{live ? 'LIVE' : 'FINAL'}</Text>
        </View>
        <Text style={styles.lastMatchDate}>
          {formatPlayedDateCompact(m.playedAt)}
        </Text>
      </View>

      <View style={styles.lastMatchTeams}>
        <View style={styles.lastMatchTeamCol}>
          <Text style={styles.lastMatchTeamName} numberOfLines={1}>
            {first.teamName}
          </Text>
          <Text style={styles.lastMatchScoreRow}>
            <Text
              style={[
                styles.lastMatchScoreMain,
                winnerFirst && styles.lastMatchScoreWinner,
              ]}
            >
              {first.runs}
            </Text>
            <Text style={styles.lastMatchScoreWkts}>/{first.wickets}</Text>
          </Text>
          <Text style={styles.lastMatchOvers}>
            {formatOvers(first.overs)} Overs
          </Text>
        </View>

        <View style={styles.lastMatchVs}>
          <Text style={styles.lastMatchVsText}>VS</Text>
        </View>

        <View style={[styles.lastMatchTeamCol, styles.lastMatchTeamColRight]}>
          <Text
            style={[styles.lastMatchTeamName, styles.lastMatchTeamNameRight]}
            numberOfLines={1}
          >
            {second.teamName}
          </Text>
          <Text
            style={[styles.lastMatchScoreRow, styles.lastMatchScoreRowRight]}
          >
            <Text
              style={[
                styles.lastMatchScoreMain,
                winnerSecond && styles.lastMatchScoreWinner,
                !winnerSecond && !live && styles.lastMatchScoreMuted,
              ]}
            >
              {second.runs}
            </Text>
            <Text style={styles.lastMatchScoreWkts}>/{second.wickets}</Text>
          </Text>
          <Text style={[styles.lastMatchOvers, styles.lastMatchOversRight]}>
            {formatOvers(second.overs)} Overs
          </Text>
        </View>
      </View>

      <View style={styles.lastMatchResultRow}>
        <View style={styles.lastMatchTrophy}>
          <CricketTrophyIcon size={wp(4.5)} color={colors.primary} />
        </View>
        <Text style={styles.lastMatchResult} numberOfLines={2}>
          {headline}
        </Text>
      </View>
      </Pressable>
      <Pressable
        onPress={onDelete}
        style={({ pressed }) => [
          styles.lastMatchDeleteBtn,
          pressed && styles.lastMatchDeleteBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${first.teamName} versus ${second.teamName}`}
      >
        <TrashIcon size={wp(4)} color={colors.live} />
        <Text style={styles.lastMatchDeleteText}>Delete match</Text>
      </Pressable>
    </View>
  );
}

type SeasonOverviewProps = {
  matchCount: number;
  totalRuns: number;
  totalWickets: number;
};

function SeasonOverview({
  matchCount,
  totalRuns,
  totalWickets,
}: SeasonOverviewProps) {
  return (
    <View style={styles.seasonGrid}>
      <View style={[styles.seasonCard, styles.seasonMatchesCard]}>
        <View style={styles.seasonIconWrap}>
          <CricketBatBallIcon size={wp(4.5)} color={colors.primary} />
        </View>
        <Text style={styles.seasonBigValue}>{matchCount}</Text>
        <Text style={styles.seasonLabel}>MATCHES</Text>
      </View>

      <View style={styles.seasonRightCol}>
        <View style={[styles.seasonCard, styles.seasonStatCard]}>
          <View style={styles.seasonStatTop}>
            <Text style={styles.seasonStatLabel}>TOTAL RUNS</Text>
            <CricketScorebookIcon size={wp(4.5)} color={colors.primary} />
          </View>
          <Text style={[styles.seasonStatValue, styles.seasonRunsValue]}>
            {totalRuns.toLocaleString()}
          </Text>
        </View>

        <View style={[styles.seasonCard, styles.seasonStatCard]}>
          <View style={styles.seasonStatTop}>
            <Text style={styles.seasonStatLabel}>WICKETS</Text>
            <CricketStumpsIcon size={wp(4.5)} color={colors.live} />
          </View>
          <Text style={[styles.seasonStatValue, styles.seasonWicketsValue]}>
            {totalWickets.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList, 'Home'>>();
  const [fabVisible, setFabVisible] = useState(false);
  const fabShownRef = useRef(false);
  const pendingNavigateAfterInterstitialRef = useRef(false);
  const { isInter, isNative, isAds } = useAdFlags();
  const { load, show, isLoaded, isClosed, error } = useInterstitialAd(
    INTERSTITIAL_AD_UNIT_ID,
  );
  const savedMatches = useMatchStore(s => s.matches);
  const removeMatch = useMatchStore(s => s.removeMatch);

  const confirmDeleteMatch = useCallback(
    (match: MatchSummary) => {
      const a = match.innings[0].teamName;
      const b = match.innings[1].teamName;
      Alert.alert(
        'Delete match?',
        `Remove "${a} vs ${b}" from your saved list. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => removeMatch(match.id),
          },
        ],
      );
    },
    [removeMatch],
  );

  const proceedToNewMatch = useCallback(() => {
    navigation.navigate('NewMatch', {});
  }, [navigation]);

  const openScanToWatch = useCallback(() => {
    navigation.navigate('ScanToWatch', {});
  }, [navigation]);

  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  useEffect(() => {
    if (isInter && isAds) {
      load();
    }
  }, [load, isInter, isAds]);

  useEffect(() => {
    if (!isClosed || !pendingNavigateAfterInterstitialRef.current) {
      return;
    }
    pendingNavigateAfterInterstitialRef.current = false;
    proceedToNewMatch();
    load();
  }, [isClosed, proceedToNewMatch, load]);

  useEffect(() => {
    if (!error || !pendingNavigateAfterInterstitialRef.current) {
      return;
    }
    pendingNavigateAfterInterstitialRef.current = false;
    proceedToNewMatch();
    load();
  }, [error, proceedToNewMatch, load]);

  const onPressStartNewInnings = useCallback(() => {
    if (isInter && isAds && isLoaded) {
      pendingNavigateAfterInterstitialRef.current = true;
      show();
    } else {
      proceedToNewMatch();
    }
  }, [isInter, isAds, isLoaded, show, proceedToNewMatch]);

  const sections = useMemo(
    () => groupMatchesByDay(savedMatches),
    [savedMatches],
  );

  const listSections = useMemo(() => {
    if (isNative && isAds) {
      return sectionsWithNativeAdsBetweenMatches(sections);
    }
    return sections.map(section => ({
      title: section.title,
      sortKey: section.sortKey,
      data: section.data.map(match => ({ kind: 'match' as const, match })),
    }));
  }, [sections, isNative, isAds]);

  const totalMatches = savedMatches.length;

  const lastMatch = useMemo(() => {
    if (savedMatches.length === 0) {
      return null;
    }
    return [...savedMatches].sort(
      (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime(),
    )[0];
  }, [savedMatches]);

  const liveMatch = useMemo(() => {
    const lives = savedMatches.filter(isMatchLive);
    if (lives.length === 0) {
      return null;
    }
    return [...lives].sort(
      (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime(),
    )[0];
  }, [savedMatches]);

  const continueLiveScoring = useCallback(() => {
    if (!liveMatch) {
      return;
    }
    navigation.navigate('NewMatch', { resumeMatchId: liveMatch.id });
  }, [liveMatch, navigation]);

  const seasonStats = useMemo(
    () => ({
      runs: seasonAggregateRuns(savedMatches),
      wickets: seasonAggregateWickets(savedMatches),
    }),
    [savedMatches],
  );

  const renderItem = ({ item }: ListRenderItemInfo<HomeListRow>) => {
    if (item.kind === 'ad') {
      return <HomeListNativeAd />;
    }
    const m = item.match;
    return (
      <MatchCard
        match={m}
        onPress={() => navigation.navigate('MatchDetail', { matchId: m.id })}
        onLongPress={() => confirmDeleteMatch(m)}
      />
    );
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (!fabShownRef.current && y > FAB_SHOW_Y) {
      fabShownRef.current = true;
      setFabVisible(true);
    } else if (fabShownRef.current && y < FAB_HIDE_Y) {
      fabShownRef.current = false;
      setFabVisible(false);
    }
  };

  const openLastMatch = useCallback(() => {
    if (!lastMatch) {
      return;
    }
    navigation.navigate('MatchDetail', { matchId: lastMatch.id });
  }, [lastMatch, navigation]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SectionList
        sections={listSections}
        keyExtractor={row => (row.kind === 'match' ? row.match.id : row.id)}
        renderItem={renderItem}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderSectionHeader={({ section }) => {
          if (totalMatches === 0) {
            return null;
          }
          const n = matchCountInSection(section.data);
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>
                {n} {n === 1 ? 'match' : 'matches'}
              </Text>
            </View>
          );
        }}
        stickySectionHeadersEnabled
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: Math.max(insets.bottom, hp(3)) + hp(10),
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerBar}>
              <View style={styles.headerSide}>
                <View style={styles.avatarWrap}>
                  <CricketBatBallIcon size={wp(6)} color={colors.primary} />
                </View>
              </View>
              <Text style={styles.appTitle}>Box Cricket</Text>
              <View style={[styles.headerSide, styles.headerActions]}>
                <Pressable
                  onPress={openScanToWatch}
                  style={({ pressed }) => [
                    styles.headerScanBtn,
                    pressed && styles.settingsBtnPressed,
                  ]}
                  android_ripple={{
                    color: colors.primarySoft,
                    borderless: true,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Watch live. Scan a host QR code."
                >
                  <QrScanIcon size={wp(5.5)} color={colors.primary} />
                </Pressable>
                <Pressable
                  onPress={openDrawer}
                  style={({ pressed }) => [
                    styles.settingsBtn,
                    pressed && styles.settingsBtnPressed,
                  ]}
                  android_ripple={{
                    color: colors.primarySoft,
                    borderless: true,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Open settings menu"
                >
                  <MenuIcon size={wp(5.5)} color={colors.primary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.ctaCard}>
              <View style={styles.ctaEyebrow}>
                <CricketScorebookIcon size={wp(4)} color={colors.background} />
                <Text style={styles.ctaEyebrowText}>READY WHEN YOU ARE</Text>
              </View>
              <Text style={styles.ctaTitle}>Make it a match</Text>
              <Text style={styles.ctaSub}>
                Set your teams, choose the overs, and keep every ball in play.
              </Text>
              <View style={styles.ctaActions}>
                <Pressable
                  onPress={onPressStartNewInnings}
                  style={({ pressed }) => [
                    styles.quickStartBtn,
                    pressed && styles.quickStartBtnPressed,
                  ]}
                  android_ripple={{
                    color: 'rgba(255, 255, 255, 0.22)',
                    foreground: true,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="New match. Set up a match and begin scoring."
                >
                  <CricketBatBallIcon size={wp(4.5)} color={colors.primary} />
                  <Text style={styles.quickStartText}>New Match</Text>
                </Pressable>

                <Pressable
                  onPress={openScanToWatch}
                  style={({ pressed }) => [
                    styles.watchLiveBtn,
                    pressed && styles.watchLiveBtnPressed,
                  ]}
                  android_ripple={{
                    color: colors.primarySoft,
                    foreground: true,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Watch live. Scan a host QR on the same Wi-Fi."
                >
                  <QrScanIcon size={wp(4.5)} color={colors.background} />
                  <Text style={styles.watchLiveText}>Watch Live</Text>
                </Pressable>
              </View>
            </View>

            {liveMatch ? (
              <Pressable
                onPress={continueLiveScoring}
                style={({ pressed }) => [
                  styles.continueLiveStrip,
                  pressed && styles.continueLiveStripPressed,
                ]}
                android_ripple={{
                  color: 'rgba(255, 255, 255, 0.18)',
                  foreground: true,
                }}
                accessibilityRole="button"
                accessibilityLabel="Continue scoring live match"
              >
                <View style={styles.continueLiveLeft}>
                  <View style={styles.continueLiveBadge}>
                    <View style={styles.continueLiveDot} />
                    <Text style={styles.continueLiveBadgeText}>LIVE</Text>
                  </View>
                  <Text style={styles.continueLiveTeams} numberOfLines={1}>
                    {liveMatch.innings[0].teamName} vs{' '}
                    {liveMatch.innings[1].teamName}
                  </Text>
                  <Text style={styles.continueLiveScore} numberOfLines={1}>
                    {liveMatch.innings[0].runs}/{liveMatch.innings[0].wickets} ·{' '}
                    {liveMatch.innings[1].runs}/{liveMatch.innings[1].wickets}
                  </Text>
                </View>
                <Text style={styles.continueLiveCta}>Continue</Text>
              </Pressable>
            ) : null}

            {lastMatch ? (
              <View style={styles.dashboardSection}>
                <Text style={styles.dashboardHeading}>Last Match</Text>
                <LastMatchPreview
                  match={lastMatch}
                  onPress={openLastMatch}
                  onLongPress={() => confirmDeleteMatch(lastMatch)}
                  onDelete={() => confirmDeleteMatch(lastMatch)}
                />
              </View>
            ) : null}

            {totalMatches > 0 ? (
              <View style={styles.dashboardSection}>
                <Text style={styles.dashboardHeading}>Season Overview</Text>
                <SeasonOverview
                  matchCount={totalMatches}
                  totalRuns={seasonStats.runs}
                  totalWickets={seasonStats.wickets}
                />
              </View>
            ) : null}

            {totalMatches > 0 ? (
              <View style={styles.allMatchesHeader}>
                <Text style={styles.dashboardHeading}>All Matches</Text>
                <Text style={styles.allMatchesSub}>
                  Newest first under each day
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.listEmpty}>
            <Text style={styles.listEmptyTitle}>No matches yet</Text>
            <Text style={styles.listEmptySub}>
              Your scorecards will show up here when the game gets going.
            </Text>

            <View style={styles.emptyBannerWrap}>
              <HomeEmptyBannerAd />
            </View>
          </View>
        }
      />
      {fabVisible ? (
        <Pressable
          onPress={onPressStartNewInnings}
          style={({ pressed }) => [
            styles.fab,
            {
              bottom: Math.max(insets.bottom, hp(2)) + hp(1),
            },
            pressed && styles.fabPressed,
          ]}
          // android_ripple={{
          //   color: 'rgba(255, 255, 255, 0.25)',
          //   borderless: true,
          // }}
          accessibilityRole="button"
          accessibilityLabel="Start new match"
        >
          <CricketBatBallIcon size={wp(5)} color={colors.background} />
          <Text style={styles.fabPlus}>New Match</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  android: {
    elevation: 3,
  },
  default: {},
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    flexGrow: 1,
  },
  listEmpty: {
    paddingVertical: hp(4),
    paddingHorizontal: wp(2),
  },
  listEmptyTitle: {
    fontSize: fontSize(17),
    fontWeight: '800',
    color: colors.text,
    marginBottom: hp(0.6),
  },
  listEmptySub: {
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: colors.textMuted,
  },
  header: {
    marginBottom: hp(0.5),
    paddingHorizontal: wp(1),
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  headerSide: {
    minWidth: wp(11),
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    justifyContent: 'flex-end',
    minWidth: wp(23),
    gap: wp(0.5),
  },
  avatarWrap: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: colors.primaryFaint,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  appTitle: {
    flex: 1,
    textAlign: 'left',
    marginLeft: wp(3),
    fontSize: fontSize(18),
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  headerScanBtn: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtn: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnPressed: {
    opacity: 0.7,
  },
  ctaCard: {
    backgroundColor: colors.primary,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: wp(5),
    paddingVertical: hp(2.2),
    marginBottom: hp(2),
    justifyContent: 'center',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  ctaEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1.1),
  },
  ctaEyebrowText: {
    fontSize: fontSize(10),
    fontWeight: '800',
    letterSpacing: 1.1,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  ctaTitle: {
    fontSize: fontSize(25),
    fontWeight: '800',
    color: colors.background,
    marginBottom: hp(0.5),
    letterSpacing: -0.3,
  },
  ctaSub: {
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: 'rgba(255, 255, 255, 0.82)',
    marginBottom: hp(1.6),
    textAlign: 'left',
    maxWidth: wp(78),
  },
  ctaActions: {
    width: '100%',
    flexDirection: 'row',
    gap: GOLDEN_SPACING.sm,
  },
  continueLiveStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
    backgroundColor: colors.primary,
    borderRadius: wp(3.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    marginBottom: hp(2),
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  continueLiveStripPressed: {
    opacity: 0.92,
  },
  continueLiveLeft: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.25),
  },
  continueLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
    marginBottom: hp(0.15),
  },
  continueLiveDot: {
    width: wp(1.8),
    height: wp(1.8),
    borderRadius: wp(1),
    backgroundColor: colors.background,
  },
  continueLiveBadgeText: {
    fontSize: fontSize(10),
    fontWeight: '900',
    color: colors.background,
    letterSpacing: 0.8,
  },
  continueLiveTeams: {
    fontSize: fontSize(15),
    fontWeight: '800',
    color: colors.background,
  },
  continueLiveScore: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  continueLiveCta: {
    fontSize: fontSize(14),
    fontWeight: '900',
    color: colors.background,
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    overflow: 'hidden',
  },
  quickStartBtn: {
    flex: GOLDEN_SPLIT.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 100,
    paddingVertical: hp(1.35),
    paddingHorizontal: wp(1.5),
    gap: wp(1.5),
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  quickStartBtnPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  quickStartText: {
    fontSize: fontSize(15),
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  watchLiveBtn: {
    flex: GOLDEN_SPLIT.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    paddingVertical: hp(1.35),
    paddingHorizontal: wp(1),
    gap: wp(1),
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  watchLiveBtnPressed: {
    opacity: 0.92,
    backgroundColor: colors.primaryFaint,
  },
  watchLiveText: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.background,
    letterSpacing: -0.2,
  },
  dashboardSection: {
    marginBottom: hp(2),
  },
  dashboardHeading: {
    fontSize: fontSize(18),
    fontWeight: '800',
    color: colors.text,
    marginBottom: hp(1),
  },
  lastMatchCard: {
    backgroundColor: colors.background,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  lastMatchCardMain: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
  },
  lastMatchCardPressed: {
    backgroundColor: colors.primaryFaint,
  },
  lastMatchDeleteBtn: {
    minHeight: hp(5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GOLDEN_SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  lastMatchDeleteBtnPressed: {
    backgroundColor: colors.primaryFaint,
  },
  lastMatchDeleteText: {
    fontSize: fontSize(13),
    fontWeight: '700',
    color: colors.live,
  },
  lastMatchTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.4),
  },
  lastMatchStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  lastMatchDot: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
  },
  lastMatchDotFinal: {
    backgroundColor: colors.completed,
  },
  lastMatchDotLive: {
    backgroundColor: colors.primary,
  },
  lastMatchStatus: {
    fontSize: fontSize(11),
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.text,
  },
  lastMatchDate: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
  },
  lastMatchTeams: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  lastMatchTeamCol: {
    flex: 1,
    minWidth: 0,
  },
  lastMatchTeamColRight: {
    alignItems: 'flex-end',
  },
  lastMatchTeamName: {
    fontSize: fontSize(15),
    fontWeight: '700',
    color: colors.text,
    marginBottom: hp(0.4),
  },
  lastMatchTeamNameRight: {
    textAlign: 'right',
  },
  lastMatchScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  lastMatchScoreRowRight: {
    justifyContent: 'flex-end',
  },
  lastMatchScoreMain: {
    fontSize: fontSize(28),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  lastMatchScoreWinner: {
    color: colors.primary,
  },
  lastMatchScoreMuted: {
    color: colors.loserMuted,
  },
  lastMatchScoreWkts: {
    fontSize: fontSize(18),
    fontWeight: '700',
    color: colors.textMuted,
  },
  lastMatchOvers: {
    marginTop: hp(0.3),
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
  },
  lastMatchOversRight: {
    textAlign: 'right',
  },
  lastMatchVs: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: wp(2),
    marginTop: hp(1.2),
  },
  lastMatchVsText: {
    fontSize: fontSize(10),
    fontWeight: '900',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  lastMatchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(1.6),
    paddingTop: hp(1.4),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: wp(2),
    justifyContent: 'center',
  },
  lastMatchTrophy: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastMatchResult: {
    fontSize: fontSize(14),
    fontWeight: '700',
    color: colors.primary,
    lineHeight: fontSize(19),
  },
  seasonGrid: {
    flexDirection: 'row',
    gap: GOLDEN_SPACING.sm,
    minHeight: hp(18),
  },
  seasonRightCol: {
    flex: GOLDEN_SPLIT.secondary,
    gap: wp(3),
  },
  seasonCard: {
    backgroundColor: colors.background,
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  seasonMatchesCard: {
    flex: GOLDEN_SPLIT.primary,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(2),
    justifyContent: 'space-between',
  },
  seasonIconWrap: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(2.5),
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonBigValue: {
    fontSize: fontSize(36),
    fontWeight: '900',
    color: colors.text,
    // marginTop: hp(1),
  },
  seasonLabel: {
    fontSize: fontSize(11),
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  seasonStatCard: {
    flex: 1,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.6),
    justifyContent: 'center',
  },
  seasonStatTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(0.6),
  },
  seasonStatLabel: {
    fontSize: fontSize(10),
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  seasonStatValue: {
    fontSize: fontSize(24),
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  seasonRunsValue: {
    color: colors.primary,
  },
  seasonWicketsValue: {
    color: colors.live,
  },
  allMatchesHeader: {
    marginBottom: hp(0.5),
    paddingTop: hp(0.5),
  },
  allMatchesSub: {
    fontSize: fontSize(13),
    color: colors.textMuted,
    marginTop: -hp(0.4),
    marginBottom: hp(0.8),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingTop: hp(1.6),
    paddingBottom: hp(0.8),
    paddingHorizontal: wp(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: hp(0.4),
  },
  sectionTitle: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.text,
  },
  sectionCount: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: wp(5),
    flexDirection: 'row',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2.2),
    gap: wp(2),
    borderRadius: wp(4),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  fabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
  fabPlus: {
    fontSize: fontSize(14),
    fontWeight: '500',
    color: colors.background,
  },
  emptyBannerWrap: {
    marginTop: hp(4),
    alignItems: 'center',
  },
});
