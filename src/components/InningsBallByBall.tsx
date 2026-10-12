import React, { useCallback, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { Pellet } from './Pellet';
import type { Delivery, TeamInnings } from '../types/match';
import { getPelletStyle } from '../theme/pelletColors';
import { getInningsReplay } from '../utils/buildInningsReplay';
import { countsAsLegalBall, tallyDeliveryRuns } from '../utils/deliveryScoring';
import { fontSize, hp, wp } from '../utils';
import { ChevronRightIcon } from './ui';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CHIP = wp(12);

interface InningsBallByBallProps {
  innings: TeamInnings;
  /** Live viewers see newest overs first so the current over stays on screen. */
  oversOrder?: 'oldestFirst' | 'newestFirst';
}

export function InningsBallByBall({
  innings,
  oversOrder = 'oldestFirst',
}: InningsBallByBallProps) {
  const replay = useMemo(() => getInningsReplay(innings), [innings]);
  const orderedReplay = useMemo(
    () =>
      oversOrder === 'newestFirst' ? [...replay].reverse() : replay,
    [replay, oversOrder],
  );
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const toggleOver = useCallback((overNumber: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed(prev => ({
      ...prev,
      [overNumber]: !prev[overNumber],
    }));
  }, []);

  if (replay.length === 0) {
    return (
      <Text style={styles.emptyReplay}>No ball-by-ball data for this innings.</Text>
    );
  }

  const isGenerated = innings.overReplay === undefined;

  return (
    <View style={styles.wrap}>
      {isGenerated ? (
        <Text style={styles.replayHint}>
          Replay is reconstructed from the scorecard (totals, boundaries, wickets,
          extras).
        </Text>
      ) : null}
      <View style={styles.legendRow}>
        <LegendDot ball={{ type: 'four', label: '4' }} label="4" />
        <LegendDot ball={{ type: 'six', label: '6' }} label="6" />
        <LegendDot ball={{ type: 'wide', label: 'Wd' }} label="Wd" />
        <LegendDot ball={{ type: 'no-ball', label: 'Nb' }} label="Nb" />
        <LegendDot ball={{ type: 'bye', label: 'B' }} label="B" />
        <LegendDot ball={{ type: 'wicket', label: 'W' }} label="W" />
      </View>
      {orderedReplay.map(over => {
        const runs = over.deliveries.reduce((s, d) => s + tallyDeliveryRuns(d), 0);
        const wkts = over.deliveries.filter(d => d.type === 'wicket').length;
        const isCollapsed = collapsed[over.overNumber];
        const legal = over.deliveries.filter(countsAsLegalBall).length;

        return (
          <View key={over.overNumber} style={styles.overCard}>
            <Pressable
              onPress={() => toggleOver(over.overNumber)}
              style={({ pressed }) => [
                styles.overHeader,
                pressed && styles.overHeaderPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isCollapsed
                  ? `Expand over ${over.overNumber}`
                  : `Collapse over ${over.overNumber}`
              }>
              <View style={styles.overHeaderLeft}>
                <Text style={styles.overTitle}>Over {over.overNumber}</Text>
                <Text style={styles.overMeta}>
                  {runs} runs
                  {wkts > 0 ? ` · ${wkts} wkt${wkts === 1 ? '' : 's'}` : ''}
                  {` · ${legal} legal`}
                </Text>
              </View>
              <View
                style={[
                  styles.overCaret,
                  { transform: [{ rotate: isCollapsed ? '90deg' : '-90deg' }] },
                ]}
                accessibilityElementsHidden>
                <ChevronRightIcon size={wp(4)} color={colors.primary} />
              </View>
            </Pressable>
            {!isCollapsed ? (
              <View style={styles.chipsWrap}>
                {over.deliveries.map((d, i) => (
                  <Pellet key={`${over.overNumber}-${i}`} ball={d} size={CHIP} />
                ))}
              </View>
            ) : (
              <Text style={styles.collapsedHint}>
                {over.deliveries.length} deliveries — tap to expand
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function LegendDot({
  ball,
  label,
}: {
  ball: Delivery;
  label: string;
}) {
  const { bg } = getPelletStyle(ball);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: bg }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: hp(1),
    gap: hp(0.8),
  },
  replayHint: {
    fontSize: fontSize(11),
    lineHeight: fontSize(15),
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: hp(0.5),
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(0.6),
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  legendSwatch: {
    width: wp(3.2),
    height: wp(3.2),
    borderRadius: wp(1.6),
  },
  legendLabel: {
    fontSize: fontSize(10),
    fontWeight: '700',
    color: colors.textMuted,
  },
  emptyReplay: {
    fontSize: fontSize(12),
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  overCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(2.5),
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  overHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    backgroundColor: colors.primaryFaint,
  },
  overHeaderPressed: {
    opacity: 0.88,
  },
  overHeaderLeft: {
    flex: 1,
  },
  overTitle: {
    fontSize: fontSize(14),
    fontWeight: '900',
    color: colors.text,
  },
  overMeta: {
    fontSize: fontSize(11),
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: hp(0.2),
  },
  overCaret: {
    marginLeft: wp(2),
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(1.2),
    gap: wp(2.5),
    alignItems: 'center',
  },
  collapsedHint: {
    fontSize: fontSize(11),
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: wp(3),
    paddingBottom: hp(1),
  },
});
