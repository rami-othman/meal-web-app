// src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, useLocation } from 'react-router-dom';

import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { ArchivePage } from './pages/ArchivePage';
import { UserManagementPage } from './pages/UserManagementPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { CreateProjectPage } from './pages/CreateProjectPage';
import { Page } from './types';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import PublicFeedbackPage from './pages/PublicFeedbackPage';

// نوسّع نوع الصفحات الحالي بإضافة صفحة التفاصيل
type AppPage = Page | 'project-details';
type ListPage = 'home' | 'archive';

/** رابر يقرأ :projectId ومعامل ?admin=1 من الراوتر ويمرّرهم للصفحة العامة */
function PublicFeedbackRoute() {
  const { projectId } = useParams<{ projectId?: string }>();
  const location = useLocation();
  const admin = new URLSearchParams(location.search).get('admin') === '1';
  // لو ما في projectId نسمح بالـ Preview Mode
  return <PublicFeedbackPage projectId={projectId || undefined} admin={admin} />;
}

/** هذا هو الـ Shell للتطبيق الداخلي (الخاص) */
function PrivateAppShell() {
  const [currentPage, setCurrentPage] = useState<AppPage>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [returnPage, setReturnPage] = useState<ListPage>('home');

  useEffect(() => {
    const token =
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token');
    if (token) setIsLoggedIn(true);
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('id_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('id_token');
    setIsLoggedIn(false);
    setSelectedProjectId(null);
    setCurrentPage('home');
    setReturnPage('home');
  };

  const openFrom =
    (from: ListPage) =>
    (projectId: string) => {
      setReturnPage(from);
      setSelectedProjectId(projectId);
      setCurrentPage('project-details');
    };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onOpenProject={openFrom('home')} />;
      case 'archive':
        return <ArchivePage onOpenProject={openFrom('archive')} />;
      case 'user-management':
        return <UserManagementPage />;
      case 'feedback':
        return <FeedbackPage />;
      case 'new-project':
        return <CreateProjectPage />;
      case 'project-details':
        if (!selectedProjectId) {
          return (
            <div className="rounded-xl border bg-white p-6 text-center text-slate-600">
              No project selected.
            </div>
          );
        }
        return (
          <ProjectDetailsPage
            projectId={selectedProjectId}
            onBack={() => setCurrentPage(returnPage)}
          />
        );
      default:
        return <HomePage onOpenProject={openFrom('home')} />;
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        currentPage={currentPage as Page}
        onPageChange={(p: Page) => {
          if (p === 'home' || p === 'archive') {
            setReturnPage(p);
          }
          setCurrentPage(p);
          setSelectedProjectId(null);
        }}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        // onLogout={handleLogout}
      />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">{renderCurrentPage()}</div>
      </main>
    </div>
  );
}

/**
 * الراوتر العام:
 * - /f            → صفحة الإدخال العامة (Preview إذا بدون ID)
 * - /f/:projectId → صفحة الإدخال العامة المرتبطة بمشروع
 * - غير ذلك       → التطبيق الداخلي (PrivateAppShell)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/f" element={<PublicFeedbackRoute />} />
        <Route path="/f/:projectId" element={<PublicFeedbackRoute />} />
        <Route path="*" element={<PrivateAppShell />} />
      </Routes>
    </BrowserRouter>
  );
}
