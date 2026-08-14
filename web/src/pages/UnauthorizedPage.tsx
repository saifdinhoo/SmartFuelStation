import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/app/providers/AuthProvider';

export function UnauthorizedPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <ShieldAlert className="h-12 w-12 text-destructive" />
      <h1 className="text-heading-2">Access denied</h1>
      <p className="text-body-sm max-w-sm text-muted-foreground">
        You don&apos;t have permission to view this page.
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={handleLogout}>
          Log out
        </Button>
        <Button onClick={() => navigate('/')}>Go home</Button>
      </div>
    </div>
  );
}
