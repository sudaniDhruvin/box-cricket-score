import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getHostShareState,
  startHostShare,
  stopHostShare,
  subscribeHostShare,
  type HostSharePublicState,
} from '../liveShare/hostShareController';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

type ShareLiveScoreModalProps = {
  visible: boolean;
  matchId: string;
  onClose: () => void;
};

export function ShareLiveScoreModal({
  visible,
  matchId,
  onClose,
}: ShareLiveScoreModalProps) {
  const insets = useSafeAreaInsets();
  const [share, setShare] = useState<HostSharePublicState>(() =>
    getHostShareState(),
  );

  useEffect(() => subscribeHostShare(setShare), []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const current = getHostShareState();
    if (
      (current.active || current.starting) &&
      current.matchId === matchId
    ) {
      return;
    }
    void startHostShare(matchId);
  }, [visible, matchId]);

  const onDone = () => {
    // Hide QR only — TCP session + score broadcasts stay alive.
    onClose();
  };

  const onStop = () => {
    void stopHostShare().finally(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDone}
    >
      <View
        style={[
          styles.root,
          {
            paddingTop: Math.max(insets.top, hp(2)),
            paddingBottom: Math.max(insets.bottom, hp(2)),
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Share live score</Text>
          <Pressable
            onPress={onDone}
            style={({ pressed }) => [
              styles.closeHit,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Hide QR and keep sharing"
          >
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Both phones on the same Wi‑Fi (or host hotspot). Scan this QR, then
          tap Done — sharing stays on. If a viewer drops, they can reconnect
          with this same QR — only tap Refresh QR if you changed network.
        </Text>

        <View style={styles.qrCard}>
          {share.starting ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : share.error ? (
            <Text style={styles.errorText}>{share.error}</Text>
          ) : share.qrValue ? (
            <QRCode
              value={share.qrValue}
              size={wp(64)}
              backgroundColor="#FFFFFF"
              ecl="M"
            />
          ) : null}
        </View>

        {share.hostLabel ? (
          <>
            <Text style={styles.hostMeta} selectable>
              Host: {share.hostLabel}
            </Text>
            <Text style={styles.hostHint}>
              Should look like 192.168.x.x:8899. If you switched network, tap
              Refresh QR.
            </Text>
          </>
        ) : null}

        <Text style={styles.viewers}>
          {!share.active
            ? share.starting
              ? 'Starting…'
              : share.error
                ? 'Share failed'
                : 'Not sharing'
            : share.viewerCount === 0
              ? share.hadViewers
                ? 'Viewer disconnected. They can reconnect with this same QR.'
                : 'Waiting for viewers…'
              : `${share.viewerCount} watching`}
        </Text>

        {share.active || share.error ? (
          <Pressable
            onPress={() => {
              void startHostShare(matchId, { force: true });
            }}
            style={({ pressed }) => [
              styles.refreshBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Refresh share QR"
          >
            <Text style={styles.refreshBtnText}>Refresh QR</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Hide QR and keep sharing"
        >
          <Text style={styles.doneBtnText}>Done — keep sharing</Text>
        </Pressable>

        <Pressable
          onPress={onStop}
          style={({ pressed }) => [styles.stopBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Stop sharing"
        >
          <Text style={styles.stopBtnText}>Stop sharing</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: wp(5),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  title: {
    fontSize: fontSize(22),
    fontWeight: '800',
    color: colors.text,
  },
  closeHit: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(2),
    borderRadius: wp(2),
  },
  closeText: {
    fontSize: fontSize(15),
    fontWeight: '700',
    color: colors.primary,
  },
  hint: {
    fontSize: fontSize(14),
    color: colors.textMuted,
    lineHeight: fontSize(20),
    marginBottom: hp(2),
  },
  qrCard: {
    alignSelf: 'center',
    minHeight: wp(70),
    minWidth: wp(70),
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(4),
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  hostMeta: {
    marginTop: hp(1.5),
    textAlign: 'center',
    fontSize: fontSize(13),
    fontWeight: '700',
    color: colors.text,
  },
  hostHint: {
    marginTop: hp(0.6),
    textAlign: 'center',
    fontSize: fontSize(12),
    color: colors.textMuted,
    lineHeight: fontSize(17),
    paddingHorizontal: wp(2),
  },
  viewers: {
    marginTop: hp(2),
    textAlign: 'center',
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.text,
  },
  errorText: {
    color: colors.ballWicket,
    textAlign: 'center',
    fontSize: fontSize(14),
    paddingHorizontal: wp(2),
  },
  doneBtn: {
    marginTop: 'auto',
    backgroundColor: colors.primary,
    borderRadius: wp(6),
    paddingVertical: hp(1.6),
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize(16),
    fontWeight: '800',
  },
  refreshBtn: {
    marginTop: hp(2),
    borderRadius: wp(6),
    paddingVertical: hp(1.3),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  refreshBtnText: {
    color: colors.primary,
    fontSize: fontSize(14),
    fontWeight: '700',
  },
  stopBtn: {
    marginTop: hp(1.2),
    borderRadius: wp(6),
    paddingVertical: hp(1.4),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopBtnText: {
    color: colors.ballWicket,
    fontSize: fontSize(15),
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
