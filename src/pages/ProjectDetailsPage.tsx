// src/pages/ProjectDetailsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  MapPin, ExternalLink, RefreshCw, FileDown, Database, Link2, BarChart3,
  UserPlus, Check, Search, Eye, X, Download, FileText
} from 'lucide-react';
import QRCode from 'qrcode';
import { API_BASE, apiFetch } from '../lib/api';

import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
  BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

/* =================== الأنواع =================== */
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
  status?: number | null;
  code?: string;
  location?: string | null;
  lastRefresh?: string | null;
  logicalFramework?: LogicalNode[];
  projectUsers?: Array<{
    projectId: string;
    userId: string;
    role?: number | null;
    status?: number | null;
    assignedDate?: string | null;
  }>;
  projectManagerId?: string | null;   // ← جديد
};

type ReportItem = {
  id: string;
  title: string;
  type: 'markdown';
  createdAt: string;
  status: 'ready' | 'processing' | 'failed';
  downloadUrl?: string; // /exports/....
};

type DonutDatum = { label: string; value: number };

/* --- Indicators (API) --- */
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

/* ======== Form Of Project (API) ======== */
type KoboSummary = {
  languages?: string[];
  columns?: string[];
  row_count?: number;
};
type KoboExportSetting = { uid: string; data_url_csv?: string; data_url_xlsx?: string; };
type KoboDownload = { format: string; url: string };
type FormOfProject = {
  uid: string;
  name: string;
  metadata: {
    url?: string;
    date_created?: string;
    date_modified?: string;
    date_deployed?: string;
    owner__username?: string;
    deployed_version_id?: string;
    deployment__active?: boolean;
    deployment__submission_count?: number;
    deployment__last_submission_time?: string;
    deployment_status?: string;
    summary?: KoboSummary;
    export_settings?: KoboExportSetting[];
    downloads?: KoboDownload[];
    data?: string;
  };
};

/* ======== Form Details / Reports (للتحليل) ======== */
type KoboFormReportsResp = {
  url: string;
  count: number;
  list: Array<{
    name: string;
    row: { type: 'select_one' | 'select_multiple' | string };
    data: {
      total_count: number;
      not_provided: number;
      provided: number;
      show_graph: boolean;
      responses: string[];
      frequencies: number[];
      percentages: number[];
    };
    kuid: string;
    style: any;
  }>;
};
type KoboFormDetailsResp = {
  data: {
    content: {
      survey: Array<{ name: string; type: string; label?: string[] | string; select_from_list_name?: string; }>;
      choices: Array<{ name: string; label?: string[] | string; list_name: string; }>;
      settings?: { default_language?: string };
      translations?: string[];
    };
  };
};

/* ======== Team types ======== */
type UserWithRoles = {
  id: string;
  userName: string;
  name?: string | null;
  surname?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  isActive: boolean;
  roles: string[];
  creationTime?: string | null;
  lastModificationTime?: string | null;
};

/* ======== أدوات مساعدة ======== */
function getToken() {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}
function fmtDate(d?: string | null) {
  if (!d) return '—';
  const needsZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(d) && !/[Z+\-]\d{2}:?\d{2}$/.test(d);
  const iso = needsZ ? d + 'Z' : d;
  const x = new Date(iso);
  if (isNaN(x.getTime())) return '—';
  return x.toLocaleDateString() + ', ' + x.toLocaleTimeString();
}
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
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

/* ===== Markdown Viewer utils ===== */
// === Markdown -> HTML (يدعم الجداول) ===
function getMdStyles() {
  return `
  <style>
    body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial; color:#0f172a; line-height:1.65; padding:24px; direction:rtl;}
    h1,h2,h3,h4,h5,h6{margin:1.2em 0 .6em}
    h1{font-size:1.8rem} h2{font-size:1.6rem} h3{font-size:1.3rem}
    a{color:#2563eb; text-decoration:none} a:hover{text-decoration:underline}
    code{background:#f1f5f9; padding:2px 4px; border-radius:4px}
    pre.md-pre{background:#0f172a; color:#e2e8f0; padding:12px 14px; border-radius:8px; overflow:auto}
    .md-table-wrap{overflow:auto}
    table.md-table{border-collapse:collapse; width:100%; margin:12px 0}
    .md-table th,.md-table td{border:1px solid #e2e8f0; padding:8px 10px; vertical-align:top}
    .md-table thead th{background:#f8fafc; font-weight:600}
    .md-table tbody tr:nth-child(odd){background:#fafafa}
  </style>`;
}

