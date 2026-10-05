/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Award, 
  HelpCircle, 
  Sparkles, 
  TrendingUp, 
  Layers, 
  AlertTriangle, 
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { RiskProfile, Asset, User } from '../types.js';

interface RiskProfilerProps {
  user: User | null;
  assets: Asset[];
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const ALLOCATION_TEMPLATES = {
  Conservative: [
    { name: 'Cash & Savings', pct: 20, color: '#3b82f6' },
    { name: 'Fixed Income & Bonds', pct: 50, color: '#06b6d4' },
    { name: 'Blue Chip Equities', pct: 20, color: '#10b981' },
    { name: 'Gold & Commodities', pct: 10, color: '#f59e0b' },
  ],
  Moderate: [
    { name: 'Cash & Savings', pct: 10, color: '#3b82f6' },
    { name: 'Fixed Income & Bonds', pct: 25, color: '#06b6d4' },
    { name: 'Blue Chip Equities', pct: 45, color: '#10b981' },
    { name: 'Mid-Cap & Small-Cap', pct: 15, color: '#6366f1' },
    { name: 'Alternative Assets/Crypto', pct: 5, color: '#8b5cf6' },
  ],
  Aggressive: [
    { name: 'Cash & Savings', pct: 5, color: '#3b82f6' },
    { name: 'Fixed Income & Bonds', pct: 10, color: '#06b6d4' },
    { name: 'Blue Chip Equities', pct: 40, color: '#10b981' },
    { name: 'Mid-Cap & Small-Cap', pct: 35, color: '#6366f1' },
    { name: 'Alternative Assets/Crypto', pct: 10, color: '#8b5cf6' },
  ]
};

export default function RiskProfiler({ user, assets, showToast }: RiskProfilerProps) {
  // Quiz Fields - start clean without dummy data
  const [age, setAge] = useState('');
  const [income, setIncome] = useState('');
  const [dependents, setDependents] = useState('');
  const [horizon, setHorizon] = useState('');
  const [appetite, setAppetite] = useState<'low' | 'medium' | 'high'>('medium');

  // Computed Risk Result
  const [score, setScore] = useState<'Conservative' | 'Moderate' | 'Aggressive' | null>(null);

  const runRiskCalculation = (notify = true) => {
    if (!age || !horizon) {
      if (notify) {
        showToast('Please enter your age and investment time horizon to calculate your risk profile.', 'error');
      }
      return;
    }

    const ageNum = Number(age);
    const dependentNum = Number(dependents) || 0;
    const horizonNum = Number(horizon);

    let pointCount = 0;

    // Appetite points
    if (appetite === 'low') pointCount += 1;
    if (appetite === 'medium') pointCount += 3;
    if (appetite === 'high') pointCount += 5;

    // Horizon points
    if (horizonNum < 3) pointCount += 1;
    else if (horizonNum < 7) pointCount += 3;
    else pointCount += 5;

    // Age points
    if (ageNum > 50) pointCount += 1;
    else if (ageNum > 35) pointCount += 3;
    else pointCount += 5;

    // Dependent friction points
    if (dependentNum > 2) pointCount -= 1;
    if (dependentNum === 0) pointCount += 1;

    let profile: 'Conservative' | 'Moderate' | 'Aggressive' = 'Moderate';
    if (pointCount <= 5) profile = 'Conservative';
    else if (pointCount >= 11) profile = 'Aggressive';

    setScore(profile);
    if (notify) {
      showToast(`Analyzed Profile: ${profile}!`, 'success');
    }
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runRiskCalculation(true);
  };

  // Portfolio tracking & rebalancing recommendations
  const totalAssetsValue = assets.reduce((s, a) => s + a.value, 0);

  const getRebalancingAdvice = () => {
    if (!score || totalAssetsValue === 0) return null;

    const recommendedTemplate = ALLOCATION_TEMPLATES[score];
    
    // Group actual assets into recommended buckets
    // Savings Account -> Cash & Savings
    // Fixed Deposits -> Fixed Income & Bonds
    // Stocks / Mutual Funds -> Blue Chip / Mid-Cap
    // Gold -> Gold & Commodities
    // Crypto -> Alternative Assets/Crypto
    let cashVal = assets.filter(a => a.asset_type === 'Savings Account').reduce((s, a) => s + a.value, 0);
    let bondsVal = assets.filter(a => a.asset_type === 'Fixed Deposits').reduce((s, a) => s + a.value, 0);
    let blueChipVal = assets.filter(a => a.asset_type === 'Stocks').reduce((s, a) => s + a.value, 0);
    let midCapVal = assets.filter(a => a.asset_type === 'Mutual Funds').reduce((s, a) => s + a.value, 0);
    let goldVal = assets.filter(a => a.asset_type === 'Gold').reduce((s, a) => s + a.value, 0);
    let cryptoVal = assets.filter(a => a.asset_type === 'Crypto').reduce((s, a) => s + a.value, 0);

    // Compute actual percentage alignment
    const actualBreakdown = [
      { name: 'Cash & Savings', current: cashVal, color: '#3b82f6' },
      { name: 'Fixed Income & Bonds', current: bondsVal, color: '#06b6d4' },
      { name: 'Blue Chip Equities', current: blueChipVal, color: '#10b981' },
      { name: 'Mid-Cap & Small-Cap', current: midCapVal, color: '#6366f1' },
      { name: 'Alternative Assets/Crypto', current: cryptoVal, color: '#8b5cf6' },
      { name: 'Gold & Commodities', current: goldVal, color: '#f59e0b' }
    ];

    const recommendationList = recommendedTemplate.map(rec => {
      // find matched actual item
      const act = actualBreakdown.find(a => a.name === rec.name) || { current: 0 };
      const currentPct = totalAssetsValue > 0 ? (act.current / totalAssetsValue) * 100 : 0;
      const recommendedVal = Math.round((rec.pct / 100) * totalAssetsValue);
      const diffVal = recommendedVal - act.current;

      return {
        name: rec.name,
        targetPct: rec.pct,
        currentPct: Math.round(currentPct),
        targetValue: recommendedVal,
        currentValue: act.current,
        difference: diffVal
      };
    });

    return recommendationList;
  };

  const adviceList = getRebalancingAdvice();

  return (
    <div className="space-y-8 animate-fade-in" id="risk-profiling-module">
      
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-lg p-8 text-white relative overflow-hidden border border-slate-800">
        <div className="relative z-10 max-w-xl">
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-md text-xs font-mono font-medium tracking-wide flex items-center gap-1.5 w-fit">
            <Shield className="w-3.5 h-3.5" /> Risk Profiling & Asset Allocation
          </span>
          <h2 className="text-2xl font-sans font-semibold text-white mt-3">
            Analyze Risk Appetite, Align Ratios
          </h2>
          <p className="text-slate-300 text-xs mt-2 leading-relaxed">
            WealthWise matches your retirement horizons and economic capabilities to model ideal portfolio distribution metrics. Run your analysis to get rebalancing suggestions.
          </p>
        </div>
        <div className="absolute top-1/2 right-8 -translate-y-1/2 opacity-10 pointer-events-none hidden md:block">
          <Award className="w-48 h-48" />
        </div>
      </div>

      {/* Grid Core */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Risk Quiz Questionnaire (LHS) */}
        <div className="lg:col-span-4 bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-sans font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            Risk Profile Questionnaire
          </h3>

          <form onSubmit={handleQuizSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-gray-500 block mb-1">Your Age</label>
              <input 
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 30"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                min="18"
                max="100"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-gray-500 block mb-1">Annual Post-Tax Income ($)</label>
              <input 
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="e.g. 85000"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                min="0"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-gray-500 block mb-1">Dependent Members Count</label>
              <input 
                type="number"
                value={dependents}
                onChange={(e) => setDependents(e.target.value)}
                placeholder="e.g. 0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                min="0"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-gray-500 block mb-1">Investment Time Horizon (Years)</label>
              <input 
                type="number"
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
                placeholder="e.g. 10"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                min="1"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-gray-500 block mb-2">Subjective Risk Sentiment</label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map(app => (
                  <button
                    key={app}
                    type="button"
                    onClick={() => setAppetite(app)}
                    className={`py-2 text-xs font-sans font-medium rounded-lg border transition cursor-pointer capitalize ${
                      appetite === app 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {app === 'low' ? 'Preservation' : app === 'medium' ? 'Balanced' : 'Aggressive'}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-sans font-medium transition flex items-center justify-center gap-1.5 cursor-pointer mt-4"
            >
              <RefreshCw className="w-4 h-4" /> Calculate Risk Profile
            </button>
          </form>
        </div>

        {/* Allocation Recommendations (RHS) */}
        <div className="lg:col-span-8 space-y-6">
          {!score && (
            <div className="bg-white rounded-lg p-10 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center space-y-4 min-h-[380px]">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Shield className="w-7 h-7" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-base font-semibold text-gray-900">
                  Ready to Assess Your Risk Profile
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Enter your age, income, dependents, investment horizon, and risk sentiment on the left. Click <strong>Calculate Risk Profile</strong> to generate your tailored asset allocation and real-time portfolio rebalancing diagnostics.
                </p>
              </div>
            </div>
          )}

          {score && (
            <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-wide">Dynamic Profiling Score</span>
                  <h3 className="text-2xl font-sans font-semibold text-gray-900 mt-0.5">
                    {score} Investment Mindset
                  </h3>
                </div>
                <div className={`px-4 py-1.5 rounded-md text-xs font-sans font-semibold ${
                  score === 'Conservative' ? 'bg-blue-50 text-blue-700' : score === 'Moderate' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                }`}>
                  {score === 'Conservative' ? 'Capital Security First' : score === 'Moderate' ? 'Steady Compounding Growth' : 'High Performance Velocity'}
                </div>
              </div>

              {/* Allocation Mix Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                
                {/* Chart Allocation */}
                <div className="flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-sans font-semibold text-gray-800 mb-2">Recommended Allocation Targets</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      This target allocation model balances your {horizon}-year horizon with your current dependent load.
                    </p>
                  </div>
                  <div className="h-44 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ALLOCATION_TEMPLATES[score]}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="pct"
                        >
                          {ALLOCATION_TEMPLATES[score].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Percentage Breakdown */}
                <div className="space-y-3 flex flex-col justify-center">
                  {ALLOCATION_TEMPLATES[score].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 border border-slate-100 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-700 font-sans font-medium">{item.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold bg-slate-100 text-gray-800 px-2 py-0.5 rounded-md">
                        {item.pct}%
                      </span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* Portfolio Rebalancing Diagnostics */}
          {score && totalAssetsValue > 0 && adviceList && (
            <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs">
              <h3 className="text-base font-sans font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin-slow" />
                Real-Time Portfolio Rebalancing Engine
              </h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                We evaluated your current asset pool (${totalAssetsValue.toLocaleString()}) against your calculated {score} targets. Follow the dynamic diagnostics to realign.
              </p>

              <div className="space-y-4">
                {adviceList.map((adv, idx) => {
                  const isUnder = adv.difference > 0;
                  const absDiff = Math.abs(adv.difference);

                  return (
                    <div key={idx} className="p-4 border border-gray-50 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-sans font-bold text-gray-800">{adv.name}</h4>
                        <div className="flex gap-2 mt-1.5 text-[10px] text-gray-500 font-mono">
                          <span>Current: {adv.currentPct}% (${adv.currentValue.toLocaleString()})</span>
                          <span>•</span>
                          <span>Target: {adv.targetPct}% (${adv.targetValue.toLocaleString()})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold font-mono ${
                          absDiff === 0 
                            ? 'bg-blue-50 text-blue-700' 
                            : (isUnder ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700')
                        }`}>
                          {absDiff === 0 
                            ? 'ALIGNED' 
                            : (isUnder ? `UNDERALLOCATED BY $${absDiff.toLocaleString()}` : `OVERALLOCATED BY $${absDiff.toLocaleString()}`)}
                        </span>
                        
                        {absDiff > 0 && (
                          <span className="text-xs text-gray-400">
                            {isUnder ? 'Buy more' : 'Sell surplus'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {score && totalAssetsValue === 0 && (
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-slate-800 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-sans font-semibold text-slate-900">No assets listed yet</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Go to the <strong>Net Worth Tracker</strong> tab to add savings accounts, stocks, or gold. Once assets are recorded, this engine will compute precise USD rebalancing trades to match your target asset allocations!
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
