import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_REDIRECTS } from '../utils/roles.js';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { currentUser, role, loading, authError, refreshProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 font-sans">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-amber-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium tracking-wide">Verifying credentials & clearance...</p>
      </div>
    );
  }

  // If user is not authenticated, redirect to /login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle network/Firestore errors fetching the profile
  if (authError && !role) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 font-sans p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-900/50 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="text-red-400 mb-2 flex justify-center">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Connection Error</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{authError}</p>
          <button 
            onClick={refreshProfile} 
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-sm font-bold transition cursor-pointer"
          >
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  // If role is required and user does not have an allowed role
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect user to their own portal or unauthorized page
    const userHome = ROLE_REDIRECTS[role] || '/unauthorized';
    return <Navigate to={userHome} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
