import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { fetchProviders } from '@/features/customer/discovery/discoveryApi';
import { useCreateComplaint } from './useCreateComplaint';
import type { ComplaintSeverity } from './types';

interface CreateComplaintModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-selects a provider (e.g. opened from that provider's page); the
   * customer can still change it in the dropdown. */
  initialProviderId?: number;
}

const SEVERITY_OPTIONS: { value: ComplaintSeverity; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

export function CreateComplaintModal({ open, onClose, initialProviderId }: CreateComplaintModalProps) {
  // The same real, already-used "browse providers" source as Discovery —
  // never a second, separate provider list just for this form.
  const providersQuery = useQuery({ queryKey: ['providers'], queryFn: fetchProviders });
  const { createComplaint, isPending } = useCreateComplaint();

  const [providerId, setProviderId] = useState<number | null>(initialProviderId ?? null);
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [severity, setSeverity] = useState<ComplaintSeverity>('MEDIUM');

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setProviderId(initialProviderId ?? null);
      setSubject('');
      setDetails('');
      setSeverity('MEDIUM');
    }
  }

  const providers = providersQuery.data ?? [];

  async function submit() {
    if (!providerId || !subject.trim()) return;
    try {
      await createComplaint({
        providerId,
        subject: subject.trim(),
        details: details.trim() ? details : undefined,
        severity,
      });
      onClose();
    } catch {
      // Already surfaced by useCreateComplaint's own toast.
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="File a complaint">
      <div className="flex flex-col gap-4">
        <Select
          label="Business"
          value={providerId ?? ''}
          onChange={(e) => setProviderId(e.target.value ? Number(e.target.value) : null)}
          options={[
            { value: '', label: 'Select a business…' },
            ...providers.map((p) => ({ value: String(p.id), label: p.businessName })),
          ]}
        />

        <Input
          label="Subject"
          placeholder="Brief summary of the issue"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={150}
        />

        <Select
          label="Severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as ComplaintSeverity)}
          options={SEVERITY_OPTIONS}
        />

        <Textarea
          label="Details (optional)"
          placeholder="What happened?"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            isLoading={isPending}
            disabled={!providerId || !subject.trim()}
          >
            Submit complaint
          </Button>
        </div>
      </div>
    </Modal>
  );
}
