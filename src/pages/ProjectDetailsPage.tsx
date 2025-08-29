// src/pages/ProjectDetailsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import QRCode from 'qrcode';
import { API_BASE } from '../lib/api';

// ========= أنواع =========
type LogicalNode = {
  type: 'GOAL' | 'OUTCOME' | 'OUTPUT' | 'ACTIVITY';
  title: string;
  children?: LogicalNode[];
};

type ProjectDetails = {
  id: string;
  name: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: number | null; // 1..5
  code?: string;
  location?: string | null;
  lastRefresh?: string | null;
  logicalFramework?: LogicalNode[];
};

type ReportItem = {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  status: 'ready' | 'processing' | 'failed';
  viewUrl?: string;
  downloadUrl?: string;
};

type DonutDatum = { label: string; value: number };
type DonutCardData = { title: string; data: DonutDatum[] };

// --- Indicators (API)
type IndicatorValueApi = {
  id: string;
  measurementDate: string;
  value: number;
  notes?: string;
  collectedByUserId?: string;
};
type IndicatorApi = {
  id: string;
  name: string;
  description?: string;
  type: number;
  unit: number;
  baseline?: number | null;
  target?: number | null;
  frequencyOfMeasurement?: number | null;
  projectId: string;
  indicatorValues: IndicatorValueApi[];
};

// ========= أدوات مساعدة =========
function getToken() {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  const needsZ =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(d) && !/[Z+\-]\d{2}:?\d{2}$/.test(d);
  const iso = needsZ ? d + 'Z' : d;
  const x = new Date(iso);
  if (isNaN(x.getTime())) return '—';
  return x.toLocaleDateString() + ', ' + x.toLocaleTimeString();
}

// ألوان الـ status
function statusLabel(n?: number | null) {
  const map: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: 'Planned',   color: 'text-yellow-800', bg: 'bg-yellow-100' },
    2: { label: 'Active',    color: 'text-green-800',  bg: 'bg-green-100' },
    3: { label: 'OnHold',    color: 'text-blue-800',   bg: 'bg-blue-100' },
    4: { label: 'Completed', color: 'text-purple-800', bg: 'bg-purple-100' },
    5: { label: 'Cancelled', color: 'text-red-800',    bg: 'bg-red-100' },
  };
  return map[n ?? -1] ?? { label: 'Unknown', color: 'text-gray-800', bg: 'bg-gray-100' };
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm rounded-lg transition
        ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {children}
    </button>
  );
}

