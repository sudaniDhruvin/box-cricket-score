/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/navigation', () => ({ __esModule: true, default: () => null }));

import App from '../App';

test('renders correctly', async () => {
  let renderer: ReturnType<typeof ReactTestRenderer.create> | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });
  await ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
});
