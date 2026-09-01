import { useNavigate } from 'react-router-dom';
import { Video } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLiveCameraStatus } from './useLiveCameraStatus';

interface LiveStationCardProps {
  providerId: number;
  businessName: string;
}

// Shown on Customer Overview only for whichever provider the real data
// says has a camera (DiscoveryPage finds it via `liveCameraEnabled` on the
// providers list already loaded for search — no provider id or business
// name is ever hardcoded here). The LIVE/OFFLINE badge always reflects the
// real, freshly-fetched status — never a fabricated LIVE badge while the
// camera is actually offline.
export function LiveStationCard({ providerId, businessName }: LiveStationCardProps) {
  const navigate = useNavigate();
  const { cameraStatus, isPending } = useLiveCameraStatus(providerId);

  if (isPending) {
    return <Skeleton className="h-28 rounded-lg" />;
  }

  const isLive = cameraStatus?.status === 'LIVE';

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <p className="text-caption">Live Station</p>
            <p className="font-medium text-foreground">{businessName}</p>
            <div className="mt-1">
              <StatusIndicator
                variant={isLive ? 'success' : 'neutral'}
                label={isLive ? 'LIVE' : 'Camera Offline'}
              />
            </div>
            <p className="text-body-sm mt-1 text-muted-foreground">
              {isLive
                ? 'See the current station situation before you go.'
                : 'Live view is currently unavailable.'}
            </p>
          </div>
        </div>
        <Button
          variant={isLive ? 'primary' : 'secondary'}
          onClick={() => navigate(`/customer/live-station/${providerId}`)}
        >
          Watch Live
        </Button>
      </CardContent>
    </Card>
  );
}
