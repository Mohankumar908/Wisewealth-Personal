/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { User, InvestmentPlan, Expense, Budget, Asset, Liability, AdminOverview, AdminUserListItem } from '../types.ts';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

interface DatabaseSchema {
  users: Array<User & { password_hash: string; salt: string }>;
  plans: InvestmentPlan[];
  expenses: Expense[];
  budgets: Budget[];
  assets: Asset[];
  liabilities: Liability[];
}

class JSONDatabase {
  private cache: DatabaseSchema = { users: [], plans: [], expenses: [], budgets: [], assets: [], liabilities: [] };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.cache = JSON.parse(raw);
        if (!this.cache.expenses) this.cache.expenses = [];
        if (!this.cache.budgets) this.cache.budgets = [];
        if (!this.cache.assets) this.cache.assets = [];
        if (!this.cache.liabilities) this.cache.liabilities = [];
      } else {
        this.save();
      }

      // Purge old demo accounts
      this.cache.users = this.cache.users.filter(
        u => u.email.toLowerCase() !== 'admin@wealthwise.com' && u.email.toLowerCase() !== 'client@wealthwise.com'
      );

      // Configure mohanvkumar8866@gmail.com as the exclusive administrator
      const adminEmail = 'mohanvkumar8866@gmail.com';
      const adminPass = 'Wealthwise@17';
      const salt = this.generateSalt();
      const password_hash = this.hashPassword(adminPass, salt);
      const now = new Date().toISOString();

      const existingAdmin = this.cache.users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase());
      if (existingAdmin) {
        existingAdmin.role = 'admin';
        existingAdmin.is_staff = true;
        existingAdmin.is_active = true;
        existingAdmin.password_hash = password_hash;
        existingAdmin.salt = salt;
        existingAdmin.updated_at = now;
      } else {
        this.cache.users.push({
          id: 'admin_mohan_001',
          email: adminEmail,
          username: 'mohanvkumar',
          first_name: 'Mohankumar',
          last_name: '',
          role: 'admin',
          is_active: true,
          is_staff: true,
          created_at: now,
          updated_at: now,
          password_hash,
          salt,
        });
      }

      // Demote any other user if they have admin/staff status to ensure exclusive admin access
      for (const u of this.cache.users) {
        if (u.email.toLowerCase() !== adminEmail.toLowerCase()) {
          u.role = 'client';
          u.is_staff = false;
        }
      }

      this.save();
    } catch (e) {
      console.error('Database initialization error:', e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (e) {
      console.error('Database write error:', e);
    }
  }

  // --- Auth Utilities ---
  public hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
  }

  public generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // --- User Operations ---
  public createUser(userData: {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    password_plain: string;
  }): User {
    const existing = this.cache.users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existing) {
      throw new Error('User with this email already exists.');
    }

    const salt = this.generateSalt();
    const password_hash = this.hashPassword(userData.password_plain, salt);
    
    const now = new Date().toISOString();
    const newUser: User = {
      id: crypto.randomBytes(8).toString('hex'),
      email: userData.email.toLowerCase(),
      username: userData.username || userData.email.split('@')[0],
      first_name: userData.first_name,
      last_name: userData.last_name,
      is_active: true,
      is_staff: false,
      created_at: now,
      updated_at: now,
    };

    this.cache.users.push({
      ...newUser,
      password_hash,
      salt,
    });
    this.save();
    return newUser;
  }

  public getUserByEmail(email: string) {
    return this.cache.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    const record = this.cache.users.find(u => u.id === id);
    if (!record) return undefined;
    const { password_hash, salt, ...user } = record;
    return user;
  }

  public updateUserProfile(id: string, updates: { first_name?: string; last_name?: string; email?: string }): User {
    const userIndex = this.cache.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('User not found.');
    }

    const now = new Date().toISOString();
    const existing = this.cache.users[userIndex];

    if (updates.email && updates.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailConflict = this.cache.users.find(u => u.email.toLowerCase() === updates.email!.toLowerCase() && u.id !== id);
      if (emailConflict) {
        throw new Error('Email is already taken.');
      }
      existing.email = updates.email.toLowerCase();
    }

    if (updates.first_name !== undefined) existing.first_name = updates.first_name;
    if (updates.last_name !== undefined) existing.last_name = updates.last_name;
    existing.updated_at = now;

    this.save();
    
    const { password_hash, salt, ...user } = existing;
    return user;
  }

  // --- Investment Plan Operations ---
  public getPlansByUserId(userId: string): InvestmentPlan[] {
    return this.cache.plans.filter(p => p.user_id === userId);
  }

  public getPlanById(id: string): InvestmentPlan | undefined {
    return this.cache.plans.find(p => p.id === id);
  }

  public createPlan(userId: string, planData: Omit<InvestmentPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>): InvestmentPlan {
    const now = new Date().toISOString();
    const newPlan: InvestmentPlan = {
      ...planData,
      id: crypto.randomBytes(8).toString('hex'),
      user_id: userId,
      created_at: now,
      updated_at: now,
    };

    this.cache.plans.push(newPlan);
    this.save();
    return newPlan;
  }

  public updatePlan(id: string, userId: string, updates: Partial<Omit<InvestmentPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): InvestmentPlan {
    const planIndex = this.cache.plans.findIndex(p => p.id === id && p.user_id === userId);
    if (planIndex === -1) {
      throw new Error('Plan not found or unauthorized.');
    }

    const now = new Date().toISOString();
    const existing = this.cache.plans[planIndex];

    if (updates.name !== undefined) existing.name = updates.name;
    if (updates.type !== undefined) existing.type = updates.type;
    if (updates.financial_detail !== undefined) existing.financial_detail = { ...existing.financial_detail, ...updates.financial_detail };
    if (updates.projections !== undefined) existing.projections = updates.projections;
    existing.updated_at = now;

    this.save();
    return existing;
  }

  public deletePlan(id: string, userId: string): boolean {
    const initialLen = this.cache.plans.length;
    this.cache.plans = this.cache.plans.filter(p => !(p.id === id && p.user_id === userId));
    const deleted = this.cache.plans.length < initialLen;
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  // --- Expenses Operations ---
  public getExpensesByUserId(userId: string): Expense[] {
    return this.cache.expenses.filter(e => e.user_id === userId);
  }

  public getExpenseById(id: string): Expense | undefined {
    return this.cache.expenses.find(e => e.id === id);
  }

  public createExpense(userId: string, data: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Expense {
    const now = new Date().toISOString();
    const newExpense: Expense = {
      ...data,
      id: crypto.randomBytes(8).toString('hex'),
      user_id: userId,
      created_at: now,
      updated_at: now
    };
    this.cache.expenses.push(newExpense);
    
    // Automatically update relevant budget's current spend if applicable
    this.recalculateBudgetSpend(userId, data.category, new Date(data.transaction_date));

    this.save();
    return newExpense;
  }

  public updateExpense(id: string, userId: string, updates: Partial<Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Expense {
    const idx = this.cache.expenses.findIndex(e => e.id === id && e.user_id === userId);
    if (idx === -1) {
      throw new Error('Expense not found or unauthorized.');
    }
    const original = this.cache.expenses[idx];
    const originalCategory = original.category;
    const originalDate = new Date(original.transaction_date);

    const now = new Date().toISOString();
    this.cache.expenses[idx] = {
      ...original,
      ...updates,
      updated_at: now
    } as Expense;

    const updated = this.cache.expenses[idx];
    
    // Recalculate spending on both old and new categories/months
    this.recalculateBudgetSpend(userId, originalCategory, originalDate);
    if (updated.category !== originalCategory || updated.transaction_date !== original.transaction_date) {
      this.recalculateBudgetSpend(userId, updated.category, new Date(updated.transaction_date));
    }

    this.save();
    return updated;
  }

  public deleteExpense(id: string, userId: string): boolean {
    const expense = this.cache.expenses.find(e => e.id === id && e.user_id === userId);
    if (!expense) return false;

    this.cache.expenses = this.cache.expenses.filter(e => !(e.id === id && e.user_id === userId));
    this.recalculateBudgetSpend(userId, expense.category, new Date(expense.transaction_date));
    this.save();
    return true;
  }

  // --- Budget Operations ---
  public getBudgetsByUserId(userId: string): Budget[] {
    return this.cache.budgets.filter(b => b.user_id === userId);
  }

  public createOrUpdateBudget(userId: string, data: { category: string; monthly_limit: number; month: number; year: number }): Budget {
    let budget = this.cache.budgets.find(b => 
      b.user_id === userId && 
      b.category.toLowerCase() === data.category.toLowerCase() && 
      b.month === data.month && 
      b.year === data.year
    );

    if (budget) {
      budget.monthly_limit = data.monthly_limit;
    } else {
      budget = {
        id: crypto.randomBytes(8).toString('hex'),
        user_id: userId,
        category: data.category,
        monthly_limit: data.monthly_limit,
        current_spend: 0,
        month: data.month,
        year: data.year
      };
      this.cache.budgets.push(budget);
    }

    this.recalculateBudgetSpend(userId, data.category, new Date(data.year, data.month - 1, 15));
    this.save();
    return budget;
  }

  public recalculateBudgetSpend(userId: string, category: string, date: Date) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const budget = this.cache.budgets.find(b => 
      b.user_id === userId && 
      b.category.toLowerCase() === category.toLowerCase() && 
      b.month === month && 
      b.year === year
    );

    if (!budget) return;

    // Filter expenses matching user, category, month, and year
    const matchedExpenses = this.cache.expenses.filter(e => {
      if (e.user_id !== userId || e.category.toLowerCase() !== category.toLowerCase()) return false;
      const eDate = new Date(e.transaction_date);
      return (eDate.getMonth() + 1) === month && eDate.getFullYear() === year;
    });

    budget.current_spend = matchedExpenses.reduce((sum, e) => sum + e.amount, 0);
  }

  // --- Assets Operations ---
  public getAssetsByUserId(userId: string): Asset[] {
    return this.cache.assets.filter(a => a.user_id === userId);
  }

  public createAsset(userId: string, data: Omit<Asset, 'id' | 'user_id'>): Asset {
    const newAsset: Asset = {
      ...data,
      id: crypto.randomBytes(8).toString('hex'),
      user_id: userId
    };
    this.cache.assets.push(newAsset);
    this.save();
    return newAsset;
  }

  public deleteAsset(id: string, userId: string): boolean {
    const len = this.cache.assets.length;
    this.cache.assets = this.cache.assets.filter(a => !(a.id === id && a.user_id === userId));
    const deleted = this.cache.assets.length < len;
    if (deleted) this.save();
    return deleted;
  }

  // --- Liabilities Operations ---
  public getLiabilitiesByUserId(userId: string): Liability[] {
    return this.cache.liabilities.filter(l => l.user_id === userId);
  }

  public createLiability(userId: string, data: Omit<Liability, 'id' | 'user_id'>): Liability {
    const newLiability: Liability = {
      ...data,
      id: crypto.randomBytes(8).toString('hex'),
      user_id: userId
    };
    this.cache.liabilities.push(newLiability);
    this.save();
    return newLiability;
  }

  public deleteLiability(id: string, userId: string): boolean {
    const len = this.cache.liabilities.length;
    this.cache.liabilities = this.cache.liabilities.filter(l => !(l.id === id && l.user_id === userId));
    const deleted = this.cache.liabilities.length < len;
    if (deleted) this.save();
    return deleted;
  }

  // --- Admin Operations ---
  public getAllUsersAdmin(): AdminUserListItem[] {
    return this.cache.users.map(u => {
      const { password_hash, salt, ...safeUser } = u;
      const userPlans = this.cache.plans.filter(p => p.user_id === u.id);
      const userExpenses = this.cache.expenses.filter(e => e.user_id === u.id);
      const userAssets = this.cache.assets.filter(a => a.user_id === u.id);
      const userLiabs = this.cache.liabilities.filter(l => l.user_id === u.id);
      
      const totalAssets = userAssets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
      const totalLiabs = userLiabs.reduce((sum, l) => sum + (Number(l.amount_remaining) || 0), 0);
      
      return {
        ...safeUser,
        role: (u.role || (u.is_staff ? 'admin' : 'client')),
        planCount: userPlans.length,
        expenseCount: userExpenses.length,
        assetCount: userAssets.length,
        liabilityCount: userLiabs.length,
        netWorth: totalAssets - totalLiabs,
      };
    });
  }

  public setUserActive(userId: string, is_active: boolean): boolean {
    const user = this.cache.users.find(u => u.id === userId);
    if (!user) return false;
    user.is_active = is_active;
    user.updated_at = new Date().toISOString();
    this.save();
    return true;
  }

  public setUserRole(userId: string, role: 'admin' | 'client'): boolean {
    const user = this.cache.users.find(u => u.id === userId);
    if (!user) return false;
    user.role = role;
    user.is_staff = role === 'admin';
    user.updated_at = new Date().toISOString();
    this.save();
    return true;
  }

  public deleteUser(userId: string): boolean {
    const initialLen = this.cache.users.length;
    this.cache.users = this.cache.users.filter(u => u.id !== userId);
    if (this.cache.users.length < initialLen) {
      this.cache.plans = this.cache.plans.filter(p => p.user_id !== userId);
      this.cache.expenses = this.cache.expenses.filter(e => e.user_id !== userId);
      this.cache.budgets = this.cache.budgets.filter(b => b.user_id !== userId);
      this.cache.assets = this.cache.assets.filter(a => a.user_id !== userId);
      this.cache.liabilities = this.cache.liabilities.filter(l => l.user_id !== userId);
      this.save();
      return true;
    }
    return false;
  }

  public getAdminOverview(): AdminOverview {
    const totalUsers = this.cache.users.length;
    const totalAdmins = this.cache.users.filter(u => u.is_staff || u.role === 'admin').length;
    const totalClients = totalUsers - totalAdmins;
    const totalPlans = this.cache.plans.length;
    const totalExpenses = this.cache.expenses.length;
    const totalAssetsTracked = this.cache.assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    const totalLiabilitiesTracked = this.cache.liabilities.reduce((sum, l) => sum + (Number(l.amount_remaining) || 0), 0);
    const activeUsers = this.cache.users.filter(u => u.is_active).length;
    const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 100;

    return {
      totalUsers,
      totalClients,
      totalAdmins,
      totalPlans,
      totalExpenses,
      totalAssetsTracked,
      totalLiabilitiesTracked,
      systemUptime: Math.floor(process.uptime()),
      activeRate,
    };
  }

  public getAllPlansAdmin() {
    return this.cache.plans.map(p => {
      const author = this.cache.users.find(u => u.id === p.user_id);
      return {
        ...p,
        author_name: author ? `${author.first_name} ${author.last_name}`.trim() || author.username : 'Unknown Client',
        author_email: author ? author.email : 'Unknown Email',
      };
    });
  }
}

export const db = new JSONDatabase();
