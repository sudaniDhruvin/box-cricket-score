import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

type AnimatedOverBarProps = {
  overNumber: number;
  ballsThisOver: number;
  oversCap: number;
};

export function AnimatedOverBar({
  overNumber,
  ballsThisOver,
  oversCap,
}: AnimatedOverBarProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.03, { damping: 10, stiffness: 420 }),
      withSpring(1, { damping: 12, stiffness: 300 }),
    );
  }, [ballsThisOver, scale]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[styles.bar, barStyle]}
      accessibilityLabel={`Current over ${overNumber}, ${ballsThisOver} of 6 legal balls`}
    >
      <Text style={styles.lbl}>Current over</Text>
      <Text style={styles.num}>{overNumber}</Text>
      <Text style={styles.of}>of {oversCap}</Text>
      <View style={styles.sep} />
      <Text style={styles.balls}>{ballsThisOver}/6 balls</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wp(2),
    marginBottom: hp(1),
    paddingVertical: hp(0.55),
    paddingHorizontal: wp(3),
    borderRadius: wp(2.5),
    backgroundColor: colors.primary,
  },
  lbl: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  num: {
    fontSize: fontSize(26),
    fontWeight: '900',
    color: colors.background,
    lineHeight: fontSize(28),
    minWidth: wp(6),
    textAlign: 'center',
  },
  of: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  sep: {
    width: 1,
    height: hp(2.2),
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginHorizontal: wp(0.5),
  },
  balls: {
    fontSize: fontSize(14),
    fontWeight: '800',
    color: colors.background,
  },
});
