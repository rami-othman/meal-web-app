// src/components/Sidebar.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Home,
  Plus,
  MessageSquare,
  Users,
  Archive,
  Menu,
  X,
  Bell,
  LogOut,
  Info,
  CheckCircle,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { Page } from '../types';
import { API_BASE, apiFetch } from '../lib/api';

interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  time?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  read?: boolean;
}

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  isOpen: boolean;
  onToggle: () => void;

  /** اختياري: إشعارات مبدئية من المكوّن الأب */
  notifications?: NotificationItem[];
  onLogout?: () => void;
}

const navigationItems = [
  { id: 'home' as Page, label: 'Home', icon: Home },
  { id: 'new-project' as Page, label: 'New Project', icon: Plus },
  { id: 'feedback' as Page, label: 'Feedback', icon: MessageSquare },
  { id: 'user-management' as Page, label: 'User Management', icon: Users },
  { id: 'archive' as Page, label: 'Archive', icon: Archive },
];

export function Sidebar({
  currentPage,
  onPageChange,
  isOpen,
  onToggle,
  notifications: initialNotifications = [],
  onLogout,
}: SidebarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [askLogout, setAskLogout] = useState(false);

  // ===== Notifications (fetch from API) =====
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialNotifications
  );
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [notifErr, setNotifErr] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  async function loadNotifications() {
    setLoadingNotif(true);
    setNotifErr(null);
    try {
      const res = await apiFetch(`${API_BASE}/api/app/notification`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      const mapped: NotificationItem[] = items.map(
        (it: any, idx: number): NotificationItem => ({
          id: `api-${idx}-${it?.title ?? ''}-${it?.body ?? ''}`,
          title: it?.title ?? 'إشعار',
          body: it?.body ?? '',
          type: 'info',
          read: false,
        })
      );
      setNotifications(mapped);
      loadedOnce.current = true;
    } catch (e: any) {
      setNotifErr(e?.message || 'Failed to load notifications');
    } finally {
      setLoadingNotif(false);
    }
  }

  // افتح القائمة لأول مرة ⇒ اجلب الإشعارات
  useEffect(() => {
    if (notifOpen && !loadedOnce.current) {
      loadNotifications();
    }
  }, [notifOpen]);

  const notifIcon = (type?: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="shrink-0" />;
      case 'warning':
      case 'error':
        return <AlertCircle size={16} className="shrink-0" />;
      default:
        return <Info size={16} className="shrink-0" />;
    }
  };

  // Logout داخل نفس الصفحة (يمسح التوكنات ويحوّل للصفحة الرئيسية)
  const doPureFrontendLogout = () => {
    const keys = ['access_token', 'refresh_token', 'id_token', 'token'];
    keys.forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    onLogout?.();
    window.location.replace('/');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          w-[88vw] max-w-[320px] lg:w-64
          bg-gray-800 text-white
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          shadow-2xl lg:shadow-none
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold leading-tight">
              Project
              <br />
              Dashboard
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Notifications"
                  className="p-2 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 relative"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -left-1 bg-purple-500 text-white text-[10px] leading-4 px-1.5 rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown (RTL) */}
                {notifOpen && (
                  <div
                    dir="rtl"
                    className="absolute left-0 mt-2 w-[24rem] max-w-[92vw] bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 text-right"
                    onMouseLeave={() => setNotifOpen(false)}
                  >
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                      <div className="font-medium">الإشعارات</div>
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <button
                          type="button"
                          onClick={loadNotifications}
                          disabled={loadingNotif}
                          className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
                          title="تحديث"
                        >
                          {loadingNotif ? 'جاري التحديث…' : 'تحديث'}
                          <RotateCw size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotifOpen(false)}
                          className="text-sm text-purple-600 hover:text-purple-700"
                          title="إغلاق"
                        >
                          إغلاق
                        </button>
                      </div>
                    </div>

                    {notifErr && (
                      <div className="px-4 py-3 text-sm text-red-600">
                        {notifErr}
                      </div>
                    )}

                    {notifications.length === 0 && !loadingNotif ? (
                      <div className="px-4 py-6 text-sm text-gray-500">
                        لا يوجد إشعارات
                      </div>
                    ) : (
                      <ul className="max-h-96 overflow-auto divide-y">
                        {notifications.map((n) => (
                          <li key={n.id} className="px-4 py-3 relative">
                            {/* شريط تمييز على اليمين */}
                            <span className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-indigo-500" />
                            <div className="flex items-start gap-3 flex-row-reverse">
                              <span
                                className={`mt-0.5 ${
                                  n.type === 'success'
                                    ? 'text-green-600'
                                    : n.type === 'warning' || n.type === 'error'
                                    ? 'text-amber-600'
                                    : 'text-gray-500'
                                }`}
                              >
                                {notifIcon(n.type)}
                              </span>

                              <div className="min-w-0">
                                <div className="text-sm font-semibold leading-5 break-words">
                                  {n.title}
                                </div>
                                {n.body && (
                                  <p className="mt-1 text-[13px] leading-6 text-gray-700 break-words">
                                    {n.body}
                                  </p>
                                )}
                                {n.time && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    {n.time}
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Close (mobile) */}
              <button
                type="button"
                onClick={onToggle}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-700 transition-colors"
                aria-label="Close sidebar"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Nav (scrollable) */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPageChange(item.id);
                      if (window.innerWidth < 1024) onToggle();
                    }}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg',
                      'transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/40',
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white',
                    ].join(' ')}
                  >
                    <Icon size={18} />
                    <span className="text-[15px]">{item.label}</span>
                  </button>
                </li>
              );
            })}

            {/* Divider */}
            <li aria-hidden className="my-2">
              <div className="h-px bg-white/10 mx-4" />
            </li>

            {/* Logout داخل نفس القائمة */}
            <li>
              <button
                type="button"
                onClick={() => setAskLogout(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-300 hover:text-white hover:bg-red-600/20 transition-colors"
              >
                <LogOut size={18} />
                <span className="text-[15px]">Log out</span>
              </button>
            </li>
          </ul>
        </nav>

        {/* تأكيد تسجيل الخروج (داخل نفس الصفحة) */}
        {askLogout && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white text-gray-900 rounded-xl shadow-xl border">
              <div className="px-5 py-4 border-b">
                <div className="font-semibold">Confirm logout</div>
              </div>
              <div className="px-5 py-4 text-sm">
                Are you sure you want to log out?
              </div>
              <div className="px-5 py-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAskLogout(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={doPureFrontendLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={onToggle}
        className="fixed top-4 left-4 z-40 lg:hidden bg-gray-800 text-white p-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
        aria-label="Open sidebar"
      >
        <Menu size={18} />
      </button>
    </>
  );
}
