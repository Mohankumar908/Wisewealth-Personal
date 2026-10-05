/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import { db } from './src/server/db.ts';
import {
  calculateCompoundInterest,
  calculateSIP,
  calculateGoalSIP,
  calculateInflation,
  calculateStepUpSIP
} from './src/server/finance.ts';

// Setup environment variables
import dotenv from 'dotenv';
dotenv.config();

// Lazy Gemini Client Initialization
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Token utilities for standard, secure, self-contained token management
const TOKEN_SECRET = process.env.JWT_SECRET || 'wealthwise_secret_vault_987654321';

function generateToken(payload: object): string {
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${signature}`;
}

function verifyToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [head, body, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(`${head}.${body}`).digest('base64url');
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

// Authentication Middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication token required.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(403).json({ success: false, message: 'Invalid or expired authentication token.' });
    return;
  }

  req.user = payload;
  next();
}

function authenticateAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  authenticateToken(req, res, () => {
    const user = db.getUserById(req.user!.id);
    if (!user || (!user.is_staff && user.role !== 'admin')) {
      res.status(403).json({
        success: false,
        message: 'Access Denied: Administrative privileges required.',
      });
      return;
    }
    req.user = { id: user.id, email: user.email };
    next();
  });
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/v1/auth/register', (req: Request, res: Response) => {
  const { name, email, password, confirmPassword } = req.body;

  // Validation
  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Full name is required.';
  if (!email) errors.email = 'Email address is required.';
  if (!password) errors.password = 'Password is required.';
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';

  if (Object.keys(errors).length > 0) {
    res.status(400).json({ success: false, message: 'Validation failed', errors });
    return;
  }

  try {
    const names = name.trim().split(' ');
    const first_name = names[0];
    const last_name = names.slice(1).join(' ') || '';

    const newUser = db.createUser({
      email,
      username: email.split('@')[0],
      first_name,
      last_name,
      password_plain: password,
    });

    const token = generateToken({ id: newUser.id, email: newUser.email });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: newUser,
      },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Registration failed.',
    });
  }
});

app.post('/api/v1/auth/login', (req: Request, res: Response) => {
  const { email, password, portal } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
    return;
  }

  const record = db.getUserByEmail(email);
  if (!record) {
    res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
    return;
  }

  const computedHash = db.hashPassword(password, record.salt);
  if (computedHash !== record.password_hash) {
    res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
    return;
  }

  if (record.is_active === false) {
    res.status(403).json({
      success: false,
      message: 'This account has been suspended by an administrator.',
    });
    return;
  }

  const isAdmin = record.is_staff || record.role === 'admin';

  // Strict separate access check: if portal is 'admin', only mohanvkumar8866@gmail.com can log in
  if (portal === 'admin') {
    if (!isAdmin || record.email.toLowerCase() !== 'mohanvkumar8866@gmail.com') {
      res.status(403).json({
        success: false,
        message: 'Access Denied: Administrative privileges required. Only authorized administrator can access this portal.',
      });
      return;
    }
  }

  const token = generateToken({ id: record.id, email: record.email });
  const { password_hash, salt, ...safeUser } = record;
  const user = {
    ...safeUser,
    role: isAdmin ? 'admin' : (record.role || 'client'),
  };

  res.status(200).json({
    success: true,
    message: `${isAdmin ? 'Administrator' : 'Client'} login successful`,
    data: {
      token,
      user,
    },
  });
});

app.post('/api/v1/auth/token/refresh', (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ success: false, message: 'Token is required.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    return;
  }

  const newToken = generateToken({ id: payload.id, email: payload.email });
  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: { token: newToken },
  });
});

app.get('/api/v1/auth/profile', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const user = db.getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User profile not found.' });
    return;
  }

  const safeUser = {
    ...user,
    role: (user.is_staff || user.role === 'admin') ? 'admin' : 'client',
  };

  res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    data: safeUser,
  });
});

app.put('/api/v1/auth/profile', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const { first_name, last_name, email } = req.body;

  try {
    const updatedUser = db.updateUserProfile(req.user!.id, { first_name, last_name, email });
    const safeUser = {
      ...updatedUser,
      role: (updatedUser.is_staff || updatedUser.role === 'admin') ? 'admin' : 'client',
    };
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: safeUser,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Profile update failed.',
    });
  }
});

// ==========================================
// ADMIN MANAGEMENT ENDPOINTS
// ==========================================

app.get('/api/v1/admin/overview', authenticateAdmin as any, (req: AuthenticatedRequest, res: Response) => {
  const overview = db.getAdminOverview();
  res.status(200).json({
    success: true,
    message: 'System overview retrieved successfully',
    data: overview,
  });
});

app.get('/api/v1/admin/users', authenticateAdmin as any, (req: AuthenticatedRequest, res: Response) => {
  const users = db.getAllUsersAdmin();
  res.status(200).json({
    success: true,
    message: 'Client and admin directory retrieved successfully',
    data: users,
  });
});

app.patch('/api/v1/admin/users/:id/status', authenticateAdmin as any, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (id === req.user!.id) {
    res.status(400).json({ success: false, message: 'Administrators cannot modify their own active status.' });
    return;
  }

  const success = db.setUserActive(id, !!is_active);
  if (!success) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  res.status(200).json({
    success: true,
    message: `User status updated to ${is_active ? 'Active' : 'Suspended'}.`,
  });
});

app.patch('/api/v1/admin/users/:id/role', authenticateAdmin as any, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (id === req.user!.id) {
    res.status(400).json({ success: false, message: 'Administrators cannot modify their own role.' });
    return;
  }

  if (role !== 'admin' && role !== 'client') {
    res.status(400).json({ success: false, message: 'Invalid role. Must be "admin" or "client".' });
    return;
  }

  const success = db.setUserRole(id, role);
  if (!success) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  res.status(200).json({
    success: true,
    message: `User role successfully updated to ${role}.`,
  });
});

app.delete('/api/v1/admin/users/:id', authenticateAdmin as any, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  if (id === req.user!.id) {
    res.status(400).json({ success: false, message: 'Administrators cannot delete their own account.' });
    return;
  }

  const success = db.deleteUser(id);
  if (!success) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'User and all associated portfolios removed successfully.',
  });
});

app.get('/api/v1/admin/plans', authenticateAdmin as any, (req: AuthenticatedRequest, res: Response) => {
  const plans = db.getAllPlansAdmin();
  res.status(200).json({
    success: true,
    message: 'All client investment plans retrieved successfully',
    data: plans,
  });
});

// ==========================================
// CALCULATOR ENDPOINTS
// ==========================================

app.post('/api/v1/finance/calculate/compound', (req: Request, res: Response) => {
  const { principal, rate, duration, frequency, inflationRate } = req.body;
  
  if (principal === undefined || rate === undefined || duration === undefined) {
    res.status(400).json({ success: false, message: 'Required fields missing.' });
    return;
  }

  const result = calculateCompoundInterest({
    principal: Number(principal),
    rate: Number(rate),
    duration: Number(duration),
    frequency: frequency || 'annually',
  }, Number(inflationRate || 0));

  res.status(200).json({
    success: true,
    message: 'Compound interest calculated successfully',
    data: result,
  });
});

app.post('/api/v1/finance/calculate/sip', (req: Request, res: Response) => {
  const { monthlySip, rate, duration, inflationRate } = req.body;

  if (monthlySip === undefined || rate === undefined || duration === undefined) {
    res.status(400).json({ success: false, message: 'Required fields missing.' });
    return;
  }

  const result = calculateSIP({
    monthlySip: Number(monthlySip),
    rate: Number(rate),
    duration: Number(duration),
  }, Number(inflationRate || 0));

  res.status(200).json({
    success: true,
    message: 'SIP calculated successfully',
    data: result,
  });
});

app.post('/api/v1/finance/calculate/goal', (req: Request, res: Response) => {
  const { targetAmount, rate, duration, inflationRate } = req.body;

  if (targetAmount === undefined || rate === undefined || duration === undefined) {
    res.status(400).json({ success: false, message: 'Required fields missing.' });
    return;
  }

  const result = calculateGoalSIP({
    targetAmount: Number(targetAmount),
    rate: Number(rate),
    duration: Number(duration),
  }, Number(inflationRate || 0));

  res.status(200).json({
    success: true,
    message: 'Goal planning completed successfully',
    data: result,
  });
});

app.post('/api/v1/finance/calculate/inflation', (req: Request, res: Response) => {
  const { futureAmount, inflationRate, duration } = req.body;

  if (futureAmount === undefined || inflationRate === undefined || duration === undefined) {
    res.status(400).json({ success: false, message: 'Required fields missing.' });
    return;
  }

  const result = calculateInflation({
    futureAmount: Number(futureAmount),
    inflationRate: Number(inflationRate),
    duration: Number(duration),
  });

  res.status(200).json({
    success: true,
    message: 'Inflation adjusted equivalent computed successfully',
    data: result,
  });
});

app.post('/api/v1/finance/calculate/stepup', (req: Request, res: Response) => {
  const { initialSip, annualIncrementPercent, duration, rate, inflationRate } = req.body;

  if (initialSip === undefined || annualIncrementPercent === undefined || duration === undefined || rate === undefined) {
    res.status(400).json({ success: false, message: 'Required fields missing.' });
    return;
  }

  const result = calculateStepUpSIP({
    initialSip: Number(initialSip),
    annualIncrementPercent: Number(annualIncrementPercent),
    duration: Number(duration),
    rate: Number(rate),
  }, Number(inflationRate || 0));

  res.status(200).json({
    success: true,
    message: 'Step-up SIP calculated successfully',
    data: result,
  });
});

// ==========================================
// INVESTMENT PLANS (SAVED CALCS / PLANS)
// ==========================================

app.get('/api/v1/plans', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const plans = db.getPlansByUserId(req.user!.id);
  res.status(200).json({
    success: true,
    message: 'Plans retrieved successfully',
    data: plans,
  });
});

app.get('/api/v1/plans/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const plan = db.getPlanById(req.params.id);
  if (!plan || plan.user_id !== req.user!.id) {
    res.status(404).json({ success: false, message: 'Investment plan not found.' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Plan retrieved successfully',
    data: plan,
  });
});

app.post('/api/v1/plans', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const { name, type, financial_detail, projections } = req.body;

  if (!name || !type || !financial_detail || !projections) {
    res.status(400).json({ success: false, message: 'Missing required plan properties.' });
    return;
  }

  try {
    const newPlan = db.createPlan(req.user!.id, {
      name,
      type,
      financial_detail,
      projections,
    });

    res.status(201).json({
      success: true,
      message: 'Investment plan saved successfully',
      data: newPlan,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to save plan.' });
  }
});

app.put('/api/v1/plans/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const { name, type, financial_detail, projections } = req.body;

  try {
    const updated = db.updatePlan(req.params.id, req.user!.id, {
      name,
      type,
      financial_detail,
      projections,
    });

    res.status(200).json({
      success: true,
      message: 'Investment plan updated successfully',
      data: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to update plan.' });
  }
});

app.delete('/api/v1/plans/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.deletePlan(req.params.id, req.user!.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Plan not found or unauthorized.' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Investment plan deleted successfully',
  });
});

// ==========================================
// EXPENSE TRACKING ENDPOINTS
// ==========================================

app.get('/api/v1/expenses', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const expenses = db.getExpensesByUserId(req.user!.id);
  res.status(200).json({
    success: true,
    message: 'Expenses retrieved successfully',
    data: expenses,
  });
});

app.post('/api/v1/expenses', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const { category, amount, description, transaction_date } = req.body;

  if (!category || amount === undefined || !description || !transaction_date) {
    res.status(400).json({ success: false, message: 'Missing required expense fields.' });
    return;
  }

  try {
    const expense = db.createExpense(req.user!.id, {
      category,
      amount: Number(amount),
      description,
      transaction_date,
    });

    res.status(201).json({
      success: true,
      message: 'Expense added successfully',
      data: expense,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to add expense.' });
  }
});

app.put('/api/v1/expenses/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const { category, amount, description, transaction_date } = req.body;

  try {
    const updated = db.updateExpense(req.params.id, req.user!.id, {
      category,
      amount: amount !== undefined ? Number(amount) : undefined,
      description,
      transaction_date,
    });

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to update expense.' });
  }
});

app.delete('/api/v1/expenses/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.deleteExpense(req.params.id, req.user!.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Expense not found or unauthorized.' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Expense deleted successfully',
  });
});

// ==========================================
// BUDGET MANAGEMENT ENDPOINTS
// ==========================================

app.get('/api/v1/budgets', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const budgets = db.getBudgetsByUserId(req.user!.id);
  res.status(200).json({
    success: true,
    message: 'Budgets retrieved successfully',
    data: budgets,
  });
});

app.post('/api/v1/budgets', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const { category, monthly_limit, month, year } = req.body;

  if (!category || monthly_limit === undefined || month === undefined || year === undefined) {
    res.status(400).json({ success: false, message: 'Missing required budget fields.' });
    return;
  }

  try {
    const budget = db.createOrUpdateBudget(req.user!.id, {
      category,
      monthly_limit: Number(monthly_limit),
      month: Number(month),
      year: Number(year),
    });

    res.status(200).json({
      success: true,
      message: 'Budget standard secured successfully',
      data: budget,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to update budget.' });
  }
});

// ==========================================
// ASSET & LIABILITY ENDPOINTS
// ==========================================

app.get('/api/v1/assets', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const assets = db.getAssetsByUserId(req.user!.id);
  res.status(200).json({
    success: true,
    message: 'Assets retrieved successfully',
    data: assets,
  });
});

app.post('/api/v1/assets', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const { asset_type, name, value } = req.body;

  if (!asset_type || !name || value === undefined) {
    res.status(400).json({ success: false, message: 'Missing required asset fields.' });
    return;
  }

  try {
    const asset = db.createAsset(req.user!.id, {
      asset_type,
      name,
      value: Number(value),
    });

    res.status(201).json({
      success: true,
      message: 'Asset recorded successfully',
      data: asset,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to save asset.' });
  }
});

app.delete('/api/v1/assets/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.deleteAsset(req.params.id, req.user!.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Asset not found or unauthorized.' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Asset deleted successfully',
  });
});

app.get('/api/v1/liabilities', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const liabilities = db.getLiabilitiesByUserId(req.user!.id);
  res.status(200).json({
    success: true,
    message: 'Liabilities retrieved successfully',
    data: liabilities,
  });
});

app.post('/api/v1/liabilities', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const { liability_type, name, amount_remaining, interest_rate } = req.body;

  if (!liability_type || !name || amount_remaining === undefined || interest_rate === undefined) {
    res.status(400).json({ success: false, message: 'Missing required liability fields.' });
    return;
  }

  try {
    const liability = db.createLiability(req.user!.id, {
      liability_type,
      name,
      amount_remaining: Number(amount_remaining),
      interest_rate: Number(interest_rate),
    });

    res.status(201).json({
      success: true,
      message: 'Liability recorded successfully',
      data: liability,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to save liability.' });
  }
});

app.delete('/api/v1/liabilities/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.deleteLiability(req.params.id, req.user!.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Liability not found or unauthorized.' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Liability deleted successfully',
  });
});

// ==========================================
// AI FINANCIAL INSIGHTS ENDPOINT & CACHE
// ==========================================

interface CachedInsights {
  timestamp: number;
  data: any[];
}
const insightsCache = new Map<string, CachedInsights>();

app.post('/api/v1/ai/insights', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const now = Date.now();
  const cached = insightsCache.get(userId);

  // Serve from cache if requested within 3 minutes to strictly respect Gemini rate limits
  if (cached && (now - cached.timestamp < 3 * 60 * 1000)) {
    res.status(200).json({
      success: true,
      message: 'Retrieved intelligent AI insights (cached)',
      data: cached.data,
    });
    return;
  }

  const expenses = db.getExpensesByUserId(userId);
  const budgets = db.getBudgetsByUserId(userId);
  const plans = db.getPlansByUserId(userId);
  const assets = db.getAssetsByUserId(userId);
  const liabilities = db.getLiabilitiesByUserId(userId);

  const getFallbacks = () => {
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
    const totalLiab = liabilities.reduce((sum, l) => sum + l.amount_remaining, 0);
    const netWorth = totalAssets - totalLiab;

    return [
      {
        title: "Liquidity Ratio Standard",
        message: `Your current liquid assets total ${new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(totalAssets)}. Keeping 3-6 months of expenses in high-interest accounts is recommended for emergency protection.`,
        type: "info",
        impact: "High Impact"
      },
      {
        title: "Asset-Liability Alignment",
        message: netWorth >= 0 
          ? `Positive net worth of ${new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(netWorth)}. Your assets exceed liabilities by ${(totalAssets / Math.max(1, totalLiab)).toFixed(1)}x. Consider prepaying any high APR loans.`
          : `Attention required: Net worth is currently negative at ${new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(netWorth)}. Prioritize credit card or short-term debt repayments.`,
        type: netWorth >= 0 ? "success" : "alert",
        impact: "High Impact"
      },
      {
        title: "Compounding Growth Velocity",
        message: plans.length > 0
          ? `You have ${plans.length} active wealth plans. Your compounding velocity is active. Review step-up increments annually to accelerate target dates.`
          : "No wealth projection plans saved yet. Navigate to Interactive Calculators to set up your first retirement, education, or house planning compounding models.",
        type: "tip",
        impact: "Medium Impact"
      }
    ];
  };

  const ai = getAiClient();
  if (!ai) {
    const fallbackData = getFallbacks();
    insightsCache.set(userId, { timestamp: now, data: fallbackData });
    res.status(200).json({
      success: true,
      message: 'Retrieved analytical insights (Fallback Mode)',
      data: fallbackData,
    });
    return;
  }

  try {
    const prompt = `You are an expert AI Financial Advisor for the WealthWise platform. 
Analyze the following personal financial data for the user:
- Current Expenses: ${JSON.stringify(expenses)}
- Budgets Set: ${JSON.stringify(budgets)}
- Saved Financial Plans/Projections: ${JSON.stringify(plans)}
- Assets: ${JSON.stringify(assets)}
- Liabilities: ${JSON.stringify(liabilities)}

Generate 3-4 highly personalized, actionable, professional financial insights, including:
1. Spending patterns and savings opportunities based on expense tracking and budget constraints.
2. Retirement, education, or goal readiness observations based on saved plans.
3. Specific asset allocation or budget optimization suggestions.
4. An objective summary of their overall financial health.

Ensure the recommendations are concrete and mathematically grounded (e.g., "Reducing your discretionary food spend by 10% could add $1,200 annually to your Retirement plan").
Return your response as a valid JSON array of objects, where each object has these exact fields:
- title (string): short bold header
- message (string): detailed advice with figures
- type (string): one of "alert" | "success" | "info" | "tip"
- impact (string): e.g., "Medium Impact", "High Impact"
`;

    // Resilient generation with automatic retry & fallback model handling
    let insightsData: any[] | null = null;
    const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];

    for (const model of candidateModels) {
      if (insightsData) break;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    message: { type: Type.STRING },
                    type: { type: Type.STRING },
                    impact: { type: Type.STRING },
                  },
                  required: ["title", "message", "type", "impact"],
                }
              }
            }
          });

          if (response.text) {
            const parsed = JSON.parse(response.text);
            if (Array.isArray(parsed) && parsed.length > 0) {
              insightsData = parsed;
              break;
            }
          }
        } catch {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 800));
          }
        }
      }
    }

    const finalData = insightsData || cached?.data || getFallbacks();
    insightsCache.set(userId, { timestamp: now, data: finalData });

    res.status(200).json({
      success: true,
      message: insightsData ? 'Retrieved intelligent AI insights' : 'Retrieved personalized analytical insights',
      data: finalData,
    });
  } catch {
    const fallbackData = cached?.data || getFallbacks();
    insightsCache.set(userId, { timestamp: now, data: fallbackData });

    res.status(200).json({
      success: true,
      message: 'Retrieved personalized analytical insights',
      data: fallbackData,
    });
  }
});

// ==========================================
// VITE DEV SERVER OR STATIC SERVING
// ==========================================

async function startServer() {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.PORT && process.env.PORT !== '3000') ||
    (process.env.NODE_ENV !== 'development' && fs.existsSync(path.join(process.cwd(), 'dist', 'index.html')));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WealthWise Server] listening on http://0.0.0.0:${PORT} (Production: ${isProduction})`);
  });
}

startServer();
