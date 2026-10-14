import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { fontSize, hp, wp } from '../../utils';
import { pushToastCover, ToastPill } from './AppToast';
import { PrimaryButton } from './PrimaryButton';

type AppSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function AppSheet({ visible, title, onClose, children }: AppSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetRef = useRef<View>(null);
  const [lift, setLift] = useState(0);

  useEffect(() => {
    if (!visible) {
      setLift(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, event => {
      const keyboardTop = event.endCoordinates.screenY;
      requestAnimationFrame(() => {
        sheetRef.current?.measureInWindow((_x, y, _width, height) => {
          if (!height) {
            setLift(event.endCoordinates.height);
            return;
          }
          const overlap = y + height - keyboardTop;
          setLift(overlap > 8 ? overlap + hp(1) : 0);
        });
      });
    });
    const hide = Keyboard.addListener(hideEvent, () => setLift(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    return pushToastCover();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.screen}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View
          ref={sheetRef}
          style={[
            styles.sheet,
            {
              marginBottom: lift,
              maxHeight: Math.max(hp(28), windowHeight - lift - insets.top - hp(2)),
              paddingBottom: Math.max(insets.bottom, hp(2)),
            },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {children}
          <ToastPill />
        </View>
      </View>
    </Modal>
  );
}

type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmSheet({ visible, title, body, confirmLabel, onConfirm, onClose }: ConfirmSheetProps) {
  return (
    <AppSheet visible={visible} title={title} onClose={onClose}>
      <Text style={styles.body}>{body}</Text>
      <PrimaryButton label={confirmLabel} onPress={onConfirm} style={styles.confirm} />
      <PrimaryButton label="Cancel" onPress={onClose} variant="outline" />
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
    paddingHorizontal: wp(5),
    paddingTop: hp(1.2),
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: hp(1.2),
  },
  handle: {
    alignSelf: 'center',
    width: wp(12),
    height: hp(0.6),
    borderRadius: wp(2),
    backgroundColor: colors.border,
    marginBottom: hp(0.4),
  },
  title: { color: colors.text, fontSize: fontSize(18), fontWeight: '800' },
  body: { color: colors.textMuted, fontSize: fontSize(14), lineHeight: fontSize(21) },
  confirm: { marginTop: hp(0.4) },
});
