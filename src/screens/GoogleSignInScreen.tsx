import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAuth, getIdToken, GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut } from '@react-native-firebase/auth';
import { PNGs } from '../assets/images/pngs';
import { exchangeFirebaseToken } from '../api/client';
import { setAccessToken } from '../api/session';
import { GOOGLE_WEB_CLIENT_ID } from '../config/googleAuth';
import { useAppRuntime } from '../navigation/AppRuntimeContext';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

export function GoogleSignInScreen() {
  const { setAuthenticated, selectMode } = useAppRuntime();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = GOOGLE_WEB_CLIENT_ID.trim().length > 0;

  useEffect(() => {
    const currentUser = getAuth().currentUser;
    if (!configured || !currentUser) return;
    let active = true;
    setLoading(true);
    getIdToken(currentUser, true)
      .then(exchangeFirebaseToken)
      .then(session => {
        if (!active) return;
        setAccessToken(session.token);
        setAuthenticated(true);
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not restore the Google session.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [configured, setAuthenticated]);

  const signIn = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    setError(null);
    try {
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID.trim() });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const googleResponse = await GoogleSignin.signIn();
      if (googleResponse.type !== 'success') return;
      const googleIdToken = googleResponse.data.idToken;
      if (!googleIdToken) throw new Error('Google did not return an ID token. Check the Web OAuth client ID.');

      const credential = GoogleAuthProvider.credential(googleIdToken);
      const { user } = await signInWithCredential(getAuth(), credential);
      const firebaseIdToken = await getIdToken(user, true);
      const session = await exchangeFirebaseToken(firebaseIdToken);
      setAccessToken(session.token);
      setAuthenticated(true);
    } catch (cause) {
      await firebaseSignOut(getAuth()).catch(() => undefined);
      await GoogleSignin.signOut().catch(() => undefined);
      setError(cause instanceof Error ? cause.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  }, [configured, setAuthenticated]);

  return (
    <View style={styles.root}>
      <Image source={PNGs.LOGO} style={styles.logo} resizeMode="contain" />
      <Text style={styles.eyebrow}>STATS MODE</Text>
      <Text style={styles.title}>Sign in with Google</Text>
      <Text style={styles.subtitle}>Use your Google account to access your cricket profile, statistics, score history, and groups.</Text>

      <Pressable
        onPress={signIn}
        disabled={!configured || loading}
        style={({ pressed }) => [styles.googleButton, (!configured || loading) && styles.disabled, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.googleG}>G</Text>}
        <Text style={styles.googleLabel}>{loading ? 'Connecting…' : 'Continue with Google'}</Text>
      </Pressable>

      {!configured ? (
        <Text style={styles.setupNote}>Add the Web OAuth client ID in `src/config/googleAuth.ts` to enable Google sign-in. The backend must exchange a verified Firebase ID token at `/auth/google`.</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable onPress={() => selectMode(null)} style={styles.backButton} accessibilityRole="button">
        <Text style={styles.backText}>Choose another mode</Text>
      </Pressable>
      <Text style={styles.privacyNote}>Quick Mode remains available offline and does not require an account.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: wp(7), backgroundColor: colors.background },
  logo: { width: wp(20), height: wp(20), marginBottom: hp(1.5) },
  eyebrow: { color: colors.primary, fontSize: fontSize(10), fontWeight: '900', letterSpacing: 1.3 },
  title: { marginTop: hp(1), color: colors.text, fontSize: fontSize(26), fontWeight: '900', textAlign: 'center' },
  subtitle: { marginTop: hp(0.9), maxWidth: wp(82), color: colors.textMuted, fontSize: fontSize(14), lineHeight: fontSize(21), textAlign: 'center' },
  googleButton: { width: '100%', minHeight: hp(6.5), marginTop: hp(3.5), paddingHorizontal: wp(4), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: wp(3), borderRadius: wp(2.5), borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  googleG: { color: '#4285F4', fontSize: fontSize(19), fontWeight: '900' },
  googleLabel: { color: colors.text, fontSize: fontSize(15), fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  setupNote: { marginTop: hp(1.5), padding: wp(3.5), borderRadius: wp(2.5), backgroundColor: colors.surfaceMuted, color: colors.textMuted, fontSize: fontSize(12), lineHeight: fontSize(18) },
  error: { marginTop: hp(1.5), color: colors.live, fontSize: fontSize(13), lineHeight: fontSize(19), textAlign: 'center' },
  backButton: { marginTop: hp(2.5), padding: wp(3) },
  backText: { color: colors.primary, fontSize: fontSize(14), fontWeight: '700' },
  privacyNote: { position: 'absolute', bottom: hp(3), paddingHorizontal: wp(5), color: colors.textMuted, fontSize: fontSize(11), textAlign: 'center' },
});
