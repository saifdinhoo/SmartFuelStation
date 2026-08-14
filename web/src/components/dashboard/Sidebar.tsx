import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, Wrench } from 'lucide-react';
import type { NavItem } from '@/features/dashboard/navigation';
import { Tooltip } from '@/components/ui/Tooltip';

interface SidebarProps {
  navItems: NavItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ navItems, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={`hidden h-screen flex-col border-e border-border bg-card transition-[width] duration-200 lg:flex ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Wrench className="h-5 w-5 shrink-0 text-primary" />
        {!collapsed && <span className="text-sm font-semibold">Smart Automotive</span>}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const link = (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          );

          return collapsed ? (
            <Tooltip key={item.path} label={item.label}>
              {link}
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="flex h-12 items-center justify-center border-t border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
