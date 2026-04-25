import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import mobileAds, { useAppOpenAd } from 'react-native-google-mobile-ads';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { APP_OPEN_AD_UNIT_ID } from './src/config/adUnitIds';
import RootNavigator from './src/navigation';

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

  const hideSplashScreen = useCallback(() => {
    if (splashHiddenRef.current) {
      return;
    }
    splashHiddenRef.current = true;
    BootSplash.hide({ fade: true }).catch(err => {
      console.error('error hiding splash screen', err);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await mobileAds().initialize();
      } catch (e: any) {
        console.error('Google Mobile Ads init failed', e);
      }
      if (!cancelled) {
        loadAppOpenAd();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAppOpenAd]);

  useEffect(() => {
    if (!appOpenLoaded) {
      return;
    }
    showAppOpenAd();
  }, [appOpenLoaded, showAppOpenAd]);

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
    hideSplashScreen();
  }, [appOpenError, hideSplashScreen]);

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider style={styles.container}>
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
