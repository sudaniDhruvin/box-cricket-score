let accessToken: string | null = null;

/** The short-lived API credential stays in memory and is never written to MMKV. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}
