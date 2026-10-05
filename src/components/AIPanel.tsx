/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  Flame, 
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { api } from '../services/api.js';

interface InsightItem {
  title: string;
  message: string;
  type: 'alert' | 'success' | 'info' | 'tip';
  impact: string;
}

interface AIPanelProps {
  user: any;
  showToast: (msg: string, type: 'success' | 'error') => void;
  onOpenAuth: () => void;
  expenses: any[];
  budgets: any[];
  plans: any[];
  assets: any[];
  liabilities: any[];
  currency?: string;
}

export default function AIPanel({ user, showToast, onOpenAuth, expenses, budgets, plans, assets, liabilities, currency = 'USD' }: AIPanelProps) {
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formatAmount = (val: number) => {
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

  const isFetchingRef = useRef(false);

  useEffect(() => {
    fetchInsights();
  }, [user?.id]);

  const fetchInsights = async (force: boolean = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setErrorMessage('');
    
    if (!user) {
      // Offline analytical intelligence computed dynamically from current portfolio state
      const totalExp = expenses ? expenses.reduce((sum, e) => sum + e.amount, 0) : 0;
      const totalAssets = assets ? assets.reduce((sum, a) => sum + a.value, 0) : 0;
      const totalLiab = liabilities ? liabilities.reduce((sum, l) => sum + l.amount_remaining, 0) : 0;
      const netWorth = totalAssets - totalLiab;

      const smartInsights: InsightItem[] = [
        {
          title: "Emergency Liquidity Cushion",
          message: totalAssets > 0
            ? `Your current liquid assets total ${formatAmount(totalAssets)}. Keeping 3-6 months of expenses in high-interest accounts is recommended for emergency protection.`
            : "No liquid assets recorded yet. Add your savings or bank balances in the Net Worth Tracker to evaluate your emergency buffer.",
          type: "info",
          impact: "High Impact"
        },
        {
          title: "Asset-Liability Balance",
          message: totalAssets === 0 && totalLiab === 0
            ? "Your balance sheet is clear. Record your investment assets and any loans to project long-term net worth trajectory."
            : netWorth >= 0 
              ? `Positive net worth of ${formatAmount(netWorth)}. Your assets exceed liabilities by ${totalLiab > 0 ? (totalAssets / totalLiab).toFixed(1) + 'x' : '100%'}. Maintain momentum with steady compound contributions.`
              : `Net worth is currently negative at ${formatAmount(netWorth)}. Consider prioritizing credit card or high-interest debt repayments.`,
          type: netWorth >= 0 ? "success" : "alert",
          impact: "High Impact"
        },
        {
          title: "Compounding Growth Velocity",
          message: plans && plans.length > 0
            ? `You have ${plans.length} active wealth plan${plans.length > 1 ? 's' : ''}. Your compounding velocity is active. Review step-up increments annually to accelerate target dates.`
            : "No wealth projection plans saved yet. Navigate to Interactive Calculators to set up your first retirement, education, or house planning compounding models.",
          type: "tip",
          impact: "Medium Impact"
        }
      ];
      
      setInsights(smartInsights);
      setLoading(false);
      isFetchingRef.current = false;
      return;
    }

    try {
      const res = await api.getAiInsights();
      if (res.success && res.data) {
        setInsights(res.data);
      } else {
        setErrorMessage(res.message || 'Could not fetch intelligent AI insights.');
      }
    } catch (e) {
      setErrorMessage('Network error occurred while fetching insights.');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Lightbulb className="w-5 h-5 text-amber-500" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'alert':
        return 'bg-red-50/40 border-red-100 hover:bg-red-50/60';
      case 'success':
        return 'bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50/60';
      case 'info':
        return 'bg-blue-50/40 border-blue-100 hover:bg-blue-50/60';
      default:
        return 'bg-amber-50/40 border-amber-100 hover:bg-amber-50/60';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs space-y-6" id="ai-financial-insights-module">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-sans font-medium text-slate-900 flex items-center gap-1.5">
              WealthWise AI Advisor
            </h3>
            <p className="text-xs text-slate-500">
              Personalized analytical reports powered by Gemini AI
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchInsights(true)}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs font-sans font-medium transition flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Re-Analyze Financials
        </button>
      </div>

      {!user && (
        <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-lg">
          <p className="text-xs text-blue-900 leading-relaxed">
            💡 <strong>Local Device Mode:</strong> Generating immediate real-time portfolio analytics. Register or sign in to synchronize intelligent insights across all your devices.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-slate-200/60 rounded-lg p-5 space-y-3 animate-pulse bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="h-4 w-1/3 bg-slate-200 rounded-sm" />
                <div className="h-4 w-16 bg-slate-200 rounded-full" />
              </div>
              <div className="h-3 w-3/4 bg-slate-200 rounded-sm" />
              <div className="h-3 w-1/2 bg-slate-200 rounded-sm" />
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <div className="p-8 text-center border border-dashed border-red-200 rounded-lg bg-red-50/20">
          <p className="text-sm text-red-600">{errorMessage}</p>
          <button 
            onClick={fetchInsights} 
            className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-sans font-semibold hover:bg-red-700 transition"
          >
            Retry Analytics
          </button>
        </div>
      ) : insights.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg">
          <p className="text-sm text-slate-400">No analytical advisories compiled yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((ins, idx) => (
            <div 
              key={idx} 
              className={`p-5 rounded-lg border transition duration-200 flex items-start gap-4 ${getBg(ins.type)}`}
            >
              <div className="mt-0.5 shrink-0">
                {getIcon(ins.type)}
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-sans font-bold text-gray-900">
                    {ins.title}
                  </h4>
                  <span className="text-[9px] font-mono font-bold bg-white/80 text-slate-700 px-2 py-0.5 rounded-full border border-slate-100">
                    {ins.impact}
                  </span>
                </div>
                <p className="text-xs text-gray-700 font-sans font-medium leading-relaxed">
                  {ins.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
