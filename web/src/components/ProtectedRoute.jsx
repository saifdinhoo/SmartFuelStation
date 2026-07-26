import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wraps a page: redirects to /login if not authenticated, and optionally
// restricts access to a set of roles (e.g. <ProtectedRoute roles={['ADMIN']}>).
function ProtectedRoute({ children, roles }) {
  const { token, user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;

  return children;
}

export default ProtectedRoute;
