import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { NavItem } from '@/features/dashboard/navigation';

interface BreadcrumbsProps {
  navItems: NavItem[];
  homePath: string;
}

export function Breadcrumbs({ navItems, homePath }: BreadcrumbsProps) {
  const location = useLocation();
  const current = navItems.find((item) => item.path === location.pathname);

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      <Link to={homePath} className="hover:text-foreground">
        Dashboard
      </Link>
      {current && current.path !== homePath && (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{current.label}</span>
        </>
      )}
    </nav>
  );
}
