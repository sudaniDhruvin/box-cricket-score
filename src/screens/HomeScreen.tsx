import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  ListRenderItemInfo,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MatchCard } from '../components/MatchCard';
import type { RootStackParamList } from '../navigation/types';
import { useMatchStore } from '../store/useMatchStore';
import { colors } from '../theme/colors';
import type { MatchSummary } from '../types/match';
import { groupMatchesByDay } from '../utils/groupMatchesByDay';
import { fontSize, hp, wp } from '../utils';

/** Show FAB after user scrolls past the header CTA (~thumb-friendly). */
const FAB_SHOW_Y = 140;
const FAB_HIDE_Y = 72;

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();
  const [fabVisible, setFabVisible] = useState(false);
  const fabShownRef = useRef(false);
  const savedMatches = useMatchStore(s => s.matches);

  const sections = useMemo(
    () => groupMatchesByDay(savedMatches),
    [savedMatches],
  );

  const totalMatches = useMemo(
    () => sections.reduce((n, s) => n + s.data.length, 0),
    [sections],
  );

  const renderItem = ({ item }: ListRenderItemInfo<MatchSummary>) => (
    <MatchCard
      match={item}
      onPress={() =>
        navigation.navigate('MatchDetail', { matchId: item.id })
      }
    />
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (!fabShownRef.current && y > FAB_SHOW_Y) {
      fabShownRef.current = true;
      setFabVisible(true);
    } else if (fabShownRef.current && y < FAB_HIDE_Y) {
      fabShownRef.current = false;
      setFabVisible(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SectionList
        sections={sections}
        keyExtractor={m => m.id}
        renderItem={renderItem}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>
              {section.data.length}{' '}
              {section.data.length === 1 ? 'match' : 'matches'}
            </Text>
          </View>
        )}
        stickySectionHeadersEnabled
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              Math.max(insets.bottom, hp(3)) + hp(10),
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.kicker}>BOX CRICKET</Text>
            <Text style={styles.title}>Your matches</Text>
            <Text style={styles.subtitle}>
              {totalMatches} saved {totalMatches === 1 ? 'match' : 'matches'}{' '}
              — newest first under each day.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('NewMatch', {})}
              style={({ pressed }) => [
                styles.startBtn,
                pressed && styles.startBtnPressed,
              ]}
              android_ripple={{
                color: 'rgba(255, 255, 255, 0.22)',
                foreground: true,
              }}
              accessibilityRole="button"
              accessibilityLabel="Start new innings. Create a match and begin scoring.">
              <View style={styles.startBtnIconWrap}>
                <Text style={styles.startBtnIcon}>+</Text>
              </View>
              <View style={styles.startBtnTextCol}>
                <Text style={styles.startBtnTitle}>Start new innings</Text>
                <Text style={styles.startBtnSub}>
                  New match · first innings scoring
                </Text>
              </View>
              <Text style={styles.startBtnChevron}>{'\u203A'}</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.listEmpty}>
            <Text style={styles.listEmptyTitle}>No matches yet</Text>
            <Text style={styles.listEmptySub}>
              Create a match with Start new innings — it will show up here and
              stay saved on this device.
            </Text>
          </View>
        }
      />
      {fabVisible ? (
        <Pressable
          onPress={() => navigation.navigate('NewMatch', {})}
          style={({ pressed }) => [
            styles.fab,
            {
              bottom: Math.max(insets.bottom, hp(2)) + hp(1),
            },
            pressed && styles.fabPressed,
          ]}
          android_ripple={{
            color: 'rgba(255, 255, 255, 0.25)',
            borderless: true,
          }}
          accessibilityRole="button"
          accessibilityLabel="Start new innings">
          <Text style={styles.fabPlus}>+</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    flexGrow: 1,
  },
  listEmpty: {
    paddingVertical: hp(4),
    paddingHorizontal: wp(2),
  },
  listEmptyTitle: {
    fontSize: fontSize(17),
    fontWeight: '800',
    color: colors.text,
    marginBottom: hp(0.6),
  },
  listEmptySub: {
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: colors.textMuted,
  },
  header: {
    marginBottom: hp(1.5),
    paddingHorizontal: wp(2),
  },
  kicker: {
    fontSize: fontSize(11),
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.primary,
    marginBottom: hp(0.8),
  },
  title: {
    fontSize: fontSize(28),
    fontWeight: '800',
    color: colors.text,
    marginBottom: hp(0.6),
  },
  subtitle: {
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: colors.textMuted,
    maxWidth: wp(92),
    marginBottom: hp(1.2),
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: wp(3),
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(3.5),
    marginTop: hp(0.3),
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#070707',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  startBtnPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  startBtnIconWrap: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  startBtnIcon: {
    fontSize: fontSize(26),
    fontWeight: '400',
    color: colors.background,
    marginTop: -hp(0.2),
  },
  startBtnTextCol: {
    flex: 1,
    minWidth: 0,
  },
  startBtnTitle: {
    fontSize: fontSize(17),
    fontWeight: '800',
    color: colors.background,
    letterSpacing: -0.2,
  },
  startBtnSub: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: hp(0.2),
  },
  startBtnChevron: {
    fontSize: fontSize(22),
    fontWeight: '300',
    color: colors.background,
    marginLeft: wp(1),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingTop: hp(1.6),
    paddingBottom: hp(0.8),
    paddingHorizontal: wp(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: hp(0.4),
  },
  sectionTitle: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.text,
  },
  sectionCount: {
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: wp(5),
    width: wp(14.5),
    height: wp(14.5),
    borderRadius: wp(7.25),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#070707',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  fabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
  fabPlus: {
    fontSize: fontSize(32),
    fontWeight: '300',
    color: colors.background,
    marginTop: -hp(0.35),
  },
});
