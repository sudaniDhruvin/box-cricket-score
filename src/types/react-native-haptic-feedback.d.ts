declare module 'react-native-haptic-feedback' {
  export enum HapticFeedbackTypes {
    selection = 'selection',
    impactLight = 'impactLight',
    impactMedium = 'impactMedium',
    impactHeavy = 'impactHeavy',
    rigid = 'rigid',
    soft = 'soft',
    notificationSuccess = 'notificationSuccess',
    notificationWarning = 'notificationWarning',
    notificationError = 'notificationError',
  }

  export interface HapticOptions {
    enableVibrateFallback?: boolean;
    ignoreAndroidSystemSettings?: boolean;
  }

  interface HapticFeedbackModule {
    trigger(type: HapticFeedbackTypes | string, options?: HapticOptions): void;
  }

  const ReactNativeHapticFeedback: HapticFeedbackModule;
  export default ReactNativeHapticFeedback;
}
