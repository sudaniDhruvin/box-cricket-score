import { Platform } from 'react-native';
import SoundPlayer from 'react-native-sound-player';
import type { MatchMomentKind } from './matchEventFeedback';

/** Android res/raw names (no extension in API). */
const SOUND_FILE: Partial<Record<MatchMomentKind, string>> = {
  four: 'evt_four',
  six: 'evt_six',
  wicket: 'evt_wicket',
  'run-out': 'evt_runout',
  wide: 'evt_wide',
  'no-ball': 'evt_noball',
  'free-hit': 'evt_freehit',
  'over-complete': 'evt_milestone',
  'match-complete': 'evt_milestone',
  'innings-break': 'evt_milestone',
};

let lastPlayMs = 0;

export function playMomentSound(kind: MatchMomentKind): void {
  if (Platform.OS !== 'android') {
    return;
  }
  const now = Date.now();
  if (now - lastPlayMs < 120) {
    return;
  }
  lastPlayMs = now;

  const base = SOUND_FILE[kind];
  if (base == null) {
    return;
  }

  try {
    SoundPlayer.playSoundFile(base, 'mp3');
  } catch {
    // Missing asset or audio focus — scoring must never crash.
  }
}
