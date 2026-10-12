import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Delivery } from '../types/match';
import { getPelletStyle } from '../theme/pelletColors';

interface PelletProps {
  ball: Delivery;
  size?: number;
}

function darken(hex: string): string {
  const channels = hex.match(/[0-9a-f]{2}/gi) ?? [];
  return `#${channels
    .map(channel =>
      Math.round(parseInt(channel, 16) * 0.72)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function borderStyleFor(ball: Delivery, bg: string) {
  if (ball.type === 'wicket') {
    return { borderWidth: 2, borderColor: '#FFFFFF' } as const;
  }
  if (
    ball.type === 'wide' ||
    ball.type === 'no-ball' ||
    ball.type === 'bye' ||
    ball.type === 'leg-bye' ||
    ball.type === 'penalty'
  ) {
    return {
      borderWidth: 1.5,
      borderColor: darken(bg),
      borderStyle: 'dashed' as const,
    };
  }
  return { borderWidth: 0 } as const;
}

export const Pellet = React.memo(function PelletView({
  ball,
  size = 32,
}: PelletProps) {
  const { bg, fg, label, a11yLabel } = getPelletStyle(ball);
  const border = borderStyleFor(ball, bg);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      style={[
        styles.pellet,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          ...border,
        },
      ]}>
      <Text
        allowFontScaling={false}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
        numberOfLines={1}
        style={[styles.label, { color: fg, maxWidth: size - 6 }]}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  pellet: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
