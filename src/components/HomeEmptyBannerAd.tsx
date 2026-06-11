import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { HOME_EMPTY_BANNER_AD_UNIT_IDS } from '../config/adUnitIds';
import { useAdFlags } from '../hooks/useAdFlags';

/**
 * Large banner (320×100) shown on Home when the user has no saved matches.
 * Tries H1 (high) → H2 (medium) → H3 (normal) until one loads.
 */
export function HomeEmptyBannerAd() {
  const { isHomeBanner, isAds } = useAdFlags();
  const [adIndex, setAdIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  if (!isAds) {
    return null;
  }

  if (!isHomeBanner) {
    return null;
  }

  const unitId = useMemo(
    () => HOME_EMPTY_BANNER_AD_UNIT_IDS[adIndex],
    [adIndex],
  );

  const handleAdFailedToLoad = useCallback(() => {
    setAdIndex(current => {
      const next = current + 1;
      if (next < HOME_EMPTY_BANNER_AD_UNIT_IDS.length) {
        return next;
      }
      setVisible(false);
      return current;
    });
  }, []);

  if (!visible || !unitId) {
    return null;
  }

  return (
    <View style={styles.wrap} accessibilityLabel="Advertisement">
      <BannerAd
        key={unitId}
        unitId={unitId}
        size={BannerAdSize.LARGE_BANNER}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    alignItems: 'center',
  },
});
