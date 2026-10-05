/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertTriangle, 
  CheckCircle, 
  ArrowUpRight, 
  DollarSign, 
  Calendar,
  Layers,
  Sparkles,
  PieChart as PieIcon,
  HelpCircle,
  Repeat,
  CreditCard,
  ArrowRight,
  TrendingDown,
  Activity,
  BellRing,
  Coins
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell, PieChart, Pie } from 'recharts';
import { Expense, Budget, User } from '../types.js';
import { api } from '../services/api.js';

interface BudgetExpenseTrackerProps {
  user: User | null;
  onOpenAuth: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  budgets: Budget[];
  setBudgets: React.Dispatch<React.SetStateAction<Budget[]>>;
  onRefreshData: () => Promise<void>;
  currency?: 'USD' | 'INR' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD';
}

interface Subscription {
  id: string;
  name: string;
  amount: number;
  category: Expense['category'];
  billingCycle: 'Weekly' | 'Monthly' | 'Yearly';
  nextDueDate: string;
  isActive: boolean;
}

const CATEGORIES = [
  'Food', 'Rent', 'Transportation', 'Shopping', 'Entertainment', 
  'Healthcare', 'Utilities', 'Investments', 'Education', 'Others'
];

const COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#14b8a6', '#6366f1', '#6b7280'
];

