import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_REDIRECTS } from '../../utils/roles.js';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export default function Unauthorized() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  const handleReturnHome = () => {
    const destination = ROLE_REDIRECTS[role] || '/login';
    navigate(destination, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-red-900/50 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Access Restricted</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your current security role <span className="font-semibold text-amber-400">({role || 'UNAUTHORIZED'})</span> does not possess clearance for this portal route.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleReturnHome}
            className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Portal</span>
          </button>

          <button
            onClick={logout}
            className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-red-950/40 hover:bg-red-900/50 text-red-300 rounded-xl text-xs font-semibold border border-red-800/40 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
