import React from 'react';
import {
  ClipboardList,
  PackagePlus,
  Users,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  activeModule: 'inventory' | 'surplus' | 'users' | 'permissions';
  setActiveModule: (module: 'inventory' | 'surplus' | 'users' | 'permissions') => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  setActiveModule,
  isCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const menuItems = [
    {
      id: 'inventory' as const,
      label: 'Kiểm kê VTTB',
      icon: ClipboardList,
    },
    {
      id: 'surplus' as const,
      label: 'Hàng dư',
      icon: PackagePlus,
    },
    {
      id: 'users' as const,
      label: 'User',
      icon: Users,
    },
    {
      id: 'permissions' as const,
      label: 'Phân quyền',
      icon: Shield,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out overflow-x-hidden ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Header / Logo */}
        <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden animate-fade-in mx-auto lg:mx-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/25 text-white font-bold text-base shrink-0">
                KK
              </div>
              <div className="truncate">
                <h1 className="font-bold text-base text-slate-900 tracking-tight leading-tight">KIỂM KÊ VTTB</h1>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="mx-auto">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/25 text-white font-bold text-base">
                KK
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => {
                    setActiveModule(item.id);
                    setIsMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold'
                      : 'text-slate-900 font-bold hover:bg-slate-100'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-900 font-bold'
                    }`}
                  />
                  {!isCollapsed && <span className="text-sm truncate font-bold">{item.label}</span>}
                </button>

                {/* Tooltip on collapse */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};
