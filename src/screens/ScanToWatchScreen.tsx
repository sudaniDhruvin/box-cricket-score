import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Camera } from 'react-native-camera-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PNGs } from '../assets/images/pngs';
import {
  ensureCameraPermission,
  parseJoinPayload,
  type LiveShareJoinPayload,
} from '../liveShare';
import type { MainStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ScanToWatch'>;
type ScanRoute = RouteProp<MainStackParamList, 'ScanToWatch'>;

export function ScanToWatchScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ScanRoute>();
  const handledRef = useRef(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    ensureCameraPermission().then(ok => {
      if (mounted) {
        setHasPermission(ok);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const goWatch = useCallback(
    (payload: LiveShareJoinPayload) => {
      navigation.replace('LiveSpectator', { joinPayload: payload });
    },
    [navigation],
  );

  const onReadCode = useCallback(
    (event: { nativeEvent: { codeStringValue: string } }) => {
      if (handledRef.current) {
        return;
      }
      const raw = event.nativeEvent.codeStringValue?.trim();
      if (!raw) {
        return;
      }
      const payload = parseJoinPayload(raw);
      if (!payload) {
        setScanError('Not a Box Cricket live score QR. Ask the host to share again.');
        return;
      }
      handledRef.current = true;
      goWatch(payload);
    },
    [goWatch],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Image source={PNGs.LEFT_ARROW} style={styles.backArrow} />
          <Text style={styles.backLbl}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Watch live</Text>
        <View style={styles.toolbarSpacer} />
      </View>

      <Text style={styles.hint}>
        Join the host Wi‑Fi or hotspot first, then scan their live score QR.
      </Text>

      {hasPermission == null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !hasPermission ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            Camera permission is required to scan the QR code.
          </Text>
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <Camera
            style={styles.camera}
            scanBarcode
            showFrame
            laserColor={colors.primary}
            frameColor={colors.primary}
            scanThrottleDelay={1500}
            onReadCode={onReadCode}
          />
        </View>
      )}

      {scanError ? <Text style={styles.scanError}>{scanError}</Text> : null}
      {route.params?.prefillError ? (
        <Text style={styles.scanError}>{route.params.prefillError}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderRadius: wp(2),
    gap: wp(1),
  },
  backArrow: {
    width: wp(4),
    height: wp(4),
  },
  backLbl: {
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.primary,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize(17),
    fontWeight: '800',
    color: colors.text,
  },
  toolbarSpacer: {
    width: wp(18),
  },
  hint: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.5),
    fontSize: fontSize(14),
    color: colors.textMuted,
    lineHeight: fontSize(20),
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: wp(4),
    marginBottom: hp(2),
    borderRadius: wp(4),
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(6),
  },
  errorText: {
    textAlign: 'center',
    color: colors.ballWicket,
    fontSize: fontSize(15),
  },
  scanError: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(2),
    color: colors.ballWicket,
    fontSize: fontSize(13),
    textAlign: 'center',
  },
  pressed: {
    backgroundColor: colors.primaryFaint,
  },
});
