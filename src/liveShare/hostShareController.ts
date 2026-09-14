import { useMatchStore } from '../store/useMatchStore';
import { startHostShareSession, type HostShareSession } from './hostShareSession';

export type HostSharePublicState = {
  active: boolean;
  matchId: string | null;
  qrValue: string | null;
  hostLabel: string | null;
  viewerCount: number;
  error: string | null;
  starting: boolean;
};

type Listener = (state: HostSharePublicState) => void;

const initialState: HostSharePublicState = {
  active: false,
  matchId: null,
  qrValue: null,
  hostLabel: null,
  viewerCount: 0,
  error: null,
  starting: false,
};

let state: HostSharePublicState = { ...initialState };
let session: HostShareSession | null = null;
let storeUnsub: (() => void) | null = null;
let listeners = new Set<Listener>();
let startGeneration = 0;

function emit() {
  const snapshot = { ...state };
  listeners.forEach(listener => listener(snapshot));
}

function setState(patch: Partial<HostSharePublicState>) {
  state = { ...state, ...patch };
  emit();
}

export function getHostShareState(): HostSharePublicState {
  return { ...state };
}

export function subscribeHostShare(listener: Listener): () => void {
  listeners.add(listener);
  listener(getHostShareState());
  return () => {
    listeners.delete(listener);
  };
}

function detachStore() {
  storeUnsub?.();
  storeUnsub = null;
}

async function teardownSession() {
  detachStore();
  const current = session;
  session = null;
  if (current) {
    await current.stop().catch(() => undefined);
  }
}

/**
 * Starts TCP live sharing. Survives Share modal close until stopHostShare().
 */
export async function startHostShare(
  matchId: string,
  opts?: { force?: boolean },
): Promise<void> {
  if (
    !opts?.force &&
    state.active &&
    state.matchId === matchId &&
    session
  ) {
    return;
  }
  if (!opts?.force && state.starting && state.matchId === matchId) {
    return;
  }

  const generation = ++startGeneration;
  setState({
    starting: true,
    error: null,
    matchId,
    active: false,
    qrValue: null,
    hostLabel: null,
    viewerCount: 0,
  });

  await teardownSession();

  if (generation !== startGeneration) {
    return;
  }

  try {
    const match = useMatchStore.getState().matches.find(m => m.id === matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    const next = await startHostShareSession({
      matchId,
      matchName: `${match.innings[0].teamName} vs ${match.innings[1].teamName}`,
      getMatch: () =>
        useMatchStore.getState().matches.find(m => m.id === matchId),
      onViewerCountChange: count => {
        if (generation === startGeneration) {
          setState({ viewerCount: count });
        }
      },
    });

    if (generation !== startGeneration) {
      await next.stop().catch(() => undefined);
      return;
    }

    session = next;
    storeUnsub = useMatchStore.subscribe((nextState, prevState) => {
      const latest = nextState.matches.find(m => m.id === matchId);
      const previous = prevState?.matches?.find(
        (m: { id: string }) => m.id === matchId,
      );
      if (!latest || latest === previous) {
        return;
      }
      const active = session;
      if (!active) {
        return;
      }
      active.notifyMatchChanged(latest);
    });

    next.notifyMatchChanged(match);

    setState({
      active: true,
      starting: false,
      matchId,
      qrValue: next.qrValue,
      hostLabel: `${next.payload.host}:${next.payload.port}`,
      viewerCount: next.getViewerCount(),
      error: null,
    });
  } catch (e) {
    if (generation !== startGeneration) {
      return;
    }
    session = null;
    setState({
      active: false,
      starting: false,
      qrValue: null,
      hostLabel: null,
      viewerCount: 0,
      error: e instanceof Error ? e.message : 'Could not start sharing',
    });
  }
}

export async function stopHostShare(): Promise<void> {
  startGeneration += 1;
  await teardownSession();
  setState({ ...initialState });
}

export function isSharingMatch(matchId: string): boolean {
  return state.active && state.matchId === matchId;
}
