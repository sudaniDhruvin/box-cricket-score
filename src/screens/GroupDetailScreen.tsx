import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  Alert,
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

type Nav = NativeStackNavigationProp<MainStackParamList, 'GroupDetail'>;
type Route = RouteProp<MainStackParamList, 'GroupDetail'>;

export function GroupDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const group = useGroupStore(s => s.groups.find(item => item.id === params.groupId));
  const renameGroup = useGroupStore(s => s.renameGroup);
  const addPlayer = useGroupStore(s => s.addPlayer);
  const renamePlayer = useGroupStore(s => s.renamePlayer);
  const removePlayer = useGroupStore(s => s.removePlayer);
  const restorePlayer = useGroupStore(s => s.restorePlayer);
  const [groupName, setGroupName] = useState(group?.name ?? '');
  const [playerName, setPlayerName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (group != null && editingId == null) {
      setGroupName(group.name);
    }
  }, [group, editingId]);

  if (group == null) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader backLabel="Groups" onBack={() => navigation.goBack()} />
        <Text style={styles.missing}>This group is no longer on this phone.</Text>
      </View>
    );
  }

  const active = group.players.filter(player => player.active);
  const removed = group.players.filter(player => !player.active);

  const saveGroupName = () => {
    const next = groupName.trim();
    if (!next) {
      setGroupName(group.name);
      return;
    }
    renameGroup(group.id, next);
  };

  const onAddPlayer = () => {
    if (!playerName.trim()) {
      return;
    }
    const id = addPlayer(group.id, playerName);
    if (id == null) {
      Alert.alert('Player', 'Enter a name that is not already in this group.');
      return;
    }
    setPlayerName('');
  };

  const startRename = (playerId: string, name: string) => {
    setEditingId(playerId);
    setEditingName(name);
  };

  const saveRename = (playerId: string) => {
    const ok = renamePlayer(group.id, playerId, editingName);
    if (!ok) {
      Alert.alert('Player', 'Enter a name that is not already in this group.');
      return;
    }
    setEditingId(null);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader backLabel="Groups" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, hp(4)) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>Group</Text>
        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          onEndEditing={saveGroupName}
          style={styles.groupName}
          autoCorrect={false}
          autoCapitalize="words"
          accessibilityLabel="Group name"
        />
        <Text style={styles.lead}>
          Rename the group or a player any time. Removing a player keeps their
          old matches. On the next screen, mark one player as W if they play
          for both teams.
        </Text>

        <PrimaryButton
          label="Start match"
          onPress={() =>
            navigation.navigate('GroupMatchSetup', { groupId: group.id })
          }
          disabled={active.length < 4}
          accessibilityLabel="Start a match with this group"
        />
        {active.length < 4 ? (
          <Text style={styles.hint}>Add at least 4 players to start a match.</Text>
        ) : null}

        <Text style={styles.section}>Players</Text>
        <View style={styles.addRow}>
          <TextInput
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="Player name"
            placeholderTextColor={colors.textMuted}
            style={styles.addInput}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={onAddPlayer}
            accessibilityLabel="New player name"
          />
          <Pressable
            onPress={onAddPlayer}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Add player"
          >
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {active.map(player => (
          <View key={player.id} style={styles.playerCard}>
            {editingId === player.id ? (
              <TextInput
                value={editingName}
                onChangeText={setEditingName}
                style={styles.renameInput}
                autoFocus
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => saveRename(player.id)}
                accessibilityLabel={`Rename ${player.name}`}
              />
            ) : (
              <Pressable
                style={styles.playerNameHit}
                onPress={() =>
                  navigation.navigate('PlayerProfile', {
                    groupId: group.id,
                    playerId: player.id,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Open ${player.name}`}
              >
                <Text style={styles.playerName}>{player.name}</Text>
              </Pressable>
            )}
            <View style={styles.playerActions}>
              {editingId === player.id ? (
                <Pressable
                  onPress={() => saveRename(player.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Save player name"
                >
                  <Text style={styles.action}>Save</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => startRename(player.id, player.name)}
                  accessibilityRole="button"
                  accessibilityLabel={`Rename ${player.name}`}
                >
                  <Text style={styles.action}>Rename</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => removePlayer(group.id, player.id)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${player.name} from the group`}
              >
                <Text style={styles.actionDanger}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {removed.length > 0 ? (
          <>
            <Text style={styles.section}>Removed</Text>
            <Text style={styles.hint}>
              They stay out of the next match. Their past scorecards are still
              here.
            </Text>
            {removed.map(player => (
              <View key={player.id} style={styles.playerCard}>
                <Pressable
                  style={styles.playerNameHit}
                  onPress={() =>
                    navigation.navigate('PlayerProfile', {
                      groupId: group.id,
                      playerId: player.id,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${player.name}`}
                >
                  <Text style={styles.playerNameMuted}>{player.name}</Text>
                </Pressable>
                <Pressable
                  onPress={() => restorePlayer(group.id, player.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${player.name} back to the group`}
                >
                  <Text style={styles.action}>Add back</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}
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
  missing: {
    paddingHorizontal: wp(5),
    fontSize: fontSize(15),
    color: colors.textMuted,
  },
  kicker: {
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  groupName: {
    marginTop: hp(0.4),
    fontSize: fontSize(28),
    fontWeight: '900',
    color: colors.text,
    paddingVertical: hp(0.2),
  },
  lead: {
    marginBottom: hp(1.6),
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: colors.textMuted,
  },
  hint: {
    marginTop: hp(0.6),
    marginBottom: hp(0.4),
    fontSize: fontSize(12),
    fontWeight: '600',
    color: colors.textMuted,
  },
  section: {
    marginTop: hp(2.2),
    marginBottom: hp(1),
    fontSize: fontSize(12),
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1.2),
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.3),
    fontSize: fontSize(16),
    fontWeight: '600',
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: wp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.4),
  },
  addBtnText: {
    color: colors.background,
    fontWeight: '800',
    fontSize: fontSize(14),
  },
  pressed: {
    opacity: 0.9,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    marginBottom: hp(0.8),
    gap: wp(2),
  },
  playerNameHit: {
    flex: 1,
  },
  playerName: {
    fontSize: fontSize(16),
    fontWeight: '800',
    color: colors.text,
  },
  playerNameMuted: {
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.textMuted,
  },
  playerActions: {
    flexDirection: 'row',
    gap: wp(3),
  },
  action: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.primary,
  },
  actionDanger: {
    fontSize: fontSize(13),
    fontWeight: '800',
    color: colors.ballWicket,
  },
  renameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: wp(2),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.6),
    fontSize: fontSize(16),
    fontWeight: '700',
    color: colors.text,
  },
});
