import type { GroupPost } from '../api/client';

export const POST_TOPICS = [
  { value: 'match', label: 'Match' },
  { value: 'practice', label: 'Practice' },
  { value: 'meme', label: 'Meme' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'talk', label: 'Cricket talk' },
] as const;

export type PostTopic = (typeof POST_TOPICS)[number]['value'];

export type FeedMedia = {
  id: number;
  url: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  kind: 'photo' | 'video';
};

export type FeedPost = {
  id: number;
  groupId: number;
  body: string;
  topic: PostTopic;
  pinned: boolean;
  pinnedAt: string | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  author: { userId: number; username: string; displayName: string; photoUrl?: string | null };
  photos: FeedMedia[];
  createdAt: string;
  updatedAt: string | null;
};

export function postTopicLabel(topic: string | null | undefined): string {
  return POST_TOPICS.find(item => item.value === topic)?.label ?? 'Cricket talk';
}

export function isVideoMime(mime: string | null | undefined): boolean {
  return typeof mime === 'string' && mime.toLowerCase().startsWith('video/');
}

export function normalizePost(post: GroupPost): FeedPost {
  const topic = POST_TOPICS.some(item => item.value === post.topic) ? (post.topic as PostTopic) : 'talk';
  return {
    id: post.id,
    groupId: post.groupId,
    body: post.body ?? '',
    topic,
    pinned: Boolean(post.pinned),
    pinnedAt: post.pinnedAt ?? null,
    likeCount: Number(post.likeCount) > 0 ? Number(post.likeCount) : 0,
    likedByMe: Boolean(post.likedByMe),
    commentCount: Number(post.commentCount) > 0 ? Number(post.commentCount) : 0,
    author: post.author,
    photos: (post.photos ?? []).map(photo => ({
      id: photo.id,
      url: photo.url,
      mimeType: photo.mimeType,
      width: photo.width,
      height: photo.height,
      kind: photo.kind === 'video' || isVideoMime(photo.mimeType) ? 'video' : 'photo',
    })),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

type Ordered = {
  id: number;
  pinned?: boolean;
  pinnedAt?: string | null;
  createdAt: string;
};

function timeOf(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value.includes('T') ? value : value.replace(' ', 'T'));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function orderFeed<T extends Ordered>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    const aPinned = a.pinned ? 0 : 1;
    const bPinned = b.pinned ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;
    const aTime = timeOf(a.pinned ? a.pinnedAt ?? a.createdAt : a.createdAt);
    const bTime = timeOf(b.pinned ? b.pinnedAt ?? b.createdAt : b.createdAt);
    if (aTime !== bTime) return bTime - aTime;
    return b.id - a.id;
  });
}

export function orderComments<T extends { id: number; createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aTime = timeOf(a.createdAt);
    const bTime = timeOf(b.createdAt);
    if (aTime !== bTime) return aTime - bTime;
    return a.id - b.id;
  });
}
