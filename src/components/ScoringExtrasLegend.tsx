import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

/** Compact color key for extras on the live scoring pad (UX-009). */
export function ScoringExtrasLegend() {
  return (
    <View style={styles.row}>
      <LegendItem color={colors.ballWide} label="Wide" />
      <LegendItem color={colors.ballNoBall} label="No-ball" />
      <LegendItem color={colors.ballBye} label="Bye" />
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.item}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3),
    marginBottom: hp(0.6),
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
  },
  swatch: {
    width: wp(3),
    height: wp(3),
    borderRadius: wp(1.5),
  },
  label: {
    fontSize: fontSize(11),
    fontWeight: '700',
    color: colors.textMuted,
  },
});