function LogicalTree({ nodes }: { nodes: LogicalNode[] }) {
  return (
    <div className="text-sm">
      {nodes.map((n, i) => (
        <div key={i} className="pl-4 border-l-2 border-slate-200 mb-2">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-400 mt-2" />
            <div>
              <div className="font-semibold">
                {n.type} — <span className="font-normal">{n.title}</span>
              </div>
              {n.children && n.children.length > 0 && (
                <div className="mt-2">
                  <LogicalTree nodes={n.children} />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ======== Donut Chart (SVG خفيفة) ========
function DonutChart({ data, size = 220, thickness = 26 }: { data: DonutDatum[]; size?: number; thickness?: number }) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const radius = size / 2;
  const inner = radius - thickness;
  let start = 0;
  const palette = ['#6366F1','#22C55E','#F59E0B','#06B6D4','#EF4444','#8B5CF6','#10B981','#F97316','#3B82F6','#84CC16'];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {total === 1 && data.every(d => d.value === 0) && (
        <circle cx={radius} cy={radius} r={inner + thickness/2} fill="none" stroke="#E5E7EB" strokeWidth={thickness} />
      )}
      {data.map((d, i) => {
        const angle = (d.value / total) * Math.PI * 2;
        const end = start + angle;
        const large = angle > Math.PI ? 1 : 0;

        const x1 = radius + (inner + thickness/2) * Math.cos(start);
        const y1 = radius + (inner + thickness/2) * Math.sin(start);
        const x2 = radius + (inner + thickness/2) * Math.cos(end);
        const y2 = radius + (inner + thickness/2) * Math.sin(end);

        const path = `M ${x1} ${y1} A ${inner + thickness/2} ${inner + thickness/2} 0 ${large} 1 ${x2} ${y2}`;
        start = end;
        return (
          <path key={i} d={path} stroke={palette[i % palette.length]} strokeWidth={thickness} fill="none" strokeLinecap="butt" />
        );
      })}
      <circle cx={radius} cy={radius} r={inner} fill="#fff" />
    </svg>
  );
}
function DonutCard({ title, data }: DonutCardData) {
  const palette = ['#6366F1','#22C55E','#F59E0B','#06B6D4','#EF4444','#8B5CF6','#10B981','#F97316','#3B82F6','#84CC16'];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-medium text-slate-800 mb-2">{title}</div>
      <DonutChart data={data} />
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: palette[i % palette.length] }} />
            <span className="text-slate-600">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========= صف التقارير =========
function ReportRow({ r }: { r: ReportItem }) {
  return (
    <div className="grid grid-cols-12 items-center gap-2 px-4 py-3">
      <div className="col-span-5">
        <div className="font-medium text-slate-800">{r.title}</div>
        <div className="text-xs text-slate-500">{r.type}</div>
      </div>
      <div className="col-span-3 text-sm text-slate-700">{fmtDate(r.createdAt)}</div>
      <div className="col-span-2">
        <span className={`text-xs px-2 py-1 rounded
          ${r.status === 'ready' ? 'bg-green-100 text-green-700' :
            r.status === 'processing' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'}`}>
          {r.status}
        </span>
      </div>
      <div className="col-span-2 text-sm">
        <div className="flex gap-3">
          {r.viewUrl && <a className="text-indigo-600 hover:underline" href={r.viewUrl} target="_blank" rel="noreferrer">View</a>}
          {r.downloadUrl && <a className="text-indigo-600 hover:underline" href={r.downloadUrl} target="_blank" rel="noreferrer">Download</a>}
        </div>
      </div>
    </div>
  );
}

// ===== Logical Framework helpers =====
type LFItemApi = {
  id: string;
  parentId: string | null;
  type: number; // 0..3
  name: string;
  description?: string;
};

const LF_TYPE: Record<number, LogicalNode['type']> = {
  0: 'GOAL', 1: 'OUTCOME', 2: 'OUTPUT', 3: 'ACTIVITY',
};

function buildLogicalTree(items: LFItemApi[]): LogicalNode[] {
  const map = new Map<string, LogicalNode & { _id: string; _parentId: string | null }>();
  items.forEach((it) => {
    map.set(it.id, {
      type: LF_TYPE[it.type] ?? 'ACTIVITY',
      title: it.name ?? '',
      children: [],
      _id: it.id,
      _parentId: it.parentId,
    } as any);
  });

  const roots: (LogicalNode & { _id: string; _parentId: string | null })[] = [];
  map.forEach((node) => {
    if (node._parentId && map.has(node._parentId)) {
      const parent = map.get(node._parentId)! as any;
      (parent.children ||= []).push(node);
    } else roots.push(node);
  });

  const strip = (n: any): LogicalNode => ({
    type: n.type, title: n.title, children: (n.children || []).map(strip),
  });

  return roots.map(strip);
}

/** ===== Change status control ===== */
const ALLOWED_TRANSITIONS: Record<number, Array<{ label: string; to: number }>> = {
  1: [{ label: 'Start (Active)', to: 2 }, { label: 'Cancel', to: 5 }],
  2: [{ label: 'Put on hold', to: 3 }, { label: 'Complete', to: 4 }, { label: 'Cancel', to: 5 }],
  3: [{ label: 'Start (Active)', to: 2 }, { label: 'Cancel', to: 5 }],
  4: [], 5: [],
};

function ChangeStatusControl({
  current, onChange, busy,
}: { current: number | null | undefined; busy: boolean; onChange: (to: number) => void; }) {
  const options = current == null ? [] : (ALLOWED_TRANSITIONS[current] ?? []);
  if (!options.length) {
    return (
      <button disabled className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-400" title="No allowed transitions">
        Change status
      </button>
    );
  }
  return (
    <div className="relative">
      <select
        disabled={busy}
        className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
        defaultValue=""
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          onChange(Number(v));
          e.currentTarget.value = '';
        }}
      >
        <option value="" disabled>{busy ? 'Updating…' : 'Change status'}</option>
        {options.map((op) => <option key={op.to} value={op.to}>{op.label}</option>)}
      </select>
    </div>
  );
}

// ========= الصفحة =========
export default function ProjectDetailsPage({
  projectId, onBack,
}: { projectId: string; onBack?: () => void; }) {
  const [tab, setTab] = useState<'overview' | 'indicators' | 'data-collection' | 'responses' | 'reports' | 'team'>('overview');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [responses, setResponses] = useState<DonutCardData[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  // Indicators
  const [indLoading, setIndLoading] = useState(false);
  const [indError, setIndError] = useState<string | null>(null);
  const [indicators, setIndicators] = useState<IndicatorApi[]>([]);
  const [openIndicators, setOpenIndicators] = useState<Record<string, boolean>>({});

  // Logical Framework
  const [lfLoading, setLfLoading] = useState(false);
  const [lfError, setLfError] = useState<string | null>(null);

  // Change status
  const [changing, setChanging] = useState(false);
  const [changeErr, setChangeErr] = useState<string | null>(null);
  const [changeOk, setChangeOk] = useState<string | null>(null);

  // QR
  const [qrUrl, setQrUrl] = useState<string>('');
  const [qrOpen, setQrOpen] = useState(false);
  const feedbackLink = useMemo(
    () => `${window.location.origin}/f/${encodeURIComponent(projectId)}`,
    [projectId]
  );

  async function generateFeedbackQr() {
    try {
      const dataUrl = await QRCode.toDataURL(feedbackLink, { margin: 1, width: 256 });
      setQrUrl(dataUrl);
      setQrOpen(true);
    } catch {
      setQrUrl('');
      setQrOpen(true);
    }
  }
  function downloadQrPng() {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `feedback-qr-${projectId}.png`;
    a.click();
  }
  function toggleIndicator(id: string) {
    setOpenIndicators((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ====== جلب تفاصيل المشروع
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE}/api/app/project/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Unexpected response. ${text.slice(0, 120)}`);
        }
        const data = await res.json();
        const normalized: ProjectDetails = {
          id: data.id,
          name: data.name ?? '',
          description: data.description ?? '',
          startDate: data.startDate ?? null,
          endDate: data.endDate ?? null,
          status: data.status ?? null,
          code: data.code ?? undefined,
          location: data.location ?? null,
          lastRefresh: data.lastModificationTime ?? data.creationTime ?? null,
          logicalFramework: [],
        };
        if (mounted) setProject(normalized);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load project');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (projectId) load();
    return () => { mounted = false; };
  }, [projectId]);

  // Logical Framework (تعامل ودّي مع 403/404)
  useEffect(() => {
    let mounted = true;
    async function loadLogicalFramework() {
      setLfLoading(true);
      setLfError(null);
      try {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(
          `${API_BASE}/api/app/logical-framework-item/by-project-id/${projectId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.status === 403 || res.status === 404) {
          // اعتبرها لا توجد بيانات، لا تُظهر Error 403
          if (mounted) {
            setProject((prev) => (prev ? { ...prev, logicalFramework: [] } : prev));
          }
          return;
        }

        if (!res.ok) throw new Error(`Error ${res.status}`);

        const data = await res.json();
        const items: LFItemApi[] = Array.isArray(data?.items) ? data.items : [];
        const tree = buildLogicalTree(items);
        if (mounted) {
          setProject((prev) => (prev ? { ...prev, logicalFramework: tree } : prev));
        }
      } catch (e: any) {
        if (mounted) setLfError(e?.message || 'Failed to load logical framework');
      } finally {
        if (mounted) setLfLoading(false);
      }
    }
    if (projectId) loadLogicalFramework();
    return () => { mounted = false; };
  }, [projectId]);

  // Indicators
  useEffect(() => {
    let mounted = true;
    async function loadIndicators() {
      setIndLoading(true);
      setIndError(null);
      try {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(
          `${API_BASE}/api/app/indicator/by-project-id/${projectId}?MaxResultCount=100`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        const items: IndicatorApi[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data) ? data : [];
        if (!mounted) return;
        setIndicators(items);
      } catch (e: any) {
        if (mounted) setIndError(e?.message || 'Failed to load indicators');
      } finally {
        if (mounted) setIndLoading(false);
      }
    }
    loadIndicators();
    return () => { mounted = false; };
  }, [projectId]);

  // Extras (Mock)
  useEffect(() => {
    let mounted = true;
    async function fetchExtras() {
      setLoadingExtras(true);
      try {
        const sampleReports: ReportItem[] = [
          { id: 'r1', title: 'Narrative — Aug 2025', type: 'narrative', createdAt: '2025-08-15T13:34:00Z', status: 'ready', viewUrl: '#', downloadUrl: '#' },
          { id: 'r2', title: 'Annex — Indicator tables', type: 'annex', createdAt: '2025-08-01T11:10:00Z', status: 'ready', downloadUrl: '#' },
        ];
        const sampleResponses: DonutCardData[] = [
          { title: 'Gender', data: [{ label: 'Male', value: 52 }, { label: 'Female', value: 46 }, { label: 'Other', value: 2 }]},
          { title: 'Age Group', data: [{ label: '18-24', value: 18 }, { label: '25-34', value: 34 }, { label: '35-44', value: 24 }, { label: '45+', value: 24 }]},
        ];
        if (!mounted) return;
        setReports(sampleReports);
        setResponses(sampleResponses);
      } finally {
        if (mounted) setLoadingExtras(false);
      }
    }
    fetchExtras();
    return () => { mounted = false; };
  }, [projectId]);

  // تغيير الحالة
  async function postChangeStatus(targetStatus: number) {
    if (!project) return;
    setChanging(true);
    setChangeErr(null);
    setChangeOk(null);
    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

      const url = `${API_BASE}/api/app/project/${project.id}/change-status?status=${encodeURIComponent(String(targetStatus))}`;
      const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });

      if (!res.ok) {
        let message = `Error ${res.status}`;
        try {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const body = await res.json();
            message = body?.message || body?.error || message;
          } else {
            const text = await res.text();
            if (text) message = `${message}: ${text.slice(0, 180)}`;
          }
        } catch {}
        throw new Error(message);
      }

      const updated = await res.json();
      setProject((prev) =>
        prev ? {
          ...prev,
          status: updated?.status ?? targetStatus,
          lastRefresh: updated?.lastModificationTime ?? prev.lastRefresh,
        } : prev
      );
      setChangeOk('Status updated successfully.');
    } catch (e: any) {
      setChangeErr(e?.message || 'Failed to change status');
    } finally {
      setChanging(false);
      setTimeout(() => { setChangeOk(null); setChangeErr(null); }, 2500);
    }
  }

  // ===== Header
  const header = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      {loading ? (
        <>
          <Skeleton className="h-6 w-40" />
          <div className="mt-3 flex flex-wrap gap-3 items-center">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-36" />
          </div>
        </>
      ) : error ? (
        <div className="text-red-600">Error: {error}</div>
      ) : project ? (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-900">{project.name}</h1>
              {project.code && (
                <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
                  {project.code}
                </span>
              )}
              <span className={`text-xs px-2 py-1 rounded ${statusLabel(project.status).bg} ${statusLabel(project.status).color}`}>
                {statusLabel(project.status).label}
              </span>
            </div>

            <div className="mt-2 text-sm text-slate-500 flex flex-wrap gap-4">
              <div><span className="font-medium text-slate-600">Last refresh:</span> {fmtDate(project.lastRefresh)}</div>
              <div>{fmtDate(project.startDate)} — {fmtDate(project.endDate)}</div>
              <div className="flex items-center gap-1">
                <MapPin size={14} className="text-slate-400" />
                <span className="font-medium text-slate-600">Location:</span>{' '}
                <span className="text-slate-700">{project.location || '—'}</span>
              </div>
            </div>

            {(changeErr || changeOk) && (
              <div className="mt-2 text-xs">
                {changeErr && <span className="text-red-600">{changeErr}</span>}
                {changeOk && <span className="text-green-700">{changeOk}</span>}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <ChangeStatusControl current={project.status ?? null} busy={changing} onChange={postChangeStatus} />
            <button className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50" onClick={generateFeedbackQr} title="Generate public feedback QR">Feedback QR</button>
            <button className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50" onClick={downloadQrPng} disabled={!qrUrl} title="Download QR as PNG">Download PNG</button>
            {/* تم إزالة زر Export بناءً على طلبك */}
            <button className="px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800">Edit</button>
          </div>
        </div>
      ) : null}

      {qrOpen && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-4">
          <div className="text-sm text-slate-600">
            <div className="font-medium text-slate-800 mb-1">Public feedback link</div>
            <div className="break-all">{feedbackLink}</div>
            <div className="mt-2 flex gap-2">
              <button className="text-xs px-2 py-1 rounded bg-slate-900 text-white" onClick={() => setQrOpen(false)}>Hide</button>
              <button className="text-xs px-2 py-1 rounded border border-slate-300" onClick={downloadQrPng} disabled={!qrUrl}>Download PNG</button>
            </div>
          </div>
          <div className="ml-auto">
            {qrUrl ? <img src={qrUrl} alt="Feedback QR" className="w-40 h-40 border rounded" /> : <div className="text-xs text-slate-500">QR not available</div>}
          </div>
        </div>
      )}
    </div>
  );

  // ===== Overview
  const overview = (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-900 mb-2">Description</div>
        <div className="text-sm text-slate-800 whitespace-pre-wrap">
          {project?.description?.trim() ? project.description : '—'}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-900 mb-2">Logical framework</div>
        <div className="rounded-lg border border-slate-200 p-4">
          {lfLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : lfError ? (
            // في حال حصول أخطاء أخرى غير 403/404
            <div className="text-sm text-red-600">{lfError}</div>
          ) : project && project.logicalFramework && project.logicalFramework.length ? (
            <LogicalTree nodes={project.logicalFramework} />
          ) : (
            <div className="text-sm text-slate-500">No logical framework yet.</div>
          )}
        </div>
      </div>
    </div>
  );

  // ===== Responses
  const responsesTab = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {loadingExtras ? (
        Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
            <Skeleton className="h-5 w-40 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))
      ) : (
        responses.map((c, i) => <DonutCard key={i} title={c.title} data={c.data} />)
      )}
    </div>
  );

  // ===== Reports
  const reportsTab = (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 text-xs font-medium text-slate-600">
        <div className="col-span-5">Title</div>
        <div className="col-span-3">Created at</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Actions</div>
      </div>
      <div className="divide-y">
        {loadingExtras ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <Skeleton className="h-5 w-64 mb-2" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))
        ) : reports.length ? (
          reports.map((r) => <ReportRow key={r.id} r={r} />)
        ) : (
          <div className="px-4 py-6 text-sm text-slate-500">No reports yet.</div>
        )}
      </div>
    </div>
  );

  // ===== Indicators (مع عرض Frequency + قائمة القيم)
  const UNIT_LABEL: Record<number, string> = { 0: 'Count', 1: 'Percentage', 2: 'Ratio' };
  const FREQ_LABEL: Record<number, string> = {
    0: 'Daily', 1: 'Weekly', 2: 'Biweekly', 3: 'Monthly',
    4: 'Quarterly', 5: 'Biannually', 6: 'Annually', 7: 'One-time',
  };

  const indicatorsTab = (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 text-xs font-medium text-slate-600">
        <div className="col-span-3">Indicator</div>
        <div className="col-span-2">Unit</div>
        <div className="col-span-2">Frequency</div>
        <div className="col-span-2">Baseline</div>
        <div className="col-span-2">Target</div>
        <div className="col-span-1">Latest</div>
        {/* N يبقى ضمن صف القيم الرئيسي */}
      </div>

      <div className="divide-y">
        {indLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <Skeleton className="h-4 w-64 mb-2" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))
        ) : indError ? (
          <div className="px-4 py-6 text-sm text-red-600">{indError}</div>
        ) : indicators.length ? (
          indicators.map((it) => {
            const values = Array.isArray(it.indicatorValues) ? it.indicatorValues : [];
            const sorted = values.slice().sort(
              (a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
            );
            const latest = sorted[0];
            const isOpen = !!openIndicators[it.id];

            return (
              <div key={it.id} className="px-4 py-3">
                {/* الصف الرئيسي */}
                <div className="grid grid-cols-12 gap-2 text-sm text-slate-900 items-start">
                  <div className="col-span-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{it.name || '—'}</div>
                        {it.description && <div className="text-xs text-slate-500 mt-1">{it.description}</div>}
                      </div>
                      <button
                        onClick={() => toggleIndicator(it.id)}
                        className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 shrink-0"
                        aria-expanded={isOpen}
                        aria-controls={`values-${it.id}`}
                      >
                        {isOpen ? 'Hide values' : `Show values (${values.length})`}
                      </button>
                    </div>
                  </div>

                  <div className="col-span-2">{UNIT_LABEL[it.unit] ?? String(it.unit ?? '—')}</div>
                  <div className="col-span-2">{FREQ_LABEL[it.frequencyOfMeasurement ?? -1] ?? '—'}</div>
                  <div className="col-span-2">{it.baseline ?? '—'}</div>
                  <div className="col-span-2">{it.target ?? '—'}</div>

                  <div className="col-span-1">
                    {latest ? `${latest.value}` : '—'}
                    {latest && <div className="text-[11px] text-slate-500">{fmtDate(latest.measurementDate)}</div>}
                  </div>
                </div>

                {/* قائمة القيم (Accordion) */}
                {isOpen && (
                  <div id={`values-${it.id}`} className="mt-3 rounded-lg border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 text-[11px] font-medium text-slate-600">
                      <div className="col-span-4">Measurement date</div>
                      <div className="col-span-2">Value</div>
                      <div className="col-span-3">Notes</div>
                      <div className="col-span-2">Collected by</div>
                      <div className="col-span-1 text-right">N</div>
                    </div>

                    <div className="max-h-64 overflow-auto divide-y">
                      {sorted.length ? (
                        sorted.map((v, idx) => (
                          <div key={v.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                            <div className="col-span-4 text-slate-700">{fmtDate(v.measurementDate)}</div>
                            <div className="col-span-2 font-medium">{v.value}</div>
                            <div className="col-span-3 text-slate-700">{v.notes || '—'}</div>
                            <div className="col-span-2 text-slate-500">{v.collectedByUserId || '—'}</div>
                            <div className="col-span-1 text-right text-slate-500">{idx + 1}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-sm text-slate-500">No values yet.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="px-4 py-6 text-sm text-slate-500">No indicators.</div>
        )}
      </div>
    </div>
  );

  const dataCollectionTab = (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <div className="px-4 py-6 text-sm text-slate-500">No instruments.</div>
    </div>
  );

  const tabsBar = (
    <div className="flex gap-2">
      {(['overview','indicators','data-collection','responses','reports','team'] as const).map((t) => (
        <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
          {t.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
        </TabButton>
      ))}
    </div>
  );

  const placeholder = (title: string) => (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
      {title} — coming soon
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          className="text-sm text-slate-600 hover:text-slate-900"
          onClick={() => (onBack ? onBack() : window.history.back())}
        >
          ← Back
        </button>
      </div>

      {header}

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Project</div>
        {tabsBar}
      </div>

      {tab === 'overview' && overview}
      {tab === 'indicators' && indicatorsTab}
      {tab === 'data-collection' && dataCollectionTab}
      {tab === 'responses' && responsesTab}
      {tab === 'reports' && reportsTab}
      {tab === 'team' && placeholder('Team')}
    </div>
  );
}
