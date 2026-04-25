import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useRef, useState } from 'react';
import {
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
import type { MainStackParamList } from '../navigation/types';
import { useMatchStore } from '../store/useMatchStore';
import { colors } from '../theme/colors';
import { LiveScoringPanel } from '../components/LiveScoringPanel';
import { createLiveMatch } from '../utils/createLiveMatch';
import { fontSize, hp, wp } from '../utils';

type Nav = NativeStackNavigationProp<MainStackParamList, 'NewMatch'>;
type NewMatchRoute = RouteProp<MainStackParamList, 'NewMatch'>;

const OVERS_OPTIONS = [6, 8, 10, 12] as const;
const OVERS_MIN = 1;
const OVERS_MAX = 50;
const WICKET_PRESETS = [4, 6, 8, 10, 11] as const;
const WICKETS_MIN = 1;
const WICKETS_MAX = 20;
/** Used when the user leaves a name field empty (inputs stay blank). */
const DEFAULT_TEAM_A_NAME = 'Team A';
const DEFAULT_TEAM_B_NAME = 'Team B';

export function NewMatchScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<NewMatchRoute>();
  const addMatch = useMatchStore(s => s.addMatch);

  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  /** When non-null, overs come from a preset chip. When null, use `customOvers` text. */
  const lastPresetRef = useRef(8);
  const [presetOvers, setPresetOvers] = useState<number | null>(8);
  const [customOvers, setCustomOvers] = useState('');
  const lastWicketPresetRef = useRef(10);
  const [presetWickets, setPresetWickets] = useState<number | null>(10);
  const [customWickets, setCustomWickets] = useState('');
  const [batFirst, setBatFirst] = useState<0 | 1>(0);
  const [error, setError] = useState<string | null>(null);
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(
    () => params.resumeMatchId ?? null,
  );

  const startMatch = useCallback(() => {
    const a = teamA.trim() || DEFAULT_TEAM_A_NAME;
    const b = teamB.trim() || DEFAULT_TEAM_B_NAME;
    if (a.toLowerCase() === b.toLowerCase()) {
      setError('Team names must be different (change one side or both).');
      return;
    }
    let overs: number | null = presetOvers !== null ? presetOvers : null;
    if (overs === null) {
      const raw = customOvers.trim();
      if (raw !== '') {
        const n = parseInt(raw, 10);
        overs = Number.isNaN(n) ? null : n;
      }
    }
    if (overs === null) {
      setError('Pick a preset or enter overs manually.');
      return;
    }
    if (overs < OVERS_MIN || overs > OVERS_MAX) {
      setError(`Overs must be between ${OVERS_MIN} and ${OVERS_MAX}.`);
      return;
    }

    let wickets: number | null = presetWickets !== null ? presetWickets : null;
    if (wickets === null) {
      const wRaw = customWickets.trim();
      if (wRaw !== '') {
        const n = parseInt(wRaw, 10);
        wickets = Number.isNaN(n) ? null : n;
      }
    }
    if (wickets === null) {
      setError('Pick a wickets preset or enter dismissals for all out.');
      return;
    }
    if (wickets < WICKETS_MIN || wickets > WICKETS_MAX) {
      setError(
        `Wickets per innings must be between ${WICKETS_MIN} and ${WICKETS_MAX}.`,
      );
      return;
    }

    setError(null);
    const match = createLiveMatch({
      teamAName: a,
      teamBName: b,
      oversPerSide: overs,
      wicketsPerSide: wickets,
      batFirst,
    });
    addMatch(match);
    setScoringMatchId(match.id);
  }, [
    teamA,
    teamB,
    presetOvers,
    customOvers,
    presetWickets,
    customWickets,
    batFirst,
    addMatch,
  ]);

  const teamALabel = teamA.trim() || DEFAULT_TEAM_A_NAME;
  const teamBLabel = teamB.trim() || DEFAULT_TEAM_B_NAME;

  if (scoringMatchId) {
    return (
      <LiveScoringPanel
        matchId={scoringMatchId}
        onClose={() => navigation.goBack()}
      />
    );
  }

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
          <Text style={styles.backLabel}>Home</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + hp(2)}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Math.max(insets.bottom, hp(4)) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.accent} />
          <Text style={styles.title}>New match</Text>
          <Text style={styles.lead}>
            Optionally name the teams (defaults to Team A / Team B), pick overs
            and how many wickets count as all out (short games often use 4–6),
            then who bats first. After you create the match, scoring opens on
            this screen; tap Home when you are done — the match stays on your
            list.
          </Text>

          <Text style={styles.fieldLabel}>Team A</Text>
          <TextInput
            value={teamA}
            onChangeText={t => {
              setTeamA(t);
              setError(null);
            }}
            placeholder="Optional — e.g. Thunder"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="next"
            accessibilityLabel="Team A name"
          />

          <Text style={styles.fieldLabel}>Team B</Text>
          <TextInput
            value={teamB}
            onChangeText={t => {
              setTeamB(t);
              setError(null);
            }}
            placeholder="Optional — e.g. Strikers"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={startMatch}
            accessibilityLabel="Team B name"
          />

          <Text style={styles.fieldLabel}>Overs per innings</Text>
          <View style={styles.oversRow}>
            {OVERS_OPTIONS.map(n => (
              <Pressable
                key={n}
                onPress={() => {
                  lastPresetRef.current = n;
                  setPresetOvers(n);
                  setCustomOvers('');
                  setError(null);
                }}
                style={({ pressed }) => [
                  styles.oversChip,
                  presetOvers === n && styles.oversChipActive,
                  pressed && styles.oversChipPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: presetOvers === n }}
                accessibilityLabel={`${n} overs`}
              >
                <Text
                  style={[
                    styles.oversChipText,
                    presetOvers === n && styles.oversChipTextActive,
                  ]}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.fieldHint}>Or enter another number</Text>
          <TextInput
            value={customOvers}
            onChangeText={t => {
              const digits = t.replace(/\D/g, '');
              setCustomOvers(digits);
              if (digits.length > 0) {
                setPresetOvers(null);
              } else {
                setPresetOvers(lastPresetRef.current);
              }
              setError(null);
            }}
            placeholder={`${OVERS_MIN}–${OVERS_MAX} (e.g. 15)`}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={2}
            returnKeyType="done"
            onSubmitEditing={startMatch}
            accessibilityLabel="Custom overs per innings"
          />

          <Text style={styles.fieldLabel}>Wickets (all out)</Text>
          <Text style={styles.fieldHintEx}>
            Dismissals before the innings ends — e.g. 4 if only four can bat, or
            10 for a full side.
          </Text>
          <View style={styles.oversRow}>
            {WICKET_PRESETS.map(n => (
              <Pressable
                key={n}
                onPress={() => {
                  lastWicketPresetRef.current = n;
                  setPresetWickets(n);
                  setCustomWickets('');
                  setError(null);
                }}
                style={({ pressed }) => [
                  styles.oversChip,
                  presetWickets === n && styles.oversChipActive,
                  pressed && styles.oversChipPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: presetWickets === n }}
                accessibilityLabel={`${n} wickets`}
              >
                <Text
                  style={[
                    styles.oversChipText,
                    presetWickets === n && styles.oversChipTextActive,
                  ]}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.fieldHint}>Or enter another number</Text>
          <TextInput
            value={customWickets}
            onChangeText={t => {
              const digits = t.replace(/\D/g, '');
              setCustomWickets(digits);
              if (digits.length > 0) {
                setPresetWickets(null);
              } else {
                setPresetWickets(lastWicketPresetRef.current);
              }
              setError(null);
            }}
            placeholder={`${WICKETS_MIN}–${WICKETS_MAX} (e.g. 5)`}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={2}
            returnKeyType="done"
            onSubmitEditing={startMatch}
            accessibilityLabel="Custom wickets for all out"
          />

          <Text style={styles.fieldLabel}>Who bats first?</Text>
          <View style={styles.batRow}>
            <Pressable
              onPress={() => setBatFirst(0)}
              style={({ pressed }) => [
                styles.batOption,
                batFirst === 0 && styles.batOptionActive,
                pressed && styles.batOptionPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: batFirst === 0 }}
            >
              <Text
                style={[
                  styles.batOptionTitle,
                  batFirst === 0 && styles.batOptionTitleActive,
                ]}
                numberOfLines={1}
              >
                {teamALabel}
              </Text>
              <Text style={styles.batOptionSub}>1st innings</Text>
            </Pressable>
            <Pressable
              onPress={() => setBatFirst(1)}
              style={({ pressed }) => [
                styles.batOption,
                batFirst === 1 && styles.batOptionActive,
                pressed && styles.batOptionPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: batFirst === 1 }}
            >
              <Text
                style={[
                  styles.batOptionTitle,
                  batFirst === 1 && styles.batOptionTitleActive,
                ]}
                numberOfLines={1}
              >
                {teamBLabel}
              </Text>
              <Text style={styles.batOptionSub}>1st innings</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={startMatch}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            android_ripple={{ color: 'rgba(255,255,255,0.22)' }}
            accessibilityRole="button"
            accessibilityLabel="Create match and start scoring"
          >
            <Text style={styles.ctaText}>Create match & score</Text>
            <Text style={styles.ctaChevron}>{'\u203A'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
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
    marginBottom: hp(0.8),
  },
  lead: {
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: colors.textMuted,
    marginBottom: hp(2),
  },
  fieldLabel: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: hp(0.5),
  },
  fieldHint: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: hp(0.6),
  },
  fieldHintEx: {
    fontSize: fontSize(12),
    lineHeight: fontSize(18),
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: hp(0.8),
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.4),
    fontSize: fontSize(16),
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: hp(1.5),
  },
  oversRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginBottom: hp(1.8),
  },
  oversChip: {
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    borderRadius: wp(2.5),
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  oversChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  oversChipPressed: {
    opacity: 0.9,
  },
  oversChipText: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.textMuted,
  },
  oversChipTextActive: {
    color: colors.primary,
  },
  batRow: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(1.5),
  },
  batOption: {
    flex: 1,
    minWidth: 0,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2),
    borderRadius: wp(2.5),
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  batOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  batOptionPressed: {
    opacity: 0.92,
  },
  batOptionTitle: {
    fontSize: fontSize(14),
    fontWeight: '800',
    color: colors.textMuted,
  },
  batOptionTitleActive: {
    color: colors.text,
  },
  batOptionSub: {
    fontSize: fontSize(11),
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: hp(0.25),
  },
  error: {
    fontSize: fontSize(13),
    fontWeight: '700',
    color: colors.ballWicket,
    marginBottom: hp(1),
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: wp(3),
    paddingVertical: hp(1.7),
    paddingHorizontal: wp(4),
    marginTop: hp(0.5),
    gap: wp(1),
    ...Platform.select({
      ios: {
        shadowColor: '#070707',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  ctaPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    fontSize: fontSize(17),
    fontWeight: '800',
    color: colors.background,
  },
  ctaChevron: {
    fontSize: fontSize(22),
    fontWeight: '300',
    color: colors.background,
  },
});
