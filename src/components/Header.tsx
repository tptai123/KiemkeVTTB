import React, { useMemo } from 'react';
import { Menu } from 'lucide-react';
import { InventoryItem } from '../types';

interface HeaderProps {
  activeModule: 'inventory' | 'surplus' | 'users' | 'permissions';
  setIsMobileOpen: (open: boolean) => void;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  inventoryItems?: InventoryItem[];
  onStatClick?: (filter: 'all' | 'audited' | 'pending' | 'discrepancy' | 'needed') => void;
  activeStatFilter?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  setIsMobileOpen,
  setIsCollapsed,
  inventoryItems = [],
  onStatClick,
  activeStatFilter = 'all',
}) => {
  const getModuleTitle = () => {
    switch (activeModule) {
      case 'inventory':
        return 'Kiểm kê VTTB';
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

      {/* Center: Compact Stat Cards centered in Navbar */}
      {activeModule === 'inventory' && onStatClick && (
        <>
          <div className="hidden lg:flex flex-1 items-center justify-center gap-2 min-w-0">
            <button
              onClick={() => onStatClick('all')}
              className={`flex items-center justify-center px-3.5 py-1.5 rounded-xl font-semibold border transition-all min-w-[105px] text-[14px] ${
                activeStatFilter === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Tổng: {total}</span>
            </button>

            <button
              onClick={() => onStatClick('audited')}
              className={`flex items-center justify-center px-3.5 py-1.5 rounded-xl font-semibold border transition-all min-w-[120px] text-[14px] ${
                activeStatFilter === 'audited'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>Đã kiểm: {audited}</span>
            </button>

            <button
              onClick={() => onStatClick('pending')}
              className={`flex items-center justify-center px-3.5 py-1.5 rounded-xl font-semibold border transition-all min-w-[125px] text-[14px] ${
                activeStatFilter === 'pending'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                  : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <span>Chưa kiểm: {pending}</span>
            </button>

            <button
              onClick={() => onStatClick('discrepancy')}
              className={`flex items-center justify-center px-3.5 py-1.5 rounded-xl font-semibold border transition-all min-w-[150px] text-[14px] ${
                activeStatFilter === 'discrepancy'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>Đề xuất xử lý: {discrepancy}</span>
            </button>

            <button
              onClick={() => onStatClick('needed')}
              className={`flex items-center justify-center px-3.5 py-1.5 rounded-xl font-semibold border transition-all min-w-[120px] text-[14px] ${
                activeStatFilter === 'needed'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <span>Cần tìm: {needed}</span>
            </button>
          </div>
          <div className="hidden 2xl:block w-44 shrink-0" aria-hidden="true" />
        </>
      )}
    </header>
  );
};
