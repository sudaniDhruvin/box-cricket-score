import React, { useCallback, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import type { Delivery, OverReplay } from '../types/match';
import { colors } from '../theme/colors';
import { tallyDeliveryRuns } from '../utils/deliveryScoring';
import { fontSize, hp, wp } from '../utils';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface OverHistoryPanelProps {
  lastOver: OverReplay | null;
  earlierOvers: OverReplay[];
  renderBall: (d: Delivery, key: string) => React.ReactNode;
}

export function OverHistoryPanel({
  lastOver,
  earlierOvers,
  renderBall,
}: OverHistoryPanelProps) {
  const [earlierOpen, setEarlierOpen] = useState(false);

  const toggleEarlier = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEarlierOpen(o => !o);
  }, []);

  if (lastOver == null) {
    return null;
  }

  const lastRuns = lastOver.deliveries.reduce(
    (s, d) => s + tallyDeliveryRuns(d),
    0,
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.lastBlock}>
        <Text style={styles.lastLabel}>
          Last over {lastOver.overNumber} · {lastRuns} runs
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {lastOver.deliveries.map((d, i) =>
            renderBall(d, `last-${lastOver.overNumber}-${i}`),
          )}
        </ScrollView>
      </View>

      {earlierOvers.length > 0 ? (
        <>
          <Pressable
            onPress={toggleEarlier}
            style={({ pressed }) => [
              styles.toggle,
              pressed && styles.togglePressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ expanded: earlierOpen }}
          >
            <Text style={styles.toggleText}>
              Earlier overs ({earlierOvers.length})
            </Text>
            <Text style={styles.caret}>{earlierOpen ? '\u25B2' : '\u25BC'}</Text>
          </Pressable>
          {earlierOpen
            ? earlierOvers.map(o => {
                const r = o.deliveries.reduce(
                  (s, x) => s + tallyDeliveryRuns(x),
                  0,
                );
                return (
                  <View key={o.overNumber} style={styles.earlierLine}>
                    <Text style={styles.earlierLbl}>
                      Over {o.overNumber} · {r} runs
                    </Text>
                    <View style={styles.chipRowWrap}>
                      {o.deliveries.map((d, i) =>
                        renderBall(d, `e-${o.overNumber}-${i}`),
                      )}
                    </View>
                  </View>
                );
              })
            : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: hp(0.5),
  },
  lastBlock: {
    marginBottom: hp(0.8),
  },
  lastLabel: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: hp(0.45),
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: wp(1.5),
    alignItems: 'center',
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(0.7),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2),
    backgroundColor: colors.primaryFaint,
    marginBottom: hp(0.5),
  },
  togglePressed: {
    opacity: 0.9,
  },
  toggleText: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.text,
  },
  caret: {
    fontSize: fontSize(10),
    color: colors.primary,
    fontWeight: '900',
  },
  earlierLine: {
    marginBottom: hp(0.8),
    paddingLeft: wp(1),
  },
  earlierLbl: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: hp(0.3),
  },
});
