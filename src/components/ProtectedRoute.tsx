// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Role[]; // Allowed roles (optional)
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user, isLoading } = useAuth();

  // Loading indicator
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        aria-busy="true"
        aria-label="Loading..."
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If allowed roles are specified and user’s role isn’t one of them → redirect home
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Allowed → render children
  return <>{children}</>;
};

export default ProtectedRoute;
