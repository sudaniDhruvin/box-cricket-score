const mockRemoteConfig = () => ({
  setConfigSettings: async () => {},
  setDefaults: async () => {},
  fetchAndActivate: async () => false,
  getValue: () => ({
    asString: () => JSON.stringify({
      isAds: false,
      isHomeBanner: false,
      isBanner: false,
      isOpenApp: false,
      isInter: false,
      isNative: false,
    }),
  }),
});

module.exports = { __esModule: true, default: mockRemoteConfig };
