import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Compass className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-heading-2">404 — Page not found</h1>
      <p className="text-body-sm max-w-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Button onClick={() => navigate('/')}>Go home</Button>
    </div>
  );
}
