import React, { useEffect, useRef, useState } from 'react';
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
  startHostShareSession,
  type HostShareSession,
} from '../liveShare';
import { useMatchStore } from '../store/useMatchStore';
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
  const sessionRef = useRef<HostShareSession | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [hostLabel, setHostLabel] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;
    let unsub: (() => void) | undefined;

    const start = async () => {
      setStarting(true);
      setError(null);
      setQrValue(null);
      setViewerCount(0);

      try {
        const match = useMatchStore
          .getState()
          .matches.find(m => m.id === matchId);
        if (!match) {
          throw new Error('Match not found');
        }

        const session = await startHostShareSession({
          matchId,
          matchName: `${match.innings[0].teamName} vs ${match.innings[1].teamName}`,
          getMatch: () =>
            useMatchStore.getState().matches.find(m => m.id === matchId),
          onViewerCountChange: count => {
            if (!cancelled) {
              setViewerCount(count);
            }
          },
        });

        if (cancelled) {
          await session.stop();
          return;
        }

        sessionRef.current = session;
        setQrValue(session.qrValue);
        setHostLabel(
          `${session.payload.host}:${session.payload.port}${session.payload.path}`,
        );

        unsub = useMatchStore.subscribe((state, prevState) => {
          const latest = state.matches.find(m => m.id === matchId);
          const previous = prevState.matches.find(m => m.id === matchId);
          if (latest && latest !== previous) {
            session.notifyMatchChanged(latest);
          }
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not start sharing');
        }
      } finally {
        if (!cancelled) {
          setStarting(false);
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      unsub?.();
      const session = sessionRef.current;
      sessionRef.current = null;
      session?.stop().catch(() => undefined);
    };
  }, [visible, matchId]);

  const onStop = async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    await session?.stop().catch(() => undefined);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onStop}
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
            onPress={onStop}
            style={({ pressed }) => [
              styles.closeHit,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Stop sharing"
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Viewers must join the same Wi‑Fi or your phone hotspot, then scan this
          QR in the app (Watch live).
        </Text>

        <View style={styles.qrCard}>
          {starting ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : qrValue ? (
            <QRCode value={qrValue} size={wp(55)} backgroundColor="#FFFFFF" />
          ) : null}
        </View>

        {hostLabel ? (
          <Text style={styles.hostMeta} selectable>
            {hostLabel}
          </Text>
        ) : null}

        <Text style={styles.viewers}>
          {viewerCount === 0
            ? 'Waiting for viewers…'
            : `${viewerCount} watching`}
        </Text>

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
    minHeight: wp(60),
    minWidth: wp(60),
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
    fontSize: fontSize(12),
    color: colors.textMuted,
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
  stopBtn: {
    marginTop: 'auto',
    backgroundColor: colors.primary,
    borderRadius: wp(6),
    paddingVertical: hp(1.6),
    alignItems: 'center',
  },
  stopBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize(16),
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.88,
  },
});
