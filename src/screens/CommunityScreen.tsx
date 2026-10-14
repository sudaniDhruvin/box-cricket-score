import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { type Asset } from 'react-native-image-picker';
import {
  addGroupMember,
  assignMatchScorer,
  closeGroupPoll,
  createGroup,
  createGroupMatch,
  createGroupPoll,
  finalizeMatchTeams,
  getMatchTeams,
  getGroupMatchScorecard,
  getMyProfile,
  joinGroup,
  listGroupMatches,
  listGroupMembers,
  listGroupPolls,
  listGroupReports,
  listGroups,
  ApiError,
  listNotifications,
  markNotificationRead,
  updateNotificationSettings,
  mediaUri,
  pickMatchPlayer,
  removeGroupMember,
  reportGroupContent,
  reviewGroupReport,
  searchPlayers,
  selectMatchCaptains,
  transferGroupAdmin,
  updateGroup,
  updateGroupMember,
  uploadGroupCover,
  uploadGroupPhoto,
  voteInPoll,
  type CommunityGroup,
  type ContentReport,
  type GroupMatch,
  type GroupMember,
  type GroupPoll,
  type MatchTeam,
  type NotificationItem,
  type PlayerProfile,
  type PlayerSearchResult,
} from '../api/client';
import { getAccessToken } from '../api/session';
import { useMatchStore } from '../store/useMatchStore';
import type { MatchSummary } from '../types/match';
import { formatMatchResult } from '../utils/cricketFormat';
import { dismissalLabel, fallOfWicketsFor, partnershipsFor, playerName } from '../utils/playerScoring';
import { GroupFeedPanel } from '../components/GroupFeedPanel';
import { GroupStatsPanel } from '../components/GroupStatsPanel';
import { MatchPlayerLines } from '../components/MatchPlayerLines';
import { AppSheet, ChevronRightIcon, ChoiceRow, ConfirmSheet, PlayerAvatar, PrimaryButton, ScreenHeader, showToast } from '../components/ui';
import type { MainStackParamList } from '../navigation/types';
import { photoFile, pickPhoto } from '../social/pickPhoto';
import { JOIN_TYPES, joinButtonLabel, joinTypeLabel, joinTypeOf, roleLabel, visibilityLabel, type JoinType } from '../social/labels';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Navigation = NativeStackNavigationProp<MainStackParamList>;
type GroupTab = 'feed' | 'about' | 'polls' | 'members' | 'stats' | 'matches' | 'reports';

const GROUP_TAB_LABEL: Record<GroupTab, string> = {
  feed: 'Discussion',
  about: 'About',
  members: 'Members',
  matches: 'Matches',
  polls: 'Polls',
  stats: 'Stats',
  reports: 'Reports',
};
type ScreenView = 'groups' | 'group' | 'notifications' | 'draft';

