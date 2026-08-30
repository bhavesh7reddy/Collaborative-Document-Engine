import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute: React.FC = () => {
  const isAuthenticated = !!localStorage.getItem('access_token') || !!localStorage.getItem('access');

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;