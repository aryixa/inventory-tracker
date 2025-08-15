// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, AuthContextType } from '../types';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Lightweight, safe logging:
 * - Dev-only
 * - Skips expected statuses (e.g., 401 on invalid login)
 */
const isDev = (() => {
  try {
    // Vite: import.meta.env.MODE | CRA: process.env.NODE_ENV
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

const logUnexpected = (err: unknown, context: string, expectedStatuses: number[] = []) => {
  if (!isDev) return;
  const status = getStatus(err as any);
  if (status && expectedStatuses.includes(status)) return;
  // eslint-disable-next-line no-console
  console.error(`${context}:`, getErrorMessage(err as any, 'Error'), { status });
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const forceLogout = useCallback(() => {
    setUser(null);
    toast.error('Your session has expired. Please log in again.');
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    // Pass the logout handler to the API service
    apiService.setUnauthorizedHandler(forceLogout);

    let mounted = true;

    const checkAuthStatus = async () => {
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
        if (status === 401) {
          // Expected when not logged in or session expired — no console noise.
        } else {
          logUnexpected(err, 'Authentication check failed');
          toast.error('An unexpected error occurred. Please try again.');
        }
        setUser(null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuthStatus();

    return () => {
      mounted = false;
    };
  }, [forceLogout]);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await apiService.login({ username, password });
      const me = await apiService.getMe();

      if (me?.success && me.data) {
        setUser(me.data);
        toast.success('Logged in successfully');
        return true;
      } else {
        toast.error('Login succeeded, but failed to fetch user data. Please try again.');
        setUser(null);
        return false;
      }
    } catch (error: any) {
      // Suppress expected 401 (invalid credentials); log other statuses in dev only.
      logUnexpected(error, 'Login error', [401]);
      setUser(null);
      const errorMessage = getErrorMessage(error, 'Login failed.');
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string): Promise<boolean> => {
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
      // Treat common validation/conflict as expected (e.g., 400/409); only log unexpected.
      logUnexpected(error, 'Registration error', [400, 409]);
      toast.error(getErrorMessage(error, 'Registration failed'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiService.logout();
    } catch (error) {
      // Logout failures are usually non-fatal (network, already logged out). Don’t spam console.
      logUnexpected(error as any, 'Logout error', [401, 403, 404]);
      toast.error('Logout failed.');
    } finally {
      setUser(null);
      toast.success('Logged out successfully');
      setIsLoading(false);
    }
  };

  // ----- Derived capabilities from role -----
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
