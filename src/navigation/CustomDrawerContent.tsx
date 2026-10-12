import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import React, { useCallback, useRef, type ReactNode } from 'react';
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
import { checkInAppUpdate } from '../config/checkInAppUpdate';
import { maybeRequestInAppReview } from '../config/requestInAppReview';
import { PNGs } from '../assets/images/pngs';
import { useMatchStore } from '../store/useMatchStore';
import { useUserStore } from '../store/useUserStore';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';
import {
  ChevronRightIcon,
  CloseIcon,
  CricketScorebookIcon,
  CricketTrophyIcon,
  QrScanIcon,
  RefreshIcon,
  ShieldIcon,
  TrashIcon,
} from '../components/ui';

const SPRING = { friction: 5, tension: 380 } as const;

type InteractiveRowProps = {
  label: string;
  hint?: string;
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
};

function InteractiveRow({
  label,
  hint,
  icon,
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
        <View style={styles.iconBadge} accessibilityElementsHidden>
          {icon}
        </View>
        <View style={styles.rowTextCol}>
          <Text style={styles.rowLabel}>{label}</Text>
          {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
        </View>
        <View style={styles.chevronPill} accessibilityElementsHidden>
          <ChevronRightIcon size={wp(4)} color={colors.primary} />
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
        color: colors.primarySoft,
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
          <TrashIcon size={wp(5)} color={colors.primary} />
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
  const resetReviewPromptState = useUserStore(s => s.resetReviewPromptState);

  const goTerms = useCallback(() => {
    navigation.closeDrawer();
    navigation.navigate('Main', { screen: 'Terms' });
  }, [navigation]);

  const goPrivacy = useCallback(() => {
    navigation.closeDrawer();
    navigation.navigate('Main', { screen: 'Privacy' });
  }, [navigation]);

  const goWatchLive = useCallback(() => {
    navigation.closeDrawer();
    navigation.navigate('Main', { screen: 'ScanToWatch' });
  }, [navigation]);

  const onCheckForUpdates = useCallback(() => {
    navigation.closeDrawer();
    checkInAppUpdate({ notifyWhenUpToDate: true });
  }, [navigation]);

  const onRateApp = useCallback(() => {
    navigation.closeDrawer();
    maybeRequestInAppReview({ manual: true });
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
            resetReviewPromptState();
            navigation.closeDrawer();
            navigation.navigate('Main', { screen: 'Home' });
          },
        },
      ],
    );
  }, [clearAllMatches, navigation, resetReviewPromptState, updateUser]);

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
        <Pressable
          style={styles.closeIconWrap}
          onPress={() => navigation.closeDrawer()}
        >
          <CloseIcon size={wp(5)} color={colors.textSecondary} />
        </Pressable>
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
          Watch a game, read about the app, or clear saved scores.
        </Text>
      </View>

      <Text style={styles.sectionHeading}>Legal & privacy</Text>
      <View style={styles.legalCard}>
        <InteractiveRow
          label="Terms & conditions"
          hint="How you may use the app"
          icon={<CricketScorebookIcon size={wp(5)} color={colors.primary} />}
          onPress={goTerms}
          accessibilityLabel="Open terms and conditions"
        />
        <View style={styles.hairline} />
        <InteractiveRow
          label="Privacy policy"
          hint="How we handle your data on device"
          icon={<ShieldIcon size={wp(5)} color={colors.primary} />}
          onPress={goPrivacy}
          accessibilityLabel="Open privacy policy"
        />
      </View>

      <Text style={styles.sectionHeading}>Live match</Text>
      <View style={styles.legalCard}>
        <InteractiveRow
          label="Watch live"
          hint="Scan host QR on the same Wi‑Fi"
          icon={<QrScanIcon size={wp(5)} color={colors.primary} />}
          onPress={goWatchLive}
          accessibilityLabel="Watch a live match by scanning QR"
        />
      </View>

      <Text style={styles.sectionHeading}>App</Text>
      <View style={styles.legalCard}>
        <InteractiveRow
          label="Check for updates"
          hint="See if a newer version is available"
          icon={<RefreshIcon size={wp(5)} color={colors.primary} />}
          onPress={onCheckForUpdates}
          accessibilityLabel="Check for app updates"
        />
        <View style={styles.hairline} />
        <InteractiveRow
          label="Rate this app"
          hint="Share feedback on the app store"
          icon={<CricketTrophyIcon size={wp(5)} color={colors.primary} />}
          onPress={onRateApp}
          accessibilityLabel="Rate this app"
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
  closeIconWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
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
        shadowColor: '#000000',
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
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryFaint,
  },
  dangerIconRing: {
    width: wp(10.5),
    height: wp(10.5),
    borderRadius: wp(5.25),
    borderWidth: 2,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2.5),
  },
  dangerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  dangerTitle: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.primary,
  },
  dangerSub: {
    marginTop: hp(0.35),
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    color: colors.textMuted,
  },
});
