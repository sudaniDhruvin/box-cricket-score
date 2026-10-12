import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

export function SquadPickCard({
  title,
  hint,
  playerIds,
  nameOf,
  onPick,
  bare = false,
}: {
  title: string;
  hint: string;
  playerIds: string[];
  nameOf: (playerId: string) => string;
  onPick: (playerId: string) => void;
  bare?: boolean;
}) {
  return (
    <View style={bare ? styles.bare : styles.card}>
      {bare ? null : <Text style={styles.title}>{title}</Text>}
      {bare ? null : <Text style={styles.hint}>{hint}</Text>}
      {playerIds.length === 0 ? (
        <Text style={styles.empty}>No players left to choose.</Text>
      ) : (
        <View style={styles.list}>
          {playerIds.map(playerId => (
            <Pressable
              key={playerId}
              onPress={() => onPick(playerId)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
              accessibilityLabel={`${title} ${nameOf(playerId)}`}
            >
              <Text style={styles.name}>{nameOf(playerId)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: hp(1),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    padding: wp(3),
    backgroundColor: colors.surfaceMuted,
  },
  bare: {
    marginBottom: hp(1.5),
  },
  title: {
    fontSize: fontSize(16),
    fontWeight: '900',
    color: colors.text,
  },
  hint: {
    marginTop: hp(0.3),
    marginBottom: hp(1),
    fontSize: fontSize(13),
    fontWeight: '600',
    color: colors.textMuted,
  },
  empty: {
    fontSize: fontSize(13),
    fontWeight: '600',
    color: colors.textMuted,
  },
  list: {
    gap: hp(0.6),
  },
  row: {
    backgroundColor: colors.background,
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
  },
  rowPressed: {
    backgroundColor: colors.primaryFaint,
  },
  name: {
    fontSize: fontSize(15),
    fontWeight: '800',
    color: colors.text,
  },
});
