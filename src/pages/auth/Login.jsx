import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_REDIRECTS } from '../../utils/roles.js';
import { getFirebaseAuthErrorMessage } from '../../utils/errorCodes.js';
import { Shield, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, currentUser, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect to user's portal
  useEffect(() => {
    if (currentUser && role) {
      const target = location.state?.from?.pathname || ROLE_REDIRECTS[role] || '/citizen/home';
      navigate(target, { replace: true });
    }
  }, [currentUser, role, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both your email and password.');
      return;
    }

    try {
      setSubmitting(true);
      const profile = await login({ email: email.trim(), password });
      const userRole = profile?.role || 'CITIZEN';
      const destination = location.state?.from?.pathname || ROLE_REDIRECTS[userRole] || '/citizen/home';
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Login submission error:', err);
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-900/30 ring-1 ring-white/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Disaster Management & Emergency Response
        </h2>
        <p className="mt-1 text-center text-xs tracking-wider uppercase text-slate-400 font-semibold">
          Secure Portal Authentication
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 backdrop-blur-sm sm:px-10">
          
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 flex items-start space-x-3 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                  placeholder="name@example.com"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
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
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 cursor-pointer"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Don't have an emergency responder or citizen account?{' '}
              <Link to="/register" className="font-semibold text-amber-400 hover:text-amber-300 transition">
                Create an account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
