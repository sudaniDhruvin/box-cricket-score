import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Delivery } from '../types/match';
import { colors } from '../theme/colors';
import { tallyDeliveryRuns } from '../utils/deliveryScoring';
import { fontSize, hp, wp } from '../utils';

export type OverStripMode = 'current' | 'previous' | 'waiting';

export interface CurrentOverStripProps {
  mode: OverStripMode;
  activeOverNumber: number;
  displayOverNumber?: number;
  deliveries: Delivery[];
  renderBall: (d: Delivery, key: string) => React.ReactNode;
}

/**
 * Ball-by-ball for the active over, or last completed over between overs.
 * Current over number is always shown in the score header; here we show balls.
 */
export function CurrentOverStrip({
  mode,
  activeOverNumber,
  displayOverNumber,
  deliveries,
  renderBall,
}: CurrentOverStripProps) {
  const runTotal = useMemo(
    () => deliveries.reduce((s, d) => s + tallyDeliveryRuns(d), 0),
    [deliveries],
  );

  const sectionTitle =
    mode === 'previous'
      ? `Last over ${displayOverNumber ?? ''} · ${runTotal} runs`
      : mode === 'waiting'
        ? 'Waiting for first ball'
        : 'Balls this over';

  return (
    <View style={styles.zone}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>

        {deliveries.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {deliveries.map((d, i) => renderBall(d, `strip-${i}`))}
          </ScrollView>
        ) : (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>
              {mode === 'previous'
                ? `Over ${activeOverNumber} — tap a run below to start`
                : 'Tap a run below to bowl'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
  },
  card: {
    borderRadius: wp(3),
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: hp(2),
    paddingHorizontal: wp(3.5),
    ...Platform.select({
      ios: {
        shadowColor: '#070707',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  sectionTitle: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: hp(0.75),
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingVertical: hp(0.2),
  },
  emptyRow: {
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2),
    alignItems: 'center',
    borderRadius: wp(2),
    backgroundColor: colors.surfaceMuted,
  },
  emptyText: {
    fontSize: fontSize(14),
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
});
