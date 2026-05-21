import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppSheet, AppSheetButton } from './AppSheet';
import { PressableScale } from './PressableScale';
import { colors } from '../theme/colors';
import type { Delivery, OverReplay, TeamInnings } from '../types/match';
import { tallyDeliveryRuns } from '../utils/deliveryScoring';
import { formatOvers } from '../utils/cricketFormat';
import { fontSize, hp, wp } from '../utils';

export interface OverHistorySheetProps {
  visible: boolean;
  onClose: () => void;
  innings: [TeamInnings, TeamInnings];
  initialInningsIndex?: 0 | 1;
  secondInningsAvailable?: boolean;
  renderBall: (d: Delivery, key: string) => React.ReactNode;
}

function overRuns(over: OverReplay): number {
  return over.deliveries.reduce((s, d) => s + tallyDeliveryRuns(d), 0);
}

export function OverHistorySheet({
  visible,
  onClose,
  innings,
  initialInningsIndex = 0,
  secondInningsAvailable = false,
  renderBall,
}: OverHistorySheetProps) {
  const [tab, setTab] = useState<0 | 1>(initialInningsIndex);

  useEffect(() => {
    if (visible) {
      setTab(initialInningsIndex);
    }
  }, [visible, initialInningsIndex]);

  const secondHasData = useMemo(() => {
    const r = innings[1].overReplay ?? [];
    return r.some(o => o.deliveries.length > 0) || innings[1].runs > 0;
  }, [innings]);

  const activeInn = innings[tab];
  const overs = useMemo(() => {
    const list = [...(activeInn.overReplay ?? [])].filter(
      o => o.deliveries.length > 0,
    );
    return list.sort((a, b) => b.overNumber - a.overNumber);
  }, [activeInn.overReplay]);

  const completedCount = overs.length;

  const headerExtra = (
    <>
      <View style={styles.tabs}>
        <TabBtn
          label="1st"
          sub={innings[0].teamName}
          active={tab === 0}
          onPress={() => setTab(0)}
        />
        <TabBtn
          label="2nd"
          sub={innings[1].teamName}
          active={tab === 1}
          onPress={() => setTab(1)}
          disabled={!secondHasData && !secondInningsAvailable}
        />
      </View>
      <View style={styles.summary}>
        <Text style={styles.summaryScore}>
          {activeInn.runs}/{activeInn.wickets}
        </Text>
        <Text style={styles.summaryMeta}>
          {formatOvers(activeInn.overs)} ov
          {completedCount > 0 ? ` · ${completedCount} overs` : ''}
        </Text>
      </View>
    </>
  );

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title="Over history"
      subtitle="Ball-by-ball by innings"
      layout="scroll"
      headerExtra={headerExtra}
      footer={<AppSheetButton label="Done" onPress={onClose} />}
    >
      {overs.length === 0 ? (
        <Text style={styles.empty}>No completed overs in this innings yet.</Text>
      ) : (
        overs.map(over => (
          <View key={`${tab}-${over.overNumber}`} style={styles.overCard}>
            <View style={styles.overCardHead}>
              <Text style={styles.overTitle}>Over {over.overNumber}</Text>
              <Text style={styles.overRuns}>{overRuns(over)} runs</Text>
            </View>
            <View style={styles.chipRow}>
              {over.deliveries.map((d, i) =>
                renderBall(d, `h-${tab}-${over.overNumber}-${i}`),
              )}
            </View>
          </View>
        ))
      )}
    </AppSheet>
  );
}

function TabBtn({
  label,
  sub,
  active,
  onPress,
  disabled,
}: {
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.95}
      haptic={!disabled}
      containerStyle={styles.tabWrap}
      style={[
        styles.tab,
        active && styles.tabActive,
        disabled && styles.tabDisabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !!disabled }}
    >
      <Text style={[styles.tabLbl, active && styles.tabLblActive]}>{label}</Text>
      <Text
        style={[styles.tabSub, active && styles.tabSubActive]}
        numberOfLines={1}
      >
        {sub}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(0.6),
    marginBottom: hp(0.6),
  },
  tabWrap: {
    flex: 1,
  },
  tab: {
    width: '100%',
    paddingVertical: hp(0.75),
    paddingHorizontal: wp(2),
    borderRadius: wp(2.5),
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  tabDisabled: {
    opacity: 0.45,
  },
  tabLbl: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.textMuted,
  },
  tabLblActive: {
    color: colors.background,
  },
  tabSub: {
    fontSize: fontSize(11),
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: hp(0.1),
  },
  tabSubActive: {
    color: 'rgba(255,255,255,0.88)',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: hp(0.4),
    paddingVertical: hp(0.7),
    paddingHorizontal: wp(3),
    borderRadius: wp(2.5),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryScore: {
    fontSize: fontSize(22),
    fontWeight: '900',
    color: colors.text,
  },
  summaryMeta: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.textMuted,
  },
  empty: {
    fontSize: fontSize(14),
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: hp(4),
  },
  overCard: {
    marginBottom: hp(1),
    padding: wp(3),
    borderRadius: wp(2.5),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(0.6),
  },
  overTitle: {
    fontSize: fontSize(14),
    fontWeight: '800',
    color: colors.text,
  },
  overRuns: {
    fontSize: fontSize(13),
    fontWeight: '700',
    color: colors.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
  },
});
