// src/pages/FeedbackPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Download, Plus, Filter } from 'lucide-react';
import { API_BASE } from '../lib/api';

// ================== API ==================
const FEEDBACK_URL = `${API_BASE}/api/app/feedback?MaxResultCount=1000`;

// ============= Types from API =============
type ApiFeedback = {
  id: string;
  content: string;
  // ✅ قد تكون null حسب طلبك
  priority: number | null;
  category: number; // 0..4
  dateReceived: string;
  projectId: string;
  projectName?: string | null;
  isBeneficiary: boolean;
  volunteerId: string | null;
  submitterName: string | null;
  creationTime?: string | null;
  lastModificationTime?: string | null;
};

// ============= Enums/Labels =============
const CATEGORY_LABEL: Record<number, string> = {
  0: 'Access',
  1: 'Quality',
  2: 'Safety',
  3: 'Responsiveness',
  4: 'Others',
};

const PRIORITY_LABEL: Record<number, string> = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
};
const PRIORITY_CLASS: Record<number, string> = {
  0: 'bg-emerald-100 text-emerald-700',
  1: 'bg-amber-100 text-amber-800',
  2: 'bg-rose-100 text-rose-700',
};

// Helpers for priority that may be null
function priorityLabel(p?: number | null) {
  if (p === null || p === undefined) return 'Undefined';
  return PRIORITY_LABEL[p] ?? String(p);
}
function priorityClass(p?: number | null) {
  if (p === null || p === undefined) return 'bg-gray-100 text-gray-700';
  return PRIORITY_CLASS[p] ?? 'bg-slate-100 text-slate-700';
}

// ============= Utils =============
function getToken() {
  return (
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token')
  );
}

async function safeJson(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Unexpected response (${ct}). ${text.slice(0, 180)}`);
  }
  return res.json();
}

// tolerant date formatter (adds Z if no tz)
function fmtDate(d?: string | null) {
  if (!d) return '—';
  const needsZ =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(d) && !/[Z+\-]\d{2}:?\d{2}$/.test(d);
  const iso = needsZ ? d + 'Z' : d;
  const x = new Date(iso);
  if (isNaN(x.getTime())) return '—';
  return x.toLocaleDateString() + ', ' + x.toLocaleTimeString();
}

function pill(text: React.ReactNode, className = '') {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {text}
    </span>
  );
}

// ================== Component ==================
export function FeedbackPage() {
  const [filters, setFilters] = useState<{
    project: 'all' | string;
    category: 'all' | `${0 | 1 | 2 | 3 | 4}`;
    priority: 'all' | 'undefined' | `${0 | 1 | 2}`;
    submitter: 'all' | 'beneficiary' | 'volunteer';
  }>({
    project: 'all',
    category: 'all',
    priority: 'all',
    submitter: 'all',
  });

  const [items, setItems] = useState<ApiFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load feedback from API
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(FEEDBACK_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);

        const data = await safeJson(res);
        const list: ApiFeedback[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

        if (mounted) setItems(list);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load feedback');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Build distinct Project options (value=id, label=name)
  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((x) => {
      if (!x.projectId) return;
      const label =
        (x.projectName && x.projectName.trim()) ? x.projectName : x.projectId;
      if (!map.has(x.projectId)) map.set(x.projectId, label);
    });
    return Array.from(map.entries()); // [ [id, label], ... ]
  }, [items]);

  // Priority options (include undefined if any is null)
  const priorityOptions = useMemo(() => {
    const s = new Set<string>();
    let hasUndefined = false;
    items.forEach((x) => {
      if (x.priority === null || x.priority === undefined) {
        hasUndefined = true;
      } else {
        s.add(String(x.priority));
      }
    });
    const arr = Array.from(s).sort((a, b) => Number(a) - Number(b));
    if (hasUndefined) arr.unshift('undefined');
    return arr as Array<'undefined' | '0' | '1' | '2'>;
  }, [items]);

  // Apply filters
  const filtered = useMemo(() => {
    return items.filter((f) => {
      if (filters.project !== 'all' && f.projectId !== filters.project) return false;

      if (filters.category !== 'all' && String(f.category) !== filters.category)
        return false;

      if (filters.priority !== 'all') {
        if (filters.priority === 'undefined') {
          if (f.priority !== null && f.priority !== undefined) return false;
        } else {
          if (String(f.priority) !== filters.priority) return false;
        }
      }

      if (filters.submitter !== 'all') {
        if (filters.submitter === 'beneficiary' && !f.isBeneficiary) return false;
        if (filters.submitter === 'volunteer' && f.isBeneficiary) return false;
      }

      return true;
    });
  }, [items, filters]);

  // Handlers
  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value as any }));
  };

  const handleExportCSV = () => {
    const rows = [
      ['ID', 'ProjectName', 'Priority', 'Category', 'Submitter', 'DateReceived', 'SubmitterName', 'Content'],
      ...filtered.map((f) => [
        f.id,
        f.projectName ?? '',
        priorityLabel(f.priority),
        CATEGORY_LABEL[f.category] ?? String(f.category),
        f.isBeneficiary ? 'Beneficiary' : 'Volunteer',
        f.dateReceived,
        f.submitterName ?? '',
        (f.content || '').replace(/\n/g, ' '),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNewFeedback = () => {
    alert('Opening new feedback form…');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
          <p className="text-gray-600 mt-1">Monitor beneficiary and project feedback</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={handleNewFeedback}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            New Feedback
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={filters.project}
              onChange={(e) => handleFilterChange('project', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Projects</option>
              {projectOptions.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Category (ثابت حسب enum) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              {[0, 1, 2, 3, 4].map((c) => (
                <option key={c} value={String(c)}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>

          {/* Priority (يتضمن undefined عند وجود null) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Priorities</option>
              {priorityOptions.map((p) =>
                p === 'undefined' ? (
                  <option key="undefined" value="undefined">
                    Undefined
                  </option>
                ) : (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[Number(p)] ?? `Priority ${p}`}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Submitter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Submitter</label>
            <select
              value={filters.submitter}
              onChange={(e) => handleFilterChange('submitter', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All</option>
              <option value="beneficiary">Beneficiary</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </div>
        </div>
      </div>

      {/* States */}
      {loading && <div className="text-center text-sm text-gray-500">Loading…</div>}
      {error && <div className="text-center text-red-600">{error}</div>}

      {/* Feedback List */}
      {!loading && !error && (
        <div className="space-y-4">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  {pill(priorityLabel(f.priority), priorityClass(f.priority))}
                  {pill(CATEGORY_LABEL[f.category] ?? `Category ${f.category}`, 'bg-indigo-100 text-indigo-700')}
                  {pill(f.isBeneficiary ? 'Beneficiary' : 'Volunteer', f.isBeneficiary ? 'bg-blue-100 text-blue-700' : 'bg-sky-100 text-sky-800')}
                </div>
                <div className="text-sm text-gray-500">{fmtDate(f.dateReceived)}</div>
              </div>

              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {f.submitterName || 'Anonymous'}
              </h3>
              <p className="text-gray-800 whitespace-pre-wrap">{f.content}</p>

              <div className="mt-4 text-xs text-gray-500">
                <span className="font-medium text-gray-600">Project:</span>{' '}
                <span title={f.projectId}>{f.projectName || f.projectId}</span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">No feedback found</div>
              <p className="text-gray-400 mt-2">Try adjusting your filter criteria</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
