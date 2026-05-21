import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

/** Connected setup sections — tight vertical rhythm, no dead gaps. */
export function SetupFormStack({ children }: { children: React.ReactNode }) {
  return <View style={styles.stack}>{children}</View>;
}

export function SetupSection({
  title,
  hint,
  children,
  variant = 'muted',
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  variant?: 'muted' | 'plain';
}) {
  return (
    <View
      style={[
        styles.section,
        variant === 'muted' ? styles.sectionMuted : styles.sectionPlain,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {hint != null ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function SetupPageHeader({
  title,
  lead,
}: {
  title: string;
  lead: string;
}) {
  return (
    <View style={styles.pageHeader}>
      <Text style={styles.pageTitle}>{title}</Text>
      <Text style={styles.pageLead}>{lead}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: hp(0.55),
  },
  pageHeader: {
    marginBottom: hp(0.35),
  },
  pageTitle: {
    fontSize: fontSize(22),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.3,
  },
  pageLead: {
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: colors.textMuted,
    marginTop: hp(0.15),
  },
  section: {
    padding: wp(3),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionMuted: {
    backgroundColor: colors.surfaceMuted,
  },
  sectionPlain: {
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(0.55),
    gap: wp(2),
  },
  title: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.text,
  },
  hint: {
    fontSize: fontSize(11),
    fontWeight: '600',
    color: colors.textMuted,
  },
});
