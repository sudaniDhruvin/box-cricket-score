export type RootStackParamList = {
  Home: undefined;
  Onboarding: undefined;
  MatchDetail: { matchId: string };
  NewMatch: { resumeMatchId?: string };
};
