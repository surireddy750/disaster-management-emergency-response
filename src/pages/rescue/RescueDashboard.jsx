import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  subscribeRescueIncidents,
  acceptRescueMission,
  transitionMissionStatus,
  INCIDENT_STATUSES,
} from '../../services/incidentService.js';
import {
  HeartPulse,
  LogOut,
  User,
  Shield,
  AlertOctagon,
  AlertTriangle,
  Flame,
  Waves,
  Mountain,
  Building2,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  Play,
  CheckCircle,
  Radio,
  RefreshCw,
  Activity,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Inbox,
  Send,
} from 'lucide-react';

export default function RescueDashboard() {
  const { userProfile, currentUser, logout } = useAuth();

  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null); // { type: 'success'|'error', text: string }

  // Subscribe to real-time rescue incidents
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeRescueIncidents(
      (data) => {
        setIncidents(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching rescue incidents:', err);
        setFeedbackMessage({
          type: 'error',
          text: 'Unable to connect to live dispatch queue. Please check network connection.',
        });
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const displayName = userProfile?.name || currentUser?.displayName || currentUser?.email || 'Rescue Responder';
  const myTeamId = currentUser?.uid;

  // Filter Available Incidents vs My Assigned Missions
  const availableIncidents = incidents.filter(
    (inc) => inc.status === INCIDENT_STATUSES.REPORTED
  );

  const myMissions = incidents.filter(
    (inc) =>
      inc.assignedRescueTeamId === myTeamId &&
      (inc.status === INCIDENT_STATUSES.ASSIGNED || inc.status === INCIDENT_STATUSES.IN_PROGRESS)
  );

  const otherAssigned = incidents.filter(
    (inc) =>
      inc.assignedRescueTeamId &&
      inc.assignedRescueTeamId !== myTeamId &&
      (inc.status === INCIDENT_STATUSES.ASSIGNED || inc.status === INCIDENT_STATUSES.IN_PROGRESS)
  );

  // Accept a reported mission
  const handleAcceptMission = async (incident) => {
    if (!myTeamId) return;
    setActionLoadingId(incident.id);
    setFeedbackMessage(null);

    try {
      await acceptRescueMission(incident.id, myTeamId, displayName);
      setFeedbackMessage({
        type: 'success',
        text: `Mission #${incident.incidentId || incident.id.slice(0, 8)} accepted and assigned to your unit!`,
      });
    } catch (err) {
      console.error('Error accepting mission:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to accept mission. It may have already been claimed.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Transition mission status: ASSIGNED -> IN_PROGRESS -> RESOLVED
  const handleTransitionStatus = async (incident, nextStatus) => {
    setActionLoadingId(incident.id);
    setFeedbackMessage(null);

    try {
      await transitionMissionStatus(incident.id, nextStatus, myTeamId);
      const statusLabel = nextStatus === INCIDENT_STATUSES.IN_PROGRESS ? 'IN PROGRESS (En Route)' : 'RESOLVED';
      setFeedbackMessage({
        type: 'success',
        text: `Mission #${incident.incidentId || incident.id.slice(0, 8)} updated to ${statusLabel}.`,
      });
    } catch (err) {
      console.error('Error updating mission status:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to update mission status.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40 ring-1 ring-rose-500/30';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'MODERATE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'LOW':
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case INCIDENT_STATUSES.REPORTED:
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case INCIDENT_STATUSES.ASSIGNED:
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case INCIDENT_STATUSES.IN_PROGRESS:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case INCIDENT_STATUSES.RESOLVED:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Header Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-tight leading-tight">
                Rescue Operations Center
              </h1>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span>LIVE DISPATCH</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">Incident Prioritization & Mission Response</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-slate-200">{displayName}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md">
              RESCUER
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">
        
        {/* Global Feedback Banner */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between text-xs transition animate-in fade-in duration-200 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-semibold">{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-white text-xs ml-4 cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dashboard Operational Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active In Queue
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-white font-mono">
                {incidents.length}
              </span>
              <span className="text-xs text-slate-500">open SOS</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-900/40 rounded-2xl p-5 shadow-lg">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
              Available to Claim
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-rose-400 font-mono">
                {availableIncidents.length}
              </span>
              <span className="text-xs text-slate-500">unassigned</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-800/40 rounded-2xl p-5 shadow-lg">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              My Active Missions
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-400 font-mono">
                {myMissions.length}
              </span>
              <span className="text-xs text-slate-500">in progress</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
              Other Field Teams
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-blue-400 font-mono">
                {otherAssigned.length}
              </span>
              <span className="text-xs text-slate-500">assigned</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: MY ACTIVE MISSIONS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  My Assigned Missions ({myMissions.length})
                </h2>
                <p className="text-xs text-slate-400">Emergencies assigned to your unit currently undergoing response</p>
              </div>
            </div>
          </div>

          {myMissions.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-2">
              <Inbox className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No missions currently assigned to your team.</p>
              <p className="text-xs text-slate-500">
                Review available emergency SOS incidents below and click &quot;Accept Mission&quot; to begin response.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myMissions.map((mission) => {
                const isAssigned = mission.status === INCIDENT_STATUSES.ASSIGNED;
                const isInProgress = mission.status === INCIDENT_STATUSES.IN_PROGRESS;
                const isBusy = actionLoadingId === mission.id;

                return (
                  <div
                    key={mission.id}
                    className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-6 shadow-xl space-y-5 relative overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getSeverityBadge(mission.severity)}`}>
                            {mission.severity || 'HIGH'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getStatusBadge(mission.status)}`}>
                            {mission.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {mission.incidentType}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          ID: #{mission.incidentId || mission.id}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Priority Index</div>
                        <div className="font-mono text-lg font-black text-amber-400">
                          {mission.priorityScore !== undefined ? `${mission.priorityScore}/100` : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Incident Metrics */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Headcount</span>
                        <span className="font-bold text-white">{mission.peopleCount || 1} people</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-400 font-bold uppercase block">Injured</span>
                        <span className="font-bold text-rose-300">{mission.injuredCount || 0} injured</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Vulnerable</span>
                        <span className="font-bold text-amber-300">
                          {(mission.childrenCount || 0) + (mission.elderlyCount || 0)} (C/E)
                        </span>
                      </div>
                    </div>

                    {/* Coordinates & Description */}
                    <div className="space-y-2 text-xs">
                      {mission.location && (
                        <div className="flex items-center space-x-2 text-slate-300 font-mono bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            Lat: {Number(mission.location.latitude).toFixed(5)}°, Lon: {Number(mission.location.longitude).toFixed(5)}°
                          </span>
                        </div>
                      )}

                      {mission.description && (
                        <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 italic">
                          &quot;{mission.description}&quot;
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Reported by: <strong className="text-slate-300">{mission.citizenName || 'Citizen'}</strong></span>
                        <span>
                          {mission.createdAt?.toDate
                            ? mission.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Active'}
                        </span>
                      </div>
                    </div>

                    {/* Mission Workflow Action Buttons */}
                    <div className="pt-2 border-t border-slate-800 flex gap-2">
                      {isAssigned && (
                        <button
                          onClick={() => handleTransitionStatus(mission, INCIDENT_STATUSES.IN_PROGRESS)}
                          disabled={isBusy}
                          className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          {isBusy ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>START MISSION (EN ROUTE)</span>
                            </>
                          )}
                        </button>
                      )}

                      {isInProgress && (
                        <button
                          onClick={() => handleTransitionStatus(mission, INCIDENT_STATUSES.RESOLVED)}
                          disabled={isBusy}
                          className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          {isBusy ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span>MARK MISSION RESOLVED (SAFE)</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: AVAILABLE INCIDENTS (UNASSIGNED QUEUE) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Available Emergency Queue ({availableIncidents.length})
                </h2>
                <p className="text-xs text-slate-400">Unassigned high-priority SOS calls sorted by deterministic risk index</p>
              </div>
            </div>

            <span className="text-xs font-mono text-slate-400">
              {availableIncidents.length} pending assignment
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3 py-4">
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 animate-pulse">
                <div className="h-5 bg-slate-800 rounded w-1/3"></div>
                <div className="h-4 bg-slate-800/60 rounded w-2/3"></div>
              </div>
            </div>
          ) : availableIncidents.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">All emergency SOS incidents are assigned or resolved.</p>
              <p className="text-xs text-slate-500">Live listener is active. Incoming SOS calls will appear instantly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableIncidents.map((incident) => {
                const isBusy = actionLoadingId === incident.id;

                return (
                  <div
                    key={incident.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 shadow-xl space-y-5 transition relative overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getSeverityBadge(incident.severity)}`}>
                            {incident.severity || 'HIGH'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-red-500/15 text-red-400 border-red-500/30">
                            UNASSIGNED (REPORTED)
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {incident.incidentType}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          ID: #{incident.incidentId || incident.id}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Priority Index</div>
                        <div className="font-mono text-lg font-black text-rose-400">
                          {incident.priorityScore !== undefined ? `${incident.priorityScore}/100` : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Casualties & Headcount */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Headcount</span>
                        <span className="font-bold text-white">{incident.peopleCount || 1} Total</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-400 font-bold uppercase block">Injured</span>
                        <span className="font-bold text-rose-300 font-mono">
                          {incident.injuredCount > 0 ? `${incident.injuredCount} Injured` : '0 Injured'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Vulnerable</span>
                        <span className="font-bold text-amber-300">
                          {(incident.childrenCount || 0) + (incident.elderlyCount || 0)} (C/E)
                        </span>
                      </div>
                    </div>

                    {/* Coordinates & Description */}
                    <div className="space-y-2 text-xs">
                      {incident.location && (
                        <div className="flex items-center space-x-2 text-slate-300 font-mono bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>
                            Lat: {Number(incident.location.latitude).toFixed(5)}°, Lon: {Number(incident.location.longitude).toFixed(5)}°
                          </span>
                        </div>
                      )}

                      {incident.description && (
                        <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 italic">
                          &quot;{incident.description}&quot;
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Reported by: <strong className="text-slate-300">{incident.citizenName || 'Citizen'}</strong></span>
                        <span>
                          {incident.createdAt?.toDate
                            ? incident.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Just now'}
                        </span>
                      </div>
                    </div>

                    {/* Accept Mission Action */}
                    <div className="pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleAcceptMission(incident)}
                        disabled={isBusy}
                        className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        {isBusy ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Radio className="w-3.5 h-3.5" />
                            <span>ACCEPT MISSION DISPATCH</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 3: OTHER ASSIGNED MISSIONS (Team Awareness) */}
        {otherAssigned.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-slate-800/60">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-300">
                  Missions Underway By Other Rescue Teams ({otherAssigned.length})
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {otherAssigned.map((inc) => (
                <div key={inc.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{inc.incidentType}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(inc.status)}`}>
                      {inc.status}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Assigned Unit: <strong className="text-slate-200">{inc.assignedRescueTeamName || 'Other Team'}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Priority: {inc.priorityScore}/100 • {inc.peopleCount || 1} people
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
