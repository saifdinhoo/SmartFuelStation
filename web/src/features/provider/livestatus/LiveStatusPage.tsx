import { useState } from 'react';
import { Clock, ListOrdered, PlayCircle, Radio } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatCard } from '@/components/dashboard/StatCard';
import { useSocketStatus } from '@/app/providers/SocketProvider';
import { useProviderQueue } from '@/features/provider/queue/useProviderQueue';
import {
  useOwnProviderProfile,
  useUpdateOwnProfile,
} from '@/features/provider/profile/useOwnProviderProfile';

export function LiveStatusPage() {
  const { profile, isPending, isError, errorMessage, reload } = useOwnProviderProfile();
  const { save, isSaving } = useUpdateOwnProfile();
  const { connected } = useSocketStatus();

  // Queue numbers come from the existing provider queue hook — the same
  // ['queue'] cache the Queue page uses and SocketProvider keeps fresh.
  // No second queue store, and no polling: a queue mutation anywhere in the
  // app pushes 'queue:provider_updated' and this recomputes from it.
  const { waiting, inService, averageWaitMinutes } = useProviderQueue();
  const liveQueueLength = waiting.length + inService.length;

  const [waitDraft, setWaitDraft] = useState<string | null>(null);
  const waitValue = waitDraft ?? String(profile?.estimatedWaitMinutes ?? 0);

  async function saveWait() {
    const minutes = Number(waitValue);
    if (!Number.isInteger(minutes) || minutes < 0) return;
    await save({ estimatedWaitMinutes: minutes });
    setWaitDraft(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-heading-2">Live Status</h1>
          <span
            className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              connected ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-pulse bg-success' : 'bg-muted-foreground'}`}
            />
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
        <p className="text-body-sm text-muted-foreground">
          What customers see about your availability right now.
        </p>
      </div>

      {isError && (
        <ErrorState
          title="Could not load your live status"
          description={errorMessage ?? undefined}
          onRetry={reload}
        />
      )}

      {!isError && isPending && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      )}

      {!isError && !isPending && profile && (
        <Reveal className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio
                  className={`h-5 w-5 ${profile.isOpen ? 'text-success' : 'text-muted-foreground'}`}
                />
                <h2 className="text-heading-3">
                  {profile.isOpen ? 'Open for business' : 'Currently closed'}
                </h2>
              </div>
              <Switch
                checked={profile.isOpen}
                disabled={isSaving}
                onChange={() => save({ isOpen: !profile.isOpen })}
                label="Toggle open status"
              />
            </CardHeader>
            <CardContent>
              <p className="text-body-sm text-muted-foreground">
                {profile.isOpen
                  ? 'Customers can find you in search and book your available services.'
                  : 'You are hidden as closed. Existing bookings are unaffected.'}
              </p>
              {!profile.isApproved && (
                <p className="text-body-sm mt-2 text-warning">
                  Your business is still pending admin approval, so it will not appear in customer
                  search yet.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="In line now" value={liveQueueLength} icon={ListOrdered} />
            <StatCard label="Being served" value={inService.length} icon={PlayCircle} />
            <StatCard label="Live avg. wait" value={`${averageWaitMinutes} min`} icon={Clock} />
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Advertised wait time</h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-body-sm text-muted-foreground">
                Shown on your public profile. The live average above is measured from your actual
                queue; this is the figure you choose to advertise.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <Input
                  label="Minutes"
                  type="number"
                  min="0"
                  className="w-32"
                  value={waitValue}
                  onChange={(e) => setWaitDraft(e.target.value)}
                />
                <Button
                  onClick={saveWait}
                  isLoading={isSaving}
                  disabled={waitDraft === null || waitDraft === String(profile.estimatedWaitMinutes)}
                >
                  Save
                </Button>
                {waitDraft !== null && (
                  <Button variant="ghost" onClick={() => setWaitDraft(null)} disabled={isSaving}>
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </Reveal>
      )}
    </div>
  );
}
