const messaging = () => ({
  requestPermission: async () => 1,
  getToken: async () => 'test-registration',
  deleteToken: async () => {},
  onMessage: () => () => {},
  onTokenRefresh: () => () => {},
  setBackgroundMessageHandler: () => {},
  registerDeviceForRemoteMessages: async () => {},
  isDeviceRegisteredForRemoteMessages: true,
});

module.exports = { __esModule: true, default: messaging };
