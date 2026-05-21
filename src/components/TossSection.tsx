import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { colors } from '../theme/colors';
import { tapFeedback } from '../utils/pressFeedback';
import { playTossFlipSound, stopTossFlipSound } from '../utils/tossSounds';
import {
  randomTossSide,
  tossSpinTargetDegrees,
  type TossSide,
} from '../utils/tossRandom';
import { fontSize, hp, wp } from '../utils';

export type { TossSide } from '../utils/tossRandom';

export type TossOutcome = {
  result: TossSide;
  callingTeam: 0 | 1;
  call: TossSide;
  winner: 0 | 1;
};

export interface TossSectionProps {
  teamAName: string;
  teamBName: string;
  onOutcome: (outcome: TossOutcome) => void;
  onReset?: () => void;
}

const COIN_SIZE = wp(26);
/** Precomputed — must not call hp() inside Reanimated worklets. */
const COIN_LIFT_PX = hp(1.2);
const SPIN_MS = 2400;
const FULL_ROTATIONS = 6;

function CoinFace({
  label,
  sub,
  accent,
  large,
}: {
  label: string;
  sub: string;
  accent?: boolean;
  large?: boolean;
}) {
  return (
    <View style={styles.face}>
      <Text
        style={[
          styles.faceLetter,
          large && styles.faceLetterLarge,
          accent && styles.faceLetterAccent,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.faceSub,
          large && styles.faceSubLarge,
          accent && styles.faceSubAccent,
        ]}
      >
        {sub}
      </Text>
    </View>
  );
}

