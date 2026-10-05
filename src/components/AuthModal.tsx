/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { X, Lock, Mail, User as UserIcon, AlertCircle, ArrowRight, Shield, Award } from 'lucide-react';
import { api } from '../services/api.js';
import { User } from '../types.js';

interface AuthModalProps {
  isOpen: boolean;
  initialPortal?: 'client' | 'admin';
  onClose: () => void;
  onSuccess: (user: User, token: string, portal: 'client' | 'admin') => void;
}

export default function AuthModal({ isOpen, initialPortal = 'client', onClose, onSuccess }: AuthModalProps) {
  const [portal, setPortal] = useState<'client' | 'admin'>(initialPortal);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPortal(initialPortal);
      setErrors({});
      setGeneralError('');
      if (initialPortal === 'admin') {
        setIsLogin(true);
      }
    }
  }, [isOpen, initialPortal]);

  if (!isOpen) return null;

  const handlePortalSwitch = (newPortal: 'client' | 'admin') => {
    setPortal(newPortal);
    setErrors({});
    setGeneralError('');
    if (newPortal === 'admin') {
      setIsLogin(true); // Admins can only sign in through established administrative accounts
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setLoading(true);

    if (isLogin) {
      const res = await api.login({ email, password, portal });
      setLoading(false);
      if (res.success && res.data) {
        onSuccess(res.data.user, res.data.token, portal);
        onClose();
      } else {
        setGeneralError(res.message || 'Invalid email or password.');
      }
    } else {
      if (password !== confirmPassword) {
        setErrors({ confirmPassword: 'Passwords do not match.' });
        setLoading(false);
        return;
      }

      const res = await api.register({ name, email, password, confirmPassword });
      setLoading(false);
      if (res.success && res.data) {
        onSuccess(res.data.user, res.data.token, 'client');
        onClose();
      } else {
        if (res.errors) {
          setErrors(res.errors);
        } else {
          setGeneralError(res.message || 'Registration failed.');
        }
      }
    }
  };

  const isAdminPortal = portal === 'admin';

  return (
    <div id="auth-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-300">
        
        {/* Portal Switch Bar */}
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1.5 text-xs font-semibold">
          <button
            type="button"
            id="auth-select-client-portal"
            onClick={() => handlePortalSwitch('client')}
            className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
              !isAdminPortal
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-blue-600" />
            <span>Client Portal</span>
          </button>
          <button
            type="button"
            id="auth-select-admin-portal"
            onClick={() => handlePortalSwitch('admin')}
            className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
              isAdminPortal
                ? 'bg-indigo-950 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Admin Portal</span>
          </button>
        </div>

        {/* Header bar */}
        <div className={`px-6 pt-5 pb-4 border-b flex items-center justify-between ${
          isAdminPortal
            ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-indigo-900'
            : 'bg-gradient-to-r from-slate-50 to-white text-slate-800 border-slate-100'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              {isAdminPortal ? (
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xxs font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Restricted Access
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xxs font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Client Login
                </span>
              )}
            </div>
            <h3 className={`text-lg font-bold mt-1.5 ${isAdminPortal ? 'text-white' : 'text-slate-800'}`}>
              {isAdminPortal ? 'Administrator Authentication' : (isLogin ? 'Sign In to Client Workspace' : 'Create Client Account')}
            </h3>
            <p className={`text-xs mt-0.5 ${isAdminPortal ? 'text-slate-300' : 'text-slate-500'}`}>
              {isAdminPortal
                ? 'Authorized personnel only. Access system metrics and client management.'
                : (isLogin ? 'Access personal investment models, budgets, and portfolio goals.' : 'Join to start modeling compounding growth and net worth.')}
            </p>
          </div>
          <button
            id="close-auth-modal"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isAdminPortal
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {generalError && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {!isLogin && !isAdminPortal && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 block">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  id="reg-name"
                  type="text"
                  required
                  placeholder="Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition ${
                    errors.name ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-600'
                  }`}
                />
              </div>
              {errors.name && <p className="text-xxs text-red-500">{errors.name}</p>}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 block">
              {isAdminPortal ? 'Admin Email Address' : 'Email Address'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="auth-email"
                type="email"
                required
                placeholder={isAdminPortal ? 'admin@company.com' : 'name@example.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition ${
                  errors.email
                    ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                    : isAdminPortal
                    ? 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-600'
                    : 'border-slate-200 focus:ring-blue-100 focus:border-blue-600'
                }`}
              />
            </div>
            {errors.email && <p className="text-xxs text-red-500">{errors.email}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 block">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="auth-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition ${
                  errors.password
                    ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                    : isAdminPortal
                    ? 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-600'
                    : 'border-slate-200 focus:ring-blue-100 focus:border-blue-600'
                }`}
              />
            </div>
            {errors.password && <p className="text-xxs text-red-500">{errors.password}</p>}
          </div>

          {!isLogin && !isAdminPortal && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 block">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="auth-confirm-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition ${
                    errors.confirmPassword ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-600'
                  }`}
                />
              </div>
              {errors.confirmPassword && <p className="text-xxs text-red-500">{errors.confirmPassword}</p>}
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className={`w-full mt-2 font-medium py-2.5 px-4 rounded-lg text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-white ${
              isAdminPortal
                ? 'bg-indigo-900 hover:bg-indigo-950 focus:ring-2 focus:ring-indigo-400'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-400'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {isAdminPortal
                    ? 'Authenticate as Administrator'
                    : isLogin
                    ? 'Sign In to Client Workspace'
                    : 'Create Client Account'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          {isAdminPortal ? (
            <p className="text-xxs text-slate-500 leading-relaxed">
              🔒 Admin access requires elevated server authorization. All login attempts are audited.
            </p>
          ) : (
            <>
              <span className="text-slate-500 mr-1">
                {isLogin ? "Don't have a client account?" : 'Already registered?'}
              </span>
              <button
                id="toggle-auth-mode"
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                  setGeneralError('');
                }}
                className="font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
              >
                {isLogin ? 'Sign Up as Client' : 'Client Sign In'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
