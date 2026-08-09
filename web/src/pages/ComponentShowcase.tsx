import { useState } from 'react';
import type { ReactNode } from 'react';
import { Heading, Text } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ProviderStatusIndicator,
  type ProviderStatus,
} from '@/components/ui/ProviderStatusIndicator';
import { Reveal } from '@/components/common/Reveal';
import { useToast } from '@/app/providers/ToastProvider';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <Heading level={2}>{title}</Heading>
      {children}
    </section>
  );
}

interface SampleProvider {
  id: string;
  name: string;
  category: string;
  status: ProviderStatus;
}

const sampleProviders: SampleProvider[] = [
  { id: '1', name: 'Ahmad Auto Garage', category: 'Tire & Battery', status: 'open' },
  { id: '2', name: 'Fast Fix Repair', category: 'General Repair', status: 'busy' },
  { id: '3', name: 'Downtown Car Wash', category: 'Car Wash', status: 'closed' },
];

const providerColumns: DataTableColumn<SampleProvider>[] = [
  { key: 'name', header: 'Provider', render: (row) => row.name },
  { key: 'category', header: 'Category', render: (row) => row.category },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <ProviderStatusIndicator status={row.status} />,
  },
];

export function ComponentShowcase() {
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(true);
  const [page, setPage] = useState(1);
  const [tableLoading, setTableLoading] = useState(false);
  const [showEmptyTable, setShowEmptyTable] = useState(false);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 px-6 py-10">
      <header>
        <Heading level="display">Component Library</Heading>
        <Text variant="body-sm" className="text-muted-foreground">
          Reusable, accessible components for the Smart Automotive Service Platform
        </Text>
      </header>

      <Section title="Buttons">
        <Reveal className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button isLoading>Saving</Button>
        </Reveal>
      </Section>

      <Section title="Form controls">
        <Reveal delay={0.05} className="grid max-w-sm gap-4">
          <Input name="email" label="Email" placeholder="you@example.com" />
          <PasswordInput name="password" label="Password" placeholder="••••••••" />
          <SearchInput name="search" label="Search providers" placeholder="Tire shops near me" />
          <Select
            name="category"
            label="Service category"
            options={[
              { value: 'tires', label: 'Tires & Battery' },
              { value: 'repair', label: 'General Repair' },
            ]}
          />
          <Textarea name="notes" label="Notes" placeholder="Anything the provider should know?" />
          <FormField label="Preferences">
            <div className="flex flex-col gap-2">
              <Checkbox
                name="remindersOptIn"
                label="Send me appointment reminders"
                defaultChecked
              />
              <Checkbox name="locationOptIn" label="Share my location with providers" />
            </div>
          </FormField>
          <Switch checked={subscribed} onChange={setSubscribed} label="Email notifications" />
        </Reveal>
      </Section>

      <Section title="Cards, Badges, Avatars">
        <Reveal delay={0.1} className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Avatar name="Ahmad Auto Garage" />
              <div>
                <Heading level={3}>Ahmad Auto Garage</Heading>
                <Text variant="caption">Tire &amp; Battery Shop</Text>
              </div>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Badge variant="success">Approved</Badge>
              <Tooltip label="4.8 average rating from 32 reviews">
                <Badge variant="secondary">★ 4.8</Badge>
              </Tooltip>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Heading level={3}>Provider status</Heading>
              <Text variant="caption">Live availability indicator</Text>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <ProviderStatusIndicator status="open" />
              <ProviderStatusIndicator status="busy" />
              <ProviderStatusIndicator status="closed" />
              <ProviderStatusIndicator status="unavailable" />
            </CardContent>
          </Card>
        </Reveal>
      </Section>

      <Section title="Tabs">
        <Reveal delay={0.15}>
          <Tabs
            tabs={[
              {
                id: 'details',
                label: 'Details',
                content: <Text variant="body-sm">Provider details go here.</Text>,
              },
              {
                id: 'reviews',
                label: 'Reviews',
                content: <Text variant="body-sm">Customer reviews go here.</Text>,
              },
              {
                id: 'hours',
                label: 'Hours',
                content: <Text variant="body-sm">Opening hours go here.</Text>,
              },
            ]}
          />
        </Reveal>
      </Section>

      <Section title="Dropdown menu &amp; dialogs">
        <Reveal delay={0.2} className="flex flex-wrap items-center gap-3">
          <DropdownMenu
            trigger={
              <span className="rounded-md border border-border px-4 py-2 text-sm">Actions ▾</span>
            }
            items={[
              { label: 'Edit provider', onClick: () => showToast({ title: 'Edit clicked' }) },
              {
                label: 'Suspend account',
                onClick: () => showToast({ title: 'Suspend clicked', variant: 'warning' }),
              },
              { label: 'Delete', onClick: () => setConfirmOpen(true), danger: true },
            ]}
          />
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              showToast({
                title: 'Provider approved',
                description: 'Ahmad Auto Garage can now receive bookings.',
                variant: 'success',
              })
            }
          >
            Show toast
          </Button>
        </Reveal>
      </Section>

      <Section title="Data table">
        <Reveal delay={0.25} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setTableLoading((v) => !v)}>
              Toggle loading
            </Button>
            <Button variant="ghost" onClick={() => setShowEmptyTable((v) => !v)}>
              Toggle empty state
            </Button>
          </div>
          <DataTable
            columns={providerColumns}
            rows={showEmptyTable ? [] : sampleProviders}
            getRowKey={(row) => row.id}
            isLoading={tableLoading}
          />
          <Pagination currentPage={page} totalPages={5} onPageChange={setPage} />
        </Reveal>
      </Section>

      <Section title="Empty &amp; error states">
        <Reveal delay={0.3} className="grid gap-4 sm:grid-cols-2">
          <EmptyState
            title="No bookings yet"
            description="Once a customer books a service, it will show up here."
            action={{
              label: 'Browse categories',
              onClick: () => showToast({ title: 'Navigate to categories' }),
            }}
          />
          <ErrorState onRetry={() => showToast({ title: 'Retrying…' })} />
        </Reveal>
      </Section>

      <Section title="Skeleton loaders">
        <Reveal delay={0.35} className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </Reveal>
      </Section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Book a service">
        <Text variant="body-sm" className="mb-4">
          This is a modal dialog with animated open/close, Escape-to-close, and
          click-outside-to-close.
        </Text>
        <div className="flex justify-end">
          <Button onClick={() => setModalOpen(false)}>Close</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          showToast({ title: 'Deleted', variant: 'destructive' });
        }}
        title="Delete provider?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
