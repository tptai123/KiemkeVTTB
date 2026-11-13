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
} from 'lucide-react';
import { InventoryItem } from '../types';
import { ImageZoomModal } from './ImageZoomModal';

interface InventoryModuleProps {
  items: InventoryItem[];
  onEditItem: (item: InventoryItem) => void;
  statFilter: 'all' | 'audited' | 'pending' | 'discrepancy' | 'needed';
  onOpenImport: () => void;
  onExportExcel: () => void;
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

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  items,
  onEditItem,
  statFilter,
  onOpenImport,
  onExportExcel,
}) => {
  // Filters state — raw (immediate for UI responsiveness)
  const [codeQuery, setCodeQuery] = useState('');
  const [nameQuery, setNameQuery] = useState('');

  // Deferred search values — updated via useTransition so filtering runs in background
  const [deferredCode, setDeferredCode] = useState('');
  const [deferredName, setDeferredName] = useState('');
  const [, startTransition] = useTransition();

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
  // Scroll container ref for virtual table
  const tableContainerRef = useRef<HTMLDivElement>(null);

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
    const result: InventoryItem[] = [];

    for (const entry of indexedItems) {
      const { item } = entry;
      if (codeLower && !entry.codeLower.includes(codeLower)) continue;
      if (nameLower && !entry.nameLower.includes(nameLower)) continue;
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
  }, [indexedItems, deferredCode, deferredName, locationSet, proposalSet, statFilter]);

  // Virtual table rows
  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 8,
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

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-2 animate-fade-in text-slate-900 font-sans">
      {/* Fixed Filter & Action Toolbar: Tất cả trường lọc và 2 nút nằm trên cùng 1 hàng ngang */}
      <div className="shrink-0 bg-white p-2 rounded-2xl shadow-2xs border border-slate-200">
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

          {/* Proposal Multi-Select Dropdown (Đề xuất - dữ liệu từ cột Đề xuất) */}
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
          {/* Nút Import Excel (màu xanh dương) nằm trước Xuất Excel (màu xanh lá đậm) */}
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
        </div>
      </div>

      {/* Data Table: Phủ phần diện tích còn lại, không tạo thanh cuộn dọc cho form giao diện module */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 flex-1 min-h-0 overflow-hidden flex flex-col text-[14px]">
        <div
          className="overflow-x-auto overflow-y-auto flex-1 no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          ref={tableContainerRef}
        >
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
        </div>
      </div>

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
