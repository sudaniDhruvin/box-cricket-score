import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ImageSourcePropType,
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
  wicketsCapForMatch,
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
import { StickyBottomBannerAd } from './StickyBottomBannerAd';
import { PNGs } from '../assets/images/pngs';

function cloneMatch(m: MatchSummary): MatchSummary {
  return JSON.parse(JSON.stringify(m)) as MatchSummary;
}

const EDIT_OVERS_MIN = 1;
const EDIT_OVERS_MAX = 50;
const EDIT_WICKETS_MIN = 1;
const EDIT_WICKETS_MAX = 20;

function minOversAllowed(m: MatchSummary): number {
  const maxLegal = Math.max(
    legalBallsBowled(m.innings[0].overs),
    legalBallsBowled(m.innings[1].overs),
  );
  return Math.max(EDIT_OVERS_MIN, Math.ceil(maxLegal / 6));
}

function minWicketsAllowed(m: MatchSummary): number {
  return Math.max(EDIT_WICKETS_MIN, m.innings[0].wickets, m.innings[1].wickets);
}

type EditStepperRowProps = {
  title: string;
  subtitle: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
};

function EditStepperRow({
  title,
  subtitle,
  value,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
}: EditStepperRowProps) {
  return (
    <View style={styles.editParamRow}>
      <View style={styles.editParamLabels}>
        <Text style={styles.editParamTitle}>{title}</Text>
        <Text style={styles.editParamSub}>{subtitle}</Text>
      </View>
      <View style={styles.editStepper}>
        <Pressable
          onPress={onDecrement}
          style={({ pressed }) => [
            styles.editStepperBtn,
            pressed && styles.editStepperBtnPressed,
          ]}
          android_ripple={{ color: colors.primarySoft, borderless: true }}
          accessibilityRole="button"
          accessibilityLabel={decrementLabel}
        >
          <Text style={styles.editStepperBtnText}>{'\u2212'}</Text>
        </Pressable>
        <Text style={styles.editStepperValue}>{value}</Text>
        <Pressable
          onPress={onIncrement}
          style={({ pressed }) => [
            styles.editStepperBtn,
            pressed && styles.editStepperBtnPressed,
          ]}
          android_ripple={{ color: colors.primarySoft, borderless: true }}
          accessibilityRole="button"
          accessibilityLabel={incrementLabel}
        >
          <Text style={styles.editStepperBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
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

const WICKET_OPTIONS: {
  id: WicketDismissal;
  label: string;
  icon: ImageSourcePropType;
}[] = [
  { id: 'bowled', label: 'Bowled', icon: PNGs.StumpedOutIcon },
  { id: 'caught', label: 'Caught', icon: PNGs.CaughtOutIcon },
  { id: 'run-out', label: 'Run Out', icon: PNGs.RunOutIcon },
  { id: 'stumped', label: 'Stumped', icon: PNGs.StumpedOutIcon },
  { id: 'lbw', label: 'LBW', icon: PNGs.LBWOutIcon },
  { id: 'hit-wicket', label: 'Hit Wicket', icon: PNGs.WarningIcon },
];

type WicketTypeTileProps = {
  label: string;
  icon: ImageSourcePropType;
  selected: boolean;
  onPress: () => void;
};

function WicketTypeTile({
  label,
  icon,
  selected,
  onPress,
}: WicketTypeTileProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wicketTile,
        selected && styles.wicketTileSelected,
        pressed && styles.wicketTilePressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      {selected ? (
        <View style={styles.wicketTileCheck}>
          <Text style={styles.wicketTileCheckText}>{'\u2713'}</Text>
        </View>
      ) : null}

      {icon && (
        <Image
          source={icon}
          style={{
            width: wp(8),
            height: wp(8),
            tintColor: selected ? colors.primary : undefined,
          }}
        />
      )}
      <Text
        style={[
          styles.wicketTileLabel,
          selected && styles.wicketTileLabelSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const UNDO_MAX = 40;
const RUNS_ROW: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [0, 1, 2, 3, 4, 5, 6];
const RUNS_GRID: (0 | 1 | 2 | 3 | 4 | 6)[] = [0, 1, 2, 3, 4, 6];

function ThisOverRow({
  deliveries,
  legalInOver,
}: {
  deliveries: Delivery[];
  legalInOver: number;
}) {
  const emptySlots = Math.max(0, 6 - legalInOver);
  return (
    <View style={styles.thisOverRow}>
      {deliveries.map((d, i) => (
        <MiniBall key={`cb-${i}`} d={d} />
      ))}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <View key={`empty-${i}`} style={styles.emptyBallSlot} />
      ))}
    </View>
  );
}

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
  const [extrasExpanded, setExtrasExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [wicketOpen, setWicketOpen] = useState(false);
  const [wicketModalPhase, setWicketModalPhase] = useState<
    'dismissal' | 'run-out-runs'
  >('dismissal');
  const [selectedDismissal, setSelectedDismissal] =
    useState<WicketDismissal | null>(null);
  const [selectedRunOutRuns, setSelectedRunOutRuns] = useState<
    0 | 1 | 2 | 3 | 4 | 5 | 6 | null
  >(null);
  const [overCompleteModal, setOverCompleteModal] = useState<OverReplay | null>(
    null,
  );
  const [matchOverModal, setMatchOverModal] = useState<MatchSummary | null>(
    null,
  );
  const [editA, setEditA] = useState('');
  const [editB, setEditB] = useState('');
  const [editOvers, setEditOvers] = useState(10);
  const [editPlayers, setEditPlayers] = useState(10);

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

  const chase =
    activeIdx === 1 && firstInnDone && match != null && activeInn != null
      ? (() => {
          const firstRuns = match.innings[0].runs;
          const target = firstRuns + 1;
          const need = Math.max(0, target - activeInn.runs);
          const rrr =
            need > 0 && legalBallsRemaining != null && legalBallsRemaining > 0
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
    setEditOvers(match.oversPerSide ?? 10);
    setEditPlayers(match.wicketsPerSide ?? 10);
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
    if (editOvers < EDIT_OVERS_MIN || editOvers > EDIT_OVERS_MAX) {
      Alert.alert(
        'Overs',
        `Overs must be between ${EDIT_OVERS_MIN} and ${EDIT_OVERS_MAX}.`,
      );
      return;
    }
    if (editPlayers < EDIT_WICKETS_MIN || editPlayers > EDIT_WICKETS_MAX) {
      Alert.alert(
        'Players',
        `Players per team must be between ${EDIT_WICKETS_MIN} and ${EDIT_WICKETS_MAX}.`,
      );
      return;
    }

    const minOvers = minOversAllowed(match);
    if (editOvers < minOvers) {
      Alert.alert(
        'Overs',
        `Cannot set fewer than ${minOvers} overs — that much has already been bowled.`,
      );
      return;
    }

    const minWkts = minWicketsAllowed(match);
    if (editPlayers < minWkts) {
      Alert.alert(
        'Players',
        `Cannot set fewer than ${minWkts} players — ${minWkts} wicket${
          minWkts === 1 ? '' : 's'
        } already recorded.`,
      );
      return;
    }

    updateMatch(match.id, m => ({
      ...m,
      oversPerSide: editOvers,
      wicketsPerSide: editPlayers,
      innings: [
        { ...m.innings[0], teamName: a },
        { ...m.innings[1], teamName: b },
      ],
    }));
    setEditOpen(false);
  }, [match, editA, editB, editOvers, editPlayers, updateMatch]);

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
        const inn0 = finalized.innings[0];
        const cap = finalized.oversPerSide;
        if (
          cap != null &&
          cap > 0 &&
          (finalized.scoringActiveInnings ?? 0) === 0 &&
          isInningsComplete(inn0, cap, wicketsCapForMatch(finalized))
        ) {
          // 1st innings finished (e.g. last ball of the last over) — show
          // the dedicated 1st-innings break modal, not the generic over sheet.
        } else {
          setOverCompleteModal(result.overJustCompleted);
        }
      }
    },
    [matchId, updateMatch],
  );

  const closeWicketModal = useCallback(() => {
    setWicketOpen(false);
    setWicketModalPhase('dismissal');
    setSelectedDismissal(null);
    setSelectedRunOutRuns(null);
  }, []);

  const openWicketModal = useCallback(() => {
    setSelectedDismissal(null);
    setSelectedRunOutRuns(null);
    setWicketModalPhase('dismissal');
    setWicketOpen(true);
  }, []);

  const confirmWicket = useCallback(() => {
    if (wicketModalPhase === 'run-out-runs') {
      if (selectedRunOutRuns == null) {
        Alert.alert('Select runs', 'Pick how many runs were completed.');
        return;
      }
      closeWicketModal();
      apply(wicketDelivery('run-out', { runOutRuns: selectedRunOutRuns }));
      return;
    }

    if (selectedDismissal == null) {
      Alert.alert('Select dismissal', 'Pick how the batter was out.');
      return;
    }
    if (selectedDismissal === 'run-out') {
      setSelectedRunOutRuns(0);
      setWicketModalPhase('run-out-runs');
      return;
    }
    closeWicketModal();
    apply(wicketDelivery(selectedDismissal));
  }, [
    wicketModalPhase,
    selectedDismissal,
    selectedRunOutRuns,
    closeWicketModal,
    apply,
  ]);

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
    setOverCompleteModal(null);
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
          <Image source={PNGs.LEFT_ARROW} style={styles.backArrow} />
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
            accessibilityLabel="Edit match settings"
          >
            <Text style={styles.editIcon}>{'\u270E'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.mainColumn}>
        <ScrollView
          style={styles.scrollFill}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Math.max(insets.bottom, hp(2)) + hp(1) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.scoreboardCard}>
            <View style={styles.scoreboardTop}>
              {chase != null ? (
                <Text style={styles.targetLabel}>Target {chase.target}</Text>
              ) : (
                <Text style={styles.inningsTagInline}>
                  {activeIdx === 0 ? '1st innings' : '2nd innings'}
                </Text>
              )}
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>

            <Text style={styles.scoreMain}>
              {activeInn.runs}/{activeInn.wickets}
            </Text>
            <Text style={styles.oversLine}>
              Overs: {formatOvers(activeInn.overs)}
              {oversCap > 0 ? ` / ${oversCap}` : ''}
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
                    : `${activeInn.wickets}/${wkCap}`}
                </Text>
              </View>
            </View>

            <View style={styles.thisOverBlock}>
              <Text style={styles.thisOverLabel}>THIS OVER</Text>
              {currentBalls.length === 0 && legalInCurrent === 0 ? (
                <View style={styles.thisOverRow}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.emptyBallSlot} />
                  ))}
                </View>
              ) : (
                <ThisOverRow
                  deliveries={currentBalls}
                  legalInOver={legalInCurrent}
                />
              )}
            </View>
          </View>

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

          {showStartSecondCta ? (
            <View style={styles.inningsCompleteHint}>
              <Text style={styles.inningsCompleteHintText}>
                First innings is complete. When you are ready, start the second
                innings using the button below.
              </Text>
            </View>
          ) : (
            <View style={styles.scoringPad}>
              <View style={styles.runsGrid3x2}>
                {RUNS_GRID.map(r => (
                  <Pressable
                    key={r}
                    onPress={() => apply(runsDelivery(r))}
                    style={({ pressed }) => [
                      styles.runBtn,
                      (r === 4 || r === 6) && styles.runBtnBoundary,
                      r === 4 && styles.runBtnFour,
                      r === 6 && styles.runBtnSix,
                      pressed && styles.runCellPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.runBtnText,
                        (r === 4 || r === 6) && styles.runBtnTextBoundary,
                      ]}
                    >
                      {r}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.extrasGrid4}>
                <Pressable
                  onPress={() =>
                    apply({ type: 'wide', label: 'Wd', wideRuns: 0 })
                  }
                  style={({ pressed }) => [
                    styles.extraPadBtn,
                    pressed && styles.runCellPressed,
                  ]}
                >
                  <Text style={styles.extraPadBtnText}>Wide</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    apply({ type: 'no-ball', label: 'Nb', noBallRuns: 0 })
                  }
                  style={({ pressed }) => [
                    styles.extraPadBtn,
                    pressed && styles.runCellPressed,
                  ]}
                >
                  <Text style={styles.extraPadBtnText}>NB</Text>
                </Pressable>
                <Pressable
                  onPress={() => apply({ type: 'bye', label: 'By' })}
                  style={({ pressed }) => [
                    styles.extraPadBtn,
                    pressed && styles.runCellPressed,
                  ]}
                >
                  <Text style={styles.extraPadBtnText}>Bye</Text>
                </Pressable>
                <Pressable
                  onPress={() => apply({ type: 'bye', label: 'Lb' })}
                  style={({ pressed }) => [
                    styles.extraPadBtn,
                    pressed && styles.runCellPressed,
                  ]}
                >
                  <Text style={styles.extraPadBtnText}>LB</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => setExtrasExpanded(e => !e)}
                style={({ pressed }) => [
                  styles.moreExtrasToggle,
                  pressed && styles.backPressed,
                ]}
              >
                <Text style={styles.moreExtrasToggleText}>
                  {extrasExpanded ? 'Hide' : 'More'} extras & 5 runs
                </Text>
                <Text style={styles.recentCaret}>
                  {extrasExpanded ? '\u25B2' : '\u25BC'}
                </Text>
              </Pressable>

              {extrasExpanded ? (
                <View style={styles.extrasMoreRow}>
                  <Pressable
                    onPress={() => apply(runsDelivery(5))}
                    style={({ pressed }) => [
                      styles.extrasMoreBtn,
                      { borderColor: colors.border },
                      pressed && styles.runCellPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="5 runs"
                  >
                    <Text style={styles.extrasMoreBtnText}>5</Text>
                  </Pressable>
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
                        styles.extrasMoreBtn,
                        { borderColor: colors.ballWideExtra },
                        pressed && styles.runCellPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Wide plus ${n}`}
                    >
                      <Text style={styles.extrasMoreBtnText}>WD+{n}</Text>
                    </Pressable>
                  ))}
                  <View
                    style={{
                      height: '90%',
                      width: 2,
                      backgroundColor: colors.textMuted,
                      borderRadius: 100,
                      alignSelf: 'center',
                    }}
                  />
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
                        styles.extrasMoreBtn,
                        { borderColor: colors.ballNoBallRuns },
                        pressed && styles.runCellPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`No ball plus ${n}`}
                    >
                      <Text style={styles.extrasMoreBtnText}>NB+{n}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Pressable
                onPress={() => {
                  openWicketModal();
                }}
                style={({ pressed }) => [
                  styles.wicketBtnFull,
                  pressed && styles.runCellPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Log wicket"
              >
                <Text style={styles.wicketBtnFullText}>WICKET</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
        <View style={styles.bottomAdStrip}>
          <StickyBottomBannerAd />
        </View>
      </View>

      <Modal
        visible={wicketOpen}
        transparent
        animationType="fade"
        onRequestClose={closeWicketModal}
      >
        <Pressable
          style={styles.bottomSheetBackdrop}
          onPress={closeWicketModal}
        >
          <Pressable
            style={[
              styles.wicketBottomSheet,
              { paddingBottom: Math.max(insets.bottom, hp(2)) },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />

            {wicketModalPhase === 'run-out-runs' ? (
              <>
                <Text style={styles.wicketSheetTitle}>Runs before run out</Text>
                <Text style={styles.wicketSheetSub}>
                  How many runs did the batting side complete on this ball?
                </Text>
                <View style={styles.wicketRunsGrid}>
                  {RUNS_ROW.map(r => (
                    <Pressable
                      key={`ro-${r}`}
                      onPress={() => setSelectedRunOutRuns(r)}
                      style={({ pressed }) => [
                        styles.wicketRunCell,
                        selectedRunOutRuns === r &&
                          styles.wicketRunCellSelected,
                        pressed && styles.runCellPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: selectedRunOutRuns === r,
                      }}
                    >
                      <Text
                        style={[
                          styles.wicketRunCellText,
                          selectedRunOutRuns === r &&
                            styles.wicketRunCellTextSelected,
                        ]}
                      >
                        {r}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.wicketSheetFooter}>
                  <Pressable
                    onPress={() => {
                      setWicketModalPhase('dismissal');
                      setSelectedRunOutRuns(null);
                    }}
                    style={({ pressed }) => [
                      styles.wicketCancelBtn,
                      pressed && styles.wicketCancelBtnPressed,
                    ]}
                  >
                    <Text style={styles.wicketCancelBtnText}>Back</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmWicket}
                    style={({ pressed }) => [
                      styles.wicketConfirmBtn,
                      selectedRunOutRuns == null &&
                        styles.wicketConfirmBtnDisabled,
                      pressed && styles.wicketConfirmBtnPressed,
                    ]}
                  >
                    <Text style={styles.wicketConfirmBtnText}>
                      Confirm Wicket
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.wicketSheetTitle}>
                  Wicket — select dismissal type
                </Text>
                <View style={styles.wicketGrid}>
                  {WICKET_OPTIONS.map(opt => (
                    <WicketTypeTile
                      key={opt.id}
                      label={opt.label}
                      icon={opt.icon}
                      selected={selectedDismissal === opt.id}
                      onPress={() => setSelectedDismissal(opt.id)}
                    />
                  ))}
                </View>
                <View style={styles.wicketSheetFooter}>
                  <Pressable
                    onPress={closeWicketModal}
                    style={({ pressed }) => [
                      styles.wicketCancelBtn,
                      pressed && styles.wicketCancelBtnPressed,
                    ]}
                  >
                    <Text style={styles.wicketCancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmWicket}
                    style={({ pressed }) => [
                      styles.wicketConfirmBtn,
                      selectedDismissal == null &&
                        styles.wicketConfirmBtnDisabled,
                      pressed && styles.wicketConfirmBtnPressed,
                    ]}
                  >
                    <Text style={styles.wicketConfirmBtnText}>
                      Confirm Wicket
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
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
                {firstInnDone && activeIdx === 0 ? (
                  <Pressable
                    onPress={startSecond}
                    style={({ pressed }) => [
                      styles.overCompleteCta,
                      pressed && styles.overCompleteCtaPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Start second innings"
                  >
                    <Text style={styles.overCompleteCtaText}>
                      Start 2nd innings
                    </Text>
                  </Pressable>
                ) : (
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
                )}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showStartSecondCta}
        transparent
        animationType="fade"
        onRequestClose={() => undefined}
        statusBarTranslucent
      >
        <View style={styles.matchOverBackdrop}>
          <View style={styles.matchOverSheet}>
            <Text style={styles.matchOverTitle}>1st innings complete</Text>
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
            <View style={styles.firstBreakCtaBlock}>
              <Text style={styles.firstBreakCtaNote}>
                When both sides are ready, start the second innings.
              </Text>
              <Pressable
                onPress={startSecond}
                style={({ pressed }) => [
                  styles.matchOverCta,
                  pressed && styles.matchOverCtaPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Start second innings"
              >
                <Text style={styles.matchOverCtaText}>Start 2nd innings</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
                <Text style={styles.matchOverSub}>
                  {matchOverCopy.loserDetail}
                </Text>
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
            style={styles.editModalSheet}
            onPress={e => e.stopPropagation()}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Edit match</Text>
              <Text style={styles.editSectionHeading}>Teams</Text>
              <Text style={styles.editFieldLbl}>1st innings</Text>
              <TextInput
                value={editA}
                onChangeText={setEditA}
                style={styles.editInput}
                placeholder="Team name"
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
                autoCapitalize="words"
              />
              <Text style={styles.editFieldLbl}>2nd innings</Text>
              <TextInput
                value={editB}
                onChangeText={setEditB}
                style={styles.editInput}
                placeholder="Team name"
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
                autoCapitalize="words"
              />

              <Text style={styles.editSectionHeading}>Match parameters</Text>
              <EditStepperRow
                title="Overs"
                subtitle="Per innings"
                value={editOvers}
                onDecrement={() =>
                  setEditOvers(v => Math.max(EDIT_OVERS_MIN, v - 1))
                }
                onIncrement={() =>
                  setEditOvers(v => Math.min(EDIT_OVERS_MAX, v + 1))
                }
                decrementLabel="Decrease overs"
                incrementLabel="Increase overs"
              />
              <View style={styles.editParamSpacer} />
              <EditStepperRow
                title="Players"
                subtitle="Per team"
                value={editPlayers}
                onDecrement={() =>
                  setEditPlayers(v => Math.max(EDIT_WICKETS_MIN, v - 1))
                }
                onIncrement={() =>
                  setEditPlayers(v => Math.min(EDIT_WICKETS_MAX, v + 1))
                }
                decrementLabel="Decrease players"
                incrementLabel="Increase players"
              />
              {match ? (
                <Text style={styles.editHint}>
                  Minimum {minOversAllowed(match)} overs and{' '}
                  {minWicketsAllowed(match)} players based on balls already
                  scored.
                </Text>
              ) : null}

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
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainColumn: {
    flex: 1,
  },
  scrollFill: {
    flex: 1,
  },
  bottomAdStrip: {
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    flexGrow: 1,
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
    includeFontPadding: false,
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
  inningsTagInline: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.textMuted,
  },
  scoreboardCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(4),
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    marginBottom: hp(1.5),
    backgroundColor: colors.surfaceMuted,
  },
  scoreboardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1),
  },
  targetLabel: {
    fontSize: fontSize(13),
    fontWeight: '700',
    color: colors.textMuted,
  },
  liveBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.35),
    borderRadius: wp(1.5),
    borderWidth: 1.5,
    borderColor: colors.ballFour,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  liveBadgeText: {
    fontSize: fontSize(10),
    fontWeight: '900',
    letterSpacing: 0.8,
    color: colors.ballFour,
  },
  scoreMain: {
    fontSize: fontSize(42),
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: hp(0.4),
  },
  oversLine: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: hp(1.4),
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.6),
    paddingVertical: hp(1),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  rateCell: {
    flex: 1,
    alignItems: 'center',
  },
  rateDivider: {
    width: 1,
    height: hp(3),
    backgroundColor: colors.border,
  },
  rateLabel: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: hp(0.2),
  },
  rateValue: {
    fontSize: fontSize(18),
    fontWeight: '900',
    color: colors.text,
  },
  thisOverBlock: {
    marginTop: hp(0.2),
  },
  thisOverLabel: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: hp(0.8),
  },
  thisOverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: wp(2),
    minHeight: hp(5),
  },
  emptyBallSlot: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  scoringPad: {
    marginTop: hp(0.5),
    paddingTop: hp(1),
  },
  runsGrid3x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2.5),
    marginBottom: hp(1.2),
  },
  runBtn: {
    width: (wp(100) - wp(8) - wp(2.5) * 3) / 3,
    height: hp(6.2),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runBtnBoundary: {
    borderWidth: 0,
  },
  runBtnFour: {
    backgroundColor: colors.ballFour,
  },
  runBtnSix: {
    backgroundColor: colors.ballSix,
  },
  runBtnText: {
    fontSize: fontSize(22),
    fontWeight: '900',
    color: colors.text,
  },
  runBtnTextBoundary: {
    color: colors.background,
  },
  extrasGrid4: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(0.8),
  },
  extraPadBtn: {
    flex: 1,
    paddingVertical: hp(1.2),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  extraPadBtnText: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.text,
  },
  moreExtrasToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1),
    paddingVertical: hp(0.6),
    marginBottom: hp(0.4),
  },
  moreExtrasToggleText: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.primary,
  },
  wicketBtnFull: {
    paddingVertical: hp(1.6),
    borderRadius: wp(3),
    backgroundColor: colors.ballWicket,
    alignItems: 'center',
    marginTop: hp(0.4),
    marginBottom: hp(0.5),
  },
  wicketBtnFullText: {
    fontSize: fontSize(16),
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.background,
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
  extrasMoreRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: wp(1.2),
    marginTop: hp(0.6),
    marginBottom: hp(0.5),
  },
  extrasMoreBtn: {
    flex: 1,
    minWidth: 0,
    height: hp(5),
    borderRadius: wp(2.5),
    borderWidth: 1.5,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(0.5),
  },
  extrasMoreBtnText: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
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
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7,7,7,0.45)',
    justifyContent: 'flex-end',
  },
  wicketBottomSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
    paddingHorizontal: wp(5),
    paddingTop: hp(1),
    maxHeight: '88%',
  },
  sheetHandle: {
    width: wp(12),
    height: hp(0.55),
    borderRadius: wp(1),
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: hp(1.8),
  },
  wicketSheetTitle: {
    fontSize: fontSize(18),
    fontWeight: '900',
    color: colors.text,
    marginBottom: hp(1.2),
  },
  wicketSheetSub: {
    fontSize: fontSize(14),
    fontWeight: '600',
    color: colors.textMuted,
    lineHeight: fontSize(20),
    marginBottom: hp(1.4),
  },
  wicketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(0.5),
  },
  wicketTile: {
    width: (wp(100) - wp(10) - wp(2) * 3) / 3,
    minHeight: hp(11),
    borderRadius: wp(3),
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(1),
    position: 'relative',
  },
  wicketTileSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  wicketTilePressed: {
    opacity: 0.92,
  },
  wicketTileCheck: {
    position: 'absolute',
    top: hp(0.6),
    right: wp(1.5),
    width: wp(5),
    height: wp(5),
    borderRadius: wp(2.5),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wicketTileCheckText: {
    fontSize: fontSize(11),
    fontWeight: '900',
    color: colors.background,
  },
  wicketTileIcon: {
    fontSize: fontSize(26),
    color: colors.textMuted,
    marginBottom: hp(0.6),
  },
  wicketTileIconSelected: {
    color: colors.primary,
  },
  wicketTileLabel: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  wicketTileLabelSelected: {
    color: colors.primary,
  },
  wicketSheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginTop: hp(2),
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  wicketCancelBtn: {
    flex: 1,
    paddingVertical: hp(1.5),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  wicketCancelBtnPressed: {
    backgroundColor: colors.primaryFaint,
  },
  wicketCancelBtnText: {
    fontSize: fontSize(15),
    fontWeight: '800',
    color: colors.text,
  },
  wicketConfirmBtn: {
    flex: 2,
    paddingVertical: hp(1.5),
    borderRadius: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ballWicket,
  },
  wicketConfirmBtnDisabled: {
    opacity: 0.45,
  },
  wicketConfirmBtnPressed: {
    opacity: 0.92,
  },
  wicketConfirmBtnText: {
    fontSize: fontSize(15),
    fontWeight: '900',
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
    width: (wp(100) - wp(10) - wp(2) * 3) / 4,
    maxWidth: wp(22),
    height: hp(5.2),
    borderRadius: wp(2.5),
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  wicketRunCellSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  wicketRunCellText: {
    fontSize: fontSize(18),
    fontWeight: '900',
    color: colors.text,
  },
  wicketRunCellTextSelected: {
    color: colors.primary,
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
  editSectionHeading: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: hp(1.2),
    marginBottom: hp(0.4),
  },
  editModalSheet: {
    backgroundColor: colors.background,
    borderRadius: wp(3),
    padding: wp(4),
    maxHeight: '85%',
  },
  editParamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
  },
  editParamLabels: {
    flex: 1,
    minWidth: 0,
    marginRight: wp(2),
  },
  editParamTitle: {
    fontSize: fontSize(15),
    fontWeight: '800',
    color: colors.text,
    marginBottom: hp(0.15),
  },
  editParamSub: {
    fontSize: fontSize(12),
    fontWeight: '500',
    color: colors.textMuted,
  },
  editParamSpacer: {
    height: hp(1),
  },
  editStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  editStepperBtn: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  editStepperBtnPressed: {
    backgroundColor: colors.primaryFaint,
  },
  editStepperBtnText: {
    fontSize: fontSize(18),
    fontWeight: '400',
    color: colors.text,
    lineHeight: fontSize(20),
  },
  editStepperValue: {
    minWidth: wp(7),
    textAlign: 'center',
    fontSize: fontSize(18),
    fontWeight: '900',
    color: colors.text,
  },
  editHint: {
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: hp(1),
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
