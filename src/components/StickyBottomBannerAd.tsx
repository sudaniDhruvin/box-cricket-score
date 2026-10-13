import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_IDS } from '../config/adUnitIds';
import { useAdFlags } from '../hooks/useAdFlags';

type StickyBottomBannerAdProps = {
  /** Fired when a banner is on screen, and again when it is removed. */
  onVisibilityChange?: (visible: boolean) => void;
};

/**
 * Standard 320×50 banner for sticky placement at the bottom of a screen.
 * Tries H1 (high) → H2 (medium) → H3 (normal).
 * The slot stays collapsed until an ad has loaded, so a failed request
 * does not leave an empty strip.
 */
export function StickyBottomBannerAd({
  onVisibilityChange,
}: StickyBottomBannerAdProps) {
  const { isBanner, isAds } = useAdFlags();
  const [adIndex, setAdIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const unitId = useMemo(() => BANNER_AD_UNIT_IDS[adIndex], [adIndex]);
  const enabled = isAds && isBanner && !exhausted && unitId != null;

  useEffect(() => {
    if (!enabled) {
      onVisibilityChange?.(false);
    }
  }, [enabled, onVisibilityChange]);

  const handleAdLoaded = useCallback(() => {
    setLoaded(true);
    onVisibilityChange?.(true);
  }, [onVisibilityChange]);

  const handleAdFailedToLoad = useCallback(() => {
    setLoaded(false);
    onVisibilityChange?.(false);
    setAdIndex(current => {
      const next = current + 1;
      if (next < BANNER_AD_UNIT_IDS.length) {
        return next;
      }
      setExhausted(true);
      return current;
    });
  }, [onVisibilityChange]);

  if (!enabled || unitId == null) {
    return null;
  }

  return (
    <View
      collapsable={false}
      pointerEvents={loaded ? 'auto' : 'none'}
      accessibilityElementsHidden={!loaded}
      importantForAccessibility={loaded ? 'auto' : 'no-hide-descendants'}
      style={loaded ? styles.wrap : styles.hidden}
      accessibilityLabel={loaded ? 'Advertisement' : undefined}>
      <BannerAd
        key={unitId}
        unitId={unitId}
        size={BannerAdSize.BANNER}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
  hidden: {
    height: 0,
    overflow: 'hidden',
  },
});
