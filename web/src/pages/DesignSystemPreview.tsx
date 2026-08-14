import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Heading, Text } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { useDirection } from '@/app/providers/DirectionProvider';

const colorTokens = [
  { name: 'Background', className: 'bg-background border border-border', var: '--background' },
  { name: 'Foreground', className: 'bg-foreground', var: '--foreground' },
  { name: 'Card', className: 'bg-card border border-border', var: '--card' },
  { name: 'Muted', className: 'bg-muted', var: '--muted' },
  { name: 'Border', className: 'bg-border', var: '--border' },
  { name: 'Primary', className: 'bg-primary', var: '--primary' },
  { name: 'Secondary', className: 'bg-secondary', var: '--secondary' },
  { name: 'Destructive', className: 'bg-destructive', var: '--destructive' },
  { name: 'Success', className: 'bg-success', var: '--success' },
  { name: 'Warning', className: 'bg-warning', var: '--warning' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <Heading level={2}>{title}</Heading>
      {children}
    </section>
  );
}

export function DesignSystemPreview() {
  const { language } = useDirection();
  const shouldReduceMotion = useReducedMotion();

  const demoText =
    language === 'ar'
      ? 'مرحبًا بك في منصة الخدمة الذكية للسيارات'
      : 'Welcome to the Smart Automotive Service Platform';

  return (
    <motion.div
      initial={shouldReduceMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="mx-auto flex max-w-4xl flex-col gap-12 px-6 py-10"
    >
      <header className="flex items-center justify-between gap-4">
        <div>
          <Heading level="display">Design System</Heading>
          <Text variant="body-sm" className="text-muted-foreground">
            Tokens and components for the Smart Automotive Service Platform
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <Section title="Typography">
        <div className="flex flex-col gap-3">
          <p className="text-display">Display heading</p>
          <p className="text-heading-1">Heading 1</p>
          <p className="text-heading-2">Heading 2</p>
          <p className="text-heading-3">Heading 3</p>
          <p className="text-body">Body text — used for the bulk of readable content.</p>
          <p className="text-body-sm">Small body text — secondary information.</p>
          <p className="text-caption">Caption text — hints, timestamps, metadata.</p>
        </div>
      </Section>

      <Section title="Color tokens">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {colorTokens.map((token) => (
            <div key={token.var} className="flex flex-col gap-2">
              <div className={`h-14 rounded-md ${token.className}`} />
              <Text variant="caption">{token.name}</Text>
              <code className="text-xs text-muted-foreground">{token.var}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" isLoading>
            Loading
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-sm gap-4">
          <Input label="Email" placeholder="you@example.com" />
          <Input label="Password" type="password" error="Password must be at least 6 characters" />
          <Select
            label="Account type"
            options={[
              { value: 'CUSTOMER', label: 'Customer' },
              { value: 'PROVIDER', label: 'Service Provider' },
            ]}
          />
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <Heading level={3}>Ahmad Auto Garage</Heading>
              <Text variant="caption">Tire &amp; Battery Shop</Text>
            </CardHeader>
            <CardContent>
              <Text variant="body-sm">123 Main St — approved provider, 4 active bookings.</Text>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Heading level={3}>RTL demo</Heading>
              <Text variant="caption">Toggle the language button above</Text>
            </CardHeader>
            <CardContent>
              <Text variant="body">{demoText}</Text>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Approved</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="destructive">Rejected</Badge>
        </div>
      </Section>

      <Section title="Status indicators">
        <div className="flex flex-wrap gap-4">
          <StatusIndicator variant="success" label="Provider approved" />
          <StatusIndicator variant="warning" label="Awaiting approval" />
          <StatusIndicator variant="destructive" label="Account suspended" />
          <StatusIndicator variant="neutral" label="Offline" />
        </div>
      </Section>

      <Section title="Alerts">
        <div className="flex flex-col gap-3">
          <Alert variant="info" title="Heads up">
            New service categories can be added from the admin panel.
          </Alert>
          <Alert variant="success" title="Provider approved">
            Ahmad Auto Garage can now receive bookings.
          </Alert>
          <Alert variant="warning" title="Pending approval">
            This provider hasn&apos;t been reviewed yet.
          </Alert>
          <Alert variant="destructive" title="Registration failed">
            That email is already registered.
          </Alert>
        </div>
      </Section>

      <Section title="Skeleton loaders">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-24 w-full max-w-xs rounded-lg sm:w-64" />
        </div>
      </Section>
    </motion.div>
  );
}
