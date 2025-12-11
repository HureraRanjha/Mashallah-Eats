import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, getUserType } = useAuth();

  // Show nothing while checking auth
  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role if allowedRoles specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userType = getUserType();
    if (!allowedRoles.includes(userType)) {
      return <Navigate to="/menu" replace />;
    }
  }

  return children;
}
