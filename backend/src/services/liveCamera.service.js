const { Readable } = require('stream');
const prisma = require('../config/prisma');
const { signMediaToken } = require('../utils/jwt');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

function unavailable(message) {
  const err = new Error(message);
  err.statusCode = 503;
  return err;
}

function toId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id)) {
    throw badRequest(`${label} must be a valid integer`);
  }
  return id;
}

// ---------------------------------------------------------------------------
// The ONLY place the real upstream camera address is ever read. Read lazily
// (never cached at module load) so it can be configured/unconfigured
// without restarting the process during development, and so tests can set
// process.env per-case. Never logged, never returned to a caller, never
// placed in a response header — see proxyStream below for the one place
// it is actually used (a server-side fetch).
//
// Current PoC scope: exactly ONE global upstream, because exactly one
// provider is enabled for this graduation-project proof of concept. This
// is deliberately not provider-specific storage yet — if a second real
// camera is ever added, LIVE_CAMERA_STREAM_URL must become a per-provider
// value (e.g. a ProviderCamera table), not a second env var. Nothing here
// should be read as "the current design already supports multiple
// independent camera feeds" — it does not.
// ---------------------------------------------------------------------------
function upstreamBaseUrl() {
  return process.env.LIVE_CAMERA_STREAM_URL || null;
}

function isConfigured() {
  return Boolean(upstreamBaseUrl());
}

const CAMERA_STATUS = { LIVE: 'LIVE', OFFLINE: 'OFFLINE', UNAVAILABLE: 'UNAVAILABLE' };

const HEALTH_CHECK_TIMEOUT_MS = 3000;

// A lightweight reachability probe — never downloads the video body, just
// confirms the upstream actually answers right now. This is what makes
// LIVE mean "the camera responded to a real request a moment ago" instead
// of "an environment variable happens to be set" (which said nothing
// about whether the camera was actually reachable). Called once per
// client status request; the client's own ~30s polling cadence is what
// keeps this from being aggressive health polling — no separate
// background poller is added on top of it.
async function checkUpstreamReachable(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.body && typeof response.body.cancel === 'function') {
      await response.body.cancel().catch(() => {});
    }
    return Boolean(response.ok);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function requireProviderWithCamera(providerIdParam) {
  const id = toId(providerIdParam, 'provider id');
  const provider = await prisma.provider.findUnique({
    where: { id },
    select: { id: true, liveCameraEnabled: true },
  });
  if (!provider) throw notFound('Provider not found');
  return provider;
}

// Never fabricates LIVE: a provider with no camera hardware at all is
// UNAVAILABLE; a provider with camera hardware but no configured upstream,
// or a configured upstream that just failed a real reachability check, is
// OFFLINE — never LIVE. `mediaToken` is only ever minted for a genuinely
// LIVE result, and is a short-lived token scoped to this one provider's
// stream (see utils/jwt.js) — never the caller's own primary JWT.
async function getStatus(providerIdParam) {
  const provider = await requireProviderWithCamera(providerIdParam);
  if (!provider.liveCameraEnabled) {
    return { providerId: provider.id, available: false, status: CAMERA_STATUS.UNAVAILABLE, playbackUrl: null };
  }

  const base = upstreamBaseUrl();
  if (!base) {
    return { providerId: provider.id, available: true, status: CAMERA_STATUS.OFFLINE, playbackUrl: null };
  }

  const reachable = await checkUpstreamReachable(base);
  if (!reachable) {
    return { providerId: provider.id, available: true, status: CAMERA_STATUS.OFFLINE, playbackUrl: null };
  }

  return {
    providerId: provider.id,
    available: true,
    status: CAMERA_STATUS.LIVE,
    playbackUrl: `/api/providers/${provider.id}/live-camera/stream`,
    mediaToken: signMediaToken({ providerId: provider.id }),
  };
}

// ---------------------------------------------------------------------------
// Resolves a client-supplied subPath against the one configured upstream,
// and proves the result is still that same upstream — not by pattern
// matching the raw string (every "reject strings containing X" check has a
// bypass: protocol-relative "//host", backslashes some parsers normalize
// to "//", userinfo smuggling, percent-encoding, ...) but by validating
// the actual PARSED result, which is what a bypass would have to survive.
// A relative reference can never change a URL's origin per the URL
// standard itself (that is exactly what "relative" means), so the only
// way subPath could point elsewhere is if it were resolved as an absolute
// or protocol-relative reference — which this check catches regardless of
// how that was spelled.
// ---------------------------------------------------------------------------
function resolveUpstreamUrl(subPath, baseString) {
  let base;
  try {
    base = new URL(baseString);
  } catch {
    throw unavailable('Live view is currently unavailable');
  }

  let resolved;
  try {
    resolved = subPath ? new URL(subPath, base) : base;
  } catch {
    throw badRequest('Invalid stream path');
  }

  if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
    throw badRequest('Invalid stream path');
  }
  if (resolved.host !== base.host) {
    throw badRequest('Invalid stream path');
  }
  if (resolved.username || resolved.password) {
    throw badRequest('Invalid stream path');
  }

  return { resolved, base };
}

