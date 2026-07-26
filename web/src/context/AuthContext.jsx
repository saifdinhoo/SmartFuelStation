import { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  // On first load, if a token was saved from a previous session, fetch the
  // matching user so a page refresh doesn't lose the logged-in state.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .getCurrentUser(token)
      .then((res) => setUser(res.data))
      .catch(() => {
        setToken(null);
        localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
  }, [token]);

  function loginWithResult({ token: newToken, user: newUser }) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, loginWithResult, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
