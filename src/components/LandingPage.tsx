/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Shield,
  Briefcase,
  Lock,
  ArrowRight,
  Calculator,
  Compass,
  FileText,
  DollarSign,
  ChevronDown,
  Layers,
  Sparkles,
  Award,
  BarChart3,
  Sliders,
  Check
} from 'lucide-react';

interface LandingPageProps {
  currency: 'USD' | 'INR' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD';
  onCurrencyChange: (currency: 'USD' | 'INR' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD') => void;
  onOpenAuth: (portal: 'client' | 'admin') => void;
}

export default function LandingPage({ currency, onCurrencyChange, onOpenAuth }: LandingPageProps) {
  // Currency symbols mapping
  const currencySymbols: Record<string, string> = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'CA$',
    AUD: 'A$',
  };
  const sym = currencySymbols[currency] || '$';

  // Live Interactive Wealth Simulator State
  const [initialCapital, setInitialCapital] = useState(25000);
  const [monthlyAddition, setMonthlyAddition] = useState(1200);
  const [years, setYears] = useState(20);
  const [expectedReturn, setExpectedReturn] = useState(8.5);
  const [inflationRate, setInflationRate] = useState(2.8);

  // FAQ open state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Calculations for Simulator
  const simulationResults = useMemo(() => {
    const monthlyRate = expectedReturn / 100 / 12;
    const totalMonths = years * 12;
    let nominalTotal = initialCapital;
    const trajectoryData: { year: number; invested: number; total: number; realTotal: number }[] = [];

    let currentInvested = initialCapital;
    trajectoryData.push({
      year: 0,
      invested: currentInvested,
      total: nominalTotal,
      realTotal: nominalTotal,
    });

    for (let m = 1; m <= totalMonths; m++) {
      nominalTotal = nominalTotal * (1 + monthlyRate) + monthlyAddition;
      currentInvested += monthlyAddition;

      if (m % 12 === 0) {
        const yr = m / 12;
        // Discount nominal by inflation
        const inflationFactor = Math.pow(1 + inflationRate / 100, yr);
        const realTotal = nominalTotal / inflationFactor;
        trajectoryData.push({
          year: yr,
          invested: Math.round(currentInvested),
          total: Math.round(nominalTotal),
          realTotal: Math.round(realTotal),
        });
      }
    }

    const totalInvested = initialCapital + monthlyAddition * totalMonths;
    const compoundGrowth = Math.max(0, nominalTotal - totalInvested);
    const inflationFactor = Math.pow(1 + inflationRate / 100, years);
    const realPurchasingPower = nominalTotal / inflationFactor;
    const safeMonthlyWithdrawal = (nominalTotal * 0.04) / 12;

    return {
      nominalTotal: Math.round(nominalTotal),
      totalInvested: Math.round(totalInvested),
      compoundGrowth: Math.round(compoundGrowth),
      realPurchasingPower: Math.round(realPurchasingPower),
      safeMonthlyWithdrawal: Math.round(safeMonthlyWithdrawal),
      trajectoryData,
    };
  }, [initialCapital, monthlyAddition, years, expectedReturn, inflationRate]);

