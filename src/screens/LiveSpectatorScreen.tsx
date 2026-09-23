import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InningsBallByBall } from '../components/InningsBallByBall';
import { LiveShareNoticeModal } from '../components/LiveShareNoticeModal';
import { ScreenHeader } from '../components/ui';
import {
  connectViewer,
  type ViewerClient,
  type ViewerConnectionStatus,
} from '../liveShare';
import type { MainStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import type { MatchSummary } from '../types/match';
import {
  formatMatchResult,
  formatOvers,
  formatRunRate,
  isMatchLive,
  legalBallsBowled,
  runRateFromLegalBalls,
} from '../utils/cricketFormat';
import { wicketsCapForMatch } from '../utils/applyScoringDelivery';
import { fontSize, hp, wp } from '../utils';

type Nav = NativeStackNavigationProp<MainStackParamList, 'LiveSpectator'>;
type SpectatorRoute = RouteProp<MainStackParamList, 'LiveSpectator'>;

function statusLabel(status: ViewerConnectionStatus): string {
  switch (status) {
    case 'connecting':
      return 'Connecting…';
    case 'reconnecting':
      return 'Disconnected';
    case 'connected':
      return 'Watching live';
    case 'ended':
      return 'Host ended sharing';
    case 'error':
      return 'Disconnected';
    default:
      return status;
  }
}

function bannerTitle(status: ViewerConnectionStatus): string {
  switch (status) {
    case 'connecting':
      return 'Connecting to the host…';
    case 'reconnecting':
      return 'You got disconnected';
    case 'ended':
      return 'The host stopped sharing';
    case 'error':
      return 'You got disconnected';
    default:
      return '';
  }
}

export function LiveSpectatorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<SpectatorRoute>();
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [status, setStatus] = useState<ViewerConnectionStatus>('connecting');
  const [statusDetail, setStatusDetail] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const clientRef = useRef<ViewerClient | null>(null);
  const noticeStatusRef = useRef<ViewerConnectionStatus | null>(null);

  useEffect(() => {
    const client = connectViewer(params.joinPayload, {
      onMatch: next => setMatch(next),
      onStatus: (next, detail) => {
        setStatus(next);
        setStatusDetail(detail);
      },
      onEnded: reason => {
        setStatusDetail(reason);
      },
    });
    clientRef.current = client;
    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [params.joinPayload]);

  useEffect(() => {
    if (status === 'connected' || status === 'connecting') {
      noticeStatusRef.current = null;
      setNoticeOpen(false);
      return;
    }
    if (
      (status === 'reconnecting' || status === 'error' || status === 'ended') &&
      noticeStatusRef.current !== status
    ) {
      noticeStatusRef.current = status;
      setNoticeOpen(true);
    }
  }, [status]);

  useEffect(() => {
    if (match?.scoringActiveInnings === 0 || match?.scoringActiveInnings === 1) {
      setActiveTab(match.scoringActiveInnings);
    }
  }, [match?.scoringActiveInnings]);

  const chase = useMemo(() => {
    if (!match || match.scoringActiveInnings !== 1) {
      return null;
    }
    const firstRuns = match.innings[0].runs;
    const batting = match.innings[1];
    const target = firstRuns + 1;
    const need = Math.max(0, target - batting.runs);
    const oversCap = match.oversPerSide ?? 0;
    const legalDone = legalBallsBowled(batting.overs);
    const legalTotal = oversCap > 0 ? oversCap * 6 : null;
    const legalLeft =
      legalTotal != null ? Math.max(0, legalTotal - legalDone) : null;
    const rrr =
      need > 0 && legalLeft != null && legalLeft > 0
        ? (need * 6) / legalLeft
        : null;
    return { target, need, rrr };
  }, [match]);

  const activeInn = match?.innings[activeTab];
  const currentRR = activeInn
    ? runRateFromLegalBalls(activeInn.runs, legalBallsBowled(activeInn.overs))
    : null;
  const wkCap = match ? wicketsCapForMatch(match) : 10;
  const result = match ? formatMatchResult(match) : null;
  const live = match ? isMatchLive(match) : false;
  const showConnectAgain = status === 'reconnecting' || status === 'error';
  const showScanAgain = status === 'ended' || status === 'error';
  const showBanner =
    status === 'reconnecting' || status === 'ended' || status === 'error';

  const connectionBanner =
    showBanner ? (
      <View
        style={[
          styles.banner,
          status === 'ended' || status === 'error'
            ? styles.bannerError
            : styles.bannerWarn,
        ]}
        accessibilityRole="alert"
      >
        <Text style={styles.bannerTitle}>{bannerTitle(status)}</Text>
        <Text style={styles.bannerBody}>
          {statusDetail ??
            'Stay on this screen or tap Connect again. The host does not need a new QR.'}
        </Text>
        {showConnectAgain ? (
          <Pressable
            onPress={() => clientRef.current?.reconnectNow()}
            style={({ pressed }) => [
              styles.bannerBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Connect again"
          >
            <Text style={styles.bannerBtnText}>Connect again</Text>
          </Pressable>
        ) : null}
        {showScanAgain ? (
          <Pressable
            onPress={() => navigation.navigate('ScanToWatch', {})}
            style={({ pressed }) => [
              styles.bannerSecondaryBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Scan QR again"
          >
            <Text style={styles.bannerSecondaryText}>Scan QR again</Text>
          </Pressable>
        ) : null}
      </View>
    ) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        backLabel="Home"
        onBack={() => navigation.navigate('Home')}
        right={
          <View
            style={[
              styles.livePill,
              showBanner && styles.livePillDisconnected,
            ]}
          >
            <Text
              style={[
                styles.livePillText,
                showBanner && styles.livePillDisconnectedText,
              ]}
            >
              {statusLabel(status)}
            </Text>
          </View>
        }
      />

      {connectionBanner}

      <LiveShareNoticeModal
        visible={noticeOpen}
        title={
          status === 'ended'
            ? 'Host stopped sharing'
            : 'You got disconnected'
        }
        message={
          status === 'ended'
            ? statusDetail ??
              'The organizer stopped live sharing. Scan the QR again if they share a new code.'
            : 'The live score link dropped. Tap Connect again — the host does not need a new QR if they are still sharing.'
        }
        primaryLabel={status === 'ended' ? 'Scan QR again' : 'Connect again'}
        onPrimary={() => {
          if (status === 'ended') {
            setNoticeOpen(false);
            navigation.navigate('ScanToWatch', {});
            return;
          }
          clientRef.current?.reconnectNow();
        }}
        secondaryLabel={
          match ? 'Keep last score' : status === 'ended' ? 'Home' : undefined
        }
        onSecondary={
          match
            ? () => setNoticeOpen(false)
            : status === 'ended'
              ? () => navigation.navigate('Home')
              : undefined
        }
        onRequestClose={() => setNoticeOpen(false)}
      />

      {!match ? (
        <View style={styles.center}>
          <Text style={styles.waiting}>
            {statusDetail ?? 'Waiting for match data…'}
          </Text>
          {showConnectAgain ? (
            <Pressable
              onPress={() => clientRef.current?.reconnectNow()}
              style={({ pressed }) => [
                styles.rescanBtn,
                styles.centerAction,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Connect again"
            >
              <Text style={styles.rescanText}>Connect again</Text>
            </Pressable>
          ) : null}
          {showScanAgain ? (
            <Pressable
              onPress={() => navigation.navigate('ScanToWatch', {})}
              style={({ pressed }) => [
                styles.scanAgainBtn,
                styles.centerAction,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Scan QR again"
            >
              <Text style={styles.scanAgainText}>Scan QR again</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Math.max(insets.bottom, hp(2)) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.matchTitle}>
            {match.innings[0].teamName} vs {match.innings[1].teamName}
          </Text>
          <Text style={styles.resultLine}>
            {live ? result?.loserDetail : result?.headline}
          </Text>

          {chase != null ? (
            <Text style={styles.target}>
              Target {chase.target}
              {chase.need > 0 ? ` · Need ${chase.need}` : ' · Target reached'}
            </Text>
          ) : null}

          <View style={styles.scoreCard}>
            <Text style={styles.scoreMain}>
              {activeInn?.runs}/{activeInn?.wickets}
            </Text>
            <Text style={styles.overs}>
              Overs: {activeInn ? formatOvers(activeInn.overs) : '0.0'}
              {match.oversPerSide != null ? ` / ${match.oversPerSide}` : ''}
            </Text>
            <View style={styles.rateRow}>
              <View style={styles.rateCell}>
                <Text style={styles.rateLabel}>CRR</Text>
                <Text style={styles.rateValue}>{formatRunRate(currentRR)}</Text>
              </View>
              <View style={styles.rateDivider} />
              <View style={styles.rateCell}>
                <Text style={styles.rateLabel}>
                  {chase != null ? 'RRR' : 'WKTS'}
                </Text>
                <Text style={styles.rateValue}>
                  {chase != null
                    ? chase.need === 0
                      ? '0.00'
                      : formatRunRate(chase.rrr)
                    : `${activeInn?.wickets ?? 0}/${wkCap}`}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.tabRow}>
            <Pressable
              onPress={() => setActiveTab(0)}
              style={[styles.tab, activeTab === 0 && styles.tabActive]}
            >
              <Text
                style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}
              >
                1st · {match.innings[0].teamName}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab(1)}
              style={[styles.tab, activeTab === 1 && styles.tabActive]}
            >
              <Text
                style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}
              >
                2nd · {match.innings[1].teamName}
              </Text>
            </Pressable>
          </View>

          {activeInn ? (
            <View style={styles.ballBlock}>
              <Text style={styles.ballTitle}>Ball-by-ball · latest first</Text>
              <InningsBallByBall innings={activeInn} oversOrder="newestFirst" />
            </View>
          ) : null}

          {showScanAgain ? (
            <Pressable
              onPress={() => navigation.navigate('ScanToWatch', {})}
              style={({ pressed }) => [
                styles.scanAgainBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Scan QR again"
            >
              <Text style={styles.scanAgainText}>Scan QR again</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  livePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: wp(4),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    marginRight: wp(2),
  },
  livePillText: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.primary,
  },
  livePillDisconnected: {
    backgroundColor: 'rgba(229, 57, 53, 0.12)',
  },
  livePillDisconnectedText: {
    color: colors.ballWicket,
  },
  banner: {
    marginHorizontal: wp(4),
    marginTop: hp(1.2),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.4),
    borderRadius: wp(3),
    borderWidth: 1,
  },
  bannerWarn: {
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primarySoft,
  },
  bannerError: {
    backgroundColor: 'rgba(229, 57, 53, 0.08)',
    borderColor: 'rgba(229, 57, 53, 0.35)',
  },
  bannerTitle: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.text,
  },
  bannerBody: {
    marginTop: hp(0.4),
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: colors.textMuted,
  },
  bannerBtn: {
    marginTop: hp(1.1),
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: wp(5),
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
  },
  bannerBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize(14),
    fontWeight: '800',
  },
  bannerSecondaryBtn: {
    marginTop: hp(0.8),
    alignSelf: 'flex-start',
    borderRadius: wp(5),
    paddingVertical: hp(0.9),
    paddingHorizontal: wp(3.5),
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerSecondaryText: {
    color: colors.text,
    fontSize: fontSize(13),
    fontWeight: '700',
  },
  centerAction: {
    alignSelf: 'stretch',
    marginTop: hp(1.6),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(6),
  },
  waiting: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize(15),
  },
  scroll: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1.5),
  },
  matchTitle: {
    fontSize: fontSize(20),
    fontWeight: '800',
    color: colors.text,
  },
  resultLine: {
    marginTop: hp(0.5),
    fontSize: fontSize(13),
    color: colors.textMuted,
  },
  target: {
    marginTop: hp(1),
    fontSize: fontSize(14),
    fontWeight: '700',
    color: colors.primary,
  },
  scoreCard: {
    marginTop: hp(1.5),
    padding: wp(4),
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  scoreMain: {
    fontSize: fontSize(40),
    fontWeight: '800',
    color: colors.text,
  },
  overs: {
    marginTop: hp(0.3),
    fontSize: fontSize(14),
    color: colors.textMuted,
  },
  rateRow: {
    marginTop: hp(1.2),
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateCell: {
    flex: 1,
  },
  rateDivider: {
    width: 1,
    height: hp(3.5),
    backgroundColor: colors.border,
    marginHorizontal: wp(2),
  },
  rateLabel: {
    fontSize: fontSize(11),
    fontWeight: '700',
    color: colors.textMuted,
  },
  rateValue: {
    marginTop: hp(0.2),
    fontSize: fontSize(18),
    fontWeight: '800',
    color: colors.text,
  },
  tabRow: {
    marginTop: hp(2),
    flexDirection: 'row',
    gap: wp(2),
  },
  tab: {
    flex: 1,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: hp(1.1),
    paddingHorizontal: wp(2),
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  tabText: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  ballBlock: {
    marginTop: hp(2),
  },
  ballTitle: {
    fontSize: fontSize(14),
    fontWeight: '800',
    color: colors.text,
    marginBottom: hp(0.8),
  },
  rescanBtn: {
    marginTop: hp(2.5),
    backgroundColor: colors.primary,
    borderRadius: wp(6),
    paddingVertical: hp(1.5),
    alignItems: 'center',
  },
  rescanText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: fontSize(15),
  },
  scanAgainBtn: {
    marginTop: hp(1.2),
    borderRadius: wp(6),
    paddingVertical: hp(1.4),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanAgainText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: fontSize(15),
  },
  pressed: {
    opacity: 0.88,
  },
});
