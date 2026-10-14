import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyProfile, getMyStatistics, type CareerStats as CareerStatsData, type PlayerProfile } from '../api/client';
import { CareerStats, PlayerAvatar, showToast } from '../components/ui';
import { playingRoleLabel } from '../social/labels';
import { useMatchStore } from '../store/useMatchStore';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';
import { hasExpandedCareer, phoneCareer } from '../utils/playerStats';

export function StatsDashboardScreen() {
  const insets = useSafeAreaInsets();
  const matches = useMatchStore(state => state.matches);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [statistics, setStatistics] = useState<CareerStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const nextProfile = await getMyProfile();
      setProfile(nextProfile);
      const career = await getMyStatistics();
      setStatistics(career.data);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load your statistics.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load().catch(() => undefined); }, [load]);

  const phone = profile && !hasExpandedCareer(statistics) ? phoneCareer(matches, profile.id) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + hp(3) }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        <Text style={styles.eyebrow}>STATS MODE</Text>
        <Text style={styles.title}>Your stats</Text>
        {profile ? (
          <View style={styles.profileCard}>
            <PlayerAvatar name={profile.displayName} photoUrl={profile.photoUrl} size={wp(13)} />
            <View style={styles.profileText}>
              <Text style={styles.displayName}>{profile.displayName}</Text>
              <Text style={styles.username}>@{profile.username} · {playingRoleLabel(profile.playingRole)}</Text>
            </View>
          </View>
        ) : null}

        {loading && !profile ? <ActivityIndicator style={styles.spinner} color={colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && (statistics || phone) ? <CareerStats stats={statistics} phone={phone} /> : null}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Your scorecards</Text>
          <Text style={styles.noteBody}>Quick Mode keeps match totals on this phone. Sign in to see your profile and groups.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: wp(5), paddingTop: hp(2.5), gap: hp(1.7) },
  eyebrow: { color: colors.primary, fontSize: fontSize(10), fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: fontSize(29), fontWeight: '900' },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: wp(4), borderRadius: wp(3.5), borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  profileText: { marginLeft: wp(3), flex: 1 },
  displayName: { color: colors.text, fontSize: fontSize(17), fontWeight: '800' },
  username: { marginTop: hp(0.3), color: colors.textMuted, fontSize: fontSize(13) },
  spinner: { marginTop: hp(4) },
  noteCard: { padding: wp(4.5), borderRadius: wp(3), backgroundColor: colors.primary, marginTop: 'auto' },
  noteTitle: { color: colors.background, fontSize: fontSize(16), fontWeight: '800' },
  noteBody: { marginTop: hp(0.7), color: 'rgba(255,255,255,0.78)', fontSize: fontSize(13), lineHeight: fontSize(19) },
  error: { color: colors.live, fontSize: fontSize(14), lineHeight: fontSize(20), fontWeight: '600' },
});
