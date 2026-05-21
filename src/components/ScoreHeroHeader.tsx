import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedOverBar } from './AnimatedOverBar';
import { AnimatedScorePulse } from './AnimatedScorePulse';
import { PressableScale } from './PressableScale';
import { colors } from '../theme/colors';
import type { ChaseInfo } from '../utils/cricketFormat';
import { formatRunRate } from '../utils/cricketFormat';
import { fontSize, hp, wp } from '../utils';

export interface ScoreHeroHeaderProps {
  inningsLabel: string;
  teamName: string;
  runs: number;
  wickets: number;
  oversDisplay: string;
  /** Legal balls in the over being bowled (0–6). */
  ballsThisOver: number;
  /** Over number in progress (e.g. 7 of 8). */
  currentOverNumber: number;
  oversCap: number;
  wicketsCap: number;
  chasePreviewLine?: string;
  chase?: ChaseInfo | null;
  currentRunRate?: number | null;
  oversRemainingDisplay?: string | null;
  onOpenChaseHelp?: () => void;
  onChasePreviewPress?: () => void;
}

/**
 * Fixed score zone — always visible while scoring (never scrolls away).
 */
export function ScoreHeroHeader({
  inningsLabel,
  teamName,
  runs,
  wickets,
  oversDisplay,
  ballsThisOver,
  currentOverNumber,
  oversCap,
  wicketsCap,
  chasePreviewLine,
  chase,
  currentRunRate,
  oversRemainingDisplay,
  onOpenChaseHelp,
  onChasePreviewPress,
}: ScoreHeroHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.teamCol}>
          <View style={styles.inningsPill}>
            <Text style={styles.inningsPillText}>{inningsLabel}</Text>
          </View>
          <Text style={styles.teamName} numberOfLines={1}>
            {teamName}
          </Text>
        </View>
        <View style={styles.limitBadge}>
          <Text style={styles.limitText}>
            {oversCap} ov · {wickets}/{wicketsCap} wkts
          </Text>
        </View>
      </View>

      <AnimatedScorePulse
        runs={runs}
        wickets={wickets}
        style={styles.scoreMain}
        accessibilityLabel={`${runs} runs, ${wickets} wickets`}
      >
        {runs}/{wickets}
      </AnimatedScorePulse>

      <AnimatedOverBar
        overNumber={currentOverNumber}
        ballsThisOver={ballsThisOver}
        oversCap={oversCap}
      />

      {chase != null ? (
        <ChaseMetricsRow
          chase={chase}
          currentRunRate={currentRunRate ?? null}
          onOpenHelp={onOpenChaseHelp}
        />
      ) : (
        <View style={styles.statsRow}>
          <StatPill label="Overs bowled" value={oversDisplay} />
          <StatPill label="Run rate" value={formatRunRate(currentRunRate ?? null)} />
          {oversRemainingDisplay != null ? (
            <StatPill label="Left" value={oversRemainingDisplay} />
          ) : null}
        </View>
      )}

      {chasePreviewLine != null && chase == null ? (
        <PressableScale
          onPress={onChasePreviewPress ?? onOpenChaseHelp}
          disabled={onChasePreviewPress == null && onOpenChaseHelp == null}
          scaleTo={0.98}
          style={styles.previewPress}
        >
          <Text style={styles.previewLine} numberOfLines={2}>
            {chasePreviewLine}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

function ChaseMetricsRow({
  chase,
  currentRunRate,
  onOpenHelp,
}: {
  chase: ChaseInfo;
  currentRunRate: number | null;
  onOpenHelp?: () => void;
}) {
  const ballsLabel =
    chase.legalBallsRemaining === 1
      ? '1 ball'
      : `${chase.legalBallsRemaining} balls`;

  if (chase.targetReached) {
    return (
      <View style={styles.chaseBox}>
        <Text style={styles.chaseReachedTitle}>Target reached</Text>
        <Text style={styles.chaseReachedSub}>{chase.target} runs to win</Text>
      </View>
    );
  }

  return (
    <View style={styles.chaseBox}>
      <View style={styles.chasePrimaryRow}>
        <View style={styles.chaseNeedCol}>
          <Text style={styles.chaseNeedNum}>{chase.need}</Text>
          <Text style={styles.chaseNeedLbl}>runs to win</Text>
          <Text style={styles.chaseNeedSub}>
            from {ballsLabel} ({chase.oversRemainingDisplay} ov)
          </Text>
        </View>
        <View style={styles.chaseMetricsCol}>
          <ChaseMetric label="Target" value={String(chase.target)} />
          <ChaseMetric
            label="Required"
            value={formatRunRate(chase.requiredRate)}
            accent
          />
          <ChaseMetric label="Current" value={formatRunRate(currentRunRate)} />
        </View>
      </View>
      {onOpenHelp != null ? (
        <PressableScale onPress={onOpenHelp} scaleTo={0.97} hitSlop={8}>
          <Text style={styles.chaseHelpLink}>How chase works</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

function ChaseMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.chaseMetric}>
      <Text style={styles.chaseMetricLbl}>{label}</Text>
      <Text style={[styles.chaseMetricVal, accent && styles.chaseMetricAccent]}>
        {value}
      </Text>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillLbl}>{label}</Text>
      <Text style={styles.statPillVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: wp(4),
    paddingTop: hp(0.8),
    paddingBottom: hp(1),
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: wp(2),
    marginBottom: hp(0.5),
  },
  teamCol: {
    flex: 1,
    minWidth: 0,
  },
  inningsPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.25),
    borderRadius: wp(1.5),
    backgroundColor: colors.primaryFaint,
    marginBottom: hp(1),
  },
  inningsPillText: {
    fontSize: fontSize(10),
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  teamName: {
    fontSize: fontSize(17),
    fontWeight: '800',
    color: colors.text,
  },
  limitBadge: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.35),
    borderRadius: wp(1.5),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  limitText: {
    fontSize: fontSize(10),
    fontWeight: '700',
    color: colors.textMuted,
  },
  scoreMain: {
    fontSize: fontSize(48),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1.5,
    lineHeight: fontSize(52),
    marginBottom: hp(0.5),
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
  },
  statPill: {
    flexGrow: 1,
    minWidth: wp(20),
    paddingVertical: hp(0.55),
    paddingHorizontal: wp(2),
    borderRadius: wp(2),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statPillLbl: {
    fontSize: fontSize(10),
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: hp(0.1),
  },
  statPillVal: {
    fontSize: fontSize(14),
    fontWeight: '900',
    color: colors.text,
  },
  previewPress: {
    marginTop: hp(1),
  },
  previewLine: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.primary,
    lineHeight: fontSize(17),
    textDecorationLine: 'underline',
  },
  chaseBox: {
    borderRadius: wp(2.5),
    backgroundColor: colors.primary,
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
  },
  chasePrimaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(3),
  },
  chaseNeedCol: {
    flex: 1,
    minWidth: wp(28),
  },
  chaseNeedNum: {
    fontSize: fontSize(36),
    fontWeight: '900',
    color: colors.background,
    lineHeight: fontSize(38),
    letterSpacing: -1,
  },
  chaseNeedLbl: {
    fontSize: fontSize(11),
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chaseNeedSub: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: hp(0.2),
  },
  chaseMetricsCol: {
    flex: 1,
    gap: hp(0.35),
    justifyContent: 'center',
  },
  chaseMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(0.2),
    paddingHorizontal: wp(1.5),
    borderRadius: wp(1.5),
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  chaseMetricLbl: {
    fontSize: fontSize(11),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  chaseMetricVal: {
    fontSize: fontSize(15),
    fontWeight: '900',
    color: colors.background,
  },
  chaseMetricAccent: {
    fontSize: fontSize(16),
  },
  chaseHelpLink: {
    marginTop: hp(0.5),
    fontSize: fontSize(11),
    fontWeight: '700',
    color: colors.background,
    textDecorationLine: 'underline',
  },
  chaseReachedTitle: {
    fontSize: fontSize(18),
    fontWeight: '900',
    color: colors.background,
  },
  chaseReachedSub: {
    fontSize: fontSize(14),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginTop: hp(0.2),
  },
});
