import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';

export interface CricketIconProps {
  size?: number;
  color?: string;
}

const STROKE_WIDTH = 1.8;

export function CricketBatBallIcon({
  size = 24,
  color = colors.primary,
}: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m5.2 17.1 11.9-12a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8L9 20.8a2 2 0 0 1-2.8 0l-1-1a2 2 0 0 1 0-2.7Z"
        fill={color}
      />
      <Path
        d="m8.5 13.9 2 2"
        stroke={colors.background}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <Circle
        cx="5.1"
        cy="6.4"
        r="2.6"
        fill={colors.live}
        stroke={colors.background}
        strokeWidth="1.1"
      />
      <Path
        d="M3.4 5.1c1.2.4 2 1.5 2 2.8M4.4 4.1c1.4.6 2.3 1.8 2.4 3.3"
        stroke={colors.background}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CricketStumpsIcon({
  size = 24,
  color = colors.primary,
}: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 6.2h11M7.3 8v12m4.7-12v12m4.7-12v12M5.8 20h12.4"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="19.2" cy="6.5" r="2.2" fill={colors.live} />
      <Path
        d="M17.9 5.4c.8.3 1.3 1 1.4 1.8"
        stroke={colors.background}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CricketScorebookIcon({
  size = 24,
  color = colors.primary,
}: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2.2"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
      />
      <Path
        d="M8 8h8M8 12h3m2 0h3M8 16h3m2 0h3"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      <Circle cx="6.4" cy="8" r="0.8" fill={colors.live} />
    </Svg>
  );
}

export function CricketTrophyIcon({
  size = 24,
  color = colors.primary,
}: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 4h8v4.2a4 4 0 0 1-8 0V4ZM8 6H5v1a4 4 0 0 0 4 4m7-5h3v1a4 4 0 0 1-4 4M12 12v5m-4 3h8m-7-3h6v3H9z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="7" r="1.2" fill={colors.accent} />
    </Svg>
  );
}

export function QrScanIcon({
  size = 24,
  color = colors.primary,
}: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      <Circle cx="12" cy="12" r="3.4" fill={colors.live} />
      <Path
        d="M10.2 10.4c1 .3 1.7 1.2 1.8 2.3m-.7-3.5c1.4.5 2.3 1.7 2.4 3.2"
        stroke={colors.background}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SettingsSlidersIcon({
  size = 24,
  color = colors.primary,
}: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h6m4 0h6M4 17h3m4 0h9M4 12h2m4 0h10"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      <Circle cx="12" cy="7" r="2" fill={colors.background} stroke={color} strokeWidth={STROKE_WIDTH} />
      <Circle cx="9" cy="17" r="2" fill={colors.background} stroke={color} strokeWidth={STROKE_WIDTH} />
      <Circle cx="8" cy="12" r="2" fill={colors.background} stroke={color} strokeWidth={STROKE_WIDTH} />
    </Svg>
  );
}

export function ShieldIcon({ size = 24, color = colors.primary }: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 19 6v5.2c0 4.1-2.8 7.8-7 9.8-4.2-2-7-5.7-7-9.8V6l7-3Z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m9 12 2 2 4-4"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function RefreshIcon({ size = 24, color = colors.primary }: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 7v5h-5M4 17v-5h5m10.2-1A7.5 7.5 0 0 0 6 6.3L4 8m16 8-2 1.7A7.5 7.5 0 0 1 4.8 13"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TrashIcon({ size = 24, color = colors.live }: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ArrowLeftIcon({
  size = 24,
  color = colors.primary,
}: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m14.5 5-7 7 7 7M8 12h12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ArrowRightIcon({
  size = 24,
  color = colors.background,
}: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({
  size = 24,
  color = colors.primary,
}: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m6 6 12 12M18 6 6 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MenuIcon({
  size = 24,
  color = colors.primary,
}: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h16M4 12h16M4 17h16"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function TeamIcon({
  size = 24,
  color = colors.primary,
}: CricketIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="8" r="3" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Circle cx="17" cy="9" r="2.3" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Path
        d="M3.5 19v-1.3a5.5 5.5 0 0 1 11 0V19h-11Zm12-5.2a4.4 4.4 0 0 1 5 4.3v.9h-4"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export type DismissalKind =
  | 'bowled'
  | 'caught'
  | 'run-out'
  | 'stumped'
  | 'lbw'
  | 'hit-wicket';

export function DismissalIcon({
  kind,
  size = 34,
  color = colors.primary,
}: CricketIconProps & { kind: DismissalKind }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {kind === 'caught' ? (
        <>
          <Circle cx="16" cy="8" r="4" fill={colors.live} />
          <Path
            d="M8 18c1.5-3 4.2-4.5 8-4.5s6.5 1.5 8 4.5M10 20l-3 4m15-4 3 4m-16-1h16"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M14 6.5c1.4.4 2.2 1.5 2.3 2.9" stroke={colors.background} strokeWidth="0.8" strokeLinecap="round" />
        </>
      ) : kind === 'run-out' ? (
        <>
          <Path
            d="M8 12v13m5-13v13m5-13v13M6.5 12h13M5.5 25h15"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Circle cx="23" cy="8" r="3" fill={colors.live} />
          <Path d="m20 7-3 2m3.4-3.3c1.2.3 2 1.2 2.1 2.5" stroke={colors.background} strokeWidth="0.8" strokeLinecap="round" />
          <Path d="m21 12 4-2m-4 2 1-4m-1 4 4 1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : kind === 'lbw' ? (
        <>
          <Circle cx="17" cy="6" r="3" stroke={color} strokeWidth="2" />
          <Path
            d="m16 10-3 7 4 3-2 7m1-7 5 5m-7-8-5 5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="6" cy="14" r="2.5" fill={colors.live} />
          <Path d="M4.5 13c1 .2 1.6.9 1.7 1.9" stroke={colors.background} strokeWidth="0.7" strokeLinecap="round" />
        </>
      ) : (
        <>
          <Path
            d="M10 10v15m6-15v15m6-15v15M8 10h16M8 25h16"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Circle cx={kind === 'stumped' ? 7 : 25} cy={kind === 'stumped' ? 9 : 7} r="2.7" fill={colors.live} />
          <Path d="m23.5 6.2 1.8 1.6" stroke={colors.background} strokeWidth="0.8" strokeLinecap="round" />
          {kind === 'hit-wicket' ? (
            <Path d="m5 7 3 2m-3 2 3-1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          ) : null}
          {kind === 'bowled' ? (
            <Path d="m23 4 3-2m-2 5 4 1" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
          ) : null}
        </>
      )}
    </Svg>
  );
}
