import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from 'react-native-google-mobile-ads';
import { NATIVE_AD_UNIT_ID } from '../config/adUnitIds';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

/**
 * One native ad row for the Home match list (inserted between match cards per day).
 */
export function HomeListNativeAd() {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID)
      .then(ad => {
        if (!cancelled) {
          setNativeAd(ad);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!nativeAd) {
      return;
    }
    return () => {
      nativeAd.destroy();
    };
  }, [nativeAd]);

  if (failed) {
    return null;
  }

  if (!nativeAd) {
    return (
      <View style={styles.skeleton} accessibilityLabel="Loading advertisement">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      <View style={styles.adsTag} pointerEvents="none">
        <Text style={styles.adsTagText}>Ad</Text>
      </View>
      <NativeAdView nativeAd={nativeAd} style={styles.adCard}>
        <View style={styles.row}>
          <View style={styles.mediaWrapper}>
            <NativeMediaView resizeMode="cover" style={styles.media} />
          </View>
          <View style={styles.textCol}>
            <View style={styles.titleRow}>
              {!!nativeAd.icon && (
                <NativeAsset assetType={NativeAssetType.ICON}>
                  <Image
                    source={{ uri: nativeAd.icon.url }}
                    style={styles.icon}
                    accessibilityIgnoresInvertColors
                  />
                </NativeAsset>
              )}
              <View style={styles.textBlock}>
                <NativeAsset assetType={NativeAssetType.HEADLINE}>
                  <Text style={styles.headline} numberOfLines={2}>
                    {nativeAd.headline}
                  </Text>
                </NativeAsset>
                {!!nativeAd.body && (
                  <NativeAsset assetType={NativeAssetType.BODY}>
                    <Text style={styles.body} numberOfLines={2}>
                      {nativeAd.body}
                    </Text>
                  </NativeAsset>
                )}
              </View>
            </View>
          </View>
        </View>
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text style={styles.cta} numberOfLines={1}>
            {nativeAd.callToAction}
          </Text>
        </NativeAsset>
      </NativeAdView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'relative',
    marginBottom: hp(0.8),
  },
  skeleton: {
    minHeight: hp(12),
    marginBottom: hp(0.8),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  adsTag: {
    position: 'absolute',
    top: hp(0.5),
    right: wp(2.5),
    zIndex: 2,
    paddingHorizontal: wp(1.4),
    paddingVertical: hp(0.2),
    borderRadius: wp(1),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  adsTagText: {
    fontSize: fontSize(8),
    fontWeight: '800',
    color: colors.primary,
  },
  adCard: {
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
    paddingBottom: hp(0.6),
    ...Platform.select({
      ios: {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: wp(2.5),
    paddingTop: hp(1),
  },
  mediaWrapper: {
    width: wp(30),
    height: hp(8),
    borderRadius: wp(2),
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  textCol: {
    flex: 1,
    marginLeft: wp(2),
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(1.2),
  },
  icon: {
    width: wp(6.5),
    height: wp(6.5),
    borderRadius: wp(1.2),
    borderWidth: 1,
    borderColor: colors.border,
  },
  textBlock: {
    flex: 1,
  },
  headline: {
    fontSize: fontSize(14),
    fontWeight: '800',
    color: colors.text,
    lineHeight: fontSize(18),
  },
  body: {
    fontSize: fontSize(11),
    lineHeight: fontSize(15),
    color: colors.textMuted,
    marginTop: hp(0.2),
  },
  cta: {
    marginHorizontal: wp(2.5),
    marginTop: hp(0.8),
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderRadius: wp(2.5),
    textAlign: 'center',
    fontSize: fontSize(14),
    fontWeight: '700',
    color: colors.background,
    backgroundColor: colors.primary,
  },
});
