import { Platform, Vibration } from 'react-native';
import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';
import type { Delivery } from '../types/match';
import { playMomentSound } from './matchEventSounds';

const HAPTIC_OPTS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
} as const;

export type MatchMomentKind =
  | 'four'
  | 'six'
  | 'wicket'
  | 'run-out'
  | 'wide'
  | 'no-ball'
  | 'free-hit'
  | 'over-complete'
  | 'match-complete'
  | 'innings-break';

export type MatchMoment = {
  kind: MatchMomentKind;
  id: number;
};

/** Android vibration patterns (ms): delay, vibrate, pause, … */
const ANDROID_PATTERNS: Record<MatchMomentKind, number[]> = {
  four: [0, 38, 55, 42],
  six: [0, 48, 40, 58, 46, 72],
  wicket: [0, 72, 45, 105, 55],
  'run-out': [0, 65, 38, 95, 60],
  wide: [0, 24, 32, 24],
  'no-ball': [0, 30, 45, 30, 45, 30],
  'free-hit': [0, 35, 50, 35, 55, 40],
  'over-complete': [0, 42, 65, 42],
  'match-complete': [0, 55, 80, 55, 80],
  'innings-break': [0, 50, 70, 50],
};

let lastMomentMs = 0;

function debounceMoment(ms = 90): boolean {
  const now = Date.now();
  if (now - lastMomentMs < ms) {
    return false;
  }
  lastMomentMs = now;
  return true;
}

function androidHaptic(kind: MatchMomentKind): void {
  const pattern = ANDROID_PATTERNS[kind];
  Vibration.vibrate(pattern);
}

function iosHaptic(kind: MatchMomentKind): void {
  const type =
    kind === 'six' || kind === 'match-complete'
      ? HapticFeedbackTypes.impactHeavy
      : kind === 'wicket' || kind === 'run-out'
        ? HapticFeedbackTypes.notificationWarning
        : kind === 'wide' || kind === 'no-ball' || kind === 'free-hit'
          ? HapticFeedbackTypes.impactLight
          : kind === 'four'
            ? HapticFeedbackTypes.impactMedium
            : HapticFeedbackTypes.notificationSuccess;
  ReactNativeHapticFeedback.trigger(type, HAPTIC_OPTS);
}

/** Classify a saved delivery — null = routine ball (no immersive feedback). */
export function momentKindForDelivery(d: Delivery): MatchMomentKind | null {
  if (d.type === 'four') {
    return 'four';
  }
  if (d.type === 'six') {
    return 'six';
  }
  if (d.type === 'wicket') {
    return d.wicketDismissal === 'run-out' ? 'run-out' : 'wicket';
  }
  if (d.type === 'wide') {
    return 'wide';
  }
  if (d.type === 'no-ball') {
    if (/fh|free/i.test(d.label)) {
      return 'free-hit';
    }
    return 'no-ball';
  }
  return null;
}

/**
 * Haptic + short tone for impactful moments only.
 * Call after a delivery is successfully saved.
 */
export function playMatchMoment(
  kind: MatchMomentKind,
  opts?: { skipDebounce?: boolean },
): void {
  if (!opts?.skipDebounce && !debounceMoment()) {
    return;
  }
  if (Platform.OS === 'android') {
    androidHaptic(kind);
    playMomentSound(kind);
    return;
  }
  iosHaptic(kind);
  playMomentSound(kind);
}

