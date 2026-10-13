import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyProfile, getPlayerStatistics, type PlayerProfile } from '../api/client';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

type PlayerStatistics = { available: boolean; data: unknown; message?: string };

export function StatsDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [statistics, setStatistics] = useState<PlayerStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const nextProfile = await getMyProfile();
      setProfile(nextProfile);
      setStatistics(await getPlayerStatistics(nextProfile.username));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load().catch(() => undefined); }, [load]);

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
            <View style={styles.avatar}><Text style={styles.avatarText}>{profile.displayName.slice(0, 1).toUpperCase()}</Text></View>
            <View style={styles.profileText}>
              <Text style={styles.displayName}>{profile.displayName}</Text>
              <Text style={styles.username}>@{profile.username}</Text>
            </View>
          </View>
        ) : null}

        {loading && !profile ? <ActivityIndicator style={styles.spinner} color={colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && statistics ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{statistics.available ? 'Statistics loaded' : 'Player stats are not available yet'}</Text>
            <Text style={styles.emptyBody}>
              {statistics.message ?? 'The current scorecard records team totals and delivery labels, but not which player faced or bowled each delivery. Individual statistics will appear when scorecards include player attribution.'}
            </Text>
          </View>
        ) : null}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Your scorecards</Text>
          <Text style={styles.noteBody}>Quick Mode continues to save match totals on this device. Sign in here to view your profile and connected group features.</Text>
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
  avatar: { width: wp(13), height: wp(13), borderRadius: wp(7), backgroundColor: colors.primaryFaint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontSize: fontSize(20), fontWeight: '900' },
  profileText: { marginLeft: wp(3), flex: 1 },
  displayName: { color: colors.text, fontSize: fontSize(17), fontWeight: '800' },
  username: { marginTop: hp(0.3), color: colors.textMuted, fontSize: fontSize(13) },
  spinner: { marginTop: hp(4) },
  emptyCard: { padding: wp(4.5), borderRadius: wp(3), backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.text, fontSize: fontSize(16), fontWeight: '800' },
  emptyBody: { marginTop: hp(0.8), color: colors.textMuted, fontSize: fontSize(14), lineHeight: fontSize(21) },
  noteCard: { padding: wp(4.5), borderRadius: wp(3), backgroundColor: colors.primary, marginTop: 'auto' },
  noteTitle: { color: colors.background, fontSize: fontSize(16), fontWeight: '800' },
  noteBody: { marginTop: hp(0.7), color: 'rgba(255,255,255,0.78)', fontSize: fontSize(13), lineHeight: fontSize(19) },
  error: { color: colors.live, fontSize: fontSize(14), lineHeight: fontSize(20), fontWeight: '600' },
});
