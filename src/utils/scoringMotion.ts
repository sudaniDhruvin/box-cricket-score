import { LayoutAnimation, Platform, UIManager } from 'react-native';

export type { MatchMomentKind } from './matchEventFeedback';
export {
  momentKindForDelivery,
  playMatchMoment,
} from './matchEventFeedback';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LAYOUT_SPRING = {
  duration: 220,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.spring,
    springDamping: 0.86,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

const LAYOUT_FAST = {
  duration: 120,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

/** Spring for big moments; short ease for routine balls so rapid taps stay snappy. */
export function animateScoringLayout(impactful = true): void {
  LayoutAnimation.configureNext(impactful ? LAYOUT_SPRING : LAYOUT_FAST);
}
