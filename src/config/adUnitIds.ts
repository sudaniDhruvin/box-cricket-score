import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/** Test IDs in __DEV__; replace placeholders with real AdMob units for release. */

export const HOME_BANNER_AD_UNIT_IDs = {
  H1: 'ca-app-pub-7085320120847108/2308829093',
  H2: 'ca-app-pub-7085320120847108/8682665755',
  H3: 'ca-app-pub-7085320120847108/3317668756',
};

/** Home empty-state banner: H1 (high) → H2 (medium) → H3 (normal). */
export const HOME_EMPTY_BANNER_AD_UNIT_IDS = __DEV__
  ? [TestIds.BANNER]
  : [
      HOME_BANNER_AD_UNIT_IDs.H1,
      HOME_BANNER_AD_UNIT_IDs.H2,
      HOME_BANNER_AD_UNIT_IDs.H3,
    ];

// H1: ca-app-pub-7085320120847108/6252473767, H2: ca-app-pub-7085320120847108/2313228757

export const BANNER_AD_UNIT_IDs = {
  H1: 'ca-app-pub-7085320120847108/6252473767',
  H2: 'ca-app-pub-7085320120847108/2313228757',
  H3: 'ca-app-pub-7085320120847108/3570078520',
};

/** Sticky bottom banner: H1 (high) → H2 (medium) → H3 (normal). */
export const BANNER_AD_UNIT_IDS = __DEV__
  ? [TestIds.BANNER]
  : [
      BANNER_AD_UNIT_IDs.H1,
      BANNER_AD_UNIT_IDs.H2,
      BANNER_AD_UNIT_IDs.H3,
    ];

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

// H1: ca-app-pub-7085320120847108/3856880335

export const APP_OPEN_AD_UNIT_ID = __DEV__
  ? TestIds.APP_OPEN
  : Platform.select({
      android: 'ca-app-pub-7085320120847108/XXXXXXXX', // TODO: App Open ad unit (Android)
      ios: 'ca-app-pub-7085320120847108/YYYYYYYY', // TODO: App Open ad unit (iOS)
    }) ?? TestIds.APP_OPEN;
