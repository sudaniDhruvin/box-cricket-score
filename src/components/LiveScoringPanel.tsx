import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useInterstitialAd } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PNGs } from '../assets/images/pngs';
import { INTERSTITIAL_AD_UNIT_ID } from '../config/adUnitIds';
import {
  maybeRequestInAppReview,
  recordCompletedMatchForReview,
} from '../config/requestInAppReview';
import { useAdFlags } from '../hooks/useAdFlags';
import {
  getHostShareState,
  isSharingMatch,
  stopHostShare,
  subscribeHostShare,
} from '../liveShare';
import { useMatchStore } from '../store/useMatchStore';
import { colors } from '../theme/colors';
import { GOLDEN_SPACING } from '../theme/golden';
import { PELLET_COLORS, RUN_BUBBLE_COLORS } from '../theme/pelletColors';
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
import { createRepeatMatch } from '../utils/createLiveMatch';
import { countsAsLegalBall, tallyDeliveryRuns } from '../utils/deliveryScoring';
import { fontSize, hp, wp } from '../utils';
import {
  OverCompleteNativeAd,
  usePreloadedNativeAd,
} from './OverCompleteNativeAd';
import { StickyBottomBannerAd } from './StickyBottomBannerAd';
import { ShareLiveScoreModal } from './ShareLiveScoreModal';
import { LiveShareNoticeModal } from './LiveShareNoticeModal';
import {
  ChevronRightIcon,
  CloseIcon,
  CricketStumpsIcon,
  EditIcon,
  QrCodeIcon,
  UndoIcon,
} from './ui';
import { Pellet } from './Pellet';

function cloneMatch(m: MatchSummary): MatchSummary {
  return JSON.parse(JSON.stringify(m)) as MatchSummary;
}

const EDIT_OVERS_MIN = 1;
const EDIT_OVERS_MAX = 50;
const EDIT_WICKETS_MIN = 1;
const EDIT_WICKETS_MAX = 20;
const CONFETTI_PARTICLE_COUNT = 38;
const CONFETTI_COLORS = [
  colors.accent,
  colors.primary,
  colors.background,
  colors.textSecondary,
];

