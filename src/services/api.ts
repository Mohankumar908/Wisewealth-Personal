/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
  ApiResponse,
  CompoundCalcRequest,
  CompoundCalcResponse,
  SIPCalcRequest,
  SIPCalcResponse,
  GoalCalcRequest,
  GoalCalcResponse,
  InflationCalcRequest,
  InflationCalcResponse,
  StepUpSIPRequest,
  StepUpSIPResponse,
  InvestmentPlan,
  Expense,
  Budget,
  Asset,
  Liability,
  AdminOverview,
  AdminUserListItem
} from '../types.js';

const BASE_URL = '/api/v1';

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('ww_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'An error occurred during request.',
          errors: data.errors,
        };
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Network connection error.',
      };
    }
  }

  // --- Auth API ---
  public async register(payload: any): Promise<ApiResponse<{ token: string; user: User }>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async login(payload: any): Promise<ApiResponse<{ token: string; user: User }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getProfile(): Promise<ApiResponse<User>> {
    return this.request('/auth/profile', {
      method: 'GET',
    });
  }

  public async updateProfile(payload: Partial<User>): Promise<ApiResponse<User>> {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // --- Finance Calculators API ---
  public async calculateCompound(req: CompoundCalcRequest & { inflationRate?: number }): Promise<ApiResponse<CompoundCalcResponse>> {
    return this.request('/finance/calculate/compound', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  public async calculateSIP(req: SIPCalcRequest & { inflationRate?: number }): Promise<ApiResponse<SIPCalcResponse>> {
    return this.request('/finance/calculate/sip', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  public async calculateGoal(req: GoalCalcRequest & { inflationRate?: number }): Promise<ApiResponse<GoalCalcResponse>> {
    return this.request('/finance/calculate/goal', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  public async calculateInflation(req: InflationCalcRequest): Promise<ApiResponse<InflationCalcResponse>> {
    return this.request('/finance/calculate/inflation', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  public async calculateStepUp(req: StepUpSIPRequest & { inflationRate?: number }): Promise<ApiResponse<StepUpSIPResponse>> {
    return this.request('/finance/calculate/stepup', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // --- Investment Plans CRUD API ---
  public async listPlans(): Promise<ApiResponse<InvestmentPlan[]>> {
    return this.request('/plans', {
      method: 'GET',
    });
  }

  public async getPlan(id: string): Promise<ApiResponse<InvestmentPlan>> {
    return this.request(`/plans/${id}`, {
      method: 'GET',
    });
  }

  public async createPlan(plan: Omit<InvestmentPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<InvestmentPlan>> {
    return this.request('/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  }

  public async updatePlan(id: string, plan: Partial<Omit<InvestmentPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<InvestmentPlan>> {
    return this.request(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plan),
    });
  }

  public async deletePlan(id: string): Promise<ApiResponse<boolean>> {
    return this.request(`/plans/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Expenses API ---
  public async listExpenses(): Promise<ApiResponse<Expense[]>> {
    return this.request('/expenses', { method: 'GET' });
  }

  public async createExpense(expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Expense>> {
    return this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  }

  public async updateExpense(id: string, expense: Partial<Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<Expense>> {
    return this.request(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expense),
    });
  }

  public async deleteExpense(id: string): Promise<ApiResponse<boolean>> {
    return this.request(`/expenses/${id}`, { method: 'DELETE' });
  }

  // --- Budgets API ---
  public async listBudgets(): Promise<ApiResponse<Budget[]>> {
    return this.request('/budgets', { method: 'GET' });
  }

  public async createBudget(budget: { category: string; monthly_limit: number; month: number; year: number }): Promise<ApiResponse<Budget>> {
    return this.request('/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    });
  }

  // --- Assets API ---
  public async listAssets(): Promise<ApiResponse<Asset[]>> {
    return this.request('/assets', { method: 'GET' });
  }

  public async createAsset(asset: Omit<Asset, 'id' | 'user_id'>): Promise<ApiResponse<Asset>> {
    return this.request('/assets', {
      method: 'POST',
      body: JSON.stringify(asset),
    });
  }

  public async deleteAsset(id: string): Promise<ApiResponse<boolean>> {
    return this.request(`/assets/${id}`, { method: 'DELETE' });
  }

  // --- Liabilities API ---
  public async listLiabilities(): Promise<ApiResponse<Liability[]>> {
    return this.request('/liabilities', { method: 'GET' });
  }

  public async createLiability(liability: Omit<Liability, 'id' | 'user_id'>): Promise<ApiResponse<Liability>> {
    return this.request('/liabilities', {
      method: 'POST',
      body: JSON.stringify(liability),
    });
  }

  public async deleteLiability(id: string): Promise<ApiResponse<boolean>> {
    return this.request(`/liabilities/${id}`, { method: 'DELETE' });
  }

  // --- AI Insights API ---
  public async getAiInsights(): Promise<ApiResponse<any[]>> {
    return this.request('/ai/insights', { method: 'POST' });
  }

  // --- Admin Management API ---
  public async getAdminOverview(): Promise<ApiResponse<AdminOverview>> {
    return this.request('/admin/overview', { method: 'GET' });
  }

  public async getAdminUsers(): Promise<ApiResponse<AdminUserListItem[]>> {
    return this.request('/admin/users', { method: 'GET' });
  }

  public async updateAdminUserStatus(id: string, is_active: boolean): Promise<ApiResponse<any>> {
    return this.request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    });
  }

  public async updateAdminUserRole(id: string, role: 'admin' | 'client'): Promise<ApiResponse<any>> {
    return this.request(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  public async deleteAdminUser(id: string): Promise<ApiResponse<any>> {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  public async getAdminPlans(): Promise<ApiResponse<any[]>> {
    return this.request('/admin/plans', { method: 'GET' });
  }
}

export const api = new ApiClient();
