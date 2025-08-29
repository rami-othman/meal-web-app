import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';
import { Project } from '../types';
import {API_BASE} from "../lib/api";

// ================== API ==================
// const API_BASE = 'https://192.168.1.169:7012';
const FINISHED_URL = `${API_BASE}/api/app/project/finished-list`;

// الحالات المسموح عرضها في الأرشيف: 4=Completed, 5=Cancelled
function toArchiveStatus(
  s: number | null | undefined
): 'completed' | 'cancelled' | 'unknown' {
  const map: Record<number, 'completed' | 'cancelled'> = {
    4: 'completed',
    5: 'cancelled',
  };
  if (s == null) return 'unknown';
  return map[s] ?? 'unknown';
}

async function safeJson(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Unexpected response (${ct}). ${text.slice(0, 180)}`);
  }
  return res.json();
}

function getYear(d?: string | null) {
  if (!d) return null;
  const x = new Date(d);
  if (isNaN(x.getTime())) return null;
  return x.getFullYear();
}

type ProjectForCard = Project & {
  status: string | number | null;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  lastModificationTime?: string | null;
  creationTime?: string | null;
  code?: string | null;
};

// onOpenProject إلزامية لفتح صفحة التفاصيل بدون أخطاء
type ArchivePageProps = {
  onOpenProject: (id: string) => void;
};

export function ArchivePage({ onOpenProject }: ArchivePageProps) {
  const [statusFilter, setStatusFilter] =
    useState<'all' | 'completed' | 'cancelled'>('all');
  const [yearFilter, setYearFilter] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<'end-date' | 'name'>('end-date');

  const [projects, setProjects] = useState<ProjectForCard[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token =
          localStorage.getItem('access_token') ||
          sessionStorage.getItem('access_token');
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(FINISHED_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);

        const data = await safeJson(res);
        const items: any[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

        const normalized: ProjectForCard[] = items.map((p) => ({
          id: p.id,
          name: p.name ?? '',
          description: p.description ?? '',
          status: toArchiveStatus(p.status),
          startDate: p.startDate ?? null,
          endDate: p.endDate ?? null,
          location: p.location ?? '',
          lastModificationTime: p.lastModificationTime ?? null,
          creationTime: p.creationTime ?? null,
          code: p.code ?? '',
        }));

        if (!mounted) return;
        setProjects(normalized);

        // بناء سنوات الفلترة من start/end
        const ys = new Set<string>();
        normalized.forEach((pr) => {
          const y = getYear(pr.endDate) ?? getYear(pr.startDate);
          if (y) ys.add(String(y));
        });
        setYears(Array.from(ys).sort((a, b) => Number(b) - Number(a)));
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load archive');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const archivedProjects = useMemo(() => {
    let list = projects.slice();

    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (yearFilter !== 'all') {
      list = list.filter((p) => {
        const y = getYear(p.endDate) ?? getYear(p.startDate);
        return y ? String(y) === yearFilter : false;
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0;
      const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0;
      return bEnd - aEnd;
    });

    return list;
  }, [projects, statusFilter, yearFilter, sortBy]);

  const handleExportCSV = () => {
    const rows = [
      ['Name', 'Status', 'Start Date', 'End Date', 'Location', 'Last Refresh'],
      ...archivedProjects.map((p) => [
        p.name,
        String(p.status ?? ''),
        p.startDate ?? '',
        p.endDate ?? '',
        p.location ?? '',
        (p.lastModificationTime ?? p.creationTime ?? '') as string,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'archive.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Open فقط: يفتح تفاصيل المشروع عبر onOpenProject
  const open = (project: Project) => onOpenProject(project.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Archive</h1>
          <p className="text-gray-600 mt-1">Finished projects</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="end-date">End Date</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {archivedProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project as unknown as Project}
            showActions
            onOpen={open}
          />
        ))}
      </div>

      {/* States */}
      {loading && <div className="text-center text-sm text-gray-500">Loading…</div>}
      {error && <div className="text-center text-red-600">{error}</div>}
      {!loading && !error && archivedProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No archived projects found</div>
          <p className="text-gray-400 mt-2">Try adjusting your filter criteria</p>
        </div>
      )}
    </div>
  );
}
