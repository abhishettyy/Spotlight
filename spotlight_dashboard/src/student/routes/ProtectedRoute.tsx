import React from 'react';
import { Navigate } from 'react-router';
import { useAuthStore } from '@student/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const signingOut = useAuthStore((s) => s.signingOut);
  if (!isAuthenticated) {
    if (signingOut) return null;
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
