import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_IDS } from '../config/adUnitIds';
import { useAdFlags } from '../hooks/useAdFlags';

/**
 * Anchored adaptive banner for sticky placement at the bottom of a screen
 * (e.g. new match form, live scoring).
 * Tries H1 (high) → H2 (medium) → H3 (normal) until one loads.
 */
export function StickyBottomBannerAd() {
  const { isBanner, isAds } = useAdFlags();
  const [adIndex, setAdIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  if (!isAds) {
    return null;
  }

  if (!isBanner) {
    return null;
  }

  const unitId = useMemo(() => BANNER_AD_UNIT_IDS[adIndex], [adIndex]);

  const handleAdFailedToLoad = useCallback(() => {
    setAdIndex(current => {
      const next = current + 1;
      if (next < BANNER_AD_UNIT_IDS.length) {
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
        size={BannerAdSize.FULL_BANNER}
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
});
