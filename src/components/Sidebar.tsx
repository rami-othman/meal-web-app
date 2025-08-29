import React, { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { Page } from '../types';

interface NotificationItem {
  id: string;
  title: string;
  time?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  read?: boolean;
}

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  isOpen: boolean;
  onToggle: () => void;

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
  notifications = [],
  onLogout,
}: SidebarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [askLogout, setAskLogout] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

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
    // لو بدك ترجع للّوجن بدل الرئيسية غير السطر التالي إلى '/login'
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
              Project<br/>Dashboard
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
                    <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] leading-4 px-1.5 rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div
                    className="absolute right-0 mt-2 w-[22rem] max-w-[90vw] bg-white text-gray-900 rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
                    onMouseLeave={() => setNotifOpen(false)}
                  >
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                      <div className="font-medium">Notifications</div>
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="text-sm text-purple-600 hover:text-purple-700"
                      >
                        Close
                      </button>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-gray-500">
                        No notifications
                      </div>
                    ) : (
                      <ul className="max-h-80 overflow-auto divide-y">
                        {notifications.map((n) => (
                          <li
                            key={n.id}
                            className={`px-4 py-3 ${!n.read ? 'bg-purple-50/40' : ''}`}
                          >
                            <div className="flex items-start gap-3">
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
                                <div className="text-sm font-medium truncate">{n.title}</div>
                                {n.time && (
                                  <div className="text-xs text-gray-500 mt-0.5">{n.time}</div>
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
