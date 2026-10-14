import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { mediaUri } from '../../api/client';
import { colors } from '../../theme/colors';
import { fontSize } from '../../utils';

type PlayerAvatarProps = {
  name: string;
  photoUrl?: string | null;
  size: number;
};

export function PlayerAvatar({ name, photoUrl, size }: PlayerAvatarProps) {
  const uri = mediaUri(photoUrl);
  const initial = (name.trim().slice(0, 1) || 'P').toUpperCase();
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityLabel={`${name} photo`} />;
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initial, { fontSize: Math.max(fontSize(12), size * 0.38) }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFaint,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  initial: { color: colors.primary, fontWeight: '900' },
});
