import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { fontSize, hp, wp } from '../../utils';

type ChoiceRowProps = {
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
};

export function ChoiceRow({ options, value, onChange }: ChoiceRowProps) {
  return (
    <View style={styles.row}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.choice, selected && styles.choiceSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.text, selected && styles.textSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(1.5) },
  choice: {
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.8),
    backgroundColor: colors.background,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  text: { fontSize: fontSize(12), color: colors.textMuted, fontWeight: '600' },
  textSelected: { color: colors.primary, fontWeight: '800' },
});
