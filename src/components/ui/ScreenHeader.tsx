import React, { type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { PNGs } from '../../assets/images/pngs';
import { colors } from '../../theme/colors';
import { fontSize, hp, wp } from '../../utils';

type ScreenHeaderProps = {
  backLabel?: string;
  onBack: () => void;
  title?: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ScreenHeader({
  backLabel = 'Back',
  onBack,
  title,
  right,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.toolbar, style]}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={backLabel === 'Back' ? 'Go back' : `Back to ${backLabel}`}
      >
        <Image source={PNGs.LEFT_ARROW} style={styles.backArrow} />
        <Text style={styles.backLabel}>{backLabel}</Text>
      </Pressable>
      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.titleSpacer} />
      )}
      <View style={styles.right}>{right ?? <View style={styles.rightPlaceholder} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: hp(5.5),
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderRadius: wp(2),
    gap: wp(1),
    minWidth: wp(22),
  },
  pressed: {
    backgroundColor: colors.primaryFaint,
  },
  backArrow: {
    width: wp(4),
    height: wp(4),
  },
  backLabel: {
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.primary,
    includeFontPadding: false,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: wp(1),
  },
  titleSpacer: {
    flex: 1,
  },
  right: {
    minWidth: wp(22),
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightPlaceholder: {
    width: wp(10),
  },
});