  const formatAmount = (num: number) => {
    return `${sym}${num.toLocaleString('en-US')}`;
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-600 selection:text-white flex flex-col">
      
      {/* 1. TOP BAR CONTRACT: Brand Wordmark — Nav Links — Actions */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Briefcase className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-950 font-sans">
              WealthWise
            </span>
          </div>

          {/* Zone 2: 4-6 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600 tracking-wide">
            <a href="#simulator" className="hover:text-slate-950 transition-colors">
              Live Simulator
            </a>
            <a href="#capabilities" className="hover:text-slate-950 transition-colors">
              Platform Architecture
            </a>
            <a href="#solutions" className="hover:text-slate-950 transition-colors">
              Planning Suites
            </a>
            <a href="#security" className="hover:text-slate-950 transition-colors">
              Security & Isolation
            </a>
            <a href="#faq" className="hover:text-slate-950 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Zone 3: Actions (Currency selector, Sign In, Primary CTA) */}
          <div className="flex items-center gap-3">
            {/* Currency selector */}
            <div className="relative">
              <select
                aria-label="Currency Selector"
                value={currency}
                onChange={(e) => onCurrencyChange(e.target.value as any)}
                className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border-none rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 cursor-pointer transition outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD (CA$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            <button
              onClick={() => onOpenAuth('client')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-950 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition whitespace-nowrap cursor-pointer"
            >
              Sign In
            </button>

            <button
              onClick={() => onOpenAuth('client')}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-lg shadow-sm transition whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 px-6 overflow-hidden border-b border-slate-100 bg-gradient-to-b from-slate-50/50 via-white to-white">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          
          {/* Unboxed editorial kicker */}
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
            <span>Private Wealth Modeling</span>
            <span aria-hidden="true">·</span>
            <span>Multi-Horizon Architecture</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Knowledge Encryption</span>
          </div>

          {/* Display Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.12] text-balance max-w-4xl mx-auto">
            Institutional-Grade Wealth Architecture for Private Portfolios.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed text-balance">
            Model compounding trajectories, stress-test macroeconomic inflation shocks, plan tax-efficient retirement drawdowns, and track consolidated net worth with algorithmic precision.
          </p>

          {/* Primary Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onOpenAuth('client')}
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold text-white bg-slate-950 hover:bg-slate-800 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open Client Workspace</span>
              <ArrowRight className="w-4 h-4 text-blue-400" />
            </button>

            <a
              href="#simulator"
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-slate-700 hover:text-slate-950 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Test Live Simulator</span>
            </a>

            <button
              onClick={() => onOpenAuth('admin')}
              className="w-full sm:w-auto px-4 py-3.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span>Admin Portal</span>
            </button>
          </div>

          {/* Quantitative Architecture Specifications Banner */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-200/70 text-left">
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-950 font-mono tracking-tight">
                Real-Time
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Dynamic Trajectory Engine
              </p>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-950 font-mono tracking-tight">
                Multi-Asset
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Equities, Debt, Gold & Liquid
              </p>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-950 font-mono tracking-tight">
                Multi-Currency
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Global FX & Locale Formatting
              </p>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-950 font-mono tracking-tight">
                256-Bit Salted
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                PBKDF2 Cryptographic Security
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. INTERACTIVE LIVE WEALTH SIMULATOR SECTION */}
      <section id="simulator" className="py-20 px-6 bg-slate-900 text-white scroll-mt-12">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 tracking-wider uppercase">
              <Sparkles className="w-4 h-4" />
              <span>Real-Time Engine</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Test Compounding Trajectory & Purchasing Power
            </h2>
            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
              Adjust initial capital, regular contributions, time horizon, and inflation rate below to observe the terminal nominal value alongside the true inflation-discounted real wealth.
            </p>
          </div>

          {/* Simulator Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Controls (5 cols) */}
            <div className="lg:col-span-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/60 pb-3">
                Simulation Variables
              </h3>

              {/* Initial Capital */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Initial Capital</span>
                  <span className="text-white font-mono tabular-nums">{formatAmount(initialCapital)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200000"
                  step="5000"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>{sym}0</span>
                  <span>{formatAmount(100000)}</span>
                  <span>{formatAmount(200000)}</span>
                </div>
              </div>

              {/* Monthly Contribution */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Monthly Contribution</span>
                  <span className="text-white font-mono tabular-nums">{formatAmount(monthlyAddition)}/mo</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={monthlyAddition}
                  onChange={(e) => setMonthlyAddition(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>{formatAmount(100)}</span>
                  <span>{formatAmount(5000)}</span>
                  <span>{formatAmount(10000)}</span>
                </div>
              </div>

              {/* Investment Horizon */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Time Horizon</span>
                  <span className="text-white font-mono tabular-nums">{years} Years</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="40"
                  step="1"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>3 yrs</span>
                  <span>20 yrs</span>
                  <span>40 yrs</span>
                </div>
              </div>

              {/* Expected Return */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Annual Return (Nominal)</span>
                  <span className="text-emerald-400 font-mono tabular-nums">{expectedReturn}%</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="16"
                  step="0.5"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>3% (Conservative)</span>
                  <span>8.5% (Market Avg)</span>
                  <span>16% (Aggressive)</span>
                </div>
              </div>

              {/* Inflation Rate */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Estimated Inflation</span>
                  <span className="text-amber-400 font-mono tabular-nums">{inflationRate}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="7"
                  step="0.2"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>1.0%</span>
                  <span>2.8% (Target)</span>
                  <span>7.0% (High)</span>
                </div>
              </div>

            </div>

            {/* Right Results & Trajectory Visualization (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Primary Output Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 space-y-1">
                  <span className="text-xs text-slate-400 font-medium">Terminal Nominal Portfolio</span>
                  <div className="text-3xl font-extrabold text-white font-mono tabular-nums">
                    {formatAmount(simulationResults.nominalTotal)}
                  </div>
                  <p className="text-xxs text-slate-400 font-mono pt-1">
                    At {expectedReturn}% annualized growth over {years} yrs
                  </p>
                </div>

                <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 space-y-1">
                  <span className="text-xs text-amber-300/90 font-medium">Real Purchasing Power</span>
                  <div className="text-3xl font-extrabold text-amber-400 font-mono tabular-nums">
                    {formatAmount(simulationResults.realPurchasingPower)}
                  </div>
                  <p className="text-xxs text-slate-400 font-mono pt-1">
                    Adjusted for {inflationRate}% compounding inflation
                  </p>
                </div>

              </div>

              {/* Breakdown Metric Row */}
              <div className="grid grid-cols-3 gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 text-center">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Out-of-Pocket</span>
                  <span className="text-sm sm:text-base font-bold text-slate-200 font-mono tabular-nums">
                    {formatAmount(simulationResults.totalInvested)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-emerald-400 block font-medium">Compound Interest</span>
                  <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono tabular-nums">
                    +{formatAmount(simulationResults.compoundGrowth)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-blue-400 block font-medium">4% SWR Income</span>
                  <span className="text-sm sm:text-base font-bold text-blue-300 font-mono tabular-nums">
                    {formatAmount(simulationResults.safeMonthlyWithdrawal)}/mo
                  </span>
                </div>
              </div>

              {/* Progress Proportion Visualizer */}
              <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Wealth Composition</span>
                  <span className="font-mono tabular-nums">
                    {Math.round((simulationResults.compoundGrowth / (simulationResults.nominalTotal || 1)) * 100)}% Growth
                  </span>
                </div>

                {/* Split bar */}
                <div className="w-full h-3.5 bg-slate-700 rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${Math.min(100, Math.round((simulationResults.totalInvested / (simulationResults.nominalTotal || 1)) * 100))}%`
                    }}
                    className="bg-slate-400 transition-all duration-300"
                    title={`Principal: ${formatAmount(simulationResults.totalInvested)}`}
                  />
                  <div
                    style={{
                      width: `${Math.max(0, 100 - Math.round((simulationResults.totalInvested / (simulationResults.nominalTotal || 1)) * 100))}%`
                    }}
                    className="bg-emerald-500 transition-all duration-300"
                    title={`Growth: ${formatAmount(simulationResults.compoundGrowth)}`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block" />
                    <span>Principal Deposited ({formatAmount(simulationResults.totalInvested)})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                    <span>Market Appreciation ({formatAmount(simulationResults.compoundGrowth)})</span>
                  </div>
                </div>
              </div>

              {/* Conversion CTA to save in workspace */}
              <div className="p-5 bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Save this Model to Your Private Workspace</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Sign in to track real portfolios, set target milestones, and stress-test historical drawdowns.
                  </p>
                </div>
                <button
                  onClick={() => onOpenAuth('client')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition whitespace-nowrap cursor-pointer shrink-0"
                >
                  Create Client Account
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 4. PLATFORM ARCHITECTURE (EDITORIAL BENTO GRID) */}
      <section id="capabilities" className="py-24 px-6 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 tracking-wider uppercase">
              <Layers className="w-4 h-4" />
              <span>Full-Stack Financial Infrastructure</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              The Six Core Pillars of Wealth Architecture
            </h2>
            <p className="text-base text-slate-600 leading-relaxed font-normal">
              Unlike simplistic budgeting apps, WealthWise couples balance sheet accounting with forward-looking stochastic simulation to manage private wealth with institutional rigour.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* 01. Net Worth Tracker */}
            <div className="p-7 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition shadow-2xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Multi-Horizon Net Worth Modeling
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consolidate liquid reserves, equities, real estate holdings, private assets, and outstanding liabilities into an unified real-time solvency balance sheet.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
                <span>Asset/Debt Ratios</span>
                <span aria-hidden="true">·</span>
                <span>Equity Distribution</span>
                <span aria-hidden="true">·</span>
                <span>Liquid Cushion</span>
              </div>
            </div>

            {/* 02. Interactive Calculators */}
            <div className="p-7 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition shadow-2xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Systematic SIP & Compound Compasses
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Calculate granular compounding frequencies (daily, monthly, quarterly) and simulate step-up contributions with automated inflation drag adjustments.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
                <span>Step-Up Contributions</span>
                <span aria-hidden="true">·</span>
                <span>Frequency Modeling</span>
                <span aria-hidden="true">·</span>
                <span>Target Planning</span>
              </div>
            </div>

            {/* 03. Budget & Expenses */}
            <div className="p-7 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition shadow-2xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Cash Flow Telemetry & 50/30/20 Audits
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Categorize expenses into Fixed Commitments, Discretionary Outlays, and Strategic Investments. Detect cash flow leakage before it erodes savings velocity.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
                <span>Burn Rate Analysis</span>
                <span aria-hidden="true">·</span>
                <span>Monthly Surplus</span>
                <span aria-hidden="true">·</span>
                <span>Category Caps</span>
              </div>
            </div>

            {/* 04. Debt Amortization */}
            <div className="p-7 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition shadow-2xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                04
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Snowball vs. Avalanche Debt Optimization
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Compare psychological momentum (snowball) versus pure interest minimization (avalanche) across credit lines, mortgages, and consumer debt to accelerate zero-debt dates.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
                <span>Interest Saved</span>
                <span aria-hidden="true">·</span>
                <span>Payoff Acceleration</span>
                <span aria-hidden="true">·</span>
                <span>Amortization Tables</span>
              </div>
            </div>

            {/* 05. Risk & Asset Mix */}
            <div className="p-7 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition shadow-2xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
                05
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Stochastic Risk Profiling & Asset Allocation
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Evaluate risk capacity versus psychological risk tolerance to balance defensive assets (Treasuries, Gold) against growth engines (Equities, Real Estate).
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
                <span>Drawdown Tolerance</span>
                <span aria-hidden="true">·</span>
                <span>Rebalancing Triggers</span>
                <span aria-hidden="true">·</span>
                <span>Correlated Risk</span>
              </div>
            </div>

            {/* 06. Reports & PDF Exports */}
            <div className="p-7 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition shadow-2xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm">
                06
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Audit-Grade Financial Disclosures & Reports
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate formatted balance sheet summaries, annual compound projections, and tax disclosure statements ready for your CPA, estate attorney, or family office review.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
                <span>PDF Generation</span>
                <span aria-hidden="true">·</span>
                <span>JSON Portability</span>
                <span aria-hidden="true">·</span>
                <span>Advisory Briefs</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 5. SOLUTIONS & WORKSPACE MODULES PREVIEW */}
      <section id="solutions" className="py-24 px-6 bg-slate-50/80 border-b border-slate-200">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 tracking-wider uppercase">
                <Compass className="w-4 h-4" />
                <span>Dedicated Applications</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                Specialized Tools Included Upon Login
              </h2>
              <p className="text-base text-slate-600 leading-relaxed font-normal">
                Once logged in, your personal workspace unlocks real data persistence across all analytical modules.
              </p>
            </div>

            <button
              onClick={() => onOpenAuth('client')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 self-start md:self-auto cursor-pointer"
            >
              <span>Sign In to Access All Tools</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1 */}
            <div className="p-6 bg-white border border-slate-200/80 rounded-2xl flex items-start gap-4 shadow-2xs hover:border-slate-300 transition">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Interactive SIP & Lump Sum Engines</h4>
                  <span className="text-[10px] text-slate-400 font-mono">WORKSPACE TOOL</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real-time sliders for recurring investments, inflation adjustments, and visual trajectory charts with exportable summary snapshots.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-6 bg-white border border-slate-200/80 rounded-2xl flex items-start gap-4 shadow-2xs hover:border-slate-300 transition">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">FIRE & Retirement Independence Planner</h4>
                  <span className="text-[10px] text-slate-400 font-mono">WORKSPACE TOOL</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Calculate your true "Financial Independence" target number using customizable safe withdrawal rates (3% - 4.5%) and desired annual retirement expenses.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-6 bg-white border border-slate-200/80 rounded-2xl flex items-start gap-4 shadow-2xs hover:border-slate-300 transition">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Mortgage & Loan Amortization Breakdown</h4>
                  <span className="text-[10px] text-slate-400 font-mono">WORKSPACE TOOL</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Simulate principal prepayment scenarios to eliminate 7+ years of interest payments on real estate mortgages and term loans.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-6 bg-white border border-slate-200/80 rounded-2xl flex items-start gap-4 shadow-2xs hover:border-slate-300 transition">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Multi-Goal Strategy Portfolio</h4>
                  <span className="text-[10px] text-slate-400 font-mono">WORKSPACE TOOL</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Save, label, and monitor multiple distinct financial blueprints concurrently: Children's Higher Ed, Secondary Residence, Venture Capital Fund.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. SECURITY, PRIVACY & ISOLATION */}
      <section id="security" className="py-24 px-6 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 tracking-wider uppercase">
              <Shield className="w-4 h-4" />
              <span>Institutional Trust Standards</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Client Confidentiality & Multi-Tenant Separation
            </h2>
            <p className="text-base text-slate-600 leading-relaxed font-normal">
              Wealth management requires absolute privacy. WealthWise implements zero-telemetry architectures and hardened server-authoritative authentication tokens.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Client-Isolated Data Stores</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                All portfolios, liabilities, and expense records are tied strictly to authenticated user IDs with salt-hashed PBKDF2 authentication tokens.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <Award className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Separate Role Auditing</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Admins have dedicated consoles with elevated security, while clients enjoy pure portfolio autonomy without third-party tracking scripts.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Complete Portability</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your data belongs to you. Export your entire financial history, asset register, and calculation matrices to PDF and JSON at any moment.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="py-24 px-6 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">
              Frequently Answered Questions
            </h2>
            <p className="text-sm text-slate-600 max-w-xl mx-auto">
              Everything you need to know about calculation mechanics, account security, and portal access.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How does WealthWise handle inflation in compound simulations?',
                a: 'WealthWise calculates both nominal future terminal wealth and true inflation-discounted purchasing power using the standard continuous formula: Real Value = Nominal Value / (1 + i)^t, where i is the annualized inflation rate and t is the horizon in years.'
              },
              {
                q: 'Are my financial calculations saved if I sign in?',
                a: 'Yes. When signed into your Client account, all investment blueprints, custom expense categories, net worth assets, and liability amortization tables are securely persisted in your private database record.'
              },
              {
                q: 'Can I switch currencies for international portfolios?',
                a: 'Yes! WealthWise supports 7 global currency formats (USD, EUR, GBP, INR, JPY, CAD, AUD) with localized symbols and number formats that propagate across every table, chart, and export.'
              },
              {
                q: 'What is the difference between Client Portal and Admin Portal?',
                a: 'The Client Portal gives individual investors and family offices full autonomy over personal assets, calculators, and plans. The Admin Portal is an elevated console for authorized operators to inspect system health, verify user registrations, and manage audit logs.'
              },
              {
                q: 'Can I export my financial plans and reports?',
                a: 'Yes, all calculations, compound tables, budget reports, and net worth balance sheets can be exported as printable PDF summaries or raw JSON files directly from your workspace.'
              }
            ].map((item, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-xl overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between text-sm font-bold text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-4 ${openFaq === idx ? 'rotate-180 text-blue-600' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 9. FINAL CONVERSION BANNER */}
      <section className="py-20 px-6 bg-slate-950 text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Take Control of Your Financial Trajectory?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Join thousands of modern investors modeling their net worth, tax allocations, and retirement timelines with WealthWise.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onOpenAuth('client')}
              className="w-full sm:w-auto px-6 py-3.5 text-xs font-bold text-slate-950 bg-white hover:bg-slate-100 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
            </button>
            <button
              onClick={() => onOpenAuth('admin')}
              className="w-full sm:w-auto px-5 py-3.5 text-xs font-semibold text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Administrator Sign In</span>
            </button>
          </div>
        </div>
      </section>

      {/* 10. QUIET FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-12 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center text-white">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className="text-sm font-bold tracking-tight text-white">
                WealthWise
              </span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider ml-2">
                Private Wealth Suite
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
              <a href="#simulator" className="hover:text-white transition">Simulator</a>
              <a href="#capabilities" className="hover:text-white transition">Architecture</a>
              <a href="#solutions" className="hover:text-white transition">Planning Modules</a>
              <a href="#security" className="hover:text-white transition">Security</a>
              <button onClick={() => onOpenAuth('client')} className="hover:text-white transition cursor-pointer">
                Client Portal
              </button>
              <button onClick={() => onOpenAuth('admin')} className="hover:text-white transition cursor-pointer">
                Admin Console
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>
              © {new Date().getFullYear()} WealthWise Private Wealth Suite. All rights reserved. Calculations are mathematical models for planning purposes.
            </p>
            <p>
              End-to-End Encrypted · Zero Third-Party Telemetry
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}
