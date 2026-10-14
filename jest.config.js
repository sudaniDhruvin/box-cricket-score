const preset = require('@react-native/jest-preset/jest-preset');

module.exports = {
  ...preset,
  setupFilesAfterEnv: [
    ...(preset.setupFilesAfterEnv || []),
    '<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-responsive-fontsize|react-native-responsive-screen|react-native-iphone-x-helper|@react-navigation|react-native-screens|react-native-drawer-layout)/)',
  ],
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^react-native-mmkv$': '<rootDir>/__mocks__/react-native-mmkv.js',
    '^@sayem314/react-native-keep-awake$': '<rootDir>/__mocks__/react-native-keep-awake.js',
    '^react-native-bootsplash$': '<rootDir>/__mocks__/react-native-bootsplash.js',
    '^react-native-google-mobile-ads$': '<rootDir>/__mocks__/react-native-google-mobile-ads.js',
    '^sp-react-native-in-app-updates$': '<rootDir>/__mocks__/sp-react-native-in-app-updates.js',
    '^@react-native-firebase/remote-config$': '<rootDir>/__mocks__/firebase-remote-config.js',
    '^@react-native-firebase/messaging$': '<rootDir>/__mocks__/firebase-messaging.js',
    '^@notifee/react-native$': '<rootDir>/__mocks__/notifee.js',
  },
};
