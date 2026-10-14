import { pushCopy, shouldDisplayInBackground } from '../src/notifications/push';

describe('push display copy', () => {
  test('uses the notification title and body', () => {
    expect(pushCopy({ notification: { title: ' New like ', body: ' Asha liked your post. ' } })).toEqual({
      title: 'New like',
      body: 'Asha liked your post.',
    });
  });

  test('uses data fields when the notification payload is missing', () => {
    expect(pushCopy({ data: { title: 'Match starting soon', body: 'Sunday game is about to start.' } })).toEqual({
      title: 'Match starting soon',
      body: 'Sunday game is about to start.',
    });
  });

  test('names the app when only a body is present', () => {
    expect(pushCopy({ data: { body: 'You are now in Sunday Group.' } })).toEqual({
      title: 'Crick Shots',
      body: 'You are now in Sunday Group.',
    });
  });

  test('ignores an empty message', () => {
    expect(pushCopy({ notification: { title: '  ', body: '' }, data: { title: 12 as unknown as string } })).toBeNull();
  });

  test('leaves a notification payload to the system while the app is not in front', () => {
    expect(shouldDisplayInBackground({ notification: { title: 'New comment', body: 'Nice shot' }, data: { title: 'New comment' } })).toBe(false);
  });

  test('draws a data-only message while the app is not in front', () => {
    expect(shouldDisplayInBackground({ data: { title: 'Request accepted', body: 'You are now in Sunday Group.' } })).toBe(true);
  });
});
