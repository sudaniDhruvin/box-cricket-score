import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CareerStats as CareerStatsData } from '../../api/client';
import { colors } from '../../theme/colors';
import { fontSize, hp, wp } from '../../utils';
import { formatRate, hasExpandedCareer, playerRating, type BattingTotals, type BowlingTotals, type FieldingTotals, type PlayerCareer, type PlayerRating } from '../../utils/playerStats';

const CELLS: Array<{ key: 'matches' | 'runs' | 'wickets' | 'groups'; label: string }> = [
  { key: 'matches', label: 'Matches' },
  { key: 'runs', label: 'Runs' },
  { key: 'wickets', label: 'Wickets' },
  { key: 'groups', label: 'Groups' },
];

export function CareerStats({ stats, phone = null }: { stats: CareerStatsData | null; phone?: PlayerCareer | null }) {
  const saved = hasExpandedCareer(stats) ? stats : null;
  const expanded = saved?.batting && saved.bowling && saved.fielding
    ? { matches: saved.matches, batting: saved.batting, bowling: saved.bowling, fielding: saved.fielding }
    : null;
  const figures = expanded ?? (phone && phone.matches > 0 ? phone : null);
  const rating = figures ? playerRating(figures) : null;
  return (
    <View>
      <View style={styles.row}>
        {CELLS.map((cell, index) => (
          <View key={cell.key} style={[styles.cell, index < CELLS.length - 1 && styles.divider]}>
            <Text style={styles.value}>{stats?.[cell.key] ?? 0}</Text>
            <Text style={styles.label}>{cell.label}</Text>
          </View>
        ))}
      </View>
      {stats && stats.captaincies > 0 ? (
        <Text style={styles.captain}>Match captain in {stats.captaincies} {stats.captaincies === 1 ? 'match' : 'matches'}</Text>
      ) : null}
      {rating ? <RatingBlock rating={rating} /> : null}
      {expanded ? (
        <CareerDetail batting={expanded.batting} bowling={expanded.bowling} fielding={expanded.fielding} />
      ) : null}
      {!expanded && phone && phone.matches > 0 ? (
        <View style={styles.phone}>
          <Text style={styles.captain}>On this phone</Text>
          <CareerDetail batting={phone.batting} bowling={phone.bowling} fielding={phone.fielding} />
        </View>
      ) : null}
      {stats && stats.matches === 0 && !phone?.matches ? (
        <Text style={styles.hint}>Runs and wickets appear after a scorecard records you in a match. Groups counts every group you belong to.</Text>
      ) : null}
    </View>
  );
}

function RatingBlock({ rating }: { rating: PlayerRating }) {
  return (
    <View style={styles.ratingBlock}>
      <View style={styles.barHead}>
        <Text style={styles.ratingLabel}>Rating</Text>
        <Text style={styles.ratingScore}>{rating.score == null ? 'N/A' : rating.score.toFixed(1)}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: barWidth((rating.score ?? 0) / 10), backgroundColor: colors.primary }]} />
      </View>
      <Text style={styles.hint}>
        {rating.score == null
          ? 'Rating appears once an average, strike rate, or bowling figure is recorded.'
          : 'Worked out from batting average, strike rate, bowling average, and economy.'}
      </Text>
    </View>
  );
}

