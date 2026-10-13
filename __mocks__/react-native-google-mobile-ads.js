const NativeComponent = () => null;
const adHook = () => ({
  load: () => {},
  show: () => {},
  isLoaded: false,
  isClosed: false,
  error: null,
});
const MobileAds = () => ({ initialize: () => Promise.resolve([]) });

module.exports = {
  __esModule: true,
  default: MobileAds,
  BannerAd: NativeComponent,
  BannerAdSize: { BANNER: 'BANNER', LARGE_BANNER: 'LARGE_BANNER' },
  NativeAd: { createForAdRequest: () => Promise.reject(new Error('Ads disabled in Jest')) },
  NativeAdView: NativeComponent,
  NativeAsset: NativeComponent,
  NativeAssetType: { ICON: 'ICON', HEADLINE: 'HEADLINE', BODY: 'BODY', CALL_TO_ACTION: 'CALL_TO_ACTION' },
  NativeMediaView: NativeComponent,
  TestIds: { BANNER: 'test-banner', NATIVE: 'test-native', INTERSTITIAL: 'test-interstitial', APP_OPEN: 'test-app-open' },
  useAppOpenAd: adHook,
  useInterstitialAd: adHook,
};
