import { Platform, Vibration } from 'react-native';
import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';

const HAPTIC_OPTS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
} as const;

let lastTapMs = 0;

function debounce(ms = 36): boolean {
  const now = Date.now();
  if (now - lastTapMs < ms) {
    return false;
  }
  lastTapMs = now;
  return true;
}

/** Light tap — buttons, toolbar, modal CTAs. */
export function tapFeedback(): void {
  if (!debounce()) {
    return;
  }
  if (Platform.OS === 'ios') {
    ReactNativeHapticFeedback.trigger(
      HapticFeedbackTypes.impactLight,
      HAPTIC_OPTS,
    );
    return;
  }
  Vibration.vibrate(8);
}

/** Scoring pad — slightly stronger confirmation per ball. */
export function scoringTapFeedback(): void {
  if (!debounce(28)) {
    return;
  }
  if (Platform.OS === 'ios') {
    ReactNativeHapticFeedback.trigger(
      HapticFeedbackTypes.impactMedium,
      HAPTIC_OPTS,
    );
    return;
  }
  Vibration.vibrate(12);
}

/** After a delivery is saved — boundary / wicket emphasis. */
export function deliverySavedFeedback(kind: 'normal' | 'boundary' | 'wicket'): void {
  if (!debounce(50)) {
    return;
  }
  if (Platform.OS === 'ios') {
    const type =
      kind === 'wicket'
        ? HapticFeedbackTypes.notificationWarning
        : kind === 'boundary'
          ? HapticFeedbackTypes.impactHeavy
          : HapticFeedbackTypes.selection;
    ReactNativeHapticFeedback.trigger(type, HAPTIC_OPTS);
    return;
  }
  const ms = kind === 'boundary' ? 18 : kind === 'wicket' ? 22 : 10;
  Vibration.vibrate(ms);
}
