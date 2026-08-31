import { useEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';

interface LiveVideoPlayerProps {
  /** Our own backend's absolute, tokenless stream URL — never the
   * upstream camera's real address, which this component (and the rest
   * of the app) never sees at all. Loaded only via hls.js, which attaches
   * the real Authorization header to every request itself. */
  streamUrl: string;
  /** The customer's real, primary application session token. Used ONLY
   * as an hls.js request header — never placed in a URL, never passed to
   * the native <video> fallback below. */
  authToken: string;
  /** Absolute URL carrying the backend's short-lived, single-purpose
   * media token (see liveStationApi.buildMediaTokenUrl), used ONLY by the
   * native <video src> fallback for a browser/format that cannot send a
   * custom header. Null when unavailable — the fallback path must then
   * show "unavailable" rather than ever substituting the primary token. */
  nativeSrc: string | null;
}

// Video only, muted by default, no controls to download/save, no
// recording — pure live viewing. hls.js is loaded dynamically (only when
// the source actually looks like an HLS playlist and the browser has no
// native HLS support) so browsers that can just play the src directly
// never pay for the extra bundle weight. This is deliberately the
// smallest player that works: no Chewie/Video.js-style UI framework, no
// custom controls beyond what a plain <video> already offers.
//
// Authentication is intentionally split in two, so the primary session
// token never ends up in a URL:
//   - hls.js path (the common case: MSE-capable browsers playing HLS):
//     every playlist/segment request gets a real `Authorization: Bearer`
//     header via hls.js's xhrSetup — nothing is ever appended to the URL.
//   - native <video src> path (Safari's native HLS, or a direct non-HLS
//     format): cannot send custom headers at all, so it uses the
//     backend's short-lived, single-purpose media token instead — never
//     the primary token, and never permanently — see liveStationApi.ts.
export function LiveVideoPlayer({ streamUrl, authToken, nativeSrc }: LiveVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError(false);

    let hls: Hls | undefined;
    let cancelled = false;

    async function attach() {
      const looksLikeHls = /\.m3u8(\?|$)/.test(streamUrl);
      const hasNativeHlsSupport = video!.canPlayType('application/vnd.apple.mpegurl') !== '';

      if (looksLikeHls && !hasNativeHlsSupport) {
        const { default: HlsJs } = await import('hls.js');
        if (cancelled) return;
        if (HlsJs.isSupported()) {
          hls = new HlsJs({
            xhrSetup: (xhr) => {
              xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
            },
          });
          hls.on(HlsJs.Events.ERROR, (_event, data) => {
            if (data.fatal) setError(true);
          });
          hls.loadSource(streamUrl);
          hls.attachMedia(video!);
          return;
        }
      }

      // Either a direct format (MJPEG/MP4/etc.), a browser with native
      // HLS support (Safari), or an MSE-incapable browser as a last
      // resort — none of these can attach a custom header, so only the
      // short-lived, single-purpose media token is ever used here. The
      // primary session token is never substituted in.
      if (!nativeSrc) {
        setError(true);
        return;
      }
      video!.src = nativeSrc;
    }

    attach().catch(() => {
      if (!cancelled) setError(true);
    });

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [streamUrl, authToken, nativeSrc]);

  if (error) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted">
        <p className="text-body-sm text-muted-foreground">Live view temporarily unavailable</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className="aspect-video w-full rounded-lg bg-black object-cover"
      muted
      autoPlay
      playsInline
      controls={false}
      onError={() => setError(true)}
    >
      <track kind="captions" />
    </video>
  );
}
