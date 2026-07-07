import { Alert, Platform } from 'react-native';
import SpInAppUpdates, {
  IAUInstallStatus,
  IAUUpdateKind,
  type AndroidNeedsUpdateResponse,
  type StartUpdateOptions,
  type StatusUpdateEvent,
} from 'sp-react-native-in-app-updates';

const HIGH_PRIORITY_UPDATE = 5;

const inAppUpdates = new SpInAppUpdates(__DEV__);

let statusListenerAttached = false;

type CheckInAppUpdateOptions = {
  notifyWhenUpToDate?: boolean;
};

function shouldSkipInAppUpdateCheck(): boolean {
  // Play Core in-app updates only work on release builds from the store.
  return __DEV__;
}

function isExpectedInAppUpdateFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes('InstallException') ||
    message.includes('Install Error(-6)') ||
    message.includes('ERROR_INSTALL_NOT_ALLOWED') ||
    message.includes('ERROR_APP_NOT_OWNED') ||
    message.includes('ERROR_PLAY_STORE_NOT_FOUND') ||
    message.includes('ERROR_API_NOT_AVAILABLE')
  );
}

function onFlexibleUpdateDownloaded() {
  Alert.alert(
    'Update ready',
    'A new version has been downloaded. Restart the app to install it.',
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Restart',
        onPress: () => inAppUpdates.installUpdate(),
      },
    ],
  );
}

function attachStatusListener() {
  if (statusListenerAttached || Platform.OS !== 'android') {
    return;
  }
  statusListenerAttached = true;

  const listener = (event: StatusUpdateEvent) => {
    if (event.status === IAUInstallStatus.DOWNLOADED) {
      onFlexibleUpdateDownloaded();
    }
  };

  inAppUpdates.addStatusUpdateListener(listener);
}

function getAndroidUpdateType(
  other: AndroidNeedsUpdateResponse['other'],
): typeof IAUUpdateKind.FLEXIBLE | typeof IAUUpdateKind.IMMEDIATE {
  if (
    other.isImmediateUpdateAllowed &&
    other.updatePriority >= HIGH_PRIORITY_UPDATE
  ) {
    return IAUUpdateKind.IMMEDIATE;
  }
  if (other.isFlexibleUpdateAllowed) {
    return IAUUpdateKind.FLEXIBLE;
  }
  if (other.isImmediateUpdateAllowed) {
    return IAUUpdateKind.IMMEDIATE;
  }
  return IAUUpdateKind.FLEXIBLE;
}

function getIosUpdateOptions(): StartUpdateOptions {
  return {
    title: 'Update available',
    message:
      'A new version of Box Cricket Scorer is available on the App Store.',
    buttonUpgradeText: 'Update',
    buttonCancelText: 'Not now',
  };
}

export async function checkInAppUpdate(
  options: CheckInAppUpdateOptions = {},
): Promise<void> {
  if (shouldSkipInAppUpdateCheck()) {
    if (options.notifyWhenUpToDate) {
      Alert.alert(
        'Not available in development',
        'In-app updates only work in release builds installed from the Play Store or App Store.',
      );
    }
    return;
  }

  try {
    const result = await inAppUpdates.checkNeedsUpdate();

    if (!result.shouldUpdate) {
      if (options.notifyWhenUpToDate) {
        Alert.alert('Up to date', 'You are using the latest version.');
      }
      return;
    }

    if (Platform.OS === 'android') {
      const androidResult = result as AndroidNeedsUpdateResponse;
      const updateType = getAndroidUpdateType(androidResult.other);

      if (updateType === IAUUpdateKind.FLEXIBLE) {
        attachStatusListener();
      }

      await inAppUpdates.startUpdate({ updateType });
      return;
    }

    await inAppUpdates.startUpdate(getIosUpdateOptions());
  } catch (error) {
    if (isExpectedInAppUpdateFailure(error)) {
      if (options.notifyWhenUpToDate) {
        Alert.alert(
          'Update unavailable',
          'Updates can only be checked on production builds installed from the app store.',
        );
      }
      return;
    }

    console.error('In-app update check failed', error);
    if (options.notifyWhenUpToDate) {
      Alert.alert(
        'Update check failed',
        'Unable to check for updates right now. Please try again later.',
      );
    }
  }
}
