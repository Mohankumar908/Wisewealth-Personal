/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  ShieldAlert, 
  DollarSign, 
  Briefcase, 
  Award,
  Sparkles,
  PieChart as PieIcon,
  Percent
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { Asset, Liability, User } from '../types.js';
import { api } from '../services/api.js';

interface NetWorthTrackerProps {
  user: User | null;
  onOpenAuth: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  liabilities: Liability[];
  setLiabilities: React.Dispatch<React.SetStateAction<Liability[]>>;
  onRefreshData: () => Promise<void>;
  currency?: string;
}

const ASSET_TYPES = [
  'Savings Account', 'Fixed Deposits', 'Stocks', 'Mutual Funds', 'Gold', 'Real Estate', 'Crypto'
];

const LIABILITY_TYPES = [
  'Home Loan', 'Education Loan', 'Car Loan', 'Credit Card Debt'
];

const ASSET_COLORS = ['#3b82f6', '#06b6d4', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
const LIABILITY_COLORS = ['#f87171', '#f87171', '#ef4444', '#dc2626'];

export default function NetWorthTracker({ 
  user, 
  onOpenAuth, 
  showToast, 
  assets, 
  setAssets, 
  liabilities, 
  setLiabilities, 
  onRefreshData,
  currency = 'USD'
}: NetWorthTrackerProps) {
  const [loading, setLoading] = useState(false);

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

  // Form State - Asset
  const [assetType, setAssetType] = useState<Asset['asset_type']>('Savings Account');
  const [assetName, setAssetName] = useState('');
  const [assetValue, setAssetValue] = useState('');

  // Form State - Liability
  const [liabilityType, setLiabilityType] = useState<Liability['liability_type']>('Home Loan');
  const [liabilityName, setLiabilityName] = useState('');
  const [liabilityValue, setLiabilityValue] = useState('');
  const [liabilityRate, setLiabilityRate] = useState('');

  useEffect(() => {
    if (user) {
      onRefreshData();
    }
  }, [user]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) {
      showToast('Please enter an asset name.', 'error');
      return;
    }
    if (!assetValue || isNaN(Number(assetValue)) || Number(assetValue) < 0) {
      showToast('Please enter a valid asset value.', 'error');
      return;
    }

    const payload = {
      asset_type: assetType,
      name: assetName.trim(),
      value: Number(assetValue)
    };

    if (!user) {
      const newAsset: Asset = {
        ...payload,
        id: Math.random().toString(36).substring(2, 9),
        user_id: 'guest'
      };
      setAssets(prev => [...prev, newAsset]);
      showToast('Asset recorded successfully.', 'success');
      setAssetName('');
      setAssetValue('');
      return;
    }

    try {
      const res = await api.createAsset(payload);
      if (res.success) {
        showToast('Asset recorded successfully.', 'success');
        setAssetName('');
        setAssetValue('');
        onRefreshData();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('An error occurred.', 'error');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!user) {
      setAssets(prev => prev.filter(item => item.id !== id));
      showToast('Asset deleted successfully.', 'success');
      return;
    }

    try {
      const res = await api.deleteAsset(id);
      if (res.success) {
        showToast('Asset deleted successfully.', 'success');
        onRefreshData();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('Failed to delete asset.', 'error');
    }
  };

  const handleAddLiability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liabilityName.trim()) {
      showToast('Please enter a liability name.', 'error');
      return;
    }
    if (!liabilityValue || isNaN(Number(liabilityValue)) || Number(liabilityValue) < 0) {
      showToast('Please enter a valid liability amount.', 'error');
      return;
    }
    if (!liabilityRate || isNaN(Number(liabilityRate)) || Number(liabilityRate) < 0) {
      showToast('Please enter a valid interest rate.', 'error');
      return;
    }

    const payload = {
      liability_type: liabilityType,
      name: liabilityName.trim(),
      amount_remaining: Number(liabilityValue),
      interest_rate: Number(liabilityRate)
    };

    if (!user) {
      const newLiab: Liability = {
        ...payload,
        id: Math.random().toString(36).substring(2, 9),
        user_id: 'guest'
      };
      setLiabilities(prev => [...prev, newLiab]);
      showToast('Liability recorded successfully.', 'success');
      setLiabilityName('');
      setLiabilityValue('');
      setLiabilityRate('');
      return;
    }

    try {
      const res = await api.createLiability(payload);
      if (res.success) {
        showToast('Liability recorded successfully.', 'success');
        setLiabilityName('');
        setLiabilityValue('');
        setLiabilityRate('');
        onRefreshData();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('An error occurred.', 'error');
    }
  };

  const handleDeleteLiability = async (id: string) => {
    if (!user) {
      setLiabilities(prev => prev.filter(item => item.id !== id));
      showToast('Liability deleted successfully.', 'success');
      return;
    }

    try {
      const res = await api.deleteLiability(id);
      if (res.success) {
        showToast('Liability deleted successfully.', 'success');
        onRefreshData();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('Failed to delete liability.', 'error');
    }
  };

  // Compute Metrics
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount_remaining, 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  // Asset allocation group data
  const assetAllocationData = ASSET_TYPES.map((type, idx) => {
    const value = assets.filter(a => a.asset_type === type).reduce((s, a) => s + a.value, 0);
    return { name: type, value, color: ASSET_COLORS[idx] };
  }).filter(item => item.value > 0);

  // Growth projection data (10 Year future net worth model assuming 7% asset growth and interest-compounding loan repayment)
  const growthProjection = Array.from({ length: 11 }, (_, i) => {
    const year = i;
    // Simple projection logic: Assets grow at 8% compound annually.
    // Liabilities contract by 10% principal payment annually.
    const projectedAssets = Math.round(totalAssets * Math.pow(1 + 0.08, year));
    const projectedLiabilities = Math.round(totalLiabilities * Math.pow(1 - 0.12, year));
    const projectedNetWorth = projectedAssets - projectedLiabilities;

    return {
      yearLabel: year === 0 ? 'Current' : `Year ${year}`,
      Assets: projectedAssets,
      Liabilities: projectedLiabilities,
      NetWorth: projectedNetWorth
    };
  });

  return (
    <div className="space-y-8 animate-fade-in" id="networth-tracker-module">
      
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Aggregate Asset Base</span>
            <h3 className="text-3xl font-sans font-semibold text-blue-600 mt-1">
              {formatCurrency(totalAssets)}
            </h3>
            <p className="text-xs text-gray-500 mt-2">
              Across {assets.length} active holdings
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Outstanding Debt Balance</span>
            <h3 className="text-3xl font-sans font-semibold text-red-500 mt-1">
              {formatCurrency(totalLiabilities)}
            </h3>
            <p className="text-xs text-gray-500 mt-2">
              Across {liabilities.length} loan accounts
            </p>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-lg flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Estimated Net Worth</span>
            <h3 className={`text-3xl font-sans font-semibold mt-1 ${netWorth >= 0 ? 'text-blue-600' : 'text-red-700'}`}>
              {formatCurrency(netWorth)}
            </h3>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-blue-500" />
              Debt-to-Asset ratio: {Math.round(debtToAssetRatio)}%
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {!user && (
        <div className="bg-slate-900 rounded-lg p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-blue-600/10 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-sans font-semibold text-white">Sandbox Preview Session</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                You are adding assets and liabilities in sandbox mode. Access your secure client portal to enable multi-device secure sync.
              </p>
            </div>
          </div>
          <button 
            onClick={onOpenAuth}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-sans font-medium transition shrink-0 cursor-pointer"
          >
            Access Client Portal
          </button>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Assets Management Section (LHS) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-sans font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Manage Assets
            </h3>

            <form onSubmit={handleAddAsset} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="sm:col-span-1">
                <select 
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as any)}
                  className="w-full h-10 px-2.5 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="sm:col-span-1">
                <input 
                  type="text"
                  placeholder="Asset Name (e.g. Robinhood)"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="sm:col-span-1 flex gap-2">
                <input 
                  type="number"
                  placeholder="Value ($)"
                  value={assetValue}
                  onChange={(e) => setAssetValue(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
                <button 
                  type="submit" 
                  className="h-10 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-sans font-medium transition shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {assets.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No assets recorded. Add checking, stocks, real estate, etc.</p>
            ) : (
              <div className="space-y-2">
                {assets.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 border border-gray-50 rounded-lg hover:bg-gray-50/50 transition">
                    <div>
                      <h4 className="text-sm font-sans font-medium text-gray-800">{a.name}</h4>
                      <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1 inline-block font-semibold">
                        {a.asset_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-gray-900">${a.value.toLocaleString()}</span>
                      <button 
                        onClick={() => handleDeleteAsset(a.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Remove Asset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Liabilities Management Section (RHS) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-sans font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Manage Liabilities
            </h3>

            <form onSubmit={handleAddLiability} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-6">
              <div className="sm:col-span-1">
                <select 
                  value={liabilityType}
                  onChange={(e) => setLiabilityType(e.target.value as any)}
                  className="w-full h-10 px-2 border border-gray-200 rounded-lg text-[10px] text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 bg-white"
                >
                  {LIABILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="sm:col-span-1">
                <input 
                  type="text"
                  placeholder="Name (e.g. Car)"
                  value={liabilityName}
                  onChange={(e) => setLiabilityName(e.target.value)}
                  className="w-full h-10 px-2 border border-gray-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
                />
              </div>
              <div className="sm:col-span-1">
                <input 
                  type="number"
                  placeholder="Owed ($)"
                  value={liabilityValue}
                  onChange={(e) => setLiabilityValue(e.target.value)}
                  className="w-full h-10 px-2 border border-gray-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
                />
              </div>
              <div className="sm:col-span-1 flex gap-2">
                <input 
                  type="number"
                  placeholder="Rate %"
                  value={liabilityRate}
                  onChange={(e) => setLiabilityRate(e.target.value)}
                  className="w-full h-10 px-2 border border-gray-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
                />
                <button 
                  type="submit" 
                  className="h-10 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-sans font-medium transition shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {liabilities.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No active liabilities recorded. Keep them at zero!</p>
            ) : (
              <div className="space-y-2">
                {liabilities.map(l => (
                  <div key={l.id} className="flex items-center justify-between p-3 border border-gray-50 rounded-lg hover:bg-gray-50/50 transition">
                    <div>
                      <h4 className="text-sm font-sans font-medium text-gray-800">{l.name}</h4>
                      <div className="flex gap-1.5 mt-1">
                        <span className="text-[9px] font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
                          {l.liability_type}
                        </span>
                        <span className="text-[9px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
                          {l.interest_rate}% APR
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-gray-900">${l.amount_remaining.toLocaleString()}</span>
                      <button 
                        onClick={() => handleDeleteLiability(l.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Remove Liability"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Asset Distribution and Net Worth Compounding Growth curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Allocations (LHS) */}
        <div className="lg:col-span-4 bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-sans font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-blue-600" />
              Asset Mix Allocation
            </h3>
            <div className="h-48 flex items-center justify-center">
              {assetAllocationData.length === 0 ? (
                <p className="text-xs text-gray-400">No assets recorded yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetAllocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {assetAllocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="space-y-1.5 mt-4">
            {assetAllocationData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-mono font-semibold">${item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Compound Net Worth Projector (RHS) */}
        <div className="lg:col-span-8 bg-white rounded-lg p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-sans font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                10-Year Net Worth Compound Projection
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Simulating an 8% asset compounding yield and debt reduction model
              </p>
            </div>
            <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded-md">8% yield</span>
          </div>

          <div className="h-64">
            {totalAssets === 0 ? (
              <p className="text-xs text-gray-400 flex items-center justify-center h-full">Add assets to view your wealth projection graph.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthProjection} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="yearLabel" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} formatter={(v: any) => `$${v / 1000}k`} />
                  <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                  <Area type="monotone" dataKey="NetWorth" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorNetWorth)" name="Projected Net Worth" />
                  <Area type="monotone" dataKey="Assets" stroke="#475569" strokeWidth={1} strokeDasharray="5 5" fill="none" name="Projected Assets" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
