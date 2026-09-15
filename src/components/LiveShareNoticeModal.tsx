import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

type LiveShareNoticeModalProps = {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onRequestClose?: () => void;
};

export function LiveShareNoticeModal({
  visible,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onRequestClose,
}: LiveShareNoticeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose ?? onPrimary}
    >
      <View style={styles.backdrop} accessibilityViewIsModal>
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable
            onPress={onPrimary}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
          >
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          </Pressable>
          {secondaryLabel && onSecondary ? (
            <Pressable
              onPress={onSecondary}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={secondaryLabel}
            >
              <Text style={styles.secondaryText}>{secondaryLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 7, 7, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(6),
  },
  card: {
    width: '100%',
    maxWidth: wp(92),
    backgroundColor: colors.background,
    borderRadius: wp(4),
    paddingHorizontal: wp(5),
    paddingVertical: hp(2.4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: fontSize(20),
    fontWeight: '800',
    color: colors.text,
  },
  message: {
    marginTop: hp(1),
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: colors.textMuted,
  },
  primaryBtn: {
    marginTop: hp(2.2),
    backgroundColor: colors.primary,
    borderRadius: wp(6),
    paddingVertical: hp(1.5),
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: fontSize(16),
    fontWeight: '800',
  },
  secondaryBtn: {
    marginTop: hp(1),
    borderRadius: wp(6),
    paddingVertical: hp(1.35),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.text,
    fontSize: fontSize(15),
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
