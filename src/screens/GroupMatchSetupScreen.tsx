import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, ScreenHeader } from '../components/ui';
import type { MainStackParamList } from '../navigation/types';
import { useGroupStore } from '../store/useGroupStore';
import { useMatchStore } from '../store/useMatchStore';
import { colors } from '../theme/colors';
import { createLiveMatch } from '../utils/createLiveMatch';
import { fontSize, hp, wp } from '../utils';

type Nav = NativeStackNavigationProp<MainStackParamList, 'GroupMatchSetup'>;
type Route = RouteProp<MainStackParamList, 'GroupMatchSetup'>;
type Side = 'A' | 'B' | 'W';

const OVERS_MIN = 1;
const OVERS_MAX = 50;

export function GroupMatchSetupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const group = useGroupStore(s => s.groups.find(item => item.id === params.groupId));
  const addMatch = useMatchStore(s => s.addMatch);
  const players = useMemo(
    () => group?.players.filter(player => player.active) ?? [],
    [group],
  );
  const [step, setStep] = useState<'teams' | 'toss'>('teams');
  const [teamAName, setTeamAName] = useState('Team A');
  const [teamBName, setTeamBName] = useState('Team B');
  const [overs, setOvers] = useState(6);
  const [sides, setSides] = useState<Record<string, Side | null>>({});
  const [batFirst, setBatFirst] = useState<0 | 1>(0);

  if (group == null) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader backLabel="Group" onBack={() => navigation.goBack()} />
        <Text style={styles.missing}>This group is no longer on this phone.</Text>
      </View>
    );
  }

  const teamA = players.filter(player => sides[player.id] === 'A');
  const teamB = players.filter(player => sides[player.id] === 'B');
  const wildcard = players.find(player => sides[player.id] === 'W') ?? null;
  const unassigned = players.filter(player => sides[player.id] == null);
  const sideSize = (count: number) => count + (wildcard ? 1 : 0);
  const wickets =
    teamA.length > 0 && teamB.length > 0
      ? Math.min(sideSize(teamA.length), sideSize(teamB.length))
      : 0;
  const teamsReady =
    teamA.length >= 2 &&
    teamB.length >= 2 &&
    teamAName.trim().toLowerCase() !== teamBName.trim().toLowerCase();

  const assign = (playerId: string, side: Side) => {
    setSides(current => {
      const next = { ...current };
      if (current[playerId] === side) {
        next[playerId] = null;
        return next;
      }
      if (side === 'W') {
        for (const id of Object.keys(next)) {
          if (next[id] === 'W') {
            next[id] = null;
          }
        }
      }
      next[playerId] = side;
      return next;
    });
  };

  const startMatch = () => {
    if (!teamsReady) {
      Alert.alert('Teams', 'Put at least 2 players on each side.');
      return;
    }
    const match = createLiveMatch({
      teamAName: teamAName.trim() || 'Team A',
      teamBName: teamBName.trim() || 'Team B',
      oversPerSide: overs,
      wicketsPerSide: wickets,
      batFirst,
      groupId: group.id,
      teamAPlayerIds: teamA.map(player => player.id),
      teamBPlayerIds: teamB.map(player => player.id),
      wildcardPlayerId: wildcard?.id ?? null,
    });
    addMatch(match);
    navigation.replace('NewMatch', { resumeMatchId: match.id });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        backLabel={step === 'toss' ? 'Teams' : 'Group'}
        onBack={() => {
          if (step === 'toss') {
            setStep('teams');
            return;
          }
          navigation.goBack();
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, hp(4)) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'teams' ? (
          <>
            <Text style={styles.title}>Pick sides</Text>
            <Text style={styles.lead}>
              Put each player on A or B. If one extra player plays for both
              teams, mark them W. Tap a letter again to clear it.
            </Text>
            <View style={styles.countRow}>
              <View style={styles.countPill}>
                <Text style={styles.countValue}>{teamA.length}</Text>
                <Text style={styles.countLabel}>Team A</Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countValue}>{teamB.length}</Text>
                <Text style={styles.countLabel}>Team B</Text>
              </View>
              <View style={[styles.countPill, wildcard != null && styles.countPillW]}>
                <Text style={styles.countValue}>{wildcard ? '1' : '0'}</Text>
                <Text style={styles.countLabel}>
                  {wildcard ? wildcard.name : 'W'}
                </Text>
              </View>
            </View>
            {unassigned.length > 0 ? (
              <Text style={styles.wicketNote}>
                {unassigned.length} not picked yet. Each picked side plays with{' '}
                {wildcard ? 'the W player' : 'only its own players'}.
              </Text>
            ) : (
              <Text style={styles.wicketNote}>
                {wildcard
                  ? `${wildcard.name} plays for both sides. `
                  : 'Every player is on a side. '}
                All out after {wickets > 0 ? wickets : '–'} wickets.
              </Text>
            )}
            <TextInput
              value={teamAName}
              onChangeText={setTeamAName}
              style={styles.input}
              placeholder="Team A"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Team A name"
            />
            <TextInput
              value={teamBName}
              onChangeText={setTeamBName}
              style={styles.input}
              placeholder="Team B"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Team B name"
            />
            <View style={styles.oversRow}>
              <Text style={styles.oversLabel}>Overs</Text>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setOvers(value => Math.max(OVERS_MIN, value - 1))}
                  style={styles.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease overs"
                >
                  <Text style={styles.stepBtnText}>{'\u2212'}</Text>
                </Pressable>
                <Text style={styles.oversValue}>{overs}</Text>
                <Pressable
                  onPress={() => setOvers(value => Math.min(OVERS_MAX, value + 1))}
                  style={styles.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Increase overs"
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
            {players.map(player => {
              const side = sides[player.id];
              return (
                <View
                  key={player.id}
                  style={[styles.playerRow, side == null && styles.playerRowIdle]}
                >
                  <Text
                    style={[
                      styles.playerName,
                      side == null && styles.playerNameIdle,
                    ]}
                    numberOfLines={1}
                  >
                    {player.name}
                  </Text>
                  {(['A', 'B', 'W'] as const).map(letter => {
                    const selected = side === letter;
                    return (
                      <Pressable
                        key={letter}
                        onPress={() => assign(player.id, letter)}
                        style={[
                          styles.sideBtn,
                          letter === 'W' && styles.sideBtnW,
                          selected &&
                            (letter === 'W' ? styles.sideBtnWOn : styles.sideBtnOn),
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={
                          letter === 'W'
                            ? `Mark ${player.name} as W for both teams`
                            : `Put ${player.name} on team ${letter}`
                        }
                      >
                        <Text
                          style={[
                            styles.sideBtnText,
                            selected && styles.sideBtnTextOn,
                          ]}
                        >
                          {letter}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
            <PrimaryButton
              label="Toss"
              onPress={() => {
                if (!teamsReady) {
                  Alert.alert(
                    'Teams',
                    'Each side needs at least 2 players, and the team names must differ.',
                  );
                  return;
                }
                setStep('toss');
              }}
              accessibilityLabel="Continue to the toss"
              style={styles.cta}
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>Toss</Text>
            <Text style={styles.lead}>
              Who bats first?
              {wildcard
                ? ` ${wildcard.name} bats for both teams and bowls only when they are not at the crease.`
                : ''}
            </Text>
            {[0, 1].map(side => {
              const label = side === 0 ? teamAName.trim() || 'Team A' : teamBName.trim() || 'Team B';
              const selected = batFirst === side;
              return (
                <Pressable
                  key={side}
                  onPress={() => setBatFirst(side as 0 | 1)}
                  style={[styles.tossOption, selected && styles.tossOptionOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={styles.tossTitle}>{label}</Text>
                  <Text style={styles.tossSub}>Bats first</Text>
                </Pressable>
              );
            })}
            <PrimaryButton
              label="Start match"
              onPress={startMatch}
              accessibilityLabel="Create the match and start scoring"
              style={styles.cta}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: wp(5), paddingTop: hp(1) },
  missing: {
    paddingHorizontal: wp(5),
    color: colors.textMuted,
    fontSize: fontSize(15),
  },
  title: {
    fontSize: fontSize(28),
    fontWeight: '900',
    color: colors.text,
  },
  lead: {
    marginTop: hp(0.5),
    marginBottom: hp(1.6),
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.3),
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.text,
    marginBottom: hp(1),
  },
  oversRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(0.6),
  },
  oversLabel: { fontSize: fontSize(16), fontWeight: '800', color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: wp(3) },
  stepBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: fontSize(20), color: colors.text },
  oversValue: {
    minWidth: wp(8),
    textAlign: 'center',
    fontSize: fontSize(20),
    fontWeight: '900',
    color: colors.text,
  },
  countRow: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(1),
  },
  countPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(2.5),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(2),
    alignItems: 'center',
  },
  countPillW: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  countValue: {
    fontSize: fontSize(16),
    fontWeight: '900',
    color: colors.text,
  },
  countLabel: {
    marginTop: hp(0.15),
    fontSize: fontSize(11),
    fontWeight: '700',
    color: colors.textMuted,
  },
  playerRowIdle: {
    opacity: 0.72,
  },
  playerNameIdle: {
    color: colors.textMuted,
  },
  wicketNote: {
    marginBottom: hp(1.4),
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(0.8),
  },
  playerName: {
    flex: 1,
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.text,
  },
  sideBtn: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnW: {
    borderColor: 'rgba(1, 180, 137, 0.45)',
  },
  sideBtnWOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sideBtnOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sideBtnText: { fontSize: fontSize(16), fontWeight: '900', color: colors.text },
  sideBtnTextOn: { color: colors.background },
  cta: { marginTop: hp(2) },
  tossOption: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: wp(3),
    padding: wp(4),
    marginBottom: hp(1),
  },
  tossOptionOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  tossTitle: { fontSize: fontSize(16), fontWeight: '800', color: colors.text },
  tossSub: {
    marginTop: hp(0.2),
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
  },
});
