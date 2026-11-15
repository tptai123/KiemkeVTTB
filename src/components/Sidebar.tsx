import React from 'react';
import {
  ClipboardList,
  Wrench,
  PackagePlus,
  Users,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  activeModule: 'inventory' | 'dcdn' | 'surplus' | 'users' | 'permissions';
  setActiveModule: (module: 'inventory' | 'dcdn' | 'surplus' | 'users' | 'permissions') => void;
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
  setIsCollapsed,
}) => {
  const menuItems = [
    {
      id: 'inventory' as const,
      label: 'Kiểm kê VTTB',
      icon: ClipboardList,
    },
    {
      id: 'dcdn' as const,
      label: 'Kiểm kê DCĐN',
      icon: Wrench,
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

  const logoUrl =
    'https://izangkbanoxeivphmwyc.supabase.co/storage/v1/object/public/File%20all/logo_webapp.png';

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
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20 overflow-visible' : 'w-64 overflow-x-hidden'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Header / Logo */}
        <div className="h-16 px-3.5 border-b border-slate-100 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden animate-fade-in mx-auto lg:mx-0">
              <img
                src={logoUrl}
                alt="Logo ứng dụng"
                className="w-12 h-12 rounded-xl object-contain shrink-0 drop-shadow-xs"
              />
              <div className="truncate">
                <h1 className="font-extrabold text-base text-slate-900 tracking-tight leading-tight">
                  KIỂM KÊ VTTB
                </h1>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Hệ thống quản lý
                </span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="mx-auto flex items-center justify-center">
              <img
                src={logoUrl}
                alt="Logo ứng dụng"
                className="w-12 h-12 rounded-xl object-contain drop-shadow-xs"
              />
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div
          className={`flex-1 py-4 px-3 space-y-1.5 ${
            isCollapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'
          }`}
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => {
                    setActiveModule(item.id);
                    // Tự động đóng/thu gọn thanh sidebar khi chọn module
                    setIsMobileOpen(false);
                    setIsCollapsed(true);
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
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
                  {!isCollapsed && (
                    <span className="text-sm truncate font-bold">{item.label}</span>
                  )}
                </button>

                {/* Tooltip on collapse with smooth animation & arrow pointer */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 scale-95 -translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap z-50 flex items-center">
                    {/* Left arrow pointer */}
                    <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                    <span className="relative z-10">{item.label}</span>
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
