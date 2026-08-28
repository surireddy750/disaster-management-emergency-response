import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { HeartPulse, LogOut, User, CheckCircle, Radio } from 'lucide-react';

export default function RescueDashboard() {
  const { userProfile, currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const displayName = userProfile?.name || currentUser?.displayName || currentUser?.email || 'Rescue Responder';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">
              Rescue Team Portal
            </h1>
            <p className="text-xs text-slate-400">Field Operations & Dispatch</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <User className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-200">{displayName}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
              RESCUE_TEAM
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <HeartPulse className="w-48 h-48 text-amber-400" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Field Unit Active</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome, {displayName}
            </h2>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              You are currently logged into the <span className="font-semibold text-amber-400">Rescue Team Dashboard</span> at route <code className="bg-slate-950 px-2 py-0.5 rounded text-amber-400 text-xs">/rescue/dashboard</code>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Account Role</div>
                <div className="text-base font-bold text-amber-400 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>RESCUE_TEAM</span>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Assigned Channel</div>
                <div className="text-base font-semibold text-slate-200 truncate">
                  {currentUser?.email || userProfile?.email || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-800/40 rounded-2xl flex items-start space-x-4">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Rescue Unit Clearance Confirmed</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Authentication and role boundary verification are complete. This portal will receive Phase 4: Mission dispatch receipts, live status transitions, and ground situation reporting.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
