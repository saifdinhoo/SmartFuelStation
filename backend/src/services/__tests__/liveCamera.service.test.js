jest.mock('../../config/prisma', () => ({
  provider: { findUnique: jest.fn() },
}));

const prisma = require('../../config/prisma');
const liveCameraService = require('../liveCamera.service');
const { verifyMediaToken } = require('../../utils/jwt');

const ORIGINAL_ENV = process.env.LIVE_CAMERA_STREAM_URL;

function providerRow(overrides = {}) {
  return { id: 2, liveCameraEnabled: true, ...overrides };
}

// A "healthy upstream" fetch mock: resolves ok, with a cancellable body
// (matching what checkUpstreamReachable expects from a real fetch Response).
function healthyUpstream() {
  return { ok: true, body: { cancel: jest.fn().mockResolvedValue(undefined) } };
}

function fakeRes() {
  return {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    end: jest.fn(),
    headersSent: false,
    pipe: jest.fn().mockReturnThis(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.LIVE_CAMERA_STREAM_URL;
});

afterAll(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.LIVE_CAMERA_STREAM_URL;
  else process.env.LIVE_CAMERA_STREAM_URL = ORIGINAL_ENV;
});

describe('getStatus', () => {
  it('404s for a provider that does not exist', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(liveCameraService.getStatus(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects a non-integer provider id', async () => {
    await expect(liveCameraService.getStatus('abc')).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.provider.findUnique).not.toHaveBeenCalled();
  });

  it('reports UNAVAILABLE for a provider with no camera at all — never even attempts a reachability check', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow({ liveCameraEnabled: false }));
    const fetchSpy = jest.spyOn(global, 'fetch');
    const status = await liveCameraService.getStatus(2);
    expect(status).toEqual({ providerId: 2, available: false, status: 'UNAVAILABLE', playbackUrl: null });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('reports OFFLINE (never LIVE) for a camera-enabled provider with no upstream configured', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    // No LIVE_CAMERA_STREAM_URL set — the real current state of this project.
    const status = await liveCameraService.getStatus(2);
    expect(status).toEqual({ providerId: 2, available: true, status: 'OFFLINE', playbackUrl: null });
  });

  it('reports OFFLINE (never LIVE) when an upstream is configured but a real reachability check fails', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const status = await liveCameraService.getStatus(2);

    expect(status).toEqual({ providerId: 2, available: true, status: 'OFFLINE', playbackUrl: null });
    fetchSpy.mockRestore();
  });

  it('reports OFFLINE (never LIVE) when the upstream answers with a non-OK status', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, body: { cancel: jest.fn().mockResolvedValue(undefined) } });

    const status = await liveCameraService.getStatus(2);

    expect(status.status).toBe('OFFLINE');
    fetchSpy.mockRestore();
  });

  it('reports LIVE with a same-origin playbackUrl and a scoped media token once the upstream actually answers', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(healthyUpstream());

    const status = await liveCameraService.getStatus(2);

    expect(status.providerId).toBe(2);
    expect(status.available).toBe(true);
    expect(status.status).toBe('LIVE');
    expect(status.playbackUrl).toBe('/api/providers/2/live-camera/stream');
    expect(typeof status.mediaToken).toBe('string');
    fetchSpy.mockRestore();
  });

  it('the media token is scoped to this exact provider and rejected for a different one', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow({ id: 2 }));
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(healthyUpstream());

    const status = await liveCameraService.getStatus(2);

    expect(verifyMediaToken(status.mediaToken, 2)).toMatchObject({ providerId: 2 });
    expect(() => verifyMediaToken(status.mediaToken, 3)).toThrow();
    fetchSpy.mockRestore();
  });

  it('never includes the upstream URL anywhere in the response, in any state', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/secret/path/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(healthyUpstream());

    const status = await liveCameraService.getStatus(2);

    expect(JSON.stringify(status)).not.toContain('camera.example.internal');
    expect(JSON.stringify(status)).not.toContain('secret');
    fetchSpy.mockRestore();
  });

  it('only ever selects the two fields it needs from Provider — never credentials that do not exist on the model either', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    await liveCameraService.getStatus(2);
    expect(prisma.provider.findUnique).toHaveBeenCalledWith({
      where: { id: 2 },
      select: { id: true, liveCameraEnabled: true },
    });
  });
});

