import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/** Test IDs in __DEV__; replace placeholders with real AdMob units for release. */
export const BANNER_AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : Platform.select({
      android: 'ca-app-pub-7085320120847108/3570078520', // TODO: Banner (Android)
    }) ?? TestIds.BANNER;

export const NATIVE_AD_UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : Platform.select({
      android: 'ca-app-pub-7085320120847108/3733730051', // TODO: Native (Android)
    }) ?? TestIds.NATIVE;

export const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.select({
      android: 'ca-app-pub-7085320120847108/3218724737', // TODO: Interstitial (Android)
    }) ?? TestIds.INTERSTITIAL;

export const APP_OPEN_AD_UNIT_ID = __DEV__
  ? TestIds.APP_OPEN
  : Platform.select({
      android: 'ca-app-pub-7085320120847108/XXXXXXXX', // TODO: App Open ad unit (Android)
      ios: 'ca-app-pub-7085320120847108/YYYYYYYY', // TODO: App Open ad unit (iOS)
    }) ?? TestIds.APP_OPEN;