export default function BudgetExpenseTracker({ 
  user, 
  onOpenAuth, 
  showToast, 
  expenses, 
  setExpenses, 
  budgets, 
  setBudgets, 
  onRefreshData,
  currency = 'USD'
}: BudgetExpenseTrackerProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'budget' | 'recurring' | 'insights'>('budget');

  // Form State - Expense
  const [expCategory, setExpCategory] = useState<Expense['category']>('Food');
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);

  // Form State - Budget Limit
  const [budCategory, setBudCategory] = useState('Food');
  const [budLimit, setBudLimit] = useState('');

  // Currency Converter Setup
  const CURRENCY_CONFIGS: Record<string, { symbol: string; locale: string; code: string }> = {
    USD: { symbol: '$', locale: 'en-US', code: 'USD' },
    INR: { symbol: '₹', locale: 'en-IN', code: 'INR' },
    EUR: { symbol: '€', locale: 'de-DE', code: 'EUR' },
    GBP: { symbol: '£', locale: 'en-GB', code: 'GBP' },
    JPY: { symbol: '¥', locale: 'ja-JP', code: 'JPY' },
    CAD: { symbol: 'C$', locale: 'en-CA', code: 'CAD' },
    AUD: { symbol: 'A$', locale: 'en-AU', code: 'AUD' },
  };

  const currentCurrencyConfig = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD;
  const currencySymbol = currentCurrencyConfig.symbol;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(currentCurrencyConfig.locale, {
      style: 'currency',
      currency: currentCurrencyConfig.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(val);
  };

  // 1. Carry Forward State
  const [carryForward, setCarryForward] = useState<number>(() => {
    const key = `wealthwise_carry_${user?.id || 'guest'}`;
    const saved = localStorage.getItem(key);
    return saved ? Number(saved) : 0;
  });

  useEffect(() => {
    const key = `wealthwise_carry_${user?.id || 'guest'}`;
    localStorage.setItem(key, carryForward.toString());
  }, [carryForward, user]);

  // 2. Subscriptions State (Recurring Expenses)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    const key = `wealthwise_subs_${user?.id || 'guest'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [];
  });

  useEffect(() => {
    const key = `wealthwise_subs_${user?.id || 'guest'}`;
    localStorage.setItem(key, JSON.stringify(subscriptions));
  }, [subscriptions, user]);

  // Subscription Form State
  const [subName, setSubName] = useState('');
  const [subAmount, setSubAmount] = useState('');
  const [subCategory, setSubCategory] = useState<Expense['category']>('Utilities');
  const [subCycle, setSubCycle] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [subDueDate, setSubDueDate] = useState(new Date().toISOString().split('T')[0]);

  // Synchronize budgets based on sandbox expenses in guest mode
  useEffect(() => {
    if (!user) {
      setBudgets(prevBudgets => {
        return prevBudgets.map(b => {
          const currentTotal = expenses
            .filter(ex => ex.category.toLowerCase() === b.category.toLowerCase())
            .reduce((s, ex) => s + ex.amount, 0);
          return { ...b, current_spend: currentTotal };
        });
      });
    }
  }, [expenses, user]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || isNaN(Number(expAmount)) || Number(expAmount) <= 0) {
      showToast('Please enter a valid expense amount.', 'error');
      return;
    }
    if (!expDesc.trim()) {
      showToast('Please enter a brief description.', 'error');
      return;
    }

    const payload = {
      category: expCategory as Expense['category'],
      amount: Number(expAmount),
      description: expDesc.trim(),
      transaction_date: expDate
    };

    if (!user) {
      // Local device mode
      if (editingExpId) {
        setExpenses(prev => prev.map(item => item.id === editingExpId ? { ...item, ...payload } : item));
        showToast('Expense updated successfully.', 'success');
      } else {
        const newExp: Expense = {
          ...payload,
          id: Math.random().toString(36).substring(2, 9),
          user_id: 'guest',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setExpenses(prev => [newExp, ...prev]);
        showToast('Expense recorded successfully.', 'success');
      }
      resetExpenseForm();
      return;
    }

    try {
      let res;
      if (editingExpId) {
        res = await api.updateExpense(editingExpId, payload);
      } else {
        res = await api.createExpense(payload);
      }

      if (res.success) {
        showToast(editingExpId ? 'Expense updated successfully.' : 'Expense recorded successfully.', 'success');
        resetExpenseForm();
        onRefreshData();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('An unexpected error occurred.', 'error');
    }
  };

  const handleDeleteExpense = async (id: string, category: string) => {
    if (!user) {
      setExpenses(prev => prev.filter(item => item.id !== id));
      showToast('Expense deleted successfully.', 'success');
      return;
    }

    try {
      const res = await api.deleteExpense(id);
      if (res.success) {
        showToast('Expense deleted successfully.', 'success');
        onRefreshData();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('An error occurred during deletion.', 'error');
    }
  };

  const handleEditExpense = (item: Expense) => {
    setEditingExpId(item.id);
    setExpCategory(item.category);
    setExpAmount(item.amount.toString());
    setExpDesc(item.description);
    setExpDate(item.transaction_date);
  };

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budLimit || isNaN(Number(budLimit)) || Number(budLimit) <= 0) {
      showToast('Please enter a valid monthly budget limit.', 'error');
      return;
    }

    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const payload = {
      category: budCategory,
      monthly_limit: Number(budLimit),
      month,
      year
    };

    if (!user) {
      // Sandbox mode
      setBudgets(prev => {
        const existing = prev.find(b => b.category === budCategory && b.month === month && b.year === year);
        if (existing) {
          return prev.map(b => b.id === existing.id ? { ...b, monthly_limit: payload.monthly_limit } : b);
        } else {
          return [...prev, {
            ...payload,
            id: Math.random().toString(36).substring(2, 9),
            user_id: 'guest',
            current_spend: expenses.filter(ex => ex.category === budCategory).reduce((s, ex) => s + ex.amount, 0)
          }];
        }
      });
      showToast('Category budget limit saved successfully.', 'success');
      setBudLimit('');
      return;
    }

    try {
      const res = await api.createBudget(payload);
      if (res.success) {
        showToast('Category budget limit configured successfully.', 'success');
        setBudLimit('');
        onRefreshData();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('Failed to set budget.', 'error');
    }
  };

  // Subscription Operations
  const handleAddSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) {
      showToast('Please enter a subscription name.', 'error');
      return;
    }
    if (!subAmount || isNaN(Number(subAmount)) || Number(subAmount) <= 0) {
      showToast('Please enter a subscription fee.', 'error');
      return;
    }

    const newSub: Subscription = {
      id: Math.random().toString(36).substring(2, 9),
      name: subName.trim(),
      amount: Number(subAmount),
      category: subCategory,
      billingCycle: subCycle,
      nextDueDate: subDueDate,
      isActive: true
    };

    setSubscriptions(prev => [newSub, ...prev]);
    showToast(`Recurring subscription "${newSub.name}" configured.`, 'success');
    setSubName('');
    setSubAmount('');
  };

  const handleDeleteSubscription = (id: string) => {
    setSubscriptions(prev => prev.filter(item => item.id !== id));
    showToast('Subscription tracking cancelled.', 'success');
  };

  const handleToggleSubscription = (id: string) => {
    setSubscriptions(prev => prev.map(item => item.id === id ? { ...item, isActive: !item.isActive } : item));
  };

  const handlePostSubscriptionPayment = async (sub: Subscription) => {
    const payload = {
      category: sub.category,
      amount: sub.amount,
      description: `Recurring: ${sub.name}`,
      transaction_date: new Date().toISOString().split('T')[0]
    };

    if (!user) {
      const newExp: Expense = {
        ...payload,
        id: Math.random().toString(36).substring(2, 9),
        user_id: 'guest',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setExpenses(prev => [newExp, ...prev]);
      showToast(`Subscription payment logged: ${sub.name} (Sandbox)`, 'success');
      return;
    }

    try {
      const res = await api.createExpense(payload);
      if (res.success) {
        showToast(`Subscription payment logged: ${sub.name}`, 'success');
        onRefreshData();
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast('Failed to log recurring transaction.', 'error');
    }
  };

  const resetExpenseForm = () => {
    setEditingExpId(null);
    setExpCategory('Food');
    setExpAmount('');
    setExpDesc('');
    setExpDate(new Date().toISOString().split('T')[0]);
  };

  // calculations
  const totalMonthlySpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.monthly_limit, 0);

  // Carry forward calculations
  const effectiveBudgetHeadroom = totalBudgetLimit + carryForward;
  const netHeadroomRemaining = effectiveBudgetHeadroom - totalMonthlySpend;

  // Remaining Daily Budget Allowance
  const getDaysLeftInMonth = () => {
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return Math.max(1, lastDayOfMonth - today.getDate() + 1);
  };
  const daysLeft = getDaysLeftInMonth();
  const remainingDailyAllowance = netHeadroomRemaining > 0 ? (netHeadroomRemaining / daysLeft) : 0;

  // Subscription commitment calculations
  const calculateMonthlySubscriptionsTotal = () => {
    return subscriptions
      .filter(s => s.isActive)
      .reduce((sum, s) => {
        if (s.billingCycle === 'Weekly') return sum + s.amount * 4;
        if (s.billingCycle === 'Yearly') return sum + s.amount / 12;
        return sum + s.amount;
      }, 0);
  };
  const monthlyRecurringOutflows = calculateMonthlySubscriptionsTotal();

  // Budget vs Spend Chart Data
  const barChartData = CATEGORIES.map(cat => {
    const budget = budgets.find(b => b.category.toLowerCase() === cat.toLowerCase());
    const matchedExpenses = expenses.filter(e => e.category.toLowerCase() === cat.toLowerCase());
    const spend = matchedExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      category: cat,
      Budget: budget ? budget.monthly_limit : 0,
      Spend: spend
    };
  }).filter(item => item.Budget > 0 || item.Spend > 0);

  // Pie chart spend allocation
  const pieChartData = CATEGORIES.map((cat, idx) => {
    const spend = expenses.filter(e => e.category.toLowerCase() === cat.toLowerCase()).reduce((sum, e) => sum + e.amount, 0);
    return { name: cat, value: spend, color: COLORS[idx] };
  }).filter(item => item.value > 0);

  // 1. Generate Alerts & Warnings List
  const generatedAlerts = budgets.map(b => {
    const matchedExpenses = expenses.filter(e => e.category.toLowerCase() === b.category.toLowerCase());
    const spend = matchedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const pct = Math.round((spend / b.monthly_limit) * 100);
    const isOver = spend > b.monthly_limit;

    if (isOver) {
      return {
        id: `alert-${b.category}`,
        type: 'danger' as const,
        title: 'Critical Budget Deficit',
        message: `Your outflows for "${b.category}" are currently at ${pct}% of your defined plan. Overspent by ${formatCurrency(spend - b.monthly_limit)}.`,
        category: b.category,
      };
    } else if (pct >= 80) {
      return {
        id: `alert-${b.category}`,
        type: 'warning' as const,
        title: 'High Allocation Warning',
        message: `Your spending on "${b.category}" is nearing maximum headroom limits at ${pct}% capacity (${formatCurrency(spend)} utilized).`,
        category: b.category,
      };
    }
    return null;
  }).filter(Boolean);

  // 2. Trend & Spending Insights Computations
  const getTopCategory = () => {
    if (expenses.length === 0) return null;
    const catSums: Record<string, number> = {};
    expenses.forEach(e => {
      catSums[e.category] = (catSums[e.category] || 0) + e.amount;
    });
    const sorted = Object.entries(catSums).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { name: sorted[0][0], val: sorted[0][1] } : null;
  };
  const topCategory = getTopCategory();
  const topCategoryConcentration = topCategory && totalMonthlySpend > 0 
    ? Math.round((topCategory.val / totalMonthlySpend) * 100) 
    : 0;

  const averageTransactionSize = expenses.length > 0 ? (totalMonthlySpend / expenses.length) : 0;

  return (
    <div className="space-y-8 animate-fade-in" id="budget-expense-tracker-module">
      
      {/* 4 Summary Cards Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Total Spending */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Monthly Spending Outflows</span>
            <h3 className="text-2xl font-sans font-bold text-slate-950 mt-1 truncate">
              {formatCurrency(totalMonthlySpend)}
            </h3>
            <p className="text-xxs text-slate-500 mt-2 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-500" />
              Active Target Month: {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date())}
            </p>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Budget Headroom with Carry-Forward */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Total Budget Headroom</span>
            <h3 className="text-2xl font-sans font-bold text-slate-950 mt-1 truncate">
              {formatCurrency(effectiveBudgetHeadroom)}
            </h3>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-xxs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-bold font-mono">
                Cap: {formatCurrency(totalBudgetLimit)}
              </span>
              {carryForward > 0 && (
                <span className="text-xxs px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-bold font-mono">
                  +{formatCurrency(carryForward)} CF
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Remaining Daily Budget */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Remaining Daily Budget</span>
            <h3 className={`text-2xl font-sans font-bold mt-1 truncate ${remainingDailyAllowance > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatCurrency(remainingDailyAllowance)}/day
            </h3>
            <p className="text-xxs text-slate-500 mt-2 flex items-center gap-1">
              <Activity className="w-3 h-3 text-slate-400" />
              {daysLeft} days left in billing period
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${remainingDailyAllowance > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Subscriptions Commitment */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Recurring Subscription Total</span>
            <h3 className="text-2xl font-sans font-bold text-slate-950 mt-1 truncate">
              {formatCurrency(monthlyRecurringOutflows)}/mo
            </h3>
            <p className="text-xxs text-slate-500 mt-2 flex items-center gap-1">
              <Repeat className="w-3 h-3 text-violet-500" />
              {subscriptions.filter(s => s.isActive).length} active scheduled debits
            </p>
          </div>
          <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Notifications and Alerts Area */}
      {generatedAlerts.length > 0 && (
        <div className="bg-amber-50/55 rounded-2xl p-5 border border-amber-100/70 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-sans font-bold text-sm">
            <BellRing className="w-5 h-5 text-amber-600 animate-bounce" />
            <span>Budget Control Alerts ({generatedAlerts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedAlerts.map((alt, idx) => alt && (
              <div 
                key={alt.id} 
                className={`p-3.5 rounded-xl border flex gap-3 text-xs leading-relaxed ${
                  alt.type === 'danger' ? 'bg-red-50/60 border-red-100 text-red-800' : 'bg-amber-50/80 border-amber-100 text-amber-800'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${alt.type === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
                <div>
                  <h5 className="font-bold">{alt.title} ({alt.category})</h5>
                  <p className="mt-0.5 text-[11px] opacity-90">{alt.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!user && (
        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white shadow-xl">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-blue-600/10 text-blue-400 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-sans font-semibold text-white">Sandbox Preview Active</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                You are currently offline. Access your client portal to sync expenses, set real limits, and save recurring tracking.
              </p>
            </div>
          </div>
          <button 
            onClick={onOpenAuth}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-sans font-medium transition shrink-0 cursor-pointer"
          >
            Access Client Portal
          </button>
        </div>
      )}

      {/* Feature Section Tabs */}
      <div className="flex border-b border-slate-100 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('budget')}
          className={`px-5 py-3 text-xs font-bold font-sans transition-all shrink-0 border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'budget' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Expenses & Budgets</span>
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-5 py-3 text-xs font-bold font-sans transition-all shrink-0 border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'recurring' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>Subscriptions & Recurring</span>
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-5 py-3 text-xs font-bold font-sans transition-all shrink-0 border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'insights' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Spending Insights & CF</span>
        </button>
      </div>

      {/* CORE VIEW TABS */}

      {/* Tab 1: Expenses & Budgets */}
      {activeTab === 'budget' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Side */}
          <div className="space-y-8 lg:col-span-1">
            {/* Add / Edit Expense Form */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
              <h3 className="text-sm font-sans font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                {editingExpId ? 'Modify Transaction' : 'Record Transaction'}
              </h3>
              
              <form onSubmit={handleSaveExpense} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1.5 font-bold uppercase">Category</label>
                  <select 
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 bg-white"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1.5 font-bold uppercase">Amount ({currencySymbol})</label>
                  <input 
                    type="number"
                    step="any"
                    placeholder={`e.g. 75`}
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1.5 font-bold uppercase">Description</label>
                  <input 
                    type="text"
                    placeholder="e.g. Weekly grocery stock"
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1.5 font-bold uppercase">Transaction Date</label>
                  <input 
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 bg-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-sans font-bold transition cursor-pointer shadow-sm active:scale-98"
                  >
                    {editingExpId ? 'Apply Changes' : 'Record Transaction'}
                  </button>
                  {editingExpId && (
                    <button 
                      type="button"
                      onClick={resetExpenseForm}
                      className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-sans font-semibold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Set Budget Form */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
              <h3 className="text-sm font-sans font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Configure Spending limits
              </h3>
              
              <form onSubmit={handleSetBudget} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1.5 font-bold uppercase">Category</label>
                  <select 
                    value={budCategory}
                    onChange={(e) => setBudCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 bg-white"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1.5 font-bold uppercase">Monthly Spending Limit ({currencySymbol})</label>
                  <input 
                    type="number"
                    placeholder="e.g. 500"
                    value={budLimit}
                    onChange={(e) => setBudLimit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-2 border border-blue-600 hover:bg-blue-50 text-blue-600 rounded-xl text-xs font-sans font-bold transition cursor-pointer"
                >
                  Configure Category Limit
                </button>
              </form>
            </div>
          </div>

          {/* List and charts Side */}
          <div className="space-y-8 lg:col-span-2">
            
            {/* Budgets Status meters */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
              <h3 className="text-sm font-sans font-bold text-slate-900 mb-5 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Monthly Category Budget Status
              </h3>

              {budgets.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400">No category limits have been configured for this month cycle.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {budgets.map(b => {
                    const matchedExpenses = expenses.filter(e => e.category.toLowerCase() === b.category.toLowerCase());
                    const spend = matchedExpenses.reduce((sum, e) => sum + e.amount, 0);
                    const pct = Math.round((spend / b.monthly_limit) * 100);
                    const isOver = spend > b.monthly_limit;

                    return (
                      <div key={b.id} className="p-4 border border-slate-100 rounded-xl space-y-2 bg-slate-50/40">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-sans font-bold text-slate-800">{b.category}</span>
                          <div className="font-mono text-slate-600">
                            <span className={`font-bold ${isOver ? 'text-red-600' : 'text-slate-900'}`}>
                              {formatCurrency(spend)}
                            </span>
                            <span className="text-slate-400"> / {formatCurrency(b.monthly_limit)}</span>
                            <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                              pct >= 100 ? 'bg-red-50 text-red-600' : pct >= 80 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                        
                        {/* custom styled progress indicator */}
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comparison Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Allocation chart */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs">
                <h4 className="text-xs font-sans font-bold text-slate-900 mb-4 flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-blue-600" />
                  Outflows Distribution
                </h4>
                <div className="h-44 flex items-center justify-center">
                  {pieChartData.length === 0 ? (
                    <p className="text-xxs text-slate-400">No transactions recorded.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value), 'Spending']} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2 max-h-24 overflow-y-auto pr-1">
                  {pieChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name} ({formatCurrency(item.value)})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Budget vs spend bar chart */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs">
                <h4 className="text-xs font-sans font-bold text-slate-900 mb-4 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Spend vs Defined Caps
                </h4>
                <div className="h-56">
                  {barChartData.length === 0 ? (
                    <p className="text-xxs text-slate-400 flex items-center justify-center h-full">Configure limits to view metric comparison.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <XAxis dataKey="category" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${currencySymbol}${v}`} />
                        <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                        <Legend wrapperStyle={{ fontSize: 9 }} />
                        <Bar dataKey="Budget" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="Spend" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Transactions Log List */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
              <h3 className="text-sm font-sans font-bold text-slate-900 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Transaction Ledger
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md font-bold">{expenses.length} Records</span>
              </h3>

              {expenses.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-400">No transaction records logged.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-mono text-[10px] uppercase font-bold">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((item) => (
                        <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition duration-150">
                          <td className="py-3 px-4 text-slate-500 font-mono font-medium">{item.transaction_date}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium font-sans max-w-[180px] truncate" title={item.description}>
                            {item.description}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-950">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button 
                                onClick={() => handleEditExpense(item)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="Edit Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteExpense(item.id, item.category)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Tab 2: Subscriptions & Recurring */}
      {activeTab === 'recurring' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Tracking Form */}
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
              <h3 className="text-sm font-sans font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Track Subscription
              </h3>
              
              <form onSubmit={handleAddSubscription} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1.5 font-bold uppercase">Service Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Netflix Premium"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 block mb-1.5 font-bold uppercase">Rate ({currencySymbol})</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="14.99"
                      value={subAmount}
                      onChange={(e) => setSubAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 block mb-1.5 font-bold uppercase">Category</label>
                    <select
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 bg-white"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 block mb-1.5 font-bold uppercase">Cycle</label>
                    <select
                      value={subCycle}
                      onChange={(e) => setSubCycle(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 bg-white"
                    >
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 block mb-1.5 font-bold uppercase">Next Renewal</label>
                    <input
                      type="date"
                      value={subDueDate}
                      onChange={(e) => setSubDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-sans font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>Secure Subscription</span>
                </button>
              </form>
            </div>
          </div>

          {/* Subscriptions List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
              <h3 className="text-sm font-sans font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Repeat className="w-5 h-5 text-blue-600" />
                Active Subscription Debits ({subscriptions.length})
              </h3>
              
              {subscriptions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-400">No subscription services currently tracked.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((sub) => (
                    <div 
                      key={sub.id}
                      className={`p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                        sub.isActive ? 'bg-slate-50/40 border-slate-100' : 'bg-slate-50/20 border-slate-100/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          sub.isActive ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          <Repeat className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-sans font-bold text-xs text-slate-900">{sub.name}</h4>
                            <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded-md uppercase font-bold font-mono">
                              {sub.billingCycle}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Next due: {sub.nextDueDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-slate-950 block">
                            {formatCurrency(sub.amount)}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase font-bold font-mono">
                            {sub.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Toggle active state */}
                          <button
                            onClick={() => handleToggleSubscription(sub.id)}
                            className={`px-2 py-1 text-[10px] font-sans font-bold rounded-lg transition cursor-pointer ${
                              sub.isActive ? 'bg-amber-50 text-amber-600 border border-amber-100/50' : 'bg-slate-100 text-slate-600 border border-slate-200/50'
                            }`}
                          >
                            {sub.isActive ? 'Pause' : 'Activate'}
                          </button>

                          {/* Quick Post Expense */}
                          {sub.isActive && (
                            <button
                              onClick={() => handlePostSubscriptionPayment(sub)}
                              className="px-2.5 py-1 text-[10px] font-sans font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer flex items-center gap-1"
                              title="Log payment as expense"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Log Fee</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteSubscription(sub.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Tab 3: Spending Insights & CF */}
      {activeTab === 'insights' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Carry forward inputs */}
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-sans font-bold text-slate-900">Historical Carry Forward</h3>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 mb-4">
                Did you end last month with a surplus? Set your historical surplus carry forward amount here to increase your spending headroom for the active month.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-1.5 font-bold uppercase">Carry Forward Surplus ({currencySymbol})</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{currencySymbol}</span>
                    <input
                      type="number"
                      placeholder="e.g. 150"
                      value={carryForward || ''}
                      onChange={(e) => setCarryForward(Number(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500"
                    />
                  </div>
                </div>
                {carryForward > 0 && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xxs text-emerald-800 leading-normal flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Your available spending pool is increased to <strong>{formatCurrency(effectiveBudgetHeadroom)}</strong>. This buffer protects you from category overspending alarms.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Insights Display */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
              <h3 className="text-sm font-sans font-bold text-slate-900 mb-5 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Spending Insights & Analytics Feed
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Concentration Index */}
                <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/30 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">Outflow Concentration Index</span>
                  {topCategory ? (
                    <>
                      <h4 className="text-xs font-sans font-bold text-slate-800">
                        {topCategory.name} constitutes {topCategoryConcentration}% of total spend
                      </h4>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${topCategoryConcentration}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        {topCategoryConcentration > 50 
                          ? `Caution: Your spending is highly concentrated in "${topCategory.name}". Consider searching for competitive pricing or optimization strategies to balance your profile.`
                          : `Great balance: Your largest spending node is "${topCategory.name}", which is well within standard risk indices.`
                        }
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">Log some transactions to map out concentration levels.</p>
                  )}
                </div>

                {/* Average transactional node */}
                <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/30 space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">Transaction Value average</span>
                    <h4 className="text-lg font-sans font-bold text-slate-800 mt-1">
                      {formatCurrency(averageTransactionSize)}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Based on your ledger's {expenses.length} records, the average size of single transaction outflows is {formatCurrency(averageTransactionSize)}. Small recurring nodes can easily go untracked; examine subscriptions tab.
                  </p>
                </div>
              </div>

              {/* Dynamic Advisory Bullet Points */}
              <div className="mt-6 border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-xs font-sans font-bold text-slate-800">Actionable Financial Diagnostics</h4>
                <div className="space-y-3">
                  <div className="flex gap-3 text-xs leading-relaxed text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <Activity className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800">Velocity Advisory:</strong> Your spending pool is utilizing {totalBudgetLimit > 0 ? Math.round((totalMonthlySpend / effectiveBudgetHeadroom) * 100) : 0}% of absolute capacity. 
                      {netHeadroomRemaining > 0 
                        ? ` You have ${formatCurrency(netHeadroomRemaining)} total surplus. To optimize compounding velocity, consider transferring half to an index SIP compound plan.` 
                        : ` You are in deficit of ${formatCurrency(Math.abs(netHeadroomRemaining))}. Try pausing variable categories (Shopping, Entertainment) immediately.`
                      }
                    </div>
                  </div>

                  <div className="flex gap-3 text-xs leading-relaxed text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <Repeat className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800">Scheduled Leakage Alert:</strong> Active commitments total <strong className="text-slate-800">{formatCurrency(monthlyRecurringOutflows)}/month</strong>. 
                      Subscribing to products often leads to "passive leakage" where clients pay for unused software. Review your tracking list to trim subscriptions and boost your cash-flow.
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
