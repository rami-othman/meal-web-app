// src/pages/CreateProjectPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { API_BASE } from '../lib/api';

type Step = 0 | 1 | 2 | 3;

/* =========================
   Helpers & enums
========================= */
const STATUS_OPTIONS = [
  { v: '1', label: 'Planning' },
  { v: '2', label: 'Active' },
  { v: '3', label: 'OnHold' },
  { v: '4', label: 'Completed' },
  { v: '5', label: 'Cancelled' },
];

const LOGFRAME_LEVELS = [
  { v: 'goal', label: 'goal' },
  { v: 'outcome', label: 'outcome' },
  { v: 'output', label: 'output' },
  { v: 'activity', label: 'activity' },
] as const;

const ICON: Record<typeof LOGFRAME_LEVELS[number]['v'], string> = {
  goal: '🎯',
  outcome: '📈',
  output: '📦',
  activity: '🔧',
};

// map levels -> backend enum
const LEVEL_TO_TYPE: Record<LogNode['level'], number> = {
  goal: 0,
  outcome: 1,
  output: 2,
  activity: 3,
};

// ========= Indicator enums (dropdown options) =========
const INDICATOR_TYPE_OPTIONS = [
  { v: 0 as 0, label: 'Quantitative' },
  { v: 1 as 1, label: 'Qualitative' },
];

const INDICATOR_UNIT_OPTIONS = [
  { v: 0 as 0, label: 'Number' },
  { v: 1 as 1, label: 'Percentage' },
  { v: 2 as 2, label: 'Rating' },
];

const MEASUREMENT_FREQ_OPTIONS = [
  { v: 0 as 0, label: 'Daily' },
  { v: 1 as 1, label: 'Weekly' },
  { v: 2 as 2, label: 'Biweekly' },
  { v: 3 as 3, label: 'Monthly' },
  { v: 4 as 4, label: 'Quarterly' },
  { v: 5 as 5, label: 'Biannually' },
  { v: 6 as 6, label: 'Annually' },
  { v: 7 as 7, label: 'OneTime' },
];

/* =========================
   Types
========================= */
type LogNode = {
  id: string;
  level: typeof LOGFRAME_LEVELS[number]['v'];
  label: string;
  parentId?: string | null;
  assumption?: string;
};

type IndicatorRow = {
  id: string;
  name: string;
  description: string;
  type: 0 | 1;                 // IndicatorType
  unit: 0 | 1 | 2;             // IndicatorUnit
  baseline: number | '';
  target: number | '';
  frequencyOfMeasurement: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // MeasurementFrequency
  fromRegistry?: string | null;
};

type Manager = {
  id: string;
  userName?: string | null;
  email?: string | null;
  name?: string | null;
  surname?: string | null;
};

type KoboForm = {
  uid: string;
  name: string;
};

/* =========================
   Utils
========================= */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function getToken() {
  return (
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token') ||
    ''
  );
}

async function safeJson(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Unexpected response (${ct}). ${text.slice(0, 160)}`);
  }
  return res.json();
}

// Better ABP/Problem+Json error reader
async function readErrMsg(res: Response): Promise<string> {
  try {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j = await res.json();
      const code =
        j?.error?.code || j?.code || j?.errorCode || j?.error?.error?.code;
      const msg =
        j?.error?.message ||
        j?.message ||
        j?.title ||
        j?.error_description ||
        j?.error?.details;
      const combo = [code, msg].filter(Boolean).join(': ');
      return combo || JSON.stringify(j);
    } else {
      const t = await res.text();
      return t || res.statusText || `HTTP ${res.status}`;
    }
  } catch {
    return `HTTP ${res.status}`;
  }
}

/* =========================
   Tabs header
========================= */
function Tabs({ step, setStep }: { step: Step; setStep: (s: Step) => void }) {
  const tabs = [
    { key: 0 as Step, label: 'Overview' },
    { key: 1 as Step, label: 'ToC & Logframe' },
    { key: 2 as Step, label: 'Indicators' },
    { key: 3 as Step, label: 'Data Collection' },
  ];
  return (
    <div className="flex gap-2 items-center">
      {tabs.map((t, i) => (
        <button
          key={t.key}
          onClick={() => setStep(t.key)}
          className={`px-3 py-2 text-sm rounded-lg border transition ${
            step === t.key
              ? 'bg-slate-900 text-white'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {i + 1} <span className="mx-1">·</span> {t.label}
        </button>
      ))}
    </div>
  );
}

