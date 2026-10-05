/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Users,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  Trash2,
  BarChart3,
  TrendingUp,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  Database,
  ArrowRight,
  UserMinus,
  Activity,
  Award
} from 'lucide-react';
import { AdminOverview, AdminUserListItem, User } from '../types.js';
import { api } from '../services/api.js';

interface AdminConsoleProps {
  currentUser: User;
  currency: string;
  onSwitchToClientView: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function AdminConsole({
  currentUser,
  currency,
  onSwitchToClientView,
  showToast
}: AdminConsoleProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [usersList, setUsersList] = useState<AdminUserListItem[]>([]);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'plans' | 'system'>('users');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'client'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [overviewRes, usersRes, plansRes] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers(),
        api.getAdminPlans()
      ]);

      if (overviewRes.success && overviewRes.data) {
        setOverview(overviewRes.data);
      }
      if (usersRes.success && usersRes.data) {
        setUsersList(usersRes.data);
      }
      if (plansRes.success && plansRes.data) {
        setAllPlans(plansRes.data);
      }
    } catch {
      showToast('Failed to load administrative platform data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userItem: AdminUserListItem) => {
    if (userItem.id === currentUser.id) {
      showToast('You cannot deactivate your own administrative account.', 'error');
      return;
    }

    const newStatus = !userItem.is_active;
    setActionLoadingId(userItem.id);
    const res = await api.updateAdminUserStatus(userItem.id, newStatus);
    setActionLoadingId(null);

    if (res.success) {
      showToast(res.message, 'success');
      setUsersList(prev =>
        prev.map(u => (u.id === userItem.id ? { ...u, is_active: newStatus } : u))
      );
      if (overview) {
        setOverview({
          ...overview,
          activeRate: Math.round(
            (usersList.filter(u => (u.id === userItem.id ? newStatus : u.is_active)).length / usersList.length) * 100
          )
        });
      }
    } else {
      showToast(res.message || 'Action failed.', 'error');
    }
  };

  const handleToggleRole = async (userItem: AdminUserListItem) => {
    if (userItem.id === currentUser.id) {
      showToast('You cannot modify your own administrative role.', 'error');
      return;
    }

    const currentRole = userItem.role || (userItem.is_staff ? 'admin' : 'client');
    const newRole: 'admin' | 'client' = currentRole === 'admin' ? 'client' : 'admin';

    setActionLoadingId(userItem.id);
    const res = await api.updateAdminUserRole(userItem.id, newRole);
    setActionLoadingId(null);

    if (res.success) {
      showToast(res.message, 'success');
      setUsersList(prev =>
        prev.map(u =>
          u.id === userItem.id
            ? { ...u, role: newRole, is_staff: newRole === 'admin' }
            : u
        )
      );
      if (overview) {
        setOverview({
          ...overview,
          totalAdmins: overview.totalAdmins + (newRole === 'admin' ? 1 : -1),
          totalClients: overview.totalClients + (newRole === 'client' ? 1 : -1)
        });
      }
    } else {
      showToast(res.message || 'Action failed.', 'error');
    }
  };

  const handleDeleteUser = async (userItem: AdminUserListItem) => {
    if (userItem.id === currentUser.id) {
      showToast('You cannot delete your own administrative account.', 'error');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete user "${userItem.first_name || userItem.username}" (${userItem.email}) and all their portfolios and financial records? This cannot be undone.`
    );
    if (!confirmDelete) return;

    setActionLoadingId(userItem.id);
    const res = await api.deleteAdminUser(userItem.id);
    setActionLoadingId(null);

    if (res.success) {
      showToast(res.message, 'success');
      setUsersList(prev => prev.filter(u => u.id !== userItem.id));
      setAllPlans(prev => prev.filter(p => p.user_id !== userItem.id));
      if (overview) {
        setOverview({
          ...overview,
          totalUsers: overview.totalUsers - 1,
          totalClients: overview.totalClients - (userItem.role === 'admin' ? 0 : 1),
          totalAdmins: overview.totalAdmins - (userItem.role === 'admin' ? 1 : 0)
        });
      }
    } else {
      showToast(res.message || 'Delete operation failed.', 'error');
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const filteredUsers = usersList.filter(u => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      u.email.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(query);

    const userRole = u.role || (u.is_staff ? 'admin' : 'client');
    const matchesRole = roleFilter === 'all' || userRole === roleFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'suspended' && !u.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div id="admin-console" className="space-y-6">
      {/* Admin Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              Administrative Portal
            </span>
            <span className="text-xs text-slate-400">
              Access Level: Super Admin
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Platform Administration & Client Control
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Separate administrative control suite for system oversight, client accounts, elevated role management, and investment portfolio audits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="admin-refresh-btn"
            onClick={loadAdminData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/10 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
          <button
            id="admin-switch-client-view-btn"
            onClick={onSwitchToClientView}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Client Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Registered Users</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {overview?.totalUsers ?? usersList.length}
            </span>
            <span className="text-xs text-slate-500">
              ({overview?.totalClients ?? usersList.filter(u => !u.is_staff).length} clients, {overview?.totalAdmins ?? usersList.filter(u => u.is_staff).length} admins)
            </span>
          </div>
          <div className="mt-2 text-xxs text-emerald-600 flex items-center gap-1 font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>{overview?.activeRate ?? 100}% accounts active</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Portfolios & Plans</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {overview?.totalPlans ?? allPlans.length}
            </span>
            <span className="text-xs text-slate-500">saved plans</span>
          </div>
          <div className="mt-2 text-xxs text-slate-500">
            Across compound, SIP, goal & step-up models
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Cumulative Assets Tracked</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-950">
              {formatMoney(overview?.totalAssetsTracked || 0)}
            </span>
          </div>
          <div className="mt-2 text-xxs text-slate-500">
            Client net worth tracked platform-wide
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">System Engine Status</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              Operational
            </span>
            <span className="text-xs text-slate-500">100% SLA</span>
          </div>
          <div className="mt-2 text-xxs text-slate-500">
            Auth Token: HMAC-SHA256 • Port: 3000
          </div>
        </div>
      </div>

      {/* Admin Tabbed Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-6">
        <button
          id="admin-tab-users"
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-xs font-semibold tracking-wide transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Client & User Directory ({usersList.length})</span>
        </button>

        <button
          id="admin-tab-plans"
          onClick={() => setActiveTab('plans')}
          className={`pb-3 text-xs font-semibold tracking-wide transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'plans'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Client Investment Portfolios ({allPlans.length})</span>
        </button>

        <button
          id="admin-tab-system"
          onClick={() => setActiveTab('system')}
          className={`pb-3 text-xs font-semibold tracking-wide transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'system'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Platform Security & Access Policies</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="admin-search-users"
                type="text"
                placeholder="Search by client name, email, or username..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                id="admin-filter-role"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Roles</option>
                <option value="client">Clients Only</option>
                <option value="admin">Administrators Only</option>
              </select>

              <select
                id="admin-filter-status"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Accounts</option>
                <option value="suspended">Suspended Accounts</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-xxs tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">User / Account</th>
                    <th className="px-5 py-3.5">Access Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Portfolios</th>
                    <th className="px-5 py-3.5">Tracked Net Worth</th>
                    <th className="px-5 py-3.5">Joined Date</th>
                    <th className="px-5 py-3.5 text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        No accounts match the current filter or search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(userItem => {
                      const isSelf = userItem.id === currentUser.id;
                      const isAdmin = userItem.role === 'admin' || userItem.is_staff;
                      const isWorking = actionLoadingId === userItem.id;

                      return (
                        <tr key={userItem.id} className="hover:bg-slate-50/70 transition">
                          {/* User / Account */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                                isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {userItem.first_name ? userItem.first_name.charAt(0).toUpperCase() : userItem.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                  <span>{userItem.first_name ? `${userItem.first_name} ${userItem.last_name}` : userItem.username}</span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-xxs font-medium">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-400 text-xxs">{userItem.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-5 py-4">
                            {isAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Shield className="w-3 h-3" />
                                Administrator
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                <Award className="w-3 h-3" />
                                Client
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            {userItem.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-medium bg-emerald-50 text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-medium bg-red-50 text-red-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                Suspended
                              </span>
                            )}
                          </td>

                          {/* Portfolios */}
                          <td className="px-5 py-4 font-medium text-slate-700">
                            {userItem.planCount} plans
                          </td>

                          {/* Net Worth */}
                          <td className="px-5 py-4 font-semibold text-slate-900">
                            {formatMoney(userItem.netWorth)}
                          </td>

                          {/* Joined Date */}
                          <td className="px-5 py-4 text-slate-400">
                            {new Date(userItem.created_at).toLocaleDateString()}
                          </td>

                          {/* Access Controls */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Toggle Status (Active / Suspended) */}
                              <button
                                id={`admin-toggle-status-${userItem.id}`}
                                onClick={() => handleToggleStatus(userItem)}
                                disabled={isSelf || isWorking}
                                title={userItem.is_active ? 'Suspend Account' : 'Activate Account'}
                                className={`px-2.5 py-1 rounded text-xxs font-medium transition cursor-pointer disabled:opacity-40 flex items-center gap-1 ${
                                  userItem.is_active
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {userItem.is_active ? (
                                  <>
                                    <UserX className="w-3 h-3" />
                                    <span>Suspend</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3 h-3" />
                                    <span>Activate</span>
                                  </>
                                )}
                              </button>

                              {/* Toggle Role (Client <-> Admin) */}
                              <button
                                id={`admin-toggle-role-${userItem.id}`}
                                onClick={() => handleToggleRole(userItem)}
                                disabled={isSelf || isWorking}
                                title={isAdmin ? 'Demote to Client' : 'Promote to Administrator'}
                                className="px-2.5 py-1 rounded text-xxs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer disabled:opacity-40 flex items-center gap-1"
                              >
                                <Shield className="w-3 h-3" />
                                <span>{isAdmin ? 'Make Client' : 'Make Admin'}</span>
                              </button>

                              {/* Delete User */}
                              <button
                                id={`admin-delete-user-${userItem.id}`}
                                onClick={() => handleDeleteUser(userItem)}
                                disabled={isSelf || isWorking}
                                title="Delete user"
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Client Investment Plans Audit
              </h3>
              <p className="text-xxs text-slate-500">
                Detailed inventory of all compound growth, SIP, and milestone plans created across the system.
              </p>
            </div>
            <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold">
              {allPlans.length} Total Plans
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-xxs tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Plan Name</th>
                  <th className="px-5 py-3.5">Client / Author</th>
                  <th className="px-5 py-3.5">Model Type</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5">Expected Rate</th>
                  <th className="px-5 py-3.5">Principal / SIP</th>
                  <th className="px-5 py-3.5">Projected Maturity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No client plans have been saved in the system yet.
                    </td>
                  </tr>
                ) : (
                  allPlans.map(plan => {
                    const finalProjection = plan.projections && plan.projections.length > 0
                      ? plan.projections[plan.projections.length - 1].maturity_amount
                      : 0;

                    return (
                      <tr key={plan.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {plan.name}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-800">{plan.author_name}</div>
                          <div className="text-xxs text-slate-400">{plan.author_email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded text-xxs font-medium uppercase bg-slate-100 text-slate-700">
                            {plan.type}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {plan.financial_detail?.duration || 0} Years
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {plan.financial_detail?.interest_rate || 0}% APR
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {plan.financial_detail?.principal ? formatMoney(plan.financial_detail.principal) : formatMoney(plan.financial_detail?.sip_amount || 0) + '/mo'}
                        </td>
                        <td className="px-5 py-4 font-bold text-indigo-700">
                          {formatMoney(finalProjection)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              <span>Role-Based Access Control Architecture</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              WealthWise enforces a strict dual-tier authentication boundary between <strong>Client Portals</strong> and <strong>Administrative Management</strong>:
            </p>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Separate Portal Portals:</strong> Distinct login pathways verify user role headers and disallow non-admin accounts from gaining administrative access.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Admin Endpoint Guard:</strong> All <code>/api/v1/admin/*</code> routes run through the <code>authenticateAdmin</code> middleware, verifying JWT tokens and staff role credentials.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Instant Status Suspension:</strong> Deactivated accounts cannot obtain new session tokens or refresh sessions.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Database className="w-5 h-5 text-indigo-600" />
              <span>System & Environment Diagnostics</span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Database Engine</span>
                <span className="font-semibold text-slate-800">JSON Persistent State Engine</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Node Process Uptime</span>
                <span className="font-semibold text-slate-800">{overview?.systemUptime || 0} seconds</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">AI Financial Advisory Engine</span>
                <span className="font-semibold text-emerald-600">Gemini 3.8 Flash + Resilient Fallback</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Cryptographic Password Standard</span>
                <span className="font-semibold text-slate-800">PBKDF2 HMAC-SHA256 (1000 iter)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
