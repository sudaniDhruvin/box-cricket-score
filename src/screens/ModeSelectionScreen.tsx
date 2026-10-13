import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PNGs } from '../assets/images/pngs';
import type { AppMode } from '../navigation/AppRuntimeContext';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

type Props = { onSelect: (mode: AppMode) => void };

export function ModeSelectionScreen({ onSelect }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + hp(2), paddingBottom: insets.bottom + hp(2) }]}>
      <View style={styles.brand}>
        <Image source={PNGs.LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.eyebrow}>CRICK SHOTS</Text>
        <Text style={styles.title}>Choose your mode</Text>
        <Text style={styles.subtitle}>Choose how you want to use the app. You can switch modes from the menu at any time.</Text>
      </View>

      <View style={styles.options}>
        <Pressable
          style={({ pressed }) => [styles.card, styles.quickCard, pressed && styles.pressed]}
          onPress={() => onSelect('quick')}
          accessibilityRole="button"
          accessibilityLabel="Open Quick Mode. Score matches on this phone with no account."
        >
          <Text style={styles.cardKicker}>NO ACCOUNT NEEDED</Text>
          <Text style={styles.cardTitle}>Quick Mode</Text>
          <Text style={styles.cardBody}>Score a match on this phone. No account needed.</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardAction}>Continue offline</Text>
            <Text style={styles.arrow}>›</Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, styles.statsCard, pressed && styles.pressed]}
          onPress={() => onSelect('stats')}
          accessibilityRole="button"
          accessibilityLabel="Open Stats Mode with Google sign-in, profile, statistics, and groups."
        >
          <Text style={[styles.cardKicker, styles.statsKicker]}>GOOGLE ACCOUNT</Text>
          <Text style={[styles.cardTitle, styles.statsTitle]}>Stats Mode</Text>
          <Text style={[styles.cardBody, styles.statsBody]}>Sign in with Google to open your profile, score history, statistics, and groups.</Text>
          <View style={styles.cardFooter}>
            <Text style={[styles.cardAction, styles.statsAction]}>Continue with Google</Text>
            <Text style={[styles.arrow, styles.statsAction]}>›</Text>
          </View>
        </Pressable>
      </View>
      <Text style={styles.footer}>Your offline matches stay on this device in either mode.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: wp(6), backgroundColor: colors.background, justifyContent: 'space-between' },
  brand: { alignItems: 'center', marginTop: hp(2) },
  logo: { width: wp(22), height: wp(22), marginBottom: hp(1) },
  eyebrow: { color: colors.primary, fontSize: fontSize(11), fontWeight: '900', letterSpacing: 1.7 },
  title: { marginTop: hp(1), color: colors.text, fontSize: fontSize(29), fontWeight: '900', textAlign: 'center' },
  subtitle: { marginTop: hp(0.8), color: colors.textMuted, fontSize: fontSize(14), lineHeight: fontSize(21), textAlign: 'center' },
  options: { gap: hp(1.8), marginVertical: hp(3) },
  card: { minHeight: hp(23), padding: wp(5), borderRadius: wp(4), borderWidth: 1, justifyContent: 'space-between' },
  quickCard: { backgroundColor: colors.surfaceMuted, borderColor: colors.primarySoft },
  statsCard: { backgroundColor: colors.primary, borderColor: colors.primary },
  cardKicker: { color: colors.primary, fontSize: fontSize(10), fontWeight: '900', letterSpacing: 1.1 },
  statsKicker: { color: 'rgba(255,255,255,0.68)' },
  cardTitle: { marginTop: hp(0.7), color: colors.text, fontSize: fontSize(23), fontWeight: '900' },
  statsTitle: { color: colors.background },
  cardBody: { marginTop: hp(0.6), color: colors.textMuted, fontSize: fontSize(14), lineHeight: fontSize(20) },
  statsBody: { color: 'rgba(255,255,255,0.78)' },
  cardFooter: { marginTop: hp(1.5), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardAction: { color: colors.primary, fontSize: fontSize(14), fontWeight: '800' },
  statsAction: { color: colors.background },
  arrow: { color: colors.primary, fontSize: fontSize(27), lineHeight: fontSize(28), fontWeight: '700' },
  footer: { paddingHorizontal: wp(2), color: colors.textMuted, fontSize: fontSize(12), lineHeight: fontSize(18), textAlign: 'center' },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
});