function mdToHtml(md: string) {
  // خزن بلوكات الأكواد أولاً
  const codeBlocks: string[] = [];
  md = md.replace(/```([\s\S]*?)```/g, (_m, g1) => {
    const idx = codeBlocks.push(g1) - 1;
    return `\uFFF0CODEBLOCK_${idx}\uFFF1`;
  });

  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const lines = md.split(/\r?\n/);
  let html = '';
  let i = 0;
  let inUL = false;
  const closeUL = () => { if (inUL) { html += '</ul>'; inUL = false; } };

  const splitRow = (row: string) => row
    .replace(/^\s*\|\s*/,'')
    .replace(/\s*\|\s*$/,'')
    .split('|')
    .map(c => c.trim());

  const isSep = (row: string) => {
    row = row.trim();
    if (!row.includes('|')) return false;
    // | --- | :--- | ---: | :-: |
    return row.replace(/\s|\|/g,'')
              .split('')
              .every(ch => ch === '-' || ch === ':');
  };
  const alignOf = (spec: string): 'left'|'right'|'center' => {
    const s = spec.trim();
    const left = s.startsWith(':'), right = s.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  };

  const parseTable = () => {
    const header = splitRow(lines[i]);
    if (i + 1 >= lines.length) return false;
    if (!isSep(lines[i + 1])) return false;

    const aligns = splitRow(lines[i + 1]).map(alignOf);
    i += 2;

    let tbody = '';
    while (i < lines.length && /\|/.test(lines[i]) && !/^\s*$/.test(lines[i])) {
      const cells = splitRow(lines[i]);
      const tds = header.map((_, idx) => {
        const c = esc(cells[idx] ?? '');
        const al = aligns[idx] || 'left';
        return `<td style="text-align:${al}">${c}</td>`;
      }).join('');
      tbody += `<tr>${tds}</tr>`;
      i++;
    }

    const thead = `<thead><tr>${header.map((h, idx) =>
      `<th style="text-align:${aligns[idx] || 'left'}">${esc(h)}</th>`).join('')}</tr></thead>`;
    html += `<div class="md-table-wrap"><table class="md-table" dir="rtl">${thead}<tbody>${tbody}</tbody></table></div>`;
    return true;
  };

  while (i < lines.length) {
    const line = lines[i];

    // جدول؟
    if (line.includes('|') && i + 1 < lines.length && isSep(lines[i + 1])) {
      closeUL();
      parseTable();
      continue;
    }

    // عناوين
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeUL();
      const level = h[1].length;
      html += `<h${level}>${esc(h[2])}</h${level}>`;
      i++; continue;
    }

    // قائمة
    const li = line.match(/^([*-])\s+(.*)$/);
    if (li) {
      if (!inUL) { html += '<ul>'; inUL = true; }
      html += `<li>${esc(li[2])}</li>`;
      i++; continue;
    }

    // سطر فارغ
    if (/^\s*$/.test(line)) { closeUL(); html += '<br/>'; i++; continue; }

    // فقرة
    closeUL();
    html += `<p>${esc(line)}</p>`;
    i++;
  }
  closeUL();

  // inline
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  // إعادة بلوكات الأكواد
  html = html.replace(/\uFFF0CODEBLOCK_(\d+)\uFFF1/g, (_m, idxStr) => {
    const idx = Number(idxStr);
    return `<pre class="md-pre"><code>${esc(codeBlocks[idx] || '')}</code></pre>`;
  });

  return html;
}
// نافذة الطباعة (لـ PDF)
function openPrintWindowWithContent(html: string, title: string) {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=800');
  if (!w) return;
  w.document.write(`<html><head><title>${title}</title>${getMdStyles()}</head><body dir="rtl">${html}</body></html>`);
  w.document.close();
  w.focus();
  w.print(); // المستخدم يختار Save as PDF
}

/* ===== Logical Framework helpers ===== */
type LFItemApi = { id: string; parentId: string | null; type: number; name: string; description?: string; };
const LF_TYPE: Record<number, LogicalNode['type']> = { 0: 'GOAL', 1: 'OUTCOME', 2: 'OUTPUT', 3: 'ACTIVITY' };
function buildLogicalTree(items: LFItemApi[]): LogicalNode[] {
  const map = new Map<string, LogicalNode & { _id: string; _parentId: string | null }>();
  items.forEach((it) => {
    map.set(it.id, { type: LF_TYPE[it.type] ?? 'ACTIVITY', title: it.name ?? '', children: [], _id: it.id, _parentId: it.parentId } as any);
  });
  const roots: (LogicalNode & { _id: string; _parentId: string | null })[] = [];
  map.forEach((node) => {
    if (node._parentId && map.has(node._parentId)) {
      const parent = map.get(node._parentId)! as any;
      (parent.children ||= []).push(node);
    } else roots.push(node);
  });
  const strip = (n: any): LogicalNode => ({ type: n.type, title: n.title, children: (n.children || []).map(strip) });
  return roots.map(strip);
}

/* ===== تغيير الحالة ===== */
const ALLOWED_TRANSITIONS: Record<number, Array<{ label: string; to: number }>> = {
  1: [{ label: 'Start (Active)', to: 2 }, { label: 'Cancel', to: 5 }],
  2: [{ label: 'Put on hold', to: 3 }, { label: 'Complete', to: 4 }, { label: 'Cancel', to: 5 }],
  3: [{ label: 'Start (Active)', to: 2 }, { label: 'Cancel', to: 5 }],
  4: [], 5: [],
};
function ChangeStatusControl({ current, onChange, busy }: { current: number | null | undefined; busy: boolean; onChange: (to: number) => void; }) {
  const options = current == null ? [] : (ALLOWED_TRANSITIONS[current] ?? []);
  if (!options.length) {
    return <button disabled className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-400" title="No allowed transitions">Change status</button>;
  }
  return (
    <div className="relative">
      <select
        disabled={busy}
        className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
        defaultValue=""
        onChange={(e) => { const v = e.target.value; if (!v) return; onChange(Number(v)); e.currentTarget.value = ''; }}
      >
        <option value="" disabled>{busy ? 'Updating…' : 'Change status'}</option>
        {options.map((op) => <option key={op.to} value={op.to}>{op.label}</option>)}
      </select>
    </div>
  );
}

