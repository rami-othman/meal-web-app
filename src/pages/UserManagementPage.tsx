// src/pages/UserManagementPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { UserPlus, Send, Trash2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { API_BASE } from '../lib/api';

// نعتمد Bearer Token مثل أمر cURL
const USE_COOKIE_AUTH = false;

type ApiUser = {
  id: string;
  tenantId: string | null;
  userName: string;
  name: string;
  surname: string;
  email: string;
  phoneNumber?: string;
  isActive: boolean;
  lockoutEnabled: boolean;
  roleNames?: string[];
};

type CreateUserDto = {
  tenantId: string | null;
  userName: string;
  name: string;
  surname: string;
  email: string;
  phoneNumber?: string;
  isActive: boolean;
  lockoutEnabled: boolean;
  roleNames: string[];
  password?: string;
};

const bearer = () =>
  localStorage.getItem('access_token') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('access_token') ||
  sessionStorage.getItem('token') ||
  '';

const headersBase = (): HeadersInit => {
  const h: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  const token = bearer();
  if (!USE_COOKIE_AUTH && token) h['Authorization'] = `Bearer ${token}`;

  // (اختياري) لو عندك Anti-forgery token مخزّن:
  const rvt = localStorage.getItem('RequestVerificationToken');
  if (rvt) h['RequestVerificationToken'] = rvt;

  return h;
};

const buildInit = (init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { ...headersBase(), ...(init.headers || {}) },
});

const withTimeout = async (url: string, init: RequestInit, ms = 20000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
};

const parseResponse = async (res: Response) => {
  const ct = res.headers.get('content-type') || '';
  if (res.status === 204) return null;
  if (ct.includes('application/json')) return await res.json();
  const text = await res.text();
  throw new Error(`${res.status} ${res.statusText}\n${text.slice(0, 400)}`);
};

