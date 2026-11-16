import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, LogOut, User, Building, Mail, Shield, RefreshCw, Users } from 'lucide-react';
import { InventoryItem, UserInfo, CollaboratorPresence } from '../types';

interface HeaderProps {
  activeModule: 'inventory' | 'dcdn' | 'surplus' | 'users' | 'permissions';
  setIsMobileOpen: (open: boolean) => void;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  inventoryItems?: { bookQty: number; actualQty: number | null; notFound?: boolean; proposal?: string }[];
  onStatClick?: (filter: 'all' | 'audited' | 'pending' | 'discrepancy' | 'needed') => void;
  activeStatFilter?: string;
  currentUser?: UserInfo | null;
  onLogout?: () => void;
  onSync?: () => Promise<void> | void;
  isSyncing?: boolean;
  collaborators?: CollaboratorPresence[];
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  setIsMobileOpen,
  setIsCollapsed,
  inventoryItems = [],
  onStatClick,
  activeStatFilter = 'all',
  currentUser,
  onLogout,
  onSync,
  isSyncing = false,
  collaborators = [],
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const collabRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (collabRef.current && !collabRef.current.contains(event.target as Node)) {
        setIsCollaboratorsOpen(false);
      }
    };
    if (isDropdownOpen || isCollaboratorsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isCollaboratorsOpen]);

  const getModuleTitle = () => {
    switch (activeModule) {
      case 'inventory':
        return 'Kiểm kê VTTB';
      case 'dcdn':
        return 'Kiểm kê DCĐN';
      case 'surplus':
        return 'Hàng dư';
      case 'users':
        return 'User';
      case 'permissions':
        return 'Phân quyền';
      default:
        return '';
    }
  };

  // Calculate stats for inventory navbar — single-pass for loop (O(n) instead of 4×O(n))
  const stats = useMemo(() => {
    let audited = 0, pending = 0, discrepancy = 0, needed = 0;
    for (const i of inventoryItems) {
      const isAudited = i.actualQty !== null;
      const isNeeded = Boolean(i.notFound);
      const hasProposal = Boolean(i.proposal && i.proposal.trim() !== '');
      if (isAudited) audited++;
      if (!isAudited && !isNeeded) pending++;
      if (hasProposal) discrepancy++;
      if (isNeeded) needed++;
    }
    return { total: inventoryItems.length, audited, pending, discrepancy, needed };
  }, [inventoryItems]);
  const { total, audited, pending, discrepancy, needed } = stats;

  const displayName = currentUser?.name || 'Người dùng';
  const displayRole = currentUser?.role || 'Chuyên viên Kiểm kê';
  const avatarUrl =
    currentUser?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0284c7&color=fff`;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 lg:px-6 h-16 flex items-center justify-between shadow-2xs gap-3">
      {/* Left: Toggle & Title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="hidden lg:flex p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          aria-label="Thu gọn/Mở rộng sidebar"
          title="Thu gọn / Mở rộng"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">/</span>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight whitespace-nowrap">
            {getModuleTitle()}
          </h2>
        </div>
      </div>

      {/* Center: Compact Stat Cards centered in Navbar (Desktop) */}
      {(activeModule === 'inventory' || activeModule === 'dcdn') && onStatClick && (
        <div className="hidden lg:flex flex-1 items-center justify-center gap-2 min-w-0">
          <button
            onClick={() => onStatClick('all')}
            className={`flex items-center justify-center px-3.5 py-1.5 rounded-xl font-semibold border transition-all min-w-[105px] text-[14px] cursor-pointer ${
              activeStatFilter === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Tổng: {total}</span>
          </button>

          <button
            onClick={() => onStatClick('audited')}
            className={`flex items-center justify-center px-3.5 py-1.5 rounded-xl font-semibold border transition-all min-w-[120px] text-[14px] cursor-pointer ${
              activeStatFilter === 'audited'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span>Đã kiểm: {audited}</span>
          </button>

          <button
            onClick={() => onStatClick('pending')}
            className={`flex items-center justify-center px-3.5 py-1.5 rounded-xl font-semibold border transition-all min-w-[125px] text-[14px] cursor-pointer ${
              activeStatFilter === 'pending'
                ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <span>Chưa kiểm: {pending}</span>
          </button>

          <button
            onClick={() => onStatClick('discrepancy')}
            className={`flex items-center justify-center px-3.5 py-1.5 rounded-xl font-semibold border transition-all min-w-[150px] text-[14px] cursor-pointer ${
              activeStatFilter === 'discrepancy'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>Đề xuất xử lý: {discrepancy}</span>
          </button>

          <button
            onClick={() => onStatClick('needed')}
            className={`flex items-center justify-center px-3.5 py-1.5 rounded-xl font-semibold border transition-all min-w-[120px] text-[14px] cursor-pointer ${
              activeStatFilter === 'needed'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <span>Cần tìm: {needed}</span>
          </button>
        </div>
      )}

      {/* Right: Sync Button & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Nút Đồng bộ dữ liệu Supabase */}
        {onSync && (
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-600 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs group disabled:opacity-50"
            title="Đồng bộ lại dữ liệu mới nhất từ Supabase"
            aria-label="Đồng bộ dữ liệu"
          >
            <RefreshCw
              className={`w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors ${
                isSyncing ? 'animate-spin text-blue-600' : ''
              }`}
            />
            <span className="hidden md:inline">Đồng bộ</span>
          </button>
        )}

        {/* Online Collaborators indicator */}
        {collaborators && collaborators.length > 0 && (
          <div className="relative shrink-0" ref={collabRef}>
            <button
              type="button"
              onClick={() => setIsCollaboratorsOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Danh sách người dùng đang online trên hệ thống"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>{collaborators.length} online</span>
            </button>

            {isCollaboratorsOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2.5 z-50 animate-fade-in text-xs">
                <div className="font-semibold text-slate-800 px-1 py-1 mb-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Đang trực tuyến ({collaborators.length})
                  </span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                    Realtime
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 divide-y divide-slate-50">
                  {collaborators.map((c, i) => (
                    <div key={i} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 px-1">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 truncate">
                          {c.userName || c.userId}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {c.userRole || 'Thành viên'}
                        </div>
                      </div>
                      {c.editingItemCode ? (
                        <span className="shrink-0 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium max-w-[100px] truncate" title={`Đang sửa ${c.editingItemCode}`}>
                          Sửa {c.editingItemCode}
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded capitalize">
                          {c.activeModule || 'Online'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Profile (Họ và tên dòng trên, Vai trò dòng dưới) */}
        <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 focus:outline-hidden cursor-pointer group"
          title="Thông tin tài khoản"
        >
          {/* Avatar with active green dot */}
          <div className="relative shrink-0">
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full object-cover border-2 border-white shadow-xs group-hover:scale-105 transition-transform"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>

          {/* User Name & Role text block */}
          <div className="hidden sm:flex flex-col text-left max-w-[180px] min-w-[110px]">
            <span className="text-[13px] font-bold text-slate-800 truncate leading-tight group-hover:text-blue-600 transition-colors">
              {displayName}
            </span>
            <span className="text-[11px] font-medium text-slate-500 truncate leading-tight mt-0.5">
              {displayRole}
            </span>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
              isDropdownOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-fade-in divide-y divide-slate-100">
            {/* Header info */}
            <div className="px-3 py-2.5 mb-1">
              <div className="flex items-center gap-3">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-2xs"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">
                    {displayName}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md mt-0.5">
                    <Shield className="w-3 h-3" />
                    <span>{displayRole}</span>
                  </div>
                </div>
              </div>

              {currentUser?.email && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-600 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{currentUser.email}</span>
                </div>
              )}

              {currentUser?.department && (
                <div className="mt-1 text-xs text-slate-600 flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{currentUser.department}</span>
                </div>
              )}
            </div>

            {/* Logout button */}
            <div className="pt-1">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  if (onLogout) onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Đăng xuất khỏi hệ thống</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </header>
  );
};