describe('proxyStream — upstream SSRF guard', () => {
  it('404s for a provider that does not exist', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(liveCameraService.proxyStream(999, '', fakeRes())).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('404s for a provider that exists but has no camera — never attempts a fetch', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow({ liveCameraEnabled: false }));
    const fetchSpy = jest.spyOn(global, 'fetch');
    await expect(liveCameraService.proxyStream(2, '', fakeRes())).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('returns 503 rather than crashing when no upstream is configured', async () => {
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    await expect(liveCameraService.proxyStream(2, '', fakeRes())).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('returns 503 when the upstream fetch itself throws (network failure)', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(liveCameraService.proxyStream(2, '', fakeRes())).rejects.toMatchObject({
      statusCode: 503,
    });

    fetchSpy.mockRestore();
  });

  it('returns 503 when the upstream responds with a non-OK status, never surfacing the upstream error body', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 404, body: null, headers: new Map() });

    const error = await liveCameraService.proxyStream(2, '', fakeRes()).catch((e) => e);

    expect(error.statusCode).toBe(503);
    expect(error.message).not.toMatch(/camera\.example\.internal/);
    fetchSpy.mockRestore();
  });

  const REJECTED_HOST_CHANGES = [
    ['an absolute http:// override', 'http://evil.example.com/x'],
    ['an absolute https:// override', 'https://evil.example.com/x'],
    ['a protocol-relative "//host" reference', '//evil.example.com/x'],
    ['a leading-slash + backslash reference some parsers normalize to "//"', '/\\evil.example.com/x'],
    ['a double-backslash reference some parsers normalize to "//"', '\\\\evil.example.com/x'],
    ['same host but with embedded userinfo credentials', 'https://user:pass@camera.example.internal/x'],
  ];

  it.each(REJECTED_HOST_CHANGES)('rejects %s — never reaches fetch', async (_label, subPath) => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    const fetchSpy = jest.spyOn(global, 'fetch');

    await expect(liveCameraService.proxyStream(2, subPath, fakeRes())).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('rejects a malformed subPath that cannot be parsed as a URL at all', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    const fetchSpy = jest.spyOn(global, 'fetch');

    await expect(liveCameraService.proxyStream(2, 'http://[::1', fakeRes())).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('appends a relative subPath onto the configured base — the common case for a self-hosted HLS segment', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
      headers: new Map([['content-type', 'video/mp2t']]),
    });

    const res = fakeRes();
    res.pipe = jest.fn(() => {
      const emitter = { on: (event, cb) => (event === 'finish' ? cb() : emitter, emitter) };
      return emitter;
    });

    await liveCameraService.proxyStream(2, 'segment3.ts', res).catch(() => {});

    expect(fetchSpy).toHaveBeenCalledWith('https://camera.example.internal/live/segment3.ts');
    fetchSpy.mockRestore();
  });

  it('resolves a nested relative subPath (e.g. a sub-playlist reference) the same way', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/master.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
      headers: new Map([['content-type', 'video/mp2t']]),
    });
    const res = fakeRes();
    res.pipe = jest.fn(() => ({ on: (event, cb) => (event === 'finish' ? cb() : undefined) }));

    await liveCameraService.proxyStream(2, '720p/index.m3u8', res).catch(() => {});

    expect(fetchSpy).toHaveBeenCalledWith('https://camera.example.internal/live/720p/index.m3u8');
    fetchSpy.mockRestore();
  });

  it('allows a leading "/" relative path, resolved against the upstream host (not rejected as a host change)', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
      headers: new Map([['content-type', 'video/mp2t']]),
    });
    const res = fakeRes();
    res.pipe = jest.fn(() => ({ on: (event, cb) => (event === 'finish' ? cb() : undefined) }));

    await liveCameraService.proxyStream(2, '/other/segment.ts', res).catch(() => {});

    expect(fetchSpy).toHaveBeenCalledWith('https://camera.example.internal/other/segment.ts');
    fetchSpy.mockRestore();
  });

  it('allows "../" that resolves back onto the same allowed host (cannot escape the host, only the path)', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
      headers: new Map([['content-type', 'video/mp2t']]),
    });
    const res = fakeRes();
    res.pipe = jest.fn(() => ({ on: (event, cb) => (event === 'finish' ? cb() : undefined) }));

    await liveCameraService.proxyStream(2, '../other/segment.ts', res).catch(() => {});

    expect(fetchSpy).toHaveBeenCalledWith('https://camera.example.internal/other/segment.ts');
    fetchSpy.mockRestore();
  });

  it('allows a percent-encoded path segment (never decoded into a host-changing "//") and stays on the same host', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow());
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
      headers: new Map([['content-type', 'video/mp2t']]),
    });
    const res = fakeRes();
    res.pipe = jest.fn(() => ({ on: (event, cb) => (event === 'finish' ? cb() : undefined) }));

    await liveCameraService.proxyStream(2, '%2e%2e%2fevil', res).catch(() => {});

    const calledUrl = fetchSpy.mock.calls[0][0];
    expect(calledUrl.startsWith('https://camera.example.internal/')).toBe(true);
    fetchSpy.mockRestore();
  });
});