const extractAbpError = async (res: Response) => {
  try {
    const data = await res.json();
    if (data?.error?.message) {
      const v = data?.error?.validationErrors;
      const vText =
        Array.isArray(v) && v.length
          ? '\n- ' + v.map((e: any) => `${e.members?.join(', ') || ''}: ${e.message}`).join('\n- ')
          : '';
      return `${data.error.message}${vText}`;
    }
    if (data?.title || data?.detail) {
      let msg = data.title || 'Request failed';
      if (data.detail) msg += `\n${data.detail}`;
      if (data.errors) {
        const list = Object.entries<any>(data.errors).flatMap(([k, arr]: any) =>
          (arr || []).map((m: string) => `${k}: ${m}`)
        );
        if (list.length) msg += '\n- ' + list.join('\n- ');
      }
      return msg;
    }
    return JSON.stringify(data);
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
};

const mapUiRoleToServer = (ui: string) => ui as
  | 'MEAL Manager'
  | 'Charity Manager'
  | 'Monitoring Member'
  | 'Project Manager';

export default function UserManagementPage() {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    userName: '',
    email: '',
    phoneNumber: '',
    role: 'Monitoring Member' as
      | 'MEAL Manager'
      | 'Charity Manager'
      | 'Monitoring Member'
      | 'Project Manager',
    isActive: true,
    lockoutEnabled: false,
    password: '',
    confirmPassword: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeUsers = useMemo(() => users.filter((u) => u.isActive).length, [users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const qs = new URLSearchParams({
        Filter: '',
        MaxResultCount: '50',
        SkipCount: '0',
        Sorting: 'CreationTime desc',
      }).toString();

      const res = await withTimeout(
        `${API_BASE}/api/identity/users?${qs}`,
        buildInit({ method: 'GET' }),
        20000
      );
      if (!res.ok) {
        const msg = await extractAbpError(res);
        throw new Error(`GET /users failed (${res.status})\n${msg}`);
      }
      const data = await parseResponse(res);
      const list: ApiUser[] = Array.isArray(data) ? data : data?.items ?? [];
      setUsers(list);
    } catch (e: any) {
      setError(e.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target as any;
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? !!checked : value }));
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      setSubmitting(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Password and Confirm Password do not match.');
      setSubmitting(false);
      return;
    }

    const roleName = mapUiRoleToServer(formData.role);

    const payload: CreateUserDto = {
      tenantId: null,
      userName: formData.userName.trim(),
      name: formData.name.trim(),
      surname: formData.surname.trim(),
      email: formData.email.trim(),
      phoneNumber: formData.phoneNumber.trim() || undefined,
      isActive: formData.isActive,
      lockoutEnabled: formData.lockoutEnabled,
      roleNames: [roleName],
      password: formData.password,
    };

    try {
      const res = await withTimeout(
        `${API_BASE}/api/identity/users`,
        buildInit({ method: 'POST', body: JSON.stringify(payload) }),
        20000
      );
      if (!res.ok) {
        const msg = await extractAbpError(res);
        throw new Error(`POST /users failed (${res.status})\n${msg}`);
      }

      const created = await parseResponse(res);
      if (created) setUsers((prev) => [created as ApiUser, ...prev]);

      setSuccessMsg('User created successfully.');
      setFormData((p) => ({
        ...p,
        name: '',
        surname: '',
        userName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
      }));
    } catch (e: any) {
      setError(e.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUser = async (user: ApiUser) => {
    if (!confirm(`Remove user ${user.userName}?`)) return;
    try {
      const res = await withTimeout(
        `${API_BASE}/api/identity/users/${user.id}`,
        buildInit({ method: 'DELETE' }),
        15000
      );
      if (!res.ok) {
        const msg = await extractAbpError(res);
        throw new Error(`DELETE /users/${user.id} failed (${res.status})\n${msg}`);
      }
      await parseResponse(res);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e: any) {
      alert(e.message || 'Failed to remove user.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage team members and their access</p>
        </div>
        <button
          onClick={fetchUsers}
          className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-lg whitespace-pre-wrap">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded-lg whitespace-pre-wrap">
          {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{users.length}</div>
          <div className="text-sm text-gray-600">Total Users</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{activeUsers}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
      </div>

      {/* Create User Form */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus size={20} />
          Create New User
        </h2>

        <form onSubmit={handleInviteUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                name="name"
                value={formData.name}
                onChange={onChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surname *</label>
              <input
                name="surname"
                value={formData.surname}
                onChange={onChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input
                name="userName"
                value={formData.userName}
                onChange={onChange}
                required
                placeholder="e.g., j.smith"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={onChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={onChange}
                placeholder="+963 9xx xxx xxx"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                name="role"
                value={formData.role}
                onChange={onChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="MEAL Manager">MEAL Manager</option>
                <option value="Charity Manager">Charity Manager</option>
                <option value="Monitoring Member">Monitoring Member</option>
                <option value="Project Manager">Project Manager</option>
              </select>
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type={showPwd ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={onChange}
                required
                minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-[30px] p-1 text-gray-500 hover:text-gray-700"
                aria-label="Toggle password visibility"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
              <input
                type={showPwd2 ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={onChange}
                required
                minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowPwd2((s) => !س)}
                className="absolute right-2 top-[30px] p-1 text-gray-500 hover:text-gray-700"
                aria-label="Toggle confirm password visibility"
              >
                {showPwd2 ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={onChange}
                className="h-4 w-4"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="lockoutEnabled"
                type="checkbox"
                name="lockoutEnabled"
                checked={formData.lockoutEnabled}
                onChange={onChange}
                className="h-4 w-4"
              />
              <label htmlFor="lockoutEnabled" className="text-sm text-gray-700">Lockout Enabled</label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <Send size={16} />
            {submitting ? 'Creating…' : 'Create User'}
          </button>
        </form>
      </div>

      {/* User List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-4" colSpan={6}>Loading…</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-6 py-4" colSpan={6}>No users</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.name} {user.surname}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {user.userName}
                    </td>

                    {/* 👇 هنا التعديل: عرض كل الأدوار من roleNames */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {user.roleNames && user.roleNames.length > 0
                        ? user.roleNames.join(', ')
                        : '—'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={user.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.phoneNumber || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleRemoveUser(user)}
                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
