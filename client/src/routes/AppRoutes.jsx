import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES, ROLE_REDIRECTS } from '../utils/roles.js';

import Login from '../pages/auth/Login.jsx';
import Register from '../pages/auth/Register.jsx';
import Unauthorized from '../pages/auth/Unauthorized.jsx';
import CitizenHome from '../pages/citizen/CitizenHome.jsx';
import RescueDashboard from '../pages/rescue/RescueDashboard.jsx';
import AdminDashboard from '../pages/admin/AdminDashboard.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

function RootRedirect() {
  const { currentUser, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 font-sans">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-amber-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium tracking-wide">Loading portal...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const target = ROLE_REDIRECTS[role] || '/citizen/home';
  return <Navigate to={target} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Citizen Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.CITIZEN]} />}>
        <Route path="/citizen/home" element={<CitizenHome />} />
        <Route path="/citizen/map" element={<CitizenHome />} />
        <Route path="/citizen/sos" element={<CitizenHome />} />
        <Route path="/citizen/alerts" element={<CitizenHome />} />
        <Route path="/citizen/profile" element={<CitizenHome />} />
      </Route>

      {/* Rescue Team Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.RESCUE_TEAM]} />}>
        <Route path="/rescue/dashboard" element={<RescueDashboard />} />
        <Route path="/rescue/missions" element={<RescueDashboard />} />
        <Route path="/rescue/map" element={<RescueDashboard />} />
        <Route path="/rescue/status" element={<RescueDashboard />} />
        <Route path="/rescue/profile" element={<RescueDashboard />} />
      </Route>

      {/* Admin Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/incidents" element={<AdminDashboard />} />
        <Route path="/admin/map" element={<AdminDashboard />} />
        <Route path="/admin/teams" element={<AdminDashboard />} />
        <Route path="/admin/resources" element={<AdminDashboard />} />
        <Route path="/admin/shelters" element={<AdminDashboard />} />
        <Route path="/admin/alerts" element={<AdminDashboard />} />
      </Route>

      {/* Catch-all Fallback */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
