import React from 'react';
import { 
  Home, 
  Plus, 
  MessageSquare, 
  Users, 
  Archive,
  Menu,
  X
} from 'lucide-react';
import { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const navigationItems = [
  { id: 'home' as Page, label: 'Home', icon: Home },
  { id: 'new-project' as Page, label: 'New Project', icon: Plus },
  { id: 'feedback' as Page, label: 'Feedback', icon: MessageSquare },
  { id: 'user-management' as Page, label: 'User Management', icon: Users },
  { id: 'archive' as Page, label: 'Archive', icon: Archive },
];

export function Sidebar({ currentPage, onPageChange, isOpen, onToggle }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
     <div
  className={`
    fixed inset-y-0 left-0   /* يغطي من أعلى لأسفل الشاشة */
    bg-gray-800 text-white
    transition-transform duration-300 ease-in-out z-50
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    lg:translate-x-0 lg:static lg:z-auto
    w-screen lg:w-64         /* موبايل: عرض كامل الشاشة | ديسكتوب: 64 */
    max-w-full
    overflow-y-auto          /* لو المحتوى أطول يتسكرول داخل السايدبار */
    shadow-2xl lg:shadow-none
  `}
>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold">Project Dashboard</h1>
            <button
              onClick={onToggle}
              className="lg:hidden p-1 rounded hover:bg-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onPageChange(item.id);
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                    ${currentPage === item.id 
                      ? 'bg-gray-700 text-white' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-30 lg:hidden bg-gray-800 text-white p-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
      >
        <Menu size={20} />
      </button>
    </>
  );
}