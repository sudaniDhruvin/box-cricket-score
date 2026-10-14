import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import Svg, { Path } from 'react-native-svg';
import {
  createGroupPost,
  createPostComment,
  deleteGroupPost,
  deletePostComment,
  listGroupPosts,
  listPostComments,
  pinGroupPost,
  reportGroupContent,
  togglePostLike,
  uploadPostPhotos,
  type PostComment,
} from '../api/client';
import { getAccessToken } from '../api/session';
import { API_BASE_URL } from '../config/api';
import {
  normalizePost,
  orderComments,
  orderFeed,
  POST_TOPICS,
  postTopicLabel,
  type FeedMedia,
  type FeedPost,
  type PostTopic,
} from '../social/feed';
import { colors } from '../theme/colors';
import { fontSize, hp, wp } from '../utils';
import { AppSheet, ChoiceRow, PlayerAvatar, PrimaryButton, pushToastCover, showToast, ToastPill } from './ui';

const FILE_LIMIT = 8 * 1024 * 1024;
const TOTAL_LIMIT = 20 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/mov', 'video/webm']);

type ClipProps = {
  source: { uri: string; headers?: Record<string, string> };
  paused?: boolean;
  resizeMode?: 'contain';
  style?: StyleProp<ViewStyle>;
  onError?: () => void;
};

let clipPlayer: React.ComponentType<ClipProps> | null | undefined;

function loadClipPlayer(): React.ComponentType<ClipProps> | null {
  if (clipPlayer !== undefined) return clipPlayer;
  try {
    const loaded = require('react-native-video') as { default?: React.ComponentType<ClipProps> };
    clipPlayer = loaded.default ?? null;
  } catch {
    clipPlayer = null;
  }
  return clipPlayer;
}

function memberMediaUri(id: number): string {
  return `${API_BASE_URL.replace(/\/+$/, '')}/media/${id}`;
}

const photoCache = new Map<number, string>();

function toBase64(buffer: ArrayBuffer): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes = new Uint8Array(buffer);
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const triple = (first << 16) | (second << 8) | third;
    result += chars[(triple >> 18) & 63];
    result += chars[(triple >> 12) & 63];
    result += index + 1 < bytes.length ? chars[(triple >> 6) & 63] : '=';
    result += index + 2 < bytes.length ? chars[triple & 63] : '=';
  }
  return result;
}

function rememberPhoto(id: number, uri: string) {
  photoCache.set(id, uri);
  if (photoCache.size > 16) {
    const oldest = photoCache.keys().next().value;
    if (oldest !== undefined) photoCache.delete(oldest);
  }
}

