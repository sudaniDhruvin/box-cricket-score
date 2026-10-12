import type { StateCreator } from 'zustand';
import { createPersistStore } from './persist-wrapper';

export interface GroupPlayer {
  id: string;
  name: string;
  /** False when the host removed them from future matches. Past scorecards stay. */
  active: boolean;
}

export interface MatchGroup {
  id: string;
  name: string;
  createdAt: string;
  players: GroupPlayer[];
}

export interface GroupListState {
  groups: MatchGroup[];
  createGroup: (name: string) => string;
  renameGroup: (groupId: string, name: string) => void;
  addPlayer: (groupId: string, name: string) => string | null;
  renamePlayer: (groupId: string, playerId: string, name: string) => boolean;
  removePlayer: (groupId: string, playerId: string) => void;
  restorePlayer: (groupId: string, playerId: string) => void;
  clearGroups: () => void;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function patchGroup(
  groups: MatchGroup[],
  groupId: string,
  patch: (group: MatchGroup) => MatchGroup,
): MatchGroup[] {
  return groups.map(group => (group.id === groupId ? patch(group) : group));
}

const createGroupListState: StateCreator<GroupListState> = set => ({
  groups: [],
  createGroup: name => {
    const id = newId('g');
    const group: MatchGroup = {
      id,
      name: name.trim() || 'New group',
      createdAt: new Date().toISOString(),
      players: [],
    };
    set(state => ({ groups: [group, ...state.groups] }));
    return id;
  },
  renameGroup: (groupId, name) => {
    const next = name.trim();
    if (!next) {
      return;
    }
    set(state => ({
      groups: patchGroup(state.groups, groupId, group => ({
        ...group,
        name: next,
      })),
    }));
  },
  addPlayer: (groupId, name) => {
    const next = name.trim();
    if (!next) {
      return null;
    }
    let created: string | null = null;
    set(state => ({
      groups: patchGroup(state.groups, groupId, group => {
        const clash = group.players.some(
          player => player.name.toLowerCase() === next.toLowerCase(),
        );
        if (clash) {
          return group;
        }
        created = newId('p');
        return {
          ...group,
          players: [
            ...group.players,
            { id: created, name: next, active: true },
          ],
        };
      }),
    }));
    return created;
  },
  renamePlayer: (groupId, playerId, name) => {
    const next = name.trim();
    if (!next) {
      return false;
    }
    let ok = false;
    set(state => ({
      groups: patchGroup(state.groups, groupId, group => {
        const clash = group.players.some(
          player =>
            player.id !== playerId &&
            player.name.toLowerCase() === next.toLowerCase(),
        );
        if (clash) {
          return group;
        }
        ok = true;
        return {
          ...group,
          players: group.players.map(player =>
            player.id === playerId ? { ...player, name: next } : player,
          ),
        };
      }),
    }));
    return ok;
  },
  removePlayer: (groupId, playerId) => {
    set(state => ({
      groups: patchGroup(state.groups, groupId, group => ({
        ...group,
        players: group.players.map(player =>
          player.id === playerId ? { ...player, active: false } : player,
        ),
      })),
    }));
  },
  restorePlayer: (groupId, playerId) => {
    set(state => ({
      groups: patchGroup(state.groups, groupId, group => ({
        ...group,
        players: group.players.map(player =>
          player.id === playerId ? { ...player, active: true } : player,
        ),
      })),
    }));
  },
  clearGroups: () => set({ groups: [] }),
});

export const useGroupStore = createPersistStore<GroupListState>(
  'match-group-storage',
  createGroupListState,
);

export function playerName(
  players: GroupPlayer[] | undefined,
  playerId: string | null | undefined,
): string {
  if (playerId == null) {
    return 'Player';
  }
  return players?.find(player => player.id === playerId)?.name ?? 'Player';
}

export function playerNameWithRole(
  players: GroupPlayer[] | undefined,
  playerId: string | null | undefined,
  wildcardPlayerId?: string | null,
): string {
  const name = playerName(players, playerId);
  if (playerId != null && playerId === wildcardPlayerId) {
    return `${name} (W)`;
  }
  return name;
}
