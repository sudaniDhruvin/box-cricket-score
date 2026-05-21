import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

export interface ChasePreviewHintProps {
  firstInningsRuns: number;
  onOpenScoringHelp?: () => void;
}

/**
 * Shown during 1st innings so users know chase info will appear later (AGENTS §6.3.3).
 */
export function ChasePreviewHint({
  firstInningsRuns,
  onOpenScoringHelp,
}: ChasePreviewHintProps) {
  const futureTarget = firstInningsRuns + 1;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>After 1st innings</Text>
      <Text style={styles.body}>
        Target, runs to win, and required rate will show here in the 2nd innings
        {firstInningsRuns > 0
          ? ` (target will be at least ${futureTarget} based on current score).`
          : '.'}
      </Text>
      {onOpenScoringHelp != null ? (
        <Pressable
          onPress={onOpenScoringHelp}
          style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
          accessibilityRole="button"
          accessibilityLabel="Learn how chase scoring works"
        >
          <Text style={styles.linkText}>Learn how chase works</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: hp(1.2),
    paddingVertical: hp(1.1),
    paddingHorizontal: wp(3.5),
    borderRadius: wp(2.5),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.primaryFaint,
  },
  label: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: hp(0.35),
  },
  body: {
    fontSize: fontSize(13),
    lineHeight: fontSize(19),
    fontWeight: '600',
    color: colors.textMuted,
  },
  link: {
    marginTop: hp(0.6),
    alignSelf: 'flex-start',
  },
  linkPressed: {
    opacity: 0.8,
  },
  linkText: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
