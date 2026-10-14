import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState, type ReactNode } from 'react';
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
import { StickyBottomBannerAd } from '../components/StickyBottomBannerAd';
import { PNGs } from '../assets/images/pngs';
import {
  ChoiceRow,
  CricketScorebookIcon,
  CricketStumpsIcon,
  ScreenHeader,
  showToast,
} from '../components/ui';
import { useAdFlags } from '../hooks/useAdFlags';
import { createLiveMatch } from '../utils/createLiveMatch';
import { fontSize, hp, wp } from '../utils';

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
  icon?: ReactNode;
  title: string;
  subtitle: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
};

function StepperRow({
  icon,
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
      {icon ? <View style={styles.paramIcon}>{icon}</View> : null}
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
  const { isBanner, isAds } = useAdFlags();
  const showBanner = isAds && isBanner;
  const [bottomBannerVisible, setBottomBannerVisible] = useState(false);

  const [step, setStep] = useState<SetupStep>(() => params.groupLaunch ? 'toss' : 'configure');
  const [teamA, setTeamA] = useState(params.groupLaunch?.teams[0] ?? '');
  const [teamB, setTeamB] = useState(params.groupLaunch?.teams[1] ?? '');
  const [overs, setOvers] = useState(params.groupLaunch?.oversPerSide ?? 10);
  const [players, setPlayers] = useState(params.groupLaunch?.teamSize ?? 11);
  const [batFirst, setBatFirst] = useState<0 | 1>(0);
  const [tossWinner, setTossWinner] = useState<0 | 1>(0);
  const [elected, setElected] = useState<'bat' | 'bowl'>('bat');
  const [skipToss, setSkipToss] = useState(false);
  const groupSquads = params.groupLaunch?.squads;
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(
    () => params.resumeMatchId ?? null,
  );

  const teamALabel = teamA.trim() || DEFAULT_TEAM_A_NAME;
  const teamBLabel = teamB.trim() || DEFAULT_TEAM_B_NAME;

  const validateTeams = useCallback(() => {
    const a = teamA.trim() || DEFAULT_TEAM_A_NAME;
    const b = teamB.trim() || DEFAULT_TEAM_B_NAME;
    if (a.toLowerCase() === b.toLowerCase()) {
      showToast('Team names must be different (change one side or both).', 'error');
      return false;
    }
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
      showToast('Team names must be different (change one side or both).', 'error');
      return;
    }
    if (overs < OVERS_MIN || overs > OVERS_MAX) {
      showToast(`Overs must be between ${OVERS_MIN} and ${OVERS_MAX}.`, 'error');
      return;
    }
    if (players < WICKETS_MIN || players > WICKETS_MAX) {
      showToast(`Players per team must be between ${WICKETS_MIN} and ${WICKETS_MAX}.`, 'error');
      return;
    }

    const launch = params.groupLaunch;
    const recordToss = Boolean(launch?.squads) && !skipToss;
    const match = createLiveMatch({
      id: launch?.clientId,
      groupId: launch?.groupId,
      teamAName: a,
      teamBName: b,
      oversPerSide: overs,
      wicketsPerSide: players,
      batFirst: recordToss ? undefined : batFirst,
      toss: recordToss ? { winnerSide: tossWinner, elected } : undefined,
      squads: launch?.squads,
      scorerUserId: launch?.scorerUserId,
      playedAt: launch?.scheduledAt,
    });
    addMatch(match);
    showToast('Match started.');
    setScoringMatchId(match.id);
  }, [teamA, teamB, overs, players, batFirst, tossWinner, elected, skipToss, addMatch, params.groupLaunch]);

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
      <ScreenHeader
        title={step === 'toss' ? (groupSquads ? 'Toss' : 'First innings') : 'New match'}
        backLabel={step === 'toss' ? (groupSquads ? 'Group' : 'Setup') : 'Home'}
        onBack={() => {
          if (step === 'toss') {
            if (groupSquads) {
              navigation.goBack();
              return;
            }
            setStep('configure');
            return;
          }
          navigation.goBack();
        }}
      />

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
              <Text style={styles.eyebrow}>SET UP A GAME</Text>
              <Text style={styles.title}>Match setup</Text>
              <Text style={styles.lead}>
                Add both teams, then choose the overs and squad size.
              </Text>

              <View style={styles.card}>
                <Text style={styles.teamFieldLabel}>TEAM A</Text>
                <View style={styles.inputWrap}>
                  <Image
                    source={PNGs.BatBallOutlineIcon}
                    style={{
                      width: wp(5),
                      height: wp(5),
                      tintColor: colors.primary,
                    }}
                  />
                  <TextInput
                    value={teamA}
                    onChangeText={setTeamA}
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

                <Text style={styles.teamFieldLabel}>TEAM B</Text>
                <View style={styles.inputWrap}>
                  <Image
                    source={PNGs.BatBallOutlineIcon}
                    style={{
                      width: wp(5),
                      height: wp(5),
                      tintColor: colors.primary,
                    }}
                  />
                  <TextInput
                    value={teamB}
                    onChangeText={setTeamB}
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
                  // icon={
                  //   <CricketScorebookIcon
                  //     size={wp(5)}
                  //     color={colors.primary}
                  //   />
                  // }
                  title="Overs"
                  subtitle="Per innings"
                  value={overs}
                  onDecrement={() => setOvers(v => Math.max(OVERS_MIN, v - 1))}
                  onIncrement={() => setOvers(v => Math.min(OVERS_MAX, v + 1))}
                  decrementLabel="Decrease overs"
                  incrementLabel="Increase overs"
                />
                <View style={styles.paramDivider} />
                <StepperRow
                  // icon={
                  //   <CricketStumpsIcon
                  //     size={wp(5)}
                  //     color={colors.primary}
                  //   />
                  // }
                  title="Players"
                  subtitle="Per team"
                  value={players}
                  onDecrement={() => setPlayers(v => Math.max(WICKETS_MIN, v - 1))}
                  onIncrement={() => setPlayers(v => Math.min(WICKETS_MAX, v + 1))}
                  decrementLabel="Decrease players"
                  incrementLabel="Increase players"
                />
              </View>

            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  paddingBottom: bottomBannerVisible
                    ? hp(1.2)
                    : Math.max(insets.bottom, hp(2)),
                },
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
                accessibilityLabel="Choose who bats first"
              >
                <Text style={styles.ctaText}>Choose who bats first</Text>
                <Image
                  source={PNGs.RightArrowIcon}
                  style={{
                    width: wp(4),
                    height: wp(4),
                    tintColor: colors.background,
                  }}
                />
              </Pressable>
            </View>
          </>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              {
                paddingBottom: bottomBannerVisible
                  ? hp(2)
                  : Math.max(insets.bottom, hp(4)),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.eyebrow}>{groupSquads && !skipToss ? 'TOSS' : 'MATCH ORDER'}</Text>
            <Text style={styles.title}>{groupSquads && !skipToss ? 'Who won the toss?' : 'Who bats first?'}</Text>
            <Text style={styles.lead}>
              {groupSquads && !skipToss
                ? 'Record who won and whether they bat or bowl. You can skip this.'
                : 'Choose which team starts at the crease.'}
            </Text>

            {groupSquads && !skipToss ? (
              <View style={styles.card}>
                <Pressable
                  onPress={() => setTossWinner(0)}
                  style={({ pressed }) => [styles.tossOption, tossWinner === 0 && styles.tossOptionActive, pressed && styles.tossOptionPressed]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: tossWinner === 0 }}
                >
                  <Text style={[styles.tossOptionTitle, tossWinner === 0 && styles.tossOptionTitleActive]} numberOfLines={1}>{teamALabel}</Text>
                  <Text style={styles.tossOptionSub}>Won the toss</Text>
                </Pressable>
                <View style={styles.paramDivider} />
                <Pressable
                  onPress={() => setTossWinner(1)}
                  style={({ pressed }) => [styles.tossOption, tossWinner === 1 && styles.tossOptionActive, pressed && styles.tossOptionPressed]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: tossWinner === 1 }}
                >
                  <Text style={[styles.tossOptionTitle, tossWinner === 1 && styles.tossOptionTitleActive]} numberOfLines={1}>{teamBLabel}</Text>
                  <Text style={styles.tossOptionSub}>Won the toss</Text>
                </Pressable>
                <View style={styles.paramDivider} />
                <Text style={styles.teamFieldLabel}>THEY CHOSE TO</Text>
                <ChoiceRow
                  options={[{ value: 'bat', label: 'Bat' }, { value: 'bowl', label: 'Bowl' }]}
                  value={elected}
                  onChange={value => setElected(value === 'bowl' ? 'bowl' : 'bat')}
                />
                <Pressable onPress={() => setSkipToss(true)} accessibilityRole="button">
                  <Text style={styles.skipLink}>Skip toss</Text>
                </Pressable>
              </View>
            ) : null}

            {groupSquads && !skipToss ? null : <View style={styles.card}>
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
            </View>}

            {groupSquads && skipToss ? (
              <Pressable onPress={() => setSkipToss(false)} accessibilityRole="button">
                <Text style={styles.skipLink}>Record the toss</Text>
              </Pressable>
            ) : null}

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
              <Text style={styles.ctaText}>{groupSquads ? 'Start scoring' : 'Start match'}</Text>
              <Image
                source={PNGs.RightArrowIcon}
                style={{
                  width: wp(4),
                  height: wp(4),
                  tintColor: colors.background,
                }}
              />
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      {showBanner ? (
        <View
          style={
            bottomBannerVisible
              ? [styles.bannerStrip, { paddingBottom: insets.bottom }]
              : undefined
          }>
          <StickyBottomBannerAd onVisibilityChange={setBottomBannerVisible} />
        </View>
      ) : null}
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000000',
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
  scroll: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
  },
  eyebrow: {
    fontSize: fontSize(11),
    fontWeight: '800',
    letterSpacing: 1.3,
    color: colors.accent,
    marginBottom: hp(0.7),
  },
  title: {
    fontSize: fontSize(30),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.4,
    marginBottom: hp(0.5),
  },
  lead: {
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: colors.textMuted,
    marginBottom: hp(2.2),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: wp(4),
    paddingVertical: hp(2.2),
    marginBottom: hp(2),
    ...cardShadow,
  },
  teamFieldLabel: {
    fontSize: fontSize(11),
    fontWeight: '800',
    letterSpacing: 0.9,
    color: colors.textMuted,
    marginBottom: hp(0.7),
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primarySoft,
    borderRadius: wp(3),
    paddingHorizontal: wp(3),
    backgroundColor: colors.surface,
    gap: wp(2.5),
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
    paddingVertical: hp(0.7),
  },
  paramIcon: {
    width: wp(10),
    height: wp(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: wp(2.5),
    backgroundColor: colors.primaryFaint,
    marginRight: wp(3),
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
    borderColor: colors.primarySoft,
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
    borderWidth: 2,
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
  skipLink: {
    color: colors.primary,
    fontSize: fontSize(14),
    fontWeight: '800',
    textAlign: 'center',
    marginTop: hp(1.2),
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
    color: colors.live,
    marginBottom: hp(1),
  },
  bannerStrip: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: hp(0.6),
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
    borderRadius: wp(3.5),
    paddingVertical: hp(1.9),
    paddingHorizontal: wp(4),
    gap: wp(2),
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
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
});
