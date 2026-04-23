import type { NavigatorScreenParams } from '@react-navigation/native';

export type OnboardingStackParamList = {
  Onboarding: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  NewMatch: { resumeMatchId?: string };
  MatchDetail: { matchId: string };
  Terms: undefined;
  Privacy: undefined;
};

export type DrawerParamList = {
  /** Stack: home, new match, match detail. */
  Main: NavigatorScreenParams<MainStackParamList>;
};
