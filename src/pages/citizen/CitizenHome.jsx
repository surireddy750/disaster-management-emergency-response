import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLocation, LOCATION_STATUS } from '../../hooks/useLocation.js';
import { useActiveIncident } from '../../hooks/useIncident.js';
import { STATUS_STEPS, INCIDENT_STATUSES } from '../../services/incidentService.js';
import { fetchRiskAssessment, RISK_LEVELS, RISK_TRENDS } from '../../services/riskService.js';
import { fetchSafetyAdvice } from '../../services/aiService.js';
import {
  subscribeNearbyAlerts,
  ALERT_SEVERITY,
} from '../../services/alertService.js';
import {
  subscribeNearestShelters,
  subscribeNearestHospitals,
} from '../../services/resourceService.js';
import { formatDistance } from '../../utils/distance.js';
import {
  MapPin,
  Compass,
  AlertTriangle,
  RefreshCw,
  LogOut,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  Thermometer,
  CloudSun,
  Droplets,
  Wind,
  CloudRain,
  CloudLightning,
  Sun,
  CloudSnow,
  Cloud,
  TrendingUp,
  MoveRight,
  Activity,
  Check,
  AlertOctagon,
  Bot,
  Sparkles,
  Shield,
  ListChecks,
  Bell,
  Radio,
  Navigation,
  Info,
  Home,
  Hospital,
  Phone,
  Users,
  CheckCircle,
  CircleDot,
  Loader2,
} from 'lucide-react';

const RISK_STATUS = {
  WAITING_FOR_LOCATION: 'WAITING_FOR_LOCATION',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  UNAVAILABLE: 'UNAVAILABLE',
};

const ADVICE_STATUS = {
  WAITING: 'WAITING',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
};

