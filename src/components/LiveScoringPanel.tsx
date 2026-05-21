import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppSheet, AppSheetButton } from './AppSheet';
import { AnimatedBallChip } from './AnimatedBallChip';
import { PressableScale } from './PressableScale';
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
  wicketsCapForMatch,
} from '../utils/applyScoringDelivery';
import { CurrentOverStrip, type OverStripMode } from './CurrentOverStrip';
import { OverHistorySheet } from './OverHistorySheet';
import { ScoreHeroHeader } from './ScoreHeroHeader';
import { ScoringPad } from './ScoringPad';
import { ScoringToolbar } from './ScoringToolbar';
import { ScoringHelpModal, type ScoringHelpFocus } from './ScoringHelpModal';
import {
  computeChaseInfo,
  formatMatchResult,
  formatOvers,
  legalBallsBowled,
  runRateFromLegalBalls,
} from '../utils/cricketFormat';
import { countsAsLegalBall, tallyDeliveryRuns } from '../utils/deliveryScoring';
import type { MatchMomentKind } from '../utils/matchEventFeedback';
import { momentKindForDelivery } from '../utils/matchEventFeedback';
import {
  pickPrimaryMoment,
  runAfterScoreCommit,
} from '../utils/matchMomentQueue';
import { animateScoringLayout } from '../utils/scoringMotion';
import { fontSize, hp, wp } from '../utils';
import { StickyBottomBannerAd } from './StickyBottomBannerAd';

function cloneMatch(m: MatchSummary): MatchSummary {
  const clone = (
    globalThis as typeof globalThis & {
      structuredClone?: <T>(v: T) => T;
    }
  ).structuredClone;
  if (clone != null) {
    return clone(m);
  }
  return JSON.parse(JSON.stringify(m)) as MatchSummary;
}

function isImpactfulDelivery(d: Delivery): boolean {
  return momentKindForDelivery(d) != null;
}

