import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getMyProfile,
  getMyStatistics,
  logoutAccount,
  updateMyProfile,
  uploadProfilePhoto,
  type CareerStats as CareerStatsData,
  type PlayerProfile,
} from '../api/client';
import { syncMatches } from '../api/cloudSync';
import { clearAccessToken, getAccessToken } from '../api/session';
import { CareerStats, ChoiceRow, ConfirmSheet, PlayerAvatar, PrimaryButton, AppSheet, showToast } from '../components/ui';
import { useMatchStore } from '../store/useMatchStore';
import { hasExpandedCareer, phoneCareer } from '../utils/playerStats';
import { useAppRuntime } from '../navigation/AppRuntimeContext';
import { photoFile, pickPhoto } from '../social/pickPhoto';
import { BATTING_STYLES, BOWLING_STYLES, PLAYING_ROLES, battingStyleLabel, playingRoleLabel, type PlayingRole } from '../social/labels';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

export function AccountScreen() {
  const insets = useSafeAreaInsets();
  const matches = useMatchStore(state => state.matches);
  const { setAuthenticated, selectMode } = useAppRuntime();
  const [user, setUser] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<CareerStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [biography, setBiography] = useState('');
  const [location, setLocation] = useState('');
  const [playingRole, setPlayingRole] = useState('unspecified');
  const [battingStyle, setBattingStyle] = useState('unspecified');
  const [bowlingStyle, setBowlingStyle] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [profilePublic, setProfilePublic] = useState(true);
  const [photo, setPhoto] = useState<ReturnType<typeof photoFile> | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
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
    setPhoto(null);
    setPhotoUri(null);
  }, []);

  const load = useCallback(async () => {
    if (!getAccessToken()) return;
    setLoading(true);
    setError(null);
    try {
      const profile = await getMyProfile();
      loadProfileFields(profile);
      try {
        const career = await getMyStatistics();
        setStats(career.data);
      } catch {
        setStats(null);
      }
    } catch (cause) {
      clearAccessToken();
      setUser(null);
      setAuthenticated(false);
      const message = cause instanceof Error ? cause.message : 'Please sign in again with Google.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [loadProfileFields, setAuthenticated]);

  useEffect(() => { load().catch(() => undefined); }, [load]);

  const choosePhoto = async () => {
    try {
      const asset = await pickPhoto();
      if (!asset) return;
      setPhoto(photoFile(asset, 'profile.jpg'));
      setPhotoUri(asset.uri ?? null);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not open the photo library.', 'error');
    }
  };

  const saveProfile = useCallback(async () => {
    setLoading(true);
    try {
      let profile = await updateMyProfile({
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
      if (photo) profile = await uploadProfilePhoto(photo);
      loadProfileFields(profile);
      setEditing(false);
      showToast('Profile saved.');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not save your profile.', 'error');
    } finally {
      setLoading(false);
    }
  }, [battingStyle, biography, bowlingStyle, dateOfBirth, loadProfileFields, location, photo, playingRole, privacy, profileDisplayName, profilePublic, profileUsername]);

  const sync = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await syncMatches(user.id);
      showToast(`${result.uploaded} saved · ${result.downloaded} brought back · ${result.deleted} removed`);
      const career = await getMyStatistics();
      setStats(career.data);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not update your matches.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const signOut = useCallback(() => {
    logoutAccount().catch(() => undefined);
    clearAccessToken();
    GoogleSignin.signOut().catch(() => undefined);
    setUser(null);
    setConfirmSignOut(false);
    setAuthenticated(false);
    showToast('Signed out.');
  }, [setAuthenticated]);

  const bowlingOptions = [
    ...BOWLING_STYLES.map(style => ({ value: style, label: style })),
    ...(bowlingStyle && !BOWLING_STYLES.includes(bowlingStyle) ? [{ value: bowlingStyle, label: bowlingStyle }] : []),
    { value: '', label: 'Not set' },
  ];

  const phone = user && !hasExpandedCareer(stats) ? phoneCareer(matches, user.id) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>Profile</Text>
        <View style={styles.editButton} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + hp(3) }]} keyboardShouldPersistTaps="handled">
        {loading && !user ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : null}
        {user ? (
          <>
            <View style={styles.hero}>
              <View style={styles.cover} />
              <View style={styles.heroBody}>
                <View style={styles.avatarRing}>
                  <PlayerAvatar name={user.displayName} photoUrl={user.photoUrl} size={wp(24)} />
                </View>
                <Text style={styles.name}>{user.displayName}</Text>
                <Text style={styles.username}>@{user.username}</Text>
                {user.biography ? <Text style={styles.intro}>{user.biography}</Text> : null}
                <Text style={styles.meta}>
                  {playingRoleLabel(user.playingRole)} · {battingStyleLabel(user.battingStyle)}
                  {user.bowlingStyle ? ` · ${user.bowlingStyle}` : ''}
                </Text>
                {user.location ? <Text style={styles.meta}>{user.location}</Text> : null}
                <View style={styles.actionRow}>
                  <Pressable style={[styles.pill, styles.pillPrimary]} onPress={() => setEditing(true)} accessibilityRole="button">
                    <Text style={styles.pillPrimaryText}>Edit profile</Text>
                  </Pressable>
                  <Pressable style={styles.pill} onPress={sync} disabled={loading} accessibilityRole="button">
                    <Text style={styles.pillText}>{loading ? 'Updating' : 'Update matches'}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
            <View style={styles.card}>
              <CareerStats stats={stats} phone={phone} />
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>About</Text>
              <Text style={styles.detail}>Role · {playingRoleLabel(user.playingRole)}</Text>
              <Text style={styles.detail}>Batting · {battingStyleLabel(user.battingStyle)}</Text>
              <Text style={styles.detail}>Bowling · {user.bowlingStyle || 'Not set'}</Text>
              {user.location ? <Text style={styles.detail}>Location · {user.location}</Text> : null}
              <Text style={styles.detail}>{user.profilePublic ? 'Public profile' : 'Private profile'}</Text>
            </View>
            <View style={styles.card}>
              <Pressable onPress={() => selectMode(null)} accessibilityRole="button" style={styles.linkRow}>
                <Text style={styles.linkText}>Change app mode</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmSignOut(true)} accessibilityRole="button" style={styles.linkRow}>
                <Text style={styles.linkText}>Sign out</Text>
              </Pressable>
            </View>
          </>
        ) : !loading ? (
          <View style={styles.empty}>
            <Text style={styles.name}>Profile unavailable</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        ) : null}
      </ScrollView>

      <AppSheet visible={editing} title="Edit profile" onClose={() => setEditing(false)}>
          <ScrollView style={styles.editScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editContent}>
            <Pressable onPress={choosePhoto} style={styles.photoButton} accessibilityRole="button">
              {photoUri ? <Image source={{ uri: photoUri }} style={styles.editPhoto} /> : <PlayerAvatar name={profileDisplayName || 'Player'} photoUrl={user?.photoUrl} size={wp(16)} />}
              <Text style={styles.editText}>{photoUri ? 'Change photo' : 'Add photo'}</Text>
            </Pressable>
            <TextInput value={profileDisplayName} onChangeText={setProfileDisplayName} placeholder="Name" placeholderTextColor={colors.textMuted} style={styles.input} maxLength={80} />
            <TextInput value={profileUsername} onChangeText={setProfileUsername} placeholder="Username" placeholderTextColor={colors.textMuted} style={styles.input} autoCapitalize="none" maxLength={30} />
            <Text style={styles.fieldLabel}>Preferred role</Text>
            <ChoiceRow options={PLAYING_ROLES} value={PLAYING_ROLES.some(role => role.value === playingRole) ? playingRole : ''} onChange={value => setPlayingRole(value as PlayingRole)} />
            <Text style={styles.fieldLabel}>Batting style</Text>
            <ChoiceRow options={BATTING_STYLES} value={battingStyle} onChange={setBattingStyle} />
            <Text style={styles.fieldLabel}>Bowling style</Text>
            <ChoiceRow options={bowlingOptions} value={bowlingStyle} onChange={setBowlingStyle} />
            <TextInput value={biography} onChangeText={setBiography} placeholder="About you" placeholderTextColor={colors.textMuted} style={[styles.input, styles.multiline]} multiline maxLength={1000} />
            <TextInput value={location} onChangeText={setLocation} placeholder="Location" placeholderTextColor={colors.textMuted} style={styles.input} maxLength={120} />
            <TextInput value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="Date of birth, like 1998-04-12" placeholderTextColor={colors.textMuted} style={styles.input} />
            <View style={styles.switchRow}><Text style={styles.switchLabel}>Public profile</Text><Switch value={profilePublic} onValueChange={setProfilePublic} /></View>
            {([
              ['showLocation', 'Show location'],
              ['showGroups', 'Show groups'],
              ['showMatchHistory', 'Show match history'],
              ['showStatistics', 'Show statistics'],
              ['showDateOfBirth', 'Show date of birth'],
            ] as const).map(([key, label]) => (
              <View key={key} style={styles.switchRow}>
                <Text style={styles.switchLabel}>{label}</Text>
                <Switch value={privacy[key]} onValueChange={value => setPrivacy(current => ({ ...current, [key]: value }))} />
              </View>
            ))}
            <PrimaryButton label={loading ? 'Saving…' : 'Save profile'} onPress={saveProfile} disabled={loading} />
          </ScrollView>
      </AppSheet>

      <ConfirmSheet
        visible={confirmSignOut}
        title="Sign out?"
        body="You can still score matches in Quick Mode."
        confirmLabel="Sign out"
        onConfirm={signOut}
        onClose={() => setConfirmSignOut(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  toolbar: {
    minHeight: hp(5.5),
    paddingHorizontal: wp(5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
  },
  toolbarTitle: { color: colors.text, fontSize: fontSize(18), fontWeight: '800' },
  editButton: { minWidth: wp(16), alignItems: 'flex-end', paddingVertical: hp(1) },
  editText: { color: colors.primary, fontSize: fontSize(14), fontWeight: '800' },
  content: { paddingBottom: hp(2), gap: hp(1) },
  spinner: { marginTop: hp(4) },
  hero: { backgroundColor: colors.background },
  cover: { height: wp(32), backgroundColor: colors.primary },
  heroBody: { marginTop: -wp(10), paddingHorizontal: wp(4), paddingBottom: hp(1.6) },
  avatarRing: {
    borderWidth: 4,
    borderColor: colors.background,
    borderRadius: wp(14),
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
  },
  name: { marginTop: hp(0.8), color: colors.text, fontSize: fontSize(22), fontWeight: '800' },
  username: { color: colors.inkSecondary, fontSize: fontSize(14), marginTop: hp(0.2) },
  intro: { color: colors.text, fontSize: fontSize(14), lineHeight: fontSize(20), marginTop: hp(0.8) },
  meta: { color: colors.inkSecondary, fontSize: fontSize(13), marginTop: hp(0.4) },
  actionRow: { flexDirection: 'row', gap: wp(2), marginTop: hp(1.4) },
  pill: {
    flex: 1,
    minHeight: hp(4.8),
    borderRadius: wp(2),
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(2),
  },
  pillPrimary: { backgroundColor: colors.primary },
  pillText: { color: colors.text, fontSize: fontSize(13), fontWeight: '700' },
  pillPrimaryText: { color: colors.background, fontSize: fontSize(13), fontWeight: '700' },
  card: { backgroundColor: colors.background, paddingHorizontal: wp(4), paddingVertical: hp(1.4), gap: hp(0.7) },
  cardTitle: { color: colors.text, fontSize: fontSize(16), fontWeight: '800' },
  detail: { color: colors.text, fontSize: fontSize(14), lineHeight: fontSize(22) },
  linkRow: { minHeight: hp(5), justifyContent: 'center' },
  linkText: { color: colors.primary, fontSize: fontSize(15), fontWeight: '700' },
  success: { color: colors.primary, fontSize: fontSize(14), fontWeight: '700' },
  error: { color: colors.primary, backgroundColor: colors.primaryFaint, padding: wp(3), borderRadius: wp(2), fontSize: fontSize(13), fontWeight: '600' },
  empty: { padding: wp(4), borderRadius: wp(3), backgroundColor: colors.surfaceMuted },
  editScroll: { maxHeight: hp(62) },
  editContent: { gap: hp(1), paddingBottom: hp(1) },
  photoButton: { alignItems: 'center', gap: hp(0.6) },
  editPhoto: { width: wp(16), height: wp(16), borderRadius: wp(8) },
  fieldLabel: { color: colors.text, fontSize: fontSize(13), fontWeight: '800' },
  input: {
    minHeight: hp(6),
    paddingHorizontal: wp(3.5),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(2.3),
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: fontSize(15),
  },
  multiline: { minHeight: hp(10), paddingTop: hp(1.2), textAlignVertical: 'top' },
  switchRow: { minHeight: hp(5), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { color: colors.text, fontSize: fontSize(14), fontWeight: '600' },
});
