import {
  LayoutDashboard,
  Building2,
  Wrench,
  Radio,
  ListOrdered,
  CalendarCheck,
  Star,
  BarChart3,
  Settings,
  Users,
  UserRound,
  Tags,
  MessageSquareWarning,
  Search,
  Heart,
  Car,
  Fuel,
  Banknote,
  Bot,
  type LucideIcon,
} from 'lucide-react';
import type { AuthUser } from '@/features/auth/authApi';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const customerNav: NavItem[] = [
  { label: 'Find Services', path: '/customer/search', icon: Search },
  { label: 'AI Assistant', path: '/assistant', icon: Bot },
  { label: 'Bookings', path: '/customer/bookings', icon: CalendarCheck },
  { label: 'Favorites', path: '/customer/favorites', icon: Heart },
  { label: 'Reviews', path: '/customer/reviews', icon: Star },
  { label: 'Vehicles', path: '/customer/vehicles', icon: Car },
  { label: 'Settings', path: '/customer/settings', icon: Settings },
];

const providerNav: NavItem[] = [
  { label: 'Overview', path: '/provider/dashboard', icon: LayoutDashboard },
  { label: 'AI Assistant', path: '/assistant', icon: Bot },
  { label: 'Business Profile', path: '/provider/profile', icon: Building2 },
  { label: 'Services', path: '/provider/services', icon: Wrench },
  { label: 'Live Status', path: '/provider/live-status', icon: Radio },
  { label: 'Queue', path: '/provider/queue', icon: ListOrdered },
  { label: 'Bookings', path: '/provider/bookings', icon: CalendarCheck },
  { label: 'Reviews', path: '/provider/reviews', icon: Star },
  { label: 'Analytics', path: '/provider/analytics', icon: BarChart3 },
  { label: 'Finance', path: '/provider/finance', icon: Banknote },
  { label: 'Settings', path: '/provider/settings', icon: Settings },
];

const adminNav: NavItem[] = [
  { label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'AI Assistant', path: '/assistant', icon: Bot },
  { label: 'Providers', path: '/admin/providers', icon: Users },
  { label: 'Customers', path: '/admin/customers', icon: UserRound },
  { label: 'Categories', path: '/admin/categories', icon: Tags },
  { label: 'Fuel', path: '/admin/fuel', icon: Fuel },
  { label: 'Bookings', path: '/admin/bookings', icon: CalendarCheck },
  { label: 'Complaints', path: '/admin/complaints', icon: MessageSquareWarning },
  { label: 'Reviews', path: '/admin/reviews', icon: Star },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { label: 'Finance', path: '/admin/finance', icon: Banknote },
  { label: 'System Settings', path: '/admin/system-settings', icon: Settings },
];

export function getNavForRole(role: AuthUser['role']): NavItem[] {
  if (role === 'ADMIN') return adminNav;
  if (role === 'PROVIDER') return providerNav;
  if (role === 'CUSTOMER') return customerNav;
  return [];
}
