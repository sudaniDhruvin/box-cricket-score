import React, { useEffect } from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

type AnimatedScorePulseProps = {
  runs: number;
  wickets: number;
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

/** Brief scale pulse when runs or wickets change after a delivery. */
export function AnimatedScorePulse({
  runs,
  wickets,
  children,
  style,
  accessibilityLabel,
}: AnimatedScorePulseProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.05, { damping: 8, stiffness: 480, mass: 0.35 }),
      withSpring(1, { damping: 10, stiffness: 320, mass: 0.4 }),
    );
  }, [runs, wickets, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text
      style={[style, animStyle]}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Animated.Text>
  );
}
