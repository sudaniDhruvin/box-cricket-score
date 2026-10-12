import React from 'react';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { wp } from '../../utils';

type IconProps = {
  size?: number;
  color?: string;
};

const DEFAULT_SIZE = () => wp(5.2);

export function ShareIcon({
  size = DEFAULT_SIZE(),
  color = colors.primary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="18" cy="5" r="3" stroke={color} strokeWidth="2" />
      <Circle cx="6" cy="12" r="3" stroke={color} strokeWidth="2" />
      <Circle cx="18" cy="19" r="3" stroke={color} strokeWidth="2" />
      <Line
        x1="8.59"
        y1="13.51"
        x2="15.42"
        y2="17.49"
        stroke={color}
        strokeWidth="2"
      />
      <Line
        x1="15.41"
        y1="6.51"
        x2="8.59"
        y2="10.49"
        stroke={color}
        strokeWidth="2"
      />
    </Svg>
  );
}

export function UndoIcon({
  size = DEFAULT_SIZE(),
  color = colors.primary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 14L4 9l5-5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 9h10a6 6 0 010 12h-3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function EditIcon({
  size = DEFAULT_SIZE(),
  color = colors.primary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20h9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function WideIcon({
  size = DEFAULT_SIZE(),
  color = colors.ballWideExtra,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line
        x1="4.5"
        y1="10"
        x2="4.5"
        y2="20"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Line
        x1="8"
        y1="10"
        x2="8"
        y2="20"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Line
        x1="11.5"
        y1="10"
        x2="11.5"
        y2="20"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Line
        x1="3.6"
        y1="10"
        x2="12.4"
        y2="10"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Circle cx="18.2" cy="7.2" r="3.1" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

export function NoBallIcon({
  size = DEFAULT_SIZE(),
  color = colors.ballNoBallRuns,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2" />
      <Line
        x1="7.2"
        y1="16.8"
        x2="16.8"
        y2="7.2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LegByeIcon({
  size = DEFAULT_SIZE(),
  color = colors.text,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3.5"
        y="3.5"
        width="9"
        height="17"
        rx="3.2"
        stroke={color}
        strokeWidth="1.8"
      />
      <Circle cx="17.6" cy="16.2" r="3" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

export function ChevronRightIcon({
  size = DEFAULT_SIZE(),
  color = colors.background,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="9 18 15 12 9 6"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
