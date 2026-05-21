import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

export type HomeMatchFilterValue = 'all' | 'live' | 'finished';

export interface HomeMatchFilterProps {
  value: HomeMatchFilterValue;
  onChange: (value: HomeMatchFilterValue) => void;
  counts: { all: number; live: number; finished: number };
}

const OPTIONS: { id: HomeMatchFilterValue; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'finished', label: 'Done' },
];

export function HomeMatchFilter({
  value,
  onChange,
  counts,
}: HomeMatchFilterProps) {
  return (
    <View style={styles.row}>
      {OPTIONS.map(opt => {
        const active = value === opt.id;
        const count = counts[opt.id];
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${opt.label}, ${count} matches`}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt.label}
            </Text>
            <View style={[styles.badge, active && styles.badgeActive]}>
              <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                {count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(1.2),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingVertical: hp(0.65),
    paddingHorizontal: wp(3),
    borderRadius: wp(2.5),
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipText: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.background,
  },
  badge: {
    minWidth: wp(5.5),
    paddingHorizontal: wp(1.2),
    paddingVertical: hp(0.1),
    borderRadius: wp(2),
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeText: {
    fontSize: fontSize(11),
    fontWeight: '900',
    color: colors.textMuted,
  },
  badgeTextActive: {
    color: colors.background,
  },
});