export default function CitizenHome() {
  const { userProfile, currentUser, logout } = useAuth();
  const {
    coordinates,
    status: locationStatus,
    errorMessage: locationErrorMessage,
    requestLocation,
    setManualCoordinates,
    isLoading: isLocationLoading,
  } = useLocation(true);

  // Active SOS Incident Real-Time Tracking
  const { activeIncident, isLoading: isIncidentLoading } = useActiveIncident();

  // Risk & Weather Assessment State
  const [riskData, setRiskData] = useState(null);
  const [riskStatus, setRiskStatus] = useState(RISK_STATUS.WAITING_FOR_LOCATION);
  const [riskError, setRiskError] = useState(null);

  // AI Safety Advice State
  const [adviceData, setAdviceData] = useState(null);
  const [adviceStatus, setAdviceStatus] = useState(ADVICE_STATUS.WAITING);
  const [isAdviceRefreshing, setIsAdviceRefreshing] = useState(false);
  const lastFetchedAdviceKeyRef = useRef(null);

  // Location-Based Alerts State
  const [nearbyAlerts, setNearbyAlerts] = useState([]);
  const [isAlertsLoading, setIsAlertsLoading] = useState(true);

  // Nearby Shelters & Hospitals State
  const [nearestShelters, setNearestShelters] = useState([]);
  const [isSheltersLoading, setIsSheltersLoading] = useState(true);
  const [nearestHospitals, setNearestHospitals] = useState([]);
  const [isHospitalsLoading, setIsHospitalsLoading] = useState(true);

  // Manual Coordinates State
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualFormError, setManualFormError] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  // Subscribe to Location-Based Alerts when coordinates update
  useEffect(() => {
    if (!coordinates?.latitude || !coordinates?.longitude) {
      setNearbyAlerts([]);
      setIsAlertsLoading(false);
      return;
    }

    setIsAlertsLoading(true);
    const unsubscribe = subscribeNearbyAlerts(
      coordinates.latitude,
      coordinates.longitude,
      (alerts) => {
        setNearbyAlerts(alerts);
        setIsAlertsLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [coordinates?.latitude, coordinates?.longitude]);

  // Subscribe to Nearest Shelters & Hospitals when coordinates update
  useEffect(() => {
    if (!coordinates?.latitude || !coordinates?.longitude) {
      setNearestShelters([]);
      setIsSheltersLoading(false);
      setNearestHospitals([]);
      setIsHospitalsLoading(false);
      return;
    }

    setIsSheltersLoading(true);
    setIsHospitalsLoading(true);

    const unsubShelters = subscribeNearestShelters(
      coordinates.latitude,
      coordinates.longitude,
      (shelters) => {
        setNearestShelters(shelters);
        setIsSheltersLoading(false);
      }
    );

    const unsubHospitals = subscribeNearestHospitals(
      coordinates.latitude,
      coordinates.longitude,
      (hospitals) => {
        setNearestHospitals(hospitals);
        setIsHospitalsLoading(false);
      }
    );

    return () => {
      if (typeof unsubShelters === 'function') unsubShelters();
      if (typeof unsubHospitals === 'function') unsubHospitals();
    };
  }, [coordinates?.latitude, coordinates?.longitude]);

  // Load Risk Assessment whenever coordinates update
  useEffect(() => {
    let isMounted = true;

    if (!coordinates) {
      setRiskData(null);
      setRiskStatus(RISK_STATUS.WAITING_FOR_LOCATION);
      setRiskError(null);
      setAdviceData(null);
      setAdviceStatus(ADVICE_STATUS.WAITING);
      return;
    }

    const loadAssessment = async () => {
      setRiskStatus(RISK_STATUS.LOADING);
      setRiskError(null);

      try {
        const data = await fetchRiskAssessment(coordinates.latitude, coordinates.longitude);
        if (isMounted) {
          setRiskData(data);
          setRiskStatus(RISK_STATUS.SUCCESS);
          setRiskError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Risk assessment error:', err);
          setRiskData(null);
          setRiskStatus(RISK_STATUS.UNAVAILABLE);
          setRiskError(err.message || 'Unable to retrieve disaster risk assessment.');
        }
      }
    };

    loadAssessment();

    return () => {
      isMounted = false;
    };
  }, [coordinates?.latitude, coordinates?.longitude]);

  // Load AI Safety Advice once weather & risk data are successfully loaded
  // Uses session caching and ref guards to strictly prevent repeated Gemini API calls on UI re-renders
  useEffect(() => {
    let isMounted = true;

    if (riskStatus !== RISK_STATUS.SUCCESS || !riskData?.weather || !riskData?.risk) {
      return;
    }

    const lat = typeof riskData.weather.location?.latitude === 'number'
      ? riskData.weather.location.latitude.toFixed(2)
      : (coordinates?.latitude ? coordinates.latitude.toFixed(2) : '0');
    const lon = typeof riskData.weather.location?.longitude === 'number'
      ? riskData.weather.location.longitude.toFixed(2)
      : (coordinates?.longitude ? coordinates.longitude.toFixed(2) : '0');
    const condition = (riskData.weather.condition || 'normal').toLowerCase();
    const riskLevel = riskData.risk.riskLevel || 'LOW';
    const riskScore = riskData.risk.riskScore ?? 0;
    const currentKey = `${lat}_${lon}_${condition}_${riskLevel}_${riskScore}`;

    // Skip if already fetched for this exact state
    if (lastFetchedAdviceKeyRef.current === currentKey && adviceData) {
      return;
    }

    const loadAdvice = async () => {
      setAdviceStatus(ADVICE_STATUS.LOADING);

      try {
        const advice = await fetchSafetyAdvice({
          location: riskData.weather.location,
          weather: riskData.weather,
          risk: riskData.risk,
          forceRefresh: false,
        });

        if (isMounted) {
          setAdviceData(advice);
          setAdviceStatus(ADVICE_STATUS.SUCCESS);
          lastFetchedAdviceKeyRef.current = currentKey;
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching AI advice:', err);
          // Friendly fallback without technical errors
          setAdviceData({
            summary: 'Current conditions indicate standard caution is advised. Stay aware of changing local conditions.',
            recommendations: [
              'Check local weather updates periodically.',
              'Keep mobile phones charged and emergency contacts accessible.',
              'Follow instructions from local emergency personnel.',
            ],
            source: 'fallback',
          });
          setAdviceStatus(ADVICE_STATUS.SUCCESS);
          lastFetchedAdviceKeyRef.current = currentKey;
        }
      }
    };

    loadAdvice();

    return () => {
      isMounted = false;
    };
  }, [riskStatus, riskData, coordinates?.latitude, coordinates?.longitude]);

  const handleRefreshAdvice = async () => {
    if (!riskData?.weather || !riskData?.risk || isAdviceRefreshing) return;
    setIsAdviceRefreshing(true);
    try {
      const advice = await fetchSafetyAdvice({
        location: riskData.weather.location,
        weather: riskData.weather,
        risk: riskData.risk,
        forceRefresh: true,
      });
      setAdviceData(advice);
      setAdviceStatus(ADVICE_STATUS.SUCCESS);
    } catch (err) {
      console.error('Manual refresh AI advice error:', err);
    } finally {
      setIsAdviceRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setManualFormError('');
    if (!manualLat || !manualLng) {
      setManualFormError('Both Latitude and Longitude are required.');
      return;
    }

    const success = setManualCoordinates(manualLat, manualLng);
    if (!success) {
      setManualFormError('Invalid coordinates format. Check ranges (-90 to 90 lat, -180 to 180 lon).');
    } else {
      setShowManualForm(false);
    }
  };

  const handlePresetSelect = (lat, lng) => {
    setManualLat(lat.toString());
    setManualLng(lng.toString());
    setManualCoordinates(lat, lng);
    setShowManualForm(false);
  };

  const getWeatherIcon = (condition) => {
    const cond = (condition || '').toLowerCase();
    if (cond.includes('rain') || cond.includes('drizzle')) return <CloudRain className="w-8 h-8 text-blue-400" />;
    if (cond.includes('thunder') || cond.includes('storm')) return <CloudLightning className="w-8 h-8 text-amber-400" />;
    if (cond.includes('snow')) return <CloudSnow className="w-8 h-8 text-indigo-300" />;
    if (cond.includes('clear')) return <Sun className="w-8 h-8 text-amber-400" />;
    if (cond.includes('cloud')) return <Cloud className="w-8 h-8 text-slate-300" />;
    return <CloudSun className="w-8 h-8 text-blue-400" />;
  };

  // Visual helper for Risk Levels
  const getRiskLevelConfig = (level) => {
    switch (level) {
      case RISK_LEVELS.CRITICAL:
        return {
          label: 'CRITICAL RISK',
          badgeClass: 'bg-rose-500/10 border-rose-500/40 text-rose-400',
          dotClass: 'bg-rose-500',
          textClass: 'text-rose-400',
          icon: <AlertOctagon className="w-5 h-5 text-rose-400" />,
          progressClass: 'bg-rose-500',
          containerBg: 'bg-rose-950/20 border-rose-800/40',
        };
      case RISK_LEVELS.HIGH:
        return {
          label: 'HIGH RISK',
          badgeClass: 'bg-orange-500/10 border-orange-500/40 text-orange-400',
          dotClass: 'bg-orange-500',
          textClass: 'text-orange-400',
          icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
          progressClass: 'bg-orange-500',
          containerBg: 'bg-orange-950/20 border-orange-800/40',
        };
      case RISK_LEVELS.MODERATE:
        return {
          label: 'MODERATE RISK',
          badgeClass: 'bg-amber-500/10 border-amber-500/40 text-amber-300',
          dotClass: 'bg-amber-400',
          textClass: 'text-amber-300',
          icon: <Activity className="w-5 h-5 text-amber-400" />,
          progressClass: 'bg-amber-500',
          containerBg: 'bg-amber-950/20 border-amber-800/40',
        };
      case RISK_LEVELS.LOW:
      default:
        return {
          label: 'LOW RISK',
          badgeClass: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
          dotClass: 'bg-emerald-400',
          textClass: 'text-emerald-400',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
          progressClass: 'bg-emerald-500',
          containerBg: 'bg-emerald-950/10 border-emerald-800/30',
        };
    }
  };

  // Visual helper for Alert Severity
  const getAlertSeverityConfig = (severity) => {
    const sev = (severity || 'LOW').toUpperCase();
    switch (sev) {
      case ALERT_SEVERITY.CRITICAL:
        return {
          label: 'CRITICAL HAZARD',
          badgeClass: 'bg-rose-500/10 border-rose-500/40 text-rose-400',
          dotClass: 'bg-rose-500 animate-ping',
          textClass: 'text-rose-400',
          cardBorder: 'border-rose-900/60 bg-gradient-to-r from-rose-950/30 via-slate-950 to-slate-950',
          icon: <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />,
        };
      case ALERT_SEVERITY.HIGH:
        return {
          label: 'HIGH WARNING',
          badgeClass: 'bg-orange-500/10 border-orange-500/40 text-orange-400',
          dotClass: 'bg-orange-400',
          textClass: 'text-orange-400',
          cardBorder: 'border-orange-900/50 bg-gradient-to-r from-orange-950/20 via-slate-950 to-slate-950',
          icon: <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />,
        };
      case ALERT_SEVERITY.MODERATE:
        return {
          label: 'MODERATE ADVISORY',
          badgeClass: 'bg-amber-500/10 border-amber-500/40 text-amber-300',
          dotClass: 'bg-amber-400',
          textClass: 'text-amber-300',
          cardBorder: 'border-amber-900/40 bg-gradient-to-r from-amber-950/20 via-slate-950 to-slate-950',
          icon: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />,
        };
      case ALERT_SEVERITY.LOW:
      default:
        return {
          label: 'INFORMATIONAL WATCH',
          badgeClass: 'bg-blue-500/10 border-blue-500/40 text-blue-400',
          dotClass: 'bg-blue-400',
          textClass: 'text-blue-400',
          cardBorder: 'border-blue-900/40 bg-gradient-to-r from-blue-950/20 via-slate-950 to-slate-950',
          icon: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
        };
    }
  };

  const displayName = userProfile?.name || currentUser?.displayName || currentUser?.email || 'Citizen';
  const weather = riskData?.weather;
  const risk = riskData?.risk;
  const riskConfig = risk ? getRiskLevelConfig(risk.riskLevel) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">
              Disaster Guard
            </h1>
            <p className="text-xs text-slate-400">Citizen Safety Portal</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <User className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-slate-200">{displayName}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
              CITIZEN
            </span>
          </div>

          <button
            onClick={handleLogout}
            id="sign-out-button"
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        
        {/* Welcome Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold mb-2">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                <span>Phase 3 — Step 1 Citizen SOS System Active</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Welcome, {displayName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time hazard alerts, nearest emergency shelters & direct SOS incident reporting.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                to="/citizen/sos"
                id="header-sos-link"
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-rose-900/30 transition transform active:scale-95 cursor-pointer shrink-0"
              >
                <AlertOctagon className="w-4 h-4 animate-pulse" />
                <span>SOS EMERGENCY</span>
              </Link>

              <button
                onClick={requestLocation}
                disabled={isLocationLoading || riskStatus === RISK_STATUS.LOADING}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 shadow transition cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLocationLoading || riskStatus === RISK_STATUS.LOADING ? 'animate-spin' : ''}`} />
                <span>{isLocationLoading ? 'Locating...' : 'Refresh All'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 🚨 PROMINENT EMERGENCY SOS HERO BANNER */}
        <div className="bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-900 border border-rose-900/60 rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-rose-600/40 shrink-0 mt-0.5">
                <AlertOctagon className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-[10px] uppercase font-bold tracking-wider">
                    Emergency Broadcast
                  </span>
                  <span className="text-xs text-rose-400 font-medium">Immediate Assistance</span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Need Immediate Rescue or Medical Evacuation?
                </h3>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Transmit your real-time coordinates, hazard type, casualties, and trapped persons headcount directly to first responder dispatch.
                </p>
              </div>
            </div>

            <Link
              to="/citizen/sos"
              id="citizen-hero-sos-button"
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-rose-900/40 hover:shadow-rose-600/30 transition transform active:scale-95 flex items-center justify-center space-x-3 cursor-pointer shrink-0"
            >
              <AlertOctagon className="w-5 h-5 animate-spin" />
              <span className="tracking-wide">TRANSMIT SOS INCIDENT</span>
            </Link>
          </div>
        </div>

        {/* 🚨 REAL-TIME ACTIVE EMERGENCY TRACKING CARD (Shown only if citizen has an active incident) */}
        {activeIncident && (
          <div className="bg-slate-900 border-2 border-rose-500/60 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
            {/* Top Glow & Active Tag */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-xl relative">
                  <AlertOctagon className="w-6 h-6 animate-pulse" />
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-extrabold uppercase tracking-wider rounded-md">
                      ACTIVE EMERGENCY SOS
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      #{activeIncident.incidentId || activeIncident.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
                    {activeIncident.incidentType || 'Emergency'} Incident Under Response
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Live Status:</span>
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full text-xs font-extrabold uppercase">
                  <CircleDot className="w-3.5 h-3.5 animate-spin" />
                  <span>{activeIncident.status || INCIDENT_STATUSES.REPORTED}</span>
                </span>
              </div>
            </div>

            {/* 4-Step Status Progress Tracker */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Dispatch & Rescue Lifecycle</span>
                <span className="text-[11px] text-emerald-400 font-medium">Auto-syncs in real time via Firestore</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {STATUS_STEPS.map((step, idx) => {
                  const currentStatus = activeIncident.status || INCIDENT_STATUSES.REPORTED;
                  const stepIndex = STATUS_STEPS.findIndex((s) => s.id === step.id);
                  const activeIndex = STATUS_STEPS.findIndex((s) => s.id === currentStatus);

                  const isCompleted = activeIndex > stepIndex || currentStatus === INCIDENT_STATUSES.RESOLVED;
                  const isCurrent = currentStatus === step.id;

                  return (
                    <div
                      key={step.id}
                      className={`p-3 rounded-xl border transition flex flex-col justify-between space-y-2 ${
                        isCurrent
                          ? 'bg-rose-500/10 border-rose-500/60 ring-1 ring-rose-500/40 text-white'
                          : isCompleted
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                          Step 0{idx + 1}
                        </span>
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <CircleDot className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-700"></div>
                        )}
                      </div>

                      <div>
                        <div className={`text-xs font-bold ${isCurrent ? 'text-white' : isCompleted ? 'text-emerald-200' : 'text-slate-400'}`}>
                          {step.label}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Metrics & Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Severity</span>
                <span className="font-extrabold text-orange-400 mt-1 block">
                  {activeIncident.severity || 'HIGH'}
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Priority Score</span>
                <span className="font-mono font-extrabold text-white mt-1 block">
                  {activeIncident.priorityScore !== undefined ? `${activeIncident.priorityScore}/100` : '85/100'}
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">People / Injured</span>
                <span className="font-bold text-slate-200 mt-1 block">
                  {activeIncident.peopleCount || 1} Total {activeIncident.injuredCount > 0 ? `(${activeIncident.injuredCount} injured)` : ''}
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Created Time</span>
                <span className="font-bold text-slate-300 mt-1 block truncate">
                  {activeIncident.createdAt?.toDate
                    ? activeIncident.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : activeIncident.createdAt
                    ? new Date(activeIncident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now'}
                </span>
              </div>
            </div>

            {/* Coordinates / Notes bar */}
            {activeIncident.location && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-slate-950/90 border border-slate-800 rounded-xl text-xs">
                <div className="flex items-center space-x-2 text-slate-300 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>
                    Lat: {Number(activeIncident.location.latitude).toFixed(4)}°, Lon: {Number(activeIncident.location.longitude).toFixed(4)}°
                  </span>
                </div>
                {activeIncident.description && (
                  <span className="text-[11px] text-slate-400 italic max-w-md truncate">
                    &quot;{activeIncident.description}&quot;
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 1. CURRENT SAFETY STATUS (Risk Engine Highlight) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">CURRENT SAFETY STATUS</h3>
                <p className="text-xs text-slate-400">Rule-Based Disaster Risk Engine (0–100 Scale)</p>
              </div>
            </div>

            {/* Risk Status Pill */}
            <div>
              {riskStatus === RISK_STATUS.WAITING_FOR_LOCATION && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-semibold border border-slate-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Waiting for location</span>
                </span>
              )}

              {riskStatus === RISK_STATUS.LOADING && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-full text-xs font-semibold animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculating risk...</span>
                </span>
              )}

              {riskStatus === RISK_STATUS.SUCCESS && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Risk loaded</span>
                </span>
              )}

              {riskStatus === RISK_STATUS.UNAVAILABLE && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-xs font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Risk unavailable</span>
                </span>
              )}
            </div>
          </div>

          {/* State: Waiting for location */}
          {riskStatus === RISK_STATUS.WAITING_FOR_LOCATION && (
            <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <Compass className="w-6 h-6 text-slate-500" />
              <span>Acquire or input coordinates below to calculate disaster risk.</span>
            </div>
          )}

          {/* State: Calculating risk */}
          {riskStatus === RISK_STATUS.LOADING && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Calculating Disaster Risk...</p>
                <p className="text-xs text-slate-400">
                  Evaluating atmospheric condition, precipitation volume and wind speed vectors.
                </p>
              </div>
            </div>
          )}

          {/* State: Risk unavailable */}
          {riskStatus === RISK_STATUS.UNAVAILABLE && (
            <div className="p-4 bg-rose-950/20 border border-rose-900/50 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-rose-300 text-sm font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Risk Assessment Unavailable</span>
              </div>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                {riskError || 'Could not evaluate risk metrics for the specified coordinates.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (coordinates) {
                      setRiskStatus(RISK_STATUS.LOADING);
                      fetchRiskAssessment(coordinates.latitude, coordinates.longitude)
                        .then((data) => {
                          setRiskData(data);
                          setRiskStatus(RISK_STATUS.SUCCESS);
                        })
                        .catch((err) => {
                          setRiskStatus(RISK_STATUS.UNAVAILABLE);
                          setRiskError(err.message);
                        });
                    }
                  }}
                  className="px-3.5 py-1.5 bg-rose-900/40 hover:bg-rose-900/70 border border-rose-800 text-rose-200 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Retry Risk Evaluation
                </button>
              </div>
            </div>
          )}

          {/* State: Risk Loaded Successfully */}
          {riskStatus === RISK_STATUS.SUCCESS && risk && (
            <div className="space-y-6">
              {/* Top Banner: Risk Level, Score, Trend */}
              <div className={`p-6 border rounded-2xl ${riskConfig.containerBg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6`}>
                
                {/* Level + Status */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-bold tracking-wide uppercase ${riskConfig.badgeClass}`}>
                      <span className={`w-2 h-2 rounded-full ${riskConfig.dotClass} animate-pulse`}></span>
                      <span>{riskConfig.label}</span>
                    </span>

                    {/* Trend Pill */}
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-900/80 border border-slate-700/80 rounded-full text-xs font-semibold text-slate-300">
                      {risk.trend === RISK_TRENDS.INCREASING ? (
                        <>
                          <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-rose-300">↑ INCREASING</span>
                        </>
                      ) : (
                        <>
                          <MoveRight className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">→ STABLE</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 max-w-md">
                    Deterministic risk evaluation based on live OpenWeather atmospheric telemetry for {weather?.location?.name || 'your area'}.
                  </p>
                </div>

                {/* Big Score Display */}
                <div className="text-left sm:text-right shrink-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                    Risk Score
                  </div>
                  <div className="flex items-baseline sm:justify-end space-x-1.5">
                    <span className={`text-4xl font-extrabold tracking-tight ${riskConfig.textClass}`}>
                      {risk.riskScore}
                    </span>
                    <span className="text-lg font-semibold text-slate-500">/100</span>
                  </div>
                </div>
              </div>

              {/* Visual Score Meter / Scale */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Safety Spectrum</span>
                  <span className="font-semibold text-slate-200">{risk.riskScore}% severity</span>
                </div>

                {/* Multi-segmented Progress Bar */}
                <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800 relative">
                  <div className="w-1/4 h-full bg-emerald-500/30 border-r border-slate-950" title="Low (0-25)"></div>
                  <div className="w-1/4 h-full bg-amber-500/30 border-r border-slate-950" title="Moderate (26-50)"></div>
                  <div className="w-1/4 h-full bg-orange-500/30 border-r border-slate-950" title="High (51-75)"></div>
                  <div className="w-1/4 h-full bg-rose-500/30" title="Critical (76-100)"></div>

                  {/* Active Indicator Bar */}
                  <div
                    className={`absolute top-0 bottom-0 left-0 ${riskConfig.progressClass} transition-all duration-500 rounded-full`}
                    style={{ width: `${Math.max(4, risk.riskScore)}%` }}
                  ></div>
                </div>

                {/* Scale Labels */}
                <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                  <span className="text-emerald-400">0 (LOW)</span>
                  <span className="text-amber-400">25</span>
                  <span className="text-orange-400">50</span>
                  <span className="text-rose-400">75</span>
                  <span className="text-rose-500">100 (CRITICAL)</span>
                </div>
              </div>

              {/* Contributing Factors Section */}
              <div className="space-y-3">
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Contributing Factors ({risk.factors?.length || 0})
                </div>

                {risk.factors && risk.factors.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {risk.factors.map((factor, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center space-x-3 text-xs text-slate-200"
                      >
                        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></div>
                        <span className="font-medium">{factor}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center space-x-3 text-xs text-emerald-400">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>No hazardous environmental factors detected under current atmospheric conditions.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. 🤖 AI SAFETY ADVICE Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white tracking-tight">🤖 AI SAFETY ADVICE</h3>
                  {adviceData?.source === 'gemini' && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-indigo-500/15 border border-indigo-500/30 text-[10px] uppercase font-bold text-indigo-300 rounded-full">
                      <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                      <span>🤖 Powered by Gemini AI</span>
                    </span>
                  )}
                  {adviceData?.source === 'fallback' && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-800 border border-slate-700 text-[10px] uppercase font-bold text-slate-300 rounded-full">
                      <Shield className="w-2.5 h-2.5 text-blue-400" />
                      <span>Standard Safety Protocol</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">Practical, localized guidance derived from real-time environmental metrics</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {adviceStatus === ADVICE_STATUS.WAITING && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-semibold border border-slate-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Waiting for telemetry</span>
                </span>
              )}

              {adviceStatus === ADVICE_STATUS.LOADING && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-semibold animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading AI safety advice...</span>
                </span>
              )}

              {adviceStatus === ADVICE_STATUS.SUCCESS && adviceData && (
                <button
                  onClick={handleRefreshAdvice}
                  disabled={isAdviceRefreshing}
                  title="Re-evaluate safety advice"
                  className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isAdviceRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
                  <span className="hidden sm:inline">{isAdviceRefreshing ? 'Updating...' : 'Re-evaluate'}</span>
                </button>
              )}
            </div>
          </div>

          {/* State: Waiting for Telemetry */}
          {adviceStatus === ADVICE_STATUS.WAITING && (
            <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <Bot className="w-6 h-6 text-slate-500" />
              <span>AI safety recommendations will be generated once weather and risk data are loaded.</span>
            </div>
          )}

          {/* State: Loading Advice */}
          {adviceStatus === ADVICE_STATUS.LOADING && (
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-3 text-indigo-300 text-xs font-medium animate-pulse">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                <span>Synthesizing practical safety recommendations for your coordinates...</span>
              </div>
              {/* Skeleton placeholders */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                <div className="h-3 bg-slate-800/60 rounded w-1/2"></div>
              </div>
              <div className="space-y-2">
                <div className="h-10 bg-slate-950/60 border border-slate-800/80 rounded-xl animate-pulse"></div>
                <div className="h-10 bg-slate-950/60 border border-slate-800/80 rounded-xl animate-pulse"></div>
                <div className="h-10 bg-slate-950/60 border border-slate-800/80 rounded-xl animate-pulse"></div>
              </div>
            </div>
          )}

          {/* State: Advice Success */}
          {adviceStatus === ADVICE_STATUS.SUCCESS && adviceData && (
            <div className="space-y-5">
              {/* Short Safety Summary Banner */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950/30 via-slate-950 to-slate-950 border border-indigo-900/40 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase font-bold text-indigo-400 tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Safety Summary</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Source: {adviceData.source === 'gemini' ? 'Gemini AI Synthesis' : 'Emergency Safety Standard'}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-100 leading-relaxed">
                  {adviceData.summary}
                </p>
              </div>

              {/* Actionable Practical Recommendations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-400 tracking-wider">
                  <span className="flex items-center space-x-1.5">
                    <ListChecks className="w-4 h-4 text-indigo-400" />
                    <span>Practical Recommendations ({adviceData.recommendations?.length || 0})</span>
                  </span>
                  <span className="text-[10px] text-slate-500 lowercase">
                    {adviceData.recommendations?.length || 0} practical steps
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {adviceData.recommendations && adviceData.recommendations.length > 0 ? (
                    adviceData.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800/90 hover:border-slate-700/80 rounded-xl flex items-start space-x-3 transition group"
                      >
                        <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                          {idx + 1}
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-normal flex-1">
                          {rec}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400">
                      Standard safety awareness is recommended.
                    </div>
                  )}
                </div>
              </div>

              {/* Informative Disclaimer */}
              <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl flex items-center space-x-2 text-[11px] text-slate-400">
                <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>
                  Safety recommendations are synthesized strictly from current atmospheric sensor readings. In high risk situations, follow official instructions from local emergency authorities.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 3. 🚨 LOCATION-BASED ALERTS Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white tracking-tight">🚨 ACTIVE LOCATION-BASED ALERTS</h3>
                  {nearbyAlerts.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] uppercase font-bold rounded-full animate-pulse">
                      {nearbyAlerts.length} within perimeter
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">Real-time geofenced disaster & safety advisories within impact radius</p>
              </div>
            </div>

            <div>
              {!coordinates && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-semibold border border-slate-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Waiting for location</span>
                </span>
              )}

              {coordinates && isAlertsLoading && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-full text-xs font-semibold animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning alerts...</span>
                </span>
              )}

              {coordinates && !isAlertsLoading && nearbyAlerts.length > 0 && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span>{nearbyAlerts.length} Active Hazard{nearbyAlerts.length > 1 ? 's' : ''}</span>
                </span>
              )}

              {coordinates && !isAlertsLoading && nearbyAlerts.length === 0 && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Perimeter Clear</span>
                </span>
              )}
            </div>
          </div>

          {/* State: No Coordinates */}
          {!coordinates && (
            <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <MapPin className="w-6 h-6 text-slate-500" />
              <span>Enable GPS or enter coordinates to calculate your distance to active hazard zones.</span>
            </div>
          )}

          {/* State: Loading Alerts */}
          {coordinates && isAlertsLoading && (
            <div className="space-y-3 py-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                <div className="h-3 bg-slate-800/60 rounded w-4/5"></div>
              </div>
            </div>
          )}

          {/* State: Alerts Detected within radius */}
          {coordinates && !isAlertsLoading && nearbyAlerts.length > 0 && (
            <div className="space-y-3.5">
              {nearbyAlerts.map((alert) => {
                const config = getAlertSeverityConfig(alert.severity);
                return (
                  <div
                    key={alert.id || alert.title}
                    className={`p-4 sm:p-5 rounded-xl border ${config.cardBorder} space-y-3 shadow-lg transition`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/60 pb-3">
                      <div className="flex items-center space-x-2.5">
                        {config.icon}
                        <h4 className="text-sm font-bold text-white tracking-tight">
                          {alert.title}
                        </h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`}></span>
                          <span>{config.label}</span>
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-normal">
                      {alert.message}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1 font-medium text-slate-300">
                          <Navigation className="w-3 h-3 text-blue-400" />
                          <span>Distance: <strong className="text-white">{formatDistance(alert.distanceKm)}</strong> away</span>
                        </span>
                        <span className="text-slate-500">•</span>
                        <span>Alert Impact Radius: <strong className="text-slate-300">{alert.radiusKm} km</strong></span>
                      </div>

                      <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-amber-300 font-semibold">
                        <span>⚠️ In Impact Zone</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* State: No Active Alerts within Radius */}
          {coordinates && !isAlertsLoading && nearbyAlerts.length === 0 && (
            <div className="p-6 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  No active alerts near your location.
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You are currently outside the impact radius of all active hazard advisories. Atmospheric sensors and safety monitors will notify you immediately if conditions change.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 4. 🏠 NEARBY SHELTERS & 🏥 NEARBY HOSPITALS Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 🏠 NEARBY SHELTERS Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">🏠 NEARBY SHELTERS</h3>
                  <p className="text-xs text-slate-400">Emergency evacuation centers & relief shelters</p>
                </div>
              </div>

              <div>
                {!coordinates && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-semibold border border-slate-700">
                    <Clock className="w-3 h-3" />
                    <span>Awaiting location</span>
                  </span>
                )}
                {coordinates && isSheltersLoading && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Finding shelters...</span>
                  </span>
                )}
                {coordinates && !isSheltersLoading && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold">
                    <span>Nearest 3</span>
                  </span>
                )}
              </div>
            </div>

            {/* Content States */}
            {!coordinates && (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                <MapPin className="w-6 h-6 text-slate-500" />
                <span>Enable location to find the nearest emergency shelters.</span>
              </div>
            )}

            {coordinates && isSheltersLoading && (
              <div className="space-y-3 py-2">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 animate-pulse">
                  <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-800/60 rounded w-3/4"></div>
                </div>
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 animate-pulse">
                  <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-800/60 rounded w-3/4"></div>
                </div>
              </div>
            )}

            {coordinates && !isSheltersLoading && nearestShelters.length === 0 && (
              <div className="p-6 bg-slate-950/60 border border-slate-800/80 rounded-xl text-center space-y-1">
                <p className="text-xs font-medium text-slate-300">No emergency shelters found.</p>
                <p className="text-[11px] text-slate-500">Contact local disaster administration for shelter assistance.</p>
              </div>
            )}

            {coordinates && !isSheltersLoading && nearestShelters.length > 0 && (
              <div className="space-y-3">
                {nearestShelters.map((shelter, idx) => (
                  <div
                    key={shelter.id || idx}
                    className="p-4 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-xl space-y-2 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white leading-tight">
                            {shelter.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                            {shelter.address}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold rounded-lg font-mono">
                          <Navigation className="w-2.5 h-2.5 text-emerald-400" />
                          <span>{formatDistance(shelter.distanceKm)}</span>
                        </span>
                      </div>
                    </div>

                    {(shelter.phone || shelter.capacity) && (
                      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-900 text-[11px] text-slate-400">
                        {shelter.phone && (
                          <span className="flex items-center space-x-1 text-slate-300">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{shelter.phone}</span>
                          </span>
                        )}
                        {shelter.capacity && (
                          <span className="flex items-center space-x-1 text-slate-400">
                            <Users className="w-3 h-3 text-slate-500" />
                            <span>Capacity: <strong className="text-slate-300">{shelter.capacity}</strong></span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🏥 NEARBY HOSPITALS Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                  <Hospital className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">🏥 NEARBY HOSPITALS</h3>
                  <p className="text-xs text-slate-400">Medical emergency facilities & trauma care centers</p>
                </div>
              </div>

              <div>
                {!coordinates && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-semibold border border-slate-700">
                    <Clock className="w-3 h-3" />
                    <span>Awaiting location</span>
                  </span>
                )}
                {coordinates && isHospitalsLoading && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-xs font-semibold animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Finding hospitals...</span>
                  </span>
                )}
                {coordinates && !isHospitalsLoading && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-xs font-semibold">
                    <span>Nearest 3</span>
                  </span>
                )}
              </div>
            </div>

            {/* Content States */}
            {!coordinates && (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                <MapPin className="w-6 h-6 text-slate-500" />
                <span>Enable location to find the nearest emergency medical centers.</span>
              </div>
            )}

            {coordinates && isHospitalsLoading && (
              <div className="space-y-3 py-2">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 animate-pulse">
                  <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-800/60 rounded w-3/4"></div>
                </div>
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 animate-pulse">
                  <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-800/60 rounded w-3/4"></div>
                </div>
              </div>
            )}

            {coordinates && !isHospitalsLoading && nearestHospitals.length === 0 && (
              <div className="p-6 bg-slate-950/60 border border-slate-800/80 rounded-xl text-center space-y-1">
                <p className="text-xs font-medium text-slate-300">No hospital facilities found.</p>
                <p className="text-[11px] text-slate-500">Call national emergency services for urgent medical transport.</p>
              </div>
            )}

            {coordinates && !isHospitalsLoading && nearestHospitals.length > 0 && (
              <div className="space-y-3">
                {nearestHospitals.map((hospital, idx) => (
                  <div
                    key={hospital.id || idx}
                    className="p-4 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-xl space-y-2 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5">
                        <div className="w-6 h-6 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white leading-tight">
                            {hospital.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                            {hospital.address}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-bold rounded-lg font-mono">
                          <Navigation className="w-2.5 h-2.5 text-rose-400" />
                          <span>{formatDistance(hospital.distanceKm)}</span>
                        </span>
                      </div>
                    </div>

                    {hospital.phone && (
                      <div className="flex items-center gap-3 pt-1 border-t border-slate-900 text-[11px] text-slate-400">
                        <span className="flex items-center space-x-1 text-slate-300">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>Emergency Line: {hospital.phone}</span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5. Geospatial Location Detection Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Geospatial Location Status</h3>
                <p className="text-xs text-slate-400">GPS & Browser Geolocation Coordinates</p>
              </div>
            </div>

            {/* Location Status Pill */}
            <div>
              {locationStatus === LOCATION_STATUS.REQUESTING && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full text-xs font-semibold animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Requesting location...</span>
                </span>
              )}

              {locationStatus === LOCATION_STATUS.SUCCESS && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Location successfully detected</span>
                </span>
              )}

              {locationStatus === LOCATION_STATUS.DENIED && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Location permission denied</span>
                </span>
              )}

              {locationStatus === LOCATION_STATUS.UNAVAILABLE && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-xs font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Location unavailable</span>
                </span>
              )}

              {locationStatus === LOCATION_STATUS.TIMEOUT && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Location request timed out</span>
                </span>
              )}

              {locationStatus === LOCATION_STATUS.ERROR && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-xs font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Location error</span>
                </span>
              )}
            </div>
          </div>

          {/* Location Detail Content */}
          {locationStatus === LOCATION_STATUS.REQUESTING && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Compass className="w-6 h-6 animate-spin" />
              </div>
              <p className="text-xs text-slate-400 max-w-sm">
                Acquiring GPS coordinates from browser sensor...
              </p>
            </div>
          )}

          {locationStatus === LOCATION_STATUS.SUCCESS && coordinates && (
            <div className="space-y-4">
              <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Current Coordinates
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-1">
                  <div className="text-xs font-medium text-slate-400">Latitude</div>
                  <div className="text-lg font-mono font-bold text-emerald-400 tracking-tight">
                    {coordinates.latitude}°
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-1">
                  <div className="text-xs font-medium text-slate-400">Longitude</div>
                  <div className="text-lg font-mono font-bold text-emerald-400 tracking-tight">
                    {coordinates.longitude}°
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-1">
                  <div className="text-xs font-medium text-slate-400">Accuracy</div>
                  <div className="text-lg font-mono font-bold text-blue-400 tracking-tight">
                    ±{coordinates.accuracy} meters
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Sensor: High Accuracy GPS / Browser Geolocation
                </span>
                <button
                  onClick={() => setShowManualForm(!showManualForm)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1.5 py-1 px-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{showManualForm ? 'Hide Coordinate Controls' : 'Override Coordinates'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Fallback Warning Box */}
          {(locationStatus === LOCATION_STATUS.DENIED ||
            locationStatus === LOCATION_STATUS.UNAVAILABLE ||
            locationStatus === LOCATION_STATUS.TIMEOUT ||
            locationStatus === LOCATION_STATUS.ERROR) && (
            <div className="p-4 bg-rose-950/20 border border-rose-900/50 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-rose-300 text-sm font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>
                  {locationStatus === LOCATION_STATUS.DENIED ? 'Location Permission Denied' : 'Location Retrieval Failed'}
                </span>
              </div>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                {locationErrorMessage || 'Coordinates could not be automatically detected. Please enter coordinates manually.'}
              </p>
            </div>
          )}

          {/* Manual Entry Form */}
          {(showManualForm ||
            locationStatus === LOCATION_STATUS.DENIED ||
            locationStatus === LOCATION_STATUS.UNAVAILABLE ||
            locationStatus === LOCATION_STATUS.TIMEOUT ||
            locationStatus === LOCATION_STATUS.ERROR) && (
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">Manual Coordinate Entry Fallback</h4>
                <p className="text-xs text-slate-400">
                  Provide latitude and longitude to test emergency weather & safety simulations.
                </p>
              </div>

              {manualFormError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300">
                  {manualFormError}
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Latitude (-90 to 90)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 37.7749"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Longitude (-180 to 180)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. -122.4194"
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => handlePresetSelect(37.7749, -122.4194)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[11px] text-slate-300 cursor-pointer"
                    >
                      San Francisco
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetSelect(35.6762, 139.6503)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[11px] text-slate-300 cursor-pointer"
                    >
                      Tokyo
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetSelect(51.5074, -0.1278)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[11px] text-slate-300 cursor-pointer"
                    >
                      London
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetSelect(19.0760, 72.8777)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[11px] text-slate-300 cursor-pointer"
                    >
                      Mumbai
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Apply Coordinates
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* 3. Weather Telemetry Card */}
        {weather && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                  <CloudSun className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Current Weather Telemetry</h3>
                  <p className="text-xs text-slate-400">Atmospheric metrics via OpenWeather backend proxy</p>
                </div>
              </div>

              <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Weather Synchronized</span>
              </span>
            </div>

            <div className="space-y-6">
              {/* Main Weather Metric Banner */}
              <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-950 to-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-2xl">
                    {getWeatherIcon(weather.condition)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-2xl font-bold text-white">
                        {weather.location?.name || 'Local Area'}
                      </h4>
                      {weather.location?.country && (
                        <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-[10px] uppercase font-bold text-slate-300 rounded">
                          {weather.location.country}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">
                      {weather.description || weather.condition}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-3xl font-extrabold text-white tracking-tight">
                    {weather.temperature}°C
                  </div>
                  <div className="text-xs text-slate-400">
                    Feels like <span className="font-semibold text-slate-200">{weather.feelsLike}°C</span>
                  </div>
                </div>
              </div>

              {/* Weather Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* 🌡 Temperature */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
                    <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                    <span>Temperature</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {weather.temperature}°C
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Feels like {weather.feelsLike}°C
                  </div>
                </div>

                {/* 🌤 Weather Condition */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
                    <CloudSun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Condition</span>
                  </div>
                  <div className="text-lg font-bold text-white capitalize truncate">
                    {weather.condition}
                  </div>
                  <div className="text-[11px] text-slate-500 capitalize truncate">
                    {weather.description}
                  </div>
                </div>

                {/* 💧 Humidity */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
                    <Droplets className="w-3.5 h-3.5 text-blue-400" />
                    <span>Humidity</span>
                  </div>
                  <div className="text-lg font-bold text-blue-400">
                    {weather.humidity}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Relative moisture
                  </div>
                </div>

                {/* 💨 Wind Speed */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
                    <Wind className="w-3.5 h-3.5 text-teal-400" />
                    <span>Wind Speed</span>
                  </div>
                  <div className="text-lg font-bold text-teal-400">
                    {weather.windSpeed} m/s
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {(weather.windSpeed * 3.6).toFixed(1)} km/h
                  </div>
                </div>
              </div>

              {/* 🌧 Precipitation */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <CloudRain className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Precipitation Volume</div>
                    <div className="text-[11px] text-slate-400">Rainfall / Snowfall recorded in recent hour</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-blue-300">
                    {weather.precipitation !== undefined ? `${weather.precipitation} mm` : '0.0 mm'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
