import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  buildMediaTokenUrl,
  buildStreamUrl,
  fetchLiveCameraStatus,
  getPrimaryAuthToken,
} from './liveStationApi';
import { tokenStorage } from '@/services/tokenStorage';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn() },
}));
vi.mock('@/services/socketClient', () => ({
  SOCKET_URL: 'http://localhost:5000',
}));

beforeEach(() => {
  vi.clearAllMocks();
  tokenStorage.clear();
});

afterEach(() => {
  tokenStorage.clear();
});

describe('buildStreamUrl', () => {
  it('builds an absolute, tokenless URL by prefixing the bare origin onto the server-relative playbackUrl', () => {
    const url = buildStreamUrl('/api/providers/2/live-camera/stream');
    expect(url).toBe('http://localhost:5000/api/providers/2/live-camera/stream');
  });

  it('never appends the primary session token, or any token at all, to the URL', () => {
    tokenStorage.set('real-jwt', false);
    const url = buildStreamUrl('/api/providers/2/live-camera/stream');
    expect(url).not.toContain('token=');
    expect(url).not.toContain('real-jwt');
  });

  it('never uses the upstream camera address — only the app\'s own backend origin', () => {
    const url = buildStreamUrl('/api/providers/2/live-camera/stream');
    expect(url).not.toContain('rtsp');
    expect(url).toMatch(/^http:\/\/localhost:5000\//);
  });
});

describe('buildMediaTokenUrl', () => {
  it('appends the short-lived scoped media token — never the primary session token', () => {
    tokenStorage.set('primary-jwt', false);
    const url = buildMediaTokenUrl('/api/providers/2/live-camera/stream', 'scoped-media-token');
    expect(url).toBe('http://localhost:5000/api/providers/2/live-camera/stream?token=scoped-media-token');
    expect(url).not.toContain('primary-jwt');
  });

  it('appends with & when the playbackUrl already carries a query string', () => {
    const url = buildMediaTokenUrl('/api/providers/2/live-camera/stream?quality=hd', 'scoped-media-token');
    expect(url).toBe(
      'http://localhost:5000/api/providers/2/live-camera/stream?quality=hd&token=scoped-media-token',
    );
  });

  it('returns null rather than falling back to the primary token when no media token is available', () => {
    tokenStorage.set('primary-jwt', false);
    const url = buildMediaTokenUrl('/api/providers/2/live-camera/stream', null);
    expect(url).toBeNull();
  });

  it('returns null for an undefined media token too', () => {
    const url = buildMediaTokenUrl('/api/providers/2/live-camera/stream', undefined);
    expect(url).toBeNull();
  });
});

describe('getPrimaryAuthToken', () => {
  it('reads the real session token from tokenStorage', () => {
    tokenStorage.set('real-jwt', false);
    expect(getPrimaryAuthToken()).toBe('real-jwt');
  });

  it('returns null when there is no session', () => {
    expect(getPrimaryAuthToken()).toBeNull();
  });
});

describe('fetchLiveCameraStatus', () => {
  it('calls the real status endpoint and returns the unwrapped data', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { providerId: 2, available: true, status: 'LIVE', playbackUrl: '/x' } },
    });
    const status = await fetchLiveCameraStatus(2);
    expect(apiClient.get).toHaveBeenCalledWith('/providers/2/live-camera');
    expect(status.status).toBe('LIVE');
  });
});
