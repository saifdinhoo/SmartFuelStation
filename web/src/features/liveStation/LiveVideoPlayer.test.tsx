import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LiveVideoPlayer } from './LiveVideoPlayer';

const loadSourceMock = vi.fn();
const attachMediaMock = vi.fn();
const destroyMock = vi.fn();
const onMock = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedConfig: any = null;

vi.mock('hls.js', () => {
  class FakeHls {
    static isSupported() {
      return true;
    }
    static Events = { ERROR: 'hlsError' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(config: any) {
      capturedConfig = config;
    }
    loadSource = loadSourceMock;
    attachMedia = attachMediaMock;
    destroy = destroyMock;
    on = onMock;
  }
  return { default: FakeHls };
});

const HLS_URL = 'https://backend.local/api/providers/2/live-camera/stream/index.m3u8';
const DIRECT_URL = 'https://backend.local/api/providers/2/live-camera/stream';

beforeEach(() => {
  vi.clearAllMocks();
  capturedConfig = null;
  // Force the "no native HLS support" branch deterministically for the
  // .m3u8 tests, regardless of jsdom's own default for this API.
  HTMLMediaElement.prototype.canPlayType = vi.fn().mockReturnValue('');
});

describe('LiveVideoPlayer — direct (non-HLS) source', () => {
  it('renders a real, muted, no-controls <video> element', () => {
    const { container } = render(
      <LiveVideoPlayer streamUrl={DIRECT_URL} authToken="primary-jwt" nativeSrc={DIRECT_URL} />,
    );
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveProperty('muted', true);
    expect(video).toHaveProperty('autoplay', true);
    expect(video?.hasAttribute('controls')).toBe(false);
  });

  it('never renders any download/save affordance', () => {
    render(<LiveVideoPlayer streamUrl={DIRECT_URL} authToken="primary-jwt" nativeSrc={DIRECT_URL} />);
    expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download|save|record/i })).not.toBeInTheDocument();
  });

  it('falls back to a clean unavailable message on a playback error, without crashing', () => {
    render(<LiveVideoPlayer streamUrl={DIRECT_URL} authToken="primary-jwt" nativeSrc={DIRECT_URL} />);
    const video = document.querySelector('video')!;

    fireEvent.error(video);

    expect(screen.getByText('Live view temporarily unavailable')).toBeInTheDocument();
    expect(document.querySelector('video')).not.toBeInTheDocument();
  });

  it('shows unavailable rather than ever substituting the primary token when no scoped media URL exists', () => {
    render(<LiveVideoPlayer streamUrl={DIRECT_URL} authToken="primary-jwt" nativeSrc={null} />);

    expect(screen.getByText('Live view temporarily unavailable')).toBeInTheDocument();
    expect(document.querySelector('video')).not.toBeInTheDocument();
  });

  it('never exposes the media-token URL in visible text', () => {
    const withToken = `${DIRECT_URL}?token=short-lived-scoped-token`;
    render(<LiveVideoPlayer streamUrl={DIRECT_URL} authToken="primary-jwt" nativeSrc={withToken} />);
    expect(screen.queryByText(/short-lived-scoped-token/)).not.toBeInTheDocument();
  });

  it('sets the native <video> src to the scoped media-token URL, never the plain streamUrl with the primary token appended', async () => {
    const withToken = `${DIRECT_URL}?token=short-lived-scoped-token`;
    render(<LiveVideoPlayer streamUrl={DIRECT_URL} authToken="primary-jwt" nativeSrc={withToken} />);

    await waitFor(() => {
      expect(document.querySelector('video')!.src).toBe(withToken);
    });
    expect(document.querySelector('video')!.src).not.toContain('primary-jwt');
  });
});

describe('LiveVideoPlayer — HLS source via hls.js', () => {
  it('loads the plain, tokenless streamUrl into hls.js — never appends any token to the URL', async () => {
    render(<LiveVideoPlayer streamUrl={HLS_URL} authToken="primary-jwt" nativeSrc={null} />);

    await waitFor(() => expect(loadSourceMock).toHaveBeenCalledWith(HLS_URL));
    expect(loadSourceMock.mock.calls[0][0]).not.toContain('token=');
    expect(loadSourceMock.mock.calls[0][0]).not.toContain('primary-jwt');
  });

  it('attaches the real Authorization header via xhrSetup for every hls.js request, instead of a URL token', async () => {
    render(<LiveVideoPlayer streamUrl={HLS_URL} authToken="primary-jwt" nativeSrc={null} />);

    await waitFor(() => expect(capturedConfig?.xhrSetup).toBeInstanceOf(Function));
    const fakeXhr = { setRequestHeader: vi.fn() };
    capturedConfig.xhrSetup(fakeXhr, HLS_URL);
    expect(fakeXhr.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer primary-jwt');
  });

  it('plays through hls.js even when no scoped media token/nativeSrc is available at all', async () => {
    render(<LiveVideoPlayer streamUrl={HLS_URL} authToken="primary-jwt" nativeSrc={null} />);

    await waitFor(() => expect(loadSourceMock).toHaveBeenCalled());
    expect(attachMediaMock).toHaveBeenCalled();
    expect(screen.queryByText('Live view temporarily unavailable')).not.toBeInTheDocument();
  });

  it('shows the clean unavailable message on a fatal hls.js error', async () => {
    render(<LiveVideoPlayer streamUrl={HLS_URL} authToken="primary-jwt" nativeSrc={null} />);

    await waitFor(() => expect(onMock).toHaveBeenCalled());
    const errorHandler = onMock.mock.calls.find(([event]) => event === 'hlsError')?.[1];
    act(() => {
      errorHandler?.('hlsError', { fatal: true });
    });

    expect(screen.getByText('Live view temporarily unavailable')).toBeInTheDocument();
  });

  it('destroys the hls.js instance on unmount', async () => {
    const { unmount } = render(<LiveVideoPlayer streamUrl={HLS_URL} authToken="primary-jwt" nativeSrc={null} />);
    await waitFor(() => expect(attachMediaMock).toHaveBeenCalled());
    unmount();
    expect(destroyMock).toHaveBeenCalled();
  });
});
