import React, { useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from './PressableScale';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

export type AppSheetLayout =
  /** Tall bottom sheet: sticky header + footer, scrollable middle (guide, history). */
  | 'scroll'
  /** Short bottom sheet: hugs content, anchored to bottom (wicket, over complete, team names). */
  | 'compact'
  /** Centered dialog only (match over, innings break). */
  | 'center';

export interface AppSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Pinned above the body (tabs, stats, etc.) — not scrolled away. */
  headerExtra?: React.ReactNode;
  layout?: AppSheetLayout;
  maxHeightRatio?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  scrollRef?: RefObject<ScrollView | null>;
}

const SHEET_PAD_TOP = hp(0.8);

export function AppSheet({
  visible,
  onClose,
  title,
  subtitle,
  headerExtra,
  layout = 'scroll',
  maxHeightRatio,
  children,
  footer,
  sheetStyle,
  scrollRef,
}: AppSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  const [headerH, setHeaderH] = useState(0);
  const [footerH, setFooterH] = useState(0);
  const [bodyH, setBodyH] = useState(0);

  const isScroll = layout === 'scroll';
  const isCompact = layout === 'compact';
  const isCenter = layout === 'center';
  const isBottomSheet = isScroll || isCompact;

  const ratio = maxHeightRatio ?? (isCenter ? 0.82 : isCompact ? 0.72 : 0.88);
  const sheetMaxH = windowH * ratio;
  const bottomPad = Math.max(insets.bottom, hp(1.2));

  useEffect(() => {
    if (visible) {
      setHeaderH(0);
      setFooterH(0);
      setBodyH(0);
    }
  }, [visible, title, subtitle, layout]);

  const chromeH = headerH + footerH + bottomPad + SHEET_PAD_TOP;
  const bodyMaxH = Math.max(hp(10), sheetMaxH - chromeH);

  const compactNeedsScroll = isCompact && bodyH > bodyMaxH + 2;

  const scrollAreaH = useMemo(() => {
    const fallbackChrome =
      hp(14) + (footer != null ? hp(9) : 0) + bottomPad + SHEET_PAD_TOP;
    const usedChrome = headerH > 0 ? chromeH : fallbackChrome;
    return Math.max(hp(12), sheetMaxH - usedChrome);
  }, [chromeH, headerH, footer, bottomPad, sheetMaxH]);

  const sheetFrameStyle = [
    isCenter ? styles.centerCard : styles.sheet,
    isScroll && { height: sheetMaxH, maxHeight: sheetMaxH },
    isCompact && { maxHeight: sheetMaxH },
    isBottomSheet && !isCenter && { paddingBottom: bottomPad },
    isCenter && { paddingBottom: hp(2) },
    sheetStyle,
  ];

  const bodyNode = isCompact && !compactNeedsScroll ? (
    <View
      style={styles.compactBody}
      onLayout={e => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) {
          setBodyH(h);
        }
      }}
    >
      {children}
    </View>
  ) : (
    <ScrollView
      ref={scrollRef}
      style={
        isScroll
          ? { height: scrollAreaH }
          : isCompact
            ? { maxHeight: bodyMaxH }
            : { maxHeight: scrollAreaH }
      }
      contentContainerStyle={[
        styles.scrollContent,
        (isCompact || isCenter) && styles.scrollContentSized,
      ]}
      showsVerticalScrollIndicator={isScroll || compactNeedsScroll}
      scrollEnabled={isScroll || compactNeedsScroll || isCenter}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      bounces={isScroll}
      onContentSizeChange={
        isCompact
          ? (_, h) => {
              if (h > 0) {
                setBodyH(h);
              }
            }
          : undefined
      }
    >
      {children}
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.backdrop,
          isCenter && styles.backdropCenter,
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />

        <View style={sheetFrameStyle}>
          <View
            style={styles.headerBlock}
            onLayout={e => {
              const h = e.nativeEvent.layout.height;
              if (h > 0) {
                setHeaderH(h);
              }
            }}
          >
            {isBottomSheet ? <View style={styles.handle} /> : null}
            <Text style={styles.title}>{title}</Text>
            {subtitle != null ? (
              <Text style={styles.subtitle}>{subtitle}</Text>
            ) : null}
            {headerExtra}
          </View>

          {bodyNode}

          {footer != null ? (
            <View
              style={styles.footer}
              onLayout={e => {
                const h = e.nativeEvent.layout.height;
                if (h > 0) {
                  setFooterH(h);
                }
              }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export function AppSheetButton({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      containerStyle={styles.sheetBtnWrap}
      style={[
        styles.sheetBtn,
        variant === 'primary' && styles.sheetBtnPrimary,
        variant === 'ghost' && styles.sheetBtnGhost,
      ]}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.sheetBtnText,
          variant === 'primary' && styles.sheetBtnTextPrimary,
          variant === 'ghost' && styles.sheetBtnTextGhost,
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 7, 7, 0.52)',
    justifyContent: 'flex-end',
  },
  backdropCenter: {
    justifyContent: 'center',
    paddingHorizontal: wp(5),
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.background,
    borderTopLeftRadius: wp(4),
    borderTopRightRadius: wp(4),
    paddingHorizontal: wp(4),
    paddingTop: SHEET_PAD_TOP,
    borderWidth: 1,
    borderColor: colors.border,
  },
  centerCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: wp(3.5),
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    borderWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: wp(10),
    height: hp(0.4),
    borderRadius: wp(1),
    backgroundColor: colors.border,
    marginBottom: hp(0.8),
  },
  headerBlock: {
    flexShrink: 0,
  },
  compactBody: {
    flexShrink: 0,
  },
  title: {
    fontSize: fontSize(20),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: hp(0.35),
    marginBottom: hp(0.4),
  },
  scrollContent: {
    paddingTop: hp(0.2),
    paddingBottom: hp(0.8),
  },
  scrollContentSized: {
    flexGrow: 0,
  },
  footer: {
    flexShrink: 0,
    paddingTop: hp(0.6),
  },
  sheetBtnWrap: {
    width: '100%',
  },
  sheetBtn: {
    paddingVertical: hp(1.35),
    borderRadius: wp(2.5),
    alignItems: 'center',
  },
  sheetBtnPrimary: {
    backgroundColor: colors.primary,
  },
  sheetBtnGhost: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: hp(0.6),
  },
  sheetBtnText: {
    fontSize: fontSize(16),
    fontWeight: '800',
  },
  sheetBtnTextPrimary: {
    color: colors.background,
  },
  sheetBtnTextGhost: {
    color: colors.textMuted,
  },
});
