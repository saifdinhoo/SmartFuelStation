import { Link } from 'react-router-dom';
import { Bell, Database, KeyRound, Languages, Palette, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { useAuth } from '@/app/providers/AuthProvider';

// Nothing on this page pretends to be a stored platform setting. There is
// no settings table in the schema, so the only real controls are the local
// appearance ones and links to the pages where real configuration lives.
const UNSUPPORTED = [
  {
    icon: SlidersHorizontal,
    title: 'Platform configuration',
    reason:
      'No settings table exists in the schema — booking windows, commission rates, and similar values have nowhere to be stored.',
  },
  {
    icon: Bell,
    title: 'Notification settings',
    reason: 'No notifications backend exists yet.',
  },
  {
    icon: KeyRound,
    title: 'Change password',
    reason:
      'There is no change-password endpoint. The PasswordResetToken table exists but no route is wired to it.',
  },
  {
    icon: Database,
    title: 'Backups & audit log',
    reason:
      'Nothing records administrative actions. Provider approvals store approvedById, but no general audit trail exists.',
  },
];

export function AdminSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">System Settings</h1>
        <p className="text-body-sm text-muted-foreground">
          Administrator account and app preferences.
        </p>
      </div>

      <Reveal className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <h2 className="text-heading-3">Your account</h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Name</span>
              <span className="text-foreground">{user?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{user?.email ?? '—'}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="success">
                <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
                Admin
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-heading-3">Appearance &amp; language</h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <Palette className="h-4 w-4 text-muted-foreground" />
                Theme
              </span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <Languages className="h-4 w-4 text-muted-foreground" />
                Language
              </span>
              <LanguageToggle />
            </div>
            <p className="text-caption">Saved in this browser only.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-heading-3">Real configuration lives here</h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Alert variant="info" title="Service categories are the platform's only stored configuration">
              Categories control what providers can offer and what customers can search.
            </Alert>
            <Link to="/admin/categories">
              <Button variant="secondary">Manage service categories</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-heading-3">Not available yet</h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {UNSUPPORTED.map(({ icon: Icon, title, reason }) => (
              <div key={title} className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-caption">{reason}</p>
                  </div>
                </div>
                <Button variant="secondary" disabled aria-disabled className="shrink-0">
                  Unavailable
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
