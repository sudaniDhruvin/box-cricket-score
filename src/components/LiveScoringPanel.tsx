import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMatchStore } from '../store/useMatchStore';
import { colors } from '../theme/colors';
import type {
  Delivery,
  MatchSummary,
  OverReplay,
  WicketDismissal,
} from '../types/match';
import {
  applyDeliveryToMatch,
  finalizeLiveMatchIfNeeded,
  isInningsComplete,
  legalCountInOver,
  prepareNextOverSlot,
  runsDelivery,
  wicketDelivery,
} from '../utils/applyScoringDelivery';
import {
  formatMatchResult,
  formatOvers,
  formatRunRate,
  legalBallsBowled,
  runRateFromLegalBalls,
} from '../utils/cricketFormat';
import { countsAsLegalBall, tallyDeliveryRuns } from '../utils/deliveryScoring';
import { fontSize, hp, wp } from '../utils';

function cloneMatch(m: MatchSummary): MatchSummary {
  return JSON.parse(JSON.stringify(m)) as MatchSummary;
}

function overReplayOverview(over: OverReplay) {
  const runs = over.deliveries.reduce((s, d) => s + tallyDeliveryRuns(d), 0);
  const wkts = over.deliveries.filter(d => d.type === 'wicket').length;
  const legal = legalCountInOver(over.deliveries);
  const fours = over.deliveries.filter(d => d.type === 'four').length;
  const sixes = over.deliveries.filter(d => d.type === 'six').length;
  return { runs, wkts, legal, fours, sixes, balls: over.deliveries.length };
}

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const WICKET_OPTIONS: { id: WicketDismissal; label: string }[] = [
  { id: 'bowled', label: 'Bowled' },
  { id: 'caught', label: 'Caught' },
  { id: 'lbw', label: 'LBW' },
  { id: 'run-out', label: 'Run out' },
  { id: 'stumped', label: 'Stumped' },
  { id: 'hit-wicket', label: 'Hit wicket' },
  { id: 'other', label: 'Other' },
];

const UNDO_MAX = 40;
const RUNS_ROW: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [0, 1, 2, 3, 4, 5, 6];

function MiniBall({ d }: { d: Delivery }) {
  const { bg, fg } = miniPalette(d);
  return (
    <View style={[styles.miniBall, { backgroundColor: bg }]}>
      <Text style={[styles.miniBallText, { color: fg }]} numberOfLines={1}>
        {d.label}
      </Text>
    </View>
  );
}

function miniPalette(d: Delivery): { bg: string; fg: string } {
  switch (d.type) {
    case 'dot':
      return { bg: colors.ballDot, fg: colors.ballDotText };
    case 'single':
    case 'two':
    case 'three':
    case 'five':
      return { bg: colors.ballRuns, fg: colors.ballRunsText };
    case 'four':
      return { bg: colors.ballFour, fg: colors.background };
    case 'six':
      return { bg: colors.ballSix, fg: colors.background };
    case 'wicket':
      return { bg: colors.ballWicket, fg: colors.background };
    case 'wide':
      return (d.wideRuns ?? 0) > 0
        ? { bg: colors.ballWideExtra, fg: colors.background }
        : { bg: colors.ballWide, fg: colors.background };
    case 'no-ball':
      return (d.noBallRuns ?? 0) > 0
        ? { bg: colors.ballNoBallRuns, fg: colors.background }
        : { bg: colors.ballNoBall, fg: colors.background };
    case 'bye':
      return { bg: colors.ballBye, fg: colors.background };
    default:
      return { bg: colors.ballDot, fg: colors.ballDotText };
  }
}

export interface LiveScoringPanelProps {
  matchId: string;
  onClose: () => void;
}

