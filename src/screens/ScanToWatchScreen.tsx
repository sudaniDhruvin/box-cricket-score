import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Camera } from 'react-native-camera-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ui';
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

/** Square scan window. Library default is 300×150 (1D barcode), which rejects most QR codes. */
const QR_SCAN_SIZE = Math.round(Math.min(wp(72), 320));
const QR_SCAN_FRAME = { width: QR_SCAN_SIZE, height: QR_SCAN_SIZE };

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
      <ScreenHeader
        backLabel="Back"
        title="Watch live"
        onBack={() => navigation.goBack()}
      />

      <Text style={styles.hint}>
        Join the host Wi‑Fi or hotspot first, then fill the square with their
        Share live score QR.
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
            barcodeFrameSize={QR_SCAN_FRAME}
            scanThrottleDelay={200}
            allowedBarcodeTypes={['qr']}
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
});
