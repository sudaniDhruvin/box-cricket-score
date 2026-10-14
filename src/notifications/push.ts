import notifee, { AndroidImportance } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { registerPushDevice, unregisterPushDevice } from '../api/client';
import { getAccessToken } from '../api/session';

const CHANNEL_ID = 'crick-shots';

export type PushMessage = {
  notification?: { title?: string; body?: string } | null;
  data?: { [key: string]: string | object | undefined };
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Title and body from a notification payload, then from data fields of the same names. */
export function pushCopy(message: PushMessage): { title: string; body: string } | null {
  const title = text(message.notification?.title) || text(message.data?.title);
  const body = text(message.notification?.body) || text(message.data?.body);
  if (!title && !body) return null;
  return { title: title || 'Crick Shots', body };
}

/**
 * A notification payload is already shown by the system while the app is not in front.
 * Data-only messages are not, so those are drawn here.
 */
export function shouldDisplayInBackground(message: PushMessage): boolean {
  const shownBySystem = Boolean(text(message.notification?.title) || text(message.notification?.body));
  return !shownBySystem && pushCopy(message) !== null;
}

let chain: Promise<void> = Promise.resolve();
let lastRegistration = '';

function enqueue(task: () => Promise<void>): Promise<void> {
  const run = chain.then(task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function platformName(): 'android' | 'ios' | null {
  if (Platform.OS === 'android' || Platform.OS === 'ios') return Platform.OS;
  return null;
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Crick Shots',
    importance: AndroidImportance.HIGH,
  });
}

async function showPush(message: PushMessage): Promise<void> {
  const copy = pushCopy(message);
  if (!copy) return;
  await ensureChannel();
  await notifee.displayNotification({
    title: copy.title,
    body: copy.body,
    android: {
      channelId: CHANNEL_ID,
      pressAction: { id: 'default' },
    },
  });
}

async function publishRegistration(registration: string): Promise<void> {
  const platform = platformName();
  if (!platform || !getAccessToken() || !registration) return;
  lastRegistration = registration;
  await registerPushDevice(registration, platform);
}

export function syncPushRegistration(): Promise<void> {
  return enqueue(async () => {
    if (!getAccessToken()) return;
    const platform = platformName();
    if (!platform) return;
    try {
      await ensureChannel();
      await notifee.requestPermission();
      await messaging().requestPermission();
      if (platform === 'ios' && !messaging().isDeviceRegisteredForRemoteMessages) {
        await messaging().registerDeviceForRemoteMessages();
      }
      const registration = await messaging().getToken();
      await publishRegistration(registration);
    } catch {
      // Tried again the next time this player is signed in.
    }
  });
}

export function clearPushRegistration(): Promise<void> {
  return enqueue(async () => {
    let registration = lastRegistration;
    lastRegistration = '';
    if (!registration) {
      try {
        registration = await messaging().getToken();
      } catch {
        registration = '';
      }
    }
    if (registration && getAccessToken()) {
      try {
        await unregisterPushDevice(registration);
      } catch {
        // Sign-out still continues when the registration cannot be removed.
      }
    }
    try {
      await messaging().deleteToken();
    } catch {
      // The next sign-in asks for a new registration.
    }
  });
}

/** Foreground and active-app messages. The system does not draw these itself. */
export function startPushListeners(): () => void {
  void ensureChannel().catch(() => undefined);
  const unsubMessage = messaging().onMessage(async message => {
    await showPush(message);
  });
  const unsubRefresh = messaging().onTokenRefresh(registration => {
    void enqueue(async () => {
      try {
        await publishRegistration(registration);
      } catch {
        // The next sign-in sends the replacement.
      }
    });
  });
  const unsubForeground = notifee.onForegroundEvent(() => undefined);
  return () => {
    unsubMessage();
    unsubRefresh();
    unsubForeground();
  };
}

let backgroundRegistered = false;

/** Registered from index.js so a living background process can draw data-only messages. */
export function registerPushBackground(): void {
  if (backgroundRegistered) return;
  backgroundRegistered = true;
  messaging().setBackgroundMessageHandler(async message => {
    if (!shouldDisplayInBackground(message)) return;
    await showPush(message);
  });
  notifee.onBackgroundEvent(async () => undefined);
}
