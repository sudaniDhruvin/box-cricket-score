import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppSheet, AppSheetButton } from './AppSheet';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

export type ScoringHelpFocus = 'general' | 'chase';

type RuleBlock = {
  id: string;
  title: string;
  body: string;
};

const RULES: RuleBlock[] = [
  {
    id: 'runs',
    title: 'Recording runs',
    body: 'Tap 0–6 for runs off the bat. Each tap saves one delivery and updates the score immediately.',
  },
  {
    id: 'extras',
    title: 'Wides & no-balls',
    body: 'Wide and no-ball add 1 run to the team and do not count as a ball in the over. Use Wd+ or Nb+ if batters run extra runs on that delivery.',
  },
  {
    id: 'byes',
    title: 'Byes',
    body: 'Bye counts as 1 run and uses one ball in the over.',
  },
  {
    id: 'wickets',
    title: 'Wickets',
    body: 'A wicket ends a batter’s innings. For run out, choose how many runs were completed on that ball.',
  },
  {
    id: 'chase',
    title: 'Chase — target, runs to win & required rate',
    body:
      'In the 2nd innings, the batting side chases a target of 1st innings runs + 1.\n\n' +
      '• Target — score the other side made, plus one run.\n' +
      '• Runs to win — how many runs are still needed (largest number on the green strip).\n' +
      '• Required rate — runs needed per over for the rest of the innings, based on balls left.\n' +
      '• Current rate — runs per over so far this innings.\n\n' +
      'Example: Target 85, score 48/2, 28 balls left → need 37 runs to win; required rate ≈ 7.93.',
  },
  {
    id: 'undo',
    title: 'Undo & save',
    body: 'Undo removes the last delivery (up to 40 steps). Exit returns home — your match stays on this device.',
  },
];

export interface ScoringHelpModalProps {
  visible: boolean;
  onClose: () => void;
  focus?: ScoringHelpFocus;
}

export function ScoringHelpModal({
  visible,
  onClose,
  focus = 'general',
}: ScoringHelpModalProps) {
  const scrollRef = useRef<ScrollView>(null);
  const chaseYRef = useRef(0);

  useEffect(() => {
    if (!visible || focus !== 'chase') {
      return;
    }
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, chaseYRef.current - hp(1)),
        animated: true,
      });
    }, 200);
    return () => clearTimeout(t);
  }, [visible, focus]);

  const headerExtra =
    focus === 'chase' ? (
      <View style={styles.focusBanner}>
        <Text style={styles.focusBannerText}>Chase section below</Text>
      </View>
    ) : null;

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title="Scoring guide"
      subtitle={
        focus === 'chase'
          ? 'How target, runs to win, and required rate work in the 2nd innings.'
          : 'Quick rules for box cricket scoring.'
      }
      layout="scroll"
      headerExtra={headerExtra}
      scrollRef={scrollRef}
      footer={<AppSheetButton label="Got it" onPress={onClose} />}
    >
      {RULES.map(rule => (
        <View
          key={rule.id}
          style={[
            styles.ruleBlock,
            rule.id === 'chase' && focus === 'chase' && styles.ruleBlockFocus,
          ]}
          onLayout={
            rule.id === 'chase'
              ? e => {
                  chaseYRef.current = e.nativeEvent.layout.y;
                }
              : undefined
          }
        >
          <Text
            style={[
              styles.ruleTitle,
              rule.id === 'chase' && styles.ruleTitleChase,
            ]}
          >
            {rule.title}
          </Text>
          <Text style={styles.ruleBody}>{rule.body}</Text>
        </View>
      ))}
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  focusBanner: {
    marginTop: hp(0.6),
    marginBottom: hp(0.4),
    paddingVertical: hp(0.55),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2),
    backgroundColor: colors.primaryFaint,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  focusBannerText: {
    fontSize: fontSize(12),
    fontWeight: '700',
    color: colors.primary,
  },
  ruleBlock: {
    marginBottom: hp(1),
    paddingVertical: hp(0.9),
    paddingHorizontal: wp(3),
    borderRadius: wp(2.5),
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ruleBlockFocus: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  ruleTitle: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.primary,
    marginBottom: hp(0.35),
  },
  ruleTitleChase: {
    fontSize: fontSize(14),
  },
  ruleBody: {
    fontSize: fontSize(14),
    lineHeight: fontSize(21),
    fontWeight: '500',
    color: colors.textMuted,
  },
});