export function TossSection({
  teamAName,
  teamBName,
  onOutcome,
  onReset,
}: TossSectionProps) {
  const [callingTeam, setCallingTeam] = useState<0 | 1>(0);
  const [call, setCall] = useState<TossSide | null>(null);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'done'>('idle');
  const [result, setResult] = useState<TossSide | null>(null);
  const [winner, setWinner] = useState<0 | 1 | null>(null);

  const rotateY = useSharedValue(0);
  const coinLift = useSharedValue(0);
  const resultOpacity = useSharedValue(0);

  useEffect(() => () => stopTossFlipSound(), []);

  const finishSpin = useCallback(
    (landed: TossSide) => {
      setResult(landed);
      const callSide = call!;
      const w: 0 | 1 =
        callSide === landed ? callingTeam : callingTeam === 0 ? 1 : 0;
      setWinner(w);
      setPhase('done');
      // Snap to a stable angle so the landed face is visible on all devices.
      rotateY.value = landed === 'heads' ? 0 : 180;
      coinLift.value = 0;
      resultOpacity.value = withTiming(1, { duration: 320 });
      tapFeedback();
      onOutcome({
        result: landed,
        callingTeam,
        call: callSide,
        winner: w,
      });
    },
    [call, callingTeam, coinLift, onOutcome, resultOpacity, rotateY],
  );

  const resetToss = useCallback(() => {
    stopTossFlipSound();
    setPhase('idle');
    setResult(null);
    setWinner(null);
    rotateY.value = 0;
    coinLift.value = 0;
    resultOpacity.value = 0;
    onReset?.();
  }, [coinLift, onReset, resultOpacity, rotateY]);

  const spinCoin = useCallback(() => {
    if (call == null || phase === 'spinning') {
      return;
    }
    if (phase === 'done') {
      resetToss();
    }
    setPhase('spinning');
    setResult(null);
    setWinner(null);
    resultOpacity.value = 0;

    playTossFlipSound();

    const landed = randomTossSide();
    const startRot = rotateY.value;
    const finalRot = tossSpinTargetDegrees(startRot, landed, FULL_ROTATIONS);

    coinLift.value = withSequence(
      withTiming(1, {
        duration: SPIN_MS * 0.15,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(0, {
        duration: SPIN_MS * 0.85,
        easing: Easing.inOut(Easing.quad),
      }),
    );

    rotateY.value = withTiming(
      finalRot,
      {
        duration: SPIN_MS,
        easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      },
      finished => {
        if (finished) {
          runOnJS(finishSpin)(landed);
        }
      },
    );
  }, [call, coinLift, finishSpin, phase, resetToss, resultOpacity, rotateY]);

  const coinWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { translateY: -coinLift.value * COIN_LIFT_PX },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  const headsFaceStyle = useAnimatedStyle(() => {
    const norm = ((rotateY.value % 360) + 360) % 360;
    const show = norm <= 90 || norm >= 270;
    return { opacity: show ? 1 : 0 };
  });

  const tailsFaceStyle = useAnimatedStyle(() => {
    const norm = ((rotateY.value % 360) + 360) % 360;
    const show = norm > 90 && norm < 270;
    return { opacity: show ? 1 : 0 };
  });

  const resultBannerStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ translateY: (1 - resultOpacity.value) * 8 }],
  }));

  const callerName = callingTeam === 0 ? teamAName : teamBName;
  const winnerName = winner === 0 ? teamAName : winner === 1 ? teamBName : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Toss</Text>
        <Text style={styles.hint}>Tap flip when ready</Text>
      </View>

      <Text style={styles.lbl}>Who calls?</Text>
      <View style={styles.row}>
        <PressableScale
          onPress={() => {
            setCallingTeam(0);
            resetToss();
          }}
          scaleTo={0.95}
          containerStyle={styles.chipWrap}
          style={[styles.chip, callingTeam === 0 && styles.chipOn]}
          disabled={phase === 'spinning'}
        >
          <Text
            style={[styles.chipTxt, callingTeam === 0 && styles.chipTxtOn]}
            numberOfLines={1}
          >
            {teamAName}
          </Text>
        </PressableScale>
        <PressableScale
          onPress={() => {
            setCallingTeam(1);
            resetToss();
          }}
          scaleTo={0.95}
          containerStyle={styles.chipWrap}
          style={[styles.chip, callingTeam === 1 && styles.chipOn]}
          disabled={phase === 'spinning'}
        >
          <Text
            style={[styles.chipTxt, callingTeam === 1 && styles.chipTxtOn]}
            numberOfLines={1}
          >
            {teamBName}
          </Text>
        </PressableScale>
      </View>

      <Text style={styles.lbl}>{callerName} calls</Text>
      <View style={styles.row}>
        <PressableScale
          onPress={() => {
            setCall('heads');
            resetToss();
          }}
          scaleTo={0.94}
          containerStyle={styles.chipWrap}
          style={[styles.chip, call === 'heads' && styles.chipOn]}
          disabled={phase === 'spinning'}
        >
          <Text style={[styles.chipTxt, call === 'heads' && styles.chipTxtOn]}>
            Heads
          </Text>
        </PressableScale>
        <PressableScale
          onPress={() => {
            setCall('tails');
            resetToss();
          }}
          scaleTo={0.94}
          containerStyle={styles.chipWrap}
          style={[styles.chip, call === 'tails' && styles.chipOn]}
          disabled={phase === 'spinning'}
        >
          <Text style={[styles.chipTxt, call === 'tails' && styles.chipTxtOn]}>
            Tails
          </Text>
        </PressableScale>
      </View>

      <View style={styles.coinStage}>
        {/* <View style={styles.coinShadow} /> */}
        {phase === 'done' && result != null ? (
          <View style={styles.resultCoinWrap}>
            <CoinFace
              label={result === 'heads' ? 'H' : 'T'}
              sub={result === 'heads' ? 'Heads' : 'Tails'}
              accent
              large
            />
            <View style={styles.resultCoinBadge}>
              <Text style={styles.resultCoinBadgeText}>Result</Text>
            </View>
          </View>
        ) : (
          <Animated.View style={[styles.coinWrap, coinWrapStyle]}>
            <Animated.View style={[styles.faceSlot, headsFaceStyle]}>
              <CoinFace label="H" sub="Heads" accent />
            </Animated.View>
            <Animated.View
              style={[styles.faceSlot, styles.faceBack, tailsFaceStyle]}
            >
              <CoinFace label="T" sub="Tails" />
            </Animated.View>
          </Animated.View>
        )}
      </View>

      {phase === 'done' && result != null && winnerName != null ? (
        <Animated.View style={[styles.resultBox, resultBannerStyle]}>
          <Text style={styles.resultMain}>
            Landed on {result === 'heads' ? 'Heads' : 'Tails'}
          </Text>
          <Text style={styles.resultWin}>{winnerName} won the toss</Text>
          <Text style={styles.resultBat}>{winnerName} bats first</Text>
        </Animated.View>
      ) : (
        <Text style={styles.coinHint}>
          {call == null
            ? 'Choose heads or tails, then flip'
            : phase === 'spinning'
            ? 'Flipping…'
            : `${callerName} called ${call === 'heads' ? 'heads' : 'tails'}`}
        </Text>
      )}

      <PressableScale
        onPress={spinCoin}
        scaleTo={0.97}
        containerStyle={styles.flipWrap}
        style={[
          styles.flipBtn,
          (call == null || phase === 'spinning') && styles.flipBtnDisabled,
        ]}
        disabled={call == null || phase === 'spinning'}
        accessibilityRole="button"
        accessibilityLabel="Flip coin for toss"
      >
        <Text style={styles.flipBtnText}>
          {phase === 'spinning'
            ? 'Flipping…'
            : phase === 'done'
            ? 'Flip again'
            : 'Flip coin'}
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: wp(3),
    borderRadius: wp(2.5),
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(0.55),
  },
  title: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.text,
  },
  hint: {
    fontSize: fontSize(11),
    fontWeight: '600',
    color: colors.primary,
  },
  lbl: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: hp(0.4),
    marginTop: hp(0.35),
  },
  row: {
    flexDirection: 'row',
    gap: wp(1.1),
    marginBottom: hp(0.2),
  },
  chipWrap: {
    flex: 1,
    minWidth: 0,
  },
  chip: {
    paddingVertical: hp(0.65),
    paddingHorizontal: wp(1),
    borderRadius: wp(2),
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipTxt: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.textMuted,
  },
  chipTxtOn: {
    color: colors.background,
  },
  coinStage: {
    alignItems: 'center',
    justifyContent: 'center',
    height: hp(13),
    marginTop: hp(0.5),
    marginBottom: hp(0.35),
  },
  coinShadow: {
    position: 'absolute',
    bottom: hp(1.2),
    width: COIN_SIZE * 0.72,
    height: hp(1),
    borderRadius: wp(20),
    backgroundColor: 'rgba(7, 7, 7, 0.12)',
  },
  coinWrap: {
    width: COIN_SIZE,
    height: COIN_SIZE,
  },
  resultCoinWrap: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCoinBadge: {
    position: 'absolute',
    bottom: -hp(0.2),
    paddingVertical: hp(0.25),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2),
    backgroundColor: colors.primary,
  },
  resultCoinBadgeText: {
    fontSize: fontSize(9),
    fontWeight: '800',
    color: colors.background,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  faceSlot: {
    ...StyleSheet.absoluteFill,
    backfaceVisibility: 'hidden',
  },
  faceBack: {
    transform: [{ rotateY: '180deg' }],
  },
  face: {
    width: '100%',
    height: '100%',
    borderRadius: COIN_SIZE / 2,
    borderWidth: 3,
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceLetter: {
    fontSize: fontSize(32),
    fontWeight: '900',
    color: '#5C4A12',
    lineHeight: fontSize(36),
  },
  faceLetterLarge: {
    fontSize: fontSize(40),
    lineHeight: fontSize(44),
  },
  faceLetterAccent: {
    color: colors.primary,
  },
  faceSub: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: '#7A6520',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: hp(0.1),
  },
  faceSubLarge: {
    fontSize: fontSize(11),
  },
  faceSubAccent: {
    color: colors.primary,
  },
  coinHint: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: hp(0.5),
    minHeight: fontSize(16),
  },
  resultBox: {
    marginBottom: hp(0.55),
    paddingVertical: hp(0.75),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2),
    backgroundColor: colors.primaryFaint,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  resultMain: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  resultWin: {
    fontSize: fontSize(15),
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
    marginTop: hp(0.25),
  },
  resultBat: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: hp(0.15),
  },
  flipWrap: {
    width: '100%',
  },
  flipBtn: {
    backgroundColor: colors.primary,
    borderRadius: wp(2.5),
    paddingVertical: hp(1.1),
    alignItems: 'center',
  },
  flipBtnDisabled: {
    opacity: 0.45,
  },
  flipBtnText: {
    fontSize: fontSize(15),
    fontWeight: '800',
    color: colors.background,
  },
});
