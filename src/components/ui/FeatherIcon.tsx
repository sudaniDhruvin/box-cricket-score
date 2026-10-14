import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';

type FeatherName = 'home' | 'bar-chart-2' | 'users' | 'user' | 'thumbs-up';

type FeatherIconProps = {
  name: FeatherName;
  size?: number;
  color?: string;
  filled?: boolean;
};

export function FeatherIcon({ name, size = 24, color = '#000000', filled = false }: FeatherIconProps) {
  const stroke = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: filled ? color : 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' ? (
        <>
          <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z" {...stroke} />
        </>
      ) : null}
      {name === 'bar-chart-2' ? (
        <>
          <Line x1="18" y1="20" x2="18" y2="10" {...stroke} />
          <Line x1="12" y1="20" x2="12" y2="4" {...stroke} />
          <Line x1="6" y1="20" x2="6" y2="14" {...stroke} />
        </>
      ) : null}
      {name === 'users' ? (
        <>
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...stroke} />
          <Circle cx="9" cy="7" r="4" {...stroke} />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87" {...stroke} />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...stroke} />
        </>
      ) : null}
      {name === 'user' ? (
        <>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...stroke} />
          <Circle cx="12" cy="7" r="4" {...stroke} />
        </>
      ) : null}
      {name === 'thumbs-up' ? (
        <Path
          d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
          {...stroke}
        />
      ) : null}
    </Svg>
  );
}

export function FeatherTabIcon({ name, color }: { name: Exclude<FeatherName, 'thumbs-up'>; color: string }) {
  return <FeatherIcon name={name} color={color} size={22} />;
}
