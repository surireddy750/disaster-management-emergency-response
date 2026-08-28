import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  subscribeAllIncidents,
  subscribeRescueTeamUsers,
  adminAssignRescueMission,
  INCIDENT_STATUSES,
} from '../../services/incidentService.js';
import {
  UserCog,
  LogOut,
  User,
  Shield,
  AlertOctagon,
  AlertTriangle,
  Flame,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  Radio,
  RefreshCw,
  Activity,
  Send,
  LifeBuoy,
  FileText,
  UserCheck,
  CheckCircle,
  CircleDot,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboard() {
  const { userProfile, currentUser, logout } = useAuth();

  const [incidents, setIncidents] = useState([]);
  const [rescueTeams, setRescueTeams] = useState([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);

  // Assignment states: incidentId -> selected rescueTeamId
  const [selectedTeamPerIncident, setSelectedTeamPerIncident] = useState({});
  const [assigningId, setAssigningId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // 1. Subscribe to All Incidents in Real Time
  useEffect(() => {
    setIsLoadingIncidents(true);
    const unsubscribe = subscribeAllIncidents(
      (data) => {
        setIncidents(data);
        setIsLoadingIncidents(false);
      },
      (err) => {
        console.error('Error fetching all incidents for Admin:', err);
        setIsLoadingIncidents(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Rescue Team Users in Real Time
  useEffect(() => {
    setIsLoadingTeams(true);
    const unsubscribe = subscribeRescueTeamUsers(
      (teams) => {
        setRescueTeams(teams);
        setIsLoadingTeams(false);
      },
      (err) => {
        console.error('Error fetching rescue teams for Admin:', err);
        setIsLoadingTeams(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const displayName =
    userProfile?.name || currentUser?.displayName || currentUser?.email || 'System Administrator';

  // Summary Metrics
  const totalIncidents = incidents.length;
  const reportedCount = incidents.filter((i) => i.status === INCIDENT_STATUSES.REPORTED).length;
  const assignedCount = incidents.filter((i) => i.status === INCIDENT_STATUSES.ASSIGNED).length;
  const inProgressCount = incidents.filter((i) => i.status === INCIDENT_STATUSES.IN_PROGRESS).length;
  const resolvedCount = incidents.filter((i) => i.status === INCIDENT_STATUSES.RESOLVED).length;
  const criticalCount = incidents.filter((i) => i.severity === 'CRITICAL').length;

  // Handle Admin Assignment
  const handleAssignTeam = async (incidentId) => {
    const selectedTeamId = selectedTeamPerIncident[incidentId];
    if (!selectedTeamId) {
      setFeedbackMessage({
        type: 'error',
        text: 'Please select a rescue team from the dropdown before assigning.',
      });
      return;
    }

    const selectedTeam = rescueTeams.find((t) => t.uid === selectedTeamId);
    const teamName = selectedTeam?.name || selectedTeam?.email || 'Rescue Unit';

    setAssigningId(incidentId);
    setFeedbackMessage(null);

    try {
      await adminAssignRescueMission(incidentId, selectedTeamId, teamName);
      setFeedbackMessage({
        type: 'success',
        text: `Incident assigned to ${teamName} successfully!`,
      });
      // Clear selection for this incident
      setSelectedTeamPerIncident((prev) => ({
        ...prev,
        [incidentId]: '',
      }));
    } catch (err) {
      console.error('Error assigning rescue team:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to assign incident. It may already be assigned.',
      });
    } finally {
      setAssigningId(null);
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
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold">
            <UserCog className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-tight leading-tight">
                Emergency Command Center
              </h1>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                <span>ADMIN OVERVIEW</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">Incident Triage & Resource Dispatch Authority</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <User className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-semibold text-slate-200">{displayName}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-red-500/20 text-red-300 rounded-md">
              ADMIN
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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        
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

        {/* 1. REAL-TIME SUMMARY METRICS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              System Incident Statistics (Real-Time)
            </h2>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block mr-1"></span>
              Live Synced
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Incidents</span>
              <div className="text-2xl font-extrabold text-white font-mono mt-1">{totalIncidents}</div>
              <span className="text-[10px] text-slate-500">All registered</span>
            </div>

            {/* Reported */}
            <div className="bg-slate-900 border border-red-900/40 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] font-bold text-red-400 uppercase block">REPORTED</span>
              <div className="text-2xl font-extrabold text-red-400 font-mono mt-1">{reportedCount}</div>
              <span className="text-[10px] text-slate-500">Awaiting assign</span>
            </div>

            {/* Assigned */}
            <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] font-bold text-amber-400 uppercase block">ASSIGNED</span>
              <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">{assignedCount}</div>
              <span className="text-[10px] text-slate-500">Team notified</span>
            </div>

            {/* In Progress */}
            <div className="bg-slate-900 border border-blue-900/40 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] font-bold text-blue-400 uppercase block">IN PROGRESS</span>
              <div className="text-2xl font-extrabold text-blue-400 font-mono mt-1">{inProgressCount}</div>
              <span className="text-[10px] text-slate-500">En route / on site</span>
            </div>

            {/* Resolved */}
            <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] font-bold text-emerald-400 uppercase block">RESOLVED</span>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{resolvedCount}</div>
              <span className="text-[10px] text-slate-500">Completed</span>
            </div>

            {/* Critical */}
            <div className="bg-slate-900 border border-rose-900/40 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] font-bold text-rose-400 uppercase block">CRITICAL</span>
              <div className="text-2xl font-extrabold text-rose-400 font-mono mt-1">{criticalCount}</div>
              <span className="text-[10px] text-slate-500">High casualty risk</span>
            </div>
          </div>
        </section>

        {/* 2. INCIDENT MANAGEMENT (PRIORITY SORTED) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-red-500/20 text-red-400 rounded-xl">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Incident Management & Dispatch Queue
                </h2>
                <p className="text-xs text-slate-400">All emergency SOS reports sorted by deterministic priority score</p>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Total {incidents.length} Records
            </div>
          </div>

          {isLoadingIncidents ? (
            <div className="space-y-3 py-6">
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 animate-pulse">
                <div className="h-5 bg-slate-800 rounded w-1/3"></div>
                <div className="h-4 bg-slate-800/60 rounded w-2/3"></div>
              </div>
            </div>
          ) : incidents.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No emergency incidents currently in database.</p>
              <p className="text-xs text-slate-500">Citizen SOS alerts will appear here in real time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => {
                const isReported = incident.status === INCIDENT_STATUSES.REPORTED;
                const isAssigning = assigningId === incident.id;
                const selectedTeamId = selectedTeamPerIncident[incident.id] || '';

                return (
                  <div
                    key={incident.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 transition"
                  >
                    {/* Top Row: IDs, Badges, Priority */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getSeverityBadge(incident.severity)}`}>
                            {incident.severity || 'HIGH'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getStatusBadge(incident.status)}`}>
                            {incident.status}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            ID: #{incident.incidentId || incident.id}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {incident.incidentType}
                        </h3>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Priority Score</div>
                          <div className="font-mono text-xl font-black text-amber-400">
                            {incident.priorityScore !== undefined ? `${incident.priorityScore}/100` : '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Citizen Name</span>
                        <span className="font-bold text-white truncate block mt-0.5">
                          {incident.citizenName || 'Citizen User'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">People / Injured</span>
                        <span className="font-bold text-slate-200 block mt-0.5">
                          {incident.peopleCount || 1} Total {incident.injuredCount > 0 ? `(${incident.injuredCount} Injured)` : ''}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Assigned Rescue Unit</span>
                        <span className="font-bold text-amber-300 truncate block mt-0.5">
                          {incident.assignedRescueTeamName || 'Unassigned (None)'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Reported Time</span>
                        <span className="font-bold text-slate-300 block mt-0.5 truncate">
                          {incident.createdAt?.toDate
                            ? incident.createdAt.toDate().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                            : incident.createdAt
                            ? new Date(incident.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                            : 'Active'}
                        </span>
                      </div>
                    </div>

                    {/* Coordinates & Description */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-slate-950/90 border border-slate-800 rounded-xl text-xs">
                      {incident.location && (
                        <div className="flex items-center space-x-2 text-slate-300 font-mono">
                          <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span>
                            Lat: {Number(incident.location.latitude).toFixed(5)}°, Lon: {Number(incident.location.longitude).toFixed(5)}°
                          </span>
                        </div>
                      )}

                      {incident.description && (
                        <span className="text-[11px] text-slate-400 italic max-w-lg truncate">
                          &quot;{incident.description}&quot;
                        </span>
                      )}
                    </div>

                    {/* ADMIN ASSIGNMENT ACTION BAR (For REPORTED Incidents) */}
                    {isReported && (
                      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="flex-1">
                          <select
                            value={selectedTeamId}
                            onChange={(e) =>
                              setSelectedTeamPerIncident((prev) => ({
                                ...prev,
                                [incident.id]: e.target.value,
                              }))
                            }
                            className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none transition cursor-pointer"
                          >
                            <option value="">-- Select Rescue Team to Dispatch --</option>
                            {rescueTeams.map((team) => (
                              <option key={team.uid} value={team.uid}>
                                {team.name || team.email} ({team.email})
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => handleAssignTeam(incident.id)}
                          disabled={!selectedTeamId || isAssigning}
                          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
                        >
                          {isAssigning ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Assign Rescue Team</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. RESCUE TEAM MANAGEMENT */}
        <section className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Registered Rescue Teams ({rescueTeams.length})
                </h2>
                <p className="text-xs text-slate-400">Authorized rescue responder units available for dispatch</p>
              </div>
            </div>
          </div>

          {isLoadingTeams ? (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse h-20"></div>
          ) : rescueTeams.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
              No users with role <code className="text-amber-400">RESCUE_TEAM</code> registered yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rescueTeams.map((team) => (
                <div
                  key={team.uid}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
                        <LifeBuoy className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-white">{team.name || 'Unnamed Rescuer'}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold uppercase">
                      RESCUE UNIT
                    </span>
                  </div>

                  <div className="space-y-1 text-slate-400 pt-1">
                    <div className="truncate">
                      Email: <span className="text-slate-200 font-mono">{team.email}</span>
                    </div>
                    <div className="truncate text-[10px] text-slate-500 font-mono">
                      UID: {team.uid}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
