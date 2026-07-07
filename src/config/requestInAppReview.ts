import InAppReview from 'react-native-in-app-review';
import { useUserStore } from '../store/useUserStore';

const MIN_COMPLETED_MATCHES = 3;
const REVIEW_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

type RequestInAppReviewOptions = {
  manual?: boolean;
};

function canPromptAgain(lastPromptAt: number | null, manual: boolean): boolean {
  if (manual) {
    return true;
  }
  if (lastPromptAt == null) {
    return true;
  }
  return Date.now() - lastPromptAt >= REVIEW_COOLDOWN_MS;
}

function shouldPromptForReview(
  completedMatches: number,
  lastPromptAt: number | null,
  manual: boolean,
): boolean {
  if (!canPromptAgain(lastPromptAt, manual)) {
    return false;
  }
  if (manual) {
    return true;
  }
  return completedMatches >= MIN_COMPLETED_MATCHES;
}

export function recordCompletedMatchForReview(): void {
  const { completedMatchesForReview, setCompletedMatchesForReview } =
    useUserStore.getState();
  setCompletedMatchesForReview(completedMatchesForReview + 1);
}

export async function maybeRequestInAppReview(
  options: RequestInAppReviewOptions = {},
): Promise<void> {
  const manual = options.manual ?? false;
  const { completedMatchesForReview, lastInAppReviewPromptAt, markInAppReviewPrompted } =
    useUserStore.getState();

  if (!shouldPromptForReview(completedMatchesForReview, lastInAppReviewPromptAt, manual)) {
    return;
  }

  if (!InAppReview.isAvailable()) {
    return;
  }

  try {
    await InAppReview.RequestInAppReview();
    markInAppReviewPrompted();
  } catch (error) {
    console.error('In-app review request failed', error);
  }
}
