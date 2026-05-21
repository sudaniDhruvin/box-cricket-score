import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';
import { PNGs } from '../assets/images/pngs';

export interface ScoringToolbarProps {
  onExit: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onHistory: () => void;
  onTeams: () => void;
  onGuide: () => void;
}

export function ScoringToolbar({
  onExit,
  onUndo,
  canUndo,
  onHistory,
  onTeams,
  onGuide,
}: ScoringToolbarProps) {
  return (
    <View style={styles.bar}>
      <PressableScale
        onPress={onExit}
        scaleTo={0.95}
        style={styles.exit}
        accessibilityRole="button"
        accessibilityLabel="Save and exit"
      >
        <Image source={PNGs.LEFT_ARROW} style={styles.arrow} />
        <Text style={styles.exitText}>Exit</Text>
      </PressableScale>
      <View style={styles.actions}>
        <ToolbarBtn label="Undo" onPress={onUndo} disabled={!canUndo} />
        <ToolbarBtn label="History" onPress={onHistory} />
        <ToolbarBtn label="Teams" onPress={onTeams} />
        <ToolbarBtn label="Guide" onPress={onGuide} primary />
      </View>
    </View>
  );
}

function ToolbarBtn({
  label,
  onPress,
  disabled,
  primary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.92}
      haptic={!disabled}
      style={[
        styles.btn,
        primary && styles.btnPrimary,
        disabled && styles.btnDisabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text
        style={[
          styles.btnText,
          primary && styles.btnTextPrimary,
          disabled && styles.btnTextDisabled,
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.55),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: hp(1),
  },
  exit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(1.5),
  },
  arrow: {
    width: wp(4),
    height: wp(4),
  },
  exitText: {
    fontSize: fontSize(15),
    fontWeight: '700',
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(0.8),
  },
  btn: {
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
    borderRadius: wp(2),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnPrimary: {
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primary,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: colors.text,
  },
  btnTextPrimary: {
    color: colors.primary,
  },
  btnTextDisabled: {
    color: colors.textMuted,
  },
});
