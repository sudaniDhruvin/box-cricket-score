import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getAuth, signOut as firebaseSignOut } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyProfile, logoutAccount, updateMyProfile, type PlayerProfile } from '../api/client';
import { syncMatches } from '../api/cloudSync';
import { clearAccessToken, getAccessToken } from '../api/session';
import { ScreenHeader } from '../components/ui';
import { useAppRuntime } from '../navigation/AppRuntimeContext';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

export function AccountScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setAuthenticated, selectMode } = useAppRuntime();
  const [user, setUser] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState('');
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [biography, setBiography] = useState('');
  const [location, setLocation] = useState('');
  const [playingRole, setPlayingRole] = useState('unspecified');
  const [battingStyle, setBattingStyle] = useState('unspecified');
  const [bowlingStyle, setBowlingStyle] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [profilePublic, setProfilePublic] = useState(true);
  const [privacy, setPrivacy] = useState({
    showLocation: true,
    showGroups: false,
    showMatchHistory: true,
    showStatistics: true,
    showDateOfBirth: false,
  });

  const loadProfileFields = useCallback((profile: PlayerProfile) => {
    setUser(profile);
    setProfileUsername(profile.username);
    setProfileDisplayName(profile.displayName);
    setBiography(profile.biography ?? '');
    setLocation(profile.location ?? '');
    setPlayingRole(profile.playingRole);
    setBattingStyle(profile.battingStyle);
    setBowlingStyle(profile.bowlingStyle ?? '');
    setDateOfBirth(profile.dateOfBirth ?? '');
    setProfilePublic(profile.profilePublic);
    setPrivacy(profile.privacy);
  }, []);

  useEffect(() => {
    if (!getAccessToken()) return;
    setLoading(true);
    getMyProfile()
      .then(loadProfileFields)
      .catch(cause => {
        clearAccessToken();
        setUser(null);
        setAuthenticated(false);
        setError(cause instanceof Error ? cause.message : 'Your session has expired. Sign in again with Google.');
      })
      .finally(() => setLoading(false));
  }, [loadProfileFields, setAuthenticated]);

  const saveProfile = useCallback(async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const profile = await updateMyProfile({
        username: profileUsername.trim(),
        displayName: profileDisplayName.trim(),
        biography: biography.trim(),
        location: location.trim(),
        playingRole,
        battingStyle,
        bowlingStyle: bowlingStyle.trim(),
        dateOfBirth: dateOfBirth.trim() || null,
        profilePublic,
        privacy,
      });
      loadProfileFields(profile);
      setMessage('Cricket profile saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your profile.');
    } finally {
      setLoading(false);
    }
  }, [battingStyle, biography, bowlingStyle, dateOfBirth, loadProfileFields, location, playingRole, privacy, profileDisplayName, profilePublic, profileUsername]);

  const sync = useCallback(async () => {
    if (!user) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const result = await syncMatches(user.id);
      setMessage(`${result.uploaded} uploaded · ${result.downloaded} restored · ${result.deleted} removed`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Match sync failed.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const signOut = useCallback(() => {
    Alert.alert('Sign out?', 'Quick Mode will remain available offline.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        onPress: () => {
          logoutAccount().catch(() => undefined);
          clearAccessToken();
          firebaseSignOut(getAuth()).catch(() => undefined);
          GoogleSignin.signOut().catch(() => undefined);
          setUser(null);
          setMessage(null);
          setAuthenticated(false);
        },
      },
    ]);
  }, [setAuthenticated]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Profile"
        backLabel="Matches"
        onBack={() => {
          if (navigation.canGoBack()) navigation.goBack();
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + hp(3) }]} keyboardShouldPersistTaps="handled">
          <View style={styles.apiCard}>
            <Text style={styles.eyebrow}>GOOGLE ACCOUNT</Text>
            <Text style={styles.apiHint}>Stats Mode uses Google sign-in. Quick Mode continues to work without an account or API connection.</Text>
          </View>

          {user ? (
            <View style={styles.card}>
              <Text style={styles.heading}>Cricket profile</Text>
              <Text style={styles.displayName}>{user.displayName}</Text>
              <Text style={styles.secondary}>{user.email} · @{user.username}</Text>
              <TextInput value={profileDisplayName} onChangeText={setProfileDisplayName} placeholder="Display name" placeholderTextColor={colors.textMuted} style={styles.input} maxLength={80} />
              <TextInput value={profileUsername} onChangeText={setProfileUsername} placeholder="Username" placeholderTextColor={colors.textMuted} style={styles.input} autoCapitalize="none" maxLength={30} />
              <TextInput value={biography} onChangeText={setBiography} placeholder="Biography" placeholderTextColor={colors.textMuted} style={[styles.input, styles.multiline]} multiline maxLength={1000} />
              <TextInput value={location} onChangeText={setLocation} placeholder="Location (optional)" placeholderTextColor={colors.textMuted} style={styles.input} maxLength={120} />
              <Text style={styles.inputLabel}>Playing role</Text>
              <View style={styles.choiceRow}>
                {['batter', 'bowler', 'all-rounder', 'wicketkeeper', 'unspecified'].map(value => (
                  <Pressable key={value} onPress={() => setPlayingRole(value)} style={[styles.choice, playingRole === value && styles.choiceSelected]}>
                    <Text style={[styles.choiceText, playingRole === value && styles.choiceTextSelected]}>{value}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.inputLabel}>Batting style</Text>
              <View style={styles.choiceRow}>
                {['right-handed', 'left-handed', 'unspecified'].map(value => (
                  <Pressable key={value} onPress={() => setBattingStyle(value)} style={[styles.choice, battingStyle === value && styles.choiceSelected]}>
                    <Text style={[styles.choiceText, battingStyle === value && styles.choiceTextSelected]}>{value}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput value={bowlingStyle} onChangeText={setBowlingStyle} placeholder="Bowling style (optional)" placeholderTextColor={colors.textMuted} style={styles.input} maxLength={80} />
              <TextInput value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="Date of birth (YYYY-MM-DD, optional)" placeholderTextColor={colors.textMuted} style={styles.input} />
              <View style={styles.switchRow}><Text style={styles.body}>Public profile</Text><Switch value={profilePublic} onValueChange={setProfilePublic} /></View>
              <Text style={styles.inputLabel}>Profile privacy</Text>
              {([
                ['showLocation', 'Show location'],
                ['showGroups', 'Show groups'],
                ['showMatchHistory', 'Show match history'],
                ['showStatistics', 'Show statistics'],
                ['showDateOfBirth', 'Show date of birth'],
              ] as const).map(([key, label]) => (
                <View key={key} style={styles.switchRow}>
                  <Text style={styles.body}>{label}</Text>
                  <Switch value={privacy[key]} onValueChange={value => setPrivacy(current => ({ ...current, [key]: value }))} />
                </View>
              ))}
              <Pressable onPress={saveProfile} disabled={loading} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, loading && styles.disabled]} accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>Save profile</Text>
              </Pressable>
              <Pressable onPress={sync} disabled={loading} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]} accessibilityRole="button">
                {loading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryText}>Sync matches</Text>}
              </Pressable>
              {message ? <Text style={styles.success}>{message}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable onPress={() => selectMode(null)} style={styles.secondaryButton} accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>Change app mode</Text>
              </Pressable>
              <Pressable onPress={signOut} style={styles.secondaryButton} accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>Sign out of Google</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.heading}>Profile unavailable</Text>}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: wp(5), paddingTop: hp(2), gap: hp(1.8) },
  apiCard: { padding: wp(4), borderRadius: wp(3), backgroundColor: colors.primaryFaint, borderWidth: 1, borderColor: colors.primarySoft },
  eyebrow: { fontSize: fontSize(10), fontWeight: '900', letterSpacing: 1, color: colors.primary },
  apiHint: { marginTop: hp(0.7), fontSize: fontSize(12), lineHeight: fontSize(17), color: colors.textMuted },
  card: { padding: wp(5), borderRadius: wp(3), backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  heading: { fontSize: fontSize(22), fontWeight: '800', color: colors.text },
  displayName: { marginTop: hp(1.1), fontSize: fontSize(18), fontWeight: '800', color: colors.primary },
  secondary: { marginTop: hp(0.3), fontSize: fontSize(13), color: colors.textMuted },
  inputLabel: { marginTop: hp(1.2), fontSize: fontSize(13), fontWeight: '700', color: colors.text },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(1.5), marginTop: hp(0.7) },
  choice: { borderRadius: wp(2), borderWidth: 1, borderColor: colors.border, paddingHorizontal: wp(2.5), paddingVertical: hp(0.8), backgroundColor: colors.background },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  choiceText: { fontSize: fontSize(11), color: colors.textMuted },
  choiceTextSelected: { color: colors.primary, fontWeight: '700' },
  switchRow: { minHeight: hp(5), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  multiline: { minHeight: hp(10), paddingTop: hp(1.4), textAlignVertical: 'top' },
  body: { marginTop: hp(1), marginBottom: hp(1), fontSize: fontSize(14), lineHeight: fontSize(20), color: colors.textSecondary },
  input: { minHeight: hp(6.2), marginTop: hp(1), paddingHorizontal: wp(3.5), borderWidth: 1, borderColor: colors.border, borderRadius: wp(2.3), backgroundColor: colors.background, color: colors.text, fontSize: fontSize(15) },
  primaryButton: { minHeight: hp(6.3), marginTop: hp(1.5), borderRadius: wp(2.5), alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  primaryText: { color: colors.background, fontSize: fontSize(16), fontWeight: '800' },
  secondaryButton: { minHeight: hp(5.6), marginTop: hp(1), borderRadius: wp(2.5), borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.text, fontSize: fontSize(14), fontWeight: '700' },
  success: { marginTop: hp(1), color: colors.primary, fontSize: fontSize(14), fontWeight: '700' },
  error: { marginTop: hp(1), color: colors.live, fontSize: fontSize(13), lineHeight: fontSize(18), fontWeight: '600' },
  pressed: { opacity: 0.84 },
  disabled: { opacity: 0.6 },
});
