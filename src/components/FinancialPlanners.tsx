/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Plus, 
  TrendingUp, 
  ShieldAlert, 
  DollarSign, 
  Percent, 
  Clock, 
  Flame, 
  Briefcase, 
  Calculator, 
  RotateCcw,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

interface FinancialPlannersProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

type PlannerTab = 'emergency' | 'fire' | 'emi' | 'loan_vs_invest' | 'tax' | 'monte_carlo';

export default function FinancialPlanners({ showToast }: FinancialPlannersProps) {
  const [activeTab, setActiveTab] = useState<PlannerTab>('emergency');

  // --- 1. Emergency Fund State ---
  const [emExpenses, setEmExpenses] = useState('');
  const [emMonths, setEmMonths] = useState('6');
  const [emCurrent, setEmCurrent] = useState('');
  const [emResult, setEmResult] = useState<{ target: number; deficit: number; status: string } | null>(null);

  // --- 2. FIRE Calculator State ---
  const [fireExpenses, setFireExpenses] = useState('');
  const [fireCurrent, setFireCurrent] = useState('');
  const [fireReturn, setFireReturn] = useState('8');
  const [fireSWR, setFireSWR] = useState('4'); // Safe Withdrawal Rate %
  const [fireMonthlySaving, setFireMonthlySaving] = useState('');
  const [fireResult, setFireResult] = useState<any>(null);

  // --- 3. EMI & Loan Calculator State ---
  const [loanAmount, setLoanAmount] = useState('');
  const [loanTerm, setLoanTerm] = useState('5'); // years
  const [loanRate, setLoanRate] = useState('');
  const [loanResult, setLoanResult] = useState<any>(null);

  // --- 4. Loan vs Invest State ---
  const [lvDebtRate, setLvDebtRate] = useState('');
  const [lvInvestReturn, setLvInvestReturn] = useState('');
  const [lvAmount, setLvAmount] = useState('');
  const [lvResult, setLvResult] = useState<any>(null);

  // --- 5. Tax Planning State ---
  const [taxIncome, setTaxIncome] = useState('');
  const [taxDeductions, setTaxDeductions] = useState('');
  const [taxResult, setTaxResult] = useState<any>(null);

  // --- 6. Monte Carlo / Scenario Simulator ---
  const [mcStarting, setMcStarting] = useState('');
  const [mcMonthly, setMcMonthly] = useState('');
  const [mcYears, setMcYears] = useState('15');
  const [mcMeanReturn, setMcMeanReturn] = useState('8');
  const [mcVolatility, setMcVolatility] = useState('15'); // standard deviation %
  const [mcResult, setMcResult] = useState<any>(null);

  useEffect(() => {
    calculateEmergency();
    calculateFIRE();
    calculateEMI();
    calculateLoanVsInvest();
    calculateTax();
    calculateMonteCarlo();
  }, [
    emExpenses, emMonths, emCurrent,
    fireExpenses, fireCurrent, fireReturn, fireSWR, fireMonthlySaving,
    loanAmount, loanTerm, loanRate,
    lvDebtRate, lvInvestReturn, lvAmount,
    taxIncome, taxDeductions,
    mcStarting, mcMonthly, mcYears, mcMeanReturn, mcVolatility
  ]);

  // Calculations
  const calculateEmergency = () => {
    const expenses = Number(emExpenses);
    if (!expenses || expenses <= 0) {
      setEmResult(null);
      return;
    }
    const months = Number(emMonths) || 6;
    const current = Number(emCurrent) || 0;

    const target = expenses * months;
    const deficit = Math.max(0, target - current);
    const pct = target > 0 ? Math.round((current / target) * 100) : 100;
    
    let status = 'Vulnerable';
    if (pct >= 100) status = 'Fully Shielded';
    else if (pct >= 70) status = 'Partially Shielded';

    setEmResult({ target, deficit, status });
  };

  const calculateFIRE = () => {
    const expenses = Number(fireExpenses);
    if (!expenses || expenses <= 0) {
      setFireResult(null);
      return;
    }
    const current = Number(fireCurrent) || 0;
    const rate = (Number(fireReturn) || 8) / 100;
    const swr = (Number(fireSWR) || 4) / 100;
    const saving = Number(fireMonthlySaving) || 0;

    // FIRE Number = annual expenses / SWR
    const fireNumber = expenses / swr;
    
    // Simulate years to reach target
    let years = 0;
    let portfolio = current;
    const trajectory = [];

    trajectory.push({ year: 0, Portfolio: Math.round(portfolio), Target: Math.round(fireNumber) });

    while (portfolio < fireNumber && years < 50) {
      years++;
      portfolio = portfolio * (1 + rate) + (saving * 12);
      trajectory.push({
        year: years,
        Portfolio: Math.round(portfolio),
        Target: Math.round(fireNumber)
      });
    }

    setFireResult({
      fireNumber,
      yearsToFIRE: portfolio >= fireNumber ? years : '50+',
      finalPortfolio: portfolio,
      trajectory
    });
  };

  const calculateEMI = () => {
    const principal = Number(loanAmount);
    const rateVal = Number(loanRate);
    if (!principal || principal <= 0 || !rateVal || rateVal <= 0) {
      setLoanResult(null);
      return;
    }

    const rate = rateVal / 12 / 100;
    const n = (Number(loanTerm) || 1) * 12;

    const emi = (principal * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - principal;

    setLoanResult({
      monthlyPayment: emi,
      totalPayment,
      totalInterest
    });
  };

  const calculateLoanVsInvest = () => {
    const amount = Number(lvAmount);
    const debtRate = Number(lvDebtRate);
    const investReturn = Number(lvInvestReturn);
    if (!amount || amount <= 0 || (!debtRate && !investReturn)) {
      setLvResult(null);
      return;
    }

    // Mathematical projection: Compare saving debt rate vs growing asset rate over 10 years
    const guaranteedDebtSavings = amount * Math.pow(1 + (debtRate / 100), 10);
    const projectedInvestGrowth = amount * Math.pow(1 + (investReturn / 100), 10);

    const delta = projectedInvestGrowth - guaranteedDebtSavings;
    const recommend = investReturn - debtRate > 1.5 
      ? 'Invest the Surplus capital (Net compound yield spread justifies market risk)' 
      : 'Prepay the Debt liability (Guaranteed tax-free yield spread outweighs market risk premium)';

    setLvResult({
      guaranteedDebtSavings,
      projectedInvestGrowth,
      delta,
      recommend
    });
  };

  const calculateTax = () => {
    const grossIncome = Number(taxIncome);
    if (!grossIncome || grossIncome <= 0) {
      setTaxResult(null);
      return;
    }
    const deductions = Number(taxDeductions) || 0;
    const taxable = Math.max(0, grossIncome - deductions);

    // Simple US bracket simulation
    let estimatedTax = 0;
    if (taxable <= 11000) estimatedTax = taxable * 0.10;
    else if (taxable <= 44725) estimatedTax = 1100 + (taxable - 11000) * 0.12;
    else if (taxable <= 95375) estimatedTax = 5147 + (taxable - 44725) * 0.22;
    else estimatedTax = 16290 + (taxable - 95375) * 0.24;

    const effectiveRate = grossIncome > 0 ? (estimatedTax / grossIncome) * 100 : 0;

    setTaxResult({
      taxable,
      estimatedTax,
      effectiveRate
    });
  };

  const calculateMonteCarlo = () => {
    const principal = Number(mcStarting) || 0;
    const monthly = Number(mcMonthly) || 0;
    if (principal <= 0 && monthly <= 0) {
      setMcResult(null);
      return;
    }
    const years = Number(mcYears) || 10;
    const mean = (Number(mcMeanReturn) || 8) / 100;
    const vol = (Number(mcVolatility) || 15) / 100;

    const trajectory = [];
    let portfolioExp = principal;
    let portfolioCon = principal;
    let portfolioAgg = principal;

    trajectory.push({
      yearLabel: 'Start',
      Expected: Math.round(portfolioExp),
      Conservative: Math.round(portfolioCon),
      Aggressive: Math.round(portfolioAgg)
    });

    for (let y = 1; y <= years; y++) {
      portfolioExp = portfolioExp * (1 + mean) + (monthly * 12);
      portfolioCon = portfolioCon * (1 + (mean - vol * 0.5)) + (monthly * 12);
      portfolioAgg = portfolioAgg * (1 + (mean + vol * 0.5)) + (monthly * 12);

      trajectory.push({
        yearLabel: `Yr ${y}`,
        Expected: Math.round(portfolioExp),
        Conservative: Math.round(portfolioCon),
        Aggressive: Math.round(portfolioAgg)
      });
    }

    setMcResult({
      expectedFinal: portfolioExp,
      conFinal: portfolioCon,
      aggFinal: portfolioAgg,
      trajectory
    });
  };

  return (
    <div className="space-y-8 animate-fade-in" id="financial-planners-module">
      
      {/* Tab Selectors */}
      <div className="border-b border-gray-100 pb-px">
        <div className="flex gap-2 overflow-x-auto py-1">
          {[
            { id: 'emergency', label: 'Emergency Fund Planner', icon: <ShieldAlert className="w-4 h-4" /> },
            { id: 'fire', label: 'FIRE Calculator', icon: <Flame className="w-4 h-4" /> },
            { id: 'emi', label: 'EMI Loan Planner', icon: <Calculator className="w-4 h-4" /> },
            { id: 'loan_vs_invest', label: 'Loan vs Invest Decision', icon: <Clock className="w-4 h-4" /> },
            { id: 'tax', label: 'Tax Estimator', icon: <Percent className="w-4 h-4" /> },
            { id: 'monte_carlo', label: 'Monte Carlo Simulator', icon: <TrendingUp className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-sans font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* INPUTS COLUMN (LHS) */}
        <div className="lg:col-span-4 bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs h-fit">
          <h3 className="text-sm font-sans font-semibold text-gray-900 mb-4 flex items-center gap-2">
            Configure Parameters
          </h3>

          {/* 1. Emergency Fund Form */}
          {activeTab === 'emergency' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Monthly Cost of Living ($)</label>
                <input 
                  type="number" 
                  value={emExpenses} 
                  onChange={(e) => setEmExpenses(e.target.value)}
                  placeholder="e.g. 3000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Reserve Tenure (Months)</label>
                <select 
                  value={emMonths} 
                  onChange={(e) => setEmMonths(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="3">3 Months (Standard Liquidity)</option>
                  <option value="6">6 Months (Strong Capital Cushion)</option>
                  <option value="9">9 Months (Comprehensive Shield)</option>
                  <option value="12">12 Months (Absolute Preservation)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Current Liquidity Stash ($)</label>
                <input 
                  type="number" 
                  value={emCurrent} 
                  onChange={(e) => setEmCurrent(e.target.value)}
                  placeholder="e.g. 8000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}

          {/* 2. FIRE Calculator Form */}
          {activeTab === 'fire' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Annual Post-FIRE Expenses ($)</label>
                <input 
                  type="number" 
                  value={fireExpenses} 
                  onChange={(e) => setFireExpenses(e.target.value)}
                  placeholder="e.g. 45000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Current Saved Net Worth ($)</label>
                <input 
                  type="number" 
                  value={fireCurrent} 
                  onChange={(e) => setFireCurrent(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Monthly Wealth Contribution ($)</label>
                <input 
                  type="number" 
                  value={fireMonthlySaving} 
                  onChange={(e) => setFireMonthlySaving(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-gray-500 block mb-1">Portfolio Return %</label>
                  <input 
                    type="number" 
                    value={fireReturn} 
                    onChange={(e) => setFireReturn(e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-500 block mb-1">Safe SWR %</label>
                  <input 
                    type="number" 
                    value={fireSWR} 
                    onChange={(e) => setFireSWR(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. EMI Form */}
          {activeTab === 'emi' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Total Loan Principal ($)</label>
                <input 
                  type="number" 
                  value={loanAmount} 
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder="e.g. 35000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Tenure (Years)</label>
                <input 
                  type="number" 
                  value={loanTerm} 
                  onChange={(e) => setLoanTerm(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">APR Interest Rate %</label>
                <input 
                  type="number" 
                  value={loanRate} 
                  onChange={(e) => setLoanRate(e.target.value)}
                  placeholder="e.g. 6.5"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  step="0.1"
                />
              </div>
            </div>
          )}

          {/* 4. Loan vs Invest Form */}
          {activeTab === 'loan_vs_invest' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Amount of Capital in Question ($)</label>
                <input 
                  type="number" 
                  value={lvAmount} 
                  onChange={(e) => setLvAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Loan Interest APR %</label>
                <input 
                  type="number" 
                  value={lvDebtRate} 
                  onChange={(e) => setLvDebtRate(e.target.value)}
                  placeholder="e.g. 6.8"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  step="0.1"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Projected Investment Yield %</label>
                <input 
                  type="number" 
                  value={lvInvestReturn} 
                  onChange={(e) => setLvInvestReturn(e.target.value)}
                  placeholder="e.g. 9.0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  step="0.1"
                />
              </div>
            </div>
          )}

          {/* 5. Tax Planning Form */}
          {activeTab === 'tax' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Gross Annual Income ($)</label>
                <input 
                  type="number" 
                  value={taxIncome} 
                  onChange={(e) => setTaxIncome(e.target.value)}
                  placeholder="e.g. 95000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Itemized Deductions ($)</label>
                <input 
                  type="number" 
                  value={taxDeductions} 
                  onChange={(e) => setTaxDeductions(e.target.value)}
                  placeholder="e.g. 12000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}

          {/* 6. Monte Carlo Form */}
          {activeTab === 'monte_carlo' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Initial Principal Base ($)</label>
                <input 
                  type="number" 
                  value={mcStarting} 
                  onChange={(e) => setMcStarting(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Monthly SIP Input ($)</label>
                <input 
                  type="number" 
                  value={mcMonthly} 
                  onChange={(e) => setMcMonthly(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-1">Duration Tenure (Years)</label>
                <input 
                  type="number" 
                  value={mcYears} 
                  onChange={(e) => setMcYears(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-gray-500 block mb-1">Mean Return %</label>
                  <input 
                    type="number" 
                    value={mcMeanReturn} 
                    onChange={(e) => setMcMeanReturn(e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-500 block mb-1">Std Volatility %</label>
                  <input 
                    type="number" 
                    value={mcVolatility} 
                    onChange={(e) => setMcVolatility(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RESULTS AND CHARTS COLUMN (RHS) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Emergency Fund Output */}
          {activeTab === 'emergency' && !emResult && (
            <div className="bg-white rounded-lg p-10 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-gray-800">Emergency Fund Planner</h4>
              <p className="text-xs text-gray-500 max-w-sm">
                Enter your monthly cost of living and current liquid savings on the left to calculate your required protection cushion and deficit.
              </p>
            </div>
          )}

          {activeTab === 'emergency' && emResult && (
            <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-sans font-semibold text-gray-900">Emergency Protection Quotient</h3>
                <p className="text-xs text-gray-400 mt-0.5">Recommended reserves needed to absorb life disruptions</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Target Cushion Required</span>
                  <p className="text-2xl font-sans font-semibold text-gray-900 mt-1">${emResult.target.toLocaleString()}</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Cushion Deficit</span>
                  <p className={`text-2xl font-sans font-semibold mt-1 ${emResult.deficit > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                    ${emResult.deficit.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Protection State</span>
                  <p className="text-lg font-sans font-semibold text-blue-600 mt-1.5">{emResult.status}</p>
                </div>
              </div>

              {/* Graphical slider bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-gray-500">
                  <span>Current stash: ${Number(emCurrent).toLocaleString()}</span>
                  <span>Target: ${emResult.target.toLocaleString()}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      emResult.deficit === 0 ? 'bg-blue-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, (Number(emCurrent) / Math.max(1, emResult.target)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. FIRE Calculator Output */}
          {activeTab === 'fire' && !fireResult && (
            <div className="bg-white rounded-lg p-10 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Flame className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-gray-800">FIRE Calculator</h4>
              <p className="text-xs text-gray-500 max-w-sm">
                Enter your annual post-retirement expenses on the left to project your FIRE target number and estimated timeline to financial independence.
              </p>
            </div>
          )}

          {activeTab === 'fire' && fireResult && (
            <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-sans font-semibold text-gray-900">FIRE Planning Vector</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Simulating Financial Independence Retire Early milestone timelines</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold font-mono">
                  SWR: {fireSWR}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Your FIRE Wealth Number</span>
                  <p className="text-2xl font-sans font-semibold text-gray-900 mt-1">${Math.round(fireResult.fireNumber).toLocaleString()}</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Estimated Years of Active Saving</span>
                  <p className="text-2xl font-sans font-semibold text-blue-600 mt-1">{fireResult.yearsToFIRE} Years</p>
                </div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fireResult.trajectory} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} label={{ value: 'Years of Growth', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} formatter={(v: any) => `$${v / 1000}k`} />
                    <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                    <Legend />
                    <Area type="monotone" dataKey="Portfolio" stroke="#2563eb" fill="#eff6ff" name="Accumulating Wealth" />
                    <Area type="monotone" dataKey="Target" stroke="#f59e0b" fill="none" strokeDasharray="5 5" name="Required FIRE Cap" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 3. EMI & Loan Calculator Output */}
          {activeTab === 'emi' && !loanResult && (
            <div className="bg-white rounded-lg p-10 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calculator className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-gray-800">EMI Loan Planner</h4>
              <p className="text-xs text-gray-500 max-w-sm">
                Enter your total loan principal and APR interest rate on the left to calculate monthly payments and total interest cost.
              </p>
            </div>
          )}

          {activeTab === 'emi' && loanResult && (
            <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-sans font-semibold text-gray-900">EMI Amortization Metrics</h3>
                <p className="text-xs text-gray-400 mt-0.5">Equal Monthly Installments breakdown</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 border border-slate-100 rounded-lg bg-blue-50/20">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Monthly Payment (EMI)</span>
                  <p className="text-2xl font-sans font-bold text-blue-700 mt-1">${Math.round(loanResult.monthlyPayment).toLocaleString()}</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Guaranteed Interest Cost</span>
                  <p className="text-2xl font-sans font-semibold text-red-500 mt-1">${Math.round(loanResult.totalInterest).toLocaleString()}</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Total Lifetime Outlay</span>
                  <p className="text-2xl font-sans font-semibold text-gray-900 mt-1">${Math.round(loanResult.totalPayment).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Loan vs Invest decision Engine Output */}
          {activeTab === 'loan_vs_invest' && !lvResult && (
            <div className="bg-white rounded-lg p-10 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-gray-800">Loan vs Invest Decision Engine</h4>
              <p className="text-xs text-gray-500 max-w-sm">
                Enter your loan APR, expected investment return, and capital amount to compare guaranteed debt savings against compounding returns.
              </p>
            </div>
          )}

          {activeTab === 'loan_vs_invest' && lvResult && (
            <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-sans font-semibold text-gray-900">Surplus Allocation Advisory</h3>
                <p className="text-xs text-gray-400 mt-0.5">Evaluating guaranteed debt savings vs compound opportunity yields over 10-years</p>
              </div>

              <div className="p-5 border border-blue-100 bg-blue-50/30 rounded-lg space-y-2">
                <span className="text-xs font-mono font-bold text-blue-800 uppercase flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" /> Mathematical Optimization Proposal
                </span>
                <p className="text-sm font-sans font-bold text-gray-900 leading-relaxed">
                  {lvResult.recommend}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-sans">
                <div className="p-4 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Guaranteed Debt-Savings value</span>
                  <span className="text-xl font-bold text-red-500">${Math.round(lvResult.guaranteedDebtSavings).toLocaleString()}</span>
                  <p className="text-[11px] text-gray-400 mt-1.5">Accrued yield by avoiding {lvDebtRate}% APR debt charges over 10 years.</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Projected Investment Growth value</span>
                  <span className="text-xl font-bold text-blue-600">${Math.round(lvResult.projectedInvestGrowth).toLocaleString()}</span>
                  <p className="text-[11px] text-gray-400 mt-1.5">Projected growth compounding capital at {lvInvestReturn}% APR over 10 years.</p>
                </div>
              </div>
            </div>
          )}

          {/* 5. Tax Planner Output */}
          {activeTab === 'tax' && !taxResult && (
            <div className="bg-white rounded-lg p-10 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Percent className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-gray-800">Tax Estimator</h4>
              <p className="text-xs text-gray-500 max-w-sm">
                Enter your gross annual income on the left to simulate estimated federal tax brackets and effective tax rate.
              </p>
            </div>
          )}

          {activeTab === 'tax' && taxResult && (
            <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-sans font-semibold text-gray-900">Estimated Annual Tax Metrics</h3>
                <p className="text-xs text-gray-400 mt-0.5">Simplified progressive tax bracket simulator</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Taxable Net Base</span>
                  <p className="text-2xl font-sans font-semibold text-gray-900 mt-1">${Math.round(taxResult.taxable).toLocaleString()}</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-lg bg-red-50/20">
                  <span className="text-[10px] font-mono text-red-700 uppercase">Estimated Liability</span>
                  <p className="text-2xl font-sans font-semibold text-red-600 mt-1">${Math.round(taxResult.estimatedTax).toLocaleString()}</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Effective Rate</span>
                  <p className="text-2xl font-sans font-bold text-blue-600 mt-1">{taxResult.effectiveRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}

          {/* 6. Monte Carlo Scenario Simulator Output */}
          {activeTab === 'monte_carlo' && !mcResult && (
            <div className="bg-white rounded-lg p-10 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-gray-800">Monte Carlo Volatility Simulator</h4>
              <p className="text-xs text-gray-500 max-w-sm">
                Enter your starting principal or monthly contributions on the left to project optimistic, expected, and conservative boundaries.
              </p>
            </div>
          )}

          {activeTab === 'monte_carlo' && mcResult && (
            <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-sans font-semibold text-gray-900">Monte Carlo Market Volatility Projections</h3>
                <p className="text-xs text-gray-400 mt-0.5">Projecting capital boundaries adjusting for {mcVolatility}% standard market deviation</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-blue-500 uppercase">Aggressive Market (+1 SD)</span>
                  <p className="text-xl font-sans font-bold text-blue-500 mt-1">${Math.round(mcResult.aggFinal).toLocaleString()}</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-lg bg-blue-50/20">
                  <span className="text-[10px] font-mono text-blue-700 uppercase">Expected Outcome (Mean)</span>
                  <p className="text-xl font-sans font-bold text-blue-700 mt-1">${Math.round(mcResult.expectedFinal).toLocaleString()}</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-lg">
                  <span className="text-[10px] font-mono text-red-600 uppercase">Conservative Market (-1 SD)</span>
                  <p className="text-xl font-sans font-bold text-red-500 mt-1">${Math.round(mcResult.conFinal).toLocaleString()}</p>
                </div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mcResult.trajectory} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="yearLabel" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} formatter={(v: any) => `$${v / 1000}k`} />
                    <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                    <Legend />
                    <Area type="monotone" dataKey="Aggressive" stroke="#0ea5e9" fill="#f0f9ff" fillOpacity={0.2} name="Aggressive Market" />
                    <Area type="monotone" dataKey="Expected" stroke="#2563eb" fill="#eff6ff" fillOpacity={0.3} name="Expected Performance" />
                    <Area type="monotone" dataKey="Conservative" stroke="#ef4444" fill="#fef2f2" fillOpacity={0.1} name="Conservative Market" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
