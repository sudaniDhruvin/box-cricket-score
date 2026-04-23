import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { CustomDrawerContent } from './CustomDrawerContent';
import { HomeScreen } from '../screens/HomeScreen';
import { MatchDetailScreen } from '../screens/MatchDetailScreen';
import { NewMatchScreen } from '../screens/NewMatchScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PrivacyScreen, TermsScreen } from '../screens/LegalInfoScreen';
import { useUserStore } from '../store/useUserStore';
import { wp } from '../utils';
import type {
  DrawerParamList,
  MainStackParamList,
  OnboardingStackParamList,
} from './types';

const OnboardingStack =
  createNativeStackNavigator<OnboardingStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

const MainStackNavigator = () => (
  <MainStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <MainStack.Screen name="Home" component={HomeScreen} />
    <MainStack.Screen name="NewMatch" component={NewMatchScreen} />
    <MainStack.Screen name="MatchDetail" component={MatchDetailScreen} />
    <MainStack.Screen name="Terms" component={TermsScreen} />
    <MainStack.Screen name="Privacy" component={PrivacyScreen} />
  </MainStack.Navigator>
);

const RootNavigator = () => {
  const hasCompletedOnboarding = useUserStore(s => s.hasCompletedOnboarding);
  return (
    <NavigationContainer>
      {!hasCompletedOnboarding ? (
        <OnboardingStack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <OnboardingStack.Screen
            name="Onboarding"
            component={OnboardingScreen}
          />
        </OnboardingStack.Navigator>
      ) : (
        <Drawer.Navigator
          drawerContent={CustomDrawerContent}
          screenOptions={{
            headerShown: false,
            drawerType: 'front',
            overlayColor: 'rgba(0,0,0,0.45)',
            swipeEnabled: true,
            swipeEdgeWidth: 56,
            drawerStyle: { width: wp(86) },
          }}
        >
          <Drawer.Screen
            name="Main"
            component={MainStackNavigator}
            options={{
              title: 'Matches',
            }}
          />
        </Drawer.Navigator>
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
