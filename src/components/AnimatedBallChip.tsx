import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type AnimatedBallChipProps = {
  /** Change when a new ball is added so the pop-in runs again. */
  chipKey: string;
  children: React.ReactNode;
};

/** Pop-in when a new delivery chip appears in the over strip. */
export function AnimatedBallChip({ chipKey, children }: AnimatedBallChipProps) {
  const scale = useSharedValue(0.55);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = 0.55;
    opacity.value = 0;
    scale.value = withSpring(1, { damping: 11, stiffness: 460, mass: 0.35 });
    opacity.value = withTiming(1, { duration: 100 });
  }, [chipKey, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.wrap, style]}>{children}</Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
