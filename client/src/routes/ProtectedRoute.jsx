import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_REDIRECTS } from '../utils/roles.js';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { currentUser, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 font-sans">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-amber-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium tracking-wide">Verifying credentials & clearance...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const userHome = ROLE_REDIRECTS[role] || '/unauthorized';
    return <Navigate to={userHome} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