/* =========================
   Page
========================= */
export function CreateProjectPage() {
  const [step, setStep] = useState<Step>(0);

  /* --- Overview form --- */
  const [formData, setFormData] = useState({
    projectName: '',
    projectCode: '',
    startDate: '',
    endDate: '',
    status: '1',
    primaryManager: '', // managerId
    description: '',
    sites: '',
  });

  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [mgrErr, setMgrErr] = useState<string | null>(null);
  const [mgrLoading, setMgrLoading] = useState(false);

  // Logframe saving states
  const [savingLogframe, setSavingLogframe] = useState(false);
  const [logframeMsg, setLogframeMsg] = useState<string | null>(null);

  // Indicators saving states
  const [savingIndicators, setSavingIndicators] = useState(false);
  const [indicatorsMsg, setIndicatorsMsg] = useState<string | null>(null);

  // === Kobo Forms (Data Collection) ===
  const [forms, setForms] = useState<KoboForm[]>([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsErr, setFormsErr] = useState<string | null>(null);
  const [selectedFormUid, setSelectedFormUid] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  /* === Fetch project managers === */
  useEffect(() => {
    let mounted = true;
    async function run() {
      setMgrLoading(true);
      setMgrErr(null);
      try {
        const res = await fetch(`${API_BASE}/api/app/project/project-managers`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data: Manager[] = await safeJson(res);
        if (mounted) setManagers(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (mounted) setMgrErr(e?.message || 'Failed to load managers');
      } finally {
        if (mounted) setMgrLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, []);

  /* --- ToC & Logframe --- */
  const [logRows, setLogRows] = useState<LogNode[]>([
    { id: uid(), level: 'goal', label: 'goal', parentId: null, assumption: '' },
  ]);

  const validParentsFor = (level: LogNode['level']) => {
    const order = ['goal', 'outcome', 'output', 'activity'] as const;
    const idx = order.indexOf(level);
    const need = idx - 1;
    if (need < 0) return [];
    const parentLevel = order[need];
    return logRows.filter((r) => r.level === parentLevel);
  };

  const logPreview = useMemo(() => {
    const byId = new Map<string, LogNode>();
    logRows.forEach((r) => byId.set(r.id, r));
    const kids = new Map<string, LogNode[]>();
    logRows.forEach((r) => {
      if (r.parentId) {
        const arr = kids.get(r.parentId) || [];
        arr.push(r);
        kids.set(r.parentId, arr);
      }
    });
    const roots = logRows.filter((r) => !r.parentId);

    function render(node: LogNode): React.ReactNode {
      const child = kids.get(node.id) || [];
      return (
        <div key={node.id} className="pl-4">
          <div className="text-sm">
            <span className="mr-1">{ICON[node.level]}</span>
            <span className="font-semibold">{node.level}</span>
            <span className="text-slate-600"> — {node.label}</span>
          </div>
          {child.map(render)}
        </div>
      );
    }

    return <div>{roots.map(render)}</div>;
  }, [logRows]);

  /* --- Indicators --- */
  const [indRows, setIndRows] = useState<IndicatorRow[]>([
    {
      id: uid(),
      name: '',
      description: '',
      type: 0,
      unit: 1, // Percentage افتراضي
      baseline: 0,
      target: '',
      frequencyOfMeasurement: 3, // Monthly افتراضي
      fromRegistry: null,
    },
  ]);

  /* =========================
     Actions
  ========================= */
  const handleSaveDraft = () => {
    alert('Project saved as draft (local only).');
  };

  const nextFromOverview = async () => {
    setCreateErr(null);

    // basic validation
    if (!formData.projectName.trim()) return setCreateErr('Project name is required.');
    if (!formData.startDate || !formData.endDate) return setCreateErr('Start and End dates are required.');
    if (!formData.primaryManager) return setCreateErr('Primary manager is required.');

    // Prepare payload for Create Project API
    const payload = {
      name: formData.projectName.trim(),
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      status: Number(formData.status) || 1,
      priority: 0,
      description: formData.description || '',
      location: formData.sites || '',
      projectManagerId: formData.primaryManager,
    };

    try {
      setCreating(true);
      const res = await fetch(`${API_BASE}/api/app/project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await readErrMsg(res);
        throw new Error(msg);
      }
      const data = await res.json();
      const newId = data?.id as string | undefined;
      if (!newId) throw new Error('No project ID returned.');
      setCreatedProjectId(newId);
      setStep(1); // move to ToC & Logframe
    } catch (e: any) {
      setCreateErr(e?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  // (اختياري) لو احتجت تتأكد من وجود LogicalFramework قبل إنشاء items
  async function ensureLogicalFramework(projectId: string): Promise<void> {
    const token = getToken();
    const tryGets = [
      `${API_BASE}/api/app/logical-framework/by-project/${projectId}`,
      `${API_BASE}/api/app/logical-framework?projectId=${encodeURIComponent(projectId)}`,
    ];
    for (const url of tryGets) {
      try {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) return;
      } catch {}
    }
    const candidates: Array<{ url: string; body?: any; useQuery?: boolean }> = [
      { url: `${API_BASE}/api/app/logical-framework`, body: { projectId } },
      { url: `${API_BASE}/api/app/logical-framework/create`, body: { projectId } },
      { url: `${API_BASE}/api/app/logical-framework?projectId=${encodeURIComponent(projectId)}`, useQuery: true },
    ];
    let lastErr = 'Unknown error';
    for (const c of candidates) {
      try {
        const r = await fetch(c.url, {
          method: 'POST',
          headers: {
            'Content-Type': c.useQuery ? undefined as any : 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: c.useQuery ? undefined : JSON.stringify(c.body),
        });
        if (r.ok) return;
        lastErr = await readErrMsg(r);
      } catch (e: any) {
        lastErr = e?.message || lastErr;
      }
    }
    throw new Error(`Failed to ensure LogicalFramework: ${lastErr}`);
  }

  async function createLogframeItems(projectId: string): Promise<number> {
    if (!projectId) throw new Error('Project ID is missing.');
    if (!formData.startDate || !formData.endDate)
      throw new Error('Project start/end dates are required (from Overview).');

    const startIso = new Date(formData.startDate).toISOString();
    const endIso = new Date(formData.endDate).toISOString();

    // تأكيد LF (في حال الباك يتطلبه)
    try {
      await ensureLogicalFramework(projectId);
    } catch {
      // لو API ما عنده LF، تجاهل
    }

    const idMap = new Map<string, string>();
    const order: LogNode['level'][] = ['goal', 'outcome', 'output', 'activity'];

    // validations
    for (const r of logRows) {
      if (!r.label?.trim()) throw new Error(`Row "${r.level}" is missing a label.`);
      if (r.level !== 'goal' && !r.parentId)
        throw new Error(`"${r.label}" (${r.level}) requires a parent.`);
    }

    for (const lvl of order) {
      const nodes = logRows.filter((n) => n.level === lvl);

      await Promise.all(
        nodes.map(async (n) => {
          const parentBackendId = n.parentId ? idMap.get(n.parentId) ?? null : null;

          if (lvl !== 'goal' && !parentBackendId) {
            throw new Error(`Parent was not created for "${n.label}" (${n.level}).`);
          }

          const payload = {
            projectId,
            parentId: parentBackendId,
            type: LEVEL_TO_TYPE[n.level],
            name: n.label?.trim() || n.level,
            description: n.assumption || '',
            startDate: startIso,
            endDate: endIso,
            status: 0,
          };

          const res = await fetch(`${API_BASE}/api/app/logical-framework-item`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const msg = await readErrMsg(res);
            throw new Error(`Failed to create ${n.level} "${n.label}": ${msg}`);
          }

          const data = await res.json();
          const newId = data?.id as string | undefined;
          if (!newId) throw new Error('No ID returned for logical framework item.');
          idMap.set(n.id, newId);
        })
      );
    }

    return idMap.size;
  }

  // ====== INDICATORS: POST all rows ======
  async function createIndicators(projectId: string): Promise<number> {
    if (!projectId) throw new Error('Project ID is missing.');

    // basic validation
    for (const r of indRows) {
      if (!r.name.trim()) throw new Error('Each indicator must have a name.');
      if (r.target === '' || Number.isNaN(Number(r.target))) {
        throw new Error(`Indicator "${r.name || '(unnamed)'}" is missing a valid target.`);
      }
      if (r.baseline !== '' && Number.isNaN(Number(r.baseline))) {
        throw new Error(`Indicator "${r.name}" has invalid baseline.`);
      }
    }

    let created = 0;
    await Promise.all(
      indRows.map(async (r) => {
        const payload = {
          projectId,
          name: r.name.trim(),
          description: r.description || '',
          type: r.type, // 0 Quantitative | 1 Qualitative
          unit: r.unit, // 0 Number | 1 Percentage | 2 Rating
          baseline: r.baseline === '' ? 0 : Number(r.baseline),
          target: Number(r.target),
          frequencyOfMeasurement: r.frequencyOfMeasurement, // 0..7
        };

        const res = await fetch(`${API_BASE}/api/app/indicator`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const msg = await readErrMsg(res);
          throw new Error(`Failed to create indicator "${r.name}": ${msg}`);
        }
        created += 1;
      })
    );

    return created;
  }

  const next = async () => {
    if (step === 0) {
      await nextFromOverview();
      return;
    }

    if (step === 1) {
      if (!createdProjectId) {
        setLogframeMsg('Project is not created yet. Go back to Overview and click Next.');
        return;
      }
      try {
        setSavingLogframe(true);
        setLogframeMsg(null);
        const count = await createLogframeItems(createdProjectId);
        setLogframeMsg(`تم حفظ ${count} عنصر Logframe بنجاح.`);
        setStep(2);
      } catch (e: any) {
        setLogframeMsg(e?.message || 'فشل حفظ الـ Logframe.');
      } finally {
        setSavingLogframe(false);
      }
      return;
    }

    if (step === 2) {
      if (!createdProjectId) {
        setIndicatorsMsg('Project is not created yet. Go back to Overview and click Next.');
        return;
      }
      try {
        setSavingIndicators(true);
        setIndicatorsMsg(null);
        const count = await createIndicators(createdProjectId);
        setIndicatorsMsg(`تم إنشاء ${count} مؤشر بنجاح.`);
        setStep(3);
      } catch (e: any) {
        setIndicatorsMsg(e?.message || 'فشل حفظ المؤشرات.');
      } finally {
        setSavingIndicators(false);
      }
      return;
    }

    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  };

  const back = () => setStep((s) => (s > 0 ? ((s - 1) as Step) : s));

  const handleCreate = () => {
    console.log('Created project id:', createdProjectId);
    console.log('ToC&Logframe payload (client state):', logRows);
    console.log('Indicators payload (client state):', indRows);
    console.log('Selected Kobo form:', selectedFormUid);
    alert('Done (mock). Check console for payload.');
  };

  /* =========================
     Overview Tab
  ========================= */
  const OverviewTab = (
    <div className="space-y-6">
      {createdProjectId && (
        <div className="rounded-lg border border-green-300 bg-green-50 text-green-800 p-3 text-sm">
          Project created. ID: <b>{createdProjectId}</b>
        </div>
      )}

      <div className="text-gray-600">
        Set up basics now; on Next we will create the project and you can complete details in the next tabs.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
          <input
            name="projectName"
            value={formData.projectName}
            onChange={handleInput}
            placeholder="Enter project name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleInput}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
          <input
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleInput}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleInput}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Primary Manager *
          </label>
          <select
            name="primaryManager"
            value={formData.primaryManager}
            onChange={handleInput}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">
              {mgrLoading ? 'Loading…' : mgrErr ? 'Failed to load' : 'Select manager'}
            </option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name?.trim() || m.userName || 'User'} {m.surname || ''} {m.email ? `(${m.email})` : ''}
              </option>
            ))}
          </select>
          {mgrErr && <div className="text-xs text-red-600 mt-1">{mgrErr}</div>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Sites (stored as location)</label>
          <input
            name="sites"
            value={formData.sites}
            onChange={handleInput}
            placeholder="Enter site locations or area"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Description</label>
          <textarea
            rows={4}
            name="description"
            value={formData.description}
            onChange={handleInput}
            placeholder="Describe the project objectives, scope, and expected outcomes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {createErr && <div className="text-red-600 text-sm">{createErr}</div>}
    </div>
  );

  /* =========================
     ToC & Logframe Tab
  ========================= */
  const ToCTab = (
    <div className="space-y-4">
      {createdProjectId ? (
        <div className="rounded-lg border border-green-300 bg-green-50 text-green-800 p-3 text-sm mb-1">
          Project ID: <b>{createdProjectId}</b>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-800 p-3 text-sm mb-1">
          Project not created yet. Go back to Overview and click Next.
        </div>
      )}

      {logframeMsg && (
        <div
          className={`rounded-lg p-3 text-sm mb-1 ${
            logframeMsg.toLowerCase().includes('فشل') || logframeMsg.toLowerCase().includes('error')
              ? 'border-red-300 bg-red-50 text-red-800'
              : 'border-green-300 bg-green-50 text-green-800'
          }`}
        >
          {logframeMsg}
        </div>
      )}

      <div className="text-gray-600">
        Add nodes and link parents. Parent rules: <b>Outcome → Goal</b>, <b>Output → Outcome</b>,{' '}
        <b>Activity → Output</b>.
      </div>

      {/* Header row (names) */}
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-600 mb-1">
        <div className="col-span-2">Level</div>
        <div className="col-span-3">Label *</div>
        <div className="col-span-3">Parent</div>
        <div className="col-span-3">Assumption</div>
        <div className="col-span-1"></div>
      </div>

      <div className="space-y-2">
        {logRows.map((row) => {
          const parents = validParentsFor(row.level);
          return (
            <div
              key={row.id}
              className="grid grid-cols-12 gap-2 items-center bg-white border border-gray-200 rounded-lg p-2"
            >
              <div className="col-span-2">
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1"
                  value={row.level}
                  onChange={(e) =>
                    setLogRows((list) =>
                      list.map((r) =>
                        r.id === row.id ? { ...r, level: e.target.value as any, parentId: null } : r
                      )
                    )
                  }
                >
                  {LOGFRAME_LEVELS.map((l) => (
                    <option key={l.v} value={l.v}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <input
                  className="w-full border border-gray-300 rounded px-2 py-1"
                  value={row.label}
                  onChange={(e) =>
                    setLogRows((list) =>
                      list.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r))
                    )
                  }
                  placeholder="label *"
                />
              </div>

              <div className="col-span-3">
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1"
                  value={row.parentId || ''}
                  onChange={(e) =>
                    setLogRows((list) =>
                      list.map((r) =>
                        r.id === row.id ? { ...r, parentId: e.target.value || null } : r
                      )
                    )
                  }
                >
                  <option value="">—</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.level} ({p.label})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <input
                  className="w-full border border-gray-300 rounded px-2 py-1"
                  value={row.assumption || ''}
                  onChange={(e) =>
                    setLogRows((list) =>
                      list.map((r) =>
                        r.id === row.id ? { ...r, assumption: e.target.value } : r
                      )
                    )
                  }
                  placeholder="Key assumption (optional)"
                />
              </div>

              <div className="col-span-1 text-right">
                <button
                  onClick={() => setLogRows((list) => list.filter((r) => r.id !== row.id))}
                  className="p-2 rounded hover:bg-red-50 text-red-600"
                  title="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={() =>
            setLogRows((l) => [...l, { id: uid(), level: 'goal', label: 'goal', parentId: null }])
          }
          className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center gap-2"
        >
          <Plus size={16} />
          Add row
        </button>
      </div>

      <div className="mt-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Preview</div>
        <div className="rounded-lg border border-gray-200 p-3 bg-white">{logPreview}</div>
      </div>
    </div>
  );

  /* =========================
     Indicators Tab
  ========================= */
  const IndicatorsTab = (
    <div className="space-y-3">
      {createdProjectId && (
        <div className="rounded-lg border border-green-300 bg-green-50 text-green-800 p-3 text-sm">
          Project ID: <b>{createdProjectId}</b>
        </div>
      )}

      {indicatorsMsg && (
        <div
          className={`rounded-lg p-3 text-sm mb-1 ${
            indicatorsMsg.toLowerCase().includes('فشل') || indicatorsMsg.toLowerCase().includes('error')
              ? 'border-red-300 bg-red-50 text-red-800'
              : 'border-green-300 bg-green-50 text-green-800'
          }`}
        >
          {indicatorsMsg}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="text-gray-700">
          Define indicators for this project. All enums are dropdowns (Type, Unit, Frequency).
        </div>
        <button
          className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center gap-2"
          onClick={() =>
            setIndRows((l) => [
              ...l,
              {
                id: uid(),
                name: '',
                description: '',
                type: 0,
                unit: 1,
                baseline: 0,
                target: '',
                frequencyOfMeasurement: 3,
                fromRegistry: null,
              },
            ])
          }
        >
          <Plus size={16} /> Add indicator
        </button>
      </div>

      {/* Header names */}
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-600 mb-1">
        <div className="col-span-3">Name *</div>
        <div className="col-span-2">Type *</div>
        <div className="col-span-2">Unit *</div>
        <div className="col-span-2">Frequency *</div>
        <div className="col-span-1">Baseline</div>
        <div className="col-span-1">Target *</div>
        <div className="col-span-12">Description</div>
      </div>

      <div className="space-y-2">
        {indRows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-12 gap-2 items-center bg-white border border-gray-200 rounded-lg p-2"
          >
            <div className="col-span-3">
              <input
                className="w-full border border-gray-300 rounded px-2 py-1"
                placeholder="Indicator name"
                value={r.name}
                onChange={(e) =>
                  setIndRows((l) => l.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))
                }
              />
              {r.fromRegistry && (
                <div className="text-[11px] text-gray-400 mt-1">from registry: {r.fromRegistry}</div>
              )}
            </div>

            <div className="col-span-2">
              <select
                className="w-full border border-gray-300 rounded px-2 py-1"
                value={r.type}
                onChange={(e) =>
                  setIndRows((l) => l.map((x) => (x.id === r.id ? { ...x, type: Number(e.target.value) as 0 | 1 } : x)))
                }
              >
                {INDICATOR_TYPE_OPTIONS.map(o => (
                  <option key={o.v} value={o.v}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <select
                className="w-full border border-gray-300 rounded px-2 py-1"
                value={r.unit}
                onChange={(e) =>
                  setIndRows((l) => l.map((x) => (x.id === r.id ? { ...x, unit: Number(e.target.value) as 0|1|2 } : x)))
                }
              >
                {INDICATOR_UNIT_OPTIONS.map(o => (
                  <option key={o.v} value={o.v}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <select
                className="w-full border border-gray-300 rounded px-2 py-1"
                value={r.frequencyOfMeasurement}
                onChange={(e) =>
                  setIndRows((l) =>
                    l.map((x) => (x.id === r.id ? { ...x, frequencyOfMeasurement: Number(e.target.value) as any } : x))
                  )
                }
              >
                {MEASUREMENT_FREQ_OPTIONS.map(o => (
                  <option key={o.v} value={o.v}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <input
                type="number"
                className="w-full border border-gray-300 rounded px-2 py-1"
                value={r.baseline}
                onChange={(e) =>
                  setIndRows((l) =>
                    l.map((x) =>
                      x.id === r.id ? { ...x, baseline: e.target.value === '' ? '' : Number(e.target.value) } : x
                    )
                  )
                }
                placeholder="0"
              />
            </div>

            <div className="col-span-1">
              <input
                type="number"
                className="w-full border border-gray-300 rounded px-2 py-1"
                value={r.target}
                onChange={(e) =>
                  setIndRows((l) =>
                    l.map((x) =>
                      x.id === r.id ? { ...x, target: e.target.value === '' ? '' : Number(e.target.value) } : x
                    )
                  )
                }
                placeholder="e.g., 80"
              />
            </div>

            <div className="col-span-12">
              <input
                className="w-full border border-gray-300 rounded px-2 py-1"
                placeholder="Description"
                value={r.description}
                onChange={(e) =>
                  setIndRows((l) => l.map((x) => (x.id === r.id ? { ...x, description: e.target.value } : x)))
                }
              />
            </div>

            <div className="col-span-12 text-right">
              <button
                onClick={() => setIndRows((l) => l.filter((x) => x.id !== r.id))}
                className="p-2 rounded hover:bg-red-50 text-red-600"
                title="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* =========================
     Data Collection Tab (forms only)
  ========================= */
  async function fetchKoboForms() {
    setFormsLoading(true);
    setFormsErr(null);
    try {
      const res = await fetch(`${API_BASE}/api/app/kobo-toolbox/forms`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const msg = await readErrMsg(res);
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as any[];
      const list: KoboForm[] = Array.isArray(data)
        ? data.map((x) => ({ uid: x?.uid, name: x?.name })).filter((x) => x.uid && x.name)
        : [];
      setForms(list);
      // اختياري: تحديد أول نموذج افتراضيًا
      // setSelectedFormUid(list[0]?.uid || '');
    } catch (e: any) {
      setFormsErr(e?.message || 'فشل جلب النماذج.');
    } finally {
      setFormsLoading(false);
    }
  }

  async function assignSelectedForm() {
    if (!createdProjectId) {
      setAssignMsg('المشروع غير مُنشأ بعد. ارجع للتبويب الأول وأنشئ المشروع.');
      return;
    }
    if (!selectedFormUid) {
      setAssignMsg('اختر نموذجًا أولًا.');
      return;
    }
    setAssigning(true);
    setAssignMsg(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/app/project/${encodeURIComponent(createdProjectId)}/assign-form/${encodeURIComponent(selectedFormUid)}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      if (!res.ok) {
        const msg = await readErrMsg(res);
        throw new Error(msg);
      }
      setAssignMsg('تم ربط النموذج بالمشروع بنجاح.');
    } catch (e: any) {
      setAssignMsg(e?.message || 'فشل ربط النموذج بالمشروع.');
    } finally {
      setAssigning(false);
    }
  }

  // اجلب النماذج عند الدخول لأول مرة إلى تبويب Data Collection
  useEffect(() => {
    if (step === 3 && forms.length === 0 && !formsLoading) {
      fetchKoboForms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const DataTab = (
    <div className="space-y-4">
      {createdProjectId ? (
        <div className="rounded-lg border border-green-300 bg-green-50 text-green-800 p-3 text-sm">
          Project ID: <b>{createdProjectId}</b>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-800 p-3 text-sm">
          لم يتم إنشاء المشروع بعد. ارجع إلى تبويب Overview واضغط Next.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-gray-700">اختر النموذج (Form) المراد ربطه بالمشروع:</div>
        <button
          type="button"
          onClick={fetchKoboForms}
          className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
          disabled={formsLoading}
        >
          {formsLoading ? 'جارٍ التحديث…' : 'تحديث القائمة'}
        </button>
      </div>

      {formsErr && (
        <div className="rounded-lg border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
          {formsErr}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {formsLoading && (
          <div className="p-4 text-sm text-gray-600">جارٍ تحميل النماذج…</div>
        )}

        {!formsLoading && forms.length === 0 && !formsErr && (
          <div className="p-4 text-sm text-gray-600">لا توجد نماذج متاحة حالياً.</div>
        )}

        {!formsLoading && forms.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {forms.map((f) => (
              <li key={f.uid} className="flex items-center justify-between p-3">
                <span className="text-gray-900">{f.name}</span>
                <input
                  type="radio"
                  name="kobo-form"
                  className="h-4 w-4"
                  checked={selectedFormUid === f.uid}
                  onChange={() => setSelectedFormUid(f.uid)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {assignMsg && (
        <div
          className={`rounded-lg p-3 text-sm ${
            assignMsg.toLowerCase().includes('فشل') || assignMsg.toLowerCase().includes('خطأ') || assignMsg.toLowerCase().includes('error')
              ? 'border-red-300 bg-red-50 text-red-800'
              : 'border-green-300 bg-green-50 text-green-800'
          }`}
        >
          {assignMsg}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={assignSelectedForm}
          disabled={!createdProjectId || !selectedFormUid || assigning}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {assigning ? 'جارٍ الربط…' : 'ربط النموذج بالمشروع'}
        </button>
      </div>
    </div>
  );

  /* =========================
     UI
  ========================= */
  const canCreate = useMemo(() => {
    return (
      formData.projectName.trim() &&
      formData.startDate &&
      formData.endDate &&
      formData.primaryManager
    );
  }, [formData]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create project</h1>
        <p className="text-gray-600">Set up basics now; you can complete details after creating a draft.</p>
      </div>

      <Tabs step={step} setStep={setStep} />

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        {step === 0 && OverviewTab}
        {step === 1 && ToCTab}
        {step === 2 && IndicatorsTab}
        {step === 3 && DataTab}

        <div className="flex justify-between pt-6 mt-6 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
            >
              <Save size={16} />
              Save as Draft
            </button>
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={back}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={next}
                disabled={
                  step === 0
                    ? (creating || !canCreate)
                    : step === 1
                      ? (savingLogframe || !createdProjectId)
                      : step === 2
                        ? (savingIndicators || !createdProjectId)
                        : false
                }
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                {step === 0
                  ? (creating ? 'Creating…' : 'Next')
                  : step === 1
                    ? (savingLogframe ? 'Saving Logframe…' : 'Next')
                    : step === 2
                      ? (savingIndicators ? 'Saving Indicators…' : 'Next')
                      : 'Next'}
                <ArrowRight size={16} />
              </button>
            ) : (
              <button>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