function plainLabel(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function scheduledInstant(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) || !/^\d{2}:\d{2}$/.test(time.trim())) {
    throw new Error('Enter the date as YYYY-MM-DD and the time as HH:MM.');
  }
  const parsed = new Date(`${date.trim()}T${time.trim()}:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error('That date and time are not valid.');
  return parsed.toISOString();
}

function toIso(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function timeAgo(value: string): string {
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return '';
  const seconds = Math.max(0, (Date.now() - parsed.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatScheduled(value: string | null): string {
  const iso = toIso(value);
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function Field({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
      multiline={multiline}
      style={[styles.field, multiline && styles.multilineField]}
      textAlignVertical={multiline ? 'top' : 'center'}
      accessibilityLabel={placeholder}
    />
  );
}

function Action({
  label,
  onPress,
  disabled,
  secondary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        secondary && styles.secondaryAction,
        disabled && styles.disabledAction,
        pressed && !disabled && styles.pressedAction,
      ]}
    >
      <Text style={[styles.actionText, secondary && styles.secondaryActionText]}>{label}</Text>
    </Pressable>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function BellIcon() {
  return (
    <Svg width={wp(5.6)} height={wp(5.6)} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"
        stroke={colors.primary}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M13.7 21a2 2 0 01-3.4 0" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function InboxButton({ count, onPress }: { count: number; onPress: () => void }) {
  const label = count ? `Inbox, ${count} unread` : 'Inbox';
  return (
    <Pressable onPress={onPress} style={styles.inboxBtn} accessibilityRole="button" accessibilityLabel={label}>
      <BellIcon />
      {count > 0 ? (
        <View style={styles.inboxBadge}>
          <Text style={styles.inboxBadgeText}>{count > 99 ? '99+' : String(count)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Pill({
  label,
  onPress,
  tone = 'chip',
  disabled,
  fill,
}: {
  label: string;
  onPress?: () => void;
  tone?: 'chip' | 'primary';
  disabled?: boolean;
  fill?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pillBtn,
        fill && styles.pillFill,
        tone === 'primary' ? styles.pillPrimary : styles.pillChip,
        disabled && styles.disabledAction,
        pressed && Boolean(onPress) && !disabled && styles.pressedAction,
      ]}
    >
      <Text style={[styles.pillBtnText, tone === 'primary' && styles.pillBtnTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function GroupThumb({ name, coverUrl, photoUrl }: { name: string; coverUrl?: string | null; photoUrl?: string | null }) {
  const uri = mediaUri(coverUrl) ?? mediaUri(photoUrl);
  if (uri) return <Image source={{ uri }} style={styles.thumb} accessibilityLabel="" />;
  return (
    <View style={[styles.thumb, styles.thumbFallback]}>
      <Text style={styles.thumbLetter}>{(name.trim().slice(0, 1) || 'G').toUpperCase()}</Text>
    </View>
  );
}

function memberSentence(count: number): string {
  return `${count} ${count === 1 ? 'member' : 'members'}`;
}

export function CommunityScreen() {
  const navigation = useNavigation<Navigation>();
  const {top} = useSafeAreaInsets();
  const [user, setUser] = useState<PlayerProfile | null>(null);
  const [view, setView] = useState<ScreenView>('groups');
  const [tab, setTab] = useState<GroupTab>('feed');
  const [showGroupTitle, setShowGroupTitle] = useState(false);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [polls, setPolls] = useState<GroupPoll[]>([]);
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [feedTick, setFeedTick] = useState(0);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [postActivity, setPostActivity] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<GroupMatch | null>(null);
  const [selectedScorecard, setSelectedScorecard] = useState<MatchSummary | null>(null);
  const [draftTeams, setDraftTeams] = useState<MatchTeam[]>([]);
  const [query, setQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupVisibility, setGroupVisibility] = useState<'public' | 'private'>('public');
  const [groupJoinType, setGroupJoinType] = useState<JoinType>('open');
  const [groupPhoto, setGroupPhoto] = useState<Asset | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<Asset | null>(null);
  const [sheet, setSheet] = useState<'create' | 'settings' | 'add' | null>(null);
  const [playerQuery, setPlayerQuery] = useState('');
  const [playerResults, setPlayerResults] = useState<PlayerSearchResult[]>([]);
  const [confirm, setConfirm] = useState<{ title: string; body: string; confirmLabel: string; run: () => void } | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [voteSelections, setVoteSelections] = useState<Record<number, number[]>>({});
  const [matchTitle, setMatchTitle] = useState('');
  const [teamOneName, setTeamOneName] = useState('Team A');
  const [teamTwoName, setTeamTwoName] = useState('Team B');
  const [overs, setOvers] = useState('10');
  const [teamSize, setTeamSize] = useState('6');
  const [startWhen, setStartWhen] = useState<'now' | 'later'>('now');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [scorerPick, setScorerPick] = useState<number | null>(null);
  const [captainOne, setCaptainOne] = useState<number | null>(null);
  const [captainTwo, setCaptainTwo] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = group?.myRole === 'owner' || group?.myRole === 'admin';
  const activeMembers = useMemo(() => members.filter(member => member.status === 'active'), [members]);
  const pendingMembers = useMemo(() => members.filter(member => member.status === 'pending'), [members]);
  const yourGroups = useMemo(() => groups.filter(row => row.membershipStatus === 'active'), [groups]);
  const pendingGroups = useMemo(() => groups.filter(row => row.membershipStatus === 'pending'), [groups]);
  const discoverGroups = useMemo(
    () => groups.filter(row => row.membershipStatus !== 'active' && row.membershipStatus !== 'pending'),
    [groups],
  );

  const run = useCallback(async (task: () => Promise<void>) => {
    setLoading(true);
    try {
      await task();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'That could not be completed. Try again.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const applyInbox = useCallback((inbox: { items: NotificationItem[]; unreadCount: number; postActivity?: boolean }) => {
    setNotifications(inbox.items);
    setUnreadCount(inbox.unreadCount);
    if (typeof inbox.postActivity === 'boolean') setPostActivity(inbox.postActivity);
  }, []);

  const refreshGroups = useCallback(async (search = '') => {
    const [profile, rows, inbox] = await Promise.all([
      getMyProfile(),
      listGroups(search),
      listNotifications(),
    ]);
    setUser(profile);
    setGroups(rows);
    applyInbox(inbox);
  }, [applyInbox]);

  const refreshSelectedGroup = useCallback(async (id: number) => {
    const [groupRows, memberRows, pollRows, matchRows] = await Promise.all([
      listGroups().then(rows => rows.find(row => row.id === id) ?? null),
      listGroupMembers(id),
      listGroupPolls(id),
      listGroupMatches(id),
    ]);
    setGroup(groupRows);
    setMembers(memberRows);
    setPolls(pollRows);
    setMatches(matchRows);
    const role = groupRows?.myRole;
    setReports(role === 'owner' || role === 'admin' ? await listGroupReports(id) : []);
  }, []);

  useEffect(() => {
    if (!getAccessToken()) return;
    run(async () => refreshGroups(''));
  }, [refreshGroups, run]);

  const openGroup = useCallback((row: CommunityGroup) => {
    if (row.membershipStatus !== 'active') return;
    setGroup(row);
    setView('group');
    setTab('feed');
    setShowGroupTitle(false);
    run(() => refreshSelectedGroup(row.id));
  }, [refreshSelectedGroup, run]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (view === 'group' && group) {
      setFeedTick(value => value + 1);
      run(() => refreshSelectedGroup(group.id));
    }
    else if (view === 'notifications') {
      run(async () => {
        applyInbox(await listNotifications());
      });
    } else run(() => refreshGroups(query));
  }, [applyInbox, group, query, refreshGroups, refreshSelectedGroup, run, view]);

  const resetGroupForm = () => {
    setGroupName('');
    setGroupDescription('');
    setGroupVisibility('public');
    setGroupJoinType('open');
    setGroupPhoto(null);
    setCoverPhoto(null);
  };

  const createNewGroup = () => run(async () => {
    let created = await createGroup({
      name: groupName.trim(),
      description: groupDescription.trim(),
      visibility: groupVisibility,
      joinType: groupJoinType,
    });
    let photoNote: string | null = null;
    try {
      if (groupPhoto) created = await uploadGroupPhoto(created.id, photoFile(groupPhoto, 'group.jpg'));
      if (coverPhoto) created = await uploadGroupCover(created.id, photoFile(coverPhoto, 'cover.jpg'));
    } catch (cause) {
      photoNote = cause instanceof Error ? cause.message : 'The group was created, but a photo could not be uploaded.';
    }
    resetGroupForm();
    setSheet(null);
    await refreshGroups('');
    setGroup(created);
    setView('group');
    setTab('feed');
    await refreshSelectedGroup(created.id);
    if (photoNote) showToast(photoNote, 'error');
    else showToast('Group created.');
  });

  const saveGroupSettings = () => {
    if (!group) return;
    run(async () => {
      let saved = await updateGroup(group.id, {
        name: groupName.trim(),
        description: groupDescription.trim(),
        visibility: groupVisibility,
        joinType: groupJoinType,
      });
      let photoNote: string | null = null;
      try {
        if (groupPhoto) saved = await uploadGroupPhoto(saved.id, photoFile(groupPhoto, 'group.jpg'));
        if (coverPhoto) saved = await uploadGroupCover(saved.id, photoFile(coverPhoto, 'cover.jpg'));
      } catch (cause) {
        photoNote = cause instanceof Error ? cause.message : 'Settings were saved, but a photo could not be uploaded.';
      }
      setGroup(saved);
      setGroupPhoto(null);
      setCoverPhoto(null);
      setSheet(null);
      if (photoNote) showToast(photoNote, 'error');
      else showToast('Group settings saved.');
      await refreshGroups(query);
    });
  };

  const openSettings = () => {
    if (!group) return;
    setGroupName(group.name);
    setGroupDescription(group.description ?? '');
    setGroupVisibility(group.visibility === 'public' ? 'public' : 'private');
    setGroupJoinType(joinTypeOf(group));
    setGroupPhoto(null);
    setCoverPhoto(null);
    setSheet('settings');
  };

  const chooseGroupImage = async (target: 'photo' | 'cover') => {
    try {
      const asset = await pickPhoto();
      if (!asset) return;
      if (target === 'photo') setGroupPhoto(asset);
      else setCoverPhoto(asset);
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'Could not open the photo library.', 'error');
    }
  };

  const searchGroups = () => {
    if (query.trim().length === 1) {
      showToast('Type at least 2 letters to search groups.', 'error');
      return;
    }
    run(() => refreshGroups(query));
  };

  const join = (row: CommunityGroup) => run(async () => {
    const result = await joinGroup(row.id);
    showToast(result.status === 'active' ? `You joined ${row.name}.` : `Request sent to the admins of ${row.name}.`);
    await refreshGroups(query);
  });

  const searchPeople = () => run(async () => {
    if (playerQuery.trim().length < 2) throw new Error('Type at least 2 letters to find a player.');
    setPlayerResults(await searchPlayers(playerQuery));
  });

  const addPlayer = (player: PlayerSearchResult) => {
    if (!group) return;
    run(async () => {
      await addGroupMember(group.id, player.username);
      setPlayerQuery('');
      setPlayerResults([]);
      setSheet(null);
      setMembers(await listGroupMembers(group.id));
      showToast(`${player.displayName} is now in the group.`);
    });
  };

  const loadNotifications = () => run(async () => {
    applyInbox(await listNotifications());
    setView('notifications');
  });

  const readNotification = (item: NotificationItem) => run(async () => {
    if (!item.readAt) await markNotificationRead(item.id);
    applyInbox(await listNotifications());
  });

  const togglePostActivity = (value: boolean) => {
    const previous = postActivity;
    setPostActivity(value);
    run(async () => {
      try {
        const saved = await updateNotificationSettings(value);
        setPostActivity(saved.postActivity);
        showToast(saved.postActivity ? 'Likes and comments are on.' : 'Likes and comments are off.');
      } catch (cause) {
        setPostActivity(previous);
        if (cause instanceof ApiError && cause.status === 404) {
          throw new Error('Likes and comments cannot be muted yet. Try again later.');
        }
        throw cause;
      }
    });
  };

  const publishPoll = () => {
    if (!group) return;
    const question = pollQuestion.trim();
    const options = pollOptions.map(option => option.trim()).filter(Boolean);
    if (question.length < 3) {
      showToast('Write a question of at least 3 letters.', 'error');
      return;
    }
    if (question.length > 240) {
      showToast('Keep the question shorter.', 'error');
      return;
    }
    if (options.length < 2) {
      showToast('Add at least two options.', 'error');
      return;
    }
    if (new Set(options.map(option => option.toLowerCase())).size !== options.length) {
      showToast('Each option needs a different answer.', 'error');
      return;
    }
    run(async () => {
      await createGroupPoll(group.id, {
        question,
        options,
        multipleChoice,
        anonymous: false,
        allowVoteChange: false,
      });
      setPollQuestion('');
      setPollOptions(['', '']);
      setMultipleChoice(false);
      setPolls(await listGroupPolls(group.id));
      showToast('Poll created.');
    });
  };

  const vote = (poll: GroupPoll, optionIds = voteSelections[poll.id] ?? poll.myOptionIds) => run(async () => {
    const updated = await voteInPoll(poll.id, optionIds);
    setPolls(current => current.map(item => item.id === poll.id ? updated : item));
    showToast('Vote saved.');
  });

  const choosePollOption = (poll: GroupPoll, optionId: number) => {
    if (poll.status !== 'open' || poll.myOptionIds.length > 0) return;
    if (!poll.multipleChoice) {
      vote(poll, [optionId]);
      return;
    }
    setVoteSelections(current => {
      const before = current[poll.id] ?? [];
      const after = before.includes(optionId) ? before.filter(id => id !== optionId) : [...before, optionId];
      return { ...current, [poll.id]: after };
    });
  };

  const closePoll = (poll: GroupPoll) => run(async () => {
    const updated = await closeGroupPoll(poll.id);
    setPolls(current => current.map(item => item.id === poll.id ? updated : item));
    showToast('Poll closed.');
  });

  const reportContent = (resourceType: 'post' | 'poll', resourceId: number) => {
    if (!group) return;
    run(async () => {
      await reportGroupContent(group.id, resourceType, resourceId, 'Please review this content');
      showToast('Report sent to the group administrators.');
    });
  };

  const reviewReport = (report: ContentReport, status: 'dismissed' | 'actioned') => {
    if (!group) return;
    run(async () => {
      await reviewGroupReport(group.id, report.id, status);
      setReports(await listGroupReports(group.id));
      showToast(status === 'actioned' ? 'Report handled.' : 'Report dismissed.');
      if (status === 'actioned' && report.resourceType === 'post') setFeedTick(value => value + 1);
      if (status === 'actioned' && report.resourceType === 'poll') setPolls(await listGroupPolls(group.id));
    });
  };

  const moderateMember = (member: GroupMember, status: 'active' | 'rejected') => {
    if (!group) return;
    run(async () => {
      await updateGroupMember(group.id, member.userId, { status });
      setMembers(await listGroupMembers(group.id));
      showToast(status === 'active' ? `${member.displayName} is now in the group.` : `Request from ${member.displayName} was declined.`);
    });
  };

  const openDraft = (match: GroupMatch) => run(async () => {
    setSelectedMatch(match);
    setDraftTeams(await getMatchTeams(match.id));
    setCaptainOne(null);
    setCaptainTwo(null);
    setScorerPick(match.scorerUserId ?? null);
    setView('draft');
  });

  const openScorecard = (match: GroupMatch) => {
    if (!group) return;
    run(async () => {
      const result = await getGroupMatchScorecard(group.id, match.id);
      setSelectedScorecard(result.match);
    });
  };

  const createMatch = () => {
    if (!group) return;
    run(async () => {
      const oversValue = Number(overs);
      const teamSizeValue = Number(teamSize);
      if (!Number.isInteger(oversValue) || oversValue < 1 || oversValue > 50) throw new Error('Use 1 to 50 overs per side.');
      if (!Number.isInteger(teamSizeValue) || teamSizeValue < 1 || teamSizeValue > 20) throw new Error('Use 1 to 20 players per side.');
      const title = matchTitle.trim();
      const scheduledAt = startWhen === 'later' ? scheduledInstant(matchDate, matchTime) : new Date().toISOString();
      const created = await createGroupMatch(group.id, {
        title,
        teams: [teamOneName.trim(), teamTwoName.trim()],
        oversPerSide: oversValue,
        teamSize: teamSizeValue,
        scheduledAt,
      });
      setMatchTitle('');
      setStartWhen('now');
      setMatchDate('');
      setMatchTime('');
      await refreshSelectedGroup(group.id);
      showToast('Match created.');
      await openDraft({
        id: created.id,
        clientId: created.clientId,
        title,
        format: 'box-cricket',
        status: created.status,
        scheduledAt,
        teamSize: created.teamSize,
        oversPerSide: created.oversPerSide,
        teams: created.teams,
      });
    });
  };

  const saveCaptains = () => {
    if (!selectedMatch || captainOne === null || captainTwo === null) return;
    run(async () => {
      await selectMatchCaptains(selectedMatch.id, [captainOne, captainTwo]);
      setDraftTeams(await getMatchTeams(selectedMatch.id));
      showToast('Captains selected. The captains can now make alternating picks.');
    });
  };

  const makePick = (side: 1 | 2, playerId: number) => {
    if (!selectedMatch) return;
    run(async () => {
      await pickMatchPlayer(selectedMatch.id, side, playerId);
      setDraftTeams(await getMatchTeams(selectedMatch.id));
      showToast('Added to the playing side.');
    });
  };

  const finalize = () => {
    if (!selectedMatch || !group) return;
    run(async () => {
      await finalizeMatchTeams(selectedMatch.id);
      await refreshSelectedGroup(group.id);
      setSelectedMatch(current => current ? { ...current, status: 'scheduled' } : current);
      setMatches(current => current.map(item => item.id === selectedMatch.id ? { ...item, status: 'scheduled' } : item));
      showToast('Teams are set for this match.');
    });
  };

  const saveScorer = () => {
    if (!selectedMatch || scorerPick == null) return;
    const chosen = scorerPick;
    run(async () => {
      await assignMatchScorer(selectedMatch.id, chosen);
      setSelectedMatch(current => current ? { ...current, scorerUserId: chosen } : current);
      setMatches(current => current.map(item => item.id === selectedMatch.id ? { ...item, scorerUserId: chosen } : item));
      showToast('Scorer assigned. They can start the match.');
    });
  };

  const openScoring = (match: GroupMatch, teams: MatchTeam[]) => {
    if (!group) return;
    const local = useMatchStore.getState().matches.find(item => item.id === match.clientId);
    if (local) {
      navigation.navigate('NewMatch', { resumeMatchId: local.id });
      return;
    }
    const launch = () => {
      const squad = (side: 1 | 2) => {
        const team = teams.find(item => item.side === side);
        return {
          players: [...(team?.players ?? [])]
            .sort((left, right) => left.order - right.order)
            .map(player => ({ userId: player.userId, name: player.displayName })),
        };
      };
      navigation.navigate('NewMatch', {
        groupLaunch: {
          groupId: group.id,
          clientId: match.clientId,
          teams: match.teams,
          oversPerSide: match.oversPerSide,
          teamSize: match.teamSize,
          scheduledAt: toIso(match.scheduledAt),
          scorerUserId: match.scorerUserId ?? undefined,
          squads: [squad(1), squad(2)],
        },
      });
    };
    if (match.status === 'live' || match.status === 'completed') {
      run(async () => {
        try {
          const card = await getGroupMatchScorecard(group.id, match.id);
          if (card.match?.id && card.match.innings?.length === 2) {
            useMatchStore.getState().addMatch(card.match);
            navigation.navigate('NewMatch', { resumeMatchId: card.match.id });
            return;
          }
        } catch {
          showToast('This scorecard is not on this phone yet.', 'error');
          return;
        }
        showToast('This scorecard is not on this phone yet.', 'error');
      });
      return;
    }
    launch();
  };

  const canScore = (match: GroupMatch) => Boolean(match.scorerUserId) && (isAdmin || match.scorerUserId === user?.id);

  const nextSide: 1 | 2 = (draftTeams[0]?.players.length ?? 0) <= (draftTeams[1]?.players.length ?? 0) ? 1 : 2;
  const nextCaptainId = draftTeams.find(team => team.side === nextSide)?.captain?.userId;
  const pickedIds = new Set(draftTeams.flatMap(team => team.players.map(player => player.userId)));

  const askToLeave = () => {
    if (!group || !user || group.myRole === 'owner') return;
    const leaving = group;
    const personId = user.id;
    setConfirm({
      title: `Leave ${leaving.name}?`,
      body: 'You can ask to join again later.',
      confirmLabel: 'Leave group',
      run: () => {
        setConfirm(null);
        run(async () => {
          await removeGroupMember(leaving.id, personId);
          setView('groups');
          setGroup(null);
          showToast(`You left ${leaving.name}.`);
          await refreshGroups('');
        });
      },
    });
  };

  const back = () => {
    if (view === 'draft') setView('group');
    else if (view === 'group' || view === 'notifications') setView('groups');
    else navigation.goBack();
  };

  const onCanvas = view === 'groups' || view === 'group' || view === 'notifications';
  const groupTabs: GroupTab[] = ['feed', 'about', 'members', 'matches', 'polls', 'stats', ...(isAdmin ? ['reports' as const] : [])];
  const facepile = activeMembers.slice(0, 5);

  if (!getAccessToken()) {
    return (
      <View style={[styles.root, { paddingTop: top }]}>
        <ScreenHeader title="Groups" backLabel="Matches" onBack={back} />
        <View style={styles.emptyState}>
          <Text style={styles.heading}>Sign in to use groups</Text>
          <Text style={styles.muted}>Search for a group, request to join, or create one of your own.</Text>
          <Action label="Open account" onPress={() => navigation.navigate('Account')} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: top }, onCanvas && styles.canvasRoot]}>
      <ScreenHeader
        style={styles.headerBar}
        title={view === 'group' ? (showGroupTitle ? group?.name ?? 'Group' : undefined) : view === 'draft' ? 'Team selection' : view === 'notifications' ? 'Notifications' : 'Groups'}
        backLabel={view === 'groups' ? 'Matches' : 'Groups'}
        onBack={back}
        right={view === 'groups' || view === 'group' ? <InboxButton count={unreadCount} onPress={loadNotifications} /> : undefined}
      />
      {loading && !refreshing ? <ActivityIndicator style={styles.loading} color={colors.primary} /> : null}
      <ScrollView
        style={onCanvas ? styles.canvasScroll : undefined}
        contentContainerStyle={[styles.content, view === 'group' ? styles.groupCanvas : onCanvas ? styles.homeCanvas : null]}
        onScroll={event => {
          if (view !== 'group') return;
          const next = event.nativeEvent.contentOffset.y > wp(30);
          setShowGroupTitle(current => (current === next ? current : next));
        }}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        {view === 'groups' ? (
          <View>
            <View style={styles.searchShell}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search groups"
                placeholderTextColor={colors.inkSecondary}
                style={styles.searchInput}
                returnKeyType="search"
                onSubmitEditing={searchGroups}
                accessibilityLabel="Search groups"
              />
            </View>
            <Pressable
              style={styles.createRow}
              onPress={() => { resetGroupForm(); setSheet('create'); }}
              accessibilityRole="button"
              accessibilityLabel="Create group"
            >
              <View style={styles.createMark}><Text style={styles.createMarkText}>+</Text></View>
              <Text style={styles.createLabel}>Create group</Text>
            </Pressable>
            {yourGroups.length ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.fbSection}>Your groups</Text>
                {yourGroups.map(row => (
                  <Pressable key={row.id} style={styles.groupRow} onPress={() => openGroup(row)} accessibilityRole="button">
                    <GroupThumb name={row.name} coverUrl={row.coverUrl} photoUrl={row.photoUrl} />
                    <View style={styles.flex}>
                      <Text style={styles.groupRowTitle} numberOfLines={1}>{row.name}</Text>
                      <Text style={styles.groupRowMeta} numberOfLines={1}>
                        {visibilityLabel(row.visibility)} group · {memberSentence(row.memberCount ?? 0)} · {roleLabel(row.myRole)}
                      </Text>
                    </View>
                    <ChevronRightIcon size={wp(4)} color={colors.inkSecondary} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            {pendingGroups.length ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.fbSection}>Requests</Text>
                {pendingGroups.map(row => (
                  <View key={row.id} style={styles.discoverCard}>
                    {mediaUri(row.coverUrl) ? <Image source={{ uri: mediaUri(row.coverUrl) ?? undefined }} style={styles.discoverCover} /> : <View style={styles.discoverCover} />}
                    <View style={styles.discoverBody}>
                      <Text style={styles.discoverTitle}>{row.name}</Text>
                      <Text style={styles.groupRowMeta}>{visibilityLabel(row.visibility)} group · {memberSentence(row.memberCount ?? 0)}</Text>
                      <Pill label="Requested" disabled />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            {discoverGroups.length ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.fbSection}>Discover</Text>
                {discoverGroups.map(row => {
                  const joinType = joinTypeOf(row);
                  const label = joinType === 'open' ? 'Join group' : joinButtonLabel(joinType, row.membershipStatus);
                  return (
                    <View key={row.id} style={styles.discoverCard}>
                      {mediaUri(row.coverUrl) ? <Image source={{ uri: mediaUri(row.coverUrl) ?? undefined }} style={styles.discoverCover} /> : <View style={styles.discoverCover} />}
                      <View style={styles.discoverBody}>
                        <Text style={styles.discoverTitle}>{row.name}</Text>
                        <Text style={styles.groupRowMeta}>
                          {visibilityLabel(row.visibility)} group · {joinTypeLabel(joinType)} · {memberSentence(row.memberCount ?? 0)}
                        </Text>
                        {row.description ? <Text style={styles.groupRowMeta} numberOfLines={2}>{row.description}</Text> : null}
                        <Pill label={label} tone="primary" onPress={() => join(row)} />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
            {!groups.length ? (
              <View style={styles.emptyCard}>
                <Text style={styles.itemTitle}>No groups yet</Text>
                <Text style={styles.muted}>Search by name, or create a group and choose who can join.</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {view === 'group' && group ? (
          <View style={styles.pageHero}>
            <View>
              {mediaUri(group.coverUrl) ? (
                <Image source={{ uri: mediaUri(group.coverUrl) ?? undefined }} style={styles.pageCover} />
              ) : <View style={styles.pageCover} />}
              {isAdmin ? (
                <Pressable style={styles.coverEdit} onPress={openSettings} accessibilityRole="button" accessibilityLabel="Edit group">
                  <Text style={styles.coverEditText}>Edit</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.pageBody}>
              <Pressable onPress={isAdmin ? openSettings : undefined} disabled={!isAdmin} accessibilityRole={isAdmin ? 'button' : undefined} accessibilityLabel={isAdmin ? 'Edit group photo' : group.name}>
                <View style={styles.avatarRing}>
                  <PlayerAvatar name={group.name} photoUrl={group.photoUrl} size={wp(22)} />
                </View>
              </Pressable>
              <Text style={styles.pageName}>{group.name}</Text>
              <Text style={styles.pageMeta}>
                {visibilityLabel(group.visibility)} group · {memberSentence(group.memberCount ?? activeMembers.length)}
              </Text>
              {group.description ? <Text style={styles.intro} numberOfLines={2}>{group.description}</Text> : null}
              {facepile.length ? (
                <View style={styles.facepile}>
                  {facepile.map((member, index) => (
                    <View key={member.userId} style={[styles.face, index > 0 && styles.faceOverlap, { zIndex: facepile.length - index }]}>
                      <PlayerAvatar name={member.displayName} photoUrl={member.photoUrl} size={wp(7.5)} />
                    </View>
                  ))}
                  <Text style={styles.faceCaption}>{roleLabel(group.myRole)}</Text>
                </View>
              ) : null}
              <View style={styles.actionRow}>
                <Pill label="Joined" fill onPress={group.myRole === 'owner' ? undefined : askToLeave} />
                {isAdmin ? <Pill label="Add" fill onPress={() => { setPlayerQuery(''); setPlayerResults([]); setSheet('add'); }} /> : null}
                {isAdmin ? <Pill label="Manage" fill onPress={openSettings} /> : null}
              </View>
            </View>
          </View>
        ) : null}
        {view === 'group' && group ? (
          <View style={styles.tabBar}>
            {groupTabs.map(value => (
              <Pressable key={value} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.activeTab]} accessibilityRole="tab" accessibilityState={{ selected: tab === value }}>
                <Text style={[styles.tabText, tab === value && styles.activeTabText]}>{GROUP_TAB_LABEL[value]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {view === 'group' && group && tab === 'feed' ? (
          <GroupFeedPanel
            groupId={group.id}
            userId={user?.id ?? null}
            viewerName={user?.displayName ?? 'You'}
            viewerPhotoUrl={user?.photoUrl}
            isAdmin={Boolean(isAdmin)}
            refreshKey={feedTick}
            onNotice={showToast}
          />
        ) : null}
        {view === 'group' && group && tab === 'about' ? (
          <View style={styles.paddedBlock}>
            <View style={styles.fbCard}>
              <Text style={styles.fbCardTitle}>About</Text>
              <Text style={styles.body}>{group.description?.trim() ? group.description : 'No description yet.'}</Text>
            </View>
            <View style={styles.fbCard}>
              <Text style={styles.fbCardTitle}>Details</Text>
              <Text style={styles.detailLine}>Privacy · {visibilityLabel(group.visibility)} group</Text>
              <Text style={styles.detailLine}>Joining · {joinTypeLabel(joinTypeOf(group))}</Text>
              <Text style={styles.detailLine}>Members · {memberSentence(group.memberCount ?? activeMembers.length)}</Text>
              {group.location ? <Text style={styles.detailLine}>Location · {group.location}</Text> : null}
              <Text style={styles.detailLine}>Your role · {roleLabel(group.myRole)}</Text>
            </View>
          </View>
        ) : null}

            {view === 'group' && group && tab === 'polls' ? (
              <View style={styles.paddedBlock}>
                <View style={styles.fbCard}>
                  <Text style={styles.fbCardTitle}>Create a poll</Text>
                  <Field value={pollQuestion} onChangeText={setPollQuestion} placeholder="Ask a question" />
                  {pollOptions.map((option, index) => (
                    <View key={index} style={styles.optionFieldRow}>
                      <TextInput
                        value={option}
                        onChangeText={value => setPollOptions(current => current.map((item, itemIndex) => itemIndex === index ? value : item))}
                        placeholder={`Option ${index + 1}`}
                        placeholderTextColor={colors.textMuted}
                        style={[styles.field, styles.optionField]}
                        accessibilityLabel={`Option ${index + 1}`}
                        maxLength={120}
                      />
                      {index >= 2 ? (
                        <Pressable
                          onPress={() => setPollOptions(current => current.filter((_, itemIndex) => itemIndex !== index))}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove option ${index + 1}`}
                          hitSlop={8}
                        >
                          <Text style={styles.removeOption}>Remove</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                  {pollOptions.length < 10 ? (
                    <Pressable onPress={() => setPollOptions(current => [...current, ''])} accessibilityRole="button">
                      <Text style={styles.addOption}>Add option</Text>
                    </Pressable>
                  ) : null}
                  <View style={styles.switchRow}>
                    <Text style={styles.body}>Allow more than one answer</Text>
                    <Switch value={multipleChoice} onValueChange={setMultipleChoice} />
                  </View>
                  <Action label="Create poll" onPress={publishPoll} disabled={!pollQuestion.trim()} />
                </View>
                {polls.map(poll => {
                  const selected = voteSelections[poll.id] ?? poll.myOptionIds;
                  const voted = poll.myOptionIds.length > 0;
                  const showResults = voted || poll.status !== 'open';
                  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
                  const authorName = poll.author?.displayName || 'Group member';
                  return (
                    <View key={poll.id} style={styles.pollCard}>
                      <View style={styles.pollAuthor}>
                        <PlayerAvatar name={authorName} photoUrl={poll.author?.photoUrl} size={wp(10)} />
                        <View style={styles.flex}>
                          <Text style={styles.itemTitle}>{authorName}</Text>
                          <Text style={styles.muted}>{timeAgo(poll.createdAt)} · Poll{poll.status !== 'open' ? ' · Closed' : ''}</Text>
                        </View>
                      </View>
                      <Text style={styles.pollQuestion}>{poll.question}</Text>
                      {poll.options.map(option => {
                        const chosen = selected.includes(option.id);
                        const share = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0;
                        return (
                          <Pressable
                            key={option.id}
                            disabled={poll.status !== 'open' || voted}
                            onPress={() => choosePollOption(poll, option.id)}
                            style={styles.pollOption}
                            accessibilityRole="button"
                            accessibilityState={{ selected: chosen }}
                          >
                            {showResults ? <View style={[styles.pollFill, { width: `${share}%` }]} /> : null}
                            <View style={[styles.pollRadio, chosen && styles.pollRadioOn, poll.multipleChoice && styles.pollBox]}>
                              {chosen ? <View style={[styles.pollDot, poll.multipleChoice && styles.pollTick]} /> : null}
                            </View>
                            <Text style={styles.pollOptionText}>{option.label}</Text>
                            {showResults ? <Text style={styles.pollPercent}>{share}%</Text> : null}
                          </Pressable>
                        );
                      })}
                      <Text style={styles.muted}>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</Text>
                      {poll.status === 'open' && poll.multipleChoice && !voted ? (
                        <Action label="Vote" onPress={() => vote(poll)} disabled={!selected.length} />
                      ) : null}
                      <View style={styles.pollFooter}>
                        {poll.status === 'open' && (poll.myRole === 'owner' || poll.myRole === 'admin') ? (
                          <Pressable onPress={() => closePoll(poll)} accessibilityRole="button">
                            <Text style={styles.pollFooterText}>Close poll</Text>
                          </Pressable>
                        ) : null}
                        <Pressable onPress={() => reportContent('poll', poll.id)} accessibilityRole="button">
                          <Text style={styles.pollFooterText}>Report</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                {!polls.length ? (
                  <View style={styles.fbCard}>
                    <Text style={styles.itemTitle}>No polls yet</Text>
                    <Text style={styles.muted}>Ask the group a question.</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {view === 'group' && group && tab === 'members' ? (
              <View style={styles.paddedBlock}>
                {isAdmin && pendingMembers.length ? (
                  <View style={styles.fbCard}>
                    <Text style={styles.fbCardTitle}>Member requests</Text>
                    {pendingMembers.map(member => (
                      <View key={member.userId} style={styles.personRow}>
                        <PlayerAvatar name={member.displayName} photoUrl={member.photoUrl} size={wp(12)} />
                        <View style={styles.flex}>
                          <Text style={styles.groupRowTitle}>{member.displayName}</Text>
                          <Text style={styles.groupRowMeta}>@{member.username}</Text>
                          <View style={styles.personActions}>
                            <Pill label="Approve" tone="primary" onPress={() => moderateMember(member, 'active')} />
                            <Pill label="Decline" onPress={() => moderateMember(member, 'rejected')} />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
                <View style={styles.fbCard}>
                  <Text style={styles.fbCardTitle}>Members · {activeMembers.length}</Text>
                  <Text style={styles.groupRowMeta}>Group admin manages the group. A match captain is chosen for one match only.</Text>
                  {isAdmin ? <Pill label="Add a player" onPress={() => { setPlayerQuery(''); setPlayerResults([]); setSheet('add'); }} /> : null}
                  {activeMembers.map(member => (
                    <View key={member.userId} style={styles.personRow}>
                      <PlayerAvatar name={member.displayName} photoUrl={member.photoUrl} size={wp(12)} />
                      <View style={styles.flex}>
                        <Text style={styles.groupRowTitle}>{member.displayName}</Text>
                        <Text style={styles.groupRowMeta}>@{member.username} · {roleLabel(member.role)}</Text>
                        <View style={styles.personActions}>
                          {group.myRole === 'owner' && member.userId !== user?.id ? (
                            <Pill label="Make admin" onPress={() => setConfirm({
                              title: `Make ${member.displayName} the group admin?`,
                              body: 'You become a member. This applies to the whole group.',
                              confirmLabel: 'Transfer admin',
                              run: () => {
                                setConfirm(null);
                                run(async () => {
                                  await transferGroupAdmin(group.id, member.userId);
                                  await refreshSelectedGroup(group.id);
                                  showToast(`${member.displayName} is now the group admin.`);
                                });
                              },
                            })} />
                          ) : null}
                          {isAdmin && member.role !== 'owner' && member.userId !== user?.id ? (
                            <Pill label="Remove" onPress={() => setConfirm({
                              title: `Remove ${member.displayName}?`,
                              body: 'They will need to join again to see this group.',
                              confirmLabel: 'Remove',
                              run: () => {
                                setConfirm(null);
                                run(async () => {
                                  await removeGroupMember(group.id, member.userId);
                                  setMembers(await listGroupMembers(group.id));
                                  showToast(`${member.displayName} was removed.`);
                                });
                              },
                            })} />
                          ) : null}
                        </View>
                      </View>
                    </View>
                  ))}
                  {!activeMembers.length ? <Text style={styles.muted}>No members listed.</Text> : null}
                </View>
              </View>
            ) : null}

            {view === 'group' && group && tab === 'stats' ? (
              <View style={styles.paddedBlock}>
                <GroupStatsPanel groupId={group.id} userId={user?.id ?? null} refreshKey={refreshing} />
              </View>
            ) : null}

            {view === 'group' && group && tab === 'matches' ? (
              <View style={styles.paddedBlock}>
                {isAdmin ? (
                  <View style={styles.card}>
                    <SectionTitle>Schedule a match and pick the teams</SectionTitle>
                    <Field value={matchTitle} onChangeText={setMatchTitle} placeholder="Match title" />
                    <View style={styles.inlineRow}><View style={styles.flex}><Field value={teamOneName} onChangeText={setTeamOneName} placeholder="First team" /></View><View style={styles.flex}><Field value={teamTwoName} onChangeText={setTeamTwoName} placeholder="Second team" /></View></View>
                    <View style={styles.inlineRow}><View style={styles.flex}><Field value={overs} onChangeText={setOvers} placeholder="Overs per side" keyboardType="number-pad" /></View><View style={styles.flex}><Field value={teamSize} onChangeText={setTeamSize} placeholder="Players per side" keyboardType="number-pad" /></View></View>
                    <Text style={styles.fieldLabel}>When</Text>
                    <ChoiceRow
                      options={[{ value: 'now', label: 'Start when ready' }, { value: 'later', label: 'Schedule' }]}
                      value={startWhen}
                      onChange={value => setStartWhen(value === 'later' ? 'later' : 'now')}
                    />
                    {startWhen === 'later' ? (
                      <View style={styles.inlineRow}>
                        <View style={styles.flex}><Field value={matchDate} onChangeText={setMatchDate} placeholder="Date YYYY-MM-DD" /></View>
                        <View style={styles.flex}><Field value={matchTime} onChangeText={setMatchTime} placeholder="Time HH:MM" /></View>
                      </View>
                    ) : null}
                    <Action label="Create match" onPress={createMatch} disabled={!matchTitle.trim() || !teamOneName.trim() || !teamTwoName.trim()} />
                  </View>
                ) : null}
                <View style={styles.card}>
                  <SectionTitle>Group matches</SectionTitle>
                  {matches.map(match => (
                    <View key={match.id} style={styles.listItem}>
                      <View style={styles.flex}>
                        <Text style={styles.itemTitle}>{match.title}</Text>
                        <Text style={styles.muted}>{match.teams.join(' vs ')} · {plainLabel(match.status)} · {match.teamSize} per side{formatScheduled(match.scheduledAt) ? ` · ${formatScheduled(match.scheduledAt)}` : ''}</Text>
                      </View>
                      <Action label={match.status === 'draft' ? 'Pick teams' : 'View teams'} onPress={() => openDraft(match)} secondary />
                      {match.status === 'live' && canScore(match) ? <Action label="Score" onPress={() => openScoring(match, [])} /> : null}
                      {match.status === 'live' || match.status === 'completed' ? <Action label="Scorecard" onPress={() => openScorecard(match)} /> : null}
                    </View>
                  ))}
                  {!matches.length ? <Text style={styles.muted}>No matches scheduled.</Text> : null}
                  {selectedScorecard ? (
                    <View style={styles.scorecard}>
                      <Text style={styles.itemTitle}>{selectedScorecard.innings[0].teamName} vs {selectedScorecard.innings[1].teamName}</Text>
                      {selectedScorecard.status === 'completed' ? <Text style={styles.body}>{formatMatchResult(selectedScorecard).headline}</Text> : null}
                      {selectedScorecard.innings.map((innings, index) => (
                        <View key={`${innings.teamId}-${index}`} style={styles.scorecardRow}>
                          <Text style={styles.body}>{innings.teamName}</Text>
                          <Text style={styles.score}>{innings.runs}/{innings.wickets}</Text>
                          <Text style={styles.caption}>{innings.overs.fullOvers}.{innings.overs.balls} overs</Text>
                          {(innings.overReplay ?? []).map(over => (
                            <Text key={over.overNumber} style={styles.caption}>Over {over.overNumber}: {over.deliveries.map(delivery => delivery.label).join('  ')}</Text>
                          ))}
                          {partnershipsFor(innings).map(row => (
                            <Text key={row.batterIds.join('-')} style={styles.caption}>
                              {row.batterIds.map(id => playerName(selectedScorecard.squads, id)).join(' & ')} {row.runs} ({row.balls}){row.unbroken ? ' *' : ''}
                            </Text>
                          ))}
                          {fallOfWicketsFor(innings).map(row => (
                            <Text key={row.wicket} style={styles.caption}>
                              {row.score} {playerName(selectedScorecard.squads, row.dismissedId)} {dismissalLabel(row.dismissal)} {row.over}
                            </Text>
                          ))}
                        </View>
                      ))}
                      <MatchPlayerLines match={selectedScorecard} groupName={group.name} />
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}
            {view === 'group' && group && tab === 'reports' && isAdmin ? (
              <View style={styles.paddedBlock}>
              <View style={styles.card}>
                <SectionTitle>Reports</SectionTitle>
                {reports.map(report => (
                  <View key={report.id} style={styles.reportItem}>
                    <Text style={styles.itemTitle}>{plainLabel(report.resourceType)} · {plainLabel(report.status)}</Text>
                    <Text style={styles.body}>{report.reason}{report.details ? ` — ${report.details}` : ''}</Text>
                    {report.status === 'open' ? (
                      <View style={styles.inlineRow}>
                        <Action label="Dismiss" onPress={() => reviewReport(report, 'dismissed')} secondary />
                        <Action label="Remove content" onPress={() => reviewReport(report, 'actioned')} />
                      </View>
                    ) : null}
                  </View>
                ))}
                {!reports.length ? <Text style={styles.muted}>No reports have been submitted.</Text> : null}
              </View>
              </View>
            ) : null}

        {view === 'draft' && selectedMatch ? (
          <>
            <View style={styles.card}>
              <Text style={styles.eyebrow}>{plainLabel(selectedMatch.status).toUpperCase()} · {selectedMatch.oversPerSide} OVERS · {selectedMatch.teamSize} PLAYERS PER SIDE</Text>
              <Text style={styles.heading}>{selectedMatch.title}</Text>
              <Text style={styles.muted}>{selectedMatch.teams.join(' vs ')}</Text>
            </View>
            {isAdmin && selectedMatch.status === 'draft' ? (
              <View style={styles.card}>
                <SectionTitle>Match captains</SectionTitle>
                <Text style={styles.muted}>A match captain is temporary and applies only to this match.</Text>
                {activeMembers.map(member => (
                  <View key={member.userId} style={styles.memberRow}>
                    <Text style={styles.flex}>{member.displayName}</Text>
                    <Action label={captainOne === member.userId ? 'Side 1 ✓' : 'Side 1'} onPress={() => setCaptainOne(member.userId)} secondary={captainOne !== member.userId} />
                    <Action label={captainTwo === member.userId ? 'Side 2 ✓' : 'Side 2'} onPress={() => setCaptainTwo(member.userId)} secondary={captainTwo !== member.userId} />
                  </View>
                ))}
                <Action label="Save captains" onPress={saveCaptains} disabled={captainOne === null || captainTwo === null || captainOne === captainTwo} />
              </View>
            ) : null}
            {draftTeams.map(team => (
              <View key={team.side} style={styles.card}>
                <Text style={styles.itemTitle}>Side {team.side}: {team.name}</Text>
                <Text style={styles.muted}>Captain: {team.captain?.displayName ?? 'Not selected'}</Text>
                {team.players.map(player => <Text key={player.userId} style={styles.body}>{player.order}. {player.displayName}</Text>)}
                {!team.players.length ? <Text style={styles.caption}>No players picked yet.</Text> : null}
              </View>
            ))}
            {selectedMatch.status === 'draft' && nextCaptainId === user?.id ? (
              <View style={styles.card}>
                <SectionTitle>{`Side ${nextSide} picks next`}</SectionTitle>
                {activeMembers.filter(member => !pickedIds.has(member.userId)).map(member => (
                  <View key={member.userId} style={styles.listItem}>
                    <Text style={styles.flex}>{member.displayName}</Text>
                    <Action label="Pick" onPress={() => makePick(nextSide, member.userId)} />
                  </View>
                ))}
              </View>
            ) : selectedMatch.status === 'draft' && draftTeams.length === 2 && draftTeams.some(team => team.captain) ? (
              <View style={styles.card}><Text style={styles.muted}>The captain for Side {nextSide} picks the next player.</Text></View>
            ) : null}
            {isAdmin && selectedMatch.status === 'draft' ? <Action label="Finalize teams" onPress={finalize} /> : null}
            {isAdmin && selectedMatch.status === 'scheduled' ? (
              <View style={styles.card}>
                <SectionTitle>Scorer</SectionTitle>
                <Text style={styles.muted}>The scorer enters the live score. This can be the group admin or any member.</Text>
                {activeMembers.map(member => (
                  <View key={member.userId} style={styles.memberRow}>
                    <Text style={styles.flex}>{member.displayName}</Text>
                    <Action
                      label={scorerPick === member.userId ? 'Scorer ✓' : 'Make scorer'}
                      onPress={() => setScorerPick(member.userId)}
                      secondary={scorerPick !== member.userId}
                    />
                  </View>
                ))}
                <Action label="Save scorer" onPress={saveScorer} disabled={scorerPick == null} />
              </View>
            ) : null}
            {selectedMatch.status === 'scheduled' && canScore(selectedMatch) ? (
              <Action label="Start scoring this match" onPress={() => openScoring(selectedMatch, draftTeams)} />
            ) : null}
            {selectedMatch.status === 'live' && canScore(selectedMatch) ? (
              <Action label="Resume scoring" onPress={() => openScoring(selectedMatch, draftTeams)} />
            ) : null}
          </>
        ) : null}

        {view === 'notifications' ? (
          <View style={styles.paddedBlock}>
            <View style={styles.fbCard}>
              <View style={styles.switchRow}>
                <View style={styles.flex}>
                  <Text style={styles.groupRowTitle}>Likes and comments</Text>
                  <Text style={styles.groupRowMeta}>Turn this off to stop notes when someone likes or comments on your post.</Text>
                </View>
                <Switch
                  value={postActivity}
                  onValueChange={togglePostActivity}
                  accessibilityLabel="Likes and comments"
                />
              </View>
              <Text style={styles.fbCardTitle}>{`${unreadCount} unread`}</Text>
              {notifications.map(item => (
                <Pressable key={item.id} onPress={() => readNotification(item)} style={[styles.noteRow, !item.readAt && styles.noteUnread]}>
                  <View style={styles.flex}>
                    <Text style={styles.groupRowTitle}>{item.title}</Text>
                    <Text style={styles.body}>{item.body}</Text>
                    <Text style={styles.groupRowMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
                  </View>
                </Pressable>
              ))}
              {!notifications.length ? <Text style={styles.muted}>You are all caught up.</Text> : null}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <AppSheet
        visible={sheet === 'create' || sheet === 'settings'}
        title={sheet === 'settings' ? 'Group settings' : 'New group'}
        onClose={() => setSheet(null)}
      >
        <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
          <Field value={groupName} onChangeText={setGroupName} placeholder="Group name" />
          <Field value={groupDescription} onChangeText={setGroupDescription} placeholder="Description" multiline />
          <Text style={styles.fieldLabel}>Visibility</Text>
          <ChoiceRow
            options={[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }]}
            value={groupVisibility}
            onChange={value => setGroupVisibility(value === 'private' ? 'private' : 'public')}
          />
          <Text style={styles.fieldLabel}>Who can join</Text>
          <ChoiceRow
            options={JOIN_TYPES}
            value={groupJoinType}
            onChange={value => setGroupJoinType(value as JoinType)}
          />
          <Text style={styles.muted}>{JOIN_TYPES.find(item => item.value === groupJoinType)?.hint}</Text>
          <Action label={groupPhoto ? 'Group photo selected' : 'Group photo'} onPress={() => { chooseGroupImage('photo').catch(() => undefined); }} secondary />
          <Action label={coverPhoto ? 'Cover photo selected' : 'Cover photo'} onPress={() => { chooseGroupImage('cover').catch(() => undefined); }} secondary />
          {groupPhoto?.uri ? <Image source={{ uri: groupPhoto.uri }} style={styles.photoPreview} /> : null}
          {coverPhoto?.uri ? <Image source={{ uri: coverPhoto.uri }} style={styles.photoPreview} /> : null}
          <PrimaryButton
            label={sheet === 'settings' ? 'Save settings' : 'Create group'}
            onPress={sheet === 'settings' ? saveGroupSettings : createNewGroup}
            disabled={!groupName.trim() || loading}
          />
        </ScrollView>
      </AppSheet>
      <AppSheet visible={sheet === 'add'} title="Add a player" onClose={() => setSheet(null)}>
        <Text style={styles.muted}>Search by name or username. Adding a player puts them in the group immediately.</Text>
        <View style={styles.inlineRow}>
          <View style={styles.flex}><Field value={playerQuery} onChangeText={setPlayerQuery} placeholder="Name or username" /></View>
          <Action label="Search" onPress={searchPeople} secondary />
        </View>
        {playerResults.map(player => (
          <View key={player.userId} style={styles.memberRow}>
            <PlayerAvatar name={player.displayName} photoUrl={player.photoUrl} size={wp(9)} />
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{player.displayName}</Text>
              <Text style={styles.muted}>@{player.username}</Text>
            </View>
            <Action label="Add" onPress={() => addPlayer(player)} />
          </View>
        ))}
        {playerQuery.trim().length >= 2 && !playerResults.length && !loading ? <Text style={styles.muted}>No players matched that search.</Text> : null}
      </AppSheet>
      <ConfirmSheet
        visible={confirm !== null}
        title={confirm?.title ?? ''}
        body={confirm?.body ?? ''}
        confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
        onConfirm={() => confirm?.run()}
        onClose={() => setConfirm(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  canvasRoot: { backgroundColor: colors.canvas },
  canvasScroll: { flex: 1, backgroundColor: colors.canvas },
  headerBar: { backgroundColor: colors.background },
  content: { paddingHorizontal: wp(5), paddingBottom: hp(4), gap: hp(1.2) },
  homeCanvas: { paddingHorizontal: 0, gap: 0, backgroundColor: colors.canvas },
  groupCanvas: { paddingHorizontal: 0, gap: 0, backgroundColor: colors.canvas },
  searchShell: {
    marginHorizontal: wp(4),
    marginTop: hp(1.2),
    backgroundColor: colors.chip,
    borderRadius: wp(6),
    minHeight: hp(5),
    justifyContent: 'center',
    paddingHorizontal: wp(4),
  },
  searchInput: { color: colors.text, fontSize: fontSize(15), paddingVertical: hp(1) },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    marginTop: hp(1.2),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.3),
    backgroundColor: colors.background,
  },
  createMark: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createMarkText: { color: colors.text, fontSize: fontSize(22), fontWeight: '500', marginTop: -hp(0.2) },
  createLabel: { color: colors.text, fontSize: fontSize(15), fontWeight: '700' },
  sectionBlock: { backgroundColor: colors.background, marginTop: hp(1), paddingBottom: hp(0.6) },
  fbSection: {
    color: colors.text,
    fontSize: fontSize(17),
    fontWeight: '800',
    paddingHorizontal: wp(4),
    paddingTop: hp(1.3),
    paddingBottom: hp(0.4),
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.1),
  },
  groupRowTitle: { color: colors.text, fontSize: fontSize(15), fontWeight: '700' },
  groupRowMeta: { color: colors.inkSecondary, fontSize: fontSize(12), lineHeight: fontSize(17), marginTop: hp(0.15) },
  thumb: { width: wp(14), height: wp(14), borderRadius: wp(2.2), backgroundColor: colors.primary },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { color: colors.background, fontSize: fontSize(16), fontWeight: '800' },
  discoverCard: {
    marginHorizontal: wp(4),
    marginBottom: hp(1.2),
    borderRadius: wp(2.5),
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  discoverCover: { height: wp(36), backgroundColor: colors.primary },
  discoverBody: { padding: wp(3), gap: hp(0.7) },
  discoverTitle: { color: colors.text, fontSize: fontSize(17), fontWeight: '800' },
  pageHero: { backgroundColor: colors.background },
  pageCover: { height: wp(38), width: '100%', backgroundColor: colors.primary },
  coverEdit: {
    position: 'absolute',
    right: wp(3),
    bottom: wp(3),
    backgroundColor: colors.chip,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
  },
  coverEditText: { color: colors.text, fontWeight: '700', fontSize: fontSize(12) },
  pageBody: { paddingHorizontal: wp(4), paddingBottom: hp(1.2), marginTop: -wp(8) },
  avatarRing: {
    borderWidth: 4,
    borderColor: colors.background,
    borderRadius: wp(14),
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
  },
  pageName: { color: colors.text, fontSize: fontSize(22), fontWeight: '800', marginTop: hp(0.5) },
  pageMeta: { color: colors.inkSecondary, fontSize: fontSize(13), marginTop: hp(0.3) },
  intro: { color: colors.text, fontSize: fontSize(14), lineHeight: fontSize(20), marginTop: hp(0.7) },
  facepile: { flexDirection: 'row', alignItems: 'center', marginTop: hp(1) },
  face: {
    borderWidth: 2,
    borderColor: colors.background,
    borderRadius: wp(5),
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  faceOverlap: { marginLeft: -wp(2) },
  faceCaption: { marginLeft: wp(2), color: colors.inkSecondary, fontSize: fontSize(12), fontWeight: '600', flex: 1 },
  actionRow: { flexDirection: 'row', gap: wp(2), marginTop: hp(1.2) },
  pillBtn: {
    minHeight: hp(4.6),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillFill: { flex: 1 },
  pillChip: { backgroundColor: colors.chip },
  pillPrimary: { backgroundColor: colors.primary },
  pillBtnText: { color: colors.text, fontSize: fontSize(13), fontWeight: '700' },
  pillBtnTextOn: { color: colors.background },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: wp(1),
  },
  paddedBlock: { paddingHorizontal: wp(3), paddingTop: hp(1), paddingBottom: hp(2), gap: hp(1), backgroundColor: colors.canvas },
  fbCard: { backgroundColor: colors.background, paddingHorizontal: wp(4), paddingVertical: hp(1.4), gap: hp(0.9) },
  fbCardTitle: { color: colors.text, fontSize: fontSize(16), fontWeight: '800' },
  detailLine: { color: colors.text, fontSize: fontSize(14), lineHeight: fontSize(22) },
  personRow: { flexDirection: 'row', alignItems: 'flex-start', gap: wp(3), paddingVertical: hp(0.7) },
  personActions: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2), marginTop: hp(0.5) },
  inboxBtn: { width: wp(10), height: wp(10), alignItems: 'center', justifyContent: 'center' },
  inboxBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: wp(4.2),
    height: wp(4.2),
    borderRadius: wp(2.1),
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(0.5),
  },
  inboxBadgeText: { color: colors.background, fontSize: fontSize(8), fontWeight: '800' },
  noteRow: { paddingVertical: hp(1.1), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  noteUnread: { backgroundColor: colors.primaryFaint, marginHorizontal: -wp(4), paddingHorizontal: wp(4) },
  voteTrack: { height: hp(0.7), borderRadius: wp(1), backgroundColor: colors.chip, marginTop: hp(0.5), overflow: 'hidden' },
  voteFill: { height: '100%', backgroundColor: colors.primary, borderRadius: wp(1) },
  loading: { marginVertical: hp(0.8) },
  emptyState: { flex: 1, padding: wp(7), justifyContent: 'center', gap: hp(1.5) },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: wp(2), marginTop: hp(1) },
  welcome: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.primary, fontSize: fontSize(10), fontWeight: '800', letterSpacing: 0.8 },
  heading: { color: colors.text, fontSize: fontSize(19), fontWeight: '800', marginTop: hp(0.3) },
  sectionTitle: { color: colors.text, fontSize: fontSize(15), fontWeight: '800', marginBottom: hp(0.8) },
  card: { padding: wp(4), borderRadius: wp(3), borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, gap: hp(0.9) },
  field: { minHeight: hp(5.5), borderRadius: wp(2.2), borderWidth: 1, borderColor: colors.border, paddingHorizontal: wp(3), paddingVertical: hp(1), color: colors.text, fontSize: fontSize(14), backgroundColor: colors.background },
  multilineField: { minHeight: hp(10) },
  inlineRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: wp(2), marginVertical: hp(0.4) },
  action: { minHeight: hp(4.5), justifyContent: 'center', alignItems: 'center', borderRadius: wp(2), paddingHorizontal: wp(3), backgroundColor: colors.primary, marginVertical: hp(0.3) },
  secondaryAction: { backgroundColor: colors.primaryFaint, borderWidth: 1, borderColor: colors.primarySoft },
  disabledAction: { opacity: 0.45 },
  pressedAction: { opacity: 0.8 },
  actionText: { color: colors.background, fontSize: fontSize(12), fontWeight: '800', textTransform: 'capitalize' },
  secondaryActionText: { color: colors.primary },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: wp(2), paddingVertical: hp(0.8), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  memberRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: wp(1.5), paddingVertical: hp(0.7) },
  itemTitle: { color: colors.text, fontSize: fontSize(14), fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: fontSize(12), lineHeight: fontSize(17) },
  body: { color: colors.text, fontSize: fontSize(13), lineHeight: fontSize(19) },
  caption: { color: colors.textMuted, fontSize: fontSize(10), marginTop: hp(0.3) },
  error: { color: colors.primary, backgroundColor: colors.primaryFaint, padding: wp(3), marginHorizontal: wp(5), borderRadius: wp(2), fontSize: fontSize(12) },
  notice: { color: colors.text, backgroundColor: colors.primaryFaint, padding: wp(3), marginHorizontal: wp(5), borderRadius: wp(2), fontSize: fontSize(12) },
  tab: { paddingHorizontal: wp(3), paddingVertical: hp(1.25), borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: colors.primary },
  tabText: { color: colors.inkSecondary, fontSize: fontSize(14), fontWeight: '700' },
  activeTabText: { color: colors.primary },
  switchRow: { minHeight: hp(5), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: wp(3), borderRadius: wp(2), borderWidth: 1, borderColor: colors.border },
  chosenOption: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  pill: { color: colors.primary, backgroundColor: colors.primaryFaint, overflow: 'hidden', paddingHorizontal: wp(2), paddingVertical: hp(0.4), borderRadius: wp(3), fontSize: fontSize(10), fontWeight: '800', textTransform: 'uppercase' },
  notification: { paddingVertical: hp(1), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: hp(0.3) },
  reportItem: { paddingVertical: hp(0.8), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: hp(0.4) },
  scorecard: { marginTop: hp(1), padding: wp(3), borderRadius: wp(2), backgroundColor: colors.primaryFaint, gap: hp(0.8) },
  scorecardRow: { paddingVertical: hp(0.6), borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  score: { color: colors.primary, fontSize: fontSize(20), fontWeight: '900' },
  photoStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2) },
  photoPreview: { width: wp(24), height: wp(24), borderRadius: wp(2), backgroundColor: colors.surfaceMuted },
  groupCard: { borderRadius: wp(3), borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, overflow: 'hidden' },
  groupCover: { height: hp(8), backgroundColor: colors.primary },
  groupBody: { flexDirection: 'row', alignItems: 'center', gap: wp(2), padding: wp(3) },
  groupIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  detailCover: { height: hp(14), borderRadius: wp(3), backgroundColor: colors.primary, marginTop: hp(1) },
  emptyCard: { margin: wp(4), padding: wp(4), borderRadius: wp(3), backgroundColor: colors.background, gap: hp(0.6) },
  sheetScroll: { maxHeight: hp(62) },
  sheetContent: { gap: hp(1), paddingBottom: hp(1) },
  fieldLabel: { color: colors.text, fontSize: fontSize(13), fontWeight: '800' },
  optionFieldRow: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  optionField: { flex: 1 },
  addOption: { color: colors.primary, fontSize: fontSize(14), fontWeight: '800', paddingVertical: hp(0.4) },
  removeOption: { color: colors.inkSecondary, fontSize: fontSize(12), fontWeight: '700' },
  pollCard: { backgroundColor: colors.background, paddingHorizontal: wp(4), paddingTop: hp(1.3), paddingBottom: hp(0.6), gap: hp(0.8) },
  pollAuthor: { flexDirection: 'row', alignItems: 'center', gap: wp(2.5) },
  pollQuestion: { color: colors.text, fontSize: fontSize(16), fontWeight: '800', lineHeight: fontSize(22) },
  pollOption: {
    minHeight: hp(5.2),
    borderRadius: wp(2.2),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    gap: wp(2.4),
  },
  pollFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.primaryFaint },
  pollRadio: {
    width: wp(4.6),
    height: wp(4.6),
    borderRadius: wp(2.3),
    borderWidth: 2,
    borderColor: colors.inkSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  pollRadioOn: { borderColor: colors.primary },
  pollBox: { borderRadius: wp(1) },
  pollDot: { width: wp(2.3), height: wp(2.3), borderRadius: wp(1.2), backgroundColor: colors.primary },
  pollTick: { borderRadius: wp(0.4) },
  pollOptionText: { flex: 1, color: colors.text, fontSize: fontSize(14), fontWeight: '700' },
  pollPercent: { color: colors.inkSecondary, fontSize: fontSize(13), fontWeight: '800' },
  pollFooter: {
    flexDirection: 'row',
    gap: wp(4),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: hp(0.8),
  },
  pollFooterText: { color: colors.inkSecondary, fontSize: fontSize(13), fontWeight: '700' },
});
