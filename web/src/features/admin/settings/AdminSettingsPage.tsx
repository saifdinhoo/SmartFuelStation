import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Database, Download, Languages, Palette, ShieldCheck } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Alert } from '@/components/ui/Alert';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/features/auth/changePasswordSchema';
import { useChangePassword } from '@/features/auth/useChangePassword';
import { BookingPolicyCard } from '@/features/admin/bookingPolicy/BookingPolicyCard';
import { NotificationPreferencesCard } from '@/features/notifications/preferences/NotificationPreferencesCard';
import { useExportBackup } from '@/features/admin/backup/useExportBackup';

export function AdminSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { changePassword, isPending: isChangingPassword } = useChangePassword();
  const { exportBackup, isExporting } = useExportBackup();
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
            <h2 className="text-heading-3">Real configuration lives here</h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Alert variant="info" title="Service categories and provider commission are the platform's stored configuration">
              Categories control what providers can offer and what customers can search. Each
              provider's commission rate is set from the Finance dashboard.
            </Alert>
            <Link to="/admin/categories">
              <Button variant="secondary">Manage service categories</Button>
            </Link>
            <Link to="/admin/finance">
              <Button variant="secondary">Manage commission &amp; finance</Button>
            </Link>
          </CardContent>
        </Card>

        <BookingPolicyCard />

        <NotificationPreferencesCard />

        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-heading-3">
              <Database className="h-4 w-4 text-muted-foreground" />
              System data backup
            </h2>
            <p className="text-caption">
              Downloads a real JSON snapshot of the platform's application data — users (without
              passwords), providers, bookings, reviews, finance, and more. Never includes
              credentials, tokens, or API keys.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              variant="secondary"
              isLoading={isExporting}
              onClick={() => exportBackup()}
              className="self-start"
            >
              <Download className="mr-2 h-4 w-4" />
              Download backup
            </Button>
            <Alert variant="info" title="Audit log">
              Every administrative action — approvals, category changes, settlements, policy
              updates, and backup exports — is recorded in the{' '}
              <Link to="/admin/audit-log" className="font-medium underline">
                audit log
              </Link>
              .
            </Alert>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
