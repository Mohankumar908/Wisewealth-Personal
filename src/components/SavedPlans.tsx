/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  Trash2,
  Edit2,
  Plus,
  Eye,
  FileSpreadsheet,
  Download,
  Percent,
  Calendar,
  AlertTriangle,
  FileText,
  X,
  TrendingUp,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { InvestmentPlan, Projection, User } from '../types.js';
import { api } from '../services/api.js';

interface SavedPlansProps {
  user: User | null;
  plans: InvestmentPlan[];
  onOpenAuth: () => void;
  onRefreshPlans: () => void;
  onNavigateToCalculators: () => void;
  onNotify: (message: string, type: 'success' | 'error') => void;
  currency?: string;
}

export default function SavedPlans({
  user,
  plans,
  onOpenAuth,
  onRefreshPlans,
  onNavigateToCalculators,
  onNotify,
  currency = 'USD'
}: SavedPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editRate, setEditRate] = useState<number>(0);
  const [editDuration, setEditDuration] = useState<number>(0);
  const [editPrincipal, setEditPrincipal] = useState<number>(0);
  const [editSip, setEditSip] = useState<number>(0);
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

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

  const handleExportCSV = (plan: InvestmentPlan) => {
    const headers = ['Year', 'Invested Amount ($)', 'Interest Earned ($)', 'Maturity Balance ($)', 'Purchasing Power ($)'];
    const rows = plan.projections.map((p) => [
      p.year,
      p.invested_amount,
      p.interest_earned,
      p.maturity_amount,
      p.purchasing_power || ''
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${plan.name.toLowerCase().replace(/\s+/g, '_')}_projections.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify(`Successfully exported "${plan.name}" projections to CSV.`, 'success');
  };

  const handleOpenEdit = (plan: InvestmentPlan) => {
    setSelectedPlan(plan);
    setEditName(plan.name);
    setEditRate(plan.financial_detail.interest_rate);
    setEditDuration(plan.financial_detail.duration);
    setEditPrincipal(plan.financial_detail.principal || 0);
    setEditSip(plan.financial_detail.sip_amount || 0);
    setIsEditing(true);
  };

  const handleUpdatePlan = async (e: any) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setUpdateLoading(true);

    // Recalculate projections on-the-fly based on modified parameters
    let updatedProjections: Projection[] = [];
    const r = editRate / 100;
    
    if (selectedPlan.type === 'compound') {
      for (let y = 1; y <= editDuration; y++) {
        const maturity = editPrincipal * Math.pow(1 + r, y);
        updatedProjections.push({
          year: y,
          invested_amount: Math.round(editPrincipal),
          interest_earned: Math.round(maturity - editPrincipal),
          maturity_amount: Math.round(maturity),
        });
      }
    } else {
      // SIP / Step-Up / Goal
      const i = editRate / 100 / 12;
      for (let y = 1; y <= editDuration; y++) {
        const months = y * 12;
        const invested = editSip * months;
        let maturity = 0;
        if (i === 0) {
          maturity = invested;
        } else {
          maturity = editSip * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
        }
        updatedProjections.push({
          year: y,
          invested_amount: Math.round(invested),
          interest_earned: Math.round(maturity - invested),
          maturity_amount: Math.round(maturity),
        });
      }
    }

    if (!user) {
      const existing = localStorage.getItem('wealthwise_guest_plans');
      const list: InvestmentPlan[] = existing ? JSON.parse(existing) : [];
      const updated = list.map(p => p.id === selectedPlan.id ? {
        ...p,
        name: editName,
        financial_detail: {
          ...p.financial_detail,
          principal: editPrincipal,
          sip_amount: editSip,
          target_amount: selectedPlan.financial_detail.target_amount,
          interest_rate: editRate,
          duration: editDuration,
          inflation_rate: selectedPlan.financial_detail.inflation_rate,
        },
        projections: updatedProjections,
        updated_at: new Date().toISOString()
      } : p);
      localStorage.setItem('wealthwise_guest_plans', JSON.stringify(updated));
      setUpdateLoading(false);
      onNotify('Investment plan updated successfully.', 'success');
      setIsEditing(false);
      setSelectedPlan(updated.find(p => p.id === selectedPlan.id) || null);
      onRefreshPlans();
      return;
    }

    const res = await api.updatePlan(selectedPlan.id, {
      name: editName,
      financial_detail: {
        principal: editPrincipal,
        sip_amount: editSip,
        target_amount: selectedPlan.financial_detail.target_amount,
        interest_rate: editRate,
        duration: editDuration,
        inflation_rate: selectedPlan.financial_detail.inflation_rate,
      },
      projections: updatedProjections,
    });

    setUpdateLoading(false);
    if (res.success && res.data) {
      onNotify('Investment plan updated successfully.', 'success');
      setIsEditing(false);
      setSelectedPlan(res.data);
      onRefreshPlans();
    } else {
      onNotify(res.message || 'Failed to update investment plan.', 'error');
    }
  };

  const handleDeletePlan = async (id: string) => {
    setDeleteLoading(true);

    if (!user) {
      const existing = localStorage.getItem('wealthwise_guest_plans');
      const list: InvestmentPlan[] = existing ? JSON.parse(existing) : [];
      const filtered = list.filter(p => p.id !== id);
      localStorage.setItem('wealthwise_guest_plans', JSON.stringify(filtered));
      setDeleteLoading(false);
      onNotify('Investment plan deleted successfully.', 'success');
      setSelectedPlan(null);
      setDeleteConfirmId(null);
      onRefreshPlans();
      return;
    }

    const res = await api.deletePlan(id);
    setDeleteLoading(false);
    if (res.success) {
      onNotify('Investment plan deleted successfully.', 'success');
      setSelectedPlan(null);
      setDeleteConfirmId(null);
      onRefreshPlans();
    } else {
      onNotify(res.message || 'Failed to delete investment plan.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {!user && plans.length > 0 && (
        <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-blue-900">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
            <p className="truncate">Saved plans are stored locally on your device. Sign in or register anytime to sync across devices.</p>
          </div>
          <button 
            onClick={onOpenAuth}
            className="shrink-0 text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
          >
            Sign in
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PLANS LIST (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xxs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Portfolio Accounts</h4>
                <p className="text-xxs text-slate-500">Select an active goal below to inspect</p>
              </div>
              <button
                onClick={onNavigateToCalculators}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-120 overflow-y-auto">
              {plans.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <p className="text-xs text-slate-400">No active plans saved.</p>
                  <button
                    onClick={onNavigateToCalculators}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xxs px-3 py-1.5 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Custom Target</span>
                  </button>
                </div>
              ) : (
                plans.map((plan) => {
                  const lastP = plan.projections[plan.projections.length - 1];
                  const typeLabel = plan.type === 'sip' ? 'SIP' : plan.type === 'compound' ? 'Lump Sum' : plan.type === 'goal' ? 'Goal' : 'Step-Up';
                  const isSelected = selectedPlan?.id === plan.id;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => {
                        setSelectedPlan(plan);
                        setIsEditing(false);
                      }}
                      className={`p-4 flex items-center justify-between cursor-pointer transition ${
                        isSelected ? 'bg-slate-50 border-l-4 border-blue-600 pl-3' : 'hover:bg-slate-50/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-slate-800">{plan.name}</h5>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xxs px-1.5 py-0.5 font-bold rounded-sm bg-slate-100 text-slate-600">
                            {typeLabel}
                          </span>
                          <span className="text-xxs text-slate-400">
                            {plan.financial_detail.duration} Yrs @ {plan.financial_detail.interest_rate}%
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-blue-600 block font-mono">
                          {formatCurrency(lastP?.maturity_amount || 0)}
                        </span>
                        <span className="text-xxs text-slate-400">Projected</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED PLAN METRICS & EDIT (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedPlan ? (
            <div className="bg-white rounded-lg border border-slate-200/80 shadow-xxs p-6 space-y-6">
              
              {/* Detail Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">{selectedPlan.name}</h3>
                  <p className="text-xxs text-slate-500">Created on {new Date(selectedPlan.created_at).toLocaleDateString()}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(selectedPlan)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg transition hover:bg-slate-50 flex items-center gap-1.5 text-xxs font-semibold cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modify Parameters</span>
                  </button>
                  <button
                    onClick={() => handleExportCSV(selectedPlan)}
                    className="p-1.5 text-blue-600 hover:text-blue-700 border border-blue-100 bg-blue-50/40 rounded-lg transition hover:bg-blue-50 flex items-center gap-1.5 text-xxs font-semibold cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(selectedPlan.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 border border-red-100 rounded-lg transition hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Edit Panel Drawer */}
              {isEditing ? (
                <form onSubmit={handleUpdatePlan} className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Adjustment Interface</span>
                    <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600">Custom Target Name</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {selectedPlan.type === 'compound' ? (
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Initial Principal ($)</label>
                          <input
                            type="number"
                            required
                            value={editPrincipal}
                            onChange={(e) => setEditPrincipal(Math.max(0, Number(e.target.value)))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-600">Monthly Deposit ($)</label>
                          <input
                            type="number"
                            required
                            value={editSip}
                            onChange={(e) => setEditSip(Math.max(0, Number(e.target.value)))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Expected Annual Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={editRate}
                          onChange={(e) => setEditRate(Math.max(0.1, Number(e.target.value)))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1 col-span-2">
                        <label className="font-semibold text-slate-600">Duration (Years)</label>
                        <input
                          type="number"
                          required
                          value={editDuration}
                          onChange={(e) => setEditDuration(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={updateLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50 text-xs"
                      >
                        {updateLoading ? 'Saving...' : 'Apply Modifications'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-4 py-2 rounded-lg cursor-pointer text-xs"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                </form>
              ) : null}

              {/* High-level details layout */}
              <div className="grid grid-cols-3 gap-4 text-xs font-semibold">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-xxs text-slate-400 uppercase tracking-wider block">Total Deposits</span>
                  <span className="text-sm font-bold text-slate-800 block mt-1 font-mono">
                    {formatCurrency(selectedPlan.projections[selectedPlan.projections.length - 1]?.invested_amount || 0)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-xxs text-slate-400 uppercase tracking-wider block">Acquired Yield</span>
                  <span className="text-sm font-bold text-blue-600 block mt-1 font-mono">
                    {formatCurrency(selectedPlan.projections[selectedPlan.projections.length - 1]?.interest_earned || 0)}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 text-white rounded-lg">
                  <span className="text-xxs text-slate-400 uppercase tracking-wider block">Maturity Wealth</span>
                  <span className="text-sm font-bold text-blue-400 block mt-1 font-mono">
                    {formatCurrency(selectedPlan.projections[selectedPlan.projections.length - 1]?.maturity_amount || 0)}
                  </span>
                </div>
              </div>

              {/* Area Growth Graph */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Growth Projection Vector</h4>
                <div className="h-44 w-full text-xxs font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selectedPlan.projections} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="year" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), '']} />
                      <Area type="monotone" dataKey="maturity_amount" stroke="#2563eb" strokeWidth={1.5} fill="#2563eb" fillOpacity={0.05} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table Ledger breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Amortization Timeline Table</h4>
                <div className="max-h-56 overflow-y-auto border border-slate-150 rounded-lg">
                  <table className="w-full text-left text-xxs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2">Year</th>
                        <th className="px-4 py-2 text-right">Invested Value</th>
                        <th className="px-4 py-2 text-right">Returns Value</th>
                        <th className="px-4 py-2 text-right">Maturity Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-slate-600">
                      {selectedPlan.projections.map((p) => (
                        <tr key={p.year} className="hover:bg-slate-50/40">
                          <td className="px-4 py-1.5 font-bold text-slate-800">Year {p.year}</td>
                          <td className="px-4 py-1.5 text-right">{formatCurrency(p.invested_amount)}</td>
                          <td className="px-4 py-1.5 text-right text-blue-600">+{formatCurrency(p.interest_earned)}</td>
                          <td className="px-4 py-1.5 text-right font-semibold text-slate-800">{formatCurrency(p.maturity_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200/80 p-12 text-center text-slate-400 shadow-xxs">
              <Eye className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">Select a plan from the list to inspect details</p>
            </div>
          )}
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg p-6 border border-slate-200/80 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">Confirm Deletion</h4>
                <p className="text-xs text-slate-500">
                  Are you sure you want to permanently delete this plan from your WealthWise portfolio? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePlan(deleteConfirmId)}
                disabled={deleteLoading}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer font-bold flex items-center gap-1.5"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