/* ========= الصفحة ========= */
export default function ProjectDetailsPage({ projectId, onBack }: { projectId: string; onBack?: () => void; }) {
  const [tab, setTab] = useState<'overview' | 'indicators' | 'data-collection' | 'responses' | 'reports' | 'team'>('overview');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reports
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);

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
  const feedbackLink = useMemo(() => `${window.location.origin}/f/${encodeURIComponent(projectId)}`, [projectId]);

  // ==== Data Collection ====
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formInfo, setFormInfo] = useState<FormOfProject | null>(null);
  const [formUid, setFormUid] = useState<string | null>(null);

  // Team tab
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRoles[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [assignBusy, setAssignBusy] = useState<Record<string, boolean>>({});
  const [assignedMap, setAssignedMap] = useState<Record<string, boolean>>({});

  // ===== Report Viewer (Markdown inside UI) =====
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewerHtml, setViewerHtml] = useState<string>('');
  const [viewerDownloadUrl, setViewerDownloadUrl] = useState<string | null>(null);

  // ===== Project Manager display =====
  const [pmName, setPmName] = useState<string>('—');

  // 1) حمّل قيمة formUid من التخزين
  useEffect(() => {
    const saved = localStorage.getItem(`formUid:${projectId}`);
    if (saved) setFormUid(saved);
  }, [projectId]);

  // 2) التقاط formUid من URL لو موجود
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const fromUrl = sp.get('formUid') || sp.get('formid');
    if (fromUrl) {
      const uid = decodeURIComponent(fromUrl);
      setFormUid(uid);
      localStorage.setItem(`formUid:${projectId}`, uid);
    }
  }, [projectId]);

  const COLORS = ['#6366F1','#22C55E','#F59E0B','#06B6D4','#EF4444','#8B5CF6','#10B981','#F97316','#3B82F6','#84CC16','#A78BFA','#34D399'];
  const pickLabel = (lab: any, langIdx: number): string => Array.isArray(lab) ? (lab[langIdx] ?? lab[0] ?? '') : (lab ?? '');

  /* ========= تحميل تفاصيل المشروع ========= */
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const res = await apiFetch(`${API_BASE}/api/app/project/${projectId}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        const normalized: ProjectDetails = {
          id: data.id, name: data.name ?? '', description: data.description ?? '',
          startDate: data.startDate ?? null, endDate: data.endDate ?? null,
          status: data.status ?? null, code: data.code ?? undefined, location: data.location ?? null,
          lastRefresh: data.lastModificationTime ?? data.creationTime ?? null,
          logicalFramework: [], projectUsers: Array.isArray(data?.projectUsers) ? data.projectUsers : [],
          projectManagerId: data.projectManagerId ?? null,
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

  // جلب اسم مدير المشروع
  useEffect(() => {
    let abort = false;
    async function loadPM(id: string) {
      try {
        const res = await apiFetch(`${API_BASE}/api/identity/users/${id}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const u = await res.json();
        const full = [u?.name, u?.surname].filter(Boolean).join(' ').trim();
        const display = full || u?.userName || '—';
        if (!abort) setPmName(display);
      } catch {
        if (!abort) setPmName('—');
      }
    }
    if (project?.projectManagerId) loadPM(project.projectManagerId);
    else setPmName('—');
    return () => { abort = true; };
  }, [project?.projectManagerId]);

  /* ========= Logical Framework ========= */
  useEffect(() => {
    let mounted = true;
    async function loadLogicalFramework() {
      setLfLoading(true); setLfError(null);
      try {
        const res = await apiFetch(`${API_BASE}/api/app/logical-framework-item/by-project-id/${projectId}`, { headers: { Accept: 'application/json' } });
        if (res.status === 403 || res.status === 404) {
          if (mounted) setProject((prev) => (prev ? { ...prev, logicalFramework: [] } : prev));
          return;
        }
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        const items: LFItemApi[] = Array.isArray(data?.items) ? data.items : [];
        const tree = buildLogicalTree(items);
        if (mounted) setProject((prev) => (prev ? { ...prev, logicalFramework: tree } : prev));
      } catch (e: any) {
        if (mounted) setLfError(e?.message || 'Failed to load logical framework');
      } finally {
        if (mounted) setLfLoading(false);
      }
    }
    if (projectId) loadLogicalFramework();
    return () => { mounted = false; };
  }, [projectId]);

  /* ========= Indicators ========= */
  useEffect(() => {
    let mounted = true;
    async function loadIndicators() {
      setIndLoading(true); setIndError(null);
      try {
        const res = await apiFetch(`${API_BASE}/api/app/indicator/by-project-id/${projectId}?MaxResultCount=100`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        const items: IndicatorApi[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
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

  /* ========= تغيير الحالة ========= */
  async function postChangeStatus(targetStatus: number) {
    if (!project) return;
    setChanging(true); setChangeErr(null); setChangeOk(null);
    try {
      const url = `${API_BASE}/api/app/project/${project!.id}/change-status?status=${encodeURIComponent(String(targetStatus))}`;
      const res = await apiFetch(url, { method: 'POST', headers: { Accept: 'application/json' } });
      if (!res.ok) {
        let message = `Error ${res.status}`;
        try {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const body = await res.json(); message = body?.message || body?.error || message;
          } else {
            const text = await res.text(); if (text) message = `${message}: ${text.slice(0, 180)}`;
          }
        } catch {}
        throw new Error(message);
      }
      const updated = await res.json();
      setProject((prev) => prev ? { ...prev, status: updated?.status ?? targetStatus, lastRefresh: updated?.lastModificationTime ?? prev.lastRefresh } : prev);
      setChangeOk('Status updated successfully.');
    } catch (e: any) {
      setChangeErr(e?.message || 'Failed to change status');
    } finally {
      setChanging(false);
      setTimeout(() => { setChangeOk(null); setChangeErr(null); }, 2500);
    }
  }

  /* ========= Data Collection ========= */
  async function loadFormOfProject() {
    setFormLoading(true); setFormError(null);
    try {
      const res = await apiFetch(`${API_BASE}/api/app/project/form-of-project/${projectId}`, { headers: { Accept: 'application/json' } });
      if (res.status === 404) {
        setFormInfo(null); setFormUid(null); localStorage.removeItem(`formUid:${projectId}`); return;
      }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = (await res.json()) as FormOfProject;
      setFormInfo(data);
      if (data?.uid) { setFormUid(data.uid); localStorage.setItem(`formUid:${projectId}`, data.uid); }
    } catch (e: any) {
      setFormError(e?.message || 'Failed to load form info');
    } finally { setFormLoading(false); }
  }

  useEffect(() => { if (tab === 'data-collection' && projectId) loadFormOfProject(); }, [tab, projectId]);

  const qc = (s?: string) => (s && s.trim() ? s : '—');
  const columns = formInfo?.metadata?.summary?.columns || [];
  const csvUrl = formInfo?.metadata?.export_settings?.[0]?.data_url_csv;
  const xlsxUrl = formInfo?.metadata?.export_settings?.[0]?.data_url_xlsx;
  const dataJsonUrl = formInfo?.metadata?.data;
  const koboUrl = formInfo?.metadata?.url;

  /* ========= Responses (Analyze) ========= */
  type AnalyzeRow = {
    name: string;
    questionLabel: string;
    type: 'select_one' | 'select_multiple' | string;
    segments: Array<{ label: string; count: number; percent: number }>;
    total: number;
    provided: number;
    notProvided: number;
  };
  const [anLoading, setAnLoading] = useState(false);
  const [anError, setAnError] = useState<string | null>(null);
  const [anRows, setAnRows] = useState<AnalyzeRow[]>([]);
  const [viewMode, setViewMode] = useState<'count' | 'percent'>('percent');

  async function loadAnalyze(uid: string) {
    setAnLoading(true); setAnError(null);
    try {
      const detailsRes = await apiFetch(`${API_BASE}/api/app/kobo-toolbox/form-details?formUid=${encodeURIComponent(uid)}`, { headers: { Accept: 'application/json' } });
      if (!detailsRes.ok) throw new Error(`Details error ${detailsRes.status}`);
      const details = (await detailsRes.json()) as KoboFormDetailsResp;

      const content = details?.data?.content;
      const survey = content?.survey ?? [];
      const choices = content?.choices ?? [];
      const translations = content?.translations ?? [];
      const defaultLang = content?.settings?.default_language;
      const langIdx = Math.max(0, translations.indexOf(defaultLang || translations[0]));

      const qNameToList: Record<string, string | undefined> = {};
      const qNameToLabel: Record<string, string> = {};
      survey.forEach((q) => { if (!q?.name) return; qNameToList[q.name] = q?.select_from_list_name; qNameToLabel[q.name] = pickLabel(q.label, langIdx) || q.name; });

      const listToChoiceLabel: Record<string, Record<string, string>> = {};
      choices.forEach((c) => { const ln = c?.list_name; if (!ln) return; listToChoiceLabel[ln] ||= {}; listToChoiceLabel[ln][String(c.name)] = pickLabel(c.label, langIdx) || String(c.name); });

      const reportsRes = await apiFetch(`${API_BASE}/api/app/kobo-toolbox/form-reports?formUid=${encodeURIComponent(uid)}`, { headers: { Accept: 'application/json' } });
      if (!reportsRes.ok) throw new Error(`Reports error ${reportsRes.status}`);
      const reports = (await reportsRes.json()) as KoboFormReportsResp;

      const rows: AnalyzeRow[] = reports.list.map((item) => {
        const listName = qNameToList[item.name];
        const mapChoices = listName ? (listToChoiceLabel[listName] || {}) : {};
        const segments = (item.data.responses || []).map((code, i) => ({ label: mapChoices[code] ?? String(code), count: item.data.frequencies[i] ?? 0, percent: item.data.percentages[i] ?? 0 }));
        return { name: item.name, questionLabel: qNameToLabel[item.name] ?? item.name, type: item.row?.type ?? 'select_one', segments, total: item.data.total_count ?? 0, provided: item.data.provided ?? 0, notProvided: item.data.not_provided ?? 0 };
      });

      setAnRows(rows);
    } catch (e: any) {
      setAnError(e?.message || 'Failed to analyze responses');
    } finally { setAnLoading(false); }
  }

  useEffect(() => {
    if (tab !== 'responses') return;
    const uid = formUid || localStorage.getItem(`formUid:${projectId}`);
    if (uid) { setFormUid(uid); loadAnalyze(uid); }
    else { loadFormOfProject().then(() => { const u2 = formUid || localStorage.getItem(`formUid:${projectId}`); if (u2) loadAnalyze(u2); }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, projectId, formUid]);

  /* ========= Reports helpers ========= */
  function toRelativeExportsPath(path: string) {
    const m = path.match(/^https?:\/\/[^/]+(\/exports\/.*)$/i);
    if (m) return m[1];
    if (path.startsWith('/exports/')) return path;
    if (/^exports\//i.test(path)) return '/' + path;
    return path;
  }

  async function loadProjectReports() {
    setReportsLoading(true); setReportsError(null);
    try {
      const res = await apiFetch(`${API_BASE}/api/app/project/reports/${projectId}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const items: ReportItem[] = (Array.isArray(data) ? data : []).map((r: any) => {
        const ready = !!r?.filePath;
        return {
          id: r.id,
          title: r.title || '—',
          type: 'markdown',
          createdAt: r.creationTime || r.generationDate || r.lastModificationTime || new Date().toISOString(),
          status: ready ? 'ready' : 'processing',
          downloadUrl: ready ? toRelativeExportsPath(String(r.filePath)) : undefined,
        };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReports(items);
    } catch (e: any) {
      setReportsError(e?.message || 'Failed to load reports');
    } finally { setReportsLoading(false); }
  }

  useEffect(() => { if (tab === 'reports') loadProjectReports(); }, [tab, projectId]);

  useEffect(() => {
    if (tab !== 'reports') return;
    const hasProcessing = reports.some(r => r.status === 'processing');
    if (!hasProcessing) return;
    const id = setInterval(() => loadProjectReports(), 5000);
    return () => clearInterval(id);
  }, [tab, reports, projectId]);

  async function downloadExport(downloadUrlOrPath: string, suggestedTitle?: string) {
    try {
      const downloadUrl = toRelativeExportsPath(downloadUrlOrPath);
      const token = getToken();
      const fileRes = await fetch(downloadUrl, {
        headers: { Accept: 'text/markdown, text/plain, */*', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!fileRes.ok) throw new Error(`Download error ${fileRes.status}`);
      const blob = await fileRes.blob();
      const fnameFromPath = (downloadUrl.split('/').pop() || 'report.md').replace(/[?#].*$/, '');
      const fileName = (suggestedTitle ? `${suggestedTitle}.md` : fnameFromPath).replace(/[\\/:*?"<>|]/g, '_');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Failed to download file');
    }
  }

  async function openReportViewer(downloadUrlOrPath: string, title: string) {
    const url = toRelativeExportsPath(downloadUrlOrPath);
    setViewerTitle(title);
    setViewerDownloadUrl(url);
    setViewerOpen(true);
    setViewerLoading(true);
    setViewerError(null);
    try {
      const token = getToken();
      const res = await fetch(url, {
        headers: { Accept: 'text/markdown, text/plain, */*', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error(`Load error ${res.status}`);
      const md = await res.text();
      const html = mdToHtml(md);
      setViewerHtml(html);
    } catch (e: any) {
      setViewerError(e?.message || 'Failed to load report');
    } finally {
      setViewerLoading(false);
    }
  }

async function downloadPdfFromMd(downloadUrlOrPath: string, title: string) {
  // افتح النافذة مباشرة (ضمن حدث الضغط) لتجنب الـpopup blocker
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=800');
  if (!w) { alert('Please allow pop-ups'); return; }
  w.document.write(`<html><head><title>${title}</title>${getMdStyles()}</head><body dir="rtl"><p>... جاري تجهيز التقرير ...</p></body></html>`);
  w.document.close();

  try {
    const url = toRelativeExportsPath(downloadUrlOrPath);
    const token = getToken();
    const res = await fetch(url, {
      headers: { Accept: 'text/markdown, text/plain, */*', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) throw new Error(`Load error ${res.status}`);
    const md = await res.text();
    const html = mdToHtml(md);
    w.document.body.innerHTML = html;
    setTimeout(() => { try { w.print(); } catch {} }, 100);
  } catch (e: any) {
    w.document.body.innerHTML = `<p style="color:#b91c1c">Error: ${e?.message || 'Failed to prepare PDF'}</p>`;
  }
}

  /* ========= تبويب التقارير ========= */
  const reportsTab = (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm font-medium text-slate-800">Reports</div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Report title…"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
            style={{ minWidth: 220 }}
          />
          <button onClick={async () => {
              if (!reportTitle.trim()) { setGenErr('Please enter a report title.'); setTimeout(() => setGenErr(null), 2500); return; }
              setGenBusy(true); setGenErr(null);
              try {
                const url = `${API_BASE}/api/app/project/generate-report/${projectId}?reportTitle=${encodeURIComponent(reportTitle.trim())}`;
                const res = await apiFetch(url, { method: 'POST', headers: { Accept: 'application/json' } });
                if (!res.ok) throw new Error(`Error ${res.status}`);
                const created = await res.json();
                setReportTitle('');
                setReports(prev => [{ id: created?.id || `gen-${Date.now()}`, title: created?.title || 'report', type: 'markdown', createdAt: created?.creationTime || new Date().toISOString(), status: 'processing' }, ...prev]);
                loadProjectReports();
              } catch (e: any) {
                setGenErr(e?.message || 'Failed to generate report'); setTimeout(() => setGenErr(null), 3000);
              } finally { setGenBusy(false); }
            }}
            disabled={genBusy}
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            title="Generate .md report"
          >
            <FileDown size={16} /> {genBusy ? 'Generating…' : 'Generate (.md)'}
          </button>
          <button onClick={loadProjectReports} disabled={reportsLoading} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50" title="Refresh list">
            <RefreshCw size={16} /> {reportsLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {genErr && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">Error: {genErr}</div>}
      {reportsError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">Error: {reportsError}</div>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 text-xs font-medium text-slate-600">
          <div className="col-span-5">Title</div>
          <div className="col-span-3">Created at</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Actions</div>
        </div>
        <div className="divide-y">
          {reportsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <Skeleton className="h-5 w-64 mb-2" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))
          ) : reports.length ? (
            reports.map((r) => (
              <div key={r.id} className="grid grid-cols-12 items-center gap-2 px-4 py-3">
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
                  {r.status === 'ready' && r.downloadUrl ? (
                    <div className="flex gap-3 justify-end">
                      <button className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                              onClick={() => openReportViewer(r.downloadUrl!, r.title)}>
                        <Eye size={16} /> View
                      </button>
                      <button className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                              onClick={() => downloadPdfFromMd(r.downloadUrl!, r.title)}>
                        <FileText size={16} /> PDF
                      </button>
                      <button className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                              onClick={() => downloadExport(r.downloadUrl!, r.title)}>
                        <Download size={16} /> .md
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-right">—</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-sm text-slate-500">No reports yet.</div>
          )}
        </div>
      </div>
    </div>
  );

  /* ========= Team ========= (كما في النسخة السابقة مع أزرار الإسناد) */
  async function loadUsersWithRoles() {
    setTeamLoading(true); setTeamError(null);
    try {
      const res = await apiFetch(`${API_BASE}/api/app/user-roles/with-roles`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const arr = await res.json();
      const list: UserWithRoles[] = Array.isArray(arr)
        ? arr.map((u: any) => ({
            id: u.id, userName: u.userName, name: u.name ?? null, surname: u.surname ?? null,
            email: u.email ?? null, phoneNumber: u.phoneNumber ?? null, isActive: !!u.isActive,
            roles: Array.isArray(u.roles) ? u.roles : [], creationTime: u.creationTime ?? null, lastModificationTime: u.lastModificationTime ?? null,
          }))
        : [];
      list.sort((a, b) => Number(b.isActive) - Number(a.isActive) || (a.userName || '').localeCompare(b.userName || ''));
      setUsersWithRoles(list);
    } catch (e: any) {
      setTeamError(e?.message || 'Failed to load users');
    } finally { setTeamLoading(false); }
  }
  useEffect(() => {
    const map: Record<string, boolean> = {};
    (project?.projectUsers || []).forEach(pu => { if (pu?.userId) map[pu.userId] = true; });
    setAssignedMap(map);
  }, [project?.projectUsers]);
  useEffect(() => { if (tab === 'team') loadUsersWithRoles(); }, [tab, projectId]);

  async function assignUserToProject(userId: string) {
    setAssignBusy(prev => ({ ...prev, [userId]: true }));
    try {
      const body = { userId, assignedDate: new Date().toISOString() };
      const res = await apiFetch(`${API_BASE}/api/app/project/${projectId}/user`, {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) { const j = await res.json(); msg = j?.message || j?.error || msg; }
          else { const t = await res.text(); if (t) msg = `${msg}: ${t.slice(0, 180)}`; }
        } catch {}
        throw new Error(msg);
      }
      const updated = await res.json();
      setProject(prev => prev ? { ...prev, lastRefresh: updated?.lastModificationTime ?? prev.lastRefresh, projectUsers: Array.isArray(updated?.projectUsers) ? updated.projectUsers : prev.projectUsers } : prev);
      setAssignedMap(prev => ({ ...prev, [userId]: true }));
    } catch (e: any) {
      alert(e?.message || 'Failed to assign user');
    } finally {
      setAssignBusy(prev => ({ ...prev, [userId]: false }));
    }
  }

  const teamTab = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-700">
          <span className="font-medium">Team members</span>
          {project?.projectUsers?.length ? <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{project.projectUsers.length} assigned</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchUser} onChange={(e) => setSearchUser(e.target.value)} placeholder="Search users…" className="pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white" />
          </div>
          <button onClick={loadUsersWithRoles} disabled={teamLoading} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50" title="Refresh">
            <RefreshCw size={16} /> {teamLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {teamError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">Error: {teamError}</div>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 text-xs font-medium text-slate-600">
          <div className="col-span-3">User</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-3">Roles</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Action</div>
        </div>
        <div className="divide-y">
          {teamLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-64 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))
          ) : (
            (usersWithRoles.filter(u => {
              const q = searchUser.trim().toLowerCase(); if (!q) return true;
              const full = [u.userName, u.name || '', u.surname || '', u.email || '', ...(u.roles || [])].join(' ').toLowerCase();
              return full.includes(q);
            })).map(u => {
              const assigned = !!assignedMap[u.id];
              return (
                <div key={u.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm items-center">
                  <div className="col-span-3">
                    <div className="font-medium text-slate-900">{u.userName}</div>
                    <div className="text-xs text-slate-500">{(u.name || '') + (u.surname ? ` ${u.surname}` : '') || '—'}</div>
                  </div>
                  <div className="col-span-3 text-slate-800 break-all">{u.email || '—'}</div>
                  <div className="col-span-3">
                    <div className="flex flex-wrap gap-1">
                      {(u.roles || []).map((r, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">{r}</span>)}
                      {!(u.roles || []).length && <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">No role</span>}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-xs px-2 py-1 rounded ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                    {assigned && <span className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700"><Check size={14} /> Assigned</span>}
                  </div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => assignUserToProject(u.id)} disabled={assigned || !!assignBusy[u.id]} className={`inline-flex items-center justify-center gap-1 text-xs px-2 py-1 rounded ${assigned ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'} disabled:opacity-60`} title={assigned ? 'Already in team' : 'Add to team'}>
                      {!assigned && <UserPlus size={14} />}{assigned ? 'In team' : (assignBusy[u.id] ? 'Adding…' : 'Add')}
                    </button>
                  </div>
                </div>
              );
            })
          )}
          {!teamLoading && !teamError && usersWithRoles.length === 0 && <div className="px-4 py-6 text-sm text-slate-500">No users found.</div>}
        </div>
      </div>
    </div>
  );

  /* ========= تبويبات و Render ========= */
  const tabsBar = (
    <div className="flex gap-2">
      {(['overview','indicators','data-collection','responses','reports','team'] as const).map((t) => (
        <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
          {t.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
        </TabButton>
      ))}
    </div>
  );

  const overview = (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-900 mb-2">Description</div>
        <div className="text-sm text-slate-800 whitespace-pre-wrap">{project?.description?.trim() ? project.description : '—'}</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-900 mb-2">Logical framework</div>
        <div className="rounded-lg border border-slate-200 p-4">
          {lfLoading ? (
            <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-56" /><Skeleton className="h-4 w-48" /></div>
          ) : lfError ? (
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
              {project.code && <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">{project.code}</span>}
              <span className={`text-xs px-2 py-1 rounded ${statusLabel(project.status).bg} ${statusLabel(project.status).color}`}>{statusLabel(project.status).label}</span>
            </div>

            <div className="mt-2 text-sm text-slate-500 flex flex-wrap gap-4">
              <div><span className="font-medium text-slate-600">Last refresh:</span> {fmtDate(project.lastRefresh)}</div>
              <div>{fmtDate(project.startDate)} — {fmtDate(project.endDate)}</div>
              <div className="flex items-center gap-1">
                <MapPin size={14} className="text-slate-400" />
                <span className="font-medium text-slate-600">Location:</span>{' '}
                <span className="text-slate-700">{project.location || '—'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-slate-600">Project manager:</span>{' '}
                <span className="text-slate-700">{pmName}</span>
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
            <button className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                    onClick={async () => {
                      try {
                        const dataUrl = await QRCode.toDataURL(`${window.location.origin}/f/${encodeURIComponent(projectId)}`, { margin: 1, width: 256 });
                        setQrUrl(dataUrl);
                        setQrOpen(true);
                      } catch {
                        setQrUrl(''); setQrOpen(true);
                      }
                    }}
                    title="Generate public feedback QR">Feedback QR</button>
            <button className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                    onClick={() => { if (!qrUrl) return; const a = document.createElement('a'); a.href = qrUrl; a.download = `feedback-qr-${projectId}.png`; a.click(); }}
                    disabled={!qrUrl}
                    title="Download QR as PNG">Download PNG</button>
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
              <button className="text-xs px-2 py-1 rounded border border-slate-300" onClick={() => { if (!qrUrl) return; const a = document.createElement('a'); a.href = qrUrl; a.download = `feedback-qr-${projectId}.png`; a.click(); }} disabled={!qrUrl}>Download PNG</button>
            </div>
          </div>
          <div className="ml-auto">
            {qrUrl ? <img src={qrUrl} alt="Feedback QR" className="w-40 h-40 border rounded" /> : <div className="text-xs text-slate-500">QR not available</div>}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button className="text-sm text-slate-600 hover:text-slate-900" onClick={() => (onBack ? onBack() : window.history.back())}>← Back</button>
      </div>

      {header}

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Project</div>
        {tabsBar}
      </div>

      {tab === 'overview' && overview}
      {tab === 'indicators' && (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 text-xs font-medium text-slate-600">
            <div className="col-span-3">Indicator</div><div className="col-span-2">Unit</div><div className="col-span-2">Frequency</div>
            <div className="col-span-2">Baseline</div><div className="col-span-2">Target</div><div className="col-span-1">Latest</div>
          </div>
          <div className="divide-y">
            {indLoading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="px-4 py-3"><Skeleton className="h-4 w-64 mb-2" /><Skeleton className="h-4 w-40" /></div>)
            ) : indError ? (
              <div className="px-4 py-6 text-sm text-red-600">{indError}</div>
            ) : indicators.length ? (
              indicators.map((it) => {
                const values = Array.isArray(it.indicatorValues) ? it.indicatorValues : [];
                const sorted = values.slice().sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime());
                const latest = sorted[0];
                const isOpen = !!openIndicators[it.id];
                return (
                  <div key={it.id} className="px-4 py-3">
                    <div className="grid grid-cols-12 gap-2 text-sm text-slate-900 items-start">
                      <div className="col-span-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">{it.name || '—'}</div>
                            {it.description && <div className="text-xs text-slate-500 mt-1">{it.description}</div>}
                          </div>
                          <button onClick={() => setOpenIndicators((prev) => ({ ...prev, [it.id]: !prev[it.id] }))} className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 shrink-0" aria-expanded={isOpen} aria-controls={`values-${it.id}`}>
                            {isOpen ? 'Hide values' : `Show values (${values.length})`}
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2">{({0:'Count',1:'Percentage',2:'Ratio'} as any)[it.unit] ?? String(it.unit ?? '—')}</div>
                      <div className="col-span-2">{({0:'Daily',1:'Weekly',2:'Biweekly',3:'Monthly',4:'Quarterly',5:'Biannually',6:'Annually',7:'One-time'} as any)[it.frequencyOfMeasurement ?? -1] ?? '—'}</div>
                      <div className="col-span-2">{it.baseline ?? '—'}</div>
                      <div className="col-span-2">{it.target ?? '—'}</div>
                      <div className="col-span-1">{latest ? `${latest.value}` : '—'}{latest && <div className="text-[11px] text-slate-500">{fmtDate(latest.measurementDate)}</div>}</div>
                    </div>
                    {isOpen && (
                      <div id={`values-${it.id}`} className="mt-3 rounded-lg border border-slate-200 overflow-hidden">
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 text-[11px] font-medium text-slate-600">
                          <div className="col-span-4">Measurement date</div><div className="col-span-2">Value</div><div className="col-span-3">Notes</div><div className="col-span-2">Collected by</div><div className="col-span-1 text-right">N</div>
                        </div>
                        <div className="max-h-64 overflow-auto divide-y">
                          {sorted.length ? sorted.map((v, idx) => (
                            <div key={v.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                              <div className="col-span-4 text-slate-700">{fmtDate(v.measurementDate)}</div>
                              <div className="col-span-2 font-medium">{v.value}</div>
                              <div className="col-span-3 text-slate-700">{v.notes || '—'}</div>
                              <div className="col-span-2 text-slate-500">{v.collectedByUserId || '—'}</div>
                              <div className="col-span-1 text-right text-slate-500">{idx + 1}</div>
                            </div>
                          )) : <div className="px-3 py-3 text-sm text-slate-500">No values yet.</div>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : <div className="px-4 py-6 text-sm text-slate-500">No indicators.</div>}
          </div>
        </div>
      )}
      {tab === 'data-collection' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">Data collection</div>
              <button onClick={loadFormOfProject} disabled={formLoading} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50" title="Refresh"><RefreshCw size={16} /> {formLoading ? 'Refreshing…' : 'Refresh'}</button>
            </div>
            <div className="mt-3">
              {formLoading ? (
                <div className="space-y-3"><Skeleton className="h-5 w-56" /><Skeleton className="h-4 w-80" /><Skeleton className="h-24 w-full" /></div>
              ) : formError ? (
                <div className="text-sm text-red-600">Error: {formError}</div>
              ) : formInfo ? (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{qc(formInfo.name)}</div>
                      <div className="text-xs text-slate-500 mt-1 break-all">UID: {qc(formInfo.uid)}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700">
                          {formInfo?.metadata?.deployment_status || (formInfo?.metadata?.deployment__active ? 'deployed' : 'not deployed')}
                        </span>
                        {typeof formInfo?.metadata?.deployment__submission_count === 'number' && (
                          <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">submissions: {formInfo.metadata.deployment__submission_count}</span>
                        )}
                        {formInfo?.metadata?.deployed_version_id && (
                          <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">version: {formInfo.metadata.deployed_version_id}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {koboUrl && <a href={koboUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"><ExternalLink size={16} /> Open in Kobo</a>}
                      {dataJsonUrl && <a href={dataJsonUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"><Database size={16} /> Data (JSON)</a>}
                      {xlsxUrl && <a href={xlsxUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"><FileDown size={16} /> XLSX</a>}
                      {csvUrl && <a href={csvUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"><FileDown size={16} /> CSV</a>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">Owner</div>
                      <div className="text-sm text-slate-800">{qc(formInfo?.metadata?.owner__username)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">Languages</div>
                      <div className="text-sm text-slate-800">{(formInfo?.metadata?.summary?.languages || []).join(', ') || '—'}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">Rows</div>
                      <div className="text-sm text-slate-800">{formInfo?.metadata?.summary?.row_count ?? '—'}</div>
                    </div>
                    {columns.length ? (
                      <div className="rounded-lg border border-slate-200 p-3 md:col-span-2 lg:col-span-3">
                        <div className="text-xs text-slate-500 mb-1">Columns</div>
                        <div className="flex flex-wrap gap-1">
                          {columns.map((c) => <span key={c} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">{c}</span>)}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-sm font-medium text-slate-800 mb-2">Submissions</div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-2 px-2 py-1 rounded bg-slate-100 text-slate-700"><Link2 size={14} /> {formInfo?.metadata?.deployment__submission_count ?? '—'} total</span>
                      <span className="text-slate-600">Last submission: {fmtDate(formInfo?.metadata?.deployment__last_submission_time)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">No form is assigned to this project yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
      {tab === 'responses' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <BarChart3 size={18} className="text-slate-500" />
              <span className="font-medium">Analyze responses</span>
              {formUid && <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">formUid: {formUid}</span>}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-600">View:</div>
              <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)} className="text-sm border border-slate-200 rounded-lg px-2 py-1 bg-white">
                <option value="percent">Percent %</option>
                <option value="count">Counts</option>
              </select>
              <button onClick={() => formUid ? loadAnalyze(formUid) : loadFormOfProject()} disabled={anLoading} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">
                <RefreshCw size={16} /> {anLoading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          {anError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">Error: {anError}</div>}

          {anLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                  <Skeleton className="h-5 w-48 mb-3" />
                  <Skeleton className="h-56 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {anRows.map((row, i) => {
                const dataForChart = row.segments.map(s => ({ name: s.label, value: viewMode === 'count' ? s.count : Number(s.percent.toFixed(2)) }));
                const footer = (
                  <div className="mt-2 text-[12px] text-slate-500">
                    Provided: <span className="font-medium text-slate-700">{row.provided}</span> ·
                    {' '}Missing: <span className="font-medium text-slate-700">{row.notProvided}</span> ·
                    {' '}Total: <span className="font-medium text-slate-700">{row.total}</span>
                  </div>
                );
                if (row.type === 'select_multiple') {
                  return (
                    <div key={row.name} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-sm font-medium text-slate-800 mb-2">{row.questionLabel}</div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RBarChart data={dataForChart} margin={{ top: 10, right: 10, left: 0, bottom: 24 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={50} />
                            <YAxis /><Tooltip /><Legend />
                            <Bar dataKey="value" name={viewMode === 'count' ? 'Count' : 'Percent'}>
                              {dataForChart.map((_, i2) => <Cell key={i2} fill={COLORS[i2 % COLORS.length]} />)}
                            </Bar>
                          </RBarChart>
                        </ResponsiveContainer>
                      </div>
                      {footer}
                    </div>
                  );
                }
                return (
                  <div key={row.name} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-medium text-slate-800 mb-2">{row.questionLabel}</div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={dataForChart} dataKey="value" nameKey="name" outerRadius="80%">
                            {dataForChart.map((_, i2) => <Cell key={i2} fill={COLORS[i2 % COLORS.length]} />)}
                          </Pie>
                          <Tooltip /><Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {footer}
                  </div>
                );
              })}
              {!anRows.length && formUid && <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500 text-sm">No charts to show.</div>}
            </div>
          )}
        </div>
      )}
      {tab === 'reports' && reportsTab}
      {tab === 'team' && teamTab}

      {/* ======= Modal عارض Markdown ======= */}
      {viewerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900 truncate">{viewerTitle || 'Report'}</div>
              <div className="flex items-center gap-2">
                {viewerDownloadUrl && (
                  <>
                    <button
                      className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                      onClick={() => viewerDownloadUrl && downloadExport(viewerDownloadUrl, viewerTitle)}
                      title="Download Markdown"
                    >
                      <Download size={16} /> .md
                    </button>
                    <button
                      className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                      onClick={() => openPrintWindowWithContent(viewerHtml, viewerTitle || 'report')}
                      title="Download PDF"
                    >
                      <FileDown size={16} /> PDF
                    </button>
                  </>
                )}
                <button className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100" onClick={() => setViewerOpen(false)} title="Close">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto">
              {viewerLoading && <div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-5 w-80" /><Skeleton className="h-64 w-full" /></div>}
              {viewerError && <div className="text-sm text-red-600">Error: {viewerError}</div>}
              {!viewerLoading && !viewerError && (
                <article
  className="prose max-w-none"
  dir="rtl"
  style={{ lineHeight: 1.65, color: '#0f172a' }}
  dangerouslySetInnerHTML={{ __html: viewerHtml }}
/>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
