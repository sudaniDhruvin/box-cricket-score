import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { CustomDrawerContent } from './CustomDrawerContent';
import { AppRuntimeContext, type AppMode } from './AppRuntimeContext';
import { HomeScreen } from '../screens/HomeScreen';
import { LiveSpectatorScreen } from '../screens/LiveSpectatorScreen';
import { MatchDetailScreen } from '../screens/MatchDetailScreen';
import { NewMatchScreen } from '../screens/NewMatchScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PrivacyScreen, TermsScreen } from '../screens/LegalInfoScreen';
import { ScanToWatchScreen } from '../screens/ScanToWatchScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { CommunityScreen } from '../screens/CommunityScreen';
import { GoogleSignInScreen } from '../screens/GoogleSignInScreen';
import { ModeSelectionScreen } from '../screens/ModeSelectionScreen';
import { StatsDashboardScreen } from '../screens/StatsDashboardScreen';
import { useUserStore } from '../store/useUserStore';
import { getAccessToken } from '../api/session';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';
import type {
  DrawerParamList,
  MainStackParamList,
  OnboardingStackParamList,
  StatsTabParamList,
} from './types';

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();
const Tabs = createBottomTabNavigator<StatsTabParamList>();
const hiddenTabOptions = {
  tabBarButton: () => null,
  tabBarItemStyle: { display: 'none' as const },
};

type TabIconProps = { focused: boolean; color: string; size: number };
function MatchesTabIcon({ focused }: TabIconProps) {
  return <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>🏏</Text>;
}
function StatsTabIcon({ focused }: TabIconProps) {
  return <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>📊</Text>;
}
function GroupsTabIcon({ focused }: TabIconProps) {
  return <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>👥</Text>;
}
function ProfileTabIcon({ focused }: TabIconProps) {
  return <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>👤</Text>;
}

const QuickMainStack = () => <MainStackNavigator showConnectedScreens={false} />;

function MainStackNavigator({ showConnectedScreens = true }: { showConnectedScreens?: boolean }) {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="Home" component={HomeScreen} />
      <MainStack.Screen name="NewMatch" component={NewMatchScreen} />
      <MainStack.Screen name="MatchDetail" component={MatchDetailScreen} />
      <MainStack.Screen name="Terms" component={TermsScreen} />
      <MainStack.Screen name="Privacy" component={PrivacyScreen} />
      <MainStack.Screen name="ScanToWatch" component={ScanToWatchScreen} />
      <MainStack.Screen name="LiveSpectator" component={LiveSpectatorScreen} />
      {showConnectedScreens ? (
        <>
          <MainStack.Screen name="Account" component={AccountScreen} />
          <MainStack.Screen name="Community" component={CommunityScreen} />
        </>
      ) : null}
    </MainStack.Navigator>
  );
}

function QuickModeNavigator() {
  return (
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
        component={QuickMainStack}
        options={{ title: 'Quick Mode' }}
      />
    </Drawer.Navigator>
  );
}

function StatsMatchesNavigator() {
  return (
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
      <Drawer.Screen name="Main" component={MainStackNavigator} options={{ title: 'Matches' }} />
    </Drawer.Navigator>
  );
}

function StatsTabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: fontSize(10), fontWeight: '700' },
        tabBarStyle: {
          // height: hp(7.4),
          // paddingTop: hp(0.8),
          // paddingBottom: hp(0.8),
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        },
      }}
    >
      <Tabs.Screen name="Matches" component={StatsMatchesNavigator} options={{ title: 'Matches', tabBarIcon: MatchesTabIcon }} />
      <Tabs.Screen name="Stats" component={StatsDashboardScreen} options={{ title: 'Stats', tabBarIcon: StatsTabIcon }} />
      <Tabs.Screen name="Groups" component={CommunityScreen} options={{ title: 'Groups', tabBarIcon: GroupsTabIcon }} />
      <Tabs.Screen name="Profile" component={AccountScreen} options={{ title: 'Profile', tabBarIcon: ProfileTabIcon }} />
      <Tabs.Screen name="Community" component={CommunityScreen} options={{ ...hiddenTabOptions, title: 'Community' }} />
      <Tabs.Screen name="Account" component={AccountScreen} options={{ ...hiddenTabOptions, title: 'Account' }} />
      <Tabs.Screen name="NewMatch" component={NewMatchScreen} options={{ ...hiddenTabOptions, title: 'New match' }} />
      <Tabs.Screen name="MatchDetail" component={MatchDetailScreen} options={{ ...hiddenTabOptions, title: 'Match details' }} />
      <Tabs.Screen name="Terms" component={TermsScreen} options={{ ...hiddenTabOptions, title: 'Terms' }} />
      <Tabs.Screen name="Privacy" component={PrivacyScreen} options={{ ...hiddenTabOptions, title: 'Privacy' }} />
      <Tabs.Screen name="ScanToWatch" component={ScanToWatchScreen} options={{ ...hiddenTabOptions, title: 'Watch live' }} />
      <Tabs.Screen name="LiveSpectator" component={LiveSpectatorScreen} options={{ ...hiddenTabOptions, title: 'Live score' }} />
    </Tabs.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: { fontSize: fontSize(19), opacity: 0.55 },
  tabIconFocused: { opacity: 1 },
});

const RootNavigator = () => {
  const hasCompletedOnboarding = useUserStore(s => s.hasCompletedOnboarding);
  const [mode, selectMode] = useState<AppMode | null>(null);
  const [authenticated, setAuthenticated] = useState(() => Boolean(getAccessToken()));

  return (
    <AppRuntimeContext.Provider value={{ mode, selectMode, authenticated, setAuthenticated }}>
      <NavigationContainer key={mode ?? 'mode-selection'}>
        {mode === null ? (
          <ModeSelectionScreen onSelect={selectMode} />
        ) : mode === 'quick' ? (
          hasCompletedOnboarding ? (
            <QuickModeNavigator />
          ) : (
            <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
              <OnboardingStack.Screen name="Onboarding" component={OnboardingScreen} />
            </OnboardingStack.Navigator>
          )
        ) : authenticated ? (
          <StatsTabsNavigator />
        ) : (
          <GoogleSignInScreen />
        )}
      </NavigationContainer>
    </AppRuntimeContext.Provider>
  );
};

export default RootNavigator;
