// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, AuthContextType } from '../types';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

const isDev = (() => {
  try {
    const mode =
      (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.MODE) ||
      process.env.NODE_ENV ||
      'production';
    return mode !== 'production';
  } catch {
    return process.env.NODE_ENV !== 'production';
  }
})();

const getStatus = (err: any): number | undefined =>
  err?.status ?? err?.response?.status;

const getErrorMessage = (err: any, fallback: string): string =>
  err?.data?.message ||
  err?.response?.data?.message ||
  err?.message ||
  fallback;

const logUnexpected = (
  err: unknown,
  context: string,
  expectedStatuses: number[] = []
) => {
  if (!isDev) return;
  const status = getStatus(err as any);
  if (status && expectedStatuses.includes(status)) return;
  // eslint-disable-next-line no-console
  console.error(`${context}:`, getErrorMessage(err as any, 'Error'), { status });
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false); // guards login in-flight
  const [skipNextCheck, setSkipNextCheck] = useState(false); // skip /me after deliberate logout
  const didInitRef = useRef(false); // prevent React 18 StrictMode double effect
  const navigate = useNavigate();
  const location = useLocation();

  // Stable unauthorized handler for 401s from protected endpoints
  const handleUnauthorized = useCallback(
    (code?: string) => {
      setUser(null);
      if (code === 'TOKEN_EXPIRED') {
        toast.error('Your session has expired. Please log in again.');
      }
      navigate('/login', { replace: true });
    },
    [navigate]
  );

  // Set the global unauthorized handler once
  useEffect(() => {
    apiService.setUnauthorizedHandler(handleUnauthorized);
  }, [handleUnauthorized]);

  // One-time boot check for existing session.
  // Skips when:
  // - On public routes (e.g., /login, /register)
  // - A login is currently in-flight (authBusy)
  // - We just logged out (skipNextCheck)
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    let mounted = true;
    const publicRoutes = new Set(['/login', '/register']);

    const perform = async () => {
      if (publicRoutes.has(location.pathname) || authBusy || skipNextCheck) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const resp = await apiService.getMe();
        if (!mounted) return;
        if (resp?.success && resp.data) {
  setUser(resp.data);
} else {
  setUser(null);
}

      } catch (err: any) {
        const status = getStatus(err);
        if (status !== 401) {
          logUnexpected(err, 'Authentication check failed');
          toast.error('An unexpected error occurred. Please try again.');
        }
        setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void perform();

    return () => {
      mounted = false;
    };
    // Intentionally not depending on location/authBusy/skipNextCheck to keep this one-time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setAuthBusy(true);
    setIsLoading(true);
    try {
      const response = await apiService.login({ username, password });
      if (response?.success && response.data) {
        // Confirm identity via /me; fall back to login payload if needed
        try {
          const me = await apiService.getMe();
          setUser(me.data || response.data);
        } catch {
          setUser(response.data);
        }
        toast.success('Logged in successfully');
        return true;
      }
      toast.error(response?.message || 'Login failed.');
      setUser(null);
      return false;
    } catch (error: any) {
      logUnexpected(error, 'Login error', [401]);
      toast.error(getErrorMessage(error, 'Invalid credentials'));
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
      setAuthBusy(false);
    }
  };

  const register = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiService.register({ username, password });
      if (response?.success) {
        toast.success('Account created successfully! Please log in.');
        return true;
      }
      toast.error(response?.message || 'Registration failed');
      return false;
    } catch (error: any) {
      logUnexpected(error, 'Registration error', [400, 409]);
      toast.error(getErrorMessage(error, 'Registration failed'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setSkipNextCheck(true); // prevent any immediate /me fetch
    setIsLoading(true);
    try {
      await apiService.logout();
    } catch (error) {
      logUnexpected(error, 'Logout error', [401, 403, 404]);
    } finally {
      setUser(null);
      toast.success('Logged out successfully');
      setIsLoading(false);
      navigate('/login', { replace: true });
      // Reset skip flag after the navigation tick so future checks work normally
      setTimeout(() => setSkipNextCheck(false), 0);
    }
  };

  const role = user?.role;
  const isAdmin = role === 'Admin';
  const isViewer = role === 'Viewer';
  const canReduce = role === 'Admin' || role === 'User';

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    isLoading,
    isAdmin,
    isViewer,
    canReduce,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
