class SpInAppUpdates {
  checkNeedsUpdate = async () => ({ shouldUpdate: false });
  addStatusUpdateListener = () => {};
  startUpdate = async () => {};
  installUpdate = () => {};
}

module.exports = {
  __esModule: true,
  default: SpInAppUpdates,
  IAUInstallStatus: { DOWNLOADED: 11 },
  IAUUpdateKind: { FLEXIBLE: 0, IMMEDIATE: 1 },
};
