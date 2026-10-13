import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { HOME_EMPTY_BANNER_AD_UNIT_IDS } from '../config/adUnitIds';
import { useAdFlags } from '../hooks/useAdFlags';
import { hp } from '../utils';

/**
 * Banner shown on Home when the user has no saved matches.
 * Tries H1 (high) → H2 (medium) → H3 (normal) until one loads.
 * Nothing is reserved until an ad is on screen.
 */
export function HomeEmptyBannerAd() {
  const { isHomeBanner, isAds } = useAdFlags();
  const [adIndex, setAdIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const unitId = useMemo(
    () => HOME_EMPTY_BANNER_AD_UNIT_IDS[adIndex],
    [adIndex],
  );

  const handleAdLoaded = useCallback(() => {
    setLoaded(true);
  }, []);

  const handleAdFailedToLoad = useCallback(() => {
    setLoaded(false);
    setAdIndex(current => {
      const next = current + 1;
      if (next < HOME_EMPTY_BANNER_AD_UNIT_IDS.length) {
        return next;
      }
      setExhausted(true);
      return current;
    });
  }, []);

  if (!isAds || !isHomeBanner || exhausted || unitId == null) {
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
    marginTop: hp(4),
    alignItems: 'center',
  },
  hidden: {
    height: 0,
    overflow: 'hidden',
  },
});
