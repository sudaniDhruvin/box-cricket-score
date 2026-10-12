export const GOLDEN_RATIO = 1.618;

export const GOLDEN_SPLIT = {
  primary: 1 / GOLDEN_RATIO,
  secondary: 1 - 1 / GOLDEN_RATIO,
} as const;

/** A compact spacing scale approximating powers of the golden ratio. */
export const GOLDEN_SPACING = {
  xxs: 4,
  xs: 6,
  sm: 10,
  md: 16,
  lg: 26,
  xl: 42,
} as const;