function MemberPhoto({ id, token, style }: { id: number; token: string; style: StyleProp<ImageStyle> }) {
  const cached = photoCache.get(id) ?? null;
  const [uri, setUri] = useState<string | null>(cached);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (photoCache.has(id)) {
      setUri(photoCache.get(id) ?? null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setUri(null);
    setFailed(false);
    fetch(memberMediaUri(id), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async response => {
        if (!response.ok) throw new Error('missing');
        const type = (response.headers.get('content-type') ?? 'image/jpeg').split(';')[0];
        const buffer = await response.arrayBuffer();
        const next = `data:${type};base64,${toBase64(buffer)}`;
        rememberPhoto(id, next);
        if (!cancelled) setUri(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  if (failed) {
    return (
      <View style={[style, styles.photoMissing]}>
        <Text style={styles.muted}>Photo could not be loaded.</Text>
      </View>
    );
  }
  if (!uri) {
    return (
      <View style={[style, styles.photoMissing]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <Image source={{ uri }} style={style} accessibilityLabel="Post photo" />;
}

function ThumbBurst({ token }: { token: number }) {
  const scale = useRef(new Animated.Value(0.2)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!token) return;
    scale.setValue(0.2);
    rise.setValue(0);
    opacity.setValue(1);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
      Animated.timing(rise, { toValue: -hp(4), duration: 520, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(280),
        Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]),
    ]).start();
  }, [opacity, rise, scale, token]);

  if (!token) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.burst, { opacity, transform: [{ translateY: rise }, { scale }] }]}>
      <Svg width={wp(14)} height={wp(14)} viewBox="0 0 24 24">
        <Path
          d="M8 10v10H4V10h4zm2.2 10h6.7a2 2 0 001.9-1.4l2.1-6.2A1.5 1.5 0 0019.5 10H14V5.6A1.6 1.6 0 0012.4 4L10 9.2"
          fill={colors.accent}
        />
      </Svg>
    </Animated.View>
  );
}

function timeAgo(value: string): string {
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  const seconds = Math.max(0, (Date.now() - parsed.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function byteTotal(assets: Asset[]): number {
  return assets.reduce((sum, asset) => sum + (asset.fileSize ?? 0), 0);
}

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

function ThumbIcon({ filled, small }: { filled: boolean; small?: boolean }) {
  const size = small ? wp(3.6) : wp(4.6);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8 10v10H4V10h4zm2.2 10h6.7a2 2 0 001.9-1.4l2.1-6.2A1.5 1.5 0 0019.5 10H14V5.6A1.6 1.6 0 0012.4 4L10 9.2"
        fill={filled ? colors.accent : 'none'}
        stroke={filled ? colors.accent : colors.inkSecondary}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlayIcon() {
  return (
    <Svg width={wp(6)} height={wp(6)} viewBox="0 0 24 24">
      <Path d="M8 5.5v13l11-6.5-11-6.5z" fill={colors.background} />
    </Svg>
  );
}

class VideoBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function videoFallback(large: boolean) {
  return (
    <View style={[styles.videoFallback, large && styles.videoLarge]}>
      <Text style={styles.muted}>This video plays in the latest app on this phone.</Text>
    </View>
  );
}

function FeedVideo({
  media,
  token,
  playing,
  large,
  onToggle,
}: {
  media: FeedMedia;
  token: string;
  playing: boolean;
  large: boolean;
  onToggle: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const Player = loadClipPlayer();
  if (!Player || failed) return videoFallback(large);
  const frame = large ? styles.videoLarge : styles.videoTile;
  return (
    <VideoBoundary fallback={videoFallback(large)}>
      <View style={[styles.videoFrame, frame]}>
        <Player
          source={{ uri: memberMediaUri(media.id), headers: { Authorization: `Bearer ${token}` } }}
          paused={!playing}
          resizeMode="contain"
          style={frame}
          onError={() => setFailed(true)}
        />
        <Pressable
          style={styles.videoTap}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause video' : 'Play video'}
        >
          {playing ? null : (
            <View style={styles.playBadge}>
              <PlayIcon />
            </View>
          )}
        </Pressable>
      </View>
    </VideoBoundary>
  );
}

function PostCard({
  post,
  playingId,
  token,
  onLike,
  onComments,
  onOpenMenu,
  onToggleVideo,
  burstToken,
}: {
  post: FeedPost;
  playingId: number | null;
  token: string;
  onLike: (post: FeedPost) => void;
  onComments: (post: FeedPost) => void;
  onOpenMenu: (post: FeedPost) => void;
  onToggleVideo: (mediaId: number) => void;
  burstToken: number;
}) {
  const media = post.photos;
  const single = media.length === 1;
  return (
    <View style={styles.card}>
      {post.pinned ? <Text style={styles.pinned}>Pinned</Text> : null}
      <View style={[styles.authorRow, styles.cardPad]}>
        <PlayerAvatar name={post.author.displayName} photoUrl={post.author.photoUrl} size={wp(10)} />
        <View style={styles.flex}>
          <Text style={styles.itemTitle}>{post.author.displayName}</Text>
          <Text style={styles.muted}>{timeAgo(post.createdAt)} · {postTopicLabel(post.topic)}</Text>
        </View>
        <Pressable
          onPress={() => onOpenMenu(post)}
          accessibilityRole="button"
          accessibilityLabel="Post options"
          hitSlop={8}
        >
          <Text style={styles.more}>···</Text>
        </Pressable>
      </View>
      {post.body.trim() ? <Text style={styles.cardBody}>{post.body}</Text> : null}
      {single && media[0].kind === 'photo' ? (
        <MemberPhoto id={media[0].id} token={token} style={styles.fullImage} />
      ) : null}
      {single && media[0].kind === 'video' ? (
        <FeedVideo
          media={media[0]}
          token={token}
          playing={playingId === media[0].id}
          large
          onToggle={() => onToggleVideo(media[0].id)}
        />
      ) : null}
      {!single && media.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
          {media.map(item => item.kind === 'video' ? (
            <FeedVideo
              key={item.id}
              media={item}
              token={token}
              playing={playingId === item.id}
              large={false}
              onToggle={() => onToggleVideo(item.id)}
            />
          ) : (
            <MemberPhoto key={item.id} id={item.id} token={token} style={styles.photoPreview} />
          ))}
        </ScrollView>
      ) : null}
      {post.likeCount > 0 || post.commentCount > 0 ? (
        <View style={styles.summaryRow}>
          {post.likeCount > 0 ? (
            <View style={styles.summaryLikes}>
              <ThumbIcon filled small />
              <Text style={styles.summaryText}>{post.likeCount}</Text>
            </View>
          ) : <View />}
          {post.commentCount > 0 ? (
            <Pressable onPress={() => onComments(post)} accessibilityRole="button" accessibilityLabel="Comments">
              <Text style={styles.summaryText}>{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={styles.actionBar}>
        <ThumbBurst token={burstToken} />
        <Pressable onPress={() => onLike(post)} style={styles.actionCell} accessibilityRole="button" accessibilityLabel={post.likedByMe ? 'Unlike' : 'Like'}>
          <ThumbIcon filled={post.likedByMe} />
          <Text style={[styles.actionLabel, post.likedByMe && styles.actionLabelOn]}>Like</Text>
        </Pressable>
        <Pressable onPress={() => onComments(post)} style={styles.actionCell} accessibilityRole="button" accessibilityLabel="Comment">
          <Text style={styles.actionLabel}>Comment</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function GroupFeedPanel({
  groupId,
  userId,
  viewerName = 'You',
  viewerPhotoUrl = null,
  isAdmin,
  refreshKey = 0,
  onNotice,
}: {
  groupId: number;
  userId: number | null;
  viewerName?: string;
  viewerPhotoUrl?: string | null;
  isAdmin: boolean;
  refreshKey?: number;
  onNotice: (message: string) => void;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [burst, setBurst] = useState<{ id: number; token: number } | null>(null);
  const insets = useSafeAreaInsets();
  const [keyboardLift, setKeyboardLift] = useState(0);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [topic, setTopic] = useState<PostTopic>('talk');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<Asset[]>([]);
  const [video, setVideo] = useState<Asset | null>(null);
  const [posting, setPosting] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ post: FeedPost; step: 'actions' | 'delete' | 'report' } | null>(null);
  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<PostComment | null>(null);
  const token = getAccessToken() ?? '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listGroupPosts(groupId)
      .then(rows => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setPosts(orderFeed(list.map(normalizePost)));
        setProblem(null);
      })
      .catch(cause => {
        if (!cancelled) {
          const message = messageOf(cause, 'The feed could not be loaded. Try again.');
          setProblem(message);
          showToast(message, 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId, refreshKey]);

  const guard = async (task: () => Promise<void>) => {
    try {
      setProblem(null);
      await task();
    } catch (cause) {
      showToast(messageOf(cause, 'That could not be completed. Try again.'), 'error');
    }
  };

  const choosePhotos = async () => {
    try {
      const room = 8 - (video ? 1 : 0);
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: room,
        maxWidth: 6000,
        maxHeight: 6000,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorMessage) throw new Error('Could not open your photos. Try again.');
      const assets = result.assets ?? [];
      if (assets.length > room) throw new Error('A post can contain at most 8 photos and videos.');
      for (const asset of assets) {
        if (asset.type && !PHOTO_TYPES.has(asset.type)) throw new Error('Only JPEG, PNG, and WebP photos are supported.');
        if (asset.fileSize && asset.fileSize > FILE_LIMIT) throw new Error('Each photo or video must be smaller than 8 MB.');
      }
      if (byteTotal(assets) + (video?.fileSize ?? 0) > TOTAL_LIMIT) {
        throw new Error('Photos and video together must be smaller than 20 MB.');
      }
      setPhotos(assets);
      setProblem(null);
    } catch (cause) {
      showToast(messageOf(cause, 'Could not open the photo library.'), 'error');
    }
  };

  const chooseVideo = async () => {
    try {
      if (photos.length >= 8) throw new Error('A post can contain at most 8 photos and videos.');
      const result = await launchImageLibrary({ mediaType: 'video', selectionLimit: 1 });
      if (result.didCancel) return;
      if (result.errorMessage) throw new Error('Could not open your videos. Try again.');
      const asset = result.assets?.[0];
      if (!asset) return;
      if (asset.type && asset.type !== 'application/octet-stream' && !VIDEO_TYPES.has(asset.type)) {
        throw new Error('Use an MP4, MOV, or WebM video.');
      }
      if (asset.fileSize && asset.fileSize > FILE_LIMIT) throw new Error('Each photo or video must be smaller than 8 MB.');
      if (byteTotal(photos) + (asset.fileSize ?? 0) > TOTAL_LIMIT) {
        throw new Error('Photos and video together must be smaller than 20 MB.');
      }
      setVideo(asset);
      setProblem(null);
    } catch (cause) {
      showToast(messageOf(cause, 'Could not open your videos.'), 'error');
    }
  };

  const publish = () => {
    const text = body.trim();
    if ((!text && photos.length === 0 && !video) || posting) return;
    setPosting(true);
    void guard(async () => {
      const created = await createGroupPost(groupId, text, topic);
      if (photos.length || video) {
        try {
          const photoFiles = photos.map((photo, index) => {
            if (!photo.uri) throw new Error('A selected photo could not be read from this phone.');
            return {
              uri: photo.uri,
              type: photo.type ?? 'image/jpeg',
              fileName: photo.fileName ?? `group-photo-${index + 1}.jpg`,
            };
          });
          const videoFiles = video?.uri ? [{
            uri: video.uri,
            type: video.type ?? 'video/mp4',
            fileName: video.fileName ?? 'group-video.mp4',
          }] : [];
          await uploadPostPhotos(created.id, photoFiles, videoFiles);
        } catch (cause) {
          try { await deleteGroupPost(created.id); } catch { /* The new post is removed when the upload can be undone. */ }
          throw cause;
        }
      }
      setBody('');
      setTopic('talk');
      setPhotos([]);
      setVideo(null);
      setComposerOpen(false);
      const rows = await listGroupPosts(groupId);
      setPosts(orderFeed((Array.isArray(rows) ? rows : []).map(normalizePost)));
      onNotice('Post shared with the group.');
    }).finally(() => setPosting(false));
  };

  const like = (post: FeedPost) => {
    void guard(async () => {
      const updated = normalizePost(await togglePostLike(post.id));
      setPosts(current => orderFeed(current.map(item => item.id === post.id ? updated : item)));
      if (updated.likedByMe && !post.likedByMe) setBurst({ id: post.id, token: Date.now() });
    });
  };

  useEffect(() => {
    if (!composerOpen) return;
    return pushToastCover();
  }, [composerOpen]);

  useEffect(() => {
    if (!composerOpen) {
      setKeyboardLift(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, event => setKeyboardLift(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardLift(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [composerOpen]);

  const pin = (post: FeedPost) => {
    void guard(async () => {
      const updated = normalizePost(await pinGroupPost(post.id, !post.pinned));
      setPosts(current => orderFeed(current.map(item => item.id === post.id ? updated : item)));
      onNotice(updated.pinned ? 'Post pinned.' : 'Post unpinned.');
    });
  };

  const erase = (post: FeedPost) => {
    void guard(async () => {
      await deleteGroupPost(post.id);
      setPosts(current => current.filter(item => item.id !== post.id));
      setPlayingId(current => post.photos.some(item => item.id === current) ? null : current);
      onNotice('Post deleted.');
    });
  };

  const report = (post: FeedPost) => {
    void guard(async () => {
      await reportGroupContent(groupId, 'post', post.id, 'Please review this content');
      onNotice('Report sent to the group administrators.');
    });
  };

  const openComments = (post: FeedPost) => {
    setPlayingId(null);
    setCommentPost(post);
    setComments([]);
    setCommentBody('');
    setCommentToDelete(null);
    setCommentsLoading(true);
    listPostComments(post.id)
      .then(rows => setComments(orderComments(Array.isArray(rows) ? rows : [])))
      .catch(cause => showToast(messageOf(cause, 'Comments could not be loaded. Try again.'), 'error'))
      .finally(() => setCommentsLoading(false));
  };

  const sendComment = () => {
    if (!commentPost || commentBusy) return;
    const text = commentBody.trim();
    if (!text) {
      showToast('Write a comment.', 'error');
      return;
    }
    if (text.length > 500) {
      showToast('Keep the comment under 500 characters.', 'error');
      return;
    }
    const postId = commentPost.id;
    setCommentBusy(true);
    createPostComment(postId, text)
      .then(created => {
        setComments(current => orderComments([...current, created]));
        setCommentBody('');
        setPosts(current => current.map(item => item.id === postId ? { ...item, commentCount: item.commentCount + 1 } : item));
        setCommentPost(current => current && current.id === postId ? { ...current, commentCount: current.commentCount + 1 } : current);
        onNotice('Comment sent.');
      })
      .catch(cause => showToast(messageOf(cause, 'The comment could not be sent. Try again.'), 'error'))
      .finally(() => setCommentBusy(false));
  };

  const removeComment = (comment: PostComment) => {
    if (!commentPost || commentBusy) return;
    const postId = commentPost.id;
    setCommentBusy(true);
    deletePostComment(comment.id)
      .then(() => {
        setComments(current => current.filter(item => item.id !== comment.id));
        setCommentToDelete(null);
        setPosts(current => current.map(item => item.id === postId ? { ...item, commentCount: Math.max(0, item.commentCount - 1) } : item));
        setCommentPost(current => current && current.id === postId ? { ...current, commentCount: Math.max(0, current.commentCount - 1) } : current);
        onNotice('Comment removed.');
      })
      .catch(cause => showToast(messageOf(cause, 'The comment could not be removed. Try again.'), 'error'))
      .finally(() => setCommentBusy(false));
  };

  const canPublish = Boolean(body.trim() || photos.length || video) && !posting;
  const closeComposer = () => {
    setComposerOpen(false);
    setBody('');
    setPhotos([]);
    setVideo(null);
  };

  return (
    <View style={styles.stack}>
      <View style={styles.composer}>
        <Pressable style={styles.composerPromptRow} onPress={() => setComposerOpen(true)} accessibilityRole="button" accessibilityLabel="Write something">
          <PlayerAvatar name={viewerName} photoUrl={viewerPhotoUrl} size={wp(10)} />
          <View style={styles.composerPrompt}>
            <Text style={styles.composerPromptText}>Write something...</Text>
          </View>
        </Pressable>
      </View>
      <Modal visible={composerOpen} animationType="slide" onRequestClose={closeComposer}>
        <View style={[styles.composerScreen, { paddingTop: insets.top, paddingBottom: Platform.OS === 'ios' ? keyboardLift : 0 }]}>
          <View style={styles.composerHeader}>
            <Pressable onPress={closeComposer} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.toolText}>Cancel</Text>
            </Pressable>
            <Text style={styles.composerTitle}>Create post</Text>
            <Pressable onPress={publish} disabled={!canPublish} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.postLink, !canPublish && styles.disabledAction]}>{posting ? 'Posting' : 'Post'}</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.composerBody}>
            <View style={styles.authorRow}>
              <PlayerAvatar name={viewerName} photoUrl={viewerPhotoUrl} size={wp(10)} />
              <Text style={styles.itemTitle}>{viewerName}</Text>
            </View>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write something..."
              placeholderTextColor={colors.inkSecondary}
              multiline
              autoFocus
              style={[styles.field, styles.composerInput]}
              textAlignVertical="top"
              accessibilityLabel="Write something"
            />
            <Text style={styles.fieldLabel}>Topic</Text>
            <ChoiceRow
              options={POST_TOPICS.map(item => ({ value: item.value, label: item.label }))}
              value={topic}
              onChange={value => setTopic(POST_TOPICS.some(item => item.value === value) ? value as PostTopic : 'talk')}
            />
            {photos.length ? (
              <View style={styles.photoStrip}>
                {photos.map((photo, index) => photo.uri ? <Image key={`${photo.uri}-${index}`} source={{ uri: photo.uri }} style={styles.photoPreview} /> : null)}
              </View>
            ) : null}
            {video ? <Text style={styles.muted}>One video will be shared with this post.</Text> : null}
          </ScrollView>
          <View style={[styles.toolRow, { paddingBottom: Math.max(insets.bottom, hp(1)) }]}>
            <Pressable onPress={() => { choosePhotos().catch(() => undefined); }} style={styles.tool} accessibilityRole="button">
              <Text style={styles.toolText}>{photos.length ? `Photo · ${photos.length}` : 'Photo'}</Text>
            </Pressable>
            <Pressable onPress={() => { chooseVideo().catch(() => undefined); }} style={styles.tool} accessibilityRole="button">
              <Text style={styles.toolText}>{video ? 'Video added' : 'Video'}</Text>
            </Pressable>
            {photos.length ? (
              <Pressable onPress={() => setPhotos([])} style={styles.tool} accessibilityRole="button">
                <Text style={styles.toolText}>Clear photos</Text>
              </Pressable>
            ) : null}
            {video ? (
              <Pressable onPress={() => setVideo(null)} style={styles.tool} accessibilityRole="button">
                <Text style={styles.toolText}>Clear video</Text>
              </Pressable>
            ) : null}
          </View>
          <ToastPill bottom={Math.max(insets.bottom, hp(1)) + hp(1)} />
        </View>
      </Modal>
      {loading && posts.length === 0 ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          playingId={playingId}
          token={token}
          onLike={like}
          onComments={openComments}
          onOpenMenu={post => setMenu({ post, step: 'actions' })}
          onToggleVideo={mediaId => setPlayingId(current => current === mediaId ? null : mediaId)}
          burstToken={burst?.id === post.id ? burst.token : 0}
        />
      ))}
      {!loading && posts.length === 0 ? (
        <View style={styles.emptyPost}>
          <Text style={styles.itemTitle}>{problem ? 'The feed could not be loaded' : 'No posts yet'}</Text>
          <Text style={styles.muted}>{problem ? 'Pull down to try again.' : 'Be the first to write something for this group.'}</Text>
        </View>
      ) : null}
      <AppSheet visible={commentPost !== null} title="Comments" onClose={() => setCommentPost(null)}>
        <ScrollView style={styles.commentList} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.commentContent}>
          {commentsLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {!commentsLoading && comments.length === 0 ? <Text style={styles.muted}>No comments yet.</Text> : null}
          {comments.map(comment => {
            const canDelete = isAdmin || (userId !== null && comment.author.userId === userId);
            const confirming = commentToDelete?.id === comment.id;
            return (
              <View key={comment.id} style={styles.comment}>
                <View style={styles.authorRow}>
                  <PlayerAvatar name={comment.author.displayName} photoUrl={comment.author.photoUrl} size={wp(8)} />
                  <View style={styles.flex}>
                    <View style={styles.commentBubble}>
                      <Text style={styles.itemTitle}>{comment.author.displayName}</Text>
                      <Text style={styles.postBody}>{comment.body}</Text>
                    </View>
                    <Text style={styles.caption}>{timeAgo(comment.createdAt)}</Text>
                  </View>
                </View>
                {canDelete && !confirming ? <Action label="Delete" onPress={() => setCommentToDelete(comment)} secondary /> : null}
                {confirming ? (
                  <View style={styles.commentConfirm}>
                    <Text style={styles.muted}>Remove this comment?</Text>
                    <View style={styles.inlineRow}>
                      <Action label="Delete comment" onPress={() => removeComment(comment)} />
                      <Action label="Cancel" onPress={() => setCommentToDelete(null)} secondary />
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
        <TextInput
          value={commentBody}
          onChangeText={setCommentBody}
          placeholder="Write a comment..."
          placeholderTextColor={colors.textMuted}
          style={styles.field}
          accessibilityLabel="Write a comment"
          maxLength={500}
        />
        <PrimaryButton label={commentBusy ? 'Sending' : 'Send'} onPress={sendComment} disabled={!commentBody.trim() || commentBusy} />
      </AppSheet>
      <AppSheet
        visible={menu !== null}
        title={menu?.step === 'delete' ? 'Delete this post?' : menu?.step === 'report' ? 'Report this post?' : 'Post'}
        onClose={() => setMenu(null)}
      >
        {menu?.step === 'actions' ? (
          <View>
            {isAdmin ? (
              <Pressable
                style={styles.sheetRow}
                onPress={() => {
                  const post = menu.post;
                  setMenu(null);
                  pin(post);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.sheetText}>{menu.post.pinned ? 'Unpin' : 'Pin post'}</Text>
              </Pressable>
            ) : null}
            {isAdmin || (userId !== null && menu.post.author.userId === userId) ? (
              <Pressable
                style={styles.sheetRow}
                onPress={() => setMenu(current => current ? { ...current, step: 'delete' } : current)}
                accessibilityRole="button"
              >
                <Text style={styles.sheetText}>Delete post</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.sheetRow}
              onPress={() => setMenu(current => current ? { ...current, step: 'report' } : current)}
              accessibilityRole="button"
            >
              <Text style={styles.sheetText}>Report</Text>
            </Pressable>
          </View>
        ) : null}
        {menu?.step === 'delete' ? (
          <View style={styles.sheetStep}>
            <Text style={styles.sheetHelp}>This removes it for everyone in the group.</Text>
            <PrimaryButton label="Delete post" onPress={() => { const post = menu.post; setMenu(null); erase(post); }} />
            <Action label="Back" onPress={() => setMenu(current => current ? { ...current, step: 'actions' } : current)} secondary />
          </View>
        ) : null}
        {menu?.step === 'report' ? (
          <View style={styles.sheetStep}>
            <Text style={styles.sheetHelp}>This sends the post to the group administrators.</Text>
            <PrimaryButton label="Send report" onPress={() => { const post = menu.post; setMenu(null); report(post); }} />
            <Action label="Back" onPress={() => setMenu(current => current ? { ...current, step: 'actions' } : current)} secondary />
          </View>
        ) : null}
      </AppSheet>
    </View>
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

const styles = StyleSheet.create({
  stack: { gap: hp(1), backgroundColor: colors.canvas },
  loading: { marginVertical: hp(0.8) },
  flex: { flex: 1, minWidth: 0 },
  card: {
    backgroundColor: colors.background,
    paddingTop: hp(1.2),
    gap: hp(0.8),
  },
  composer: {
    backgroundColor: colors.background,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    gap: hp(0.9),
  },
  composerPromptRow: { flexDirection: 'row', alignItems: 'center', gap: wp(2.5) },
  composerPrompt: {
    flex: 1,
    minHeight: hp(5),
    borderRadius: wp(6),
    backgroundColor: colors.chip,
    justifyContent: 'center',
    paddingHorizontal: wp(4),
  },
  composerPromptText: { color: colors.inkSecondary, fontSize: fontSize(15) },
  toolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: hp(0.4),
  },
  tool: { paddingVertical: hp(1), paddingHorizontal: wp(2) },
  toolText: { color: colors.inkSecondary, fontSize: fontSize(13), fontWeight: '700' },
  publishRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: wp(4) },
  postBtn: {
    minHeight: hp(4.4),
    paddingHorizontal: wp(5),
    borderRadius: wp(2),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnText: { color: colors.background, fontSize: fontSize(14), fontWeight: '800' },
  pinned: { color: colors.inkSecondary, fontSize: fontSize(12), fontWeight: '700', paddingHorizontal: wp(4) },
  more: { color: colors.inkSecondary, fontSize: fontSize(18), fontWeight: '900', letterSpacing: 1, paddingHorizontal: wp(1) },
  sheetRow: {
    minHeight: hp(6.2),
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetText: { color: colors.text, fontSize: fontSize(16), fontWeight: '700' },
  sheetStep: { gap: hp(1.1) },
  sheetHelp: { color: colors.inkSecondary, fontSize: fontSize(14), lineHeight: fontSize(20) },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
  },
  summaryLikes: { flexDirection: 'row', alignItems: 'center', gap: wp(1) },
  summaryText: { color: colors.inkSecondary, fontSize: fontSize(12) },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: hp(0.4),
    position: 'relative',
    overflow: 'visible',
  },
  burst: {
    position: 'absolute',
    left: wp(8),
    bottom: hp(4),
    zIndex: 2,
  },
  photoMissing: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chip },
  composerScreen: { flex: 1, backgroundColor: colors.background },
  composerHeader: {
    minHeight: hp(6),
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  composerTitle: { color: colors.text, fontSize: fontSize(16), fontWeight: '800' },
  composerBody: { paddingHorizontal: wp(4), paddingTop: hp(1.4), paddingBottom: hp(2), gap: hp(1) },
  composerInput: { minHeight: hp(18), fontSize: fontSize(18), borderWidth: 0, paddingHorizontal: 0 },
  postLink: { color: colors.primary, fontSize: fontSize(15), fontWeight: '800' },
  commentContent: { paddingBottom: hp(1) },
  actionCell: {
    flex: 1,
    minHeight: hp(4.8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
  },
  actionLabel: { color: colors.inkSecondary, fontSize: fontSize(13), fontWeight: '700' },
  actionLabelOn: { color: colors.accent },
  emptyPost: { backgroundColor: colors.background, padding: wp(5), gap: hp(0.4) },
  commentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.chip,
    borderRadius: wp(3),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.7),
    gap: hp(0.2),
  },
  sectionTitle: { color: colors.text, fontSize: fontSize(15), fontWeight: '800' },
  fieldLabel: { color: colors.text, fontSize: fontSize(13), fontWeight: '800' },
  field: {
    minHeight: hp(5.5),
    borderRadius: wp(2.2),
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    color: colors.text,
    fontSize: fontSize(14),
    backgroundColor: colors.background,
  },
  multilineField: { minHeight: hp(10) },
  inlineRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: wp(2) },
  action: {
    minHeight: hp(4.5),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    backgroundColor: colors.primary,
  },
  secondaryAction: { backgroundColor: colors.primaryFaint, borderWidth: 1, borderColor: colors.primarySoft },
  disabledAction: { opacity: 0.45 },
  pressedAction: { opacity: 0.8 },
  actionText: { color: colors.background, fontSize: fontSize(12), fontWeight: '800', textTransform: 'capitalize' },
  secondaryActionText: { color: colors.primary },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  cardPad: { paddingHorizontal: wp(4) },
  itemTitle: { color: colors.text, fontSize: fontSize(15), fontWeight: '700' },
  muted: { color: colors.inkSecondary, fontSize: fontSize(12), lineHeight: fontSize(17) },
  postBody: { color: colors.text, fontSize: fontSize(15), lineHeight: fontSize(21) },
  cardBody: { color: colors.text, fontSize: fontSize(15), lineHeight: fontSize(22), paddingHorizontal: wp(4) },
  caption: { color: colors.textMuted, fontSize: fontSize(10) },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(1.5) },
  pill: {
    color: colors.primary,
    backgroundColor: colors.primaryFaint,
    overflow: 'hidden',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.4),
    borderRadius: wp(3),
    fontSize: fontSize(10),
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  photoStrip: { flexDirection: 'row', gap: wp(2) },
  photoPreview: { width: wp(24), height: wp(24), borderRadius: wp(2), backgroundColor: colors.surfaceMuted },
  fullImage: { width: '100%', height: wp(78), backgroundColor: colors.surfaceMuted },
  videoFrame: { overflow: 'hidden', backgroundColor: colors.primaryDark },
  videoLarge: { width: '100%', height: hp(28) },
  videoTile: { width: wp(40), height: wp(28) },
  videoFallback: {
    width: wp(40),
    minHeight: wp(28),
    borderRadius: wp(2),
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(3),
  },
  videoTap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  playBadge: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionRow: { flexDirection: 'row', alignItems: 'center', gap: wp(4) },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5), minHeight: hp(4) },
  reactionText: { color: colors.primary, fontSize: fontSize(13), fontWeight: '800' },
  count: { color: colors.text, fontSize: fontSize(13), fontWeight: '700' },
  error: { color: colors.primary, backgroundColor: colors.primaryFaint, padding: wp(3), borderRadius: wp(2), fontSize: fontSize(12) },
  commentList: { maxHeight: hp(26) },
  comment: { paddingVertical: hp(0.8), gap: hp(0.4), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  commentConfirm: { gap: hp(0.6) },
});
