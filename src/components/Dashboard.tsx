/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShieldAlert,
  Plus,
  Compass,
  CheckCircle,
  FileText,
  DollarSign,
  Briefcase,
  PieChart as PieIcon,
  Activity,
  Award,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Cell,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { InvestmentPlan, User } from '../types.js';
import AIPanel from './AIPanel.js';

interface DashboardProps {
  user: User | null;
  plans: InvestmentPlan[];
  expenses: any[];
  budgets: any[];
  assets: any[];
  liabilities: any[];
  onOpenAuth: () => void;
  onNavigateToCalculators: () => void;
  onNotify: (message: string, type: 'success' | 'error') => void;
  currency?: string;
}

export default function Dashboard({ user, plans, expenses, budgets, assets, liabilities, onOpenAuth, onNavigateToCalculators, onNotify, currency = 'USD' }: DashboardProps) {
  const activePlans = plans;

  // 1. Calculate Aggregate Financial Metrics
  const activeCount = activePlans.length;
  
  let totalInvested = 0;
  let projectedWealth = 0;
  let totalGoalTargets = 0;
  let totalGoalAchieved = 0;

  activePlans.forEach((p) => {
    const lastProj = p.projections[p.projections.length - 1];
    totalInvested += lastProj?.invested_amount || 0;
    projectedWealth += lastProj?.maturity_amount || 0;

    if (p.type === 'goal' && p.financial_detail.target_amount > 0) {
      totalGoalTargets += p.financial_detail.target_amount;
      totalGoalAchieved += lastProj?.maturity_amount || 0;
    }
  });

  // Calculate Average Goal Completion Percentage
  const goalCompletionPercentage = totalGoalTargets > 0
    ? Math.min(100, Math.round((totalGoalAchieved / totalGoalTargets) * 100))
    : activeCount > 0 ? 100 : 0;

  // 2. Format Currency for display
  const formatCurrency = (val: number) => {
    const configs: Record<string, { locale: string; code: string }> = {
      USD: { locale: 'en-US', code: 'USD' },
      INR: { locale: 'en-IN', code: 'INR' },
      EUR: { locale: 'de-DE', code: 'EUR' },
      GBP: { locale: 'en-GB', code: 'GBP' },
      JPY: { locale: 'ja-JP', code: 'JPY' },
      CAD: { locale: 'en-CA', code: 'CAD' },
      AUD: { locale: 'en-AU', code: 'AUD' },
    };
    const cfg = configs[currency] || configs.USD;
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency: cfg.code,
      maximumFractionDigits: 0
    }).format(val);
  };

  // 3. Asset Allocation Data for Recharts Pie Chart
  const allocationMap: Record<string, number> = {};
  activePlans.forEach((p) => {
    const lastProj = p.projections[p.projections.length - 1];
    const amount = lastProj?.maturity_amount || 0;
    const typeLabel = p.type === 'sip' ? 'SIP Investment' : p.type === 'compound' ? 'Compound Lump' : p.type === 'goal' ? 'Goal-Directed' : 'Step-Up SIP';
    allocationMap[typeLabel] = (allocationMap[typeLabel] || 0) + amount;
  });

  const pieData = Object.entries(allocationMap).map(([name, value]) => ({ name, value }));
  const COLORS = ['#1e3a8a', '#2563eb', '#3b82f6', '#475569'];

  // 4. Combined Growth Curve Projection
  // We need to sum up year-by-year projections across all plans.
  // Find maximum duration first
  const maxDuration = activePlans.reduce((max, p) => Math.max(max, p.financial_detail.duration), 0);
  const combinedGrowthData = Array.from({ length: maxDuration }, (_, index) => {
    const year = index + 1;
    let yearInvested = 0;
    let yearMaturity = 0;

    activePlans.forEach((p) => {
      // Find the projection for this year, or take the last one if maxed out
      const proj = p.projections[Math.min(index, p.projections.length - 1)];
      if (proj) {
        yearInvested += proj.invested_amount;
        yearMaturity += proj.maturity_amount;
      }
    });

    return {
      year,
      Invested: yearInvested,
      Maturity: yearMaturity,
    };
  });

  // 5. Dynamic Milestone tracker
  const milestones = [
    { title: 'The Launchpad', desc: 'Secure your first active financial plan', status: activeCount >= 1 ? 'completed' : 'pending' },
    { title: 'Goal Accumulator', desc: 'Project more than $100,000 in future wealth', status: projectedWealth >= 100000 ? 'completed' : 'pending' },
    { title: 'Half-Millionaire Shield', desc: 'Create combined goals exceeding $500,000', status: projectedWealth >= 500000 ? 'completed' : 'pending' },
    { title: 'Diversified Portfolio', desc: 'Build at least 3 distinct active plans', status: activeCount >= 3 ? 'completed' : 'pending' }
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Welcome / Quick Start Banner */}
      {!user && (
        <div className="p-5 bg-slate-900 text-white rounded-lg shadow-sm border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -z-10" />
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-600/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5" />
              Welcome to WealthWise
            </span>
            <h3 className="text-base font-semibold">Start Planning & Growing Your Wealth</h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Model compound growth, monitor budgets and expenses, and track your net worth. Sign in anytime to sync your plans securely across devices.
            </p>
          </div>
          <button
            id="guest-banner-auth-btn"
            onClick={onOpenAuth}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-md hover:shadow-blue-500/10 shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-98"
          >
            <span>Sign In / Register</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Top-level Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* STAT 1 */}
        <div className="bg-white rounded-lg p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Capital Paid</span>
            <h3 className="text-xl font-bold text-slate-800 font-mono mt-0.5">{formatCurrency(totalInvested)}</h3>
            <span className="text-[10px] text-slate-500 mt-1 block">Sum of core deposits</span>
          </div>
        </div>

        {/* STAT 2 */}
        <div className="bg-white rounded-lg p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Projected Future Wealth</span>
            <h3 className="text-xl font-bold text-blue-600 font-mono mt-0.5">{formatCurrency(projectedWealth)}</h3>
            <span className="text-[10px] text-blue-600 font-semibold mt-1 block">
              Yield surplus: {totalInvested > 0 ? `+${Math.round(((projectedWealth - totalInvested) / totalInvested) * 100)}%` : '+0%'}
            </span>
          </div>
        </div>

        {/* STAT 3 */}
        <div className="bg-white rounded-lg p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Accounts</span>
            <h3 className="text-xl font-bold text-slate-800 font-mono mt-0.5">{activeCount} Goal Plans</h3>
            <span className="text-[10px] text-slate-500 mt-1 block">Saving targets locked</span>
          </div>
        </div>

        {/* STAT 4 */}
        <div className="bg-white rounded-lg p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Goal Target Completion</span>
            <h3 className="text-xl font-bold text-slate-800 font-mono mt-0.5">{goalCompletionPercentage}%</h3>
            <span className="text-[10px] text-slate-500 mt-1 block">Weighted portfolio average</span>
          </div>
        </div>

      </div>

      {/* 3. Visualization Panel: Charts block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Combined Growth Area Graph (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-white rounded-lg p-6 border border-slate-200/70 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Portfolio Consolidation Path</h4>
              <p className="text-xs text-slate-500">Aggregated compound growth projection of all locked plans</p>
            </div>
            <div className="flex gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1.5 text-slate-400">
                <div className="w-2.5 h-2.5 bg-slate-200 rounded-xs" />
                Capital Paid
              </span>
              <span className="flex items-center gap-1.5 text-blue-600">
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-xs" />
                Maturity Corpus
              </span>
            </div>
          </div>

          <div className="h-72 w-full text-xs">
            {activeCount === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500 font-medium">No plans found in database.</p>
                <button
                  onClick={onNavigateToCalculators}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Your First Plan
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={combinedGrowthData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" stroke="#94a3b8" tickLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), '']} labelFormatter={(l) => `Year ${l}`} />
                  <Area type="monotone" dataKey="Maturity" stroke="#2563eb" strokeWidth={2} fill="url(#colorMaturityCombined)" fillOpacity={0.06} />
                  <Area type="monotone" dataKey="Invested" stroke="#94a3b8" strokeWidth={1.5} fill="#f1f5f9" fillOpacity={0.2} />
                  <defs>
                    <linearGradient id="colorMaturityCombined" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Asset Allocation Pie Graph (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white rounded-lg p-6 border border-slate-200/70 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 font-sans">CAGR Asset Allocation</h4>
            <p className="text-xs text-slate-500">Relative weight distribution based on maturity values</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center relative text-xs">
            {pieData.length === 0 ? (
              <div className="text-center p-4">
                <p className="text-[10px] text-slate-400">Save a plan to inspect CAGR asset weights.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), '']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3 text-[10px] font-semibold">
            {pieData.map((item, index) => {
              const pct = projectedWealth > 0 ? Math.round((item.value / projectedWealth) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-mono text-slate-800">{pct}% ({formatCurrency(item.value)})</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 4. Goals list and Milestone Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Locked Targets List (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200/70 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Saving Goals Portfolio</h4>
              <p className="text-[10px] text-slate-500">Overview of locked wealth goals</p>
            </div>
            <button
              onClick={onNavigateToCalculators}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Target</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {activePlans.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-xs text-slate-500">You don't have any saved plans yet.</p>
              </div>
            ) : (
              activePlans.map((plan) => {
                const lastProj = plan.projections[plan.projections.length - 1];
                const typeName = plan.type === 'sip' ? 'Monthly SIP' : plan.type === 'compound' ? 'Compound Lump Sum' : plan.type === 'goal' ? 'Goal Planner' : 'Step-Up Compound';
                
                return (
                  <div key={plan.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-slate-800">{plan.name}</h5>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs bg-slate-100 text-slate-600 text-[10px] font-semibold">
                        {typeName}
                      </span>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-xs font-bold text-blue-600 block font-mono">
                        {formatCurrency(lastProj?.maturity_amount || 0)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Locked rate: {plan.financial_detail.interest_rate}% • {plan.financial_detail.duration} yrs
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Milestone Badges Board (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200/70 shadow-xs p-6 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Actionable Milestones</h4>
            <p className="text-xs text-slate-500 mt-0.5">Automated tracker of portfolio achievements</p>
          </div>

          <div className="space-y-3">
            {milestones.map((m) => (
              <div
                key={m.title}
                className={`p-3 rounded-lg border flex items-start gap-3 transition-all ${
                  m.status === 'completed'
                    ? 'bg-blue-50/40 border-blue-100/60 text-slate-800'
                    : 'bg-slate-50/50 border-slate-100 text-slate-500'
                }`}
              >
                <div className={`p-1 rounded-md mt-0.5 ${m.status === 'completed' ? 'bg-blue-600 text-white animate-scale-up' : 'bg-slate-200 text-slate-400'}`}>
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className={`text-xs font-bold ${m.status === 'completed' ? 'text-slate-800' : 'text-slate-600'}`}>{m.title}</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* AI Financial Insights Panel */}
      <AIPanel 
        user={user} 
        showToast={onNotify} 
        onOpenAuth={onOpenAuth} 
        expenses={expenses}
        budgets={budgets}
        plans={plans}
        assets={assets}
        liabilities={liabilities}
        currency={currency}
      />

    </div>
  );
}
