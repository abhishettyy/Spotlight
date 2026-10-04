import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface PublicRouteProps {
  children: React.ReactNode;
}

// Redirect to home if already authenticated
export default function PublicRoute({ children }: PublicRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
