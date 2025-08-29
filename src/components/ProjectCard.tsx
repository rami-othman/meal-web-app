import React from 'react';
import { Calendar, RefreshCw, MapPin } from 'lucide-react';
import { Project } from '../types';
import { StatusBadge } from './StatusBadge';

interface ProjectCardProps {
  project: Project;
  showActions?: boolean;
  onOpen?: (project: Project) => void;
  onRestore?: (project: Project) => void;
  onView?: (project: Project) => void;
}

// دالة تنسيق تاريخ تتحمّل غياب المنطقة الزمنية في السلسلة
function fmtDate(d?: string | null) {
  if (!d) return '—';
  // لو التاريخ بدون Z أو offset، أضف Z كـ UTC
  const needsZ =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(d) && !/[Z+\-]\d{2}:?\d{2}$/.test(d);
  const iso = needsZ ? d + 'Z' : d;
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString() + ', ' + dt.toLocaleTimeString();
}

export function ProjectCard({
  project,
  showActions = true,
  onOpen,
  onRestore,
  onView,
}: ProjectCardProps) {
  // Last refresh: استخدم الحقل الجاهز إن وُجد، وإلا من آخر تعديل ثم الإنشاء
  const lastRefresh =
    (project as any).lastRefresh ??
    (project as any).lastModificationTime ??
    (project as any).creationTime ??
    null;

  // التواريخ والموقع (مطلوب ربطها من API)
  const startDate = (project as any).startDate ?? null;
  const endDate = (project as any).endDate ?? null;
  const location = (project as any).location ?? (project as any).country ?? null; // احتياطيًا لو كنت تستخدم country

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div>
          {project.code && (
            <div className="text-sm font-medium text-gray-500 mb-1">{project.code}</div>
          )}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
          {/* شارة الحالة */}
          {project.status != null && <StatusBadge status={project.status} />}
        </div>
      </div>

      <div className="space-y-3">
        {/* Last refresh */}
        {lastRefresh && (
          <div className="flex items-center text-sm text-gray-600">
            <RefreshCw size={14} className="mr-2 text-gray-400" />
            <span>Last refresh: {fmtDate(lastRefresh)}</span>
          </div>
        )}

        {/* Start — End */}
        <div className="flex items-center text-sm text-gray-600">
          <Calendar size={14} className="mr-2 text-gray-400" />
          <span>
            {fmtDate(startDate)} — {fmtDate(endDate)}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center text-sm text-gray-600">
          <MapPin size={14} className="mr-2 text-gray-400" />
          <span className="font-medium">Location:</span>
          <span className="ml-1">{location || '—'}</span>
        </div>

        {/* الحقول الاختيارية السابقة (لو موجودة عندك) */}
        {(project as any).sector && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Sector:</span> {(project as any).sector}
          </div>
        )}

        {(project as any).tags && Array.isArray((project as any).tags) && (project as any).tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(project as any).tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {showActions && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
          {onOpen && (
            <button
              onClick={() => onOpen(project)}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex-1"
            >
              Open
            </button>
          )}

          {onView && (
            <button
              onClick={() => onView(project)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              View
            </button>
          )}

          {onRestore && (
            <button
              onClick={() => onRestore(project)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Restore
            </button>
          )}
        </div>
      )}
    </div>
  );
}
