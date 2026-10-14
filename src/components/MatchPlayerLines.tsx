import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MatchSummary } from '../types/match';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';
import { hasMatchFigures, matchPlayerLines, type PlayerMatchLine } from '../utils/playerStats';
import { StatsCardSheet } from './StatsCardSheet';

export function MatchPlayerLines({ match, groupName }: { match: MatchSummary; groupName: string }) {
  const [selected, setSelected] = useState<PlayerMatchLine | null>(null);
  const lines = matchPlayerLines(match).filter(hasMatchFigures);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Players</Text>
      {lines.length === 0 ? (
        <Text style={styles.muted}>Player figures appear when the scorecard names the batters and bowlers.</Text>
      ) : lines.map(line => (
        <Pressable key={line.userId} onPress={() => setSelected(line)} style={styles.row} accessibilityRole="button" accessibilityLabel={`Share card for ${line.name}`}>
          <View style={styles.text}>
            <Text style={styles.name}>{line.name}</Text>
            <Text style={styles.figure}>{line.headline}</Text>
          </View>
          <Text style={styles.share}>Share card</Text>
        </Pressable>
      ))}
      <StatsCardSheet match={match} line={selected} groupName={groupName} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: hp(0.6), gap: hp(0.4) },
  title: { color: colors.text, fontSize: fontSize(13), fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: fontSize(12), lineHeight: fontSize(17) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingVertical: hp(0.7),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  text: { flex: 1 },
  name: { color: colors.text, fontSize: fontSize(13), fontWeight: '800' },
  figure: { marginTop: hp(0.15), color: colors.primary, fontSize: fontSize(12), fontWeight: '800' },
  share: { color: colors.primary, fontSize: fontSize(11), fontWeight: '800' },
});
