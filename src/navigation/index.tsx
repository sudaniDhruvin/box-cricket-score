import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ToastHost } from '../components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeatherTabIcon } from '../components/ui/FeatherIcon';

import { CustomDrawerContent } from './CustomDrawerContent';
import { AppRuntimeContext, useAppRuntime, type AppMode } from './AppRuntimeContext';
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
import { CompleteProfileScreen } from '../screens/CompleteProfileScreen';
import { getMyProfile, type PlayerProfile } from '../api/client';
import { syncPushRegistration } from '../notifications/push';
import { clearAccessToken } from '../api/session';
import { isProfileComplete } from '../social/labels';
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
  const insets = useSafeAreaInsets();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkSecondary,
        tabBarLabelStyle: { fontSize: fontSize(11), fontWeight: '600', marginTop: hp(0.2) },
        tabBarItemStyle: { paddingVertical: hp(0.3) },
        tabBarStyle: {
          height: hp(7.6) + insets.bottom,
          paddingTop: hp(0.7),
          paddingBottom: Math.max(insets.bottom, hp(0.6)),
          backgroundColor: colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 12,
          shadowColor: '#000000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
      }}
    >
      <Tabs.Screen
        name="Matches"
        component={StatsMatchesNavigator}
        options={{ title: 'Matches', tabBarIcon: ({ color }) => <FeatherTabIcon name="home" color={color} /> }}
      />
      <Tabs.Screen
        name="Stats"
        component={StatsDashboardScreen}
        options={{ title: 'Stats', tabBarIcon: ({ color }) => <FeatherTabIcon name="bar-chart-2" color={color} /> }}
      />
      <Tabs.Screen
        name="Groups"
        component={CommunityScreen}
        options={{ title: 'Groups', tabBarIcon: ({ color }) => <FeatherTabIcon name="users" color={color} /> }}
      />
      <Tabs.Screen
        name="Profile"
        component={AccountScreen}
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <FeatherTabIcon name="user" color={color} /> }}
      />
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
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  navigator: { flex: 1 },
});

function StatsEntry() {
  const { setAuthenticated } = useAppRuntime();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(() => {
    setReady(false);
    getMyProfile()
      .then(next => {
        setProfile(next);
        setReady(true);
        void syncPushRegistration();
      })
      .catch(() => {
        clearAccessToken();
        setAuthenticated(false);
      });
  }, [setAuthenticated]);

  useEffect(() => { load(); }, [load]);

  if (!ready || !profile) {
    return (
      <View style={styles.gate}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!isProfileComplete(profile)) {
    return <CompleteProfileScreen profile={profile} onComplete={next => setProfile(next)} />;
  }
  return <StatsTabsNavigator />;
}

const RootNavigator = () => {
  const hasCompletedOnboarding = useUserStore(s => s.hasCompletedOnboarding);
  const [mode, selectMode] = useState<AppMode | null>(null);
  const [authenticated, setAuthenticated] = useState(() => Boolean(getAccessToken()));

  return (
    <AppRuntimeContext.Provider value={{ mode, selectMode, authenticated, setAuthenticated }}>
      <View style={styles.navigator}>
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
          <StatsEntry />
        ) : (
          <GoogleSignInScreen />
        )}
      </NavigationContainer>
      <ToastHost />
      </View>
    </AppRuntimeContext.Provider>
  );
};

export default RootNavigator;
