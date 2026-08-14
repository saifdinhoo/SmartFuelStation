import { useState } from 'react';
import { Plus, ListOrdered, PlayCircle, CheckCircle2, Clock } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatCard } from '@/components/dashboard/StatCard';
import { useSocketStatus } from '@/app/providers/SocketProvider';
import { useProviderQueue } from './useProviderQueue';
import { AddWalkInModal } from './AddWalkInModal';
import { QueueEntryRow } from './QueueEntryRow';
import type { QueueEntry } from './types';

type PendingAction = { type: 'complete' | 'remove'; entry: QueueEntry } | null;

export function QueuePage() {
  const {
    viewState,
    errorMessage,
    waiting,
    inService,
    hasAnyEntries,
    completedToday,
    averageWaitMinutes,
    isMutating,
    reload,
    addWalkInCustomer,
    moveWaitingEntry,
    beginService,
    complete,
    remove,
  } = useProviderQueue();
  const { connected } = useSocketStatus();

  const [addOpen, setAddOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  async function handleConfirm() {
    if (!pendingAction) return;
    setIsConfirming(true);
    try {
      if (pendingAction.type === 'complete') {
        await complete(pendingAction.entry.id);
      } else {
        await remove(pendingAction.entry.id);
      }
      setPendingAction(null);
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-heading-2">Queue</h1>
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
            Manage your walk-in and waiting customers.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add walk-in
        </Button>
      </div>

      {viewState === 'error' && (
        <ErrorState
          title="Could not load the queue"
          description={errorMessage ?? undefined}
          onRetry={reload}
        />
      )}

      {viewState !== 'error' && (
        <>
          <Reveal className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Waiting" value={waiting.length} icon={ListOrdered} />
            <StatCard label="In service" value={inService.length} icon={PlayCircle} />
            <StatCard label="Completed today" value={completedToday} icon={CheckCircle2} />
            <StatCard label="Avg. wait" value={`${averageWaitMinutes} min`} icon={Clock} />
          </Reveal>

          {viewState === 'loading' && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          )}

          {viewState === 'ready' && !hasAnyEntries && (
            <EmptyState
              title="Queue is empty"
              description="Add a walk-in customer to get started."
              action={{ label: 'Add walk-in', onClick: () => setAddOpen(true) }}
            />
          )}

          {viewState === 'ready' && hasAnyEntries && (
            <Reveal delay={0.05} className="flex flex-col gap-6">
              <section className="flex flex-col gap-3">
                <h2 className="text-heading-3">Waiting ({waiting.length})</h2>
                {waiting.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">No one is waiting right now.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {waiting.map((entry, index) => (
                      <QueueEntryRow
                        key={entry.id}
                        position={index + 1}
                        customerName={entry.customerName}
                        service={entry.service}
                        status="waiting"
                        waitMinutes={entry.waitMinutes}
                        canMoveUp={index > 0 && !isMutating}
                        canMoveDown={index < waiting.length - 1 && !isMutating}
                        disabled={isMutating}
                        onMoveUp={() => moveWaitingEntry(entry.id, 'up')}
                        onMoveDown={() => moveWaitingEntry(entry.id, 'down')}
                        onStartService={() => beginService(entry.id)}
                        onRemove={() => setPendingAction({ type: 'remove', entry })}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-3">
                <h2 className="text-heading-3">In Service ({inService.length})</h2>
                {inService.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">
                    No one is currently being served.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {inService.map((entry) => (
                      <QueueEntryRow
                        key={entry.id}
                        customerName={entry.customerName}
                        service={entry.service}
                        status="in-service"
                        disabled={isMutating}
                        onComplete={() => setPendingAction({ type: 'complete', entry })}
                        onRemove={() => setPendingAction({ type: 'remove', entry })}
                      />
                    ))}
                  </div>
                )}
              </section>
            </Reveal>
          )}

          <AddWalkInModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onSubmit={addWalkInCustomer}
          />

          <ConfirmDialog
            open={pendingAction !== null}
            onClose={() => setPendingAction(null)}
            onConfirm={handleConfirm}
            title={pendingAction?.type === 'complete' ? 'Complete service?' : 'Remove from queue?'}
            description={
              pendingAction?.type === 'complete'
                ? `Mark ${pendingAction.entry.customerName}'s service as complete.`
                : `Remove ${pendingAction?.entry.customerName} from the queue. This cannot be undone.`
            }
            confirmLabel={pendingAction?.type === 'complete' ? 'Complete' : 'Remove'}
            danger={pendingAction?.type === 'remove'}
            isLoading={isConfirming}
          />
        </>
      )}
    </div>
  );
}
