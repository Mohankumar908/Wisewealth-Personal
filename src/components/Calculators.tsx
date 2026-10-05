/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Percent,
  Calendar,
  DollarSign,
  Briefcase,
  RefreshCw,
  Award,
  BookOpen,
  CheckCircle,
  HelpCircle,
  Shield,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { api } from '../services/api.js';
import { User, Projection } from '../types.js';

interface CalculatorsProps {
  user: User | null;
  onOpenAuth: () => void;
  onRefreshPlans: () => void;
  onNotify: (message: string, type: 'success' | 'error') => void;
  currency?: string;
}

type TabType = 'compound' | 'sip' | 'goal' | 'stepup' | 'inflation' | 'compare';

export default function Calculators({ user, onOpenAuth, onRefreshPlans, onNotify, currency = 'USD' }: CalculatorsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('compound');
  const [inflationRate, setInflationRate] = useState<number>(6);
  const [showInflationAdjusted, setShowInflationAdjusted] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>('');

  // 1. Compound Interest State
  const [ciPrincipal, setCiPrincipal] = useState<number>(10000);
  const [ciRate, setCiRate] = useState<number>(10);
  const [ciDuration, setCiDuration] = useState<number>(10);
  const [ciFreq, setCiFreq] = useState<'monthly' | 'quarterly' | 'semi-annually' | 'annually'>('annually');
  const [ciResult, setCiResult] = useState<any>(null);

  // 2. SIP State
  const [sipMonthly, setSipMonthly] = useState<number>(500);
  const [sipRate, setSipRate] = useState<number>(12);
  const [sipDuration, setSipDuration] = useState<number>(15);
  const [sipResult, setSipResult] = useState<any>(null);

  // 3. Goal Planner State
  const [goalTarget, setGoalTarget] = useState<number>(100000);
  const [goalRate, setGoalRate] = useState<number>(10);
  const [goalDuration, setGoalDuration] = useState<number>(10);
  const [goalResult, setGoalResult] = useState<any>(null);

  // 4. Step-Up SIP State
  const [suInitial, setSuInitial] = useState<number>(500);
  const [suStepUp, setSuStepUp] = useState<number>(10);
  const [suRate, setSuRate] = useState<number>(12);
  const [suDuration, setSuDuration] = useState<number>(15);
  const [suResult, setSuResult] = useState<any>(null);

  // 5. Inflation State
  const [infAmount, setInfAmount] = useState<number>(100000);
  const [infRate, setInfRate] = useState<number>(3.5);
  const [infDuration, setInfDuration] = useState<number>(15);
  const [infResult, setInfResult] = useState<any>(null);

  // 6. Comparison Tool State
  const [compS1Type, setCompS1Type] = useState<'sip' | 'compound'>('sip');
  const [compS1Principal, setCompS1Principal] = useState<number>(500); // monthly SIP or CI principal
  const [compS1Rate, setCompS1Rate] = useState<number>(12);
  
  const [compS2Type, setCompS2Type] = useState<'sip' | 'compound'>('sip');
  const [compS2Principal, setCompS2Principal] = useState<number>(600);
  const [compS2Rate, setCompS2Rate] = useState<number>(10);
  
  const [compDuration, setCompDuration] = useState<number>(15);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  // Trigger calculation on inputs changed
  useEffect(() => {
    calculateAll();
  }, [
    activeTab,
    ciPrincipal, ciRate, ciDuration, ciFreq,
    sipMonthly, sipRate, sipDuration,
    goalTarget, goalRate, goalDuration,
    suInitial, suStepUp, suRate, suDuration,
    infAmount, infRate, infDuration,
    compS1Type, compS1Principal, compS1Rate,
    compS2Type, compS2Principal, compS2Rate,
    compDuration,
    inflationRate,
    showInflationAdjusted
  ]);

  const calculateAll = async () => {
    try {
      if (activeTab === 'compound') {
        const res = await api.calculateCompound({
          principal: ciPrincipal,
          rate: ciRate,
          duration: ciDuration,
          frequency: ciFreq,
          inflationRate: showInflationAdjusted ? inflationRate : 0
        });
        if (res.success) setCiResult(res.data);
      } else if (activeTab === 'sip') {
        const res = await api.calculateSIP({
          monthlySip: sipMonthly,
          rate: sipRate,
          duration: sipDuration,
          inflationRate: showInflationAdjusted ? inflationRate : 0
        });
        if (res.success) setSipResult(res.data);
      } else if (activeTab === 'goal') {
        const res = await api.calculateGoal({
          targetAmount: goalTarget,
          rate: goalRate,
          duration: goalDuration,
          inflationRate: showInflationAdjusted ? inflationRate : 0
        });
        if (res.success) setGoalResult(res.data);
      } else if (activeTab === 'stepup') {
        const res = await api.calculateStepUp({
          initialSip: suInitial,
          annualIncrementPercent: suStepUp,
          duration: suDuration,
          rate: suRate,
          inflationRate: showInflationAdjusted ? inflationRate : 0
        });
        if (res.success) setSuResult(res.data);
      } else if (activeTab === 'inflation') {
        const res = await api.calculateInflation({
          futureAmount: infAmount,
          inflationRate: infRate,
          duration: infDuration
        });
        if (res.success) setInfResult(res.data);
      } else if (activeTab === 'compare') {
        let p1Projections: Projection[] = [];
        let p2Projections: Projection[] = [];

        // Scenario 1
        if (compS1Type === 'sip') {
          const res = await api.calculateSIP({ monthlySip: compS1Principal, rate: compS1Rate, duration: compDuration });
          if (res.success && res.data) p1Projections = res.data.projections;
        } else {
          const res = await api.calculateCompound({ principal: compS1Principal, rate: compS1Rate, duration: compDuration, frequency: 'annually' });
          if (res.success && res.data) p1Projections = res.data.projections;
        }

        // Scenario 2
        if (compS2Type === 'sip') {
          const res = await api.calculateSIP({ monthlySip: compS2Principal, rate: compS2Rate, duration: compDuration });
          if (res.success && res.data) p2Projections = res.data.projections;
        } else {
          const res = await api.calculateCompound({ principal: compS2Principal, rate: compS2Rate, duration: compDuration, frequency: 'annually' });
          if (res.success && res.data) p2Projections = res.data.projections;
        }

        // Merge into side-by-side projections
        const combined = Array.from({ length: compDuration }, (_, index) => {
          const year = index + 1;
          const s1 = p1Projections[index] || { maturity_amount: 0, invested_amount: 0 };
          const s2 = p2Projections[index] || { maturity_amount: 0, invested_amount: 0 };
          return {
            year,
            scenario1_maturity: s1.maturity_amount,
            scenario1_invested: s1.invested_amount,
            scenario2_maturity: s2.maturity_amount,
            scenario2_invested: s2.invested_amount,
          };
        });

        setComparisonResult({
          s1Final: p1Projections[p1Projections.length - 1]?.maturity_amount || 0,
          s1Invested: p1Projections[p1Projections.length - 1]?.invested_amount || 0,
          s2Final: p2Projections[p2Projections.length - 1]?.maturity_amount || 0,
          s2Invested: p2Projections[p2Projections.length - 1]?.invested_amount || 0,
          combined,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePlan = async (e: any) => {
    e.preventDefault();
    if (!planName.trim()) {
      onNotify('Please enter a custom plan name to save.', 'error');
      return;
    }

    setSaveLoading(true);
    let financial_detail: any = {};
    let projections: Projection[] = [];

    if (activeTab === 'compound') {
      financial_detail = { principal: ciPrincipal, sip_amount: 0, target_amount: 0, interest_rate: ciRate, duration: ciDuration, inflation_rate: showInflationAdjusted ? inflationRate : 0 };
      projections = ciResult.projections;
    } else if (activeTab === 'sip') {
      financial_detail = { principal: 0, sip_amount: sipMonthly, target_amount: 0, interest_rate: sipRate, duration: sipDuration, inflation_rate: showInflationAdjusted ? inflationRate : 0 };
      projections = sipResult.projections;
    } else if (activeTab === 'goal') {
      financial_detail = { principal: 0, sip_amount: goalResult.requiredMonthlySip, target_amount: goalTarget, interest_rate: goalRate, duration: goalDuration, inflation_rate: showInflationAdjusted ? inflationRate : 0 };
      projections = goalResult.projections;
    } else if (activeTab === 'stepup') {
      financial_detail = { principal: 0, sip_amount: suInitial, target_amount: 0, interest_rate: suRate, duration: suDuration, inflation_rate: showInflationAdjusted ? inflationRate : 0 };
      projections = suResult.projections;
    }

    if (!user) {
      const newPlan = {
        id: 'plan_' + Math.random().toString(36).substring(2, 9),
        user_id: 'guest',
        name: planName.trim(),
        type: activeTab as any,
        financial_detail,
        projections,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const existing = localStorage.getItem('wealthwise_guest_plans');
      const list = existing ? JSON.parse(existing) : [];
      localStorage.setItem('wealthwise_guest_plans', JSON.stringify([newPlan, ...list]));
      setSaveLoading(false);
      onNotify(`Investment plan "${planName}" saved to your device portfolio.`, 'success');
      setPlanName('');
      onRefreshPlans();
      return;
    }

    const response = await api.createPlan({
      name: planName,
      type: activeTab as any,
      financial_detail,
      projections,
    });

    setSaveLoading(false);
    if (response.success) {
      onNotify(`Investment plan "${planName}" has been added to your portfolio.`, 'success');
      setPlanName('');
      onRefreshPlans();
    } else {
      onNotify(response.message || 'Failed to save investment plan.', 'error');
    }
  };

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

  return (
    <div className="space-y-6">
      
      {/* Upper Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
        {(['compound', 'sip', 'goal', 'stepup', 'inflation', 'compare'] as TabType[]).map((tab) => (
          <button
            key={tab}
            id={`tab-btn-${tab}`}
            onClick={() => {
              setActiveTab(tab);
              setPlanName('');
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 capitalize flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60'
            }`}
          >
            {tab === 'compound' && <RefreshCw className="w-3.5 h-3.5" />}
            {tab === 'sip' && <TrendingUp className="w-3.5 h-3.5" />}
            {tab === 'goal' && <Award className="w-3.5 h-3.5" />}
            {tab === 'stepup' && <Percent className="w-3.5 h-3.5" />}
            {tab === 'inflation' && <Briefcase className="w-3.5 h-3.5" />}
            {tab === 'compare' && <Sparkles className="w-3.5 h-3.5" />}
            <span>{tab === 'compare' ? 'Comparison Engine' : tab + ' Calculator'}</span>
          </button>
        ))}
      </div>

      {/* Inflation Adjustment Bar (Excluded for Inflation Calculator and Comparison) */}
      {activeTab !== 'inflation' && activeTab !== 'compare' && (
        <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <input
              id="inflation-toggle"
              type="checkbox"
              checked={showInflationAdjusted}
              onChange={(e) => setShowInflationAdjusted(e.target.checked)}
              className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 border-slate-300 animate-none"
            />
            <div>
              <label htmlFor="inflation-toggle" className="text-xs font-semibold text-slate-800 block cursor-pointer select-none">
                Inflation-Adjusted Projections (Today's Purchasing Power)
              </label>
              <p className="text-xxs text-slate-500 mt-0.5">
                Automatically adjusts the future portfolio value for compound erosion over the years.
              </p>
            </div>
          </div>
          {showInflationAdjusted && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Expected Inflation Rate:</span>
              <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 w-24">
                <input
                  id="inflation-rate-input"
                  type="number"
                  min="0"
                  max="20"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-transparent text-xs text-slate-800 font-semibold focus:outline-none"
                />
                <Percent className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid containing Inputs and Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ========================================== */}
        {/* LEFT COLUMN: PARAMETER ADJUSTMENTS (lg:col-span-5) */}
        {/* ========================================== */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Adjustment Board</h4>
              <p className="text-xs text-slate-500 mt-0.5">Slide or type values below</p>
            </div>

            {/* TAB: COMPOUND INTEREST */}
            {activeTab === 'compound' && (
              <div className="space-y-4">
                {/* Principal */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Initial Principal ($)</span>
                    <input
                      type="number"
                      value={ciPrincipal}
                      onChange={(e) => setCiPrincipal(Math.max(0, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-28 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="10000000"
                    step="5000"
                    value={ciPrincipal}
                    onChange={(e) => setCiPrincipal(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Expected Annual Return (%)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={ciRate}
                      onChange={(e) => setCiRate(Math.max(0, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-20 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="0.1"
                    value={ciRate}
                    onChange={(e) => setCiRate(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Horizon Duration (Years)</span>
                    <input
                      type="number"
                      value={ciDuration}
                      onChange={(e) => setCiDuration(Math.max(1, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-20 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={ciDuration}
                    onChange={(e) => setCiDuration(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Compounding Frequency */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-600 block">Compounding Interval</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['annually', 'semi-annually', 'quarterly', 'monthly'] as const).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setCiFreq(freq)}
                        className={`py-1.5 rounded-lg border text-xxs font-semibold capitalize cursor-pointer transition ${
                          ciFreq === freq
                            ? 'bg-slate-800 border-slate-800 text-white'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {freq.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SIP */}
            {activeTab === 'sip' && (
              <div className="space-y-4">
                {/* Monthly SIP */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Monthly Deposit ($)</span>
                    <input
                      type="number"
                      value={sipMonthly}
                      onChange={(e) => setSipMonthly(Math.max(0, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-28 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1000000"
                    step="100"
                    value={sipMonthly}
                    onChange={(e) => setSipMonthly(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Expected Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Expected Annual Return (%)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={sipRate}
                      onChange={(e) => setSipRate(Math.max(0, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-20 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="0.1"
                    value={sipRate}
                    onChange={(e) => setSipRate(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Horizon Duration (Years)</span>
                    <input
                      type="number"
                      value={sipDuration}
                      onChange={(e) => setSipDuration(Math.max(1, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-20 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={sipDuration}
                    onChange={(e) => setSipDuration(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB: GOAL PLANNER */}
            {activeTab === 'goal' && (
              <div className="space-y-4">
                {/* Target Amount */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Target Goal Corpus ($)</span>
                    <input
                      type="number"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(Math.max(0, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-28 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="100000000"
                    step="10000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Expected Return */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Expected Annual Return (%)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={goalRate}
                      onChange={(e) => setGoalRate(Math.max(0, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-20 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="0.1"
                    value={goalRate}
                    onChange={(e) => setGoalRate(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Time Horizon (Years)</span>
                    <input
                      type="number"
                      value={goalDuration}
                      onChange={(e) => setGoalDuration(Math.max(1, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-20 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={goalDuration}
                    onChange={(e) => setGoalDuration(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB: STEP-UP SIP */}
            {activeTab === 'stepup' && (
              <div className="space-y-4">
                {/* Initial Monthly */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Initial Monthly SIP ($)</span>
                    <input
                      type="number"
                      value={suInitial}
                      onChange={(e) => setSuInitial(Math.max(0, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-28 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1000000"
                    step="100"
                    value={suInitial}
                    onChange={(e) => setSuInitial(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Annual Step-Up Percentage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Annual Increase (Hike %)</span>
                    <input
                      type="number"
                      step="1"
                      value={suStepUp}
                      onChange={(e) => setSuStepUp(Math.max(0, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-20 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={suStepUp}
                    onChange={(e) => setSuStepUp(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Expected Return */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Expected Annual Return (%)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={suRate}
                      onChange={(e) => setSuRate(Math.max(0, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-20 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="0.1"
                    value={suRate}
                    onChange={(e) => setSuRate(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Duration (Years)</span>
                    <input
                      type="number"
                      value={suDuration}
                      onChange={(e) => setSuDuration(Math.max(1, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-20 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={suDuration}
                    onChange={(e) => setSuDuration(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB: INFLATION */}
            {activeTab === 'inflation' && (
              <div className="space-y-4">
                {/* Future Amount */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Future Required Amount ($)</span>
                    <input
                      type="number"
                      value={infAmount}
                      onChange={(e) => setInfAmount(Math.max(0, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-28 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="100000000"
                    step="10000"
                    value={infAmount}
                    onChange={(e) => setInfAmount(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Inflation Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Annual Inflation Rate (%)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={infRate}
                      onChange={(e) => setInfRate(Math.max(0, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-20 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.1"
                    value={infRate}
                    onChange={(e) => setInfRate(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Time Horizon (Years)</span>
                    <input
                      type="number"
                      value={infDuration}
                      onChange={(e) => setInfDuration(Math.max(1, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-20 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={infDuration}
                    onChange={(e) => setInfDuration(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB: COMPARISON ENGINE */}
            {activeTab === 'compare' && (
              <div className="space-y-5">
                
                {/* Scenario 1 */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                      Scenario A
                    </span>
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => setCompS1Type('sip')}
                        className={`px-2 py-0.5 text-xxs font-semibold ${compS1Type === 'sip' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        SIP
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompS1Type('compound')}
                        className={`px-2 py-0.5 text-xxs font-semibold ${compS1Type === 'compound' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        Lump
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xxs text-slate-500 block">{compS1Type === 'sip' ? 'Monthly ($)' : 'Principal ($)'}</span>
                      <input
                        type="number"
                        value={compS1Principal}
                        onChange={(e) => setCompS1Principal(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xxs text-slate-500 block">Return Rate (%)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={compS1Rate}
                        onChange={(e) => setCompS1Rate(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Scenario 2 */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-slate-500" />
                      Scenario B
                    </span>
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => setCompS2Type('sip')}
                        className={`px-2 py-0.5 text-xxs font-semibold ${compS2Type === 'sip' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        SIP
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompS2Type('compound')}
                        className={`px-2 py-0.5 text-xxs font-semibold ${compS2Type === 'compound' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        Lump
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xxs text-slate-500 block">{compS2Type === 'sip' ? 'Monthly ($)' : 'Principal ($)'}</span>
                      <input
                        type="number"
                        value={compS2Principal}
                        onChange={(e) => setCompS2Principal(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xxs text-slate-500 block">Return Rate (%)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={compS2Rate}
                        onChange={(e) => setCompS2Rate(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Horizon Duration (Years)</span>
                    <input
                      type="number"
                      value={compDuration}
                      onChange={(e) => setCompDuration(Math.max(1, Number(e.target.value)))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-20 text-right font-mono text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={compDuration}
                    onChange={(e) => setCompDuration(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

              </div>
            )}

            {/* Save to Plans Form (Omit for Inflation/Compare) */}
            {activeTab !== 'inflation' && activeTab !== 'compare' && (
              <div className="pt-4 border-t border-slate-150 space-y-3">
                <span className="text-xs font-semibold text-slate-700 block">Lock into WealthWise Portfolio</span>
                {user ? (
                  <div className="space-y-2">
                    <input
                      id="save-plan-name-input"
                      type="text"
                      placeholder="Give this plan a name (e.g. My 401k)"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      className="w-full border border-slate-250 rounded-lg text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    />
                    <button
                      id="save-to-portfolio-btn"
                      onClick={handleSavePlan}
                      disabled={saveLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition active:scale-98 cursor-pointer flex items-center justify-center gap-1"
                    >
                      {saveLoading ? 'Saving...' : 'Add to Active Goals'}
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                    <p className="text-xxs text-slate-500 mb-2">Sign in to lock calculations and track milestone completion percentages.</p>
                    <button
                      id="prompt-auth-save-btn"
                      onClick={onOpenAuth}
                      className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xxs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Authenticate Account</span>
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT COLUMN: GRAPHS AND KEY METRICS (lg:col-span-7) */}
        {/* ========================================== */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. KPI WIDGETS DISPLAY */}
          <div className="grid grid-cols-3 gap-4">
            
            {/* KPI 1 */}
            <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-xs">
              <span className="text-xxs font-bold text-slate-400 uppercase block tracking-wider">
                {activeTab === 'inflation' ? 'Target Future' : activeTab === 'goal' ? 'Required Monthly' : 'Cumulative Invested'}
              </span>
              <span className="text-sm sm:text-base md:text-xl font-bold text-slate-800 block mt-1.5 font-mono">
                {activeTab === 'compound' && ciResult && formatCurrency(ciPrincipal)}
                {activeTab === 'sip' && sipResult && formatCurrency(sipResult.totalInvestment)}
                {activeTab === 'goal' && goalResult && formatCurrency(goalResult.requiredMonthlySip)}
                {activeTab === 'stepup' && suResult && formatCurrency(suResult.totalInvestment)}
                {activeTab === 'inflation' && formatCurrency(infAmount)}
                {activeTab === 'compare' && comparisonResult && formatCurrency(comparisonResult.s1Final)}
              </span>
              <span className="text-xxs text-slate-500 block mt-1">
                {activeTab === 'goal' ? 'Every single month' : 'Principal contribution'}
              </span>
            </div>

            {/* KPI 2 */}
            <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-xs">
              <span className="text-xxs font-bold text-slate-400 uppercase block tracking-wider">
                {activeTab === 'inflation' ? 'Present Equivalent' : activeTab === 'goal' ? 'Total Return Value' : 'Acquired Returns'}
              </span>
              <span className="text-sm sm:text-base md:text-xl font-bold text-blue-600 block mt-1.5 font-mono">
                {activeTab === 'compound' && ciResult && formatCurrency(ciResult.interestEarned)}
                {activeTab === 'sip' && sipResult && formatCurrency(sipResult.totalReturns)}
                {activeTab === 'goal' && goalResult && formatCurrency(goalResult.totalReturns)}
                {activeTab === 'stepup' && suResult && formatCurrency(suResult.totalReturns)}
                {activeTab === 'inflation' && infResult && formatCurrency(infResult.presentValue)}
                {activeTab === 'compare' && comparisonResult && formatCurrency(comparisonResult.s2Final)}
              </span>
              <span className="text-xxs text-slate-500 block mt-1">
                {activeTab === 'inflation' ? 'Purchasing power equivalent' : 'Growth from interest'}
              </span>
            </div>

            {/* KPI 3 */}
            <div className="bg-white rounded-lg p-4 border border-slate-200/80 shadow-xs bg-gradient-to-br from-slate-900 to-slate-800 text-white">
              <span className="text-xxs font-bold text-slate-400 uppercase block tracking-wider">
                {activeTab === 'inflation' ? 'Inflation Loss' : activeTab === 'compare' ? 'Total Difference' : 'Projected Wealth'}
              </span>
              <span className="text-sm sm:text-base md:text-xl font-bold text-blue-400 block mt-1.5 font-mono">
                {activeTab === 'compound' && ciResult && formatCurrency(ciResult.finalAmount)}
                {activeTab === 'sip' && sipResult && formatCurrency(sipResult.finalCorpus)}
                {activeTab === 'goal' && goalResult && formatCurrency(goalTarget)}
                {activeTab === 'stepup' && suResult && formatCurrency(suResult.finalCorpus)}
                {activeTab === 'inflation' && infResult && formatCurrency(infAmount - infResult.presentValue)}
                {activeTab === 'compare' && comparisonResult && formatCurrency(Math.abs(comparisonResult.s1Final - comparisonResult.s2Final))}
              </span>
              <span className="text-xxs text-slate-400 block mt-1">
                {activeTab === 'compare' && comparisonResult 
                  ? (comparisonResult.s1Final > comparisonResult.s2Final ? 'Scenario A is larger' : 'Scenario B is larger')
                  : 'Total maturity corpus'}
              </span>
            </div>

          </div>

          {/* 2. RECHARTS INTERACTIVE GRAPH */}
          <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Growth Projection Path</h4>
                <p className="text-xs text-slate-500 mt-0.5">Wealth accumulation trajectory over time</p>
              </div>
              <div className="flex items-center gap-4 text-xxs font-semibold">
                {activeTab !== 'compare' && (
                  <>
                    <span className="flex items-center gap-1 text-slate-500">
                      <div className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
                      Invested Capital
                    </span>
                    <span className="flex items-center gap-1 text-blue-600">
                      <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                      Maturity Value
                    </span>
                    {showInflationAdjusted && (
                      <span className="flex items-center gap-1 text-sky-500">
                        <div className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
                        Purchasing Power
                      </span>
                    )}
                  </>
                )}
                {activeTab === 'compare' && (
                  <>
                    <span className="flex items-center gap-1 text-blue-600">
                      <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                      Scenario A
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <div className="w-2.5 h-2.5 rounded-sm bg-slate-500" />
                      Scenario B
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                {activeTab === 'compare' && comparisonResult ? (
                  <LineChart data={comparisonResult.combined} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" stroke="#94a3b8" tickLine={false} label={{ value: 'Years', position: 'insideBottom', offset: -5 }} />
                    <YAxis stroke="#94a3b8" tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), '']} labelFormatter={(label) => `Year ${label}`} />
                    <Line type="monotone" dataKey="scenario1_maturity" stroke="#2563eb" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="scenario2_maturity" stroke="#64748b" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 2 }} activeDot={{ r: 5 }} />
                  </LineChart>
                ) : (
                  <AreaChart
                    data={
                      activeTab === 'compound' ? ciResult?.projections || [] :
                      activeTab === 'sip' ? sipResult?.projections || [] :
                      activeTab === 'goal' ? goalResult?.projections || [] :
                      activeTab === 'stepup' ? suResult?.projections || [] : []
                    }
                    margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" stroke="#94a3b8" tickLine={false} />
                    <YAxis stroke="#94a3b8" tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), '']} labelFormatter={(label) => `Year ${label}`} />
                    <Area type="monotone" dataKey="maturity_amount" stroke="#2563eb" strokeWidth={2} fill="url(#colorMaturity)" fillOpacity={0.06} />
                    <Area type="monotone" dataKey="invested_amount" stroke="#94a3b8" strokeWidth={1.5} fill="#f1f5f9" fillOpacity={0.2} />
                    {showInflationAdjusted && (
                      <Area type="monotone" dataKey="purchasing_power" stroke="#0ea5e9" strokeWidth={1.5} strokeDasharray="3 3" fill="none" />
                    )}
                    <defs>
                      <linearGradient id="colorMaturity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. YEAR-BY-YEAR DETAILED TABLE */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Projection Breakdown Ledger</h4>
                <p className="text-xxs text-slate-500">Amortization details computed annually</p>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-100 z-10">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Year</th>
                    <th className="px-6 py-3 font-semibold text-right">Invested Amount</th>
                    <th className="px-6 py-3 font-semibold text-right">Returns Earned</th>
                    <th className="px-6 py-3 font-semibold text-right">Maturity Balance</th>
                    {showInflationAdjusted && activeTab !== 'compare' && activeTab !== 'inflation' && (
                      <th className="px-6 py-3 font-semibold text-right text-sky-600">Today's Worth</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  {/* Ledger content */}
                  {activeTab === 'compound' && ciResult?.projections.map((p: any) => (
                    <tr key={p.year} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-2.5 font-semibold text-slate-800">Yr {p.year}</td>
                      <td className="px-6 py-2.5 text-right">{formatCurrency(p.invested_amount)}</td>
                      <td className="px-6 py-2.5 text-right text-blue-600">+{formatCurrency(p.interest_earned)}</td>
                      <td className="px-6 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(p.maturity_amount)}</td>
                      {showInflationAdjusted && (
                        <td className="px-6 py-2.5 text-right font-semibold text-sky-600">{formatCurrency(p.purchasing_power)}</td>
                      )}
                    </tr>
                  ))}

                  {activeTab === 'sip' && sipResult?.projections.map((p: any) => (
                    <tr key={p.year} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-2.5 font-semibold text-slate-800">Yr {p.year}</td>
                      <td className="px-6 py-2.5 text-right">{formatCurrency(p.invested_amount)}</td>
                      <td className="px-6 py-2.5 text-right text-blue-600">+{formatCurrency(p.interest_earned)}</td>
                      <td className="px-6 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(p.maturity_amount)}</td>
                      {showInflationAdjusted && (
                        <td className="px-6 py-2.5 text-right font-semibold text-sky-600">{formatCurrency(p.purchasing_power)}</td>
                      )}
                    </tr>
                  ))}

                  {activeTab === 'goal' && goalResult?.projections.map((p: any) => (
                    <tr key={p.year} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-2.5 font-semibold text-slate-800">Yr {p.year}</td>
                      <td className="px-6 py-2.5 text-right">{formatCurrency(p.invested_amount)}</td>
                      <td className="px-6 py-2.5 text-right text-blue-600">+{formatCurrency(p.interest_earned)}</td>
                      <td className="px-6 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(p.maturity_amount)}</td>
                      {showInflationAdjusted && (
                        <td className="px-6 py-2.5 text-right font-semibold text-sky-600">{formatCurrency(p.purchasing_power)}</td>
                      )}
                    </tr>
                  ))}

                  {activeTab === 'stepup' && suResult?.projections.map((p: any) => (
                    <tr key={p.year} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-2.5 font-semibold text-slate-800">Yr {p.year}</td>
                      <td className="px-6 py-2.5 text-right">{formatCurrency(p.invested_amount)}</td>
                      <td className="px-6 py-2.5 text-right text-blue-600">+{formatCurrency(p.interest_earned)}</td>
                      <td className="px-6 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(p.maturity_amount)}</td>
                      {showInflationAdjusted && (
                        <td className="px-6 py-2.5 text-right font-semibold text-sky-600">{formatCurrency(p.purchasing_power)}</td>
                      )}
                    </tr>
                  ))}

                  {activeTab === 'compare' && comparisonResult?.combined.map((row: any) => (
                    <tr key={row.year} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-2.5 font-semibold text-slate-800">Yr {row.year}</td>
                      <td className="px-6 py-2.5 text-right font-semibold text-blue-600">{formatCurrency(row.scenario1_maturity)}</td>
                      <td className="px-6 py-2.5 text-right font-semibold text-slate-600">{formatCurrency(row.scenario2_maturity)}</td>
                      <td className="px-6 py-2.5 text-right font-bold text-slate-900" colSpan={2}>
                        Diff: {formatCurrency(Math.abs(row.scenario1_maturity - row.scenario2_maturity))}
                      </td>
                    </tr>
                  ))}

                  {activeTab === 'inflation' && Array.from({ length: infDuration }, (_, index) => {
                    const year = index + 1;
                    const infDec = infRate / 100;
                    const futureVal = infAmount;
                    const presentVal = futureVal / Math.pow(1 + infDec, year);
                    return (
                      <tr key={year} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-2.5 font-semibold text-slate-800">Yr {year}</td>
                        <td className="px-6 py-2.5 text-right">{formatCurrency(futureVal)}</td>
                        <td className="px-6 py-2.5 text-right text-red-500">-{formatCurrency(futureVal - presentVal)}</td>
                        <td className="px-6 py-2.5 text-right font-semibold text-blue-600">{formatCurrency(presentVal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
