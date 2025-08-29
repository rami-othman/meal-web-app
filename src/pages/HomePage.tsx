import React, { useState, useMemo, useEffect } from 'react';
import { ProjectCard } from '../components/ProjectCard';
import { SearchBar } from '../components/SearchBar';
import { Pagination } from '../components/Pagination';
import { Project } from '../types';

import {API_BASE} from "../lib/api";

type HomePageProps = {
  onOpenProject?: (id: string) => void;
};

// const API_BASE = 'https://192.168.1.169:7012';
const PROJECTS_URL = `${API_BASE}/api/app/project`;

// تحويل الحالة الرقمية إلى نص قابل للعرض/البحث (بدون 0)
function statusToLabel(s: number | null | undefined): string {
  const map: Record<number, string> = {
    1: 'Planned',
    2: 'Active',
    3: 'OnHold',
    4: 'Completed',
    5: 'Cancelled',
  };
  return s == null ? 'unknown' : (map[s] ?? `status-${s}`);
}

// حارس JSON آمن
async function safeJson(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error(
      `Unexpected response type (${ct}). Body preview: ${text.slice(0, 180)}`
    );
  }
  return res.json();
}

// نوع داخلي لعرض البطاقة
type ProjectForCard = Project & {
  lastRefresh?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  code?: string | null;
};

export function HomePage({ onOpenProject }: HomePageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [projects, setProjects] = useState<ProjectForCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage = 6;

  useEffect(() => {
    const controller = new AbortController();

    const fetchAllProjects = async () => {
      setLoading(true);
      setError(null);

      try {
        const token =
          localStorage.getItem('access_token') ||
          sessionStorage.getItem('access_token');

        if (!token) {
          throw new Error('Not authenticated. Please sign in first.');
        }

        // نجمع جميع الصفحات عبر SkipCount/MaxResultCount (نمط ABP)
        const PAGE_SIZE = 50; // يكفي لتجميع أكثر من 15
        let skip = 0;
        let total = Number.POSITIVE_INFINITY;
        const all: any[] = [];

        while (skip < total) {
          const url = `${PROJECTS_URL}?SkipCount=${skip}&MaxResultCount=${PAGE_SIZE}`;
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            signal: controller.signal,
          });

          if (!res.ok) {
            let msg = `Error ${res.status}`;
            try {
              const body = await safeJson(res);
              if (body?.error) msg = `${msg}: ${body.error}`;
              else if (body?.message) msg = `${msg}: ${body.message}`;
            } catch { /* ignore */ }
            throw new Error(msg);
          }

          const data = await safeJson(res);
          const items: any[] = Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
            ? data
            : [];

          // لو الـ API أرجع totalCount نستعمله؛ وإلا نعتمد على المتوفر
          total =
            typeof data?.totalCount === 'number'
              ? data.totalCount
              : skip + items.length;

          all.push(...items);

          if (items.length < PAGE_SIZE) break; // وصلنا للنهاية
          skip += items.length;
        }

        const normalized: ProjectForCard[] = all.map((p) => {
          const lastRefresh: string | null =
            p.lastModificationTime ?? p.creationTime ?? null;

          return {
            id: p.id,
            name: p.name ?? '',
            code: p.code ?? '',
            description: p.description ?? '',
            status: statusToLabel(p.status),
            startDate: p.startDate ?? null,
            endDate: p.endDate ?? null,
            lastRefresh,
            ...(p.location ? { location: p.location } : {}),
          } as ProjectForCard;
        });

        setProjects(normalized);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err?.message || 'Failed to load projects');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAllProjects();
    return () => controller.abort();
  }, []);

  // فلترة المشاريع حسب البحث
  const filteredProjects = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return projects.filter((project) => {
      const fields = [
        project.name ?? '',
        project.code ?? '',
        project.description ?? '',
        (project.status as any) ?? '',
        (project as any).location ?? '',
      ];
      return fields.some((f) => f.toLowerCase().includes(q));
    });
  }, [projects, searchTerm]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProjects = filteredProjects.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleOpen = (project: ProjectForCard) => {
    if (onOpenProject) return onOpenProject(project.id);
    window.location.href = `/projects/${project.id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects Overview</h1>
          <p className="text-gray-600 mt-1">Manage and monitor your active projects</p>
        </div>
      </div>

      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setCurrentPage(1); // رجّع للصفحة الأولى عند تغيير البحث
        }}
        placeholder="Search projects..."
      />

      {loading && <div className="text-center">Loading projects...</div>}
      {error && (
        <div className="text-center text-red-600">
          Error: {error}
          <div className="mt-2 text-xs text-gray-500">
            تأكد من تسجيل الدخول (وجود access_token)، وتهيئة CORS، وأن المسار {PROJECTS_URL} صحيح.
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {currentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project as Project}
                onOpen={() => handleOpen(project)}
              />
            ))}
          </div>

          {currentProjects.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">No projects found</div>
              <p className="text-gray-400 mt-2">Try adjusting your search criteria</p>
            </div>
          )}

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
}
