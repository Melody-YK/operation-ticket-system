import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { api } from '../api/client';

interface User {
  id: string;
  name: string;
  role: string;
  team?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (personnelId: string, password: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'ops_ticket_auth';

function loadAuth(): AuthState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.token && parsed.user) {
        api.setToken(parsed.token);
        return { user: parsed.user, token: parsed.token, loading: false };
      }
    }
  } catch { void 0; }
  return { user: null, token: null, loading: false };
}

function saveAuth(user: User, token: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadAuth);

  const login = useCallback(async (personnelId: string, password: string) => {
    const result = await api.login(personnelId, password);
    const user: User = { id: result.user.id, name: result.user.name, role: result.user.role, team: result.user.team };
    saveAuth(user, result.access_token);
    setState({ user, token: result.access_token, loading: false });
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    clearAuth();
    setState({ user: null, token: null, loading: false });
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    isLoggedIn: !!state.user && !!state.token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
