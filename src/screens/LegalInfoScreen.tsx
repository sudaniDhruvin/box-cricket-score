import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const TERMS_PARAGRAPHS: string[] = [
  'By using Box Cricket on this device, you agree to use the app only for lawful purposes and in line with how it is intended: recording and viewing indoor / box cricket scores stored locally on your device.',
  'The app is provided "as is" without warranties of any kind, to the fullest extent permitted by law. We are not liable for any loss or damage arising from your use of the app, including incorrect or lost score data.',
  'We may update these terms from time to time. Continued use of the app after changes means you accept the updated terms.',
];

const PRIVACY_PARAGRAPHS: string[] = [
  'Box Cricket is designed to work primarily on your device. Match data and preferences you save are stored locally using on-device storage unless you use features that explicitly send data elsewhere.',
  'We do not sell your personal information. If the app does not require an account, we may not collect identifiers such as your name or email through the app itself.',
  "You can remove locally stored data at any time using Clear all data in the app menu. Uninstalling the app may also delete data stored by the app on this device, subject to your operating system's behaviour.",
  'If you have questions about how your data is handled, contact us using the details provided with the app or on our website (if applicable).',
];

function LegalBody({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backChevron}>{'\u2039'}</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, hp(4)) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.accent} />
        <Text style={styles.title}>{title}</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.para}>
            {p}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

export function TermsScreen() {
  return (
    <LegalBody title="Terms & conditions" paragraphs={TERMS_PARAGRAPHS} />
  );
}

export function PrivacyScreen() {
  return <LegalBody title="Privacy policy" paragraphs={PRIVACY_PARAGRAPHS} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderRadius: wp(2),
  },
  backBtnPressed: {
    backgroundColor: colors.primaryFaint,
  },
  backChevron: {
    fontSize: fontSize(28),
    fontWeight: '300',
    color: colors.primary,
    marginRight: wp(0.5),
  },
  backLabel: {
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.primary,
  },
  scroll: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
  },
  accent: {
    width: wp(14),
    height: hp(0.45),
    backgroundColor: colors.primary,
    borderRadius: wp(1),
    marginBottom: hp(2),
  },
  title: {
    fontSize: fontSize(26),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.4,
    marginBottom: hp(2),
  },
  para: {
    fontSize: fontSize(15),
    lineHeight: fontSize(23),
    color: colors.textMuted,
    marginBottom: hp(1.6),
  },
});
