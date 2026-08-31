import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Fuel, Info, MapPin } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { LocationActions } from '@/components/common/LocationActions';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useProviderFuel } from '@/features/fuel/useFuel';
import { FuelStatusList } from '@/features/fuel/FuelStatusList';
import { useProviderDetails } from '@/features/customer/discovery/useProviderDetails';
import { useQueueSummary } from '@/features/customer/queue/useQueueSummary';
import { useLiveCameraStatus } from './useLiveCameraStatus';
import { buildMediaTokenUrl, buildStreamUrl, getPrimaryAuthToken } from './liveStationApi';
import { LiveVideoPlayer } from './LiveVideoPlayer';

// Reuses every existing data source a Provider Details page already reads
// — fuel, queue, location, distance — rather than inventing a second way
// to fetch any of them. The only thing genuinely new here is the camera
// status + video.
export function LiveStationPage() {
  const { providerId: providerIdParam } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const providerId = providerIdParam ?? '';

  const { provider, isPending, isError, errorMessage, notFound, reload, customerCoordinates } =
    useProviderDetails(providerId);
  const queue = useQueueSummary(provider?.id);
  const fuel = useProviderFuel(provider?.id);
  const { cameraStatus, isPending: cameraPending } = useLiveCameraStatus(provider?.id);

  const isLive = cameraStatus?.status === 'LIVE';
  const playable = isLive && Boolean(cameraStatus?.playbackUrl);
  const authToken = playable ? getPrimaryAuthToken() : null;
  const streamUrl = playable && cameraStatus?.playbackUrl ? buildStreamUrl(cameraStatus.playbackUrl) : null;
  const nativeSrc =
    playable && cameraStatus?.playbackUrl
      ? buildMediaTokenUrl(cameraStatus.playbackUrl, cameraStatus?.mediaToken)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" onClick={() => navigate('/customer/search')}>
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Button>

      {isError && (
        <ErrorState onRetry={reload} description={errorMessage ?? 'Could not load this provider.'} />
      )}

      {!isError && notFound && (
        <EmptyState title="Provider not found" description="This provider may no longer be listed." />
      )}

      {!isError && isPending && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      )}

      {!isError &&
        !isPending &&
        provider &&
        (!provider.liveCameraEnabled ? (
          <EmptyState
            icon={Info}
            title="Live view not available"
            description="This provider does not have a live camera."
          />
        ) : (
          <Reveal className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-heading-2">{provider.businessName}</h1>
              <StatusIndicator
                variant={isLive ? 'success' : 'neutral'}
                label={isLive ? 'LIVE' : 'Camera Offline'}
              />
            </div>

            {cameraPending ? (
              <Skeleton className="aspect-video w-full rounded-lg" />
            ) : streamUrl && authToken ? (
              <LiveVideoPlayer streamUrl={streamUrl} authToken={authToken} nativeSrc={nativeSrc} />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted">
                <p className="font-medium text-foreground">Camera Offline</p>
                <p className="text-body-sm text-muted-foreground">
                  Live view is currently unavailable.
                </p>
              </div>
            )}

            <p className="text-caption">Live view is provided by the station for current conditions.</p>

            <div className="flex flex-wrap items-center gap-2">
              <LocationActions
                latitude={provider.latitude}
                longitude={provider.longitude}
                address={provider.address}
                origin={customerCoordinates}
              />
            </div>

            <Card>
              <CardHeader>
                <h2 className="text-heading-3">Station status</h2>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Open now</span>
                  <StatusIndicator
                    variant={provider.isOpen ? 'success' : 'neutral'}
                    label={provider.isOpen ? 'Open' : 'Closed'}
                  />
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Estimated wait
                  </span>
                  {queue.isPending ? (
                    <Skeleton className="h-4 w-24 rounded" />
                  ) : queue.isError || !queue.summary ? (
                    <span className="text-muted-foreground">Unavailable</span>
                  ) : queue.summary.queueLength === 0 ? (
                    <span>No wait — queue is empty</span>
                  ) : (
                    <span>
                      {queue.summary.queueLength} in queue · ~{queue.summary.estimatedWaitMinutes} min
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    Address
                  </span>
                  <span className="text-end text-foreground">
                    {provider.distanceKm !== null ? `${provider.distanceKm} km · ` : ''}
                    {provider.address}
                  </span>
                </div>
              </CardContent>
            </Card>

            {!fuel.isPending && !fuel.isError && fuel.fuel && fuel.fuel.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <Fuel className="h-4 w-4 text-primary" />
                  <h2 className="text-heading-3">Fuel Availability</h2>
                </CardHeader>
                <CardContent>
                  <FuelStatusList items={fuel.fuel} />
                </CardContent>
              </Card>
            )}
          </Reveal>
        ))}
    </div>
  );
}
