/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role?: 'admin' | 'client';
  is_active: boolean;
  is_staff: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminOverview {
  totalUsers: number;
  totalClients: number;
  totalAdmins: number;
  totalPlans: number;
  totalExpenses: number;
  totalAssetsTracked: number;
  totalLiabilitiesTracked: number;
  systemUptime: number;
  activeRate: number;
}

export interface AdminUserListItem extends User {
  planCount: number;
  expenseCount: number;
  assetCount: number;
  liabilityCount: number;
  netWorth: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  refreshToken?: string;
  user?: User;
  errors?: Record<string, string>;
}

export type PlanType = 'compound' | 'sip' | 'goal' | 'stepup';

export interface FinancialDetail {
  principal: number;
  sip_amount: number;
  target_amount: number;
  interest_rate: number;
  duration: number;
  inflation_rate: number;
}

export interface Projection {
  year: number;
  invested_amount: number;
  interest_earned: number;
  maturity_amount: number;
  purchasing_power?: number; // inflation adjusted
}

export interface InvestmentPlan {
  id: string;
  user_id: string;
  name: string;
  type: PlanType;
  financial_detail: FinancialDetail;
  projections: Projection[];
  created_at: string;
  updated_at: string;
}

// Calculator Request and Response Types
export interface CompoundCalcRequest {
  principal: number;
  rate: number;
  duration: number;
  frequency: 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
}

export interface CompoundCalcResponse {
  finalAmount: number;
  interestEarned: number;
  projections: Projection[];
}

export interface SIPCalcRequest {
  monthlySip: number;
  rate: number;
  duration: number;
}

export interface SIPCalcResponse {
  totalInvestment: number;
  totalReturns: number;
  finalCorpus: number;
  projections: Projection[];
}

export interface GoalCalcRequest {
  targetAmount: number;
  rate: number;
  duration: number;
}

export interface GoalCalcResponse {
  requiredMonthlySip: number;
  totalInvestment: number;
  totalReturns: number;
  projections: Projection[];
}

export interface InflationCalcRequest {
  futureAmount: number;
  inflationRate: number;
  duration: number;
}

export interface InflationCalcResponse {
  presentValue: number;
}

export interface StepUpSIPRequest {
  initialSip: number;
  annualIncrementPercent: number;
  duration: number;
  rate: number;
}

export interface StepUpSIPResponse {
  finalCorpus: number;
  totalInvestment: number;
  totalReturns: number;
  projections: Projection[];
}

// API generic response format
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
}

// Personal Finance Ecosystem Types
export interface Expense {
  id: string;
  user_id: string;
  category: 'Food' | 'Rent' | 'Transportation' | 'Shopping' | 'Entertainment' | 'Healthcare' | 'Utilities' | 'Investments' | 'Education' | 'Others';
  amount: number;
  description: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  current_spend: number;
  month: number;
  year: number;
}

export interface Asset {
  id: string;
  user_id: string;
  asset_type: 'Savings Account' | 'Fixed Deposits' | 'Stocks' | 'Mutual Funds' | 'Gold' | 'Real Estate' | 'Crypto';
  name: string;
  value: number;
}

export interface Liability {
  id: string;
  user_id: string;
  liability_type: 'Home Loan' | 'Education Loan' | 'Car Loan' | 'Credit Card Debt';
  name: string;
  amount_remaining: number;
  interest_rate: number;
}

export interface RiskProfile {
  age: number;
  income: number;
  dependents: number;
  horizon: number;
  appetite: 'low' | 'medium' | 'high';
  score?: 'Conservative' | 'Moderate' | 'Aggressive';
}
