import { useQuery } from '@tanstack/react-query';
import { fetchLiveCameraStatus } from './liveStationApi';

// Polled lightly rather than pushed over the socket — the status object is
// tiny (no video data ever travels this way, see Phase F's report), and a
// camera that comes online or drops between visits should update without
// requiring a manual refresh. Undefined providerId (still loading the
// provider itself) simply skips the request.
export function useLiveCameraStatus(providerId: number | undefined) {
  const query = useQuery({
    queryKey: ['liveCamera', providerId],
    queryFn: () => fetchLiveCameraStatus(providerId as number),
    enabled: providerId !== undefined,
    refetchInterval: 30_000,
  });

  return {
    cameraStatus: query.data,
    isPending: query.isPending,
    isError: query.isError,
    reload: () => query.refetch(),
  };
}
