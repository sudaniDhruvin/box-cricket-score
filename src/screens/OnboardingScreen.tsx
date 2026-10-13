import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';
import { useUserStore } from '../store/useUserStore';
import { OnboardingNativeAd } from '../components/OnboardingNativeAd';
import { PNGs } from '../assets/images/pngs';
import { CricketScorebookIcon, PrimaryButton } from '../components/ui';

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
            <Text style={styles.badgeText}>BOX CRICKET SCORE</Text>
          </View>
          <Text style={styles.title}>Every ball,</Text>
          <Text style={styles.titleAccent}>on the board.</Text>
          <Text style={styles.subtitle}>
            Set up your sides, score each delivery, and share the game as it happens.
          </Text>
        </View>

        <View style={styles.illustrationWrap}>
          <View style={styles.previewHeader}>
            <View style={styles.previewLabel}>
              <CricketScorebookIcon size={wp(4.5)} color={colors.background} />
              <Text style={styles.previewLabelText}>SCORECARD PREVIEW</Text>
            </View>
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTagText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.previewScoreRow}>
            <View style={styles.previewTeam}>
              <Text style={styles.previewTeamLabel}>YOUR TEAM</Text>
              <Text style={styles.previewScore}>00/00</Text>
              <Text style={styles.previewOvers}>0.0 overs</Text>
            </View>
            <View style={styles.previewDivider}>
              <Image
                source={PNGs.BatBallIcon}
                style={{
                  width: wp(7),
                  height: wp(7),
                  tintColor: colors.accent,
                }}
              />
            </View>
            <View style={[styles.previewTeam, styles.previewTeamRight]}>
              <Text style={styles.previewTeamLabel}>TARGET</Text>
              <Text style={styles.previewScore}>000</Text>
              <Text style={styles.previewOvers}>runs to win</Text>
            </View>
          </View>

          <Text style={styles.previewFooter}>YOUR SCORE, AS IT HAPPENS</Text>
        </View>

        <PrimaryButton
          label="Get started"
          onPress={completeOnboarding}
          style={styles.cta}
        />

        <OnboardingNativeAd />
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
    backgroundColor: colors.primarySoft,
    marginBottom: hp(2.5),
  },
  badgeText: {
    fontSize: fontSize(11),
    fontWeight: '800',
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
    minHeight: hp(24),
    marginVertical: hp(2),
    borderRadius: wp(4),
    backgroundColor: colors.primary,
    paddingHorizontal: wp(5),
    paddingVertical: hp(2.5),
    justifyContent: 'space-between',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  previewLabelText: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 0.9,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.4),
    borderRadius: wp(4),
    paddingHorizontal: wp(2.4),
    paddingVertical: hp(0.55),
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  liveDot: {
    width: wp(1.6),
    height: wp(1.6),
    borderRadius: wp(1),
    backgroundColor: colors.background,
  },
  liveTagText: {
    fontSize: fontSize(9),
    fontWeight: '900',
    letterSpacing: 0.8,
    color: colors.background,
  },
  previewScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: hp(2.5),
  },
  previewTeam: {
    flex: 1,
  },
  previewTeamRight: {
    alignItems: 'flex-end',
  },
  previewTeamLabel: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: 'rgba(255,255,255,0.66)',
    letterSpacing: 0.9,
  },
  previewScore: {
    marginTop: hp(0.6),
    fontSize: fontSize(32),
    lineHeight: fontSize(38),
    fontWeight: '900',
    letterSpacing: -0.7,
    color: colors.background,
  },
  previewOvers: {
    marginTop: hp(0.15),
    fontSize: fontSize(12),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },
  previewDivider: {
    width: wp(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFooter: {
    fontSize: fontSize(9),
    fontWeight: '800',
    color: 'rgba(255,255,255,0.64)',
    letterSpacing: 1,
  },
  cta: {
    marginTop: hp(1),
  },
});
