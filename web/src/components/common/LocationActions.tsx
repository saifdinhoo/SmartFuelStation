import { Navigation, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  buildDirectionsUrl,
  buildViewLocationUrl,
  openExternalUrl,
  type Coordinates,
} from '@/utils/location';

interface LocationActionsProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  /** Used as a fallback for "View location" when coordinates aren't set yet. */
  address?: string | null;
  /** Customer's own position, if known — becomes the directions origin. */
  origin?: Coordinates | null;
  showDirections?: boolean;
  showViewLocation?: boolean;
}

// Shared by every screen that shows a provider's location — customer
// Provider Details, Admin's provider list/details. Keeps the two actions
// ("view" vs "navigate") and their disabled/tooltip states identical
// everywhere instead of each screen re-implementing them.
export function LocationActions({
  latitude,
  longitude,
  address,
  origin,
  showDirections = true,
  showViewLocation = true,
}: LocationActionsProps) {
  const viewUrl = buildViewLocationUrl(latitude, longitude, address);
  const directionsUrl = buildDirectionsUrl(latitude, longitude, origin);

  return (
    <div className="flex flex-wrap gap-2">
      {showViewLocation && (
        <Tooltip label={viewUrl ? 'Open in Google Maps' : "No location set for this business yet"}>
          <Button
            variant="ghost"
            disabled={!viewUrl}
            aria-disabled={!viewUrl}
            onClick={() => viewUrl && openExternalUrl(viewUrl)}
          >
            <MapPin className="h-4 w-4" />
            View location
          </Button>
        </Tooltip>
      )}
      {showDirections && (
        <Tooltip
          label={directionsUrl ? 'Open in Google Maps' : "This provider hasn't set a location yet"}
        >
          <Button
            disabled={!directionsUrl}
            aria-disabled={!directionsUrl}
            onClick={() => directionsUrl && openExternalUrl(directionsUrl)}
          >
            <Navigation className="h-4 w-4" />
            Get directions
          </Button>
        </Tooltip>
      )}
    </div>
  );
}
