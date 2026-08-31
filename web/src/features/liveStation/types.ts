// GET /providers/:id/live-camera — see backend/src/services/liveCamera.service.js.
// The upstream camera's real address/credentials never appear anywhere in
// this shape; playbackUrl (when present) is always our own backend's
// proxy path, never the real camera.
export type LiveCameraStatusValue = 'LIVE' | 'OFFLINE' | 'UNAVAILABLE';

export interface LiveCameraStatus {
  providerId: number;
  available: boolean;
  status: LiveCameraStatusValue;
  playbackUrl: string | null;
  // Only present when status is LIVE. A short-lived (~5 min), single-
  // purpose token scoped to exactly this provider's stream — used ONLY by
  // a native <video> element that cannot send a custom Authorization
  // header. It is never the customer's real application session token.
  mediaToken?: string | null;
}
