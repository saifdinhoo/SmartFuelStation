import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import type { AuthUser } from '@/features/auth/authApi';
import { ProtectedRoute } from './ProtectedRoute';

interface RoleRouteProps {
  roles: AuthUser['role'][];
  children: ReactNode;
}

// Builds on ProtectedRoute: also requires the signed-in user's role to be
// in the allowed list (e.g. a CUSTOMER trying to reach the web dashboard,
// which is provider/admin only) — otherwise sends them to /unauthorized.
export function RoleRoute({ roles, children }: RoleRouteProps) {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      {user && !roles.includes(user.role) ? <Navigate to="/unauthorized" replace /> : children}
    </ProtectedRoute>
  );
}
