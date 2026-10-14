import type { GroupPost } from '../src/api/client';
import { isVideoMime, normalizePost, orderComments, orderFeed, postTopicLabel } from '../src/social/feed';

const at = (iso: string) => iso;

describe('group feed topics', () => {
  test('labels the five post topics', () => {
    expect(postTopicLabel('match')).toBe('Match');
    expect(postTopicLabel('practice')).toBe('Practice');
    expect(postTopicLabel('meme')).toBe('Meme');
    expect(postTopicLabel('announcement')).toBe('Announcement');
    expect(postTopicLabel('talk')).toBe('Cricket talk');
  });

  test('unknown topics read as cricket talk', () => {
    expect(postTopicLabel('nope')).toBe('Cricket talk');
    expect(postTopicLabel(undefined)).toBe('Cricket talk');
  });
});

describe('feed media', () => {
  test('treats a video mime as video', () => {
    expect(isVideoMime('video/mp4')).toBe(true);
    expect(isVideoMime('Video/QuickTime')).toBe(true);
    expect(isVideoMime('image/jpeg')).toBe(false);
    expect(isVideoMime(undefined)).toBe(false);
  });
});

describe('feed order', () => {
  test('keeps an older newest-first list in the same order', () => {
    const posts = [
      { id: 2, createdAt: at('2026-04-02T10:00:00Z') },
      { id: 1, createdAt: at('2026-04-01T10:00:00Z') },
    ];
    expect(orderFeed(posts).map(post => post.id)).toEqual([2, 1]);
    expect(orderFeed(orderFeed(posts)).map(post => post.id)).toEqual([2, 1]);
  });

  test('puts pinned posts first, most recently pinned first', () => {
    const posts = [
      { id: 1, pinned: false, createdAt: at('2026-04-01T10:00:00Z') },
      { id: 2, pinned: true, pinnedAt: at('2026-04-02T10:00:00Z'), createdAt: at('2026-04-04T10:00:00Z') },
      { id: 3, pinned: true, pinnedAt: at('2026-04-03T10:00:00Z'), createdAt: at('2026-04-01T09:00:00Z') },
      { id: 4, pinned: false, createdAt: at('2026-04-05T10:00:00Z') },
    ];
    expect(orderFeed(posts).map(post => post.id)).toEqual([3, 2, 4, 1]);
    expect(orderFeed(orderFeed(posts)).map(post => post.id)).toEqual([3, 2, 4, 1]);
  });

  test('breaks a time tie with the higher id', () => {
    const stamp = at('2026-04-01T10:00:00Z');
    expect(orderFeed([{ id: 1, createdAt: stamp }, { id: 5, createdAt: stamp }]).map(post => post.id)).toEqual([5, 1]);
  });

  test('lists comments oldest first', () => {
    const rows = [
      { id: 8, createdAt: at('2026-04-02T10:00:00Z') },
      { id: 3, createdAt: at('2026-04-01T10:00:00Z') },
      { id: 4, createdAt: at('2026-04-01T10:00:00Z') },
    ];
    expect(orderComments(rows).map(row => row.id)).toEqual([3, 4, 8]);
  });
});

describe('older post payloads', () => {
  test('fills topic, likes, and media kind when the server omits them', () => {
    const raw = {
      id: 4,
      groupId: 1,
      body: 'Hi',
      author: { userId: 2, username: 'asha', displayName: 'Asha' },
      photos: [
        { id: 9, url: '/api/v1/media/9', mimeType: 'video/mp4', width: null, height: null },
        { id: 10, url: '/api/v1/media/10', mimeType: 'image/jpeg', width: 100, height: 80 },
      ],
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: null,
    } as GroupPost;
    const post = normalizePost(raw);
    expect(post.topic).toBe('talk');
    expect(post.pinned).toBe(false);
    expect(post.likeCount).toBe(0);
    expect(post.likedByMe).toBe(false);
    expect(post.commentCount).toBe(0);
    expect(post.photos.map(photo => photo.kind)).toEqual(['video', 'photo']);
  });
});
