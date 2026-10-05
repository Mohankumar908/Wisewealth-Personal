/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  LayoutDashboard,
  Calculator,
  Briefcase,
  FileText,
  User as UserIcon,
  LogOut,
  Sparkles,
  Bell,
  CheckCircle,
  AlertCircle,
  Menu,
  X,
  Settings,
  Mail,
  Lock,
  ArrowRight,
  Wallet,
  Scale,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Compass,
  Home
} from 'lucide-react';

import { User, InvestmentPlan } from './types.js';
import { api } from './services/api.js';
import AuthModal from './components/AuthModal.js';
import LandingPage from './components/LandingPage.js';
import Dashboard from './components/Dashboard.js';
import Calculators from './components/Calculators.js';
import SavedPlans from './components/SavedPlans.js';
import Reports from './components/Reports.js';
import BudgetExpenseTracker from './components/BudgetExpenseTracker.js';
import NetWorthTracker from './components/NetWorthTracker.js';
import RiskProfiler from './components/RiskProfiler.js';
import FinancialPlanners from './components/FinancialPlanners.js';
import AdminConsole from './components/AdminConsole.js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [liabilities, setLiabilities] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [activePage, setActivePage] = useState<'dashboard' | 'calculators' | 'portfolio' | 'reports' | 'budget' | 'networth' | 'risk' | 'planners' | 'admin'>('dashboard');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authPortalModal, setAuthPortalModal] = useState<'client' | 'admin'>('client');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Global Currency State
  const [currency, setCurrency] = useState<'USD' | 'INR' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD'>(() => {
    return (localStorage.getItem('wealthwise_currency') as any) || 'USD';
  });

  const handleCurrencyChange = (newCurrency: 'USD' | 'INR' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD') => {
    setCurrency(newCurrency);
    localStorage.setItem('wealthwise_currency', newCurrency);
    showToast(`Currency format updated to ${newCurrency}.`, 'success');
  };

  // Profile Edit fields
  const [profileFirst, setProfileFirst] = useState('');
  const [profileLast, setProfileLast] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Notification Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    bootstrapSession();
  }, []);

  useEffect(() => {
    loadAllUserData();
  }, [user]);

  useEffect(() => {
    if (!user && activePage !== 'dashboard') {
      setActivePage('dashboard');
    }
  }, [user, activePage]);

  const bootstrapSession = async () => {
    const token = localStorage.getItem('ww_token');
    if (token) {
      const res = await api.getProfile();
      if (res.success && res.data) {
        setUser(res.data);
        setProfileFirst(res.data.first_name);
        setProfileLast(res.data.last_name);
        setProfileEmail(res.data.email);
        loadPlans();
      } else {
        // Stale or invalid token
        localStorage.removeItem('ww_token');
      }
    }
  };

  const loadPlans = async () => {
    if (!user) {
      const stored = localStorage.getItem('wealthwise_guest_plans');
      if (stored) {
        try {
          setPlans(JSON.parse(stored));
        } catch (e) {
          setPlans([]);
        }
      } else {
        setPlans([]);
      }
      return;
    }
    const res = await api.listPlans();
    if (res.success && res.data) {
      setPlans(res.data);
    }
  };

  const loadAllUserData = async () => {
    if (!user) {
      // Initialize cleanly from local storage without hardcoded dummy data
      try {
        const storedExp = localStorage.getItem('wealthwise_guest_expenses');
        setExpenses(storedExp ? JSON.parse(storedExp) : []);
      } catch {
        setExpenses([]);
      }

      try {
        const storedBud = localStorage.getItem('wealthwise_guest_budgets');
        setBudgets(storedBud ? JSON.parse(storedBud) : []);
      } catch {
        setBudgets([]);
      }

      try {
        const storedAssets = localStorage.getItem('wealthwise_guest_assets');
        setAssets(storedAssets ? JSON.parse(storedAssets) : []);
      } catch {
        setAssets([]);
      }

      try {
        const storedLiab = localStorage.getItem('wealthwise_guest_liabilities');
        setLiabilities(storedLiab ? JSON.parse(storedLiab) : []);
      } catch {
        setLiabilities([]);
      }

      loadPlans();
      return;
    }

    try {
      const [expRes, budRes, assetRes, liabRes] = await Promise.all([
        api.listExpenses(),
        api.listBudgets(),
        api.listAssets(),
        api.listLiabilities()
      ]);

      if (expRes.success && expRes.data) setExpenses(expRes.data);
      if (budRes.success && budRes.data) setBudgets(budRes.data);
      if (assetRes.success && assetRes.data) setAssets(assetRes.data);
      if (liabRes.success && liabRes.data) setLiabilities(liabRes.data);
      loadPlans();
    } catch (e) {
      console.error('Error loading user financial data:', e);
    }
  };

  // Sync local data to localStorage when in guest mode
  useEffect(() => {
    if (!user) {
      localStorage.setItem('wealthwise_guest_expenses', JSON.stringify(expenses));
    }
  }, [expenses, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('wealthwise_guest_budgets', JSON.stringify(budgets));
    }
  }, [budgets, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('wealthwise_guest_assets', JSON.stringify(assets));
    }
  }, [assets, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('wealthwise_guest_liabilities', JSON.stringify(liabilities));
    }
  }, [liabilities, user]);

  const openAuthModal = (portal: 'client' | 'admin' = 'client') => {
    setAuthPortalModal(portal);
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = (loggedUser: User, token: string, portalChoice?: 'client' | 'admin') => {
    setUser(loggedUser);
    setProfileFirst(loggedUser.first_name);
    setProfileLast(loggedUser.last_name);
    setProfileEmail(loggedUser.email);
    localStorage.setItem('ww_token', token);

    const isAdmin = loggedUser.role === 'admin' || loggedUser.is_staff;
    if (isAdmin) {
      setActivePage('admin');
      showToast(`Administrator authenticated. Administrative Console Unlocked.`, 'success');
    } else {
      setActivePage('dashboard');
      showToast(`Welcome to WealthWise Client Portal, ${loggedUser.first_name || 'Client'}!`, 'success');
    }
    
    loadPlans();
    loadAllUserData();
  };

  const handleLogout = () => {
    localStorage.removeItem('ww_token');
    setUser(null);
    loadAllUserData();
    setActivePage('dashboard');
    setIsProfileOpen(false);
    showToast('Signed out of WealthWise successfully.', 'success');
  };

  const handleUpdateProfile = async (e: any) => {
    e.preventDefault();
    setProfileLoading(true);

    const res = await api.updateProfile({
      first_name: profileFirst,
      last_name: profileLast,
      email: profileEmail,
    });

    setProfileLoading(false);
    if (res.success && res.data) {
      setUser(res.data);
      setIsProfileOpen(false);
      showToast('Your profile has been updated.', 'success');
    } else {
      showToast(res.message || 'Profile update failed.', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const isAdmin = user ? (user.role === 'admin' || user.is_staff) : false;

  // Unauthenticated visitors see the descriptive, institutional Landing Page
  if (!user) {
    return (
      <div className="min-h-screen bg-white font-sans">
        <LandingPage
          currency={currency}
          onCurrencyChange={handleCurrencyChange}
          onOpenAuth={(portal) => openAuthModal(portal)}
        />

        <AuthModal
          isOpen={isAuthOpen}
          initialPortal={authPortalModal}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={handleAuthSuccess}
        />

        {toast && (
          <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold border ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-emerald-500/40 shadow-emerald-950/20'
                : 'bg-red-950 text-red-100 border-red-800 shadow-red-950/20'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      
      {/* 1. SIDEBAR NAVIGATION - DESKTOP */}
      <aside id="sidebar" className="hidden lg:flex flex-col w-64 bg-slate-950 text-slate-400 border-r border-slate-900 shrink-0 select-none">
        
        {/* Brand Header */}
        <div 
          onClick={() => setActivePage('dashboard')}
          className="px-6 py-6 border-b border-slate-900 flex items-center gap-3 cursor-pointer hover:bg-slate-900/40 transition"
          title="WealthWise Home"
        >
          <Briefcase className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-white">WealthWise</h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Private Wealth Suite</p>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 text-xs font-semibold overflow-y-auto">
          {/* Elevated Admin Section (If Admin) */}
          {isAdmin && (
            <div className="pb-3 mb-3 border-b border-slate-900">
              <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Portal</span>
              </div>
              <button
                id="nav-admin-console"
                onClick={() => setActivePage('admin')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition cursor-pointer border-l-2 mt-1 rounded-r-lg ${
                  activePage === 'admin'
                    ? 'bg-indigo-950 text-white border-indigo-500 font-bold'
                    : 'border-transparent text-indigo-300 hover:bg-slate-900/80 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Admin Console</span>
              </button>
            </div>
          )}

          {isAdmin && (
            <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Client Workspace
            </div>
          )}

          {/* Overview Dashboard */}
          <button
            id="nav-dashboard"
            onClick={() => setActivePage('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 transition cursor-pointer border-l-2 ${
              activePage === 'dashboard'
                ? 'bg-slate-900 text-white border-blue-500 font-bold'
                : 'border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview Dashboard</span>
          </button>

          {/* Tools and modules */}
          <button
            id="nav-calculators"
            onClick={() => setActivePage('calculators')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 transition cursor-pointer border-l-2 ${
              activePage === 'calculators'
                ? 'bg-slate-900 text-white border-blue-500 font-bold'
                : 'border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Interactive Calculators</span>
          </button>

          <button
            id="nav-budget"
            onClick={() => setActivePage('budget')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 transition cursor-pointer border-l-2 ${
              activePage === 'budget'
                ? 'bg-slate-900 text-white border-blue-500 font-bold'
                : 'border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Budget & Expenses</span>
          </button>

          <button
            id="nav-networth"
            onClick={() => setActivePage('networth')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 transition cursor-pointer border-l-2 ${
              activePage === 'networth'
                ? 'bg-slate-900 text-white border-blue-500 font-bold'
                : 'border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Net Worth Tracker</span>
          </button>

          <button
            id="nav-risk"
            onClick={() => setActivePage('risk')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 transition cursor-pointer border-l-2 ${
              activePage === 'risk'
                ? 'bg-slate-900 text-white border-blue-500 font-bold'
                : 'border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Risk & Asset Mix</span>
          </button>

          <button
            id="nav-planners"
            onClick={() => setActivePage('planners')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 transition cursor-pointer border-l-2 ${
              activePage === 'planners'
                ? 'bg-slate-900 text-white border-blue-500 font-bold'
                : 'border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Advanced Planners</span>
          </button>

          <button
            id="nav-portfolio"
            onClick={() => setActivePage('portfolio')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 transition cursor-pointer border-l-2 ${
              activePage === 'portfolio'
                ? 'bg-slate-900 text-white border-blue-500 font-bold'
                : 'border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Goals Portfolio</span>
          </button>

          <button
            id="nav-reports"
            onClick={() => setActivePage('reports')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 transition cursor-pointer border-l-2 ${
              activePage === 'reports'
                ? 'bg-slate-900 text-white border-blue-500 font-bold'
                : 'border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Reports & Exports</span>
          </button>
        </nav>

        {/* User Footplate */}
        <div className="p-4 border-t border-slate-900 text-xs font-semibold">
          {user ? (
            <div className="space-y-3">
              <div
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-900 transition cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold uppercase shrink-0 ${
                  isAdmin ? 'bg-indigo-600' : 'bg-blue-600'
                }`}>
                  {user.first_name ? user.first_name[0] : user.email[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-white truncate">{user.first_name} {user.last_name}</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                  <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider mt-0.5 ${
                    isAdmin ? 'bg-indigo-500/20 text-indigo-300' : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {isAdmin ? 'Administrator' : 'Client'}
                  </span>
                </div>
              </div>
              <button
                id="logout-btn-desktop"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-800 hover:bg-red-600 hover:border-red-600 hover:text-white transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                id="auth-btn-desktop"
                onClick={() => openAuthModal('client')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shadow-sm text-xs"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Client Portal Login</span>
              </button>
              <button
                id="auth-admin-btn-desktop"
                onClick={() => openAuthModal('admin')}
                className="w-full py-2 bg-slate-900 hover:bg-indigo-950 text-indigo-300 hover:text-white border border-indigo-900/60 font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 text-xs"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Admin Security Portal</span>
              </button>
            </div>
          )}
        </div>

      </aside>

      {/* 2. MAIN CORE LAYOUT (Sidebar counterpart) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* TOP BAR / MOBILE NAVBAR */}
        <header id="top-bar" className="bg-white border-b border-slate-100 h-16 px-6 flex items-center justify-between shrink-0 select-none print:hidden">
          
          {/* Mobile hamburger logo */}
          <div className="flex items-center gap-2">
            <button
              id="mobile-menu-trigger"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div 
              onClick={() => setActivePage('dashboard')}
              className="lg:hidden flex items-center gap-1.5 text-slate-900 cursor-pointer"
              title="WealthWise Home"
            >
              <Briefcase className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-bold uppercase tracking-widest">WealthWise</span>
            </div>
            
            {/* Desktop status indicators */}
            <div className="hidden lg:flex items-center gap-3">
              <button
                id="topbar-home-link"
                onClick={() => setActivePage('dashboard')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activePage === 'dashboard'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Home className="w-3.5 h-3.5 text-blue-600" />
                <span>Home</span>
              </button>

              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2 border-l border-slate-200">
                <span>Security Shield:</span>
                <span className="text-blue-600 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  256-Bit Encrypted
                </span>
              </div>
            </div>
          </div>

          {/* User profile controls on right */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            {/* Currency Selector */}
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50">
              <span className="text-slate-500 font-mono text-[9px] uppercase font-bold hidden sm:inline">Currency:</span>
              <select
                id="global-currency-select"
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as any)}
                className="bg-transparent text-slate-800 font-sans font-bold text-[11px] focus:outline-hidden cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {isAdmin ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xxs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Shield className="w-3 h-3 text-indigo-600" />
                      <span>Admin</span>
                    </span>
                    {activePage === 'admin' ? (
                      <button
                        id="topbar-switch-client"
                        onClick={() => setActivePage('dashboard')}
                        className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xxs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      >
                        Client Tools
                      </button>
                    ) : (
                      <button
                        id="topbar-switch-admin"
                        onClick={() => setActivePage('admin')}
                        className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xxs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer shadow-xs"
                      >
                        <Shield className="w-3 h-3" />
                        Admin Console
                      </button>
                    )}
                  </>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xxs font-medium uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                    Client Account
                  </span>
                )}
                <button
                  id="topbar-avatar-btn"
                  onClick={() => setIsProfileOpen(true)}
                  title="View Profile & Settings"
                  className={`w-8 h-8 rounded-full transition flex items-center justify-center uppercase font-bold shrink-0 cursor-pointer border ${
                    isAdmin
                      ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                  }`}
                >
                  {user.first_name ? user.first_name[0] : user.email[0]}
                </button>

                <button
                  id="topbar-signout-btn"
                  onClick={handleLogout}
                  title="Sign out to home landing page"
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 border border-slate-200/60"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="auth-btn-topbar"
                  onClick={() => openAuthModal('client')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Client Login</span>
                </button>
                <button
                  id="auth-admin-topbar"
                  onClick={() => openAuthModal('admin')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-950 text-indigo-300 hover:text-white border border-indigo-900/60 font-semibold rounded-lg transition text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Admin Login</span>
                </button>
              </div>
            )}
          </div>

        </header>

        {/* MOBILE SIDEBAR NAV - SLIDEOUT OVERLAY */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative w-64 max-w-xs bg-slate-950 text-slate-300 flex flex-col p-6 space-y-6 border-r border-slate-900">
              
              <div 
                onClick={() => {
                  setActivePage('dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className="flex justify-between items-center pb-4 border-b border-slate-900 cursor-pointer"
                title="WealthWise Home"
              >
                <div className="flex items-center gap-1.5 text-white">
                  <Briefcase className="w-5 h-5 text-blue-500" />
                  <span className="font-bold text-sm uppercase tracking-wider">WealthWise</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 text-xs font-semibold overflow-y-auto">
                <button
                  onClick={() => {
                    setActivePage('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg capitalize transition mb-1 ${
                    activePage === 'dashboard' ? 'bg-slate-900 text-white border-l-2 border-blue-500 font-bold' : 'text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <LayoutDashboard className="w-4.5 h-4.5 text-blue-400" />
                  <span>Overview Dashboard</span>
                </button>

                {/* When logged in: Display other tools in mobile menu */}
                {user && (
                  <>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setActivePage('admin');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg capitalize transition mb-2 ${
                          activePage === 'admin'
                            ? 'bg-indigo-950 text-white border-l-2 border-indigo-500 font-bold'
                            : 'text-indigo-300 hover:bg-slate-900'
                        }`}
                      >
                        <ShieldCheck className="w-4.5 h-4.5 text-indigo-400" />
                        <span>Admin Console</span>
                      </button>
                    )}

                    {([
                      'calculators',
                      'budget',
                      'networth',
                      'risk',
                      'planners',
                      'portfolio',
                      'reports'
                    ] as const).map((page) => (
                      <button
                        key={page}
                        onClick={() => {
                          setActivePage(page);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg capitalize transition ${
                          activePage === page ? 'bg-slate-900 text-white border-l-2 border-blue-500 font-bold' : 'text-slate-400 hover:bg-slate-900'
                        }`}
                      >
                        {page === 'calculators' && <Calculator className="w-4.5 h-4.5" />}
                        {page === 'budget' && <Wallet className="w-4.5 h-4.5" />}
                        {page === 'networth' && <Scale className="w-4.5 h-4.5" />}
                        {page === 'risk' && <ShieldAlert className="w-4.5 h-4.5" />}
                        {page === 'planners' && <Compass className="w-4.5 h-4.5" />}
                        {page === 'portfolio' && <Briefcase className="w-4.5 h-4.5" />}
                        {page === 'reports' && <FileText className="w-4.5 h-4.5" />}
                        <span>
                          {page === 'portfolio' 
                            ? 'Goals Portfolio' 
                            : page === 'networth' 
                            ? 'Net Worth' 
                            : page === 'risk' 
                            ? 'Risk & Recommendations' 
                            : page}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </nav>

              <div className="pt-4 border-t border-slate-900">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-slate-800 hover:bg-red-600 rounded-lg text-slate-300 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        openAuthModal('client');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-center transition text-xs"
                    >
                      Client Portal Login
                    </button>
                    <button
                      onClick={() => {
                        openAuthModal('admin');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg text-center transition text-xs"
                    >
                      Admin Security Portal
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 3. CORE ROUTING CANVAS CONTAINER */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activePage === 'admin' && (
            isAdmin ? (
              <AdminConsole
                currentUser={user!}
                currency={currency}
                onSwitchToClientView={() => setActivePage('dashboard')}
                showToast={showToast}
              />
            ) : (
              <div className="p-8 bg-white rounded-2xl border border-red-200 text-center space-y-4 shadow-sm">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">Restricted Administrative Area</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Access to the WealthWise Administrative Console requires super-admin authorization. Client accounts cannot view or modify administrative configurations.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActivePage('dashboard')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Return to Client Dashboard
                  </button>
                  <button
                    onClick={() => openAuthModal('admin')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Sign In with Admin Account
                  </button>
                </div>
              </div>
            )
          )}
          {activePage === 'dashboard' && (
            <Dashboard
              user={user}
              plans={plans}
              expenses={expenses}
              budgets={budgets}
              assets={assets}
              liabilities={liabilities}
              onOpenAuth={() => setIsAuthOpen(true)}
              onNavigateToCalculators={() => setActivePage('calculators')}
              onNotify={showToast}
              currency={currency}
            />
          )}

          {activePage === 'calculators' && (
            <Calculators
              user={user}
              onOpenAuth={() => setIsAuthOpen(true)}
              onRefreshPlans={loadPlans}
              onNotify={showToast}
              currency={currency}
            />
          )}

          {activePage === 'budget' && (
            <BudgetExpenseTracker
              user={user}
              onOpenAuth={() => setIsAuthOpen(true)}
              showToast={showToast}
              expenses={expenses}
              setExpenses={setExpenses}
              budgets={budgets}
              setBudgets={setBudgets}
              onRefreshData={loadAllUserData}
              currency={currency}
            />
          )}

          {activePage === 'networth' && (
            <NetWorthTracker
              user={user}
              onOpenAuth={() => setIsAuthOpen(true)}
              showToast={showToast}
              assets={assets}
              setAssets={setAssets}
              liabilities={liabilities}
              setLiabilities={setLiabilities}
              onRefreshData={loadAllUserData}
              currency={currency}
            />
          )}

          {activePage === 'risk' && (
            <RiskProfiler
              user={user}
              assets={assets}
              showToast={showToast}
            />
          )}

          {activePage === 'planners' && (
            <FinancialPlanners
              showToast={showToast}
            />
          )}

          {activePage === 'portfolio' && (
            <SavedPlans
              user={user}
              plans={plans}
              onOpenAuth={() => setIsAuthOpen(true)}
              onRefreshPlans={loadPlans}
              onNavigateToCalculators={() => setActivePage('calculators')}
              onNotify={showToast}
              currency={currency}
            />
          )}

          {activePage === 'reports' && (
            <Reports
              user={user}
              plans={plans}
              onOpenAuth={() => setIsAuthOpen(true)}
              onNotify={showToast}
              currency={currency}
            />
          )}
        </main>

      </div>

      {/* 4. MODALS & SNACKBAR TOAST OVERLAYS */}
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        initialPortal={authPortalModal}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Profile Settings Modal */}
      {isProfileOpen && user && (
        <div id="profile-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full shadow-2xl overflow-hidden transform transition-all duration-300">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Account Credentials</h3>
                <p className="text-xxs text-slate-400 mt-0.5">Edit credentials or secure account logs</p>
              </div>
              <button onClick={() => setIsProfileOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600">First Name</label>
                  <input
                    id="profile-first"
                    type="text"
                    required
                    value={profileFirst}
                    onChange={(e) => setProfileFirst(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600">Last Name</label>
                  <input
                    id="profile-last"
                    type="text"
                    required
                    value={profileLast}
                    onChange={(e) => setProfileLast(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600">Email Address</label>
                <input
                  id="profile-email"
                  type="email"
                  required
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Discard
                </button>
                <button
                  id="save-profile-btn"
                  type="submit"
                  disabled={profileLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {profileLoading ? 'Securing...' : 'Secure Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal for Login & Registration */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Snackbar Toast Popup Notification */}
      {toast && (
        <div
          id="toast-popup"
          className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-2xl border border-slate-800 flex items-start gap-3 w-80 max-w-full animate-scale-up"
        >
          <div className="mt-0.5 shrink-0">
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
          <div className="space-y-1 flex-1">
            <span className="font-bold text-slate-200">{toast.type === 'success' ? 'Audit Success' : 'Alert Notice'}</span>
            <p className="text-slate-400 leading-normal">{toast.message}</p>
          </div>
        </div>
      )}

    </div>
  );
}
