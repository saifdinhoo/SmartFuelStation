import { apiClient } from '@/services/apiClient';
import { SOCKET_URL } from '@/services/socketClient';
import { tokenStorage } from '@/services/tokenStorage';
import type { LiveCameraStatus } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchLiveCameraStatus(
  providerId: number | string,
): Promise<LiveCameraStatus> {
  const { data } = await apiClient.get<ApiEnvelope<LiveCameraStatus>>(
    `/providers/${providerId}/live-camera`,
  );
  return data.data;
}

// The customer's real, primary application session token — attached ONLY
// as an Authorization header (via hls.js's xhrSetup, see LiveVideoPlayer),
// never placed in a URL. A leaked URL (browser history, access logs, a
// copied link) must never be able to reach a customer's account.
export function getPrimaryAuthToken(): string | null {
  return tokenStorage.get();
}

// The backend's playbackUrl is a server-relative path that already
// includes "/api/..." (e.g. "/api/providers/5/live-camera/stream").
// SOCKET_URL is the bare origin with no /api suffix (the same value the
// Socket.IO client connects to), so concatenating the two gives the real,
// absolute stream URL — never the upstream camera's own address, which
// this app never sees at all. This is a plain, tokenless URL: it is only
// ever loaded through hls.js, which attaches the real Authorization
// header to every playlist/segment request itself (see LiveVideoPlayer).
export function buildStreamUrl(playbackUrl: string): string {
  return `${SOCKET_URL}${playbackUrl}`;
}

// A native <video src> (used for a browser with native HLS support, or a
// direct non-HLS format) cannot attach a custom Authorization header, so
// it cannot use buildStreamUrl above. It uses this instead: the backend's
// own short-lived, single-purpose `mediaToken` (see LiveCameraStatus),
// never the customer's primary session token. Returns null when no
// mediaToken is available — callers must treat that the same as "cannot
// play" rather than falling back to an unauthenticated or primary-token
// URL.
export function buildMediaTokenUrl(
  playbackUrl: string,
  mediaToken: string | null | undefined,
): string | null {
  if (!mediaToken) return null;
  const separator = playbackUrl.includes('?') ? '&' : '?';
  return `${SOCKET_URL}${playbackUrl}${separator}token=${encodeURIComponent(mediaToken)}`;
}
