// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
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
        const status = err?.status ?? err?.response?.status;
        const errorMessage = err?.data?.message || err?.message || 'Authentication check failed';
        if (status === 401) {
          console.info('Authentication check completed.');
        } else {
          console.error('An unexpected authentication error occurred:', errorMessage);
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
      console.error('Login error:', error);
      setUser(null);
      const errorMessage = error?.data?.message || error?.message || 'Login failed.';
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
      console.error('Registration error:', error);
      toast.error(error?.message || 'Registration failed');
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
      console.error('Logout error:', error);
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