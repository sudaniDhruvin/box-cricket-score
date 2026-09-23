import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { fontSize, hp, wp } from '../../utils';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  trailing?: ReactNode;
  variant?: 'filled' | 'outline';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  accessibilityLabel,
  trailing,
  variant = 'filled',
  style,
  disabled = false,
}: PrimaryButtonProps) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        outline ? styles.outline : styles.filled,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      android_ripple={{
        color: outline ? colors.primarySoft : 'rgba(255, 255, 255, 0.22)',
        foreground: true,
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.label, outline && styles.labelOutline]}>{label}</Text>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(4),
    borderRadius: wp(2.5),
    minHeight: hp(5.6),
  },
  filled: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.background,
  },
  labelOutline: {
    color: colors.primary,
  },
});
