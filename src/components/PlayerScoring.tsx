import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppSheet, PrimaryButton } from './ui';
import { colors } from '../theme/colors';
import type { Delivery, InningsCrew, MatchSummary, WicketDismissal } from '../types/match';
import { fontSize, hp, wp } from '../utils';
import { wicketDelivery } from '../utils/applyScoringDelivery';
import {
  battingSquad,
  bowlingSquad,
  crewReady,
  dismissalLabel,
  emptyCrew,
  fallOfWicketsFor,
  partnershipsFor,
  placeBatter,
  placeBowler,
  playerName,
  type SuggestedResult,
} from '../utils/playerScoring';

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function CrewStrip({
  match,
  inningsIndex,
  onCrew,
  onEndMatch,
  decided = false,
}: {
  match: MatchSummary;
  inningsIndex: 0 | 1;
  onCrew: (crew: InningsCrew) => void;
  onEndMatch: () => void;
  decided?: boolean;
}) {
  const crew = match.crews?.[inningsIndex];
  const batting = battingSquad(match, inningsIndex);
  const bowling = bowlingSquad(match, inningsIndex);
  const innings = match.innings[inningsIndex];
  if (crew == null || batting == null || bowling == null || innings == null) return null;

  const ready = crewReady(crew, batting.players.length);
  const end: 'striker' | 'nonStriker' = crew.strikerId == null ? 'striker' : 'nonStriker';
  const waitingBatters = crew.yetToBat
    .map(id => batting.players.find(player => player.userId === id))
    .filter((player): player is NonNullable<typeof player> => player != null);
  const needBatter = (crew.strikerId == null || crew.nonStrikerId == null) && waitingBatters.length > 0;
  const needBowler = !needBatter && crew.bowlerId == null;
  const legalBalls = innings.overs.fullOvers * 6 + innings.overs.balls;
  const canReset = legalBalls === 0 && innings.wickets === 0 && (crew.strikerId != null || crew.bowlerId != null);
  const partnershipRows = partnershipsFor(innings);
  const partnership = partnershipRows.filter(row => row.unbroken).pop() ?? partnershipRows[partnershipRows.length - 1];
  const fall = fallOfWicketsFor(innings);
  const extras = innings.extras.wides + innings.extras.noBalls + (innings.extras.byes ?? 0);

  return (
    <View style={styles.card}>
      {ready || decided ? (
        <>
          <CrewLine label="Striker" value={crew.strikerId == null ? '—' : `${playerName(match.squads, crew.strikerId)} *`} />
          <CrewLine label="Non-striker" value={crew.nonStrikerId == null ? '—' : playerName(match.squads, crew.nonStrikerId)} />
          <View style={styles.line}>
            <Text style={styles.lineLabel}>Bowler</Text>
            <Text style={styles.lineValue} numberOfLines={1}>{playerName(match.squads, crew.bowlerId)}</Text>
            {decided ? null : (
              <Pressable onPress={() => onCrew({ ...crew, bowlerId: null })} accessibilityRole="button" accessibilityLabel="Change bowler">
                <Text style={styles.link}>Change</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.meta}>
            Extras {extras} · Wd {innings.extras.wides} · Nb {innings.extras.noBalls} · B {innings.extras.byes ?? 0}
          </Text>
          {partnership ? (
            <Text style={styles.meta}>
              Partnership {partnership.runs} ({partnership.balls}) · {partnership.batterIds.map(id => playerName(match.squads, id)).join(' & ')}
            </Text>
          ) : null}
          {fall.length > 0 ? (
            <Text style={styles.meta}>
              Fall of wickets {fall.map(row => `${row.score} ${playerName(match.squads, row.dismissedId)} ${dismissalLabel(row.dismissal)} ${row.over}`).join(' · ')}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Text style={styles.prompt}>
            {crew.strikerId == null && crew.nonStrikerId == null
              ? 'Choose the openers'
              : crew.strikerId == null || (crew.nonStrikerId == null && waitingBatters.length > 0)
                ? 'Who comes in next?'
                : 'Choose the bowler'}
          </Text>
          {crew.strikerId != null || crew.nonStrikerId != null ? (
            <Text style={styles.meta}>
              Still in: {[crew.strikerId, crew.nonStrikerId].filter((id): id is number => id != null).map(id => playerName(match.squads, id)).join(' and ')}
            </Text>
          ) : null}
          {needBatter ? (
            <View style={styles.chips}>
              {waitingBatters.map(player => (
                <Chip
                  key={player.userId}
                  label={player.name}
                  onPress={() => {
                    const next = placeBatter(crew, player.userId, end);
                    if (next) onCrew(next);
                  }}
                />
              ))}
            </View>
          ) : null}
          {needBowler ? (
            <View style={styles.chips}>
              {bowling.players.map(player => (
                <Chip key={player.userId} label={player.name} onPress={() => onCrew(placeBowler(crew, player.userId))} />
              ))}
            </View>
          ) : null}
          {canReset ? (
            <Pressable onPress={() => onCrew(emptyCrew(batting))} accessibilityRole="button">
              <Text style={styles.link}>Clear openers</Text>
            </Pressable>
          ) : null}
        </>
      )}
      <Pressable onPress={onEndMatch} accessibilityRole="button" accessibilityLabel="End match">
        <Text style={styles.link}>End match</Text>
      </Pressable>
    </View>
  );
}

function CrewLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const DISMISSALS: Array<{ id: WicketDismissal; label: string }> = [
  { id: 'bowled', label: 'Bowled' },
  { id: 'lbw', label: 'LBW' },
  { id: 'caught', label: 'Caught' },
  { id: 'stumped', label: 'Stumped' },
  { id: 'run-out', label: 'Run out' },
  { id: 'hit-wicket', label: 'Hit wicket' },
  { id: 'retired-hurt', label: 'Retired hurt' },
  { id: 'other', label: 'Other' },
];

export function PlayerWicketSheet({
  visible,
  match,
  inningsIndex,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  match: MatchSummary;
  inningsIndex: 0 | 1;
  onClose: () => void;
  onConfirm: (delivery: Delivery) => void;
}) {
  const crew = match.crews?.[inningsIndex];
  const bowling = bowlingSquad(match, inningsIndex);
  const [dismissal, setDismissal] = useState<WicketDismissal | null>(null);
  const [who, setWho] = useState<number | null>(null);
  const [fielders, setFielders] = useState<number[]>([]);
  const [runs, setRuns] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6 | null>(null);

  const reset = () => {
    setDismissal(null);
    setWho(null);
    setFielders([]);
    setRuns(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const needsFielder = dismissal === 'caught' || dismissal === 'stumped' || dismissal === 'run-out';
  const fielderLimit = dismissal === 'run-out' ? 2 : 1;
  const batterChoices = [crew?.strikerId, crew?.nonStrikerId].filter((id): id is number => id != null);
  const ready = dismissal != null
    && (!needsFielder || fielders.length > 0)
    && (dismissal !== 'run-out' || (who != null && runs != null));

  const confirm = () => {
    if (dismissal == null || crew?.strikerId == null) return;
    const delivery = wicketDelivery(dismissal, dismissal === 'run-out' && runs != null ? { runOutRuns: runs } : undefined);
    const dismissedId = dismissal === 'run-out' ? who ?? undefined : crew.strikerId;
    onConfirm({
      ...delivery,
      players: {
        strikerId: crew.strikerId,
        ...(crew.nonStrikerId != null ? { nonStrikerId: crew.nonStrikerId } : {}),
        bowlerId: crew.bowlerId ?? 0,
        ...(dismissedId != null ? { dismissedId } : {}),
        ...(fielders.length > 0 ? { fielderIds: fielders } : {}),
      },
    });
    reset();
  };

  return (
    <AppSheet visible={visible} title="Wicket" onClose={close}>
      <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.prompt}>How was the batter out?</Text>
        <View style={styles.chips}>
          {DISMISSALS.map(option => (
            <Chip
              key={option.id}
              label={option.label}
              selected={dismissal === option.id}
              onPress={() => {
                setDismissal(option.id);
                setFielders([]);
                setWho(option.id === 'run-out' ? crew?.strikerId ?? null : null);
                setRuns(option.id === 'run-out' ? 0 : null);
              }}
            />
          ))}
        </View>
        {dismissal === 'run-out' ? (
          <>
            <Text style={styles.prompt}>Who is out?</Text>
            <View style={styles.chips}>
              {batterChoices.map(id => (
                <Chip key={id} label={playerName(match.squads, id)} selected={who === id} onPress={() => setWho(id)} />
              ))}
            </View>
            <Text style={styles.prompt}>Runs completed</Text>
            <View style={styles.chips}>
              {([0, 1, 2, 3, 4, 5, 6] as const).map(value => (
                <Chip key={value} label={String(value)} selected={runs === value} onPress={() => setRuns(value)} />
              ))}
            </View>
          </>
        ) : null}
        {needsFielder ? (
          <>
            <Text style={styles.prompt}>{dismissal === 'stumped' ? 'Wicketkeeper' : dismissal === 'caught' ? 'Catcher' : 'Fielders'}</Text>
            <View style={styles.chips}>
              {(bowling?.players ?? []).map(player => {
                const selected = fielders.includes(player.userId);
                return (
                  <Chip
                    key={player.userId}
                    label={player.name}
                    selected={selected}
                    onPress={() => {
                      setFielders(current => {
                        if (current.includes(player.userId)) return current.filter(id => id !== player.userId);
                        if (current.length >= fielderLimit) return [...current.slice(1), player.userId];
                        return [...current, player.userId];
                      });
                    }}
                  />
                );
              })}
            </View>
          </>
        ) : null}
        {dismissal === 'bowled' || dismissal === 'lbw' || dismissal === 'hit-wicket' ? (
          <Text style={styles.meta}>Bowler {playerName(match.squads, crew?.bowlerId)}</Text>
        ) : null}
      </ScrollView>
      <PrimaryButton label="Confirm wicket" onPress={confirm} disabled={!ready} />
    </AppSheet>
  );
}

export function EndMatchSheet({
  visible,
  suggestion,
  onClose,
  onOutcome,
}: {
  visible: boolean;
  suggestion: SuggestedResult | null;
  onClose: () => void;
  onOutcome: (outcome: 'win' | 'tie' | 'draw' | 'no-result') => void;
}) {
  return (
    <AppSheet visible={visible} title="End match" onClose={onClose}>
      <Text style={styles.meta}>
        {suggestion?.kind === 'win'
          ? `${suggestion.teamName} are ahead ${suggestion.detail}.`
          : suggestion?.kind === 'tie'
            ? 'The scores are level.'
            : 'Close the match as a draw or with no result. The ball-by-ball record locks.'}
      </Text>
      {suggestion?.kind === 'win' ? (
        <PrimaryButton label={`Confirm ${suggestion.teamName} won`} onPress={() => onOutcome('win')} />
      ) : null}
      {suggestion?.kind === 'tie' ? (
        <PrimaryButton label="Record a tie" onPress={() => onOutcome('tie')} />
      ) : null}
      <PrimaryButton label="Record a draw" onPress={() => onOutcome('draw')} variant={suggestion ? 'outline' : 'filled'} />
      <PrimaryButton label="No result" onPress={() => onOutcome('no-result')} variant="outline" />
      <PrimaryButton label={suggestion ? 'Not now' : 'Keep scoring'} onPress={onClose} variant="outline" />
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    backgroundColor: colors.background,
    padding: wp(3),
    gap: hp(0.6),
    marginBottom: hp(1.2),
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  lineLabel: { width: wp(24), color: colors.textMuted, fontSize: fontSize(11), fontWeight: '800' },
  lineValue: { flex: 1, color: colors.text, fontSize: fontSize(15), fontWeight: '800' },
  prompt: { color: colors.text, fontSize: fontSize(14), fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: fontSize(12), lineHeight: fontSize(18) },
  link: { color: colors.primary, fontSize: fontSize(13), fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(1.5) },
  chip: {
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.8),
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  chipText: { color: colors.text, fontSize: fontSize(13), fontWeight: '700' },
  chipTextSelected: { color: colors.primary },
  sheetScroll: { maxHeight: hp(42) },
});
