declare module 'react-native-sound-player' {
  import type { EmitterSubscription } from 'react-native';

  export type SoundPlayerEvent =
    | 'OnSetupError'
    | 'FinishedLoading'
    | 'FinishedPlaying'
    | 'FinishedLoadingURL'
    | 'FinishedLoadingFile';

  export type SoundPlayerEventData = {
    success?: boolean;
    url?: string;
    name?: string;
    type?: string;
  };

  interface SoundPlayerType {
    playSoundFile: (name: string, type: string) => void;
    playSoundFileWithDelay: (name: string, type: string, delay: number) => void;
    stop: () => void;
    addEventListener: (
      eventName: SoundPlayerEvent,
      callback: (data: SoundPlayerEventData) => void,
    ) => EmitterSubscription;
  }

  const SoundPlayer: SoundPlayerType;
  export default SoundPlayer;
}
