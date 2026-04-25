import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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

export function OnboardingNativeAd() {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [failed, setFailed] = useState(false);
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardLift = useRef(new Animated.Value(6)).current;

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

  useEffect(() => {
    if (!nativeAd) {
      return;
    }
    cardFade.setValue(0);
    cardLift.setValue(6);
    Animated.parallel([
      Animated.spring(cardFade, {
        toValue: 1,
        useNativeDriver: true,
        tension: 55,
        friction: 9,
      }),
      Animated.spring(cardLift, {
        toValue: 0,
        useNativeDriver: true,
        tension: 55,
        friction: 9,
      }),
    ]).start();
  }, [nativeAd, cardFade, cardLift]);

  if (failed) {
    return null;
  }

  if (!nativeAd) {
    return (
      <View style={styles.skeleton} accessibilityLabel="Loading advertisement">
        <View style={styles.adsTag} pointerEvents="none">
          <Text style={styles.adsTagText}>Ads</Text>
        </View>
        <View style={styles.skeletonInner}>
          <View style={styles.skeletonLineShort} />
          <View style={styles.skeletonBlock} />
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.root,
        {
          opacity: cardFade,
          transform: [{ translateY: cardLift }],
        },
      ]}
    >
      <NativeAdView nativeAd={nativeAd} style={styles.adCard}>
        <View
          style={styles.adsTag}
          pointerEvents="none"
          accessibilityLabel="Advertisement"
        >
          <Text style={styles.adsTagText}>Ads</Text>
        </View>
        <View style={styles.headerStrip}>
          <View style={styles.headerAccent} />
          <View style={styles.sponsoredPill}>
            <View style={styles.sponsoredDot} />
            <Text style={styles.sponsored}>Sponsored</Text>
          </View>
        </View>

        <View style={styles.mainRow}>
          <View style={styles.mediaFrame}>
            <View style={styles.mediaWrapper}>
              <NativeMediaView resizeMode="cover" style={styles.media} />
            </View>
          </View>
          <View style={styles.rightColumn}>
            <View style={styles.titleRow}>
              {nativeAd.icon && (
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
                    <Text style={styles.body} numberOfLines={1}>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  skeleton: {
    minHeight: hp(10),
    marginTop: hp(0.5),
    marginBottom: hp(0.5),
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
    overflow: 'hidden',
  },
  skeletonInner: {
    flex: 1,
    minHeight: hp(8),
    padding: wp(3),
  },
  skeletonLineShort: {
    width: '38%',
    height: hp(1),
    borderRadius: hp(0.5),
    backgroundColor: colors.primaryFaint,
    marginBottom: hp(1.2),
  },
  skeletonBlock: {
    position: 'absolute',
    right: wp(3),
    top: '22%',
    width: wp(28),
    height: hp(5.5),
    borderRadius: wp(2),
    backgroundColor: colors.primaryFaint,
  },
  adsTag: {
    position: 'absolute',
    top: hp(0.6),
    right: wp(2.5),
    zIndex: 2,
    paddingHorizontal: wp(1.6),
    paddingVertical: hp(0.25),
    borderRadius: wp(1.2),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  adsTagText: {
    fontSize: fontSize(8),
    fontWeight: '800',
    letterSpacing: 0.4,
    color: colors.primary,
  },
  adCard: {
    marginTop: hp(0.5),
    marginBottom: hp(0.5),
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(2.5),
    paddingTop: hp(0.9),
    paddingBottom: hp(0.2),
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },
  sponsoredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.45),
    borderRadius: wp(3),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.primaryFaint,
  },
  sponsoredDot: {
    width: wp(1.2),
    height: wp(1.2),
    borderRadius: wp(0.6),
    backgroundColor: colors.primary,
    marginRight: wp(1.2),
  },
  sponsored: {
    fontSize: fontSize(9),
    fontWeight: '800',
    letterSpacing: 0.7,
    color: colors.loserMuted,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: wp(2.5),
    paddingBottom: hp(0.2),
  },
  mediaFrame: {
    alignSelf: 'center',
  },
  mediaWrapper: {
    width: wp(32),
    height: hp(9.5),
    borderRadius: wp(2.5),
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
    borderRadius: wp(2.5),
    overflow: 'hidden',
  },
  rightColumn: {
    flex: 1,
    paddingLeft: wp(1.5),
    paddingTop: hp(0.2),
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(1.5),
  },
  icon: {
    width: wp(7.5),
    height: wp(7.5),
    borderRadius: wp(1.5),
    borderWidth: 1,
    borderColor: colors.border,
  },
  textBlock: {
    flex: 1,
  },
  headline: {
    fontSize: fontSize(15),
    fontWeight: '800',
    color: colors.text,
    lineHeight: fontSize(20),
    marginBottom: hp(0.2),
  },
  body: {
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
    color: colors.textMuted,
  },
  cta: {
    margin: hp(1),
    paddingVertical: hp(2),
    paddingHorizontal: wp(1.5),
    borderRadius: wp(3),
    textAlign: 'center',
    fontSize: fontSize(17),
    fontWeight: '700',
    color: colors.background,
    backgroundColor: colors.primary,
    verticalAlign: 'middle',
  },
});
