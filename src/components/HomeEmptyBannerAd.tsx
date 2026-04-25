import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID } from '../config/adUnitIds';

/**
 * Large banner (320×100) shown on Home when the user has no saved matches.
 */
export function HomeEmptyBannerAd() {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.wrap} accessibilityLabel="Advertisement">
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.LARGE_BANNER}
        onAdFailedToLoad={() => setVisible(false)}
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
