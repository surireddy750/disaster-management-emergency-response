import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLocation } from '../../hooks/useLocation.js';
import {
  INCIDENT_TYPES,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  calculateIncidentPriority,
  submitSOSIncident,
} from '../../services/sosService.js';
import {
  AlertOctagon,
  AlertTriangle,
  Flame,
  Waves,
  HeartPulse,
  Mountain,
  Building2,
  Users,
  MapPin,
  Compass,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Shield,
  Send,
  RefreshCw,
  Info,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Baby,
  Activity,
  FileText,
  Copy,
  Check,
} from 'lucide-react';

export default function CitizenSOS() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const {
    coordinates,
    loading: isLocationLoading,
    error: locationError,
    requestLocation,
    setManualCoordinates,
  } = useLocation();

  // Form State
  const [incidentType, setIncidentType] = useState('Flood');
  const [peopleCount, setPeopleCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [elderlyCount, setElderlyCount] = useState(0);
  const [injuredCount, setInjuredCount] = useState(0);
  const [description, setDescription] = useState('');

  // Manual Coordinates State (for fallback if GPS is denied/unavailable)
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showManualCoords, setShowManualCoords] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedIncident, setSubmittedIncident] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // Auto-adjust total people count if sub-categories exceed total
  useEffect(() => {
    const minTotal = Math.max(1, childrenCount + elderlyCount);
    if (peopleCount < minTotal) {
      setPeopleCount(minTotal);
    }
  }, [childrenCount, elderlyCount, peopleCount]);

  // Real-time calculated priority
  const calculatedPriority = calculateIncidentPriority({
    incidentType,
    peopleCount,
    childrenCount,
    elderlyCount,
    injuredCount,
  });

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case INCIDENT_SEVERITY.CRITICAL:
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-500 animate-ping',
          label: 'CRITICAL PRIORITY',
        };
      case INCIDENT_SEVERITY.HIGH:
        return {
          bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
          dot: 'bg-orange-400',
          label: 'HIGH PRIORITY',
        };
      case INCIDENT_SEVERITY.MODERATE:
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-400',
          label: 'MODERATE PRIORITY',
        };
      case INCIDENT_SEVERITY.LOW:
      default:
        return {
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
          dot: 'bg-blue-400',
          label: 'STANDARD PRIORITY',
        };
    }
  };

  const severityConfig = getSeverityBadge(calculatedPriority.severity);

  // Manual Coordinates Application
  const handleApplyManualCoords = (e) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      setErrorMessage('Please enter valid numeric latitude and longitude.');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setErrorMessage('Coordinates out of range (-90 to 90 lat, -180 to 180 lng).');
      return;
    }

    setManualCoordinates(lat, lng);
    setErrorMessage('');
    setShowManualCoords(false);
  };

  // SOS Form Submission
  const handleSubmitSOS = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentUser) {
      setErrorMessage('You must be logged in to transmit an emergency SOS.');
      return;
    }

    if (!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
      setErrorMessage('GPS Location is required for rescue teams to reach your position. Please enable GPS or enter coordinates manually.');
      return;
    }

    if (peopleCount < 1) {
      setErrorMessage('Number of people must be at least 1.');
      return;
    }

    setIsSubmitting(true);

    try {
      const citizenName = userProfile?.name || currentUser.displayName || currentUser.email || 'Citizen';

      const result = await submitSOSIncident({
        citizenId: currentUser.uid,
        citizenName,
        incidentType,
        location: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
        peopleCount,
        childrenCount,
        elderlyCount,
        injuredCount,
        description,
      });

      setSubmittedIncident(result);
    } catch (err) {
      console.error('Error submitting SOS incident:', err);
      setErrorMessage(err.message || 'Failed to submit SOS report to emergency servers. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyIncidentId = () => {
    if (!submittedIncident?.incidentId) return;
    navigator.clipboard.writeText(submittedIncident.incidentId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <Link
            to="/citizen/home"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
            title="Back to Citizen Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-tight">
                Emergency SOS Broadcast
              </h1>
              <p className="text-[11px] text-slate-400">Direct Dispatch Incident Reporting</p>
            </div>
          </div>
        </div>

        <Link
          to="/citizen/home"
          className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
        >
          Cancel / Return
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-8 space-y-6">
        
        {/* SUCCESS CONFIRMATION VIEW */}
        {submittedIncident ? (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-300">
            {/* Header Success Banner */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                  Emergency Broadcast Transmitted
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-3">
                  SOS Report Confirmed
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-1">
                  Your incident has been registered in the emergency dispatch queue. First responders have been alerted to your position.
                </p>
              </div>
            </div>

            {/* Incident Details Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Incident ID</span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="font-mono text-sm sm:text-base font-bold text-emerald-400 select-all">
                      {submittedIncident.incidentId}
                    </span>
                    <button
                      onClick={copyIncidentId}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                      title="Copy Incident ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status:</span>
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full text-xs font-bold uppercase">
                    <Clock className="w-3 h-3 animate-spin" />
                    <span>{INCIDENT_STATUS.REPORTED}</span>
                  </span>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-semibold block">Hazard Type</span>
                  <span className="font-bold text-white mt-0.5 block">{submittedIncident.data.incidentType}</span>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-semibold block">Calculated Severity</span>
                  <span className="font-bold text-orange-400 mt-0.5 block">{submittedIncident.data.severity}</span>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-semibold block">Priority Index</span>
                  <span className="font-bold text-white mt-0.5 block font-mono">{submittedIncident.data.priorityScore}/100</span>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-semibold block">Total People</span>
                  <span className="font-bold text-white mt-0.5 block">{submittedIncident.data.peopleCount} Person(s)</span>
                </div>
              </div>

              {/* Coordinates Transmitted */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 font-mono">
                    {submittedIncident.data.location.latitude.toFixed(5)}, {submittedIncident.data.location.longitude.toFixed(5)}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-400">Position Locked</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/citizen/home"
                className="flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center rounded-xl text-xs shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Citizen Portal</span>
              </Link>
              <button
                onClick={() => {
                  setSubmittedIncident(null);
                  setDescription('');
                  setInjuredCount(0);
                }}
                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs border border-slate-700 transition cursor-pointer"
              >
                Submit Another Report
              </button>
            </div>
          </div>
        ) : (
          /* SOS SUBMISSION FORM VIEW */
          <form onSubmit={handleSubmitSOS} className="space-y-6">
            
            {/* Urgent Notice Banner */}
            <div className="bg-rose-950/30 border border-rose-900/50 rounded-2xl p-5 flex items-start space-x-3.5">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl shrink-0 mt-0.5">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Emergency Life-Safety Dispatch
                </h3>
                <p className="text-xs text-rose-200/80 leading-relaxed">
                  Fill in current conditions accurately. Your location and priority metrics will be prioritized automatically for response teams.
                </p>
              </div>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-3 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Location Detection Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">1. Geospatial Coordinates</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={isLocationLoading}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLocationLoading ? 'animate-spin text-blue-400' : ''}`} />
                    <span>{isLocationLoading ? 'Locating...' : 'Refresh GPS'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualCoords(!showManualCoords)}
                    className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 transition cursor-pointer"
                  >
                    {showManualCoords ? 'Hide Manual' : 'Manual GPS'}
                  </button>
                </div>
              </div>

              {/* Coordinates Preview */}
              {coordinates ? (
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-xs font-semibold text-slate-300">GPS Locked</span>
                      {coordinates.accuracy && (
                        <span className="text-[10px] text-slate-500">(±{Math.round(coordinates.accuracy)}m)</span>
                      )}
                    </div>
                    <div className="font-mono text-sm font-bold text-white">
                      Lat: {coordinates.latitude.toFixed(5)}° , Lon: {coordinates.longitude.toFixed(5)}°
                    </div>
                  </div>

                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-lg self-start sm:self-auto">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Coordinates Ready</span>
                  </span>
                </div>
              ) : (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-amber-300">
                    <Compass className="w-4 h-4 shrink-0 animate-spin" />
                    <span>Acquiring device coordinates...</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualCoords(true)}
                    className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
                  >
                    Enter Manually
                  </button>
                </div>
              )}

              {/* Manual Coordinates Drawer */}
              {showManualCoords && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 mt-2">
                  <div className="text-xs font-semibold text-slate-300">Enter Manual Latitude & Longitude</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 37.7749"
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. -122.4194"
                        value={manualLng}
                        onChange={(e) => setManualLng(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleApplyManualCoords}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      Set Coordinates
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Emergency Type Selection */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">2. Emergency Type</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Select primary hazard</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {INCIDENT_TYPES.map((type) => {
                  const isSelected = incidentType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setIncidentType(type.id)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-2 cursor-pointer ${
                        isSelected
                          ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/10 ring-1 ring-rose-500'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <div className="text-xl">{type.icon}</div>
                      <div>
                        <div className="text-xs font-bold leading-tight">{type.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Base: +{type.baseScore} pts</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Casualties & Persons at Risk */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">3. Persons at Risk & Casualties</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Headcount metrics</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Total People */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>Total People at Risk</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-white">{peopleCount}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 bg-slate-900 border border-slate-700 text-white text-center font-bold rounded-lg py-1 text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setPeopleCount(peopleCount + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Injured People (Critical Weight) */}
                <div className="p-4 bg-slate-950/80 border border-rose-900/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-300 flex items-center space-x-1.5">
                      <Activity className="w-3.5 h-3.5 text-rose-400" />
                      <span>Injured Individuals</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-rose-400">{injuredCount}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setInjuredCount(Math.max(0, injuredCount - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={peopleCount}
                      value={injuredCount}
                      onChange={(e) => setInjuredCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="flex-1 bg-slate-900 border border-rose-900/60 text-rose-300 text-center font-bold rounded-lg py-1 text-sm outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => setInjuredCount(injuredCount + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Children */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <Baby className="w-3.5 h-3.5 text-amber-400" />
                      <span>Children (&lt;12 yrs)</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-white">{childrenCount}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="flex-1 bg-slate-900 border border-slate-700 text-white text-center font-bold rounded-lg py-1 text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setChildrenCount(childrenCount + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Elderly */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                      <span>Elderly (&gt;65 yrs)</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-white">{elderlyCount}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setElderlyCount(Math.max(0, elderlyCount - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={elderlyCount}
                      onChange={(e) => setElderlyCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="flex-1 bg-slate-900 border border-slate-700 text-white text-center font-bold rounded-lg py-1 text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setElderlyCount(elderlyCount + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Optional Description */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-bold text-white">4. Situational Details (Optional)</h3>
                </div>
                <span className="text-xs text-slate-500">Max 500 characters</span>
              </div>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Describe landmark, floor number, immediate hazards, or specific accessibility needs..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* 5. Live Deterministic Priority Calculation Preview */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Transparent Priority Index Calculation
                  </h4>
                  <p className="text-[11px] text-slate-500">Deterministic algorithm (0–100 scale)</p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${severityConfig.bg}`}>
                    <span className={`w-2 h-2 rounded-full ${severityConfig.dot}`}></span>
                    <span>{severityConfig.label}</span>
                  </span>
                  <span className="font-mono text-sm font-bold text-white px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg">
                    {calculatedPriority.priorityScore} / 100
                  </span>
                </div>
              </div>

              {/* Factors list */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {calculatedPriority.factors.map((factor, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 rounded">
                    {factor}
                  </span>
                ))}
              </div>
            </div>

            {/* TRANSMIT SOS BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !coordinates}
                className="w-full py-4 px-6 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-rose-900/30 hover:shadow-rose-600/20 transition transform active:scale-[0.99] flex items-center justify-center space-x-3 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>TRANSMITTING EMERGENCY SOS...</span>
                  </>
                ) : (
                  <>
                    <AlertOctagon className="w-5 h-5 animate-pulse" />
                    <span>BROADCAST EMERGENCY SOS INCIDENT</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>

              {!coordinates && (
                <p className="text-center text-xs text-amber-400 mt-2">
                  ⚠️ Waiting for coordinates. Please enable device GPS or enter coordinates above to enable SOS broadcast.
                </p>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
