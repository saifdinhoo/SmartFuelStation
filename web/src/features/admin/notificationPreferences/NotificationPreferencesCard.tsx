import { Bell } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { useNotificationPreferences, useUpdateNotificationPreferences } from './useNotificationPreferences';
import type { NotificationPreferenceField } from './types';

// Only the four categories the backend actually emits notifications for
// (see notificationPreference.service.js's CATEGORY_BY_TYPE) — no toggle
// exists here for a notification family that doesn't exist yet.
const FIELDS: { field: NotificationPreferenceField; label: string; description: string }[] = [
  {
    field: 'bookingUpdates',
    label: 'Booking updates',
    description: 'Created, confirmed, rejected, cancelled, started, and completed bookings.',
  },
  { field: 'queueUpdates', label: 'Queue updates', description: 'Joining a queue and when your turn is next.' },
  { field: 'reviewUpdates', label: 'Review updates', description: 'A new review is left for a provider.' },
  {
    field: 'providerUpdates',
    label: 'Provider updates',
    description: 'A new provider registers, is approved, or is rejected.',
  },
];

export function NotificationPreferencesCard() {
  const { preferences, isPending, isError, errorMessage } = useNotificationPreferences();
  const { toggle, isSaving } = useUpdateNotificationPreferences();

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-2 text-heading-3">
          <Bell className="h-4 w-4 text-muted-foreground" />
          Notification settings
        </h2>
        <p className="text-caption">
          Which in-app notifications you receive on this account. Disabling a category stops it
          from being created for you at all — it won't appear in your notification list either.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending && (
          <div className="flex flex-col gap-3">
            {FIELDS.map(({ field }) => (
              <Skeleton key={field} className="h-6 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <Alert variant="destructive" title="Could not load notification settings">
            {errorMessage}
          </Alert>
        )}

        {preferences &&
          FIELDS.map(({ field, label, description }) => (
            <div key={field} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-caption">{description}</p>
              </div>
              <Switch
                label={label}
                checked={preferences[field]}
                disabled={isSaving}
                onChange={(checked) => toggle({ [field]: checked })}
              />
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
