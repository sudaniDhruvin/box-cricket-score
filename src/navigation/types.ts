import type { NavigatorScreenParams } from '@react-navigation/native';
import type { LiveShareJoinPayload } from '../liveShare/protocol';

export type OnboardingStackParamList = {
  Onboarding: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  NewMatch: {
    resumeMatchId?: string;
    groupLaunch?: {
      groupId: number;
      clientId: string;
      teams: [string, string];
      oversPerSide: number;
      teamSize: number;
      scheduledAt?: string;
      scorerUserId?: number;
      squads?: [
        { players: Array<{ userId: number; name: string }> },
        { players: Array<{ userId: number; name: string }> },
      ];
    };
  };
  MatchDetail: { matchId: string };
  Terms: undefined;
  Privacy: undefined;
  ScanToWatch: { prefillError?: string } | undefined;
  LiveSpectator: { joinPayload: LiveShareJoinPayload };
  Account: undefined;
  Community: undefined;
};

export type DrawerParamList = {
  /** Stack: home, new match, match detail. */
  Main: NavigatorScreenParams<MainStackParamList>;
};

/** Stats mode tabs plus routes that community and match screens can push. */
export type StatsTabParamList = {
  Matches: undefined;
  Stats: undefined;
  Groups: undefined;
  Profile: undefined;
  Account: undefined;
  Community: undefined;
  NewMatch: MainStackParamList['NewMatch'];
  MatchDetail: MainStackParamList['MatchDetail'];
  Terms: undefined;
  Privacy: undefined;
  ScanToWatch: MainStackParamList['ScanToWatch'];
  LiveSpectator: MainStackParamList['LiveSpectator'];
};
