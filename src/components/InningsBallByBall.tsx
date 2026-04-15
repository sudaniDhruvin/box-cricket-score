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
import type { Delivery, TeamInnings } from '../types/match';
import { getInningsReplay } from '../utils/buildInningsReplay';
import { countsAsLegalBall, tallyDeliveryRuns } from '../utils/deliveryScoring';
import { fontSize, hp, wp } from '../utils';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CHIP = wp(12);

function chipPalette(d: Delivery): { bg: string; fg: string } {
  switch (d.type) {
    case 'dot':
      return { bg: colors.ballDot, fg: colors.ballDotText };
    case 'single':
    case 'two':
    case 'three':
    case 'five':
      return { bg: colors.ballRuns, fg: colors.ballRunsText };
    case 'four':
      return { bg: colors.ballFour, fg: colors.background };
    case 'six':
      return { bg: colors.ballSix, fg: colors.background };
    case 'wicket':
      return { bg: colors.ballWicket, fg: colors.background };
    case 'wide':
      return (d.wideRuns ?? 0) > 0
        ? { bg: colors.ballWideExtra, fg: colors.background }
        : { bg: colors.ballWide, fg: colors.background };
    case 'no-ball':
      return (d.noBallRuns ?? 0) > 0
        ? { bg: colors.ballNoBallRuns, fg: colors.background }
        : { bg: colors.ballNoBall, fg: colors.background };
    case 'bye':
      return { bg: colors.ballBye, fg: colors.background };
    default:
      return { bg: colors.ballDot, fg: colors.ballDotText };
  }
}

function BallChip({ d, index }: { d: Delivery; index: number }) {
  const { bg, fg } = chipPalette(d);
  const compact = d.label.length > 2;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        {
          width: CHIP,
          height: CHIP,
          borderRadius: CHIP / 2,
          backgroundColor: bg,
        },
        pressed && styles.chipPressed,
      ]}
      accessibilityLabel={`Ball ${index + 1}: ${d.label}`}>
      <Text
        style={[
          styles.chipText,
          compact && styles.chipTextCompact,
          { color: fg },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}>
        {d.label}
      </Text>
    </Pressable>
  );
}

interface InningsBallByBallProps {
  innings: TeamInnings;
}

export function InningsBallByBall({ innings }: InningsBallByBallProps) {
  const replay = useMemo(() => getInningsReplay(innings), [innings]);
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
        <LegendDot bg={colors.ballFour} label="4" />
        <LegendDot bg={colors.ballSix} label="6" />
        <LegendDot bg={colors.ballWide} label="Wd" />
        <LegendDot bg={colors.ballWideExtra} label="Wd+" />
        <LegendDot bg={colors.ballNoBall} label="Nb" />
        <LegendDot bg={colors.ballNoBallRuns} label="Nb+" />
        <LegendDot bg={colors.ballWicket} label="W" />
      </View>
      {replay.map(over => {
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
              <Text style={styles.overCaret}>
                {isCollapsed ? '\u25BC' : '\u25B2'}
              </Text>
            </Pressable>
            {!isCollapsed ? (
              <View style={styles.chipsWrap}>
                {over.deliveries.map((d, i) => (
                  <BallChip key={`${over.overNumber}-${i}`} d={d} index={i} />
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

function LegendDot({ bg, label }: { bg: string; label: string }) {
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
    fontSize: fontSize(12),
    color: colors.primary,
    fontWeight: '900',
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
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chipPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.94 }],
  },
  chipText: {
    fontSize: fontSize(13),
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: wp(0.5),
  },
  chipTextCompact: {
    fontSize: fontSize(10),
    fontWeight: '900',
  },
  collapsedHint: {
    fontSize: fontSize(11),
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: wp(3),
    paddingBottom: hp(1),
  },
});