function CareerDetail({
  batting,
  bowling,
  fielding,
}: {
  batting: BattingTotals;
  bowling: BowlingTotals;
  fielding: FieldingTotals;
}) {
  const high = `${batting.highScore}${batting.highScoreNotOut && batting.innings > 0 ? '*' : ''}`;
  return (
    <View style={styles.detail}>
      <Text style={styles.detailTitle}>Batting</Text>
      <Text style={styles.detailBody}>
        {batting.innings} innings · HS {high} · Avg {formatRate(batting.average)} · SR {formatRate(batting.strikeRate)}
      </Text>
      <Text style={styles.detailBody}>{batting.fours} fours · {batting.sixes} sixes · {batting.balls} balls</Text>
      <StatBar label="Average" display={formatRate(batting.average)} ratio={share(batting.average, 50)} tone={colors.primary} />
      <StatBar label="Strike rate" display={formatRate(batting.strikeRate)} ratio={share(batting.strikeRate, 200)} tone={colors.primary} />
      <StatBar label="Fours" display={String(batting.fours)} ratio={share(batting.fours, 20)} tone={colors.primary} />
      <StatBar label="Sixes" display={String(batting.sixes)} ratio={share(batting.sixes, 10)} tone={colors.primary} />
      <Text style={styles.detailTitle}>Bowling</Text>
      <Text style={styles.detailBody}>
        {bowling.overs} overs · {bowling.maidens} maidens · Econ {formatRate(bowling.economy)} · Avg {formatRate(bowling.average)}
      </Text>
      <Text style={styles.detailBody}>
        {bowling.innings > 0 ? `Best ${bowling.bestWickets}/${bowling.bestRuns} · ` : ''}{bowling.dots} dots · {bowling.extras} extras
      </Text>
      <StatBar label="Wickets" display={String(bowling.wickets)} ratio={share(bowling.wickets, 20)} tone={colors.accent} />
      <StatBar label="Average" display={formatRate(bowling.average)} ratio={share(bowling.average, 40)} tone={colors.accent} />
      <StatBar label="Economy" display={formatRate(bowling.economy)} ratio={share(bowling.economy, 12)} tone={colors.accent} />
      <StatBar label="Dots" display={String(bowling.dots)} ratio={share(bowling.dots, 30)} tone={colors.accent} />
      <Text style={styles.detailTitle}>Fielding</Text>
      <Text style={styles.detailBody}>{fielding.catches} catches · {fielding.stumpings} stumpings · {fielding.runOuts} run-outs</Text>
    </View>
  );
}

function share(value: number | null, cap: number): number {
  if (value == null || !Number.isFinite(value) || cap <= 0) return 0;
  return Math.min(1, Math.max(0, value / cap));
}

function barWidth(ratio: number): `${number}%` {
  return `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;
}

function StatBar({ label, display, ratio, tone }: { label: string; display: string; ratio: number; tone: string }) {
  return (
    <View style={styles.barBlock}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{display}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: barWidth(ratio), backgroundColor: tone }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: hp(1.5) },
  divider: { borderRightWidth: 1, borderRightColor: colors.border },
  value: { color: colors.primary, fontSize: fontSize(18), fontWeight: '900' },
  label: { marginTop: hp(0.3), color: colors.textMuted, fontSize: fontSize(10), fontWeight: '700' },
  captain: { marginTop: hp(1), color: colors.text, fontSize: fontSize(13), fontWeight: '700' },
  hint: { marginTop: hp(1), color: colors.textMuted, fontSize: fontSize(12), lineHeight: fontSize(18) },
  phone: { marginTop: hp(1.2) },
  detail: { marginTop: hp(1.2), gap: hp(0.35) },
  detailTitle: { marginTop: hp(0.6), color: colors.primary, fontSize: fontSize(12), fontWeight: '800' },
  detailBody: { color: colors.text, fontSize: fontSize(13), lineHeight: fontSize(19), fontWeight: '600' },
  ratingBlock: { marginTop: hp(1.4), gap: hp(0.45) },
  ratingLabel: { color: colors.text, fontSize: fontSize(13), fontWeight: '800' },
  ratingScore: { color: colors.primary, fontSize: fontSize(22), fontWeight: '900' },
  barBlock: { marginTop: hp(0.7), gap: hp(0.35) },
  barHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barLabel: { color: colors.inkSecondary, fontSize: fontSize(12), fontWeight: '700' },
  barValue: { color: colors.text, fontSize: fontSize(12), fontWeight: '800' },
  track: { height: hp(0.8), borderRadius: wp(1), backgroundColor: colors.chip, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: wp(1) },
});
