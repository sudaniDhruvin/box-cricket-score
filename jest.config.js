const preset = require('@react-native/jest-preset/jest-preset');

module.exports = {
  ...preset,
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-responsive-fontsize|react-native-responsive-screen|react-native-iphone-x-helper|@react-navigation|react-native-screens)/)',
  ],
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^react-native-mmkv$': '<rootDir>/__mocks__/react-native-mmkv.js',
  },
};
