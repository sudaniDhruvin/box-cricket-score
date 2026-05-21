import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { PressableScale } from '../components/PressableScale';
import {
  SetupFormStack,
  SetupPageHeader,
  SetupSection,
} from '../components/SetupFormLayout';
import { TossSection, type TossOutcome } from '../components/TossSection';
import { createLiveMatch } from '../utils/createLiveMatch';
import { fontSize, hp, wp } from '../utils';
import { PNGs } from '../assets/images/pngs';

type Nav = NativeStackNavigationProp<MainStackParamList, 'NewMatch'>;
type NewMatchRoute = RouteProp<MainStackParamList, 'NewMatch'>;

const OVERS_OPTIONS = [6, 8, 10, 12] as const;
const OVERS_MIN = 1;
const OVERS_MAX = 50;
const WICKET_PRESETS = [4, 6, 8, 10, 11] as const;
const WICKETS_MIN = 1;
const WICKETS_MAX = 20;
const DEFAULT_TEAM_A_NAME = 'Team A';
const DEFAULT_TEAM_B_NAME = 'Team B';

function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={chipStyles.row}>{children}</View>;
}

function PresetChip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      containerStyle={chipStyles.wrap}
      style={[chipStyles.chip, selected && chipStyles.chipOn]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text
        style={[chipStyles.chipTxt, selected && chipStyles.chipTxtOn]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: wp(1.1),
  },
  wrap: {
    flex: 1,
    minWidth: 0,
  },
  chip: {
    paddingVertical: hp(0.65),
    paddingHorizontal: wp(0.5),
    borderRadius: wp(2),
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    minHeight: hp(4),
    justifyContent: 'center',
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipTxt: {
    fontSize: fontSize(14),
    fontWeight: '800',
    color: colors.textMuted,
  },
  chipTxtOn: {
    color: colors.background,
  },
});

