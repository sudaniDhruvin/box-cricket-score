import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateMyProfile, uploadProfilePhoto, type PlayerProfile } from '../api/client';
import { ChoiceRow, PlayerAvatar, PrimaryButton, showToast } from '../components/ui';
import { photoFile, pickPhoto } from '../social/pickPhoto';
import { BATTING_STYLES, BOWLING_STYLES, PLAYING_ROLES, type PlayingRole } from '../social/labels';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

type CompleteProfileScreenProps = {
  profile: PlayerProfile;
  onComplete: (profile: PlayerProfile) => void;
};

export function CompleteProfileScreen({ profile, onComplete }: CompleteProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [playingRole, setPlayingRole] = useState<PlayingRole | ''>(
    PLAYING_ROLES.some(role => role.value === profile.playingRole) ? profile.playingRole as PlayingRole : '',
  );
  const [battingStyle, setBattingStyle] = useState(profile.battingStyle || 'unspecified');
  const [bowlingStyle, setBowlingStyle] = useState(profile.bowlingStyle ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photo, setPhoto] = useState<ReturnType<typeof photoFile> | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<PlayerProfile | null>(null);

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

  const save = async () => {
    const name = displayName.trim();
    if (name.length < 1) {
      showToast('Add the name other players should see.', 'error');
      return;
    }
    if (!playingRole) {
      showToast('Choose your preferred role.', 'error');
      return;
    }
    setSaving(true);
    try {
      let next = await updateMyProfile({
        displayName: name,
        playingRole,
        battingStyle,
        bowlingStyle: bowlingStyle.trim(),
      });
      if (photo) {
        try {
          next = await uploadProfilePhoto(photo);
        } catch (cause) {
          setSaved(next);
          showToast(cause instanceof Error ? `${cause.message} Your name and role are saved.` : 'Your name and role are saved. Add the photo later from your profile.', 'error');
          return;
        }
      }
      showToast('Profile saved.');
      onComplete(next);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not save your profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + hp(3) }]} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>YOUR PLAYER PROFILE</Text>
          <Text style={styles.title}>How should the group know you?</Text>
          <Text style={styles.subtitle}>Add your name, a photo, and the role you prefer. Batting and bowling style can wait.</Text>

          <Pressable onPress={choosePhoto} style={styles.photoButton} accessibilityRole="button" accessibilityLabel="Add profile photo">
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <PlayerAvatar name={displayName || profile.displayName} photoUrl={profile.photoUrl} size={wp(22)} />
            )}
            <Text style={styles.photoLabel}>{photoUri || profile.photoUrl ? 'Change photo' : 'Add photo'}</Text>
          </Pressable>

          <Text style={styles.label}>Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={80}
          />
          <Text style={styles.username}>@{profile.username}</Text>

          <Text style={styles.label}>Preferred role</Text>
          <ChoiceRow options={PLAYING_ROLES} value={playingRole} onChange={value => setPlayingRole(value as PlayingRole)} />

          <Text style={styles.label}>Batting style</Text>
          <ChoiceRow options={BATTING_STYLES} value={battingStyle} onChange={setBattingStyle} />

          <Text style={styles.label}>Bowling style</Text>
          <ChoiceRow
            options={[...BOWLING_STYLES.map(style => ({ value: style, label: style })), { value: '', label: 'Not set' }]}
            value={bowlingStyle}
            onChange={setBowlingStyle}
          />

          <PrimaryButton
            label={saving ? 'Saving…' : saved ? 'Continue' : 'Save profile'}
            onPress={saved ? () => onComplete(saved) : save}
            disabled={saving}
            trailing={saving ? <ActivityIndicator color={colors.background} /> : undefined}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: wp(5), paddingTop: hp(2.5), gap: hp(1.1) },
  eyebrow: { color: colors.primary, fontSize: fontSize(10), fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: fontSize(26), fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: fontSize(14), lineHeight: fontSize(21) },
  photoButton: { alignItems: 'center', marginTop: hp(1), gap: hp(0.8) },
  photo: { width: wp(22), height: wp(22), borderRadius: wp(11), backgroundColor: colors.primaryFaint },
  photoLabel: { color: colors.primary, fontSize: fontSize(13), fontWeight: '800' },
  label: { marginTop: hp(0.6), color: colors.text, fontSize: fontSize(13), fontWeight: '800' },
  input: {
    minHeight: hp(6.2),
    paddingHorizontal: wp(3.5),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(2.3),
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: fontSize(15),
  },
  username: { color: colors.textMuted, fontSize: fontSize(13), fontWeight: '700' },
  error: { color: colors.primary, backgroundColor: colors.primaryFaint, padding: wp(3), borderRadius: wp(2), fontSize: fontSize(13), fontWeight: '600' },
});
