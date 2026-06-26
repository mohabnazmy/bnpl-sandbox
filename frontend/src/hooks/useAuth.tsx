import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from '@bnpl/shared';
import * as api from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  /** True while the initial /me restore is in flight. */
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: api.getToken(),
    loading: Boolean(api.getToken()),
  });

  // Restore the session on mount if a token is persisted.
  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    let cancelled = false;
    api
      .me()
      .then(({ user }) => {
        if (!cancelled) setState({ user, token, loading: false });
      })
      .catch(() => {
        // token rejected / expired — clear it
        if (!cancelled) {
          api.setToken(null);
          setState({ user: null, token: null, loading: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await api.login({ email, password });
    api.setToken(token);
    setState({ user, token, loading: false });
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const { token, user } = await api.register({ email, password, name });
      api.setToken(token);
      setState({ user, token, loading: false });
    },
    [],
  );

  const logout = useCallback(() => {
    api.setToken(null);
    setState({ user: null, token: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