describe('proxyStream — HLS playlist rewriting', () => {
  function playlistUpstream(text, contentType = 'application/vnd.apple.mpegurl') {
    return {
      ok: true,
      body: {},
      headers: new Map([['content-type', contentType]]),
      text: jest.fn().mockResolvedValue(text),
    };
  }

  it('rewrites flat relative segment references to route back through our own proxy', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow({ id: 5 }));
    const playlist = ['#EXTM3U', '#EXTINF:6.0,', 'segment1.ts', '#EXTINF:6.0,', 'segment2.ts'].join('\n');
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(playlistUpstream(playlist));
    const res = fakeRes();

    await liveCameraService.proxyStream(5, '', res);

    const body = res.end.mock.calls[0][0];
    expect(body).toContain('/api/providers/5/live-camera/stream/segment1.ts');
    expect(body).toContain('/api/providers/5/live-camera/stream/segment2.ts');
    expect(body).not.toContain('camera.example.internal');
    fetchSpy.mockRestore();
  });

  it('rewrites a nested sub-playlist reference relative to the ROOT directory, not the child directory', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/master.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow({ id: 5 }));
    const masterPlaylist = ['#EXTM3U', '#EXT-X-STREAM-INF:BANDWIDTH=800000', '720p/index.m3u8'].join('\n');
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(playlistUpstream(masterPlaylist));
    const res = fakeRes();

    await liveCameraService.proxyStream(5, '', res);

    const body = res.end.mock.calls[0][0];
    expect(body).toContain('/api/providers/5/live-camera/stream/720p/index.m3u8');
    fetchSpy.mockRestore();

    // Now the client fetches that rewritten path — the second-level
    // playlist's OWN relative segment must resolve to the correct
    // upstream URL (720p/segment_001.ts), even though this request only
    // carries "720p/index.m3u8" as its subPath, not the deeper reference.
    const childPlaylist = ['#EXTM3U', 'segment_001.ts'].join('\n');
    const fetchSpy2 = jest.spyOn(global, 'fetch').mockResolvedValue(playlistUpstream(childPlaylist));
    const res2 = fakeRes();

    await liveCameraService.proxyStream(5, '720p/index.m3u8', res2);

    expect(fetchSpy2).toHaveBeenCalledWith('https://camera.example.internal/live/720p/index.m3u8');
    const body2 = res2.end.mock.calls[0][0];
    // Expressed relative to the ROOT directory ("live/"), so a later
    // request for it resolves correctly against the same fixed base.
    expect(body2).toContain('/api/providers/5/live-camera/stream/720p/segment_001.ts');
    fetchSpy2.mockRestore();
  });

  it('rewrites an #EXT-X-KEY URI="..." attribute the same way', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow({ id: 5 }));
    const playlist = ['#EXTM3U', '#EXT-X-KEY:METHOD=AES-128,URI="key.bin"', 'segment1.ts'].join('\n');
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(playlistUpstream(playlist));
    const res = fakeRes();

    await liveCameraService.proxyStream(5, '', res);

    const body = res.end.mock.calls[0][0];
    expect(body).toContain('URI="/api/providers/5/live-camera/stream/key.bin"');
    fetchSpy.mockRestore();
  });

  it('never leaks the real upstream host for a cross-origin reference — drops the line instead of passing it through', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow({ id: 5 }));
    const playlist = [
      '#EXTM3U',
      'segment1.ts',
      'https://some-other-cdn.example.net/segment2.ts',
    ].join('\n');
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(playlistUpstream(playlist));
    const res = fakeRes();

    await liveCameraService.proxyStream(5, '', res);

    const body = res.end.mock.calls[0][0];
    expect(body).toContain('/api/providers/5/live-camera/stream/segment1.ts');
    expect(body).not.toContain('some-other-cdn.example.net');
    fetchSpy.mockRestore();
  });

  it('is triggered by content-type even when the requested path has no .m3u8 extension', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow({ id: 5 }));
    const playlist = ['#EXTM3U', 'segment1.ts'].join('\n');
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(playlistUpstream(playlist, 'application/x-mpegURL'));
    const res = fakeRes();

    await liveCameraService.proxyStream(5, '', res);

    expect(res.end.mock.calls[0][0]).toContain('/api/providers/5/live-camera/stream/segment1.ts');
    fetchSpy.mockRestore();
  });

  it('a non-playlist response (a real .ts segment) is piped through untouched, never buffered/rewritten', async () => {
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    prisma.provider.findUnique.mockResolvedValue(providerRow({ id: 5 }));
    const textSpy = jest.fn();
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
      headers: new Map([['content-type', 'video/mp2t']]),
      text: textSpy,
    });
    const res = fakeRes();
    res.pipe = jest.fn(() => ({ on: (event, cb) => (event === 'finish' ? cb() : undefined) }));

    await liveCameraService.proxyStream(5, 'segment1.ts', res).catch(() => {});

    expect(textSpy).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('isConfigured', () => {
  it('reflects whether LIVE_CAMERA_STREAM_URL is set, without exposing its value', () => {
    delete process.env.LIVE_CAMERA_STREAM_URL;
    expect(liveCameraService.isConfigured()).toBe(false);
    process.env.LIVE_CAMERA_STREAM_URL = 'https://camera.example.internal/live/index.m3u8';
    expect(liveCameraService.isConfigured()).toBe(true);
  });
});
