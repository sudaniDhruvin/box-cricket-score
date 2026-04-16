import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { MatchDetailScreen } from '../screens/MatchDetailScreen';
import { NewMatchScreen } from '../screens/NewMatchScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { useUserStore } from '../store/useUserStore';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const hasCompletedOnboarding = useUserStore(s => s.hasCompletedOnboarding);
  console.log('hasCompletedOnboarding', hasCompletedOnboarding);
  return (
    <NavigationContainer>
      {!hasCompletedOnboarding ? (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="NewMatch" component={NewMatchScreen} />
          <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
