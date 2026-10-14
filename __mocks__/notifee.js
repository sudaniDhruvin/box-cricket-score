const notifee = {
  createChannel: async () => 'crick-shots',
  displayNotification: async () => '1',
  requestPermission: async () => ({ authorizationStatus: 1 }),
  onForegroundEvent: () => () => {},
  onBackgroundEvent: () => {},
};

module.exports = {
  __esModule: true,
  default: notifee,
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
};
