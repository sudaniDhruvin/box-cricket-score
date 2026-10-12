import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, ScreenHeader } from '../components/ui';
import type { MainStackParamList } from '../navigation/types';
import { playerName, useGroupStore } from '../store/useGroupStore';
import { useMatchStore } from '../store/useMatchStore';
import { colors } from '../theme/colors';
import { formatPlayedDateLong } from '../utils/cricketFormat';
import {
  buildPlayerProfile,
  formatAverage,
  formatBowlerOvers,
  formatEconomy,
  formatStrikeRate,
  shareProfileText,
} from '../utils/playerProfile';
import { fontSize, hp, wp } from '../utils';

type Nav = NativeStackNavigationProp<MainStackParamList, 'PlayerProfile'>;
type Route = RouteProp<MainStackParamList, 'PlayerProfile'>;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function PlayerProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const group = useGroupStore(s =>
    s.groups.find(item => item.id === params.groupId),
  );
  const matches = useMatchStore(s => s.matches);
  const name = playerName(group?.players, params.playerId);
  const profile = useMemo(
    () => buildPlayerProfile(params.playerId, matches),
    [params.playerId, matches],
  );

  const onShare = () => {
    const message = shareProfileText({
      playerName: name,
      groupName: group?.name ?? 'Group',
      profile,
    });
    Share.share({ message }).catch(() => {
      Alert.alert('Share', 'Could not open the share sheet.');
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader backLabel="Group" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, hp(4)) },
        ]}
      >
        <Text style={styles.kicker}>{group?.name ?? 'Group'}</Text>
        <Text style={styles.name}>{name}</Text>

        <Text style={styles.section}>Overview</Text>
        <View style={styles.statGrid}>
          <Stat label="Matches" value={String(profile.matchCount)} />
          <Stat label="Runs" value={String(profile.runs)} />
          <Stat
            label="HS"
            value={profile.highScore == null ? '–' : String(profile.highScore)}
          />
          <Stat
            label="Avg"
            value={formatAverage(profile.runs, profile.dismissals)}
          />
          <Stat
            label="SR"
            value={formatStrikeRate(profile.runs, profile.balls)}
          />
          <Stat label="4s" value={String(profile.fours)} />
          <Stat label="6s" value={String(profile.sixes)} />
          <Stat label="Wkts" value={String(profile.wickets)} />
          <Stat
            label="Econ"
            value={formatEconomy(profile.runsConceded, profile.ballsBowled)}
          />
        </View>

        <PrimaryButton
          label="Share"
          onPress={onShare}
          accessibilityLabel="Share this player's record"
          style={styles.shareBtn}
        />

        <Text style={styles.section}>Matches</Text>
        {profile.rows.length === 0 ? (
          <Text style={styles.empty}>No recorded innings yet.</Text>
        ) : (
          profile.rows.map(row => (
            <View key={row.matchId} style={styles.matchCard}>
              <Text style={styles.matchTitle}>{row.title}</Text>
              <Text style={styles.matchDate}>
                {formatPlayedDateLong(row.playedAt)}
              </Text>
              <Text style={styles.matchLine}>
                Bat{' '}
                {row.batting.length === 0
                  ? '–'
                  : row.batting
                      .map(
                        (line, index) =>
                          `${row.batting.length > 1 ? `${index + 1}) ` : ''}${
                            line.runs
                          } (${line.balls})${
                            line.dismissal
                              ? ` · ${line.dismissal}`
                              : ' · not out'
                          }`,
                      )
                      .join('   ')}
              </Text>
              <Text style={styles.matchLine}>
                Bowl{' '}
                {row.bowling.length === 0
                  ? '–'
                  : row.bowling
                      .map(
                        (line, index) =>
                          `${row.bowling.length > 1 ? `${index + 1}) ` : ''}${formatBowlerOvers(
                            line.legalBalls,
                          )}-${line.runs}-${line.wickets}`,
                      )
                      .join('   ')}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: wp(5), paddingTop: hp(1) },
  kicker: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  name: {
    marginTop: hp(0.3),
    fontSize: fontSize(28),
    fontWeight: '900',
    color: colors.text,
  },
  section: {
    marginTop: hp(2),
    marginBottom: hp(1),
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  stat: {
    width: '30%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(2),
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    backgroundColor: colors.surfaceMuted,
  },
  statLabel: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  statValue: {
    marginTop: hp(0.2),
    fontSize: fontSize(18),
    fontWeight: '900',
    color: colors.text,
  },
  shareBtn: { marginTop: hp(1.6) },
  empty: {
    fontSize: fontSize(14),
    fontWeight: '600',
    color: colors.textMuted,
  },
  matchCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    padding: wp(3.5),
    marginBottom: hp(1),
  },
  matchTitle: { fontSize: fontSize(15), fontWeight: '800', color: colors.text },
  matchDate: {
    marginTop: hp(0.2),
    marginBottom: hp(0.6),
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
  },
  matchLine: {
    fontSize: fontSize(13),
    fontWeight: '700',
    color: colors.text,
    marginTop: hp(0.15),
  },
});
