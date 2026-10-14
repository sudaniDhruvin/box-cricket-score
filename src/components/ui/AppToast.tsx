import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { fontSize, hp, wp } from '../../utils';

export type ToastTone = 'ok' | 'error';

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastListener = (item: ToastItem) => void;

const toastListeners = new Set<ToastListener>();
const coverListeners = new Set<() => void>();
let nextId = 1;
let covers = 0;

export function showToast(message: string, tone: ToastTone = 'ok'): void {
  const text = message.trim();
  if (!text) return;
  const item = { id: nextId, message: text, tone };
  nextId += 1;
  toastListeners.forEach(listener => listener(item));
}

function subscribeToast(listener: ToastListener): () => void {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

function sheetCovered(): boolean {
  return covers > 0;
}

/** Hide the root toast while a sheet or full-screen editor is open. That surface shows the same note. */
export function pushToastCover(): () => void {
  covers += 1;
  coverListeners.forEach(listener => listener());
  let released = false;
  return () => {
    if (released) return;
    released = true;
    covers = Math.max(0, covers - 1);
    coverListeners.forEach(listener => listener());
  };
}

function subscribeCovers(listener: () => void): () => void {
  coverListeners.add(listener);
  return () => {
    coverListeners.delete(listener);
  };
}

export function ToastPill({ hidden = false, bottom = hp(1.2) }: { hidden?: boolean; bottom?: number }) {
  const [toast, setToast] = useState<ToastItem | null>(null);

  useEffect(() => subscribeToast(setToast), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(current => (current?.id === toast.id ? null : current));
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast || hidden) return null;
  return (
    <View pointerEvents="none" style={[styles.slot, { bottom }]}>
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.pill, toast.tone === 'error' && styles.error]}>
        <Text style={styles.text}>{toast.message}</Text>
      </View>
    </View>
  );
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [covered, setCovered] = useState(sheetCovered());

  useEffect(() => subscribeCovers(() => setCovered(sheetCovered())), []);

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <ToastPill hidden={covered} bottom={Math.max(insets.bottom, hp(1)) + hp(8)} />
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 40, elevation: 40 },
  slot: { position: 'absolute', left: wp(4), right: wp(4) },
  pill: {
    borderRadius: wp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.35),
    backgroundColor: colors.text,
  },
  error: { backgroundColor: colors.primary },
  text: { color: colors.background, fontSize: fontSize(14), fontWeight: '700', textAlign: 'center', lineHeight: fontSize(20) },
});