function MatchWinConfetti() {
  const progressValues = useRef(
    Array.from({ length: CONFETTI_PARTICLE_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const animation = Animated.stagger(
      24,
      progressValues.map(progress =>
        Animated.timing(progress, {
          toValue: 1,
          duration: 2800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    );
    animation.start();

    return () => animation.stop();
  }, [progressValues]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {progressValues.map((progress, index) => {
        const size = 5 + (index % 4) * 2;
        const drift = ((index * 17) % 81) - 40;
        const turns = index % 2 === 0 ? 540 : -540;

        return (
          <Animated.View
            key={`confetti-${index}`}
            style={[
              styles.confettiParticle,
              {
                left: `${(index * 47) % 100}%`,
                width: size,
                height: size * (index % 2 === 0 ? 1.5 : 1),
                backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
                opacity: progress.interpolate({
                  inputRange: [0, 0.08, 0.8, 1],
                  outputRange: [0, 1, 0.9, 0],
                }),
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-hp(5), hp(110)],
                    }),
                  },
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, drift],
                    }),
                  },
                  {
                    rotate: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${turns}deg`],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

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

      <Image
        source={icon}
        style={{
          width: wp(8),
          height: wp(8),
          tintColor: selected ? colors.primary : undefined,
        }}
      />
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
const QUICK_EXTRAS: {
  code: string;
  label: string;
  accessibilityLabel: string;
  delivery: Delivery;
}[] = [
  {
    code: 'WD',
    label: 'Wide',
    accessibilityLabel: 'Wide, one penalty run',
    delivery: { type: 'wide', label: 'Wd', wideRuns: 0 },
  },
  {
    code: 'NB',
    label: 'No-ball',
    accessibilityLabel: 'No-ball, one penalty run',
    delivery: { type: 'no-ball', label: 'Nb', noBallRuns: 0 },
  },
  {
    code: 'B',
    label: 'Bye',
    accessibilityLabel: 'Bye',
    delivery: { type: 'bye', label: 'B' },
  },
  {
    code: 'LB',
    label: 'Leg bye',
    accessibilityLabel: 'Leg bye',
    delivery: { type: 'leg-bye', label: 'Lb' },
  },
];
const EXTRA_RUNS = [1, 2, 3, 4, 5, 6] as const;

function ScoringPad({
  apply,
  onMoreExtras,
  onWicket,
}: {
  apply: (delivery: Delivery) => void;
  onMoreExtras: () => void;
  onWicket: () => void;
}) {
  return (
    <View style={styles.scoringPad}>
      <View style={styles.padSectionHead}>
        <Text style={styles.padSectionTitle}>RUNS</Text>
        <Text style={styles.padSectionHint}>Choose this ball's result</Text>
      </View>
      <View style={styles.scoringRunsGrid}>
        {RUNS_ROW.map(r => {
          const tone = RUN_BUBBLE_COLORS[r];
          return (
            <Pressable
              key={r}
              onPress={() => apply(runsDelivery(r))}
              style={({ pressed }) => [
                styles.runBtn,
                {
                  backgroundColor: tone.bg,
                  borderColor:
                    tone.bg === colors.background ? tone.fg : tone.bg,
                },
                pressed && styles.runCellPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                r === 0 ? 'Dot ball' : r === 1 ? 'One run' : `${r} runs`
              }>
              <Text style={[styles.runBtnText, { color: tone.fg }]}>{r}</Text>
              <Text style={[styles.runBtnLabel, { color: tone.fg }]}>
                {r === 0
                  ? 'DOT'
                  : r === 1
                    ? 'RUN'
                    : r === 4
                      ? 'FOUR'
                      : r === 6
                        ? 'SIX'
                        : 'RUNS'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={onWicket}
        style={({ pressed }) => [
          styles.wicketBtnFull,
          pressed && styles.runCellPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Log wicket">
        <CricketStumpsIcon size={wp(5)} color={colors.background} />
        <Text style={styles.wicketBtnFullText}>WICKET</Text>
      </Pressable>

      <View style={styles.padSectionHead}>
        <Text style={styles.padSectionTitle}>EXTRAS</Text>
        <Pressable
          onPress={onMoreExtras}
          style={({ pressed }) => [
            styles.moreExtrasToggle,
            pressed && styles.backPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add bat runs to a wide or no-ball">
          <Text style={styles.moreExtrasToggleText}>Add extra runs</Text>
          <View style={styles.moreExtrasChevron}>
            <ChevronRightIcon size={wp(3.5)} color={colors.primary} />
          </View>
        </Pressable>
      </View>
      <View style={styles.extrasGrid4}>
        {QUICK_EXTRAS.map(extra => (
          <Pressable
            key={extra.code}
            onPress={() => apply(extra.delivery)}
            style={({ pressed }) => [
              styles.extraPadBtn,
              pressed && styles.runCellPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={extra.accessibilityLabel}>
            <Text style={styles.extraPadCode}>{extra.code}</Text>
            <Text style={styles.extraPadBtnText}>{extra.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ExtrasSheet({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (delivery: Delivery) => void;
}) {
  const insets = useSafeAreaInsets();
  const selectWide = (runs: number) => {
    onSelect({
      type: 'wide',
      label: runs === 0 ? 'Wd' : `Wd+${runs}`,
      wideRuns: runs,
    });
    onClose();
  };
  const selectNoBall = (runs: number) => {
    onSelect({
      type: 'no-ball',
      label: runs === 0 ? 'Nb' : `Nb+${runs}`,
      noBallRuns: runs,
    });
    onClose();
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.bottomSheetBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.extrasBottomSheet,
            { paddingBottom: Math.max(insets.bottom, hp(2)) },
          ]}
          onPress={event => event.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.wicketSheetTitle}>More extras</Text>
          <Text style={styles.wicketSheetSub}>
            Add completed runs to the one-run penalty.
          </Text>
          <Text style={styles.extraSheetSectionTitle}>Wide + completed runs</Text>
          <View style={styles.extraSheetRunRow}>
            {EXTRA_RUNS.map(runs => (
              <Pressable
                key={`wide-${runs}`}
                onPress={() => selectWide(runs)}
                style={({ pressed }) => [
                  styles.extraSheetRunButton,
                  pressed && styles.runCellPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Wide plus ${runs} completed ${runs === 1 ? 'run' : 'runs'}`}>
                <Text style={styles.extraSheetRunValue}>{runs}</Text>
                <Text style={styles.extraSheetRunCaption}>
                  {runs === 1 ? 'run' : 'runs'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.extraSheetSectionTitle}>No-ball + bat runs</Text>
          <View style={styles.extraSheetRunRow}>
            {EXTRA_RUNS.map(runs => (
              <Pressable
                key={`no-ball-${runs}`}
                onPress={() => selectNoBall(runs)}
                style={({ pressed }) => [
                  styles.extraSheetRunButton,
                  pressed && styles.runCellPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`No-ball plus ${runs} ${runs === 1 ? 'run' : 'runs'} off the bat`}>
                <Text style={styles.extraSheetRunValue}>{runs}</Text>
                <Text style={styles.extraSheetRunCaption}>
                  {runs === 1 ? 'run' : 'runs'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={onClose}
            style={styles.extraSheetCancel}
            accessibilityRole="button"
            accessibilityLabel="Close more extras">
            <Text style={styles.extraSheetCancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const THIS_OVER_BALL = wp(8.5);

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
        <View key={`cb-${i}`} style={styles.thisOverSlot}>
          <Pellet ball={d} size={THIS_OVER_BALL} />
        </View>
      ))}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <View key={`empty-${i}`} style={styles.thisOverSlot}>
          <View
            style={[
              styles.emptyBallSlot,
              {
                width: THIS_OVER_BALL,
                height: THIS_OVER_BALL,
                borderRadius: THIS_OVER_BALL / 2,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

export interface LiveScoringPanelProps {
  matchId: string;
  onClose: () => void;
  onRepeatMatch?: (newMatchId: string) => void;
}

export function LiveScoringPanel({
  matchId,
  onClose,
  onRepeatMatch,
}: LiveScoringPanelProps) {
  const insets = useSafeAreaInsets();
  const addMatch = useMatchStore(s => s.addMatch);
  const updateMatch = useMatchStore(s => s.updateMatch);
  const match = useMatchStore(s => s.matches.find(m => m.id === matchId));

  const undoRef = useRef<MatchSummary[]>([]);
  const [recentOpen, setRecentOpen] = useState(false);
  const [extrasExpanded, setExtrasExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [bottomBannerVisible, setBottomBannerVisible] = useState(false);
  const [sharingActive, setSharingActive] = useState(() =>
    isSharingMatch(matchId),
  );
  const [viewerDroppedOpen, setViewerDroppedOpen] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [hadViewers, setHadViewers] = useState(false);
  const prevViewerCountRef = useRef(0);
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

  useEffect(() => {
    return subscribeHostShare(s => {
      const active = s.active && s.matchId === matchId;
      setSharingActive(active);
      setViewerCount(active ? s.viewerCount : 0);
      setHadViewers(active ? s.hadViewers : false);
      if (!active) {
        prevViewerCountRef.current = 0;
        setViewerDroppedOpen(false);
        return;
      }
      if (
        prevViewerCountRef.current > 0 &&
        s.viewerCount < prevViewerCountRef.current
      ) {
        setViewerDroppedOpen(true);
      }
      prevViewerCountRef.current = s.viewerCount;
    });
  }, [matchId]);

  const handleClose = useCallback(() => {
    if (getHostShareState().matchId === matchId) {
      stopHostShare().catch(() => undefined);
    }
    onClose();
  }, [matchId, onClose]);

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
    return replay
      .slice(0, -1)
      .filter(over => over.deliveries.length > 0)
      .slice(-3);
  }, [replay]);
  const recentOverSummary = useMemo(
    () =>
      recentOvers
        .map(over => {
          const runs = over.deliveries.reduce(
            (sum, delivery) => sum + tallyDeliveryRuns(delivery),
            0,
          );
          return `O${over.overNumber}: ${runs} runs`;
        })
        .join('  ·  '),
    [recentOvers],
  );

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
        `At least ${minOvers} overs have already been bowled.`,
      );
      return;
    }

    const minWkts = minWicketsAllowed(match);
    if (editPlayers < minWkts) {
      Alert.alert(
        'Players',
        `The match already has ${minWkts} recorded dismissal${
          minWkts === 1 ? '' : 's'
        }. Increase the player limit to continue.`,
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
        recordCompletedMatchForReview();
      } else if (result.overJustCompleted) {
        const inn0 = finalized.innings[0];
        const cap = finalized.oversPerSide;
        if (
          cap != null &&
          cap > 0 &&
          (finalized.scoringActiveInnings ?? 0) === 0 &&
          isInningsComplete(inn0, cap, wicketsCapForMatch(finalized))
        ) {
          // 1st innings finished (e.g. last ball of the last over), show
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

  const repeatSameMatch = useCallback(() => {
    const completed = matchOverModal;
    if (completed == null) {
      return;
    }
    const newMatch = createRepeatMatch(completed);
    addMatch(newMatch);
    setMatchOverModal(null);
    undoRef.current = [];
    onRepeatMatch?.(newMatch.id);
  }, [matchOverModal, addMatch, onRepeatMatch]);

  const { isInter, isAds } = useAdFlags();
  const {
    load: loadInterstitial,
    show: showInterstitial,
    isLoaded: interstitialLoaded,
    isClosed: interstitialClosed,
    error: interstitialError,
  } = useInterstitialAd(INTERSTITIAL_AD_UNIT_ID);
  const pendingScoringAdRef = useRef<'startSecond' | 'repeatMatch' | null>(
    null,
  );
  const [holdScoringModals, setHoldScoringModals] = useState(false);
  const {
    nativeAd: overNativeAd,
    failed: overNativeAdFailed,
    loadNext: loadNextOverNativeAd,
  } = usePreloadedNativeAd();
  const overModalWasOpenRef = useRef(false);

  useEffect(() => {
    const open = overCompleteModal != null;
    if (overModalWasOpenRef.current && !open) {
      loadNextOverNativeAd();
    }
    overModalWasOpenRef.current = open;
  }, [overCompleteModal, loadNextOverNativeAd]);

  useEffect(() => {
    if (isInter && isAds) {
      loadInterstitial();
    }
  }, [loadInterstitial, isInter, isAds]);

  const finishPendingScoringAd = useCallback(() => {
    const action = pendingScoringAdRef.current;
    if (action == null) {
      return;
    }
    pendingScoringAdRef.current = null;
    setHoldScoringModals(false);
    if (action === 'startSecond') {
      startSecond();
    } else {
      repeatSameMatch();
    }
    if (isInter && isAds) {
      loadInterstitial();
    }
  }, [startSecond, repeatSameMatch, isInter, isAds, loadInterstitial]);

  useEffect(() => {
    if (!interstitialClosed) {
      return;
    }
    finishPendingScoringAd();
  }, [interstitialClosed, finishPendingScoringAd]);

  useEffect(() => {
    if (!interstitialError) {
      return;
    }
    finishPendingScoringAd();
  }, [interstitialError, finishPendingScoringAd]);

  const runAfterInterstitial = useCallback(
    (action: 'startSecond' | 'repeatMatch') => {
      if (isInter && isAds && interstitialLoaded) {
        pendingScoringAdRef.current = action;
        setHoldScoringModals(true);
        showInterstitial();
        return;
      }
      if (action === 'startSecond') {
        startSecond();
      } else {
        repeatSameMatch();
      }
    },
    [
      isInter,
      isAds,
      interstitialLoaded,
      showInterstitial,
      startSecond,
      repeatSameMatch,
    ],
  );

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
    handleClose();
    maybeRequestInAppReview();
  }, [handleClose]);

  if (!match || !activeInn) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={styles.missing}>Match not found.</Text>
        <Pressable onPress={handleClose} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={handleClose}
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
            onPress={() => setShareOpen(true)}
            style={({ pressed }) => [
              styles.shareBtn,
              sharingActive && styles.iconHitActive,
              pressed && !sharingActive && styles.backPressed,
              pressed && sharingActive && styles.shareBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              sharingActive ? 'Sharing live score' : 'Share live score'
            }
          >
            <QrCodeIcon
              size={wp(4.5)}
              color={sharingActive ? colors.background : colors.primary}
            />
            <Text
              style={[
                styles.shareBtnLabel,
                sharingActive && styles.shareBtnLabelActive,
              ]}>
              {sharingActive ? 'Sharing' : 'Share'}
            </Text>
          </Pressable>
          <Pressable
            onPress={undo}
            style={({ pressed }) => [
              styles.iconHit,
              pressed && styles.backPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Undo last ball"
          >
            <UndoIcon />
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
            <EditIcon />
          </Pressable>
        </View>
      </View>

      {sharingActive ? (
        <Pressable
          onPress={() => setShareOpen(true)}
          style={({ pressed }) => [
            styles.sharingBar,
            pressed && styles.backPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Live sharing is on. Tap to show the code."
        >
          <View style={styles.sharingDot} />
          <Text style={styles.sharingBarText} numberOfLines={1}>
            {viewerCount > 0
              ? `Sharing live · ${viewerCount} watching`
              : hadViewers
                ? 'Sharing live · someone left'
                : 'Sharing live · waiting to be scanned'}
          </Text>
          <Text style={styles.sharingBarCta}>Code</Text>
        </Pressable>
      ) : null}

      <View style={styles.mainColumn}>
        <ScrollView
          style={styles.scrollFill}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingBottom: GOLDEN_SPACING.md,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.scoreboardCard}>
            <View style={styles.scoreboardTop}>
              <Text style={styles.inningsTagInline}>
                {activeIdx === 0 ? '1st innings' : '2nd innings'}
              </Text>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>

            <Text style={styles.activeTeamName} numberOfLines={1}>
              {activeInn.teamName}
            </Text>
            {chase != null ? (
              <View style={styles.scoreMainRow}>
                <View
                  style={styles.scoreStat}
                  accessible
                  accessibilityLabel={`${activeInn.runs} for ${activeInn.wickets}, overs ${formatOvers(activeInn.overs)}`}>
                  <Text style={styles.scoreStatLabel}>SCORE</Text>
                  <Text
                    style={styles.scoreStatValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.55}>
                    {activeInn.runs}/{activeInn.wickets}
                  </Text>
                  <Text style={styles.scoreStatDetail} numberOfLines={1}>
                    {formatOvers(activeInn.overs)}
                    {oversCap > 0 ? ` / ${oversCap}` : ''} ov
                  </Text>
                </View>
                <View style={styles.scoreMainDivider} />
                <View
                  style={styles.scoreStat}
                  accessible
                  accessibilityLabel={
                    chase.need === 0
                      ? `Target ${chase.target} reached`
                      : `Target ${chase.target}, need ${chase.need}`
                  }>
                  <Text style={styles.scoreStatLabel}>TARGET</Text>
                  <Text
                    style={styles.scoreStatValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.55}>
                    {chase.target}
                  </Text>
                  <Text style={styles.scoreStatDetail} numberOfLines={1}>
                    {chase.need === 0 ? 'Reached' : `Need ${chase.need}`}
                  </Text>
                </View>
                {legalBallsRemaining != null ? (
                  <>
                    <View style={styles.scoreMainDivider} />
                    <View
                      style={styles.scoreStat}
                      accessible
                      accessibilityLabel={`${legalBallsRemaining} balls left`}>
                      <Text style={styles.scoreStatLabel}>BALLS</Text>
                      <Text
                        style={styles.scoreStatValue}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.55}>
                        {legalBallsRemaining}
                      </Text>
                      <Text style={styles.scoreStatDetail} numberOfLines={1}>
                        left
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>
            ) : (
              <View style={styles.scoreMainColumn}>
                <Text
                  style={styles.scoreMain}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}>
                  {activeInn.runs}/{activeInn.wickets}
                </Text>
                <Text style={styles.oversLine}>
                  Overs {formatOvers(activeInn.overs)}
                  {oversCap > 0 ? ` / ${oversCap}` : ''}
                </Text>
              </View>
            )}

            <View style={styles.rateRow}>
              <View style={styles.rateCell}>
                <Text style={styles.rateLabel}>CURRENT RR</Text>
                <Text style={styles.rateValue}>{formatRunRate(currentRR)}</Text>
              </View>
              <View style={styles.rateDivider} />
              <View style={styles.rateCell}>
                <Text style={styles.rateLabel}>
                  {chase != null ? 'REQUIRED RR' : 'WICKETS'}
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
              <ThisOverRow
                deliveries={currentBalls}
                legalInOver={legalInCurrent}
              />
            </View>

            {recentOvers.length > 0 ? (
              <Pressable
                onPress={() => setRecentOpen(true)}
                style={({ pressed }) => [
                  styles.recentInline,
                  pressed && styles.backPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Recent overs: ${recentOverSummary}`}
                accessibilityHint="Opens the ball-by-ball details">
                <Text style={styles.recentInlineLabel}>RECENT OVERS</Text>
                <Text
                  style={styles.recentInlineSummary}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {recentOverSummary}
                </Text>
                <View style={styles.recentInlineAction}>
                  <Text style={styles.recentInlineActionText}>VIEW</Text>
                  <ChevronRightIcon
                    size={wp(3.5)}
                    color={colors.background}
                  />
                </View>
              </Pressable>
            ) : null}
          </View>
          {showStartSecondCta ? (
            <View style={styles.secondInningsDock}>
              <Text style={styles.secondInningsDockText}>
                First innings complete. Start the chase when the teams are ready.
              </Text>
              <Pressable
                onPress={() => runAfterInterstitial('startSecond')}
                style={({ pressed }) => [
                  styles.secondInningsButton,
                  pressed && styles.runCellPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Start second innings">
                <Text style={styles.secondInningsButtonText}>
                  Start 2nd innings
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScoringPad
              apply={apply}
              onMoreExtras={() => setExtrasExpanded(true)}
              onWicket={openWicketModal}
            />
          )}
        </ScrollView>
        <View style={bottomBannerVisible ? styles.bottomAdStrip : undefined}>
          <StickyBottomBannerAd onVisibilityChange={setBottomBannerVisible} />
        </View>
      </View>

      {extrasExpanded ? (
        <ExtrasSheet
          onClose={() => setExtrasExpanded(false)}
          onSelect={apply}
        />
      ) : null}

      <Modal
        visible={recentOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRecentOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setRecentOpen(false)}
        >
          <Pressable
            style={styles.recentModalSheet}
            onPress={event => event.stopPropagation()}
          >
            <View style={styles.recentModalHeader}>
              <View>
                <Text style={styles.recentModalTitle}>Recent overs</Text>
                <Text style={styles.recentModalSubtitle}>
                  Ball-by-ball score
                </Text>
              </View>
              <Pressable
                onPress={() => setRecentOpen(false)}
                style={({ pressed }) => [
                  styles.recentModalClose,
                  pressed && styles.backPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close recent overs"
              >
                <CloseIcon size={wp(4.5)} color={colors.primary} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.recentModalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.recentModalContent}
            >
              {recentOvers.map(over => {
                const runs = over.deliveries.reduce(
                  (sum, delivery) => sum + tallyDeliveryRuns(delivery),
                  0,
                );
                return (
                  <View key={over.overNumber} style={styles.recentOverLine}>
                    <View style={styles.recentOverHeader}>
                      <Text style={styles.recentOverLbl}>
                        Over {over.overNumber}
                      </Text>
                      <Text style={styles.recentOverRuns}>
                        {runs} {runs === 1 ? 'run' : 'runs'}
                      </Text>
                    </View>
                    <View style={styles.recentChips}>
                      {over.deliveries.map((delivery, index) => (
                        <Pellet
                          key={`${over.overNumber}-${index}`}
                          ball={delivery}
                          size={wp(10)}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={() => setRecentOpen(false)}
              style={({ pressed }) => [
                styles.recentModalDone,
                pressed && styles.runCellPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close recent overs"
            >
              <Text style={styles.recentModalDoneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
                  Choose a dismissal type
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
        visible={overCompleteModal != null && !holdScoringModals}
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
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
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
                    <Pellet key={`oc-${i}`} ball={d} size={wp(9)} />
                  ))}
                </ScrollView>
                {firstInnDone && activeIdx === 0 ? (
                  <Pressable
                    onPress={() => runAfterInterstitial('startSecond')}
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
                <OverCompleteNativeAd
                  nativeAd={overNativeAd}
                  failed={overNativeAdFailed}
                />
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showStartSecondCta && !holdScoringModals}
        transparent
        animationType="fade"
        onRequestClose={() => undefined}
        statusBarTranslucent
      >
        <View style={styles.matchOverBackdrop}>
          <View style={styles.matchOverSheet}>
            <Text style={styles.matchOverTitle}>1st innings complete</Text>
            <Text style={styles.firstBreakHeadline}>
              {activeInn.teamName}: {activeInn.runs}/{activeInn.wickets}
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
                    <Pellet key={`fb-${i}`} ball={d} size={wp(9)} />
                  ))}
                </ScrollView>
              </>
            ) : null}
            <View style={styles.firstBreakCtaBlock}>
              <Text style={styles.firstBreakCtaNote}>
                When both sides are ready, start the second innings.
              </Text>
              <Pressable
                onPress={() => runAfterInterstitial('startSecond')}
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
        visible={matchOverModal != null && !holdScoringModals}
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
            {matchOverModal != null ? (
              <Text style={styles.matchOverRepeatHint}>
                {matchOverModal.oversPerSide ?? 10} overs ·{' '}
                {wicketsCapForMatch(matchOverModal)} players per team
              </Text>
            ) : null}
            <View style={styles.matchOverCtaRow}>
              <Pressable
                onPress={() => runAfterInterstitial('repeatMatch')}
                style={({ pressed }) => [
                  styles.matchOverCta,
                  pressed && styles.matchOverCtaPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Repeat match with same overs and players"
              >
                <Text style={styles.matchOverCtaText}>Repeat match</Text>
              </Pressable>
              <Pressable
                onPress={dismissMatchOver}
                style={({ pressed }) => [
                  styles.matchOverCtaSecondary,
                  pressed && styles.matchOverCtaPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close and return home"
              >
                <Text style={styles.matchOverCtaSecondaryText}>Done</Text>
              </Pressable>
            </View>
          </View>
          {matchOverModal != null && matchOverModal.margin.kind !== 'tie' ? (
            <MatchWinConfetti key={matchOverModal.id} />
          ) : null}
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

      {shareOpen ? (
        <ShareLiveScoreModal
          visible
          matchId={matchId}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
      <LiveShareNoticeModal
        visible={viewerDroppedOpen}
        title="Someone stopped watching"
        message="They can tap Connect again and scan the same code. You do not need to refresh it."
        primaryLabel="OK"
        onPrimary={() => setViewerDroppedOpen(false)}
        secondaryLabel="Show code"
        onSecondary={() => {
          setViewerDroppedOpen(false);
          setShareOpen(true);
        }}
        onRequestClose={() => setViewerDroppedOpen(false)}
      />
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
  secondInningsDock: {
    gap: GOLDEN_SPACING.sm,
  },
  secondInningsDockText: {
    fontSize: fontSize(13),
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  secondInningsButton: {
    paddingVertical: hp(1.2),
    borderRadius: wp(3),
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  scrollFill: {
    flex: 1,
  },
  bottomAdStrip: {
    alignItems: 'center',
    paddingBottom: 0,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
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
    width: wp(11),
    height: wp(11),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: wp(2.5),
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    // height: wp(11),
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(2.2),
    borderRadius: wp(2.5),
  },
  shareBtnPressed: {
    opacity: 0.85,
  },
  shareBtnLabel: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.primary,
  },
  shareBtnLabelActive: {
    color: colors.background,
  },
  iconHitActive: {
    backgroundColor: colors.primary,
  },
  backArrow: {
    width: wp(4),
    height: wp(4),
    tintColor: colors.primary,
  },
  backPressed: {
    backgroundColor: colors.primaryFaint,
  },
  backLbl: {
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.primary,
    includeFontPadding: false,
  },
  sharingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginHorizontal: wp(3),
    marginTop: hp(0.6),
    marginBottom: hp(0.4),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.9),
    borderRadius: wp(2.5),
    backgroundColor: colors.primaryFaint,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  sharingDot: {
    width: wp(2.2),
    height: wp(2.2),
    borderRadius: wp(1.1),
    backgroundColor: colors.primary,
  },
  sharingBarText: {
    flex: 1,
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.text,
  },
  sharingBarCta: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.primary,
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
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.74)',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  scoreboardCard: {
    borderRadius: wp(4),
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    marginBottom: hp(1.5),
    backgroundColor: colors.primary,
  },
  scoreboardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(0.8),
  },
  liveBadge: {
    paddingHorizontal: wp(2.7),
    paddingVertical: hp(0.5),
    borderRadius: wp(4),
    backgroundColor: colors.accent,
  },
  liveBadgeText: {
    fontSize: fontSize(10),
    fontWeight: '900',
    letterSpacing: 0.8,
    color: colors.background,
  },
  scoreMainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: wp(1.5),
    marginBottom: hp(1.2),
  },
  scoreStat: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.4),
  },
  scoreStatLabel: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.72)',
    letterSpacing: 0.6,
    marginBottom: hp(0.2),
  },
  scoreStatValue: {
    fontSize: fontSize(26),
    lineHeight: fontSize(30),
    fontWeight: '900',
    color: colors.background,
    textAlign: 'center',
  },
  scoreStatDetail: {
    marginTop: hp(0.15),
    fontSize: fontSize(11),
    lineHeight: fontSize(14),
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.78)',
    textAlign: 'center',
  },
  scoreMainColumn: {
    flex: 1,
    minWidth: 0,
    marginBottom: hp(1.2),
  },
  scoreMainDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: hp(0.4),
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  activeTeamName: {
    marginBottom: hp(0.2),
    fontSize: fontSize(15),
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.82)',
  },
  scoreMain: {
    fontSize: fontSize(46),
    fontWeight: '900',
    color: colors.background,
    textAlign: 'left',
    letterSpacing: -1,
  },
  oversLine: {
    fontSize: fontSize(13),
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.74)',
    textAlign: 'left',
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.2),
    paddingVertical: hp(0.9),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  rateCell: {
    flex: 1,
    alignItems: 'center',
  },
  rateDivider: {
    width: 1,
    height: hp(3),
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  rateLabel: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.68)',
    letterSpacing: 0.5,
    marginBottom: hp(0.2),
  },
  rateValue: {
    fontSize: fontSize(18),
    fontWeight: '900',
    color: colors.background,
  },
  thisOverBlock: {
    marginTop: hp(0.2),
  },
  thisOverLabel: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.68)',
    letterSpacing: 0.8,
    marginBottom: hp(0.8),
  },
  thisOverRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    width: '100%',
    rowGap: hp(0.7),
  },
  thisOverSlot: {
    width: '16.66%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBallSlot: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  scoringPad: {
    gap: GOLDEN_SPACING.sm,
  },
  padSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(1.8),
    marginTop: GOLDEN_SPACING.xxs,
  },
  padSectionHint: {
    fontSize: fontSize(11),
    fontWeight: '600',
    color: colors.textMuted,
  },
  padSectionTitle: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  scoringRunsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: wp(1.5),
  },
  runBtn: {
    width: '23%',
    height: hp(6.4),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: 'rgba(7, 64, 137, 0.16)',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: hp(0.1),
  },
  runBtnText: {
    fontSize: fontSize(23),
    fontWeight: '900',
    color: colors.primary,
    lineHeight: fontSize(25),
  },
  runBtnLabel: {
    fontSize: fontSize(9),
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
    lineHeight: fontSize(11),
  },
  wicketBtnFull: {
    minHeight: hp(5.8),
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp(2),
    borderRadius: wp(3),
    backgroundColor: PELLET_COLORS.wicket.bg,
    alignItems: 'center',
  },
  wicketBtnFullText: {
    fontSize: fontSize(14),
    fontWeight: '900',
    color: colors.background,
    letterSpacing: 0.8,
  },
  extrasGrid4: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp(1.5),
  },
  extraPadBtn: {
    width: '23%',
    height: hp(6.4),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: 'rgba(7, 64, 137, 0.16)',
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: hp(0.1),
  },
  extraPadCode: {
    fontSize: fontSize(9),
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.6,
    lineHeight: fontSize(11),
  },
  extraPadBtnText: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.text,
    lineHeight: fontSize(14),
  },
  moreExtrasToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1),
    paddingVertical: GOLDEN_SPACING.xxs,
  },
  moreExtrasToggleText: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.primary,
  },
  moreExtrasChevron: {
    transform: [{ rotate: '90deg' }],
  },
  secondInningsButtonText: {
    fontSize: fontSize(15),
    fontWeight: '900',
    letterSpacing: 0.5,
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
  recentInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginTop: hp(1.2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: wp(2.5),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  recentInlineLabel: {
    fontSize: fontSize(9),
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.68)',
    letterSpacing: 0.7,
  },
  recentInlineSummary: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSize(11),
    fontWeight: '700',
    color: colors.background,
  },
  recentInlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(0.5),
  },
  recentInlineActionText: {
    fontSize: fontSize(9),
    fontWeight: '900',
    color: colors.background,
    letterSpacing: 0.6,
  },
  recentModalSheet: {
    width: '100%',
    maxHeight: '82%',
    padding: wp(4),
    borderRadius: wp(4),
    backgroundColor: colors.background,
  },
  recentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.4),
  },
  recentModalTitle: {
    fontSize: fontSize(18),
    fontWeight: '900',
    color: colors.text,
  },
  recentModalSubtitle: {
    marginTop: hp(0.2),
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
  },
  recentModalClose: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentModalScroll: {
    flexShrink: 1,
  },
  recentModalContent: {
    gap: hp(1),
    paddingBottom: hp(0.5),
  },
  recentOverLine: {
    gap: hp(0.8),
    padding: wp(3),
    borderRadius: wp(2.5),
    backgroundColor: colors.surfaceMuted,
  },
  recentOverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentOverLbl: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.primary,
  },
  recentOverRuns: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.text,
  },
  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.2),
  },
  recentModalDone: {
    minHeight: hp(5.8),
    marginTop: hp(1.4),
    borderRadius: wp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  recentModalDoneText: {
    fontSize: fontSize(14),
    fontWeight: '800',
    color: colors.background,
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
  wicketBtn: {
    paddingVertical: hp(1.4),
    borderRadius: wp(2.5),
    backgroundColor: PELLET_COLORS.wicket.bg,
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
  extrasBottomSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
    paddingHorizontal: wp(5),
    paddingTop: hp(1.2),
    maxHeight: '88%',
  },
  extraSheetSectionTitle: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.text,
    marginTop: hp(0.4),
    marginBottom: hp(0.8),
  },
  extraSheetRunRow: {
    flexDirection: 'row',
    gap: wp(1.5),
    marginBottom: hp(1.2),
  },
  extraSheetRunButton: {
    flex: 1,
    minHeight: hp(6.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraSheetRunValue: {
    fontSize: fontSize(18),
    fontWeight: '900',
    color: colors.text,
  },
  extraSheetRunCaption: {
    fontSize: fontSize(10),
    fontWeight: '600',
    color: colors.textMuted,
  },
  extraSheetCancel: {
    alignItems: 'center',
    paddingVertical: hp(1),
  },
  extraSheetCancelText: {
    fontSize: fontSize(14),
    fontWeight: '800',
    color: colors.primary,
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
    backgroundColor: PELLET_COLORS.wicket.bg,
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
  confettiParticle: {
    position: 'absolute',
    top: 0,
    borderRadius: wp(0.6),
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
  matchOverRepeatHint: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  matchOverCtaRow: {
    gap: hp(0.8),
  },
  matchOverCta: {
    backgroundColor: colors.primary,
    borderRadius: wp(2.5),
    paddingVertical: hp(1.4),
    alignItems: 'center',
  },
  matchOverCtaSecondary: {
    borderRadius: wp(2.5),
    paddingVertical: hp(1.4),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  matchOverCtaPressed: {
    opacity: 0.92,
  },
  matchOverCtaText: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.background,
  },
  matchOverCtaSecondaryText: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.text,
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