// Rewrites one relative (or same-host absolute) playlist reference into a
// path that routes back through our own proxy, expressed relative to the
// ROOT playlist's own directory — not the directory of whatever nested
// sub-playlist referenced it. That is what lets arbitrarily nested
// sub-playlists (a master playlist referencing "720p/index.m3u8", which
// itself references "segment_001.ts" relative to ITS OWN directory)
// resolve correctly through a single flat proxy route: resolving
// "720p/segment_001.ts" against the root gives the same upstream URL as
// resolving "segment_001.ts" against "720p/"'s own directory would.
//
// A reference that resolves to a different host than the configured
// upstream is deliberately dropped rather than proxied or passed through
// — see the Phase F follow-up report's "one-camera architecture"
// limitation: this PoC assumes one self-hosted origin for the whole
// playlist tree. A real camera vendor that serves segments from a
// separate CDN origin would need an explicit allowlist design later; that
// is a documented gap, not something silently allowed here.
function toProxyPath(rawRef, { currentUrl, base, providerId }) {
  const trimmed = rawRef.trim();
  if (!trimmed) return null;

  let resolvedRef;
  try {
    resolvedRef = new URL(trimmed, currentUrl);
  } catch {
    return null;
  }
  if (resolvedRef.protocol !== base.protocol || resolvedRef.host !== base.host) {
    return null;
  }

  const baseDir = base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1);
  const path = resolvedRef.pathname.startsWith(baseDir)
    ? resolvedRef.pathname.slice(baseDir.length)
    : resolvedRef.pathname.replace(/^\/+/, '');

  return `/api/providers/${providerId}/live-camera/stream/${path}${resolvedRef.search}`;
}

const PLAYLIST_URI_ATTR = /URI="([^"]*)"/g;

// The smallest correct rewrite for the realistic case here: a single
// self-hosted HLS tree (one host, everything under one directory)
// referencing child playlists and segments by relative filename, plus any
// #EXT-X-KEY/#EXT-X-MAP `URI="..."` attributes. Deliberately not a general
// HLS-spec implementation — anything else in a playlist (tags without a
// URI, comments, blank lines) passes through completely untouched.
//
// A reference line is dropped (removed from the playlist entirely) rather
// than ever being handed to the client verbatim when it resolves
// cross-origin or fails to parse at all — see toProxyPath. A key/map
// URI="..." attribute in that same situation is blanked to `URI=""`
// instead of removing the whole tag, since dropping the tag could change
// how the rest of the line parses. Both are the documented one-camera
// limitation, not a general multi-CDN solution.
function rewriteLine(line, ctx) {
  const trimmed = line.trim();
  if (!trimmed) return line;
  if (trimmed.startsWith('#')) {
    if (!trimmed.includes('URI="')) return line;
    return line.replace(PLAYLIST_URI_ATTR, (match, uri) => {
      const proxied = toProxyPath(uri, ctx);
      return proxied ? `URI="${proxied}"` : 'URI=""';
    });
  }
  return toProxyPath(trimmed, ctx);
}

function rewritePlaylist(text, ctx) {
  return text
    .split('\n')
    .map((line) => rewriteLine(line, ctx))
    .filter((line) => line !== null)
    .join('\n');
}

function looksLikePlaylist(pathname, contentType) {
  return /\.m3u8(\?|$)/i.test(pathname) || /mpegurl/i.test(contentType || '');
}

// ---------------------------------------------------------------------------
// Stream proxy — pipes the upstream response through to the client without
// ever revealing the upstream's address. Playlist responses are rewritten
// (see rewritePlaylist) so every child reference keeps routing through
// this same proxy; every other response (segments, direct video/MJPEG) is
// piped through byte-for-byte, unmodified.
// ---------------------------------------------------------------------------
async function proxyStream(providerIdParam, subPath, res) {
  const provider = await requireProviderWithCamera(providerIdParam);
  if (!provider.liveCameraEnabled) throw notFound('This provider has no live camera');

  const configuredBase = upstreamBaseUrl();
  if (!configuredBase) throw unavailable('Live view is currently unavailable');

  const { resolved, base } = resolveUpstreamUrl(subPath, configuredBase);

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(resolved.toString());
  } catch {
    throw unavailable('Live view is currently unavailable');
  }
  if (!upstreamResponse.ok || !upstreamResponse.body) {
    throw unavailable('Live view is currently unavailable');
  }

  const contentType = upstreamResponse.headers.get('content-type');

  if (looksLikePlaylist(resolved.pathname, contentType)) {
    // Playlists are tiny, frequently-refreshed text files (a handful of KB
    // at most) — never the video itself — so buffering the full body to
    // rewrite it, rather than streaming it, is the right tradeoff here.
    const text = await upstreamResponse.text();
    const rewritten = rewritePlaylist(text, { currentUrl: resolved, base, providerId: provider.id });
    res.setHeader('Content-Type', contentType || 'application/vnd.apple.mpegurl');
    res.status(200);
    res.end(rewritten);
    return;
  }

  if (contentType) res.setHeader('Content-Type', contentType);
  res.status(200);

  await new Promise((resolve, reject) => {
    Readable.fromWeb(upstreamResponse.body)
      .pipe(res)
      .on('finish', resolve)
      .on('error', reject);
  });
}

module.exports = {
  CAMERA_STATUS,
  isConfigured,
  getStatus,
  proxyStream,
};
