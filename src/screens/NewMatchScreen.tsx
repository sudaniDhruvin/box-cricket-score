import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
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
import type { MainStackParamList } from '../navigation/types';
import { useMatchStore } from '../store/useMatchStore';
import { colors } from '../theme/colors';
import { LiveScoringPanel } from '../components/LiveScoringPanel';
import { createLiveMatch } from '../utils/createLiveMatch';
import { fontSize, hp, wp } from '../utils';
import { PNGs } from '../assets/images/pngs';

type Nav = NativeStackNavigationProp<MainStackParamList, 'NewMatch'>;
type NewMatchRoute = RouteProp<MainStackParamList, 'NewMatch'>;
type SetupStep = 'configure' | 'toss';

const OVERS_MIN = 1;
const OVERS_MAX = 50;
const WICKETS_MIN = 1;
const WICKETS_MAX = 20;
const DEFAULT_TEAM_A_NAME = 'Team A';
const DEFAULT_TEAM_B_NAME = 'Team B';

type StepperRowProps = {
  title: string;
  subtitle: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
};

function StepperRow({
  title,
  subtitle,
  value,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
}: StepperRowProps) {
  return (
    <View style={styles.paramRow}>
      <View style={styles.paramLabels}>
        <Text style={styles.paramTitle}>{title}</Text>
        <Text style={styles.paramSub}>{subtitle}</Text>
      </View>
      <View style={styles.stepper}>
        <Pressable
          onPress={onDecrement}
          style={({ pressed }) => [
            styles.stepperBtn,
            pressed && styles.stepperBtnPressed,
          ]}
          android_ripple={{ color: colors.primarySoft, borderless: true }}
          accessibilityRole="button"
          accessibilityLabel={decrementLabel}
        >
          <Text style={styles.stepperBtnText}>{'\u2212'}</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          onPress={onIncrement}
          style={({ pressed }) => [
            styles.stepperBtn,
            pressed && styles.stepperBtnPressed,
          ]}
          android_ripple={{ color: colors.primarySoft, borderless: true }}
          accessibilityRole="button"
          accessibilityLabel={incrementLabel}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function NewMatchScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<NewMatchRoute>();
  const addMatch = useMatchStore(s => s.addMatch);

  const [step, setStep] = useState<SetupStep>('configure');
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [overs, setOvers] = useState(10);
  const [players, setPlayers] = useState(11);
  const [batFirst, setBatFirst] = useState<0 | 1>(0);
  const [error, setError] = useState<string | null>(null);
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(
    () => params.resumeMatchId ?? null,
  );

  const teamALabel = teamA.trim() || DEFAULT_TEAM_A_NAME;
  const teamBLabel = teamB.trim() || DEFAULT_TEAM_B_NAME;

  const validateTeams = useCallback(() => {
    const a = teamA.trim() || DEFAULT_TEAM_A_NAME;
    const b = teamB.trim() || DEFAULT_TEAM_B_NAME;
    if (a.toLowerCase() === b.toLowerCase()) {
      setError('Team names must be different (change one side or both).');
      return false;
    }
    setError(null);
    return true;
  }, [teamA, teamB]);

  const onPressStartToss = useCallback(() => {
    if (!validateTeams()) {
      return;
    }
    setStep('toss');
  }, [validateTeams]);

  const startMatch = useCallback(() => {
    const a = teamA.trim() || DEFAULT_TEAM_A_NAME;
    const b = teamB.trim() || DEFAULT_TEAM_B_NAME;
    if (a.toLowerCase() === b.toLowerCase()) {
      setError('Team names must be different (change one side or both).');
      return;
    }
    if (overs < OVERS_MIN || overs > OVERS_MAX) {
      setError(`Overs must be between ${OVERS_MIN} and ${OVERS_MAX}.`);
      return;
    }
    if (players < WICKETS_MIN || players > WICKETS_MAX) {
      setError(
        `Players per team must be between ${WICKETS_MIN} and ${WICKETS_MAX}.`,
      );
      return;
    }

    setError(null);
    const match = createLiveMatch({
      teamAName: a,
      teamBName: b,
      oversPerSide: overs,
      wicketsPerSide: players,
      batFirst,
    });
    addMatch(match);
    setScoringMatchId(match.id);
  }, [teamA, teamB, overs, players, batFirst, addMatch]);

  if (scoringMatchId) {
    return (
      <LiveScoringPanel
        key={scoringMatchId}
        matchId={scoringMatchId}
        onClose={() => navigation.goBack()}
        onRepeatMatch={setScoringMatchId}
      />
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => {
            if (step === 'toss') {
              setStep('configure');
              setError(null);
              return;
            }
            navigation.goBack();
          }}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            step === 'toss' ? 'Back to match setup' : 'Go back'
          }
        >
          <Image source={PNGs.LEFT_ARROW} style={styles.backArrow} />
          <Text style={styles.backLabel}>
            {step === 'toss' ? 'Setup' : 'Home'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + hp(2)}
      >
        {step === 'configure' ? (
          <>
            <ScrollView
              contentContainerStyle={[
                styles.scroll,
                { paddingBottom: hp(12) + Math.max(insets.bottom, hp(2)) },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.title}>Match Setup</Text>
              <Text style={styles.lead}>
                Configure the teams and match parameters.
              </Text>

              <View style={styles.card}>
                <Text style={styles.teamFieldLabel}>Team A</Text>
                <View style={styles.inputWrap}>
                  <Image
                    source={PNGs.BatBallOutlineIcon}
                    style={{
                      width: wp(5),
                      height: wp(5),
                    }}
                  />
                  <TextInput
                    value={teamA}
                    onChangeText={t => {
                      setTeamA(t);
                      setError(null);
                    }}
                    placeholder="Enter team name"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    autoCorrect={false}
                    autoCapitalize="words"
                    returnKeyType="next"
                    accessibilityLabel="Team A name"
                  />
                </View>

                <View style={styles.vsDivider}>
                  <View style={styles.vsLine} />
                  <Text style={styles.vsText}>vs</Text>
                  <View style={styles.vsLine} />
                </View>

                <Text style={styles.teamFieldLabel}>Team B</Text>
                <View style={styles.inputWrap}>
                  <Image
                    source={PNGs.BatBallOutlineIcon}
                    style={{
                      width: wp(5),
                      height: wp(5),
                    }}
                  />
                  <TextInput
                    value={teamB}
                    onChangeText={t => {
                      setTeamB(t);
                      setError(null);
                    }}
                    placeholder="Enter team name"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    autoCorrect={false}
                    autoCapitalize="words"
                    returnKeyType="done"
                    accessibilityLabel="Team B name"
                  />
                </View>
              </View>

              <View style={styles.card}>
                <StepperRow
                  title="Overs"
                  subtitle="Per innings"
                  value={overs}
                  onDecrement={() => {
                    setOvers(v => Math.max(OVERS_MIN, v - 1));
                    setError(null);
                  }}
                  onIncrement={() => {
                    setOvers(v => Math.min(OVERS_MAX, v + 1));
                    setError(null);
                  }}
                  decrementLabel="Decrease overs"
                  incrementLabel="Increase overs"
                />
                <View style={styles.paramDivider} />
                <StepperRow
                  title="Players"
                  subtitle="Per team"
                  value={players}
                  onDecrement={() => {
                    setPlayers(v => Math.max(WICKETS_MIN, v - 1));
                    setError(null);
                  }}
                  onIncrement={() => {
                    setPlayers(v => Math.min(WICKETS_MAX, v + 1));
                    setError(null);
                  }}
                  decrementLabel="Decrease players"
                  incrementLabel="Increase players"
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>

            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, hp(2)) },
              ]}
            >
              <Pressable
                onPress={onPressStartToss}
                style={({ pressed }) => [
                  styles.cta,
                  pressed && styles.ctaPressed,
                ]}
                android_ripple={{ color: 'rgba(255,255,255,0.22)' }}
                accessibilityRole="button"
                accessibilityLabel="Start Match"
              >
                <Text style={styles.ctaText}>Start Toss</Text>
                <Image source={PNGs.RightArrowIcon} style={{width: wp(4), height: wp(4), tintColor: colors.background}}/>
              </Pressable>
            </View>
          </>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: Math.max(insets.bottom, hp(4)) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Toss</Text>
            <Text style={styles.lead}>
              Who bats first? Pick the team that won the toss.
            </Text>

            <View style={styles.card}>
              <Pressable
                onPress={() => setBatFirst(0)}
                style={({ pressed }) => [
                  styles.tossOption,
                  batFirst === 0 && styles.tossOptionActive,
                  pressed && styles.tossOptionPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: batFirst === 0 }}
              >
                <Text
                  style={[
                    styles.tossOptionTitle,
                    batFirst === 0 && styles.tossOptionTitleActive,
                  ]}
                  numberOfLines={1}
                >
                  {teamALabel}
                </Text>
                <Text style={styles.tossOptionSub}>Bats first</Text>
              </Pressable>

              <View style={styles.paramDivider} />

              <Pressable
                onPress={() => setBatFirst(1)}
                style={({ pressed }) => [
                  styles.tossOption,
                  batFirst === 1 && styles.tossOptionActive,
                  pressed && styles.tossOptionPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: batFirst === 1 }}
              >
                <Text
                  style={[
                    styles.tossOptionTitle,
                    batFirst === 1 && styles.tossOptionTitleActive,
                  ]}
                  numberOfLines={1}
                >
                  {teamBLabel}
                </Text>
                <Text style={styles.tossOptionSub}>Bats first</Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={startMatch}
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.ctaPressed,
              ]}
              android_ripple={{ color: 'rgba(255,255,255,0.22)' }}
              accessibilityRole="button"
              accessibilityLabel="Create match and start scoring"
            >
              <Text style={styles.ctaText}>Start match</Text>
              <Text style={styles.ctaArrow}>{'\u2192'}</Text>
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#070707',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  android: {
    elevation: 3,
  },
  default: {},
});

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
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderRadius: wp(2),
    gap: wp(1),
    alignSelf: 'flex-start',
  },
  backBtnPressed: {
    backgroundColor: colors.primaryFaint,
  },
  backArrow: {
    width: wp(4),
    height: wp(4),
  },
  backLabel: {
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.primary,
    includeFontPadding: false,
  },
  scroll: {
    paddingHorizontal: wp(5),
    paddingTop: hp(1),
  },
  title: {
    fontSize: fontSize(28),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.4,
    marginBottom: hp(0.6),
  },
  lead: {
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: colors.textMuted,
    marginBottom: hp(2.2),
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    marginBottom: hp(2),
    ...cardShadow,
  },
  teamFieldLabel: {
    fontSize: fontSize(14),
    fontWeight: '700',
    color: colors.text,
    marginBottom: hp(0.8),
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    paddingHorizontal: wp(3),
    backgroundColor: colors.background,
    gap: wp(2.5)
  },
  inputIcon: {
    fontSize: fontSize(18),
    color: colors.primary,
    marginRight: wp(2.5),
  },
  input: {
    flex: 1,
    paddingVertical: hp(1.5),
    fontSize: fontSize(16),
    fontWeight: '600',
    color: colors.text,
  },
  vsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: hp(2),
    gap: wp(3),
  },
  vsLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  vsText: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.6),
  },
  paramLabels: {
    flex: 1,
    minWidth: 0,
    marginRight: wp(3),
  },
  paramTitle: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.text,
    marginBottom: hp(0.2),
  },
  paramSub: {
    fontSize: fontSize(13),
    fontWeight: '500',
    color: colors.textMuted,
  },
  paramDivider: {
    height: hp(1.2),
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  stepperBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  stepperBtnPressed: {
    backgroundColor: colors.primaryFaint,
  },
  stepperBtnText: {
    fontSize: fontSize(20),
    fontWeight: '400',
    color: colors.text,
    lineHeight: fontSize(22),
    marginTop: Platform.OS === 'ios' ? -hp(0.15) : 0,
  },
  stepperValue: {
    minWidth: wp(8),
    textAlign: 'center',
    fontSize: fontSize(20),
    fontWeight: '900',
    color: colors.text,
  },
  tossOption: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: wp(3),
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(3.5),
    backgroundColor: colors.background,
  },
  tossOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  tossOptionPressed: {
    opacity: 0.92,
  },
  tossOptionTitle: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.textMuted,
  },
  tossOptionTitleActive: {
    color: colors.text,
  },
  tossOptionSub: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: hp(0.25),
  },
  error: {
    fontSize: fontSize(13),
    fontWeight: '700',
    color: colors.ballWicket,
    marginBottom: hp(1),
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: wp(5),
    paddingTop: hp(1.5),
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: wp(6),
    paddingVertical: hp(1.9),
    paddingHorizontal: wp(4),
    gap: wp(2),
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
  ctaArrow: {
    fontSize: fontSize(20),
    fontWeight: '600',
    color: colors.background,
  },
});
