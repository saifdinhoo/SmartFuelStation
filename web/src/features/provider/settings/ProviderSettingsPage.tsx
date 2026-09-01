import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, Languages, Palette, Trash2 } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/features/auth/changePasswordSchema';
import { useChangePassword } from '@/features/auth/useChangePassword';
import {
  useOwnProviderProfile,
  useUpdateOwnProfile,
} from '@/features/provider/profile/useOwnProviderProfile';

// Settings that have no backing in the database are shown disabled with the
// reason stated, rather than rendered as working switches that silently
// discard the change. Each one is a real gap, not a placeholder for effect.
const UNSUPPORTED = [
  {
    icon: Bell,
    title: 'Notification preferences',
    reason: 'No notifications backend exists yet — nothing would be sent or stored.',
  },
  {
    icon: Trash2,
    title: 'Delete account',
    reason: 'No account-deletion endpoint exists, and bookings/reviews reference the account.',
  },
];

export function ProviderSettingsPage() {
  const { profile, isPending, isError, errorMessage, reload } = useOwnProviderProfile();
  const { save, isSaving } = useUpdateOwnProfile();
  const { showToast } = useToast();
  const { changePassword, isPending: isChangingPassword } = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  async function onChangePassword(values: ChangePasswordFormValues) {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset();
      showToast({ title: 'Password changed successfully', variant: 'success' });
    } catch (err) {
      showToast({
        title: getErrorMessage(err, 'Could not change your password'),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Settings</h1>
        <p className="text-body-sm text-muted-foreground">
          Account and app preferences for your business.
        </p>
      </div>

      {isError && (
        <ErrorState
          title="Could not load your settings"
          description={errorMessage ?? undefined}
          onRetry={reload}
        />
      )}

      {!isError && isPending && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      )}

      {!isError && !isPending && profile && (
        <Reveal className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Account</h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Name</span>
                <span className="text-foreground">{profile.user.name}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground">{profile.user.email}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Phone</span>
                <span className="text-foreground">{profile.user.phone ?? '—'}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="secondary">Provider</Badge>
              </div>
              <p className="text-caption mt-1">
                Name and phone are edited on{' '}
                <Link to="/provider/profile" className="underline">
                  Business Profile
                </Link>
                .
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Availability</h2>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Open for business</p>
                <p className="text-body-sm text-muted-foreground">
                  Controls whether customers can book you right now.
                </p>
              </div>
              <Switch
                checked={profile.isOpen}
                disabled={isSaving}
                onChange={() => save({ isOpen: !profile.isOpen })}
                label="Open for business"
              />
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
              <h2 className="text-heading-3">Security</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onChangePassword)} className="flex flex-col gap-4" noValidate>
                <PasswordInput
                  label="Current password"
                  autoComplete="current-password"
                  error={errors.currentPassword?.message}
                  {...register('currentPassword')}
                />
                <PasswordInput
                  label="New password"
                  autoComplete="new-password"
                  error={errors.newPassword?.message}
                  {...register('newPassword')}
                />
                <PasswordInput
                  label="Confirm new password"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
                <Button type="submit" isLoading={isChangingPassword} className="self-start">
                  Change password
                </Button>
              </form>
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
      )}
    </div>
  );
}
