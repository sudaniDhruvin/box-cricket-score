import { Platform } from 'react-native';
import SoundPlayer from 'react-native-sound-player';

/** Coin-on-table clip in android/app/src/main/res/raw/toss_coin_land.mp3 */
const TOSS_FLIP = 'toss_coin_land';

/** Plays when the user taps Flip coin (start of the toss animation). */
export function playTossFlipSound(): void {
  if (Platform.OS !== 'android') {
    return;
  }
  // Defer so press handling finishes first — helps audio focus on Android.
  setTimeout(() => {
    try {
      SoundPlayer.stop();
      SoundPlayer.playSoundFile(TOSS_FLIP, 'mp3');
    } catch {
      // Missing asset or audio focus — toss must never crash.
    }
  }, 0);
}

export function stopTossFlipSound(): void {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    SoundPlayer.stop();
  } catch {
    // ignore
  }
}
