import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import React, { useCallback, useRef } from 'react';
import {
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PNGs } from '../assets/images/pngs';
import { useMatchStore } from '../store/useMatchStore';
import { useUserStore } from '../store/useUserStore';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

const SPRING = { friction: 5, tension: 380 } as const;

type InteractiveRowProps = {
  label: string;
  hint?: string;
  iconLetter: string;
  onPress: () => void;
  accessibilityLabel: string;
};

function InteractiveRow({
  label,
  hint,
  iconLetter,
  onPress,
  accessibilityLabel,
}: InteractiveRowProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const runSpring = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      ...SPRING,
    }).start();
  };

  return (
    <Pressable
      onPressIn={() => runSpring(0.97)}
      onPressOut={() => runSpring(1)}
      onPress={onPress}
      style={({ pressed }) =>
        Platform.OS === 'ios' && pressed ? { opacity: 0.88 } : undefined
      }
      android_ripple={
        Platform.OS === 'android'
          ? { color: colors.primarySoft, foreground: true, borderless: false }
          : undefined
      }
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[styles.interactiveRow, { transform: [{ scale }] }]}
        pointerEvents="box-none"
      >
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>{iconLetter}</Text>
        </View>
        <View style={styles.rowTextCol}>
          <Text style={styles.rowLabel}>{label}</Text>
          {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
        </View>
        <View style={styles.chevronPill}>
          <Text style={styles.chevronPillText}>{'\u203A'}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

type DangerActionProps = {
  onPress: () => void;
};

function InteractiveDangerAction({ onPress }: DangerActionProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const runSpring = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      ...SPRING,
    }).start();
  };

  return (
    <Pressable
      onPressIn={() => runSpring(0.98)}
      onPressOut={() => runSpring(1)}
      onPress={onPress}
      style={({ pressed }) =>
        Platform.OS === 'ios' && pressed ? { opacity: 0.9 } : undefined
      }
      android_ripple={{
        color: 'rgba(229, 57, 53, 0.18)',
        foreground: true,
        borderless: false,
      }}
      accessibilityRole="button"
      accessibilityLabel="Clear all data. Shows a confirmation first."
    >
      <Animated.View
        style={[styles.dangerBtnInner, { transform: [{ scale }] }]}
      >
        <View style={styles.dangerIconRing}>
          <Text style={styles.dangerIconText}>{'\u21BB'}</Text>
        </View>
        <View style={styles.dangerTextCol}>
          <Text style={styles.dangerTitle}>Clear all data</Text>
          <Text style={styles.dangerSub}>
            Remove matches & local profile (cannot be undone)
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { navigation } = props;
  const clearAllMatches = useMatchStore(s => s.clearAllMatches);
  const updateUser = useUserStore(s => s.updateUser);

  const goTerms = useCallback(() => {
    navigation.closeDrawer();
    navigation.navigate('Main', { screen: 'Terms' });
  }, [navigation]);

  const goPrivacy = useCallback(() => {
    navigation.closeDrawer();
    navigation.navigate('Main', { screen: 'Privacy' });
  }, [navigation]);

  const onClearAllData = useCallback(() => {
    Alert.alert(
      'Clear all data?',
      'This will delete all saved matches and clear profile data stored in this app on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: () => {
            clearAllMatches();
            updateUser(null);
            navigation.closeDrawer();
            navigation.navigate('Main', { screen: 'Home' });
          },
        },
      ],
    );
  }, [clearAllMatches, navigation, updateUser]);

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Math.max(insets.top, hp(2)),
          paddingBottom: insets.bottom + hp(2),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brandBlock}>
        <View style={styles.logoWrap}>
          <Image
            source={PNGs.LOGO}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Box Cricket app logo"
            accessibilityRole="image"
          />
        </View>
        <Text style={styles.brandKicker}>BOX CRICKET</Text>
        <Text style={styles.brandSub}>
          Open legal information or reset data stored on this device.
        </Text>
      </View>

      <Text style={styles.sectionHeading}>Legal & privacy</Text>
      <View style={styles.legalCard}>
        <InteractiveRow
          label="Terms & conditions"
          hint="How you may use the app"
          iconLetter="T"
          onPress={goTerms}
          accessibilityLabel="Open terms and conditions"
        />
        <View style={styles.hairline} />
        <InteractiveRow
          label="Privacy policy"
          hint="How we handle your data on device"
          iconLetter="P"
          onPress={goPrivacy}
          accessibilityLabel="Open privacy policy"
        />
      </View>

      <Text style={styles.sectionHeading}>Data on this device</Text>
      <View style={styles.dangerBlock}>
        <InteractiveDangerAction onPress={onClearAllData} />
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: wp(5),
  },
  brandBlock: {
    marginBottom: hp(2),
  },
  logoWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  logo: {
    width: wp(38),
    height: hp(12),
  },
  brandKicker: {
    fontSize: fontSize(11),
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.primary,
    marginBottom: hp(0.4),
  },
  brandTitle: {
    fontSize: fontSize(22),
    fontWeight: '800',
    color: colors.text,
  },
  brandSub: {
    marginTop: hp(0.6),
    fontSize: fontSize(13),
    lineHeight: fontSize(19),
    color: colors.textMuted,
    maxWidth: '100%',
  },
  sectionHeading: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: hp(0.8),
  },
  legalCard: {
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: hp(2.2),
    backgroundColor: colors.background,
    ...Platform.select({
      ios: {
        shadowColor: '#070707',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  interactiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: hp(6.2),
    paddingVertical: hp(0.4),
    paddingLeft: wp(2.5),
    paddingRight: wp(2),
    backgroundColor: colors.background,
  },
  iconBadge: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(2.2),
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2.5),
  },
  iconBadgeText: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.primary,
  },
  rowTextCol: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.text,
  },
  rowHint: {
    marginTop: hp(0.2),
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    color: colors.loserMuted,
  },
  chevronPill: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronPillText: {
    fontSize: fontSize(20),
    fontWeight: '300',
    color: colors.primary,
    marginTop: -hp(0.2),
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: wp(15),
    backgroundColor: colors.border,
  },
  dangerBlock: {
    marginBottom: hp(0.5),
  },
  dangerBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: hp(7.2),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3.5),
    borderRadius: wp(2.5),
    borderWidth: 1.5,
    borderColor: 'rgba(229, 57, 53, 0.45)',
    backgroundColor: 'rgba(229, 57, 53, 0.07)',
  },
  dangerIconRing: {
    width: wp(10.5),
    height: wp(10.5),
    borderRadius: wp(5.25),
    borderWidth: 2,
    borderColor: 'rgba(229, 57, 53, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2.5),
  },
  dangerIconText: {
    fontSize: fontSize(18),
    color: colors.ballWicket,
  },
  dangerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  dangerTitle: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.ballWicket,
  },
  dangerSub: {
    marginTop: hp(0.35),
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    color: 'rgba(229, 57, 53, 0.85)',
  },
});
