import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ProviderServiceItem } from '@/features/customer/discovery/types';
import { useAvailability, useInvalidateAvailability } from '@/features/scheduling/useAvailability';
import type { AvailabilitySlot } from '@/features/scheduling/types';
import { useCreateBooking } from './useCreateBooking';

interface CreateBookingModalProps {
  open: boolean;
  onClose: () => void;
  providerId: number;
  services: ProviderServiceItem[];
}

// Local calendar date, "YYYY-MM-DD" — never derived via toISOString() (that
// would report UTC, which can be a day off from the browser's own local
// date near midnight).
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// The one place a chosen date + slot become a real instant to send to the
// backend — combined via the local multi-arg Date constructor, exactly
// like the backend's own availabilityRules.js documents, so this can never
// land on the wrong calendar day the way `new Date(dateOnlyString)` would.
function slotToIso(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

const SLOT_LABEL: Record<AvailabilitySlot['status'], string> = {
  AVAILABLE: '',
  BOOKED: 'Booked',
  PAST: 'Past',
};

export function CreateBookingModal({ open, onClose, providerId, services }: CreateBookingModalProps) {
  const navigate = useNavigate();
  const { createBooking, isPending } = useCreateBooking();
  const invalidateAvailability = useInvalidateAvailability();

  const [serviceId, setServiceId] = useState<number | null>(null);
  const [date, setDate] = useState(todayLocal());
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [notes, setNotes] = useState('');
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const availableServices = services.filter((s) => s.isAvailable);
  const { availability, isPending: availabilityPending, isFetching, isError, errorMessage, reload } =
    useAvailability(providerId, serviceId, date);

  // Reset the whole form each time the modal transitions from closed to
  // open — computed during render (against the previous `open` value)
  // rather than in an effect, so the reset lands in the same commit as
  // the render that opens the modal instead of a follow-up one.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setServiceId(null);
      setDate(todayLocal());
      setSelectedSlot(null);
      setNotes('');
      setConflictMessage(null);
    }
  }

  // A slot the user had selected can stop being AVAILABLE out from under
  // them (someone else booked it, or the list simply refreshed) — never
  // let a stale selection survive that. Same during-render pattern as
  // above, keyed on the availability object identity.
  const [checkedAvailability, setCheckedAvailability] = useState(availability);
  if (availability !== checkedAvailability) {
    setCheckedAvailability(availability);
    if (selectedSlot && availability) {
      const stillAvailable = availability.slots.some(
        (s) => s.startTime === selectedSlot.startTime && s.status === 'AVAILABLE',
      );
      if (!stillAvailable) setSelectedSlot(null);
    }
  }

  async function submit() {
    if (!serviceId || !selectedSlot) return;
    setConflictMessage(null);
    try {
      const booking = await createBooking({
        providerServiceId: serviceId,
        scheduledAt: slotToIso(date, selectedSlot.startTime),
        notes: notes.trim() ? notes : undefined,
      });
      onClose();
      navigate(`/customer/bookings/${booking.id}`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setConflictMessage('That time was just booked by someone else. Pick another slot below.');
        setSelectedSlot(null);
        await invalidateAvailability(providerId);
      }
      // Any other error is already surfaced by useCreateBooking's own toast.
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Book a service">
      {availableServices.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          This provider has no bookable services right now.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <Select
            label="Service"
            value={serviceId ?? ''}
            onChange={(e) => {
              setServiceId(e.target.value ? Number(e.target.value) : null);
              setSelectedSlot(null);
            }}
            options={[
              { value: '', label: 'Select a service…' },
              ...availableServices.map((s) => ({
                value: String(s.id),
                label: `${s.name} — $${s.price} (${s.durationMinutes} min)`,
              })),
            ]}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="booking-date" className="text-sm font-medium text-muted-foreground">
              Date
            </label>
            <input
              id="booking-date"
              type="date"
              min={todayLocal()}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedSlot(null);
              }}
              disabled={!serviceId}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {serviceId && (
            <div className="flex flex-col gap-2">
              {isError && (
                <p className="text-body-sm text-destructive">
                  {errorMessage ?? 'Could not load availability for this date.'}{' '}
                  <button type="button" className="underline" onClick={() => reload()}>
                    Retry
                  </button>
                </p>
              )}

              {!isError && (availabilityPending || isFetching) && (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 rounded-md" />
                  ))}
                </div>
              )}

              {!isError && !availabilityPending && !isFetching && availability && (
                <>
                  {availability.status === 'HOURS_NOT_CONFIGURED' && (
                    <p className="text-body-sm text-muted-foreground">
                      This provider hasn&apos;t set their operating hours yet, so this date can&apos;t
                      be booked.
                    </p>
                  )}
                  {availability.status === 'CLOSED' && (
                    <p className="text-body-sm text-muted-foreground">
                      This provider is closed on the selected date.
                    </p>
                  )}
                  {availability.status === 'OPEN' && (
                    <>
                      <p className="text-caption">
                        Open {availability.openingTime} – {availability.closingTime}
                      </p>
                      {availability.slots.length === 0 ? (
                        <p className="text-body-sm text-muted-foreground">
                          No time slots fit this service before closing on this date.
                        </p>
                      ) : (
                        <div
                          className="grid grid-cols-3 gap-2 overflow-y-auto"
                          style={{ maxHeight: '12rem' }}
                        >
                          {availability.slots.map((slot) => {
                            const isSelected = selectedSlot?.startTime === slot.startTime;
                            const disabled = slot.status !== 'AVAILABLE';
                            return (
                              <button
                                key={slot.startTime}
                                type="button"
                                disabled={disabled}
                                onClick={() => setSelectedSlot(slot)}
                                aria-pressed={isSelected}
                                title={disabled ? SLOT_LABEL[slot.status] : undefined}
                                className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                                  disabled
                                    ? 'cursor-not-allowed border-border bg-muted text-muted-foreground line-through'
                                    : isSelected
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-border bg-card text-foreground hover:border-primary'
                                }`}
                              >
                                {slot.startTime}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {conflictMessage && <p className="text-body-sm text-destructive">{conflictMessage}</p>}

          <Textarea
            label="Notes (optional)"
            placeholder="Anything the provider should know…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submit}
              isLoading={isPending}
              disabled={!serviceId || !selectedSlot}
            >
              Request booking
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
