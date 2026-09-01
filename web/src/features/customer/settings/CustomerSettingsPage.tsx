import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Languages, Palette } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Badge } from '@/components/ui/Badge';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/features/auth/changePasswordSchema';
import { useChangePassword } from '@/features/auth/useChangePassword';

export function CustomerSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { changePassword, isPending } = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordFormValues) {
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
        <p className="text-body-sm text-muted-foreground">Account and app preferences.</p>
      </div>

      <Reveal className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <h2 className="text-heading-3">Account</h2>
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
              <Badge variant="secondary">Customer</Badge>
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
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
              <Button type="submit" isLoading={isPending} className="self-start">
                Change password
              </Button>
            </form>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
