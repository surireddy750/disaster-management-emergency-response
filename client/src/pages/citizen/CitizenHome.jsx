import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLocation, LOCATION_STATUS } from '../../hooks/useLocation.js';
import { fetchRiskAssessment, RISK_LEVELS, RISK_TRENDS } from '../../services/riskService.js';
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
  AlertOctagon
} from 'lucide-react';

const RISK_STATUS = {
  WAITING_FOR_LOCATION: 'WAITING_FOR_LOCATION',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  UNAVAILABLE: 'UNAVAILABLE',
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

  // Risk & Weather Assessment State
  const [riskData, setRiskData] = useState(null);
  const [riskStatus, setRiskStatus] = useState(RISK_STATUS.WAITING_FOR_LOCATION);
  const [riskError, setRiskError] = useState(null);

  // Manual Coordinates State
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualFormError, setManualFormError] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  // Load Risk Assessment whenever coordinates update
  useEffect(() => {
    let isMounted = true;

    if (!coordinates) {
      setRiskData(null);
      setRiskStatus(RISK_STATUS.WAITING_FOR_LOCATION);
      setRiskError(null);
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

  const displayName = userProfile?.name || currentUser?.displayName || currentUser?.email || 'Citizen';
  const weather = riskData?.weather;
  const risk = riskData?.risk;
  const riskConfig = risk ? getRiskLevelConfig(risk.riskLevel) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
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

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>Phase 2 — Step 3 Disaster Risk Engine Active</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Welcome, {displayName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time geospatial sensor, atmospheric metrics & deterministic disaster risk calculation.
              </p>
            </div>

            <button
              onClick={requestLocation}
              disabled={isLocationLoading || riskStatus === RISK_STATUS.LOADING}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow transition cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLocationLoading || riskStatus === RISK_STATUS.LOADING ? 'animate-spin' : ''}`} />
              <span>{isLocationLoading ? 'Locating...' : 'Refresh All'}</span>
            </button>
          </div>
        </div>

        {/* 1. CURRENT SAFETY STATUS */}
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

          {riskStatus === RISK_STATUS.WAITING_FOR_LOCATION && (
            <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <Compass className="w-6 h-6 text-slate-500" />
              <span>Acquire or input coordinates below to calculate disaster risk.</span>
            </div>
          )}

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

          {riskStatus === RISK_STATUS.SUCCESS && risk && (
            <div className="space-y-6">
              <div className={`p-6 border rounded-2xl ${riskConfig.containerBg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6`}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-bold tracking-wide uppercase ${riskConfig.badgeClass}`}>
                      <span className={`w-2 h-2 rounded-full ${riskConfig.dotClass} animate-pulse`}></span>
                      <span>{riskConfig.label}</span>
                    </span>

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

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Safety Spectrum</span>
                  <span className="font-semibold text-slate-200">{risk.riskScore}% severity</span>
                </div>

                <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800 relative">
                  <div className="w-1/4 h-full bg-emerald-500/30 border-r border-slate-950" title="Low (0-25)"></div>
                  <div className="w-1/4 h-full bg-amber-500/30 border-r border-slate-950" title="Moderate (26-50)"></div>
                  <div className="w-1/4 h-full bg-orange-500/30 border-r border-slate-950" title="High (51-75)"></div>
                  <div className="w-1/4 h-full bg-rose-500/30" title="Critical (76-100)"></div>

                  <div
                    className={`absolute top-0 bottom-0 left-0 ${riskConfig.progressClass} transition-all duration-500 rounded-full`}
                    style={{ width: `${Math.max(4, risk.riskScore)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                  <span className="text-emerald-400">0 (LOW)</span>
                  <span className="text-amber-400">25</span>
                  <span className="text-orange-400">50</span>
                  <span className="text-rose-400">75</span>
                  <span className="text-rose-500">100 (CRITICAL)</span>
                </div>
              </div>

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

        {/* 2. Geospatial Location Detection Card */}
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
