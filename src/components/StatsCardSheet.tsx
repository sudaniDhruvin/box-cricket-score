import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchSummary } from '../types/match';
import { formatPlayedDateCompact } from '../utils/cricketFormat';
import {
  formatRate,
  howOutLabel,
  opponentName,
  type PlayerMatchLine,
} from '../utils/playerStats';
import { colors } from '../theme/colors';
import { fontSize, hp, SCREEN_WIDTH, wp } from '../utils';
import { PlayerAvatar, PrimaryButton } from './ui';
import { CricketBatBallIcon, CricketStumpsIcon } from './ui/CricketIcons';

type CaptureRef = (
  view: unknown,
  options: { format: 'png'; quality: number; result: 'tmpfile'; width: number; height: number },
) => Promise<string>;

type ShareOpen = (options: {
  url: string;
  type: string;
  failOnCancel: boolean;
  filename: string;
}) => Promise<unknown>;

const CARD_WIDTH = SCREEN_WIDTH - wp(10);
const CARD_HEIGHT = CARD_WIDTH * (16 / 9);

function loadCapture(): CaptureRef | null {
  try {
    const mod = require('react-native-view-shot') as { captureRef?: CaptureRef; default?: { captureRef?: CaptureRef } };
    const capture = mod.captureRef ?? mod.default?.captureRef;
    return typeof capture === 'function' ? capture : null;
  } catch {
    return null;
  }
}

function loadShare(): ShareOpen | null {
  try {
    const mod = require('react-native-share') as { default?: { open?: ShareOpen }; open?: ShareOpen };
    const open = mod.open ?? mod.default?.open;
    return typeof open === 'function' ? open : null;
  } catch {
    return null;
  }
}

function sharePath(path: string): string {
  if (path.startsWith('file://') || path.startsWith('content://')) return path;
  return `file://${path}`;
}

function isShareCancel(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { message?: string; code?: string };
  return /cancel/i.test(record.message ?? '') || /cancel/i.test(String(record.code ?? ''));
}

function cardDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return formatPlayedDateCompact(iso);
}

