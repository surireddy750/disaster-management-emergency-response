import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES, ROLE_REDIRECTS } from '../../utils/roles.js';
import { getFirebaseAuthErrorMessage } from '../../utils/errorCodes.js';
import { Shield, User, Lock, Mail, Users, HeartPulse, UserCog, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLES.CITIZEN);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const roleOptions = [
    {
      id: ROLES.CITIZEN,
      title: 'Citizen',
      desc: 'Receive local disaster alerts, trigger emergency SOS, find nearest shelters.',
      icon: Users,
      color: 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400',
      activeColor: 'ring-2 ring-emerald-500 bg-emerald-950/40'
    },
    {
      id: ROLES.RESCUE_TEAM,
      title: 'Rescue Team',
      desc: 'Field response units, receive mission dispatches, report live rescue status.',
      icon: HeartPulse,
      color: 'border-amber-500/50 bg-amber-950/20 text-amber-400',
      activeColor: 'ring-2 ring-amber-500 bg-amber-950/40'
    },
    {
      id: ROLES.ADMIN,
      title: 'Administrator',
      desc: 'Command center triage, approve team allocations, dispatch alerts and resources.',
      icon: UserCog,
      color: 'border-red-500/50 bg-red-950/20 text-red-400',
      activeColor: 'ring-2 ring-red-500 bg-red-950/40'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setSubmitting(true);
      const profile = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role: selectedRole
      });

      const userRole = profile?.role || selectedRole;
      const destination = ROLE_REDIRECTS[userRole] || '/citizen/home';
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Registration submission error:', err);
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-900/30 ring-1 ring-white/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Create System Account
        </h2>
        <p className="mt-1 text-center text-xs tracking-wider uppercase text-slate-400 font-semibold">
          Emergency Response & Disaster Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-slate-900/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 backdrop-blur-sm sm:px-10">
          
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 flex items-start space-x-3 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Officer Jane Doe / John Citizen"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@agency.gov / name@example.com"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Password (min 6 chars)
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Select Portal Access Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {roleOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedRole === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setSelectedRole(opt.id)}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                        isSelected ? opt.activeColor + ' border-transparent' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg ${opt.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{opt.title}</div>
                        <div className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 cursor-pointer"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Register & Open Portal</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-amber-400 hover:text-amber-300 transition">
                Sign in to your account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
