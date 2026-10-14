import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError, getGroupLeaderboard } from '../api/client';
import { useMatchStore } from '../store/useMatchStore';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';
import {
  formatRate,
  groupLeaderboard,
  type BoardKind,
  type GroupLeaderboard,
  type PlayerCareer,
} from '../utils/playerStats';
import { PlayerAvatar } from './ui';

const EMPTY: GroupLeaderboard = {
  mine: null,
  players: [],
  boards: { runs: [], wickets: [], economy: [], strikeRate: [], catches: [], sixes: [] },
};

const BOARDS: Array<{ id: BoardKind; label: string; empty: string }> = [
  { id: 'runs', label: 'Runs', empty: 'No runs have been scored in this group yet.' },
  { id: 'wickets', label: 'Wickets', empty: 'No wickets have been taken in this group yet.' },
  { id: 'economy', label: 'Economy', empty: 'Bowl at least one over to appear here.' },
  { id: 'strikeRate', label: 'Strike rate', empty: 'Face at least one over to appear here.' },
  { id: 'catches', label: 'Catches', empty: 'No catches have been taken in this group yet.' },
  { id: 'sixes', label: 'Sixes', empty: 'No sixes have been hit in this group yet.' },
];

export function GroupStatsPanel({
  groupId,
  userId,
  refreshKey = false,
}: {
  groupId: number;
  userId: number | null;
  refreshKey?: boolean;
}) {
  const matches = useMatchStore(state => state.matches);
  const local = useMemo(
    () => groupLeaderboard(matches.filter(match => match.groupId === groupId), userId),
    [matches, groupId, userId],
  );
  const [remote, setRemote] = useState<GroupLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardKind>('runs');

  useEffect(() => {
    let cancelled = false;
    setRemote(null);
    setLoading(true);
    setProblem(null);
    getGroupLeaderboard(groupId)
      .then(next => {
        if (cancelled) return;
        setRemote(next?.boards ? next : null);
      })
      .catch(error => {
        if (cancelled) return;
        setRemote(null);
        const missing = error instanceof ApiError && (error.status === 404 || error.status === 0);
        setProblem(missing ? null : error instanceof Error ? error.message : 'Could not load group stats.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId, refreshKey]);

  const onPhone = !loading && remote == null;
  const savedHere = local.players.length > 0 || local.mine != null;
  const phoneNote = savedHere ? 'Showing matches saved on this phone.' : 'Player totals appear after scorecards are saved.';
  const note = !onPhone ? null : problem ? (savedHere ? `${problem} ${phoneNote}` : problem) : phoneNote;
  const data = remote ?? (onPhone ? local : EMPTY);
  const selected = BOARDS.find(item => item.id === board) ?? BOARDS[0];
  const rows = data.boards[selected.id];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your record in this group</Text>
      {loading && !remote ? <ActivityIndicator color={colors.primary} /> : (
        <>
          {note ? <Text style={styles.note}>{note}</Text> : null}
          <Mine career={data.mine} />
          <Text style={styles.title}>Leaderboard</Text>
          <View style={styles.chips}>
            {BOARDS.map(item => {
              const active = item.id === board;
              return (
                <Pressable key={item.id} onPress={() => setBoard(item.id)} style={[styles.chip, active && styles.chipOn]} accessibilityRole="button">
                  <Text style={[styles.chipText, active && styles.chipTextOn]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {rows.length === 0 ? <Text style={styles.muted}>{selected.empty}</Text> : rows.map((row, index) => (
            <View key={row.userId} style={styles.row}>
              <Text style={styles.rank}>{index + 1}</Text>
              <PlayerAvatar name={row.name} photoUrl={row.photoUrl} size={wp(9)} />
              <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
              <Text style={styles.value}>{row.detail}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function Mine({ career }: { career: PlayerCareer | null }) {
  if (!career) return <Text style={styles.muted}>You have no figures in this group yet.</Text>;
  const cells = [
    { label: 'Runs', value: String(career.batting.runs) },
    { label: 'Wickets', value: String(career.bowling.wickets) },
    { label: 'Strike rate', value: formatRate(career.batting.strikeRate) },
    { label: 'Economy', value: formatRate(career.bowling.economy) },
  ];
  return (
    <View>
      <View style={styles.mineRow}>
        <PlayerAvatar name={career.name} photoUrl={career.photoUrl} size={wp(11)} />
        <View style={styles.mineText}>
          <Text style={styles.name}>{career.name}</Text>
          <Text style={styles.muted}>{career.matches} {career.matches === 1 ? 'match' : 'matches'} in this group</Text>
        </View>
      </View>
      <View style={styles.cells}>
        {cells.map((cell, index) => (
          <View key={cell.label} style={[styles.cell, index < cells.length - 1 && styles.divider]}>
            <Text style={styles.cellValue}>{cell.value}</Text>
            <Text style={styles.cellLabel}>{cell.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.muted}>
        {career.fielding.catches} catches · {career.fielding.stumpings} stumpings · {career.fielding.runOuts} run-outs
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: wp(4),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: hp(1),
  },
  title: { color: colors.text, fontSize: fontSize(15), fontWeight: '800' },
  note: { color: colors.text, backgroundColor: colors.primaryFaint, borderRadius: wp(2), padding: wp(3), fontSize: fontSize(12), lineHeight: fontSize(18) },
  muted: { color: colors.textMuted, fontSize: fontSize(12), lineHeight: fontSize(17) },
  mineRow: { flexDirection: 'row', alignItems: 'center', gap: wp(2.5) },
  mineText: { flex: 1 },
  cells: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: wp(2.4), overflow: 'hidden' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: hp(1) },
  divider: { borderRightWidth: 1, borderRightColor: colors.border },
  cellValue: { color: colors.primary, fontSize: fontSize(15), fontWeight: '900' },
  cellLabel: { marginTop: hp(0.2), color: colors.textMuted, fontSize: fontSize(9), fontWeight: '700', textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2), paddingVertical: hp(0.2) },
  chip: { borderRadius: wp(4), borderWidth: 1, borderColor: colors.border, paddingHorizontal: wp(3), paddingVertical: hp(0.7), backgroundColor: colors.background },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: fontSize(12), fontWeight: '800' },
  chipTextOn: { color: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: wp(2), paddingVertical: hp(0.7) },
  rank: { width: wp(5), color: colors.primary, fontSize: fontSize(13), fontWeight: '900' },
  name: { flex: 1, color: colors.text, fontSize: fontSize(14), fontWeight: '800' },
  value: { color: colors.primary, fontSize: fontSize(14), fontWeight: '900' },
});
