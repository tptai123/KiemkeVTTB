import React, { useState, useMemo, useRef, useEffect, useTransition } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Search,
  Box,
  ChevronDown,
  Check,
  MapPin,
  Download,
  Upload,
  X,
  FileText,
  Filter,
  MoreVertical,
  RotateCcw,
} from 'lucide-react';
import { InventoryItem, RolePermissions } from '../types';
import { ImageZoomModal } from './ImageZoomModal';

interface InventoryModuleProps {
  items: InventoryItem[];
  onEditItem: (item: InventoryItem) => void;
  statFilter: 'all' | 'audited' | 'pending' | 'discrepancy' | 'needed';
  onStatFilterChange?: (filter: 'all' | 'audited' | 'pending' | 'discrepancy' | 'needed') => void;
  onOpenImport: () => void;
  onExportExcel: () => void;
  userPermissions?: RolePermissions;
}

// Singleton formatter — created once at module scope, reused across all renders
const VN_FMT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 });

// Format numbers with thousand dot separator and comma decimal separator
export const formatVNNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) return '';
  return VN_FMT.format(num);
};

interface InventoryRowProps {
  item: InventoryItem;
  index: number;
  onEditItem: (item: InventoryItem) => void;
  onZoomImage: (item: InventoryItem) => void;
  measureRef: (node: HTMLTableRowElement | null) => void;
}

const InventoryRow = React.memo<InventoryRowProps>(
  ({ item, index, onEditItem, onZoomImage, measureRef }) => {
    const stt = index + 1;
    const hasActualQty = item.actualQty !== null;
    const hasProposal = Boolean(item.proposal && item.proposal.trim() !== '');
    const isNotFound = Boolean(item.notFound);

    let rowTextColor = 'text-slate-900';
    if (isNotFound) {
      rowTextColor = 'text-yellow-700';
    } else if (hasActualQty && !hasProposal) {
      rowTextColor = 'text-green-700';
    } else if (hasActualQty && hasProposal) {
      rowTextColor = 'text-red-600';
    }

    return (
      <tr
        ref={measureRef}
        data-index={index}
        onClick={() => onEditItem(item)}
        className={`hover:bg-sky-100/75 cursor-pointer transition-colors bg-white ${rowTextColor}`}
      >
        {/* Stt */}
        <td className="py-1.5 px-2 text-center font-normal border border-slate-200">
          {stt}
        </td>

        {/* Hình ảnh */}
        <td className="py-1.5 px-2 text-center border border-slate-200">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              decoding="async"
              onClick={(e) => {
                e.stopPropagation();
                onZoomImage(item);
              }}
              title="Nhấn để phóng to hình ảnh"
              className="w-11 h-8 object-contain mx-auto cursor-zoom-in rounded hover:opacity-80 transition-opacity"
            />
          ) : null}
        </td>

        {/* Mã vật tư */}
        <td className="py-1.5 px-2 text-left font-mono font-normal whitespace-nowrap border border-slate-200">
          {item.code}
        </td>

        {/* Tên vật tư */}
        <td className="py-1.5 px-3 text-left whitespace-normal break-words font-normal leading-snug border border-slate-200">
          {item.name}
        </td>

        {/* Đvt */}
        <td className="py-1.5 px-2 text-center font-normal whitespace-nowrap border border-slate-200">
          {item.unit}
        </td>

        {/* Kho */}
        <td
          className="py-1.5 px-2 text-center font-normal whitespace-nowrap truncate max-w-[96px] border border-slate-200"
          title={item.warehouse}
        >
          {item.warehouse || 'Kho chính'}
        </td>

        {/* Sl sổ sách */}
        <td className="py-1.5 px-2 text-right font-normal whitespace-nowrap pr-2.5 border border-slate-200">
          {formatVNNumber(item.bookQty)}
        </td>

        {/* Sl kiểm kê */}
        <td className="py-1.5 px-2 text-right font-normal whitespace-nowrap pr-2.5 border border-slate-200">
          {item.actualQty !== null ? formatVNNumber(item.actualQty) : ''}
        </td>

        {/* Vị trí */}
        <td
          className="py-1.5 px-2 text-left font-normal whitespace-normal break-words max-w-[145px] leading-snug border border-slate-200"
          title={item.location}
        >
          {item.location || ''}
        </td>

        {/* Đề xuất */}
        <td className="py-1.5 px-3 text-left font-normal whitespace-normal break-words leading-snug border border-slate-200">
          {item.proposal || ''}
        </td>

        {/* Ghi chú */}
        <td className="py-1.5 px-3 text-left font-normal whitespace-normal break-words max-w-xs leading-snug border border-slate-200">
          {item.notes || ''}
        </td>
      </tr>
    );
  }
);
InventoryRow.displayName = 'InventoryRow';

