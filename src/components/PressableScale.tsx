import React, { useCallback } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { wp } from '../utils';
import { scoringTapFeedback, tapFeedback } from '../utils/pressFeedback';

const PRESS_IN_MS = 55;
const PRESS_OUT_MS = 140;

const SPRING_IN = { damping: 14, stiffness: 520, mass: 0.35 };
const SPRING_OUT = { damping: 11, stiffness: 340, mass: 0.45 };

export type PressFeedbackKind = 'default' | 'scoring' | 'none';

export type PressableScaleProps = Omit<PressableProps, 'children'> & {
  children?: React.ReactNode;
  scaleTo?: number;
  haptic?: boolean;
  /** default = light tap; scoring = medium tap for run buttons. */
  feedbackKind?: PressFeedbackKind;
  /** Teal wash on press (run/extra cells). */
  pressTint?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  ripple?: boolean;
};

export function PressableScale({
  children,
  style,
  containerStyle,
  scaleTo = 0.96,
  haptic = true,
  feedbackKind = 'default',
  pressTint = false,
  ripple = true,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const press = useSharedValue(0);

  const pump = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      if (!disabled) {
        press.value = withTiming(1, { duration: PRESS_IN_MS });
        scale.value = withSpring(scaleTo, SPRING_IN);
        if (haptic && feedbackKind !== 'none') {
          if (feedbackKind === 'scoring') {
            scoringTapFeedback();
          } else {
            tapFeedback();
          }
        }
      }
      onPressIn?.(e);
    },
    [disabled, feedbackKind, haptic, onPressIn, press, scale, scaleTo],
  );

  const release = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      press.value = withTiming(0, { duration: PRESS_OUT_MS });
      scale.value = withSpring(1, SPRING_OUT);
      onPressOut?.(e);
    },
    [onPressOut, press, scale],
  );

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(
      press.value,
      [0, 1],
      [1, Platform.OS === 'ios' ? 0.9 : 0.94],
    ),
  }));

  const tintStyle = useAnimatedStyle(() => ({
    opacity: pressTint ? interpolate(press.value, [0, 1], [0, 0.14]) : 0,
  }));

  const androidRipple =
    ripple && Platform.OS === 'android' && !disabled
      ? { color: colors.primaryRipple, borderless: false }
      : undefined;

  return (
    <Animated.View
      style={[containerStyle, shellStyle]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={pump}
        onPressOut={release}
        onPress={onPress}
        android_ripple={androidRipple}
        style={state => [
          typeof style === 'function' ? style(state) : style,
          pressTint && styles.clip,
          disabled && styles.disabled,
        ]}
      >
        {pressTint ? (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.tint, tintStyle]}
          />
        ) : null}
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tint: {
    backgroundColor: colors.primary,
    borderRadius: wp(2.5),
  },
  clip: {
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.4,
  },
});
