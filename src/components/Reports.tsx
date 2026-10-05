/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  ChevronRight,
  TrendingUp,
  Award,
  DollarSign,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { InvestmentPlan, User } from '../types.js';

interface ReportsProps {
  user: User | null;
  plans: InvestmentPlan[];
  onOpenAuth: () => void;
  onNotify: (message: string, type: 'success' | 'error') => void;
  currency?: string;
}

export default function Reports({ user, plans, onOpenAuth, onNotify, currency = 'USD' }: ReportsProps) {
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

  // 1. Calculate Aggregate metrics
  const totalCount = plans.length;
  let totalInvested = 0;
  let projectedWealth = 0;
  let totalInterest = 0;

  plans.forEach((p) => {
    const lastP = p.projections[p.projections.length - 1];
    if (lastP) {
      totalInvested += lastP.invested_amount;
      projectedWealth += lastP.maturity_amount;
      totalInterest += lastP.interest_earned;
    }
  });

  // 2. Combine all projections year-by-year
  const maxYears = plans.reduce((max, p) => Math.max(max, p.financial_detail.duration), 0);
  const combinedProjections = Array.from({ length: maxYears }, (_, index) => {
    const year = index + 1;
    let yearInvested = 0;
    let yearMaturity = 0;
    let yearInterest = 0;

    plans.forEach((p) => {
      const proj = p.projections[Math.min(index, p.projections.length - 1)];
      if (proj) {
        yearInvested += proj.invested_amount;
        yearMaturity += proj.maturity_amount;
        yearInterest += proj.interest_earned;
      }
    });

    return {
      year,
      invested: yearInvested,
      maturity: yearMaturity,
      interest: yearInterest,
    };
  });

  // 3. Export Consolidated CSV
  const handleExportConsolidatedCSV = () => {
    if (plans.length === 0) {
      onNotify('No saved plans found to export.', 'error');
      return;
    }

    const headers = ['Year', 'Consolidated Invested ($)', 'Consolidated Interest Earned ($)', 'Consolidated Future Wealth ($)'];
    const rows = combinedProjections.map((p) => [
      p.year,
      p.invested,
      p.interest,
      p.maturity
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'wealthwise_consolidated_financial_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('Consolidated portfolio exported to CSV successfully.', 'success');
  };

  // 4. Trigger print of report
  const handlePrint = () => {
    if (plans.length === 0) {
      onNotify('No saved plans found to print.', 'error');
      return;
    }
    window.print();
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg border border-slate-200/80 p-8 text-center max-w-xl mx-auto space-y-4 shadow-xxs">
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg w-14 h-14 mx-auto flex items-center justify-center text-slate-400">
          <FileText className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-800">Generate Executive Financial Reports</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Log in to aggregate multi-goal calculations, export consolidated CSV spreadsheets, and compile custom-branded PDF amortization summaries.
          </p>
        </div>
        <button
          id="reports-auth-prompt-btn"
          onClick={onOpenAuth}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-lg transition cursor-pointer"
        >
          Authenticate Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Upper command row */}
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200/80 rounded-lg shadow-xxs print:hidden">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Reports Dispatcher</h4>
          <p className="text-xxs text-slate-500">Compile, download, or physically print portfolio dossiers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="print-report-btn"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF dossier</span>
          </button>
          <button
            id="export-consolidated-csv-btn"
            onClick={handleExportConsolidatedCSV}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Consolidated CSV</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div id="printable-report-card" className="bg-white rounded-lg border border-slate-200/80 p-8 shadow-xs max-w-4xl mx-auto space-y-8 relative overflow-hidden print:border-none print:shadow-none print:p-0">
        
        {/* Document watermark / header background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-slate-50 rounded-full blur-3xl -z-10" />

        {/* Executive Letterhead */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-800">
              <Sparkles className="w-6 h-6 text-blue-600 print:text-slate-800" />
              <span className="text-xl font-black uppercase tracking-wider font-sans">WealthWise</span>
            </div>
            <p className="text-xxs text-slate-500 font-medium">Plan Smart. Grow Wealth. • https://ai.studio/build</p>
          </div>

          <div className="text-right space-y-0.5 text-xxs font-semibold text-slate-500">
            <span className="text-slate-800 block font-bold">PORTFOLIO DOSSIER</span>
            <span>Date Generated: {new Date().toLocaleDateString()}</span>
            <span>Client ID: {user.email}</span>
          </div>
        </div>

        {/* 1. Executive Summary Text */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">I. Executive Summation</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            This financial plan dossier compiles the client's current registered and saved investment portfolios. Over a projected maximum compounding time horizon of <span className="font-bold text-slate-800">{maxYears} Years</span>, the portfolio is model-projected to grow from a baseline principal contribution of <span className="font-bold text-slate-800">{formatCurrency(totalInvested)}</span> to a final wealth maturation corpus of <span className="font-bold text-blue-600">{formatCurrency(projectedWealth)}</span>, representing an overall capital accretion multiplier of <span className="font-bold text-slate-800">{(projectedWealth / Math.max(1, totalInvested)).toFixed(1)}x</span>.
          </p>
        </div>

        {/* 2. Aggregate KPI Metrics */}
        <div className="grid grid-cols-3 gap-4 border-y border-slate-150 py-6">
          <div>
            <span className="text-xxs font-bold text-slate-400 block uppercase tracking-wider">Consolidated Principal Paid</span>
            <span className="text-base sm:text-xl font-bold text-slate-800 block mt-1 font-mono">{formatCurrency(totalInvested)}</span>
            <p className="text-xxs text-slate-400 mt-1">Total cash capital commitments</p>
          </div>
          <div>
            <span className="text-xxs font-bold text-slate-400 block uppercase tracking-wider">Consolidated Return Yield</span>
            <span className="text-base sm:text-xl font-bold text-blue-600 block mt-1 font-mono">+{formatCurrency(totalInterest)}</span>
            <p className="text-xxs text-slate-400 mt-1">Acrued compound interest gains</p>
          </div>
          <div>
            <span className="text-xxs font-bold text-slate-400 block uppercase tracking-wider">Maturation Portfolio Valuation</span>
            <span className="text-base sm:text-xl font-bold text-slate-900 block mt-1 font-mono">{formatCurrency(projectedWealth)}</span>
            <p className="text-xxs text-slate-400 mt-1">Projected net-worth value</p>
          </div>
        </div>

        {/* 3. Breakdown of Individual saved Accounts */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">II. Asset Allocation Matrix</h3>
          
          <div className="border border-slate-200/80 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xxs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-2.5">Goal Account Name</th>
                  <th className="px-6 py-2.5">Calculator Class</th>
                  <th className="px-6 py-2.5 text-right">Horizon</th>
                  <th className="px-6 py-2.5 text-right">Locked Interest</th>
                  <th className="px-6 py-2.5 text-right">Projected Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">No saved plans recorded.</td>
                  </tr>
                ) : (
                  plans.map((p) => {
                    const lastVal = p.projections[p.projections.length - 1]?.maturity_amount || 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/20">
                        <td className="px-6 py-2.5 font-bold text-slate-800">{p.name}</td>
                        <td className="px-6 py-2.5 capitalize text-slate-500">{p.type} Calculator</td>
                        <td className="px-6 py-2.5 text-right font-mono">{p.financial_detail.duration} Yrs</td>
                        <td className="px-6 py-2.5 text-right font-mono text-blue-600">{p.financial_detail.interest_rate}%</td>
                        <td className="px-6 py-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(lastVal)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Combined Annual Ledger */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">III. Consolidated Amortization Schedule</h3>
          
          <div className="border border-slate-200/80 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xxs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-100 z-10">
                <tr>
                  <th className="px-6 py-2.5">Compounding Year</th>
                  <th className="px-6 py-2.5 text-right">Combined Investment</th>
                  <th className="px-6 py-2.5 text-right">Combined Return Yield</th>
                  <th className="px-6 py-2.5 text-right">Combined Maturity Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-600">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">No consolidated ledger values.</td>
                  </tr>
                ) : (
                  combinedProjections.map((row) => (
                    <tr key={row.year} className="hover:bg-slate-50/20">
                      <td className="px-6 py-2 font-semibold text-slate-800">Year {row.year}</td>
                      <td className="px-6 py-2 text-right">{formatCurrency(row.invested)}</td>
                      <td className="px-6 py-2 text-right text-blue-600">+{formatCurrency(row.interest)}</td>
                      <td className="px-6 py-2 text-right font-bold text-slate-900">{formatCurrency(row.maturity)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signatures & Disclaimers */}
        <div className="pt-12 flex justify-between items-start text-xxs text-slate-400 border-t border-slate-100 leading-relaxed gap-12">
          <div className="space-y-1 max-w-sm">
            <span className="font-bold text-slate-600 block">General Disclosure</span>
            <p>
              Projections are computed using model mathematical algorithms based on standard compound interest rates. Real market returns fluctuate over time and past performance does not guarantee future capital yield.
            </p>
          </div>
          <div className="text-right shrink-0 pr-4">
            <div className="h-10 w-32 border-b border-slate-200" />
            <span className="block mt-2 font-bold text-slate-600">WealthWise Auditor</span>
          </div>
        </div>

      </div>

    </div>
  );
}
