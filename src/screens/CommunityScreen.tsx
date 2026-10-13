import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import {
  acceptGroupInvitation,
  closeGroupPoll,
  createGroup,
  createGroupInvitation,
  createGroupMatch,
  createGroupPoll,
  createGroupPost,
  finalizeMatchTeams,
  getMatchTeams,
  getGroupMatchScorecard,
  getMyProfile,
  joinGroup,
  listGroupMatches,
  listGroupMembers,
  listGroupPolls,
  listGroupPosts,
  listGroupReports,
  listGroups,
  listNotifications,
  markNotificationRead,
  pickMatchPlayer,
  reportGroupContent,
  reviewGroupReport,
  selectMatchCaptains,
  updateGroupMember,
  uploadPostPhotos,
  voteInPoll,
  type CommunityGroup,
  type ContentReport,
  type GroupMatch,
  type GroupMember,
  type GroupPoll,
  type GroupPost,
  type MatchTeam,
  type NotificationItem,
  type PlayerProfile,
} from '../api/client';
import { getAccessToken } from '../api/session';
import type { MatchSummary } from '../types/match';
import { API_BASE_URL } from '../config/api';
import { ScreenHeader } from '../components/ui';
import type { MainStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Navigation = NativeStackNavigationProp<MainStackParamList>;
type GroupTab = 'feed' | 'polls' | 'members' | 'matches' | 'reports';
type ScreenView = 'groups' | 'group' | 'notifications' | 'draft';

function plainLabel(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
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

export function CommunityScreen() {
  const navigation = useNavigation<Navigation>();
  const {top} = useSafeAreaInsets();
  const [user, setUser] = useState<PlayerProfile | null>(null);
  const [view, setView] = useState<ScreenView>('groups');
  const [tab, setTab] = useState<GroupTab>('feed');
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [polls, setPolls] = useState<GroupPoll[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMatch, setSelectedMatch] = useState<GroupMatch | null>(null);
  const [selectedScorecard, setSelectedScorecard] = useState<MatchSummary | null>(null);
  const [draftTeams, setDraftTeams] = useState<MatchTeam[]>([]);
  const [query, setQuery] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupVisibility, setGroupVisibility] = useState<CommunityGroup['visibility']>('private');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [postBody, setPostBody] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<Asset[]>([]);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState('Yes\nNo\nMaybe');
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [anonymousPoll, setAnonymousPoll] = useState(false);
  const [voteSelections, setVoteSelections] = useState<Record<number, number[]>>({});
  const [matchTitle, setMatchTitle] = useState('');
  const [teamOneName, setTeamOneName] = useState('Team A');
  const [teamTwoName, setTeamTwoName] = useState('Team B');
  const [overs, setOvers] = useState('10');
  const [teamSize, setTeamSize] = useState('6');
  const [captainOne, setCaptainOne] = useState<number | null>(null);
  const [captainTwo, setCaptainTwo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = group?.myRole === 'owner' || group?.myRole === 'admin';
  const activeMembers = useMemo(() => members.filter(member => member.status === 'active'), [members]);

  const run = useCallback(async (task: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That could not be completed. Try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshGroups = useCallback(async (search = '') => {
    const [profile, rows, inbox] = await Promise.all([
      getMyProfile(),
      listGroups(search),
      listNotifications(),
    ]);
    setUser(profile);
    setGroups(rows);
    setNotifications(inbox.items);
    setUnreadCount(inbox.unreadCount);
  }, []);

  const refreshSelectedGroup = useCallback(async (id: number) => {
    const [groupRows, memberRows, pollRows, postRows, matchRows] = await Promise.all([
      listGroups().then(rows => rows.find(row => row.id === id) ?? null),
      listGroupMembers(id),
      listGroupPolls(id),
      listGroupPosts(id),
      listGroupMatches(id),
    ]);
    setGroup(groupRows);
    setMembers(memberRows);
    setPolls(pollRows);
    setPosts(postRows);
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
    run(() => refreshSelectedGroup(row.id));
  }, [refreshSelectedGroup, run]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (view === 'group' && group) run(() => refreshSelectedGroup(group.id));
    else if (view === 'notifications') {
      run(async () => {
        const inbox = await listNotifications();
        setNotifications(inbox.items);
        setUnreadCount(inbox.unreadCount);
      });
    } else run(() => refreshGroups(query));
  }, [group, query, refreshGroups, refreshSelectedGroup, run, view]);

  const createNewGroup = () => run(async () => {
    const created = await createGroup({ name: groupName.trim(), description: groupDescription.trim(), visibility: groupVisibility });
    setGroupName('');
    setGroupDescription('');
    setShowCreateGroup(false);
    await refreshGroups('');
    openGroup(created);
  });

  const searchGroups = () => run(() => refreshGroups(query));

  const join = (row: CommunityGroup) => run(async () => {
    const result = await joinGroup(row.id);
    setNotice(result.status === 'active' ? `You joined ${row.name}.` : `Join request sent to ${row.name}.`);
    await refreshGroups(query);
  });

  const acceptInvite = () => run(async () => {
    const accepted = await acceptGroupInvitation(inviteCode.trim());
    setInviteCode('');
    setNotice(`Joined ${accepted.name}.`);
    await refreshGroups('');
  });

  const loadNotifications = () => run(async () => {
    const inbox = await listNotifications();
    setNotifications(inbox.items);
    setUnreadCount(inbox.unreadCount);
    setView('notifications');
  });

  const readNotification = (item: NotificationItem) => run(async () => {
    if (!item.readAt) await markNotificationRead(item.id);
    const inbox = await listNotifications();
    setNotifications(inbox.items);
    setUnreadCount(inbox.unreadCount);
  });

  const publishPost = () => {
    if (!group) return;
    run(async () => {
      if (!postBody.trim() && selectedPhotos.length === 0) throw new Error('Write a post or attach at least one photo.');
      const created = await createGroupPost(group.id, postBody.trim() || 'Shared group photos');
      if (selectedPhotos.length) {
        const files = selectedPhotos.map((photo, index) => {
          if (!photo.uri) throw new Error('A selected photo could not be read from the device.');
          if (photo.fileSize && photo.fileSize > 8 * 1024 * 1024) throw new Error('Each photo must be smaller than 8 MB.');
          return {
            uri: photo.uri,
            type: photo.type ?? 'image/jpeg',
            fileName: photo.fileName ?? `group-photo-${index + 1}.jpg`,
          };
        });
        await uploadPostPhotos(created.id, files);
      }
      setPostBody('');
      setSelectedPhotos([]);
      setPosts(await listGroupPosts(group.id));
      setNotice('Post shared with group members.');
    });
  };

  const choosePhotos = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 8,
        maxWidth: 6000,
        maxHeight: 6000,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorMessage) throw new Error('Could not open your photos. Try again.');
      const assets = result.assets ?? [];
      if (assets.length > 8) throw new Error('Select no more than eight photos for one post.');
      const bytes = assets.reduce((sum, asset) => sum + (asset.fileSize ?? 0), 0);
      if (bytes > 20 * 1024 * 1024) throw new Error('Selected photos must total less than 20 MB.');
      setSelectedPhotos(assets);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open the photo library.');
    }
  };

  const publishPoll = () => {
    if (!group) return;
    run(async () => {
      const options = pollOptions.split(/\r?\n/).map(option => option.trim()).filter(Boolean);
      await createGroupPoll(group.id, {
        question: pollQuestion.trim(),
        options,
        multipleChoice,
        anonymous: anonymousPoll,
        allowVoteChange: false,
      });
      setPollQuestion('');
      setPolls(await listGroupPolls(group.id));
      setNotice('Poll created.');
    });
  };

  const vote = (poll: GroupPoll) => run(async () => {
    const selected = voteSelections[poll.id] ?? poll.myOptionIds;
    const updated = await voteInPoll(poll.id, selected);
    setPolls(current => current.map(item => item.id === poll.id ? updated : item));
  });

  const closePoll = (poll: GroupPoll) => run(async () => {
    const updated = await closeGroupPoll(poll.id);
    setPolls(current => current.map(item => item.id === poll.id ? updated : item));
  });

  const reportContent = (resourceType: 'post' | 'poll', resourceId: number) => {
    if (!group) return;
    run(async () => {
      await reportGroupContent(group.id, resourceType, resourceId, 'Please review this content');
      setNotice('Report sent to the group administrators.');
    });
  };

  const reviewReport = (report: ContentReport, status: 'dismissed' | 'actioned') => {
    if (!group) return;
    run(async () => {
      await reviewGroupReport(group.id, report.id, status);
      setReports(await listGroupReports(group.id));
      if (status === 'actioned' && report.resourceType === 'post') setPosts(await listGroupPosts(group.id));
      if (status === 'actioned' && report.resourceType === 'poll') setPolls(await listGroupPolls(group.id));
    });
  };

  const moderateMember = (member: GroupMember, status: 'active' | 'rejected') => {
    if (!group) return;
    run(async () => {
      await updateGroupMember(group.id, member.userId, { status });
      setMembers(await listGroupMembers(group.id));
    });
  };

  const openDraft = (match: GroupMatch) => run(async () => {
    setSelectedMatch(match);
    setDraftTeams(await getMatchTeams(match.id));
    setCaptainOne(null);
    setCaptainTwo(null);
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
      const created = await createGroupMatch(group.id, {
        title,
        teams: [teamOneName.trim(), teamTwoName.trim()],
        oversPerSide: oversValue,
        teamSize: teamSizeValue,
      });
      setMatchTitle('');
      await refreshSelectedGroup(group.id);
      await openDraft({
        id: created.id,
        clientId: created.clientId,
        title,
        format: 'box-cricket',
        status: created.status,
        scheduledAt: null,
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
      setNotice('Captains selected. The captains can now make alternating picks.');
    });
  };

  const makePick = (side: 1 | 2, playerId: number) => {
    if (!selectedMatch) return;
    run(async () => {
      await pickMatchPlayer(selectedMatch.id, side, playerId);
      setDraftTeams(await getMatchTeams(selectedMatch.id));
    });
  };

  const finalize = () => {
    if (!selectedMatch || !group) return;
    run(async () => {
      await finalizeMatchTeams(selectedMatch.id);
      await refreshSelectedGroup(group.id);
      setSelectedMatch(current => current ? { ...current, status: 'scheduled' } : current);
      setNotice('Teams are set for this match.');
    });
  };

  const nextSide: 1 | 2 = (draftTeams[0]?.players.length ?? 0) <= (draftTeams[1]?.players.length ?? 0) ? 1 : 2;
  const nextCaptainId = draftTeams.find(team => team.side === nextSide)?.captain?.userId;
  const pickedIds = new Set(draftTeams.flatMap(team => team.players.map(player => player.userId)));

  const back = () => {
    if (view === 'draft') setView('group');
    else if (view === 'group' || view === 'notifications') setView('groups');
    else navigation.goBack();
  };

  if (!getAccessToken()) {
    return (
      <View style={[styles.root, { paddingTop: top }]}>
        <ScreenHeader title="Community" backLabel="Matches" onBack={back} />
        <View style={styles.emptyState}>
          <Text style={styles.heading}>Sign in to use community features</Text>
          <Text style={styles.muted}>Create groups, invite players, run polls, and manage match selections with your account.</Text>
          <Action label="Open account" onPress={() => navigation.navigate('Account')} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: top }]}>
      <ScreenHeader
        title={view === 'group' ? group?.name ?? 'Group' : view === 'draft' ? 'Team selection' : view === 'notifications' ? 'Notifications' : 'Community'}
        backLabel={view === 'groups' ? 'Matches' : 'Community'}
        onBack={back}
      />
      {loading && !refreshing ? <ActivityIndicator style={styles.loading} color={colors.primary} /> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        {view === 'groups' ? (
          <>
            <View style={styles.topRow}>
              <View style={styles.welcome}>
                <Text style={styles.eyebrow}>SIGNED IN AS</Text>
                <Text style={styles.heading}>{user?.displayName ?? 'Player'}</Text>
              </View>
              <Action label={`Inbox${unreadCount ? ` · ${unreadCount}` : ''}`} onPress={loadNotifications} secondary />
            </View>
            <SectionTitle>Your groups and public groups</SectionTitle>
            <View style={styles.inlineRow}>
              <View style={styles.flex}><Field value={query} onChangeText={setQuery} placeholder="Search groups" /></View>
              <Action label="Search" onPress={searchGroups} secondary />
            </View>
            <View style={styles.inlineRow}>
              <Action label={showCreateGroup ? 'Cancel' : 'Create group'} onPress={() => setShowCreateGroup(value => !value)} />
            </View>
            {showCreateGroup ? (
              <View style={styles.card}>
                <SectionTitle>New group</SectionTitle>
                <Field value={groupName} onChangeText={setGroupName} placeholder="Group name" />
                <Field value={groupDescription} onChangeText={setGroupDescription} placeholder="Description (optional)" multiline />
                <View style={styles.inlineRow}>
                  {(['public', 'private', 'invite-only'] as const).map(value => (
                    <Action key={value} label={plainLabel(value)} onPress={() => setGroupVisibility(value)} secondary={groupVisibility !== value} />
                  ))}
                </View>
                <Action label="Create group" onPress={createNewGroup} disabled={!groupName.trim()} />
              </View>
            ) : null}
            <View style={styles.card}>
              {groups.length ? groups.map(row => (
                <View key={row.id} style={styles.listItem}>
                  <Pressable style={styles.flex} onPress={() => openGroup(row)} disabled={row.membershipStatus !== 'active'}>
                    <Text style={styles.itemTitle}>{row.name}</Text>
                    <Text style={styles.muted}>{row.description || plainLabel(row.visibility)} · {plainLabel(row.membershipStatus === 'active' ? row.myRole : row.membershipStatus ?? row.visibility)}</Text>
                  </Pressable>
                  {row.membershipStatus !== 'active' ? <Action label={row.membershipStatus === 'pending' ? 'Requested' : 'Join'} onPress={() => join(row)} disabled={row.membershipStatus === 'pending'} secondary /> : null}
                </View>
              )) : <Text style={styles.muted}>No groups found. Search for a public group or create one.</Text>}
            </View>
            <View style={styles.card}>
              <SectionTitle>Accept an invitation</SectionTitle>
              <Field value={inviteCode} onChangeText={setInviteCode} placeholder="Invitation code" />
              <Action label="Join with code" onPress={acceptInvite} disabled={!inviteCode.trim()} />
            </View>
          </>
        ) : null}

        {view === 'group' && group ? (
          <>
            <View style={styles.topRow}>
              <View style={styles.welcome}>
                <Text style={styles.eyebrow}>{plainLabel(group.visibility).toUpperCase()} GROUP · {plainLabel(group.myRole).toUpperCase()}</Text>
                <Text style={styles.heading}>{group.description || 'Group activity and match planning'}</Text>
              </View>
              <Action label={`Inbox${unreadCount ? ` · ${unreadCount}` : ''}`} onPress={loadNotifications} secondary />
            </View>
            <View style={styles.tabs}>
              {(['feed', 'polls', 'members', 'matches', ...(isAdmin ? ['reports' as const] : [])] as const).map(value => (
                <Pressable key={value} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.activeTab]}>
                  <Text style={[styles.tabText, tab === value && styles.activeTabText]}>{plainLabel(value)}</Text>
                </Pressable>
              ))}
            </View>

            {tab === 'feed' ? (
              <>
                <View style={styles.card}>
                  <SectionTitle>Share with the group</SectionTitle>
                  <Field value={postBody} onChangeText={setPostBody} placeholder="Write a post" multiline />
                  <Action label={selectedPhotos.length ? `Choose photos (${selectedPhotos.length} selected)` : 'Choose photos'} onPress={choosePhotos} secondary />
                  {selectedPhotos.length ? (
                    <View style={styles.photoStrip}>
                      {selectedPhotos.map((photo, index) => photo.uri ? <Image key={`${photo.uri}-${index}`} source={{ uri: photo.uri }} style={styles.photoPreview} /> : null)}
                    </View>
                  ) : null}
                  <Action label="Publish post" onPress={publishPost} disabled={!postBody.trim() && selectedPhotos.length === 0} />
                </View>
                {posts.map(post => (
                  <View key={post.id} style={styles.card}>
                    <Text style={styles.itemTitle}>{post.author.displayName} <Text style={styles.muted}>@{post.author.username}</Text></Text>
                    <Text style={styles.postBody}>{post.body}</Text>
                    <Text style={styles.caption}>{new Date(post.createdAt).toLocaleString()}</Text>
                    {post.photos.length ? (
                      <View style={styles.photoStrip}>
                        {post.photos.map(photo => (
                          <Image
                            key={photo.id}
                            source={{ uri: `${API_BASE_URL.replace(/\/$/, '')}/media/${photo.id}`, headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` } }}
                            style={styles.photoPreview}
                            accessibilityLabel="Group photo"
                          />
                        ))}
                      </View>
                    ) : null}
                    <Action label="Report post" onPress={() => reportContent('post', post.id)} secondary />
                  </View>
                ))}
                {!posts.length ? <Text style={styles.muted}>No posts yet.</Text> : null}
              </>
            ) : null}

            {tab === 'polls' ? (
              <>
                <View style={styles.card}>
                  <SectionTitle>Create a poll</SectionTitle>
                  <Field value={pollQuestion} onChangeText={setPollQuestion} placeholder="Poll question" />
                  <Field value={pollOptions} onChangeText={setPollOptions} placeholder="One option per line" multiline />
                  <View style={styles.switchRow}><Text style={styles.body}>Multiple selections allowed</Text><Switch value={multipleChoice} onValueChange={setMultipleChoice} /></View>
                  <View style={styles.switchRow}><Text style={styles.body}>Anonymous voting</Text><Switch value={anonymousPoll} onValueChange={setAnonymousPoll} /></View>
                  <Action label="Create poll" onPress={publishPoll} disabled={!pollQuestion.trim()} />
                </View>
                {polls.map(poll => {
                  const selected = voteSelections[poll.id] ?? poll.myOptionIds;
                  return (
                    <View key={poll.id} style={styles.card}>
                      <View style={styles.topRow}><Text style={[styles.itemTitle, styles.flex]}>{poll.question}</Text><Text style={styles.pill}>{plainLabel(poll.status)}</Text></View>
                      {poll.description ? <Text style={styles.muted}>{poll.description}</Text> : null}
                      {poll.options.map(option => {
                        const chosen = selected.includes(option.id);
                        return (
                          <Pressable
                            key={option.id}
                            disabled={poll.status !== 'open'}
                            onPress={() => setVoteSelections(current => {
                              const before = current[poll.id] ?? poll.myOptionIds;
                              const after = chosen ? before.filter(id => id !== option.id) : poll.multipleChoice ? [...before, option.id] : [option.id];
                              return { ...current, [poll.id]: after };
                            })}
                            style={[styles.option, chosen && styles.chosenOption]}
                          >
                            <Text style={styles.body}>{chosen ? '● ' : '○ '}{option.label}</Text>
                            <Text style={styles.caption}>{option.votes} vote{option.votes === 1 ? '' : 's'}</Text>
                          </Pressable>
                        );
                      })}
                    {poll.status === 'open' && !poll.myOptionIds.length ? <Action label="Vote" onPress={() => vote(poll)} disabled={!selected.length} /> : null}
                    {poll.myOptionIds.length ? <Text style={styles.notice}>Your vote is recorded.</Text> : null}
                      {poll.status === 'open' && (poll.myRole === 'owner' || poll.myRole === 'admin') ? <Action label="Close poll" onPress={() => closePoll(poll)} secondary /> : null}
                      <Action label="Report poll" onPress={() => reportContent('poll', poll.id)} secondary />
                    </View>
                  );
                })}
                {!polls.length ? <Text style={styles.muted}>No polls yet.</Text> : null}
              </>
            ) : null}

            {tab === 'members' ? (
              <View style={styles.card}>
                <SectionTitle>Members</SectionTitle>
                {members.map(member => (
                  <View key={member.userId} style={styles.memberRow}>
                    <View style={styles.flex}>
                      <Text style={styles.itemTitle}>{member.displayName}</Text>
                      <Text style={styles.muted}>@{member.username} · {plainLabel(member.role)} · {plainLabel(member.status)}</Text>
                    </View>
                    {isAdmin && member.status === 'pending' ? <Action label="Approve" onPress={() => moderateMember(member, 'active')} /> : null}
                    {isAdmin && member.status === 'pending' ? <Action label="Reject" onPress={() => moderateMember(member, 'rejected')} secondary /> : null}
                  </View>
                ))}
                {isAdmin ? (
                  <Action label="Create invitation" onPress={() => run(async () => {
                    const result = await createGroupInvitation(group.id, user?.email);
                    Alert.alert('Invitation code', `${result.invitationCode}\n\nShare this code with the player. It expires in seven days.`);
                  })} secondary />
                ) : null}
                {!members.length ? <Text style={styles.muted}>No members listed.</Text> : null}
              </View>
            ) : null}

            {tab === 'matches' ? (
              <>
                {isAdmin ? (
                  <View style={styles.card}>
                    <SectionTitle>Schedule a match and pick the teams</SectionTitle>
                    <Field value={matchTitle} onChangeText={setMatchTitle} placeholder="Match title" />
                    <View style={styles.inlineRow}><View style={styles.flex}><Field value={teamOneName} onChangeText={setTeamOneName} placeholder="First team" /></View><View style={styles.flex}><Field value={teamTwoName} onChangeText={setTeamTwoName} placeholder="Second team" /></View></View>
                    <View style={styles.inlineRow}><View style={styles.flex}><Field value={overs} onChangeText={setOvers} placeholder="Overs per side" keyboardType="number-pad" /></View><View style={styles.flex}><Field value={teamSize} onChangeText={setTeamSize} placeholder="Players per side" keyboardType="number-pad" /></View></View>
                    <Action label="Create match" onPress={createMatch} disabled={!matchTitle.trim() || !teamOneName.trim() || !teamTwoName.trim()} />
                  </View>
                ) : null}
                <View style={styles.card}>
                  <SectionTitle>Group matches</SectionTitle>
                  {matches.map(match => (
                    <View key={match.id} style={styles.listItem}>
                      <View style={styles.flex}>
                        <Text style={styles.itemTitle}>{match.title}</Text>
                        <Text style={styles.muted}>{match.teams.join(' vs ')} · {plainLabel(match.status)} · {match.teamSize} per side</Text>
                      </View>
                      <Action label={match.status === 'draft' ? 'Pick teams' : 'View teams'} onPress={() => openDraft(match)} secondary />
                      {match.status === 'live' || match.status === 'completed' ? <Action label="Scorecard" onPress={() => openScorecard(match)} /> : null}
                    </View>
                  ))}
                  {!matches.length ? <Text style={styles.muted}>No matches scheduled.</Text> : null}
                  {selectedScorecard ? (
                    <View style={styles.scorecard}>
                      <Text style={styles.itemTitle}>{selectedScorecard.innings[0].teamName} vs {selectedScorecard.innings[1].teamName}</Text>
                      {selectedScorecard.innings.map((innings, index) => (
                        <View key={`${innings.teamId}-${index}`} style={styles.scorecardRow}>
                          <Text style={styles.body}>{innings.teamName}</Text>
                          <Text style={styles.score}>{innings.runs}/{innings.wickets}</Text>
                          <Text style={styles.caption}>{innings.overs.fullOvers}.{innings.overs.balls} overs</Text>
                          {(innings.overReplay ?? []).map(over => (
                            <Text key={over.overNumber} style={styles.caption}>Over {over.overNumber}: {over.deliveries.map(delivery => delivery.label).join('  ')}</Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}
            {tab === 'reports' && isAdmin ? (
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
            ) : null}
          </>
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
                <SectionTitle>Select two captains</SectionTitle>
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
              <Action
                label="Start scoring this match"
                onPress={() => navigation.navigate('NewMatch', {
                  groupLaunch: {
                    groupId: group?.id ?? 0,
                    clientId: selectedMatch.clientId,
                    teams: selectedMatch.teams,
                    oversPerSide: selectedMatch.oversPerSide,
                    teamSize: selectedMatch.teamSize,
                  },
                })}
              />
            ) : null}
          </>
        ) : null}

        {view === 'notifications' ? (
          <View style={styles.card}>
            <SectionTitle>{`${unreadCount} unread notifications`}</SectionTitle>
            {notifications.map(item => (
              <Pressable key={item.id} onPress={() => readNotification(item)} style={styles.notification}>
                <Text style={styles.itemTitle}>{item.readAt ? '' : '• '}{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.caption}>{new Date(item.createdAt).toLocaleString()}</Text>
              </Pressable>
            ))}
            {!notifications.length ? <Text style={styles.muted}>You are all caught up.</Text> : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: wp(5), paddingBottom: hp(4), gap: hp(1.2) },
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
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: wp(2), marginVertical: hp(0.4) },
  action: { minHeight: hp(4.5), justifyContent: 'center', alignItems: 'center', borderRadius: wp(2), paddingHorizontal: wp(3), backgroundColor: colors.primary, marginVertical: hp(0.3) },
  secondaryAction: { backgroundColor: colors.primaryFaint, borderWidth: 1, borderColor: colors.primarySoft },
  disabledAction: { opacity: 0.45 },
  pressedAction: { opacity: 0.8 },
  actionText: { color: colors.background, fontSize: fontSize(12), fontWeight: '800', textTransform: 'capitalize' },
  secondaryActionText: { color: colors.primary },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: wp(2), paddingVertical: hp(0.8), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5), paddingVertical: hp(0.7) },
  itemTitle: { color: colors.text, fontSize: fontSize(14), fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: fontSize(12), lineHeight: fontSize(17) },
  body: { color: colors.text, fontSize: fontSize(13), lineHeight: fontSize(19) },
  postBody: { color: colors.text, fontSize: fontSize(14), lineHeight: fontSize(21), marginTop: hp(0.5) },
  caption: { color: colors.textMuted, fontSize: fontSize(10), marginTop: hp(0.3) },
  error: { color: colors.primary, backgroundColor: colors.primaryFaint, padding: wp(3), marginHorizontal: wp(5), borderRadius: wp(2), fontSize: fontSize(12) },
  notice: { color: colors.text, backgroundColor: colors.primaryFaint, padding: wp(3), marginHorizontal: wp(5), borderRadius: wp(2), fontSize: fontSize(12) },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, marginTop: hp(0.7) },
  tab: { flex: 1, alignItems: 'center', paddingVertical: hp(1), borderBottomWidth: 2, borderColor: 'transparent' },
  activeTab: { borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: fontSize(12), fontWeight: '700', textTransform: 'capitalize' },
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
});
