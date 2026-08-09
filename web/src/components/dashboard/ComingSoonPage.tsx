import { useLocation } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { getNavForRole } from '@/features/dashboard/navigation';

const allNavItems = [...getNavForRole('PROVIDER'), ...getNavForRole('ADMIN')];

// Shared placeholder for every nav destination that doesn't have real page
// content yet — this task builds the shell only, not page details.
export function ComingSoonPage() {
  const location = useLocation();
  const label = allNavItems.find((item) => item.path === location.pathname)?.label ?? 'This page';

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-16 text-center">
      <Hammer className="h-10 w-10 text-muted-foreground" />
      <h1 className="text-heading-2">{label}</h1>
      <p className="text-body-sm text-muted-foreground">Coming in a later task.</p>
    </div>
  );
}