export function LiveScoringPanel({ matchId, onClose }: LiveScoringPanelProps) {
  const insets = useSafeAreaInsets();
  const updateMatch = useMatchStore(s => s.updateMatch);
  const match = useMatchStore(s => s.matches.find(m => m.id === matchId));

  const undoRef = useRef<MatchSummary[]>([]);
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [wicketOpen, setWicketOpen] = useState(false);
  const [overCompleteModal, setOverCompleteModal] = useState<OverReplay | null>(
    null,
  );
  const [matchOverModal, setMatchOverModal] = useState<MatchSummary | null>(
    null,
  );
  const [editA, setEditA] = useState('');
  const [editB, setEditB] = useState('');

  const activeIdx = match?.scoringActiveInnings ?? 0;
  const activeInn = match?.innings[activeIdx];
  const oversCap = match?.oversPerSide ?? 0;

  const replay = useMemo(
    () => activeInn?.overReplay ?? [],
    [activeInn?.overReplay],
  );
  const currentOver = replay[replay.length - 1];
  const currentBalls = currentOver?.deliveries ?? [];
  const legalInCurrent = currentBalls.filter(countsAsLegalBall).length;

  const recentOvers = useMemo(() => {
    if (replay.length <= 1) {
      return [];
    }
    return replay.slice(0, -1).slice(-3);
  }, [replay]);

  const firstInnDone =
    match != null &&
    isInningsComplete(match.innings[0], match.oversPerSide ?? 0);
  const showStartSecondCta = match != null && activeIdx === 0 && firstInnDone;

  const legalBowledActive =
    activeInn != null ? legalBallsBowled(activeInn.overs) : 0;
  const currentRR =
    activeInn != null
      ? runRateFromLegalBalls(activeInn.runs, legalBowledActive)
      : null;
  const oversCapBalls = oversCap > 0 ? oversCap * 6 : 0;
  const legalBallsRemaining =
    oversCapBalls > 0 ? Math.max(0, oversCapBalls - legalBowledActive) : null;
  const oversLeftDisplay =
    legalBallsRemaining != null
      ? formatOvers({
          fullOvers: Math.floor(legalBallsRemaining / 6),
          balls: legalBallsRemaining % 6,
        })
      : null;

  const chase =
    activeIdx === 1 && firstInnDone && match != null && activeInn != null
      ? (() => {
          const firstRuns = match.innings[0].runs;
          const target = firstRuns + 1;
          const need = Math.max(0, target - activeInn.runs);
          const rrr =
            need > 0 &&
            legalBallsRemaining != null &&
            legalBallsRemaining > 0
              ? (need * 6) / legalBallsRemaining
              : null;
          return { target, need, rrr };
        })()
      : null;

  const openEdit = useCallback(() => {
    if (!match) {
      return;
    }
    setEditA(match.innings[0].teamName);
    setEditB(match.innings[1].teamName);
    setEditOpen(true);
  }, [match]);

  const saveEdit = useCallback(() => {
    if (!match) {
      return;
    }
    const a = editA.trim() || 'Team A';
    const b = editB.trim() || 'Team B';
    if (a.toLowerCase() === b.toLowerCase()) {
      Alert.alert('Names', 'Team names must be different.');
      return;
    }
    updateMatch(match.id, m => ({
      ...m,
      innings: [
        { ...m.innings[0], teamName: a },
        { ...m.innings[1], teamName: b },
      ],
    }));
    setEditOpen(false);
  }, [match, editA, editB, updateMatch]);

  const apply = useCallback(
    (d: Delivery) => {
      const cur = useMatchStore.getState().matches.find(m => m.id === matchId);
      if (!cur) {
        return;
      }
      const stack = undoRef.current;
      stack.push(cloneMatch(cur));
      if (stack.length > UNDO_MAX) {
        stack.shift();
      }
      const result = applyDeliveryToMatch(cur, d);
      if (!result.ok) {
        stack.pop();
        if (result.reason === 'match_complete') {
          return;
        }
        if (result.reason === 'innings_overs_complete') {
          const idx = cur.scoringActiveInnings ?? 0;
          Alert.alert(
            'Overs complete',
            idx === 0
              ? 'This innings has used all allocated overs. Start the second innings when ready.'
              : 'All overs for this innings have been bowled.',
          );
        } else {
          Alert.alert('Innings over', 'All wickets are down for this innings.');
        }
        return;
      }
      const finalized = finalizeLiveMatchIfNeeded(result.match);
      updateMatch(matchId, () => finalized);
      if (finalized.status === 'completed') {
        setOverCompleteModal(null);
        setMatchOverModal(finalized);
      } else if (result.overJustCompleted) {
        setOverCompleteModal(result.overJustCompleted);
      }
    },
    [matchId, updateMatch],
  );

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (!prev) {
      return;
    }
    setOverCompleteModal(null);
    setMatchOverModal(null);
    updateMatch(matchId, () => prev);
  }, [matchId, updateMatch]);

  const startSecond = useCallback(() => {
    if (!match) {
      return;
    }
    updateMatch(match.id, m => ({
      ...m,
      scoringActiveInnings: 1,
    }));
  }, [match, updateMatch]);

  const toggleRecent = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRecentExpanded(e => !e);
  }, []);

  const dismissOverCompleteModal = useCallback(() => {
    setOverCompleteModal(null);
    updateMatch(matchId, m => {
      const idx = m.scoringActiveInnings ?? 0;
      const inn = m.innings[idx];
      const nextInn = prepareNextOverSlot(inn);
      if (nextInn === inn) {
        return m;
      }
      const innings: [typeof inn, typeof inn] =
        idx === 0 ? [nextInn, m.innings[1]] : [m.innings[0], nextInn];
      return { ...m, innings };
    });
  }, [matchId, updateMatch]);

  const overCompleteStats = useMemo(
    () =>
      overCompleteModal != null
        ? overReplayOverview(overCompleteModal)
        : null,
    [overCompleteModal],
  );

  const matchOverCopy = useMemo(
    () => (matchOverModal != null ? formatMatchResult(matchOverModal) : null),
    [matchOverModal],
  );

  const dismissMatchOver = useCallback(() => {
    setMatchOverModal(null);
    onClose();
  }, [onClose]);

  if (!match || !activeInn) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={styles.missing}>Match not found.</Text>
        <Pressable onPress={onClose} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Text style={styles.backChev}>{'\u2039'}</Text>
          <Text style={styles.backLbl}>Home</Text>
        </Pressable>
        <View style={styles.toolbarRight}>
          <Pressable
            onPress={undo}
            style={({ pressed }) => [
              styles.iconHit,
              pressed && styles.backPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Undo last ball"
          >
            <Text style={styles.iconLbl}>Undo</Text>
          </Pressable>
          <Pressable
            onPress={openEdit}
            style={({ pressed }) => [
              styles.iconHit,
              pressed && styles.backPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Edit team names"
          >
            <Text style={styles.editIcon}>{'\u270E'}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, hp(3)) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inningsBanner}>
          <Text style={styles.inningsTag}>
            {activeIdx === 0 ? '1st innings' : '2nd innings'}
          </Text>
          <Text style={styles.battingName} numberOfLines={1}>
            {activeInn.teamName}
          </Text>
          <Text style={styles.limitHint}>
            {oversCap} overs · {activeInn.wickets}/{MAX_WICKETS_DISPLAY} wkts
          </Text>
        </View>

        {showStartSecondCta ? (
          <Pressable
            onPress={startSecond}
            style={({ pressed }) => [
              styles.secondBanner,
              pressed && styles.secondBannerPressed,
            ]}
          >
            <Text style={styles.secondBannerText}>
              First innings complete — start 2nd innings
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.scoreCard}>
          <View style={styles.scoreCardRow}>
            <View>
              <Text style={styles.scoreHuge}>
                {activeInn.runs}/{activeInn.wickets}
              </Text>
              <Text style={styles.scoreSub}>runs / wickets</Text>
            </View>
            <View style={styles.scoreMetaCol}>
              <Text style={styles.scoreMetaLbl}>Overs</Text>
              <Text style={styles.scoreMetaVal}>
                {formatOvers(activeInn.overs)}
              </Text>
              <Text style={styles.scoreMetaLbl}>Legal this over</Text>
              <Text style={styles.scoreMetaVal}>{legalInCurrent}/6</Text>
            </View>
          </View>
          <View style={styles.scoreCardStats}>
            {chase != null ? (
              <>
                <View style={styles.scoreCardStatCell}>
                  <Text style={styles.scoreCardStatLbl}>Target</Text>
                  <Text style={styles.scoreCardStatVal}>{chase.target}</Text>
                </View>
                <View style={styles.scoreCardStatCell}>
                  <Text style={styles.scoreCardStatLbl}>Need</Text>
                  <Text style={styles.scoreCardStatVal}>
                    {chase.need === 0 ? '0' : chase.need}
                  </Text>
                </View>
                <View style={styles.scoreCardStatCell}>
                  <Text style={styles.scoreCardStatLbl}>CRR</Text>
                  <Text style={styles.scoreCardStatVal}>
                    {formatRunRate(currentRR)}
                  </Text>
                </View>
                <View style={styles.scoreCardStatCell}>
                  <Text style={styles.scoreCardStatLbl}>RRR</Text>
                  <Text style={styles.scoreCardStatVal}>
                    {chase.need === 0 ? '—' : formatRunRate(chase.rrr)}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.scoreCardStatCell}>
                  <Text style={styles.scoreCardStatLbl}>Run rate</Text>
                  <Text style={styles.scoreCardStatVal}>
                    {formatRunRate(currentRR)}
                  </Text>
                </View>
                {oversLeftDisplay != null ? (
                  <View style={styles.scoreCardStatCell}>
                    <Text style={styles.scoreCardStatLbl}>Overs left</Text>
                    <Text style={styles.scoreCardStatVal}>
                      {oversLeftDisplay}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>

        <Text style={styles.sectionKicker}>Current over</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.currentOverRow}
        >
          {currentBalls.length === 0 ? (
            <Text style={styles.emptyCur}>No balls yet</Text>
          ) : (
            currentBalls.map((d, i) => <MiniBall key={`cb-${i}`} d={d} />)
          )}
        </ScrollView>

        {recentOvers.length > 0 ? (
          <View style={styles.recentBlock}>
            <Pressable
              onPress={toggleRecent}
              style={({ pressed }) => [
                styles.recentHeader,
                pressed && styles.backPressed,
              ]}
            >
              <Text style={styles.recentTitle}>Recent overs</Text>
              <Text style={styles.recentCaret}>
                {recentExpanded ? '\u25B2' : '\u25BC'}
              </Text>
            </Pressable>
            {!recentExpanded ? (
              <Text style={styles.recentCollapsed} numberOfLines={2}>
                {recentOvers
                  .map(o => {
                    const r = o.deliveries.reduce(
                      (s, x) => s + tallyDeliveryRuns(x),
                      0,
                    );
                    return `O${o.overNumber}: ${r} runs`;
                  })
                  .join(' · ')}
              </Text>
            ) : (
              <View style={styles.recentExpandedBox}>
                {recentOvers.map(o => (
                  <View key={o.overNumber} style={styles.recentOverLine}>
                    <Text style={styles.recentOverLbl}>
                      Over {o.overNumber}
                    </Text>
                    <View style={styles.recentChips}>
                      {o.deliveries.map((d, i) => (
                        <MiniBall key={`${o.overNumber}-${i}`} d={d} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.runsSectionHeader}>
          <Text
            style={styles.runsSectionKicker}
            {...(Platform.OS === 'android'
              ? { includeFontPadding: false }
              : {})}
          >
            Runs off the bat 00
          </Text>
        </View>
        <View style={styles.runsGrid}>
          {RUNS_ROW.map(r => (
            <Pressable
              key={r}
              onPress={() => apply(runsDelivery(r))}
              style={({ pressed }) => [
                styles.runCell,
                pressed && styles.runCellPressed,
              ]}
              // accessibilityRole="button"
              // accessibilityLabel={`${r} runs`}
            >
              <Text
                style={styles.runCellText}
                {...(Platform.OS === 'android'
                  ? { includeFontPadding: false }
                  : {})}
              >
                {r}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionKicker}>Extras</Text>
        <View style={styles.extrasRow}>
          <Pressable
            onPress={() => apply({ type: 'wide', label: 'Wd', wideRuns: 0 })}
            style={({ pressed }) => [
              styles.extraBtn,
              { borderColor: colors.ballWide },
              pressed && styles.runCellPressed,
            ]}
          >
            <Text style={styles.extraBtnText}>Wd</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              apply({ type: 'no-ball', label: 'Nb', noBallRuns: 0 })
            }
            style={({ pressed }) => [
              styles.extraBtn,
              { borderColor: colors.ballNoBall },
              pressed && styles.runCellPressed,
            ]}
          >
            <Text style={styles.extraBtnText}>Nb</Text>
          </Pressable>
          <Pressable
            onPress={() => apply({ type: 'bye', label: 'By' })}
            style={({ pressed }) => [
              styles.extraBtn,
              { borderColor: colors.ballBye },
              pressed && styles.runCellPressed,
            ]}
          >
            <Text style={styles.extraBtnText}>By</Text>
          </Pressable>
        </View>
        <View style={styles.extrasSubRow}>
          {[1, 2, 4].map(n => (
            <Pressable
              key={`wd${n}`}
              onPress={() =>
                apply({
                  type: 'wide',
                  label: `Wd+${n}`,
                  wideRuns: n,
                })
              }
              style={({ pressed }) => [
                styles.extraSmall,
                { borderColor: colors.ballWideExtra },
                pressed && styles.runCellPressed,
              ]}
            >
              <Text style={styles.extraSmallText}>Wd+{n}</Text>
            </Pressable>
          ))}
          {[1, 4, 6].map(n => (
            <Pressable
              key={`nb${n}`}
              onPress={() =>
                apply({
                  type: 'no-ball',
                  label: `Nb+${n}`,
                  noBallRuns: n,
                })
              }
              style={({ pressed }) => [
                styles.extraSmall,
                { borderColor: colors.ballNoBallRuns },
                pressed && styles.runCellPressed,
              ]}
            >
              <Text style={styles.extraSmallText}>Nb+{n}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionKicker}>Wicket</Text>
        <Pressable
          onPress={() => setWicketOpen(true)}
          style={({ pressed }) => [
            styles.wicketBtn,
            pressed && styles.runCellPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Log wicket"
        >
          <Text style={styles.wicketBtnText}>Wicket — choose dismissal</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={wicketOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setWicketOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setWicketOpen(false)}
        >
          <Pressable
            style={styles.modalSheet}
            onPress={e => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>How was the batter out?</Text>
            {WICKET_OPTIONS.map(opt => (
              <Pressable
                key={opt.id}
                onPress={() => {
                  setWicketOpen(false);
                  apply(wicketDelivery(opt.id));
                }}
                style={({ pressed }) => [
                  styles.modalRow,
                  pressed && styles.modalRowPressed,
                ]}
              >
                <Text style={styles.modalRowText}>{opt.label}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setWicketOpen(false)}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={overCompleteModal != null}
        transparent
        animationType="fade"
        onRequestClose={dismissOverCompleteModal}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={dismissOverCompleteModal}
        >
          <Pressable
            style={styles.overCompleteSheet}
            onPress={e => e.stopPropagation()}
          >
            {overCompleteModal ? (
              <>
                <Text style={styles.overCompleteTitle}>Over complete</Text>
                <Text style={styles.overCompleteSubtitle}>
                  Over {overCompleteModal.overNumber} · {activeInn.teamName}
                </Text>
                {overCompleteStats ? (
                  <View style={styles.overCompleteStats}>
                    <View style={styles.overCompleteStatCell}>
                      <Text style={styles.overCompleteStatLbl}>Runs</Text>
                      <Text style={styles.overCompleteStatVal}>
                        {overCompleteStats.runs}
                      </Text>
                    </View>
                    <View style={styles.overCompleteStatCell}>
                      <Text style={styles.overCompleteStatLbl}>Wkts</Text>
                      <Text style={styles.overCompleteStatVal}>
                        {overCompleteStats.wkts}
                      </Text>
                    </View>
                    <View style={styles.overCompleteStatCell}>
                      <Text style={styles.overCompleteStatLbl}>4s / 6s</Text>
                      <Text style={styles.overCompleteStatVal}>
                        {overCompleteStats.fours} / {overCompleteStats.sixes}
                      </Text>
                    </View>
                    <View style={styles.overCompleteStatCell}>
                      <Text style={styles.overCompleteStatLbl}>Balls</Text>
                      <Text style={styles.overCompleteStatVal}>
                        {overCompleteStats.legal} legal ·{' '}
                        {overCompleteStats.balls} del.
                      </Text>
                    </View>
                  </View>
                ) : null}
                <Text style={styles.overCompleteChipsTitle}>Ball-by-ball</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.overCompleteChipsRow}
                >
                  {overCompleteModal.deliveries.map((d, i) => (
                    <MiniBall key={`oc-${i}`} d={d} />
                  ))}
                </ScrollView>
                <Pressable
                  onPress={dismissOverCompleteModal}
                  style={({ pressed }) => [
                    styles.overCompleteCta,
                    pressed && styles.overCompleteCtaPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Close over summary"
                >
                  <Text style={styles.overCompleteCtaText}>Continue</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={matchOverModal != null}
        transparent
        animationType="fade"
        onRequestClose={dismissMatchOver}
      >
        <View style={styles.matchOverBackdrop}>
          <View style={styles.matchOverSheet}>
            <Text style={styles.matchOverTitle}>Match over</Text>
            {matchOverCopy != null ? (
              <>
                <Text style={styles.matchOverHeadline}>
                  {matchOverCopy.headline}
                </Text>
                <Text style={styles.matchOverSub}>{matchOverCopy.loserDetail}</Text>
              </>
            ) : null}
            {matchOverModal != null ? (
              <View style={styles.matchOverScores}>
                <Text style={styles.matchOverScoreLine}>
                  1st · {matchOverModal.innings[0].teamName}:{' '}
                  {matchOverModal.innings[0].runs}/
                  {matchOverModal.innings[0].wickets} (
                  {formatOvers(matchOverModal.innings[0].overs)} ov)
                </Text>
                <Text style={styles.matchOverScoreLine}>
                  2nd · {matchOverModal.innings[1].teamName}:{' '}
                  {matchOverModal.innings[1].runs}/
                  {matchOverModal.innings[1].wickets} (
                  {formatOvers(matchOverModal.innings[1].overs)} ov)
                </Text>
              </View>
            ) : null}
            <Pressable
              onPress={dismissMatchOver}
              style={({ pressed }) => [
                styles.matchOverCta,
                pressed && styles.matchOverCtaPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close and return home"
            >
              <Text style={styles.matchOverCtaText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setEditOpen(false)}
        >
          <Pressable
            style={styles.modalSheet}
            onPress={e => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Team names</Text>
            <Text style={styles.editFieldLbl}>1st innings (home row)</Text>
            <TextInput
              value={editA}
              onChangeText={setEditA}
              style={styles.editInput}
              placeholder="Team name"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.editFieldLbl}>2nd innings</Text>
            <TextInput
              value={editB}
              onChangeText={setEditB}
              style={styles.editInput}
              placeholder="Team name"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.editActions}>
              <Pressable
                onPress={() => setEditOpen(false)}
                style={styles.editGhost}
              >
                <Text style={styles.editGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveEdit} style={styles.editSave}>
                <Text style={styles.editSaveText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const MAX_WICKETS_DISPLAY = 10;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderRadius: wp(2),
  },
  iconHit: {
    paddingVertical: hp(1),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2),
  },
  backPressed: {
    backgroundColor: colors.primaryFaint,
  },
  backChev: {
    fontSize: fontSize(26),
    fontWeight: '300',
    color: colors.primary,
    marginRight: wp(0.5),
  },
  backLbl: {
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.primary,
  },
  iconLbl: {
    fontSize: fontSize(14),
    fontWeight: '700',
    color: colors.primary,
  },
  editIcon: {
    fontSize: fontSize(18),
    color: colors.text,
  },
  missing: {
    padding: wp(4),
    fontSize: fontSize(15),
    color: colors.textMuted,
  },
  ghostBtn: {
    marginHorizontal: wp(4),
    alignSelf: 'flex-start',
    padding: wp(3),
  },
  ghostBtnText: {
    fontSize: fontSize(15),
    fontWeight: '700',
    color: colors.primary,
  },
  inningsBanner: {
    marginBottom: hp(1),
  },
  inningsTag: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  battingName: {
    fontSize: fontSize(20),
    fontWeight: '900',
    color: colors.text,
    marginTop: hp(0.2),
  },
  limitHint: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: hp(0.2),
  },
  secondBanner: {
    backgroundColor: colors.primarySoft,
    borderRadius: wp(2.5),
    padding: wp(3),
    marginBottom: hp(1.2),
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondBannerPressed: {
    opacity: 0.92,
  },
  secondBannerText: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  scoreCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    padding: wp(4),
    marginBottom: hp(1.2),
    backgroundColor: colors.surfaceMuted,
  },
  scoreCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  scoreHuge: {
    fontSize: fontSize(36),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  scoreSub: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: hp(0.2),
  },
  scoreMetaCol: {
    alignItems: 'flex-end',
  },
  scoreMetaLbl: {
    fontSize: fontSize(10),
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  scoreMetaVal: {
    fontSize: fontSize(16),
    fontWeight: '900',
    color: colors.text,
    marginBottom: hp(0.4),
  },
  scoreCardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginTop: hp(1.2),
    paddingTop: hp(1),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scoreCardStatCell: {
    minWidth: wp(22),
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.background,
    borderRadius: wp(2),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(2.5),
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreCardStatLbl: {
    fontSize: fontSize(9),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: hp(0.15),
  },
  scoreCardStatVal: {
    fontSize: fontSize(15),
    fontWeight: '900',
    color: colors.text,
  },
  sectionKicker: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: hp(0.5),
    marginTop: hp(0.8),
  },
  runsSectionHeader: {
    marginTop: hp(0.8),
    marginBottom: hp(0.5),
    minHeight: hp(3.6),
    justifyContent: 'center',
  },
  runsSectionKicker: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    lineHeight: fontSize(12),
    ...Platform.select({
      android: { textAlignVertical: 'center' as const },
      default: {},
    }),
  },
  currentOverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingVertical: hp(0.8),
    minHeight: hp(5),
  },
  emptyCur: {
    fontSize: fontSize(12),
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  miniBall: {
    minWidth: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1),
  },
  miniBallText: {
    fontSize: fontSize(11),
    fontWeight: '900',
  },
  recentBlock: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(2.5),
    marginBottom: hp(0.5),
    overflow: 'hidden',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.7),
    backgroundColor: colors.primaryFaint,
  },
  recentTitle: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.text,
  },
  recentCaret: {
    fontSize: fontSize(10),
    color: colors.primary,
    fontWeight: '900',
  },
  recentCollapsed: {
    fontSize: fontSize(10),
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.6),
  },
  recentExpandedBox: {
    paddingHorizontal: wp(2),
    paddingBottom: hp(0.8),
    gap: hp(0.5),
  },
  recentOverLine: {
    gap: hp(0.25),
  },
  recentOverLbl: {
    fontSize: fontSize(9),
    fontWeight: '800',
    color: colors.textMuted,
  },
  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1),
  },
  runsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(0.5),
  },
  runCell: {
    width: (wp(100) - wp(8) - wp(2) * 3) / 4,
    maxWidth: wp(22),
    height: hp(6),
    borderRadius: wp(2.5),
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runCellPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  runCellText: {
    fontSize: fontSize(20),
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  extrasRow: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(0.6),
  },
  extraBtn: {
    flex: 1,
    paddingVertical: hp(1.1),
    borderRadius: wp(2.5),
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  extraBtnText: {
    fontSize: fontSize(15),
    fontWeight: '900',
    color: colors.text,
  },
  extrasSubRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
    marginBottom: hp(0.5),
  },
  extraSmall: {
    paddingVertical: hp(0.55),
    paddingHorizontal: wp(2.2),
    borderRadius: wp(1.8),
    borderWidth: 1.5,
    backgroundColor: colors.background,
  },
  extraSmallText: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: colors.text,
  },
  wicketBtn: {
    paddingVertical: hp(1.4),
    borderRadius: wp(2.5),
    backgroundColor: colors.ballWicket,
    alignItems: 'center',
    marginBottom: hp(2),
  },
  wicketBtnText: {
    fontSize: fontSize(15),
    fontWeight: '800',
    color: colors.background,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7,7,7,0.45)',
    justifyContent: 'center',
    padding: wp(5),
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderRadius: wp(3),
    padding: wp(4),
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: fontSize(17),
    fontWeight: '900',
    color: colors.text,
    marginBottom: hp(1),
  },
  modalRow: {
    paddingVertical: hp(1.2),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalRowPressed: {
    backgroundColor: colors.primaryFaint,
  },
  modalRowText: {
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.text,
  },
  modalCancel: {
    marginTop: hp(1),
    paddingVertical: hp(1),
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: fontSize(15),
    fontWeight: '700',
    color: colors.primary,
  },
  overCompleteSheet: {
    backgroundColor: colors.background,
    borderRadius: wp(3),
    padding: wp(4),
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  overCompleteTitle: {
    fontSize: fontSize(20),
    fontWeight: '900',
    color: colors.text,
    marginBottom: hp(0.3),
  },
  overCompleteSubtitle: {
    fontSize: fontSize(14),
    fontWeight: '700',
    color: colors.primary,
    marginBottom: hp(1.2),
  },
  overCompleteStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(1),
  },
  overCompleteStatCell: {
    width: '47%',
    minWidth: wp(36),
    flexGrow: 1,
    padding: wp(2.5),
    borderRadius: wp(2),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overCompleteStatLbl: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: hp(0.2),
  },
  overCompleteStatVal: {
    fontSize: fontSize(17),
    fontWeight: '900',
    color: colors.text,
  },
  overCompleteChipsTitle: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: hp(0.5),
  },
  overCompleteChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingVertical: hp(0.6),
    marginBottom: hp(1.2),
  },
  overCompleteCta: {
    backgroundColor: colors.primary,
    borderRadius: wp(2.5),
    paddingVertical: hp(1.4),
    alignItems: 'center',
  },
  overCompleteCtaPressed: {
    opacity: 0.92,
  },
  overCompleteCtaText: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.background,
  },
  matchOverBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7,7,7,0.5)',
    justifyContent: 'center',
    padding: wp(5),
  },
  matchOverSheet: {
    backgroundColor: colors.background,
    borderRadius: wp(3),
    padding: wp(4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchOverTitle: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: hp(0.6),
  },
  matchOverHeadline: {
    fontSize: fontSize(20),
    fontWeight: '900',
    color: colors.text,
    marginBottom: hp(0.5),
  },
  matchOverSub: {
    fontSize: fontSize(14),
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: hp(1.2),
  },
  matchOverScores: {
    gap: hp(0.4),
    marginBottom: hp(1.5),
    paddingVertical: hp(1),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchOverScoreLine: {
    fontSize: fontSize(13),
    fontWeight: '700',
    color: colors.text,
  },
  matchOverCta: {
    backgroundColor: colors.primary,
    borderRadius: wp(2.5),
    paddingVertical: hp(1.4),
    alignItems: 'center',
  },
  matchOverCtaPressed: {
    opacity: 0.92,
  },
  matchOverCtaText: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.background,
  },
  editFieldLbl: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: hp(0.3),
    marginTop: hp(0.5),
  },
  editInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    fontSize: fontSize(16),
    fontWeight: '600',
    color: colors.text,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: wp(2),
    marginTop: hp(1.5),
  },
  editGhost: {
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
  },
  editGhostText: {
    fontSize: fontSize(15),
    fontWeight: '700',
    color: colors.textMuted,
  },
  editSave: {
    backgroundColor: colors.primary,
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    borderRadius: wp(2),
  },
  editSaveText: {
    fontSize: fontSize(15),
    fontWeight: '800',
    color: colors.background,
  },
});
