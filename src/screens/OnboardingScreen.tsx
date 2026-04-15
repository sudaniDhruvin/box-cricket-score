import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';
import { useUserStore } from '../store/useUserStore';

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const completeOnboarding = useUserStore(s => s.completeOnboarding);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, hp(3)) },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>BOX CRICKET</Text>
          </View>
          <Text style={styles.title}>Score every ball.</Text>
          <Text style={styles.titleAccent}>Own the box.</Text>
          <Text style={styles.subtitle}>
            Track runs, wickets, and overs in real time—built for tight indoor
            pitches and fast games.
          </Text>
        </View>

        <View style={styles.illustrationWrap}>
          <View style={styles.pitch}>
            <View style={styles.stump} />
            <View style={styles.stump} />
            <View style={styles.stump} />
          </View>
          <View style={styles.ball} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={completeOnboarding}
          accessibilityRole="button"
          accessibilityLabel="Get started"
        >
          <Text style={styles.ctaLabel}>Get started</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: wp(6),
    paddingTop: hp(4),
  },
  hero: {
    marginBottom: hp(3),
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: wp(2),
    backgroundColor: 'rgba(1, 180, 137, 0.12)',
    marginBottom: hp(2.5),
  },
  badgeText: {
    fontSize: fontSize(11),
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.primary,
  },
  title: {
    fontSize: fontSize(32),
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: fontSize(38),
  },
  titleAccent: {
    fontSize: fontSize(32),
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    lineHeight: fontSize(38),
    marginBottom: hp(1.5),
  },
  subtitle: {
    fontSize: fontSize(16),
    lineHeight: fontSize(22),
    color: colors.textMuted,
    maxWidth: wp(88),
  },
  illustrationWrap: {
    flex: 1,
    minHeight: hp(22),
    marginVertical: hp(2),
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: 'rgba(7, 7, 7, 0.08)',
    backgroundColor: 'rgba(1, 180, 137, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pitch: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: wp(2),
    marginBottom: hp(2),
  },
  stump: {
    width: wp(2.2),
    height: hp(12),
    borderRadius: wp(0.6),
    backgroundColor: colors.text,
    opacity: 0.85,
  },
  ball: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: colors.primary,
  },
  cta: {
    marginTop: hp(1),
    paddingVertical: hp(2),
    borderRadius: wp(3),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaLabel: {
    fontSize: fontSize(17),
    fontWeight: '700',
    color: colors.background,
  },
});
