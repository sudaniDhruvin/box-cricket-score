import type { NavigatorScreenParams } from '@react-navigation/native';
import type { LiveShareJoinPayload } from '../liveShare/protocol';

export type OnboardingStackParamList = {
  Onboarding: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  NewMatch: { resumeMatchId?: string };
  MatchDetail: { matchId: string };
  Terms: undefined;
  Privacy: undefined;
  ScanToWatch: { prefillError?: string } | undefined;
  LiveSpectator: { joinPayload: LiveShareJoinPayload };
};

export type DrawerParamList = {
  /** Stack: home, new match, match detail. */
  Main: NavigatorScreenParams<MainStackParamList>;
};
