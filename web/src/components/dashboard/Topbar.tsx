import { Menu } from 'lucide-react';
import type { NavItem } from '@/features/dashboard/navigation';
import type { AuthUser } from '@/features/auth/authApi';
import { SearchInput } from '@/components/ui/SearchInput';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationsDropdown, type NotificationData } from './NotificationsDropdown';
import { UserMenu } from './UserMenu';

interface TopbarProps {
  navItems: NavItem[];
  homePath: string;
  settingsPath: string;
  user: AuthUser;
  notifications: NotificationData[];
  onLogout: () => void;
  onOpenMobileDrawer: () => void;
}

export function Topbar({
  navItems,
  homePath,
  settingsPath,
  user,
  notifications,
  onLogout,
  onOpenMobileDrawer,
}: TopbarProps) {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
      <button
        type="button"
        onClick={onOpenMobileDrawer}
        aria-label="Open navigation menu"
        className="text-muted-foreground hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Breadcrumbs navItems={navItems} homePath={homePath} />

      <div className="hidden max-w-xs flex-1 sm:block">
        <SearchInput label="Search" hideLabel placeholder="Search…" />
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        <LanguageToggle />
        <ThemeToggle />
        <NotificationsDropdown notifications={notifications} />
        <UserMenu user={user} settingsPath={settingsPath} onLogout={onLogout} />
      </div>
    </header>
  );
}
