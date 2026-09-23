import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import React, { useCallback, useEffect, useRef } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import mobileAds, { useAppOpenAd } from 'react-native-google-mobile-ads';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { checkInAppUpdate } from './src/config/checkInAppUpdate';
import { initializeAdRemoteConfig } from './src/config/fetchAdRemoteConfig';
import { APP_OPEN_AD_UNIT_ID } from './src/config/adUnitIds';
import { getAdFlags } from './src/store/useAdConfigStore';
import RootNavigator from './src/navigation';

/**
 * Cold-start wait for App Open. If the ad isn't ready by then, skip it so
 * users aren't stuck on splash — but only abandon AFTER this timeout.
 */
const APP_OPEN_LOAD_TIMEOUT_MS = 8000;

const App = () => {
  useKeepAwake();
  const {
    load: loadAppOpenAd,
    show: showAppOpenAd,
    isLoaded: appOpenLoaded,
    isClosed: appOpenClosed,
    error: appOpenError,
  } = useAppOpenAd(APP_OPEN_AD_UNIT_ID);

  const splashHiddenRef = useRef(false);
  /** Still eligible to show a cold-start App Open (not timed out / not shown). */
  const coldStartPendingRef = useRef(false);
  const appOpenShownRef = useRef(false);

  const hideSplashScreen = useCallback(() => {
    if (splashHiddenRef.current) {
      return;
    }
    splashHiddenRef.current = true;
    BootSplash.hide({ fade: true }).catch(err => {
      console.error('error hiding splash screen', err);
    });
  }, []);

  const abandonColdStartAppOpen = useCallback(() => {
    coldStartPendingRef.current = false;
    hideSplashScreen();
  }, [hideSplashScreen]);

  useEffect(() => {
    let cancelled = false;
    let loadTimeout: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        await initializeAdRemoteConfig();
        const flags = getAdFlags();
        if (__DEV__) {
          console.log('[Ads] flags', flags, 'appOpenUnit', APP_OPEN_AD_UNIT_ID);
        }
        if (flags.isAds) {
          await mobileAds().initialize();
        }
      } catch (e: unknown) {
        console.error('App startup init failed', e);
      }
      if (cancelled) {
        return;
      }
      checkInAppUpdate();

      const flags = getAdFlags();
      if (flags.isAds && flags.isOpenApp) {
        coldStartPendingRef.current = true;
        loadAppOpenAd();
        loadTimeout = setTimeout(() => {
          if (!appOpenShownRef.current) {
            console.warn(
              '[Ads] App Open load timed out — continuing without it',
            );
            abandonColdStartAppOpen();
          }
        }, APP_OPEN_LOAD_TIMEOUT_MS);
      } else {
        if (__DEV__ && flags.isAds && !flags.isOpenApp) {
          console.warn(
            '[Ads] isOpenApp is false in Remote Config — App Open skipped',
          );
        }
        hideSplashScreen();
      }
    })();

    return () => {
      cancelled = true;
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };
  }, [loadAppOpenAd, hideSplashScreen, abandonColdStartAppOpen]);

  // AdMob cold-start pattern: keep splash until loaded, then show ad.
  // Do NOT gate on splashHiddenRef — that previously blocked late loads.
  useEffect(() => {
    if (!appOpenLoaded) {
      return;
    }
    if (!coldStartPendingRef.current || appOpenShownRef.current) {
      return;
    }

    appOpenShownRef.current = true;
    coldStartPendingRef.current = false;

    // Let the activity settle briefly so AdMob can present over the splash.
    const showTimer = setTimeout(() => {
      try {
        showAppOpenAd();
      } catch (e) {
        console.error('[Ads] App Open show failed', e);
        hideSplashScreen();
      }
    }, 150);

    return () => clearTimeout(showTimer);
  }, [appOpenLoaded, showAppOpenAd, hideSplashScreen]);

  useEffect(() => {
    if (!appOpenClosed) {
      return;
    }
    hideSplashScreen();
  }, [appOpenClosed, hideSplashScreen]);

  useEffect(() => {
    if (!appOpenError) {
      return;
    }
    console.warn('[Ads] App Open error', appOpenError);
    abandonColdStartAppOpen();
  }, [appOpenError, abandonColdStartAppOpen]);

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