function overReplayOverview(over: OverReplay) {
  const runs = over.deliveries.reduce((s, d) => s + tallyDeliveryRuns(d), 0);
  const wkts = over.deliveries.filter(d => d.type === 'wicket').length;
  const legal = legalCountInOver(over.deliveries);
  const fours = over.deliveries.filter(d => d.type === 'four').length;
  const sixes = over.deliveries.filter(d => d.type === 'six').length;
  return { runs, wkts, legal, fours, sixes, balls: over.deliveries.length };
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
  const [canUndo, setCanUndo] = useState(false);
  const [extrasMoreOpen, setExtrasMoreOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpFocus, setHelpFocus] = useState<ScoringHelpFocus>('general');
  const [historyOpen, setHistoryOpen] = useState(false);

  const openScoringHelp = useCallback((focus: ScoringHelpFocus = 'general') => {
    setHelpFocus(focus);
    setHelpOpen(true);
  }, []);
  const [editOpen, setEditOpen] = useState(false);
  const [wicketOpen, setWicketOpen] = useState(false);
  const [wicketModalPhase, setWicketModalPhase] = useState<
    'dismissal' | 'run-out-runs'
  >('dismissal');
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
  const currentOverNumber = currentOver?.overNumber ?? 1;
  const currentBalls = currentOver?.deliveries ?? [];
  const legalInCurrent = currentBalls.filter(countsAsLegalBall).length;

  const overStripDisplay = useMemo(() => {
    const slot = replay[replay.length - 1];
    const slotBalls = slot?.deliveries ?? [];
    const activeNum = slot?.overNumber ?? 1;

    if (slotBalls.length > 0) {
      return {
        mode: 'current' as OverStripMode,
        activeOverNumber: activeNum,
        displayOverNumber: undefined,
        deliveries: slotBalls,
      };
    }

    const prev = replay.length >= 2 ? replay[replay.length - 2] : null;
    if (prev != null && prev.deliveries.length > 0) {
      return {
        mode: 'previous' as OverStripMode,
        activeOverNumber: activeNum,
        displayOverNumber: prev.overNumber,
        deliveries: prev.deliveries,
      };
    }

    return {
      mode: 'waiting' as OverStripMode,
      activeOverNumber: activeNum,
      displayOverNumber: undefined,
      deliveries: [] as Delivery[],
    };
  }, [replay]);

  const wkCap = match != null ? wicketsCapForMatch(match) : 10;

  const firstInnDone = useMemo(() => {
    if (match == null) {
      return false;
    }
    const cap = match.oversPerSide;
    if (cap == null || cap <= 0) {
      return false;
    }
    return isInningsComplete(match.innings[0], cap, wicketsCapForMatch(match));
  }, [match]);

  const firstInningsBreakTagline = useMemo(() => {
    if (match == null) {
      return '';
    }
    const inn = match.innings[0];
    const capW = wicketsCapForMatch(match);
    if (inn.wickets >= capW) {
      return 'All wickets are down for this innings.';
    }
    const cap = match.oversPerSide;
    if (cap != null) {
      return `All ${cap} ${
        cap === 1 ? 'over' : 'overs'
      } for this innings are bowled.`;
    }
    return 'This innings is complete.';
  }, [match]);

  const firstInningsLastOver = useMemo(() => {
    const r = match?.innings[0].overReplay;
    if (r == null || r.length === 0) {
      return null;
    }
    return r[r.length - 1];
  }, [match]);

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
    match != null && activeIdx === 1 && firstInnDone
      ? computeChaseInfo(match)
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
      setCanUndo(stack.length > 0);
      const result = applyDeliveryToMatch(cur, d);
      if (!result.ok) {
        stack.pop();
        setCanUndo(stack.length > 0);
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
      animateScoringLayout(isImpactfulDelivery(d));
      const finalized = finalizeLiveMatchIfNeeded(result.match);
      updateMatch(matchId, () => finalized);

      if (finalized.status === 'completed') {
        setOverCompleteModal(null);
        setMatchOverModal(finalized);
      } else if (result.overJustCompleted) {
        setOverCompleteModal(result.overJustCompleted);
      }

      const momentKinds: MatchMomentKind[] = [];
      const deliveryMoment = momentKindForDelivery(d);
      if (deliveryMoment != null) {
        momentKinds.push(deliveryMoment);
      }
      if (finalized.status === 'completed') {
        momentKinds.push('match-complete');
      } else if (result.overJustCompleted) {
        const inn0 = finalized.innings[0];
        const cap = finalized.oversPerSide;
        if (
          cap != null &&
          cap > 0 &&
          (finalized.scoringActiveInnings ?? 0) === 0 &&
          isInningsComplete(inn0, cap, wicketsCapForMatch(finalized))
        ) {
          momentKinds.push('innings-break');
        } else {
          momentKinds.push('over-complete');
        }
      }
      const primaryMoment = pickPrimaryMoment(momentKinds);
      if (primaryMoment != null) {
        runAfterScoreCommit(primaryMoment);
      }
    },
    [matchId, updateMatch],
  );

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (!prev) {
      setCanUndo(false);
      return;
    }
    setCanUndo(undoRef.current.length > 0);
    setOverCompleteModal(null);
    setMatchOverModal(null);
    updateMatch(matchId, () => prev);
  }, [matchId, updateMatch]);

  const startSecond = useCallback(() => {
    setOverCompleteModal(null);
    if (!match) {
      return;
    }
    updateMatch(match.id, m => ({
      ...m,
      scoringActiveInnings: 1,
    }));
  }, [match, updateMatch]);

  const dismissOverCompleteModal = useCallback(() => {
    setOverCompleteModal(null);
    updateMatch(matchId, m => {
      const idx = m.scoringActiveInnings ?? 0;
      const inn = m.innings[idx];
      const cap = m.oversPerSide;
      if (
        cap != null &&
        cap > 0 &&
        isInningsComplete(inn, cap, wicketsCapForMatch(m))
      ) {
        return m;
      }
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
      overCompleteModal != null ? overReplayOverview(overCompleteModal) : null,
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

  const renderMiniBall = useCallback(
    (d: Delivery, key: string) => (
      <AnimatedBallChip chipKey={key}>
        <MiniBall d={d} />
      </AnimatedBallChip>
    ),
    [],
  );

  if (!match || !activeInn) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={styles.missing}>Match not found.</Text>
        <PressableScale onPress={onClose} style={styles.ghostBtn} scaleTo={0.96}>
          <Text style={styles.ghostBtnText}>Back</Text>
        </PressableScale>
      </View>
    );
  }

  const chasePreviewLine =
    activeIdx === 0 && !showStartSecondCta
      ? 'Chase info appears in 2nd innings — tap to learn'
      : undefined;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScoringToolbar
        onExit={onClose}
        onUndo={undo}
        canUndo={canUndo}
        onHistory={() => setHistoryOpen(true)}
        onTeams={openEdit}
        onGuide={() => openScoringHelp('general')}
      />

      <ScoreHeroHeader
        inningsLabel={activeIdx === 0 ? '1st innings' : '2nd innings'}
        teamName={activeInn.teamName}
        runs={activeInn.runs}
        wickets={activeInn.wickets}
        oversDisplay={formatOvers(activeInn.overs)}
        ballsThisOver={legalInCurrent}
        currentOverNumber={currentOverNumber}
        oversCap={oversCap}
        wicketsCap={wkCap}
        chasePreviewLine={chasePreviewLine}
        chase={chase}
        currentRunRate={currentRR}
        oversRemainingDisplay={oversLeftDisplay}
        onOpenChaseHelp={() => openScoringHelp('chase')}
        onChasePreviewPress={() => openScoringHelp('chase')}
      />

      {!showStartSecondCta ? (
        <CurrentOverStrip
          mode={overStripDisplay.mode}
          activeOverNumber={overStripDisplay.activeOverNumber}
          displayOverNumber={overStripDisplay.displayOverNumber}
          deliveries={overStripDisplay.deliveries}
          renderBall={(d, key) => renderMiniBall(d, key)}
        />
      ) : (
        <View style={styles.inningsBreakMain}>
          <Text style={styles.inningsBreakTitle}>1st innings complete</Text>
          <Text style={styles.inningsBreakBody}>
            {activeInn.teamName} — {activeInn.runs}/{activeInn.wickets} (
            {formatOvers(activeInn.overs)} ov)
          </Text>
        </View>
      )}

      {showStartSecondCta ? (
        <PressableScale
          onPress={startSecond}
          scaleTo={0.97}
          containerStyle={styles.startSecondBarWrap}
          style={styles.startSecondBar}
          accessibilityRole="button"
          accessibilityLabel="Start second innings"
        >
          <Text style={styles.startSecondBarText}>Start 2nd innings</Text>
        </PressableScale>
      ) : (
        <ScoringPad
          onRun={r => apply(runsDelivery(r))}
          onWide={() => apply({ type: 'wide', label: 'Wd', wideRuns: 0 })}
          onNoBall={() =>
            apply({ type: 'no-ball', label: 'Nb', noBallRuns: 0 })
          }
          onBye={() => apply({ type: 'bye', label: 'By' })}
          onWidePlus={n =>
            apply({ type: 'wide', label: `Wd+${n}`, wideRuns: n })
          }
          onNoBallPlus={n =>
            apply({ type: 'no-ball', label: `Nb+${n}`, noBallRuns: n })
          }
          onWicket={() => {
            setWicketModalPhase('dismissal');
            setWicketOpen(true);
          }}
          extrasMoreOpen={extrasMoreOpen}
          onToggleExtrasMore={() => setExtrasMoreOpen(o => !o)}
        />
      )}

      <View
        style={[
          styles.bottomAdStrip,
          { paddingBottom: Math.max(insets.bottom, hp(0.5)) },
        ]}
      >
        <StickyBottomBannerAd />
      </View>

      <AppSheet
        visible={wicketOpen}
        onClose={() => {
          setWicketOpen(false);
          setWicketModalPhase('dismissal');
        }}
        title={
          wicketModalPhase === 'run-out-runs'
            ? 'Runs before run out'
            : 'How was the batter out?'
        }
        subtitle={
          wicketModalPhase === 'run-out-runs'
            ? 'Runs on this ball before the wicket (0 if none).'
            : undefined
        }
        layout="compact"
        maxHeightRatio={0.7}
      >
        {wicketModalPhase === 'run-out-runs' ? (
          <>
            <View style={styles.wicketRunsGrid}>
              {RUNS_ROW.map(r => (
                <PressableScale
                  key={`ro-${r}`}
                  onPress={() => {
                    setWicketOpen(false);
                    setWicketModalPhase('dismissal');
                    apply(wicketDelivery('run-out', { runOutRuns: r }));
                  }}
                  scaleTo={0.94}
                  style={styles.wicketRunCell}
                >
                  <Text style={styles.wicketRunCellText}>{r}</Text>
                </PressableScale>
              ))}
            </View>
            <AppSheetButton
              label="Back"
              variant="ghost"
              onPress={() => setWicketModalPhase('dismissal')}
            />
          </>
        ) : (
          <>
            {WICKET_OPTIONS.map(opt => (
              <PressableScale
                key={opt.id}
                onPress={() => {
                  if (opt.id === 'run-out') {
                    setWicketModalPhase('run-out-runs');
                    return;
                  }
                  setWicketOpen(false);
                  apply(wicketDelivery(opt.id));
                }}
                scaleTo={0.98}
                style={styles.modalRow}
              >
                <Text style={styles.modalRowText}>{opt.label}</Text>
              </PressableScale>
            ))}
            <AppSheetButton
              label="Cancel"
              variant="ghost"
              onPress={() => {
                setWicketOpen(false);
                setWicketModalPhase('dismissal');
              }}
            />
          </>
        )}
      </AppSheet>

      <AppSheet
        visible={overCompleteModal != null}
        onClose={dismissOverCompleteModal}
        title="Over complete"
        subtitle={
          overCompleteModal
            ? `Over ${overCompleteModal.overNumber} · ${activeInn.teamName}`
            : undefined
        }
        layout="compact"
        maxHeightRatio={0.68}
        headerExtra={
          overCompleteModal && overCompleteStats ? (
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
                  {overCompleteStats.legal} legal · {overCompleteStats.balls}{' '}
                  del.
                </Text>
              </View>
            </View>
          ) : null
        }
        footer={
          overCompleteModal ? (
            <AppSheetButton
              label={
                firstInnDone && activeIdx === 0
                  ? 'Start 2nd innings'
                  : 'Continue'
              }
              onPress={
                firstInnDone && activeIdx === 0
                  ? startSecond
                  : dismissOverCompleteModal
              }
            />
          ) : null
        }
      >
        {overCompleteModal ? (
          <>
            <Text style={styles.overCompleteChipsTitle}>Ball-by-ball</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.overCompleteChipsRow}
            >
              {overCompleteModal.deliveries.map((d, i) => (
                <MiniBall key={`oc-${i}`} d={d} />
              ))}
            </ScrollView>
          </>
        ) : null}
      </AppSheet>

      <AppSheet
        visible={showStartSecondCta}
        onClose={() => undefined}
        title="1st innings complete"
        layout="center"
        maxHeightRatio={0.75}
        footer={
          <AppSheetButton label="Start 2nd innings" onPress={startSecond} />
        }
      >
        <Text style={styles.firstBreakHeadline}>
          {activeInn.teamName} — {activeInn.runs}/{activeInn.wickets}
          <Text style={styles.firstBreakOversSub}>
            {' '}
            ({formatOvers(activeInn.overs)} ov)
          </Text>
        </Text>
        <Text style={styles.matchOverSub}>{firstInningsBreakTagline}</Text>
        {firstInningsLastOver != null &&
        firstInningsLastOver.deliveries.length > 0 ? (
          <>
            <Text style={styles.firstBreakKicker}>
              {legalCountInOver(firstInningsLastOver.deliveries) === 6
                ? `Over ${firstInningsLastOver.overNumber} (last over)`
                : `Over ${firstInningsLastOver.overNumber}`}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.firstBreakChipsRow}
            >
              {firstInningsLastOver.deliveries.map((d, i) => (
                <MiniBall key={`fb-${i}`} d={d} />
              ))}
            </ScrollView>
          </>
        ) : null}
        <Text style={styles.firstBreakCtaNote}>
          When both sides are ready, start the second innings.
        </Text>
      </AppSheet>

      <AppSheet
        visible={matchOverModal != null}
        onClose={dismissMatchOver}
        title="Match over"
        layout="center"
        maxHeightRatio={0.78}
        footer={<AppSheetButton label="Done" onPress={dismissMatchOver} />}
      >
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
      </AppSheet>

      <AppSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title="Team names"
        layout="compact"
        maxHeightRatio={0.62}
        footer={
          <View style={styles.editActions}>
            <PressableScale
              onPress={() => setEditOpen(false)}
              scaleTo={0.95}
              style={styles.editGhost}
            >
              <Text style={styles.editGhostText}>Cancel</Text>
            </PressableScale>
            <PressableScale onPress={saveEdit} scaleTo={0.96} style={styles.editSave}>
              <Text style={styles.editSaveText}>Save</Text>
            </PressableScale>
          </View>
        }
      >
        <Text style={[styles.editFieldLbl, { marginTop: hp(1) }]}>
          1st innings
        </Text>
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
      </AppSheet>

      <ScoringHelpModal
        visible={helpOpen}
        focus={helpFocus}
        onClose={() => setHelpOpen(false)}
      />

      <OverHistorySheet
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        innings={match.innings}
        initialInningsIndex={activeIdx}
        secondInningsAvailable={showStartSecondCta || activeIdx === 1}
        renderBall={renderMiniBall}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inningsBreakMain: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
  },
  inningsBreakTitle: {
    fontSize: fontSize(18),
    fontWeight: '900',
    color: colors.text,
    marginBottom: hp(0.6),
  },
  inningsBreakBody: {
    fontSize: fontSize(14),
    fontWeight: '600',
    color: colors.textMuted,
    lineHeight: fontSize(20),
  },
  startSecondBarWrap: {
    marginHorizontal: wp(4),
    marginVertical: hp(0.8),
  },
  startSecondBar: {
    paddingVertical: hp(1.5),
    borderRadius: wp(2.5),
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  startSecondBarText: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.background,
  },
  mainColumn: {
    flex: 1,
  },
  scrollFill: {
    flex: 1,
  },
  bottomAdStrip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: hp(1),
  },
  scoringPad: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: hp(0.8),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  scoringPadKicker: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: hp(0.5),
    marginTop: hp(0.4),
  },
  firstBreakHeadline: {
    fontSize: fontSize(20),
    fontWeight: '900',
    color: colors.text,
    marginBottom: hp(0.5),
  },
  firstBreakOversSub: {
    fontSize: fontSize(16),
    fontWeight: '600',
    color: colors.textMuted,
  },
  firstBreakKicker: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: hp(0.4),
    marginBottom: hp(0.4),
  },
  firstBreakChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingBottom: hp(0.5),
  },
  firstBreakCtaBlock: {
    marginTop: hp(0.4),
  },
  firstBreakCtaNote: {
    fontSize: fontSize(13),
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  inningsCompleteHint: {
    marginTop: hp(0.5),
    marginBottom: hp(2),
    padding: wp(3.5),
    borderRadius: wp(2.5),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inningsCompleteHintText: {
    fontSize: fontSize(14),
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: fontSize(20),
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
    gap: wp(1),
  },
  iconHit: {
    paddingVertical: hp(1),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2),
  },
  iconHitDisabled: {
    opacity: 0.38,
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
    fontSize: fontSize(15),
    fontWeight: '700',
    color: colors.primary,
    includeFontPadding: false,
  },
  backSub: {
    fontSize: fontSize(10),
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: hp(0.1),
  },
  backArrow: {
    width: wp(4),
    height: wp(4),
  },
  iconLbl: {
    fontSize: fontSize(14),
    fontWeight: '700',
    color: colors.primary,
  },
  iconLblDisabled: {
    color: colors.textMuted,
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
    fontSize: fontSize(13),
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: hp(0.35),
  },
  scoreMetaCol: {
    alignItems: 'flex-end',
  },
  scoreMetaLbl: {
    fontSize: fontSize(11),
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
    fontSize: fontSize(11),
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
  emptyCurWrap: {
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCur: {
    fontSize: fontSize(13),
    fontWeight: '600',
    color: colors.textMuted,
  },
  extraMoreBtn: {
    flex: 1,
    minWidth: wp(16),
    paddingVertical: hp(1.1),
    borderRadius: wp(2.5),
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  extraMoreBtnOpen: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  extraMoreBtnText: {
    fontSize: fontSize(14),
    fontWeight: '800',
    color: colors.primary,
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
    paddingBottom: hp(0.5),
  },
  lastOverTitle: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: wp(2.5),
    paddingTop: hp(0.7),
    marginBottom: hp(0.4),
  },
  lastOverChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(2),
    paddingBottom: hp(0.6),
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
    paddingVertical: hp(1.5),
    borderRadius: wp(2.5),
    backgroundColor: colors.ballWicket,
    alignItems: 'center',
    marginTop: hp(0.6),
    marginBottom: hp(0.2),
  },
  wicketBtnText: {
    fontSize: fontSize(16),
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
  modalSubtitle: {
    fontSize: fontSize(13),
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: hp(1.2),
    lineHeight: fontSize(18),
  },
  wicketRunsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(0.5),
  },
  wicketRunCell: {
    width: (wp(100) - wp(8) - wp(2) * 3) / 4,
    maxWidth: wp(22),
    height: hp(5.2),
    borderRadius: wp(2.5),
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  wicketRunCellText: {
    fontSize: fontSize(18),
    fontWeight: '900',
    color: colors.text,
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
    marginTop: hp(0.5),
    marginBottom: hp(0.8),
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
    marginBottom: hp(0.8),
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
    marginBottom: hp(1),
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
