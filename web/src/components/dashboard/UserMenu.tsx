import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { AuthUser } from '@/features/auth/authApi';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu } from '@/components/ui/DropdownMenu';

interface UserMenuProps {
  user: AuthUser;
  settingsPath: string;
  onLogout: () => void;
}

export function UserMenu({ user, settingsPath, onLogout }: UserMenuProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu
      trigger={
        <span className="flex items-center gap-2">
          <Avatar name={user.name} size="sm" />
          <span className="hidden text-sm sm:inline">{user.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
      }
      items={[
        { label: 'Settings', onClick: () => navigate(settingsPath) },
        { label: 'Log out', onClick: onLogout, danger: true },
      ]}
    />
  );
}
