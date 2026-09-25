import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { useAdFlags } from '../hooks/useAdFlags';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

/**
 * Fetches the over-complete native ad ahead of the sheet so it can render immediately.
 * Call `loadNext` after the sheet closes to prepare the following over.
 */
export function usePreloadedNativeAd() {
  const { isNative, isAds } = useAdFlags();
  const enabled = isAds && isNative;
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [failed, setFailed] = useState(false);
  const adRef = useRef<NativeAd | null>(null);
  const requestIdRef = useRef(0);

  const loadNext = useCallback(() => {
    if (!enabled) {
      return;
    }
    const requestId = ++requestIdRef.current;
    adRef.current?.destroy();
    adRef.current = null;
    setNativeAd(null);
    setFailed(false);
    NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID)
      .then(ad => {
        if (requestIdRef.current !== requestId) {
          ad.destroy();
          return;
        }
        adRef.current = ad;
        setNativeAd(ad);
      })
      .catch(() => {
        if (requestIdRef.current === requestId) {
          setFailed(true);
        }
      });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    loadNext();
    return () => {
      requestIdRef.current += 1;
      adRef.current?.destroy();
      adRef.current = null;
    };
  }, [enabled, loadNext]);

  return { nativeAd, failed, loadNext };
}

/**
 * Compact native ad for the over-complete sheet. Expects an ad already loaded by
 * {@link usePreloadedNativeAd}.
 */
export function OverCompleteNativeAd({
  nativeAd,
  failed,
}: {
  nativeAd: NativeAd | null;
  failed: boolean;
}) {
  const { isNative, isAds } = useAdFlags();

  if (!isAds || !isNative || failed) {
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
    marginTop: hp(0.4),
    marginBottom: hp(1.2),
  },
  skeleton: {
    minHeight: hp(10),
    marginTop: hp(0.4),
    marginBottom: hp(1.2),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  adsTag: {
    position: 'absolute',
    top: hp(0.4),
    right: wp(2),
    zIndex: 2,
    paddingHorizontal: wp(1.4),
    paddingVertical: hp(0.15),
    borderRadius: wp(1),
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  adsTagText: {
    fontSize: fontSize(8),
    fontWeight: '800',
    color: colors.primary,
  },
  adCard: {
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
    paddingBottom: hp(0.6),
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: wp(2),
    paddingTop: hp(1),
  },
  mediaWrapper: {
    width: wp(22),
    height: hp(7),
    borderRadius: wp(1.5),
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
    width: wp(6),
    height: wp(6),
    borderRadius: wp(1),
    borderWidth: 1,
    borderColor: colors.border,
  },
  textBlock: {
    flex: 1,
    paddingRight: wp(6),
  },
  headline: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.text,
    lineHeight: fontSize(17),
  },
  body: {
    fontSize: fontSize(11),
    lineHeight: fontSize(14),
    color: colors.textMuted,
    marginTop: hp(0.15),
  },
  cta: {
    marginHorizontal: wp(2),
    marginTop: hp(0.7),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(2),
    borderRadius: wp(2),
    textAlign: 'center',
    fontSize: fontSize(13),
    fontWeight: '700',
    color: colors.background,
    backgroundColor: colors.primary,
  },
});