export function NewMatchScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<NewMatchRoute>();
  const addMatch = useMatchStore(s => s.addMatch);

  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const lastPresetRef = useRef(8);
  const [presetOvers, setPresetOvers] = useState<number | null>(8);
  const [customOvers, setCustomOvers] = useState('');
  const lastWicketPresetRef = useRef(10);
  const [presetWickets, setPresetWickets] = useState<number | null>(10);
  const [customWickets, setCustomWickets] = useState('');
  const [batFirst, setBatFirst] = useState<0 | 1>(0);
  const [tossComplete, setTossComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(
    () => params.resumeMatchId ?? null,
  );

  const handleTossOutcome = useCallback((outcome: TossOutcome) => {
    setBatFirst(outcome.winner);
    setTossComplete(true);
    setError(null);
  }, []);

  const handleTossReset = useCallback(() => {
    setTossComplete(false);
  }, []);

  const startMatch = useCallback(() => {
    if (!tossComplete) {
      setError('Flip the coin to complete the toss.');
      return;
    }
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
    tossComplete,
    addMatch,
  ]);

  const teamALabel = teamA.trim() || DEFAULT_TEAM_A_NAME;
  const teamBLabel = teamB.trim() || DEFAULT_TEAM_B_NAME;

  const resolvedOvers = useMemo(() => {
    if (presetOvers !== null) {
      return presetOvers;
    }
    const n = parseInt(customOvers.trim(), 10);
    return Number.isNaN(n) ? null : n;
  }, [presetOvers, customOvers]);

  const resolvedWickets = useMemo(() => {
    if (presetWickets !== null) {
      return presetWickets;
    }
    const n = parseInt(customWickets.trim(), 10);
    return Number.isNaN(n) ? null : n;
  }, [presetWickets, customWickets]);

  const matchPreview = useMemo(() => {
    const bat = batFirst === 0 ? teamALabel : teamBLabel;
    const oversPart =
      resolvedOvers != null ? `${resolvedOvers} ov` : '? ov';
    const wkPart =
      resolvedWickets != null ? `${resolvedWickets} wkts` : '? wkts';
    const tossPart = tossComplete ? '' : ' · Toss pending';
    return `${teamALabel} vs ${teamBLabel} · ${oversPart} · ${wkPart} · ${bat} bats${tossPart}`;
  }, [
    teamALabel,
    teamBLabel,
    resolvedOvers,
    resolvedWickets,
    batFirst,
    tossComplete,
  ]);

  if (scoringMatchId) {
    return (
      <LiveScoringPanel
        matchId={scoringMatchId}
        onClose={() => navigation.goBack()}
      />
    );
  }

  const oversCustomMode = presetOvers === null;
  const wicketsCustomMode = presetWickets === null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        <PressableScale
          onPress={() => navigation.goBack()}
          scaleTo={0.95}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Image source={PNGs.LEFT_ARROW} style={styles.backArrow} />
          <Text style={styles.backLabel}>Home</Text>
        </PressableScale>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: hp(6) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <SetupPageHeader
            title="New match"
            lead="Set teams & format, then flip for the toss."
          />

          <SetupFormStack>
            <SetupSection title="Teams" hint="Optional">
              <TextInput
                value={teamA}
                onChangeText={t => {
                  setTeamA(t);
                  setError(null);
                }}
                placeholder="Team A — e.g. Thunder"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="next"
                accessibilityLabel="Team A name"
              />
              <TextInput
                value={teamB}
                onChangeText={t => {
                  setTeamB(t);
                  setError(null);
                }}
                placeholder="Team B — e.g. Strikers"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.inputLast]}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="done"
                accessibilityLabel="Team B name"
              />
            </SetupSection>

            <SetupSection title="Match format" hint="Per innings">
              <Text style={styles.fieldLbl}>Overs</Text>
              <ChipRow>
                {OVERS_OPTIONS.map(n => (
                  <PresetChip
                    key={n}
                    label={String(n)}
                    selected={presetOvers === n}
                    onPress={() => {
                      lastPresetRef.current = n;
                      setPresetOvers(n);
                      setCustomOvers('');
                      setError(null);
                    }}
                  />
                ))}
                <PresetChip
                  label="Other"
                  selected={oversCustomMode}
                  onPress={() => {
                    setPresetOvers(null);
                    setError(null);
                  }}
                />
              </ChipRow>
              {oversCustomMode ? (
                <TextInput
                  value={customOvers}
                  onChangeText={t => {
                    const digits = t.replace(/\D/g, '');
                    setCustomOvers(digits);
                    if (digits.length === 0) {
                      setPresetOvers(lastPresetRef.current);
                    }
                    setError(null);
                  }}
                  placeholder={`${OVERS_MIN}–${OVERS_MAX}`}
                  placeholderTextColor={colors.textMuted}
                  style={styles.customInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  accessibilityLabel="Custom overs"
                />
              ) : null}

              <Text style={[styles.fieldLbl, styles.fieldLblSpaced]}>
                Wickets (all out)
              </Text>
              <ChipRow>
                {WICKET_PRESETS.map(n => (
                  <PresetChip
                    key={n}
                    label={String(n)}
                    selected={presetWickets === n}
                    onPress={() => {
                      lastWicketPresetRef.current = n;
                      setPresetWickets(n);
                      setCustomWickets('');
                      setError(null);
                    }}
                  />
                ))}
                <PresetChip
                  label="Other"
                  selected={wicketsCustomMode}
                  onPress={() => {
                    setPresetWickets(null);
                    setError(null);
                  }}
                />
              </ChipRow>
              {wicketsCustomMode ? (
                <TextInput
                  value={customWickets}
                  onChangeText={t => {
                    const digits = t.replace(/\D/g, '');
                    setCustomWickets(digits);
                    if (digits.length === 0) {
                      setPresetWickets(lastWicketPresetRef.current);
                    }
                    setError(null);
                  }}
                  placeholder={`${WICKETS_MIN}–${WICKETS_MAX}`}
                  placeholderTextColor={colors.textMuted}
                  style={styles.customInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  accessibilityLabel="Custom wickets"
                />
              ) : null}
            </SetupSection>

            <TossSection
              teamAName={teamALabel}
              teamBName={teamBLabel}
              onOutcome={handleTossOutcome}
              onReset={handleTossReset}
            />
          </SetupFormStack>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, hp(0.85)) },
          ]}
          pointerEvents="box-none"
        >
          <Text style={styles.preview} numberOfLines={2}>
            <Text style={styles.previewTag}>Preview · </Text>
            {matchPreview}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PressableScale
            onPress={startMatch}
            scaleTo={0.97}
            containerStyle={styles.ctaWrap}
            style={[
              styles.cta,
              !tossComplete && styles.ctaPending,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create match and start scoring"
          >
            <Text style={styles.ctaText}>Create match & score</Text>
            <Text style={styles.ctaChevron}>{'\u203A'}</Text>
          </PressableScale>
        </View>
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
    paddingVertical: hp(0.3),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.55),
    paddingHorizontal: wp(2),
    gap: wp(1),
  },
  backArrow: {
    width: wp(4),
    height: wp(4),
  },
  backLabel: {
    fontSize: fontSize(15),
    fontWeight: '700',
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: wp(4),
    paddingTop: hp(0.75),
    paddingBottom: hp(0.75),
  },
  fieldLbl: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: hp(0.4),
  },
  fieldLblSpaced: {
    marginTop: hp(0.65),
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.75),
    fontSize: fontSize(15),
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: hp(0.5),
  },
  inputLast: {
    marginBottom: 0,
  },
  customInput: {
    marginTop: hp(0.45),
    borderWidth: 1,
    borderColor: colors.primarySoft,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    fontSize: fontSize(15),
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.background,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: wp(4),
    paddingTop: hp(0.65),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  preview: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.text,
    lineHeight: fontSize(17),
    marginBottom: hp(0.45),
  },
  previewTag: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: colors.primary,
  },
  error: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.ballWicket,
    marginBottom: hp(0.4),
  },
  ctaWrap: {
    width: '100%',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: wp(2.5),
    paddingVertical: hp(1.25),
    gap: wp(1),
    ...Platform.select({
      ios: {
        shadowColor: '#070707',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  ctaPending: {
    opacity: 0.88,
  },
  ctaText: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.background,
  },
  ctaChevron: {
    fontSize: fontSize(20),
    fontWeight: '300',
    color: colors.background,
  },
});
