import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { tokenStorage } from '@/services/tokenStorage';
import { getCurrentUser, type AuthUser } from '@/features/auth/authApi';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  loginWithResult: (result: { token: string; user: AuthUser }, remember: boolean) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Only actually "loading" if there's a token to verify — otherwise
  // there's nothing to wait for, so start already settled.
  const [loading, setLoading] = useState(() => tokenStorage.get() !== null);

  // On first load, if a token survived (via "remember me" or the current
  // tab session), fetch the matching user so a refresh doesn't log you out.
  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) return;

    getCurrentUser()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  function loginWithResult(result: { token: string; user: AuthUser }, remember: boolean) {
    tokenStorage.set(result.token, remember);
    setUser(result.user);
  }

  function logout() {
    tokenStorage.clear();
    setUser(null);
  }

  // Replaces the in-memory session user with the real, sanitized row the
  // backend just returned (e.g. after PATCH /auth/me) — every consumer of
  // useAuth().user re-renders with the new value immediately, with no
  // separate refetch.
  function updateUser(next: AuthUser) {
    setUser(next);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
        loginWithResult,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook pair, intentional
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