interface InventoryMobileCardProps {
  item: InventoryItem;
  index: number;
  onEditItem: (item: InventoryItem) => void;
  onZoomImage: (item: InventoryItem) => void;
  measureRef: (node: HTMLDivElement | null) => void;
}

const InventoryMobileCard = React.memo<InventoryMobileCardProps>(
  ({ item, index, onEditItem, onZoomImage, measureRef }) => {
    const hasActualQty = item.actualQty !== null;
    const hasProposal = Boolean(item.proposal && item.proposal.trim() !== '');
    const isNotFound = Boolean(item.notFound);

    let statusBadge = (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        Chưa kiểm
      </span>
    );
    let cardBorder = 'border-slate-200';
    let cardBg = 'bg-white';

    if (isNotFound) {
      statusBadge = (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
          Cần tìm
        </span>
      );
      cardBorder = 'border-yellow-300';
      cardBg = 'bg-yellow-50/20';
    } else if (hasActualQty && !hasProposal) {
      statusBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Check className="w-3 h-3" />
          Đã kiểm
        </span>
      );
      cardBorder = 'border-emerald-300';
      cardBg = 'bg-emerald-50/15';
    } else if (hasActualQty && hasProposal) {
      statusBadge = (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
          Đề xuất
        </span>
      );
      cardBorder = 'border-red-300';
      cardBg = 'bg-red-50/15';
    }

    // Xác định màu chữ cho SL kiểm so với SL tồn
    let actualQtyColorClass = 'text-slate-400 font-normal';
    let actualQtyText = 'Chưa kiểm';

    if (isNotFound) {
      actualQtyColorClass = 'text-amber-600 font-semibold';
      actualQtyText = 'Không tìm thấy';
    } else if (hasActualQty) {
      const actual = item.actualQty!;
      const book = item.bookQty;
      if (actual === book) {
        // SL kiểm = SL tồn: màu xanh lá (khớp)
        actualQtyColorClass = 'text-emerald-600 font-bold';
      } else if (actual < book) {
        // SL kiểm < SL tồn: màu đỏ (thiếu)
        actualQtyColorClass = 'text-red-600 font-bold';
      } else {
        // SL kiểm > SL tồn: màu xanh dương (thừa)
        actualQtyColorClass = 'text-blue-600 font-bold';
      }
      actualQtyText = formatVNNumber(actual);
    }

    return (
      <div
        ref={measureRef}
        data-index={index}
        onClick={() => onEditItem(item)}
        className={`p-3 rounded-2xl border ${cardBorder} ${cardBg} shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-[0.99] flex flex-col gap-2`}
      >
        {/* Hàng 1: Mã vật tư + Cột Kho (thay thế cho vị trí) & Trạng thái (Bỏ STT) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono font-bold text-xs sm:text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 truncate">
              {item.code}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[130px]"
              title={item.warehouse || 'Kho chính'}
            >
              <Box className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{item.warehouse || 'Kho chính'}</span>
            </span>
          </div>
          <div className="shrink-0">{statusBadge}</div>
        </div>

        {/* Hàng 2: Tên vật tư + Hình ảnh (Thumbnail bên phải) */}
        <div className="flex gap-2.5 items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
              {item.name}
            </h4>

            {/* Hàng ngang: SL tồn & SL kiểm nằm dưới tên vật tư, không đóng khung màu nền */}
            <div className="flex items-center gap-4 mt-1.5 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">SL tồn:</span>
                <span className="font-bold text-slate-800">
                  {formatVNNumber(item.bookQty)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">SL kiểm:</span>
                <span className={actualQtyColorClass}>
                  {actualQtyText}
                </span>
              </div>
            </div>

            {/* Dưới nữa là Trường Vị trí */}
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Vị trí:</span>
              <span className="font-medium text-slate-700 truncate">
                {item.location || 'Chưa xác định'}
              </span>
            </div>
          </div>

          {/* Thumbnail */}
          {item.image ? (
            <div
              className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0 relative flex items-center justify-center cursor-zoom-in hover:opacity-85 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onZoomImage(item);
              }}
              title="Chạm để phóng to ảnh"
            >
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain p-1"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl border border-dashed border-slate-200 bg-slate-50 shrink-0 flex items-center justify-center text-slate-300">
              <Box className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Chỉ hiển thị trường đề xuất khi có dữ liệu (bỏ ghi chú) */}
        {hasProposal && (
          <div className="flex items-center gap-1 text-xs pt-1 border-t border-slate-100">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-medium border border-red-100 text-[11px] truncate">
              <span className="text-slate-500">Đề xuất:</span>
              <b className="truncate">{item.proposal}</b>
            </span>
          </div>
        )}
      </div>
    );
  }
);
InventoryMobileCard.displayName = 'InventoryMobileCard';

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  items,
  onEditItem,
  statFilter,
  onStatFilterChange,
  onOpenImport,
  onExportExcel,
  userPermissions,
}) => {
  const canExcel = userPermissions ? userPermissions.canExcelInventory : true;
  // Screen size check for mobile layout
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filters state — desktop
  const [codeQuery, setCodeQuery] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [deferredCode, setDeferredCode] = useState('');
  const [deferredName, setDeferredName] = useState('');
  const [, startTransition] = useTransition();

  // Mobile unified search
  const [mobileSearch, setMobileSearch] = useState('');
  const [deferredMobileSearch, setDeferredMobileSearch] = useState('');

  // Mobile sheet states
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileActionMenuOpen, setIsMobileActionMenuOpen] = useState(false);
  const [isMobileLocationOpen, setIsMobileLocationOpen] = useState(false);
  const [isMobileProposalOpen, setIsMobileProposalOpen] = useState(false);
  const mobileActionMenuRef = useRef<HTMLDivElement>(null);
  const locationFilterSectionRef = useRef<HTMLDivElement>(null);
  const proposalFilterSectionRef = useRef<HTMLDivElement>(null);
  const sheetScrollContainerRef = useRef<HTMLDivElement>(null);

  const handleToggleMobileLocation = () => {
    setIsMobileLocationOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          locationFilterSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
      return next;
    });
  };

  const handleToggleMobileProposal = () => {
    setIsMobileProposalOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          proposalFilterSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
      return next;
    });
  };

  // Vị trí filter state
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');

  // Đề xuất filter state
  const [selectedProposals, setSelectedProposals] = useState<string[]>([]);
  const [isProposalDropdownOpen, setIsProposalDropdownOpen] = useState(false);
  const [proposalSearch, setProposalSearch] = useState('');

  // Image zoom modal state
  const [zoomImageItem, setZoomImageItem] = useState<InventoryItem | null>(null);

  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const proposalDropdownRef = useRef<HTMLDivElement>(null);
  // Scroll container ref for virtual table / mobile cards
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Calculate stats for mobile header chips
  const stats = useMemo(() => {
    let audited = 0, pending = 0, discrepancy = 0, needed = 0;
    for (const i of items) {
      const isAudited = i.actualQty !== null;
      const isNeeded = Boolean(i.notFound);
      const hasProposal = Boolean(i.proposal && i.proposal.trim() !== '');
      if (isAudited) audited++;
      if (!isAudited && !isNeeded) pending++;
      if (hasProposal) discrepancy++;
      if (isNeeded) needed++;
    }
    return { total: items.length, audited, pending, discrepancy, needed };
  }, [items]);

  // Extract unique locations from item.location
  const allLocations = useMemo(() => {
    const locs = new Set<string>();
    items.forEach((item) => {
      if (item.location && item.location.trim()) {
        locs.add(item.location.trim());
      }
    });
    return Array.from(locs);
  }, [items]);

  const filteredLocations = useMemo(
    () => allLocations.filter((loc) => loc.toLowerCase().includes(locationSearch.toLowerCase())),
    [allLocations, locationSearch]
  );

  // Extract unique proposals from item.proposal (cột Đề xuất)
  const allProposals = useMemo(() => {
    const props = new Set<string>();
    items.forEach((item) => {
      if (item.proposal && item.proposal.trim()) {
        props.add(item.proposal.trim());
      }
    });
    return Array.from(props);
  }, [items]);

  const filteredProposals = useMemo(
    () => allProposals.filter((prop) => prop.toLowerCase().includes(proposalSearch.toLowerCase())),
    [allProposals, proposalSearch]
  );

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
      if (proposalDropdownRef.current && !proposalDropdownRef.current.contains(e.target as Node)) {
        setIsProposalDropdownOpen(false);
      }
      if (mobileActionMenuRef.current && !mobileActionMenuRef.current.contains(e.target as Node)) {
        setIsMobileActionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pre-computed search index — avoids calling .toLowerCase() 20,000 times per keystroke
  const indexedItems = useMemo(
    () =>
      items.map((item) => ({
        item,
        codeLower: item.code.toLowerCase(),
        nameLower: item.name.toLowerCase(),
      })),
    [items]
  );

  // Filter items — uses deferred search values + Set for O(1) multi-select lookup
  const locationSet = useMemo(() => new Set(selectedLocations), [selectedLocations]);
  const proposalSet = useMemo(() => new Set(selectedProposals), [selectedProposals]);

  const filteredItems = useMemo(() => {
    const codeLower = deferredCode.toLowerCase();
    const nameLower = deferredName.toLowerCase();
    const mobileLower = deferredMobileSearch.toLowerCase().trim();
    const result: InventoryItem[] = [];

    for (const entry of indexedItems) {
      const { item } = entry;
      if (codeLower && !entry.codeLower.includes(codeLower)) continue;
      if (nameLower && !entry.nameLower.includes(nameLower)) continue;
      if (mobileLower) {
        const matchCode = entry.codeLower.includes(mobileLower);
        const matchName = entry.nameLower.includes(mobileLower);
        if (!matchCode && !matchName) continue;
      }
      if (locationSet.size > 0 && !locationSet.has(item.location)) continue;
      if (proposalSet.size > 0 && !(item.proposal && proposalSet.has(item.proposal.trim()))) {
        continue;
      }

      if (statFilter !== 'all') {
        const isAudited = item.actualQty !== null;
        const isNeeded = Boolean(item.notFound);
        const isPending = !isAudited && !isNeeded;
        const hasProposal = Boolean(item.proposal && item.proposal.trim() !== '');

        if (statFilter === 'audited' && !isAudited) continue;
        if (statFilter === 'pending' && !isPending) continue;
        if (statFilter === 'discrepancy' && !hasProposal) continue;
        if (statFilter === 'needed' && !isNeeded) continue;
      }

      result.push(item);
    }

    return result;
  }, [indexedItems, deferredCode, deferredName, deferredMobileSearch, locationSet, proposalSet, statFilter]);

  // Virtual items (adaptive row height for mobile vs desktop)
  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => (isMobile ? 142 : 48),
    overscan: isMobile ? 4 : 8,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  const toggleLocation = (loc: string) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const toggleProposal = (prop: string) => {
    setSelectedProposals((prev) =>
      prev.includes(prop) ? prev.filter((p) => p !== prop) : [...prev, prop]
    );
  };

  const activeFiltersCount =
    (statFilter !== 'all' ? 1 : 0) + selectedLocations.length + selectedProposals.length;

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-2 animate-fade-in text-slate-900 font-sans">
      {/* MOBILE TOOLBAR (Màn hình < 768px): Tối giản gọn gàng 1 hàng duy nhất */}
      <div className="md:hidden shrink-0 bg-white p-2.5 rounded-2xl shadow-2xs border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={mobileSearch}
              onChange={(e) => {
                const v = e.target.value;
                setMobileSearch(v);
                startTransition(() => setDeferredMobileSearch(v));
              }}
              placeholder="Tìm theo mã hoặc tên..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
            />
            {mobileSearch && (
              <button
                type="button"
                onClick={() => {
                  setMobileSearch('');
                  startTransition(() => setDeferredMobileSearch(''));
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 p-0.5 rounded-full hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Nút mở Bottom Sheet Bộ lọc */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className={`relative p-2 rounded-xl border flex items-center justify-center transition-colors shrink-0 ${
              activeFiltersCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Bộ lọc nâng cao"
            aria-label="Bộ lọc nâng cao"
          >
            <Filter className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Menu thao tác khác: Import / Xuất Excel */}
          {canExcel && (
            <div className="relative shrink-0" ref={mobileActionMenuRef}>
              <button
                type="button"
                onClick={() => setIsMobileActionMenuOpen((prev) => !prev)}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                title="Thao tác khác"
                aria-label="Thao tác khác"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {isMobileActionMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 divide-y divide-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileActionMenuOpen(false);
                      onOpenImport();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Import Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileActionMenuOpen(false);
                      onExportExcel();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4 text-emerald-700" />
                    <span>Xuất Excel</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP TOOLBAR (Màn hình >= 768px): Giữ nguyên 100% giao diện máy tính */}
      <div className="hidden md:block shrink-0 bg-white p-2 rounded-2xl shadow-2xs border border-slate-200">
        <div className="flex items-center gap-2 flex-nowrap">
          {/* Search by Code */}
          <div className="relative flex-1 min-w-[120px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={codeQuery}
              onChange={(e) => {
                const v = e.target.value;
                setCodeQuery(v);
                startTransition(() => setDeferredCode(v));
              }}
              placeholder="Tìm mã vật tư..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
            />
            {codeQuery && (
              <button
                type="button"
                onClick={() => { setCodeQuery(''); startTransition(() => setDeferredCode('')); }}
                title="Xóa lọc mã vật tư"
                aria-label="Xóa lọc mã vật tư"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 p-0.5 rounded-full hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search by Name */}
          <div className="relative flex-1 min-w-[130px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => {
                const v = e.target.value;
                setNameQuery(v);
                startTransition(() => setDeferredName(v));
              }}
              placeholder="Tìm tên vật tư..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
            />
            {nameQuery && (
              <button
                type="button"
                onClick={() => { setNameQuery(''); startTransition(() => setDeferredName('')); }}
                title="Xóa lọc tên vật tư"
                aria-label="Xóa lọc tên vật tư"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 p-0.5 rounded-full hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Location Multi-Select Dropdown */}
          <div className="relative w-36 xl:w-44 shrink-0" ref={locationDropdownRef}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsLocationDropdownOpen((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsLocationDropdownOpen((prev) => !prev);
                }
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">
                  {selectedLocations.length === 0
                    ? 'Tất cả vị trí'
                    : `Vị trí (${selectedLocations.length})`}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {selectedLocations.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLocations([]);
                    }}
                    title="Xóa lọc vị trí"
                    aria-label="Xóa lọc vị trí"
                    className="text-red-500 hover:text-red-700 p-0.5 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>

            {isLocationDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2.5 space-y-2 min-w-[240px]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    placeholder="Lọc nhanh vị trí..."
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                  {locationSearch && (
                    <button
                      type="button"
                      onClick={() => setLocationSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pt-1 no-scrollbar">
                  <div
                    onClick={() => setSelectedLocations([])}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] cursor-pointer ${
                      selectedLocations.length === 0
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>Tất cả vị trí</span>
                    {selectedLocations.length === 0 && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </div>

                  {filteredLocations.map((loc) => {
                    const isSelected = selectedLocations.includes(loc);
                    return (
                      <div
                        key={loc}
                        onClick={() => toggleLocation(loc)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{loc}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Proposal Multi-Select Dropdown */}
          <div className="relative w-36 xl:w-44 shrink-0" ref={proposalDropdownRef}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsProposalDropdownOpen((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsProposalDropdownOpen((prev) => !prev);
                }
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">
                  {selectedProposals.length === 0
                    ? 'Tất cả đề xuất'
                    : `Đề xuất (${selectedProposals.length})`}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {selectedProposals.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProposals([]);
                    }}
                    title="Xóa lọc đề xuất"
                    aria-label="Xóa lọc đề xuất"
                    className="text-red-500 hover:text-red-700 p-0.5 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>

            {isProposalDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2.5 space-y-2 min-w-[240px]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={proposalSearch}
                    onChange={(e) => setProposalSearch(e.target.value)}
                    placeholder="Lọc nhanh đề xuất..."
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                  {proposalSearch && (
                    <button
                      type="button"
                      onClick={() => setProposalSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pt-1 no-scrollbar">
                  <div
                    onClick={() => setSelectedProposals([])}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] cursor-pointer ${
                      selectedProposals.length === 0
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>Tất cả đề xuất</span>
                    {selectedProposals.length === 0 && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </div>

                  {filteredProposals.map((prop) => {
                    const isSelected = selectedProposals.includes(prop);
                    return (
                      <div
                        key={prop}
                        onClick={() => toggleProposal(prop)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{prop}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Buttons: Import Excel & Xuất Excel */}
          {canExcel && (
            <>
              <button
                type="button"
                onClick={onOpenImport}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-[14px] flex items-center justify-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap"
                title="Import danh sách từ file Excel"
              >
                <Upload className="w-4 h-4" />
                <span>Import Excel</span>
              </button>

              <button
                type="button"
                onClick={onExportExcel}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors text-[14px] flex items-center justify-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap"
                title="Xuất danh sách ra file Excel"
              >
                <Download className="w-4 h-4" />
                <span>Xuất Excel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* DATA PRESENTATION: Phủ phần diện tích còn lại */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 flex-1 min-h-0 overflow-hidden flex flex-col text-[14px]">
        <div
          className="overflow-x-auto overflow-y-auto flex-1 no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          ref={tableContainerRef}
        >
          {isMobile ? (
            /* GIAO DIỆN MOBILE: DANH SÁCH THẺ VẬT TƯ (CARD VIEW VIRTUALIZED) */
            filteredItems.length === 0 ? (
              <div className="py-16 text-center text-slate-500 px-4">
                <Box className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-sm text-slate-700">
                  Không tìm thấy vật tư thiết bị nào.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Vui lòng thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc.
                </p>
              </div>
            ) : (
              <div className="p-2 sm:p-3 space-y-2.5">
                {paddingTop > 0 && <div style={{ height: `${paddingTop}px` }} />}
                {virtualRows.map((virtualRow) => {
                  const item = filteredItems[virtualRow.index];
                  return (
                    <InventoryMobileCard
                      key={item.id}
                      item={item}
                      index={virtualRow.index}
                      onEditItem={onEditItem}
                      onZoomImage={setZoomImageItem}
                      measureRef={rowVirtualizer.measureElement}
                    />
                  );
                })}
                {paddingBottom > 0 && <div style={{ height: `${paddingBottom}px` }} />}
              </div>
            )
          ) : (
            /* GIAO DIỆN DESKTOP: BẢNG DỮ LIỆU ĐẦY ĐỦ 11 CỘT (TABLE VIEW) */
            <table className="w-full border-collapse border border-slate-200 text-[14px]">
              <thead>
                <tr className="sticky top-0 z-10 bg-slate-100 shadow-xs text-[14px]">
                  <th className="py-2 px-2 text-center text-slate-900 font-semibold w-12 whitespace-nowrap border border-slate-200">
                    Stt
                  </th>
                  <th className="py-2 px-2 text-center text-slate-900 font-semibold w-20 whitespace-nowrap border border-slate-200">
                    Hình ảnh
                  </th>
                  <th className="py-2 px-2 text-center text-slate-900 font-semibold w-[170px] whitespace-nowrap border border-slate-200">
                    Mã vật tư
                  </th>
                  <th className="py-2 px-3 text-center text-slate-900 font-semibold min-w-[260px] border border-slate-200">
                    Tên vật tư
                  </th>
                  <th className="py-2 px-2 text-center text-slate-900 font-semibold w-20 whitespace-nowrap border border-slate-200">
                    Đvt
                  </th>
                  <th className="py-2 px-2 text-center text-slate-900 font-semibold w-24 whitespace-nowrap border border-slate-200">
                    Kho
                  </th>
                  <th className="py-2 px-2 text-center text-slate-900 font-semibold w-24 whitespace-nowrap border border-slate-200">
                    Sl sổ sách
                  </th>
                  <th className="py-2 px-2 text-center text-slate-900 font-semibold w-24 whitespace-nowrap border border-slate-200">
                    Sl kiểm kê
                  </th>
                  <th className="py-2 px-2 text-center text-slate-900 font-semibold w-36 max-w-[145px] whitespace-nowrap border border-slate-200">
                    Vị trí
                  </th>
                  <th className="py-2 px-3 text-center text-slate-900 font-semibold min-w-[160px] border border-slate-200">
                    Đề xuất
                  </th>
                  <th className="py-2 px-3 text-center text-slate-900 font-semibold min-w-[180px] border border-slate-200">
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500 border border-slate-200">
                      <Box className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      Không tìm thấy vật tư thiết bị nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  <>
                    {paddingTop > 0 && (
                      <tr>
                        <td colSpan={11} style={{ height: `${paddingTop}px`, padding: 0, border: 0 }} />
                      </tr>
                    )}
                    {virtualRows.map((virtualRow) => {
                      const item = filteredItems[virtualRow.index];
                      return (
                        <InventoryRow
                          key={item.id}
                          item={item}
                          index={virtualRow.index}
                          onEditItem={onEditItem}
                          onZoomImage={setZoomImageItem}
                          measureRef={rowVirtualizer.measureElement}
                        />
                      );
                    })}
                    {paddingBottom > 0 && (
                      <tr>
                        <td colSpan={11} style={{ height: `${paddingBottom}px`, padding: 0, border: 0 }} />
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MOBILE FILTER BOTTOM SHEET (Ngăn kéo lọc nâng cao) */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-fade-in sm:hidden">
          <div className="bg-white w-full rounded-t-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            {/* Sheet Handle & Header */}
            <div className="px-5 pt-3 pb-3 border-b border-slate-100 flex flex-col shrink-0 bg-slate-50/50">
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Bộ lọc nâng cao</h3>
                  <p className="text-xs text-slate-500">Lọc theo Trạng thái, Vị trí kệ và Đề xuất</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sheet Content: Scrollable */}
            <div
              ref={sheetScrollContainerRef}
              className="p-4 overflow-y-auto flex-1 no-scrollbar space-y-4"
            >
              {/* PHẦN 1: CÁC CARD THỐNG KÊ TRẠNG THÁI KIỂM KÊ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Trạng thái kiểm kê
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Card Tất cả */}
                  <button
                    type="button"
                    onClick={() => onStatFilterChange?.('all')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      statFilter === 'all'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs">Tất cả vật tư</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        statFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {stats.total}
                    </span>
                  </button>

                  {/* Card Đã kiểm */}
                  <button
                    type="button"
                    onClick={() => onStatFilterChange?.('audited')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      statFilter === 'audited'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-semibold'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Đã kiểm
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        statFilter === 'audited' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'
                      }`}
                    >
                      {stats.audited}
                    </span>
                  </button>

                  {/* Card Chưa kiểm */}
                  <button
                    type="button"
                    onClick={() => onStatFilterChange?.('pending')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      statFilter === 'pending'
                        ? 'bg-slate-700 text-white border-slate-700 shadow-2xs font-semibold'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <span className="text-xs">Chưa kiểm</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        statFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {stats.pending}
                    </span>
                  </button>

                  {/* Card Đề xuất */}
                  <button
                    type="button"
                    onClick={() => onStatFilterChange?.('discrepancy')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      statFilter === 'discrepancy'
                        ? 'bg-red-600 text-white border-red-600 shadow-2xs font-semibold'
                        : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-xs">Đề xuất xử lý</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        statFilter === 'discrepancy' ? 'bg-white/20 text-white' : 'bg-red-200 text-red-900'
                      }`}
                    >
                      {stats.discrepancy}
                    </span>
                  </button>

                  {/* Card Cần tìm */}
                  <button
                    type="button"
                    onClick={() => onStatFilterChange?.('needed')}
                    className={`col-span-2 p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      statFilter === 'needed'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-semibold'
                        : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    <span className="text-xs">Không tìm thấy vật tư (Cần tìm)</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        statFilter === 'needed' ? 'bg-white/20 text-white' : 'bg-indigo-200 text-indigo-900'
                      }`}
                    >
                      {stats.needed}
                    </span>
                  </button>
                </div>
              </div>

              {/* PHẦN 2: BỘ LỌC VỊ TRÍ (Danh sách sổ xuống, cho phép chọn nhiều, có ô tìm kiếm nhanh) */}
              <div
                ref={locationFilterSectionRef}
                className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs"
              >
                {/* Header bar của bộ lọc vị trí: click để mở/đóng và tự động cuộn lên trên */}
                <button
                  type="button"
                  onClick={handleToggleMobileLocation}
                  className="w-full px-3.5 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-sm font-bold text-slate-800">Bộ lọc vị trí</span>
                    {selectedLocations.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                        {selectedLocations.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span>
                      {selectedLocations.length === 0
                        ? 'Tất cả vị trí'
                        : `Đã chọn ${selectedLocations.length}`}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isMobileLocationOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Danh sách sổ xuống */}
                {isMobileLocationOpen && (
                  <div className="p-3 border-t border-slate-100 space-y-2 bg-white">
                    {/* Ô tìm kiếm nhanh trong khung danh sách */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        placeholder="Tìm nhanh vị trí..."
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white text-slate-900"
                      />
                      {locationSearch && (
                        <button
                          type="button"
                          onClick={() => setLocationSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500 p-0.5 rounded-full hover:bg-red-50"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Danh sách chọn nhiều */}
                    <div className="max-h-56 overflow-y-auto space-y-1 pt-1 no-scrollbar">
                      <div
                        onClick={() => setSelectedLocations([])}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer border ${
                          selectedLocations.length === 0
                            ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                            : 'bg-slate-50/50 border-transparent text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>Tất cả vị trí ({allLocations.length})</span>
                        {selectedLocations.length === 0 && <Check className="w-4 h-4 text-blue-600" />}
                      </div>

                      {filteredLocations.map((loc) => {
                        const isSelected = selectedLocations.includes(loc);
                        return (
                          <div
                            key={loc}
                            onClick={() => toggleLocation(loc)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer border ${
                              isSelected
                                ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                                : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{loc}</span>
                            {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* PHẦN 3: BỘ LỌC ĐỀ XUẤT (Danh sách sổ xuống, cho phép chọn nhiều) */}
              <div
                ref={proposalFilterSectionRef}
                className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs"
              >
                {/* Header bar của bộ lọc đề xuất: click để mở/đóng và tự động cuộn lên trên */}
                <button
                  type="button"
                  onClick={handleToggleMobileProposal}
                  className="w-full px-3.5 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="text-sm font-bold text-slate-800">Bộ lọc đề xuất</span>
                    {selectedProposals.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-600 text-white">
                        {selectedProposals.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span>
                      {selectedProposals.length === 0
                        ? 'Tất cả đề xuất'
                        : `Đã chọn ${selectedProposals.length}`}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isMobileProposalOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Danh sách sổ xuống */}
                {isMobileProposalOpen && (
                  <div className="p-3 border-t border-slate-100 space-y-1 bg-white max-h-56 overflow-y-auto no-scrollbar">
                    <div
                      onClick={() => setSelectedProposals([])}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer border ${
                        selectedProposals.length === 0
                          ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                          : 'bg-slate-50/50 border-transparent text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>Tất cả đề xuất ({allProposals.length})</span>
                      {selectedProposals.length === 0 && <Check className="w-4 h-4 text-blue-600" />}
                    </div>

                    {allProposals.map((prop) => {
                      const isSelected = selectedProposals.includes(prop);
                      return (
                        <div
                          key={prop}
                          onClick={() => toggleProposal(prop)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer border ${
                            isSelected
                              ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                              : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="truncate">{prop}</span>
                          {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sheet Footer */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onStatFilterChange?.('all');
                  setSelectedLocations([]);
                  setSelectedProposals([]);
                }}
                disabled={activeFiltersCount === 0}
                className="px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors text-center"
              >
                Xem kết quả ({filteredItems.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal phóng to hình ảnh vật tư */}
      <ImageZoomModal
        isOpen={Boolean(zoomImageItem?.image)}
        onClose={() => setZoomImageItem(null)}
        imageUrl={zoomImageItem?.image || ''}
        itemCode={zoomImageItem?.code || ''}
        itemName={zoomImageItem?.name || ''}
      />
    </div>
  );
};