export function StatsCardSheet({
  match,
  line,
  groupName,
  photoUrl,
  onClose,
}: {
  match: MatchSummary | null;
  line: PlayerMatchLine | null;
  groupName: string;
  photoUrl?: string | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const visible = match != null && line != null;

  useEffect(() => {
    setNote(null);
    setSharing(false);
  }, [line?.userId, match?.id]);

  const share = async () => {
    if (!cardRef.current || sharing) return;
    setSharing(true);
    setNote(null);
    try {
      const captureRef = loadCapture();
      const open = loadShare();
      if (!captureRef || !open) {
        setNote('The card is ready to view here. Sharing the picture needs the latest app on this phone.');
        return;
      }
      const captured = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 1080,
        height: 1920,
      });
      await open({
        url: sharePath(captured),
        type: 'image/png',
        failOnCancel: false,
        filename: 'crick-shots',
      });
    } catch (error) {
      if (!isShareCancel(error)) {
        setNote('The card is ready to view here. Sharing the picture needs the latest app on this phone.');
      }
    } finally {
      setSharing(false);
    }
  };

  const batting = line?.batting ?? null;
  const bowling = line?.bowling ?? null;
  const strikeWidth = batting?.strikeRate == null ? 0 : Math.max(8, Math.min(100, batting.strikeRate / 2));

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {line && match ? (
            <View
              ref={cardRef}
              collapsable={false}
              accessibilityLabel={`${line.name}, ${line.headline}`}
              style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
            >
              <View style={styles.hero}>
                <View style={styles.orb} />
                <Text style={styles.brand}>CRICK SHOTS</Text>
                <View style={styles.avatarRing}>
                  <PlayerAvatar name={line.name} photoUrl={photoUrl} size={wp(18)} />
                </View>
                <Text style={styles.name} numberOfLines={2}>{line.name}</Text>
              </View>
              <View style={styles.accent} />
              <View style={styles.body}>
                <Text style={styles.context} numberOfLines={1}>{groupName}</Text>
                <Text style={styles.opponent} numberOfLines={1}>vs {opponentName(match, line.userId)}</Text>
                <Text style={styles.date}>{cardDate(match.playedAt)}</Text>
                <Text style={styles.headline} numberOfLines={2}>{line.headline}</Text>
                {batting ? <Text style={styles.howOut}>{howOutLabel(batting.howOut)}</Text> : null}
                {batting ? (
                  <View style={styles.block}>
                    <View style={styles.blockTitle}>
                      <CricketBatBallIcon size={wp(4.2)} color={colors.primary} />
                      <Text style={styles.blockLabel}>Batting</Text>
                    </View>
                    <View style={styles.tiles}>
                      <Tile value={formatRate(batting.strikeRate)} label="Strike rate" />
                      <Tile value={String(batting.fours)} label="Fours" />
                      <Tile value={String(batting.sixes)} label="Sixes" />
                    </View>
                    <View style={styles.meterTrack}>
                      <View style={[styles.meterFill, { width: `${strikeWidth}%` }]} />
                    </View>
                  </View>
                ) : null}
                {bowling ? (
                  <View style={styles.block}>
                    <View style={styles.blockTitle}>
                      <CricketStumpsIcon size={wp(4.2)} color={colors.primary} />
                      <Text style={styles.blockLabel}>Bowling</Text>
                    </View>
                    <View style={styles.tiles}>
                      <Tile value={bowling.overs} label="Overs" />
                      <Tile value={formatRate(bowling.economy)} label="Economy" />
                      <Tile value={String(bowling.dots)} label="Dots" />
                    </View>
                  </View>
                ) : null}
                <FieldingPills line={line} />
                <View style={styles.footer}>
                  <Text style={styles.footerText}>{groupName}</Text>
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
        {note ? <Text style={styles.note}>{note}</Text> : null}
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, hp(1.5)) }]}>
          <PrimaryButton label={sharing ? 'Preparing picture…' : 'Share card'} onPress={() => { share().catch(() => undefined); }} disabled={sharing || !line} />
          <PrimaryButton label="Close" onPress={onClose} variant="outline" />
        </View>
      </View>
    </Modal>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function FieldingPills({ line }: { line: PlayerMatchLine }) {
  const pills = [
    line.fielding.catches > 0 ? `${line.fielding.catches} ${line.fielding.catches === 1 ? 'catch' : 'catches'}` : null,
    line.fielding.stumpings > 0 ? `${line.fielding.stumpings} ${line.fielding.stumpings === 1 ? 'stumping' : 'stumpings'}` : null,
    line.fielding.runOuts > 0 ? `${line.fielding.runOuts} ${line.fielding.runOuts === 1 ? 'run-out' : 'run-outs'}` : null,
  ].filter((item): item is string => item != null);
  if (pills.length === 0) return null;
  return (
    <View style={styles.pills}>
      {pills.map(pill => <Text key={pill} style={styles.pill}>{pill}</Text>)}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { alignItems: 'center', paddingVertical: hp(2) },
  card: {
    backgroundColor: colors.background,
    borderRadius: wp(4),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  hero: {
    height: '34%',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(4),
    gap: hp(0.8),
  },
  orb: {
    position: 'absolute',
    width: wp(36),
    height: wp(36),
    borderRadius: wp(18),
    backgroundColor: 'rgba(255,255,255,0.08)',
    right: -wp(8),
    top: -wp(6),
  },
  brand: { color: 'rgba(255,255,255,0.78)', fontSize: fontSize(10), fontWeight: '900', letterSpacing: 1.6 },
  avatarRing: { padding: wp(0.6), borderRadius: wp(12), backgroundColor: colors.background },
  name: { color: colors.background, fontSize: fontSize(24), fontWeight: '900', textAlign: 'center' },
  accent: { height: hp(0.7), backgroundColor: colors.accent },
  body: { flex: 1, paddingHorizontal: wp(4), paddingTop: hp(1.4) },
  context: { color: colors.textMuted, fontSize: fontSize(11), fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  opponent: { marginTop: hp(0.3), color: colors.text, fontSize: fontSize(16), fontWeight: '800' },
  date: { marginTop: hp(0.2), color: colors.textMuted, fontSize: fontSize(11), fontWeight: '700' },
  headline: { marginTop: hp(1.2), color: colors.primary, fontSize: fontSize(28), fontWeight: '900' },
  howOut: { marginTop: hp(0.3), color: colors.textMuted, fontSize: fontSize(12), fontWeight: '700' },
  block: { marginTop: hp(1.3) },
  blockTitle: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5), marginBottom: hp(0.6) },
  blockLabel: { color: colors.primary, fontSize: fontSize(11), fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  tiles: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: wp(2.4), overflow: 'hidden' },
  tile: { flex: 1, alignItems: 'center', paddingVertical: hp(0.8) },
  tileValue: { color: colors.text, fontSize: fontSize(14), fontWeight: '900' },
  tileLabel: { marginTop: hp(0.15), color: colors.textMuted, fontSize: fontSize(9), fontWeight: '700' },
  meterTrack: { marginTop: hp(0.7), height: hp(0.7), borderRadius: wp(2), backgroundColor: colors.primaryFaint, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: colors.accent, borderRadius: wp(2) },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(1.5), marginTop: hp(1.2) },
  pill: {
    color: colors.primary,
    backgroundColor: colors.primaryFaint,
    overflow: 'hidden',
    borderRadius: wp(3),
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.35),
    fontSize: fontSize(10),
    fontWeight: '800',
  },
  footer: { marginTop: 'auto', paddingVertical: hp(1.2) },
  footerText: { color: colors.textMuted, fontSize: fontSize(10), fontWeight: '800', letterSpacing: 0.4 },
  note: {
    marginHorizontal: wp(5),
    marginBottom: hp(1),
    color: colors.text,
    backgroundColor: colors.primaryFaint,
    borderRadius: wp(2),
    padding: wp(3),
    fontSize: fontSize(12),
    lineHeight: fontSize(18),
  },
  actions: { paddingHorizontal: wp(5), gap: hp(1) },
});
