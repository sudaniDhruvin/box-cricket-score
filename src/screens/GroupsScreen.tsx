import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, ScreenHeader } from '../components/ui';
import type { MainStackParamList } from '../navigation/types';
import { useGroupStore } from '../store/useGroupStore';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Groups'>;

export function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const groups = useGroupStore(s => s.groups);
  const createGroup = useGroupStore(s => s.createGroup);
  const [name, setName] = useState('');

  const onCreate = () => {
    const id = createGroup(name);
    setName('');
    navigation.navigate('GroupDetail', { groupId: id });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader backLabel="Home" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, hp(3)) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Groups</Text>
        <Text style={styles.lead}>
          Add the players who play together. Their batting and bowling stay on
          this phone.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>New group</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Sunday box"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={onCreate}
            accessibilityLabel="New group name"
          />
          <PrimaryButton
            label="Create group"
            onPress={onCreate}
            accessibilityLabel="Create group"
            style={styles.createBtn}
          />
        </View>

        {groups.length === 0 ? (
          <Text style={styles.empty}>No groups yet.</Text>
        ) : (
          groups.map(group => {
            const active = group.players.filter(player => player.active).length;
            return (
              <Pressable
                key={group.id}
                onPress={() =>
                  navigation.navigate('GroupDetail', { groupId: group.id })
                }
                style={({ pressed }) => [
                  styles.groupRow,
                  pressed && styles.groupRowPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${group.name}`}
              >
                <View style={styles.groupText}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>
                    {active} {active === 1 ? 'player' : 'players'}
                  </Text>
                </View>
                <Text style={styles.chevron}>{'\u203A'}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: wp(5),
    paddingTop: hp(1),
  },
  title: {
    fontSize: fontSize(28),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.4,
  },
  lead: {
    marginTop: hp(0.6),
    marginBottom: hp(2),
    fontSize: fontSize(15),
    lineHeight: fontSize(22),
    color: colors.textMuted,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    padding: wp(4),
    marginBottom: hp(2),
  },
  label: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.text,
    marginBottom: hp(0.8),
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.4),
    fontSize: fontSize(16),
    fontWeight: '600',
    color: colors.text,
  },
  createBtn: {
    marginTop: hp(1.4),
  },
  empty: {
    fontSize: fontSize(14),
    fontWeight: '600',
    color: colors.textMuted,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    marginBottom: hp(1),
  },
  groupRowPressed: {
    backgroundColor: colors.primaryFaint,
  },
  groupText: {
    flex: 1,
  },
  groupName: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.text,
  },
  groupMeta: {
    marginTop: hp(0.2),
    fontSize: fontSize(13),
    fontWeight: '600',
    color: colors.textMuted,
  },
  chevron: {
    fontSize: fontSize(22),
    color: colors.primary,
    fontWeight: '600',
  },
});
