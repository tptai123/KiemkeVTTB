import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import * as XLSX from 'xlsx';
import {
  Search,
  Filter,
  Plus,
  Download,
  Trash2,
  Package,
  ChevronDown,
  Check,
  X,
  ImageIcon,
  MapPin,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { SurplusItem, RolePermissions } from '../types';
import { ImageZoomModal } from './ImageZoomModal';

interface SurplusModuleProps {
  items: SurplusItem[];
  onAddItem: () => void;
  onEditItem: (item: SurplusItem) => void;
  onDeleteItem: (id: string) => void;
  onViewDetail?: (item: SurplusItem) => void;
  onOpenImport?: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  userPermissions?: RolePermissions;
}

interface SurplusRowProps {
  item: SurplusItem;
  stt: number;
  onEditItem: (item: SurplusItem) => void;
  onDeleteClick: (item: SurplusItem) => void;
  onZoomImage: (zoom: { isOpen: boolean; imageUrl: string; itemCode: string; itemName: string }) => void;
  canManageSurplus: boolean;
  measureRef: (node: HTMLTableRowElement | null) => void;
}

const SurplusRow = React.memo<SurplusRowProps>(
  ({
    item,
    stt,
    onEditItem,
    onDeleteClick,
    onZoomImage,
    canManageSurplus,
    measureRef,
  }) => {
    return (
      <tr
        ref={measureRef}
        onClick={() => onEditItem(item)}
        className="hover:bg-sky-50/80 cursor-pointer transition-colors divide-x divide-slate-200 border-b border-slate-200 group"
        title="Nhấp để xem và chỉnh sửa thông tin vật tư"
      >
        {/* 1. STT */}
        <td className="py-2.5 px-2 text-center font-medium text-slate-500">
          {stt}
        </td>

        {/* 2. Hình ảnh */}
        <td
          className="py-1.5 px-2 text-center"
          onClick={(e) => {
            if (item.image) {
              e.stopPropagation();
              onZoomImage({
                isOpen: true,
                imageUrl: item.image,
                itemCode: item.code || `SD-${stt}`,
                itemName: item.name,
              });
            }
          }}
        >
          <div className="flex items-center justify-center">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-10 h-10 object-cover rounded-lg border border-slate-200 hover:scale-110 transition-transform shadow-2xs"
                title="Nhấp để xem phóng to ảnh"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
                <ImageIcon className="w-5 h-5" />
              </div>
            )}
          </div>
        </td>

        {/* 3. Tên vật tư */}
        <td className="py-2.5 px-3 font-semibold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug break-words">
          {item.name}
        </td>

        {/* 4. ĐVT */}
        <td className="py-2.5 px-2 text-center text-slate-700 font-medium">
          {item.unit}
        </td>

        {/* 5. Số lượng */}
        <td className="py-2.5 px-2 text-center font-bold text-slate-900">
          {item.quantity}
        </td>

        {/* 6. Vị trí */}
        <td className="py-2.5 px-2 text-center text-slate-700 text-xs">
          {item.location || '—'}
        </td>

        {/* 7. Tình trạng */}
        <td className="py-2.5 px-3 text-center">
          <span
            className="inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 max-w-[200px] truncate"
            title={item.condition}
          >
            {item.condition || '—'}
          </span>
        </td>

        {/* 8. Quy cách */}
        <td className="py-2.5 px-3 text-center text-slate-600 text-xs break-words">
          {item.model || '—'}
        </td>

        {/* 9. Ghi chú */}
        <td
          className="py-2.5 px-3 text-center text-slate-500 text-xs break-words"
          title={item.notes || item.reason || ''}
        >
          {item.notes || item.reason || '—'}
        </td>

        {/* 10. Thao tác */}
        <td className="py-2.5 px-3 text-center">
          <div className="flex items-center justify-center">
            {canManageSurplus && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClick(item);
                }}
                title="Xóa vật tư này"
                className="p-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }
);
SurplusRow.displayName = 'SurplusRow';

export const SurplusModule: React.FC<SurplusModuleProps> = ({
  items,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onShowToast,
  userPermissions,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [isConditionDropdownOpen, setIsConditionDropdownOpen] = useState(false);
  const [conditionSearch, setConditionSearch] = useState('');

  // Zoom image state
  const [zoomImage, setZoomImage] = useState<{
    isOpen: boolean;
    imageUrl: string;
    itemCode: string;
    itemName: string;
  }>({
    isOpen: false,
    imageUrl: '',
    itemCode: '',
    itemName: '',
  });

  // Modal xác nhận xóa vật tư
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<SurplusItem | null>(null);

  const conditionDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        conditionDropdownRef.current &&
        !conditionDropdownRef.current.contains(e.target as Node)
      ) {
        setIsConditionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lấy danh sách tình trạng duy nhất từ dữ liệu thực tế
  const uniqueConditions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.condition && item.condition.trim()) {
        set.add(item.condition.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [items]);

  // Lọc nhanh danh sách tình trạng trong dropdown
  const filteredConditionOptions = useMemo(() => {
    if (!conditionSearch.trim()) return uniqueConditions;
    return uniqueConditions.filter((c) =>
      c.toLowerCase().includes(conditionSearch.trim().toLowerCase())
    );
  }, [uniqueConditions, conditionSearch]);

  // Toggle chọn một tình trạng
  const handleToggleCondition = (condition: string) => {
    setSelectedConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
  };

  // Lọc dữ liệu theo tên vật tư và tình trạng (giữ nguyên thứ tự mới nhất trên đầu)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tìm kiếm theo Tên vật tư
      const matchSearch =
        searchQuery.trim() === '' ||
        (item.name && item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

      // Lọc theo tình trạng (nếu có chọn)
      const matchCondition =
        selectedConditions.length === 0 ||
        (item.condition && selectedConditions.includes(item.condition.trim()));

      return matchSearch && matchCondition;
    });
  }, [items, searchQuery, selectedConditions]);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - virtualRows[virtualRows.length - 1].end
      : 0;

  // Xuất file Excel
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      onShowToast('Không có dữ liệu hàng dư để xuất Excel', 'info');
      return;
    }

    try {
      const dataToExport = filteredItems.map((item, idx) => ({
        STT: idx + 1,
        'Tên vật tư': item.name,
        ĐVT: item.unit,
        'Số lượng': item.quantity,
        'Vị trí': item.location || '—',
        'Tình trạng': item.condition || '—',
        'Quy cách': item.model || '—',
        'Ghi chú': item.notes || item.reason || '—',
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Hang_Du');
      const fileName = `Danh_sach_hang_du_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      onShowToast(`Đã xuất thành công ${filteredItems.length} hàng dư ra file Excel!`, 'success');
    } catch (err) {
      console.error('Export Excel error:', err);
      onShowToast('Lỗi khi xuất file Excel', 'error');
    }
  };

  return (
    <div className="space-y-3 pb-12 animate-fade-in font-sans flex-1 flex flex-col min-h-0">
      {/* BỘ LỌC VÀ CÔNG CỤ (Nằm ngang hàng, đã bỏ thanh tiêu đề) */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl shadow-2xs border border-slate-200 shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Cụm trái: Ô tìm kiếm (theo tên vật tư) + Bộ lọc tình trạng (chọn nhiều) */}
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* 1. Ô tìm kiếm theo tên vật tư */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên vật tư..."
                className="w-full pl-9 pr-3.5 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Trường lọc Tình trạng (Chọn nhiều, có tìm kiếm nhanh) */}
            <div className="relative shrink-0" ref={conditionDropdownRef}>
              <button
                type="button"
                onClick={() => setIsConditionDropdownOpen((prev) => !prev)}
                className={`w-full sm:w-auto px-3 py-1.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between sm:justify-start gap-2 transition-all cursor-pointer ${
                  selectedConditions.length > 0
                    ? 'border-blue-500 bg-blue-50/70 text-blue-700 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
                title="Lọc theo tình trạng vật tư"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {selectedConditions.length === 0
                      ? 'Tình trạng: Tất cả'
                      : `Tình trạng (${selectedConditions.length})`}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    isConditionDropdownOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* Dropdown Menu Tình trạng */}
              {isConditionDropdownOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2.5 z-50 animate-scale-up">
                  {/* Ô tìm kiếm nhanh tình trạng */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={conditionSearch}
                      onChange={(e) => setConditionSearch(e.target.value)}
                      placeholder="Tìm tình trạng..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Actions: Chọn tất cả / Bỏ chọn */}
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 px-1 text-[11px]">
                    <span className="text-slate-500 font-semibold">
                      {selectedConditions.length}/{uniqueConditions.length} đã chọn
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedConditions([...uniqueConditions])}
                        className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        Chọn hết
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedConditions([])}
                        className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  {/* Danh sách checkbox tình trạng */}
                  <div className="max-h-52 overflow-y-auto space-y-1 no-scrollbar pr-1">
                    {filteredConditionOptions.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        Không tìm thấy tình trạng
                      </div>
                    ) : (
                      filteredConditionOptions.map((cond) => {
                        const isChecked = selectedConditions.includes(cond);
                        const count = items.filter((i) => i.condition === cond).length;
                        return (
                          <label
                            key={cond}
                            onClick={() => handleToggleCondition(cond)}
                            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none text-xs text-slate-700 transition-colors"
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isChecked
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="truncate">{cond}</span>
                            </div>
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                              {count}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cụm phải: 2 nút "Xuất Excel" và "Thêm mới" nằm ngang hàng */}
          <div className="flex items-center gap-2 justify-end shrink-0">
            {/* Nút Xuất Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 sm:py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
              title="Xuất danh sách ra file Excel"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>

            {/* Nút Thêm mới */}
            {(!userPermissions || userPermissions.canAddSurplus) && (
              <button
                type="button"
                onClick={onAddItem}
                className="px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/25 transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                title="Thêm vật tư hàng dư mới"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm mới</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BẢNG DỮ LIỆU DESKTOP (Có đường kẻ mỏng, tiêu đề căn giữa) */}
      <div className="hidden md:flex bg-white rounded-xl shadow-2xs border border-slate-200 flex-1 min-h-0 flex-col overflow-hidden text-[13px] sm:text-[14px]">
        <div
          ref={tableContainerRef}
          className="table-scrollbar flex-1"
        >
          <table className="w-full min-w-[1450px] text-left border-collapse border border-slate-200">
            {/* Tiêu đề bảng: Đều căn giữa (text-center), nền nhẹ, đường kẻ mỏng */}
            <thead className="bg-slate-100 sticky top-0 z-10 shadow-2xs">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-700 divide-x divide-slate-200 border-b border-slate-200">
                <th className="py-2.5 px-2 text-center w-12 shrink-0">STT</th>
                <th className="py-2.5 px-2 text-center w-16 shrink-0">Hình ảnh</th>
                <th className="py-2.5 px-3 text-center min-w-[320px]">Tên vật tư</th>
                <th className="py-2.5 px-2 text-center w-16 shrink-0">ĐVT</th>
                <th className="py-2.5 px-2 text-center w-20 shrink-0">Số lượng</th>
                <th className="py-2.5 px-2 text-center w-32 shrink-0">Vị trí</th>
                <th className="py-2.5 px-3 text-center w-[220px] shrink-0">Tình trạng</th>
                <th className="py-2.5 px-3 text-center w-[260px] shrink-0">Quy cách</th>
                <th className="py-2.5 px-3 text-center w-[260px] shrink-0">Ghi chú</th>
                <th className="py-2.5 px-2 text-center w-16 shrink-0">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-700">Không tìm thấy vật tư hàng dư nào</p>
                    <p className="text-xs text-slate-400 mt-1">Vui lòng điều chỉnh lại bộ lọc hoặc thêm mới vật tư</p>
                  </td>
                </tr>
              ) : (
                <>
                  {paddingTop > 0 && (
                    <tr>
                      <td style={{ height: `${paddingTop}px` }} colSpan={10} />
                    </tr>
                  )}
                  {virtualRows.map((virtualRow) => {
                    const item = filteredItems[virtualRow.index];
                    const stt = virtualRow.index + 1;
                    return (
                      <SurplusRow
                        key={item.id}
                        item={item}
                        stt={stt}
                        onEditItem={onEditItem}
                        onDeleteClick={setDeleteConfirmItem}
                        onZoomImage={setZoomImage}
                        canManageSurplus={!userPermissions || userPermissions.canManageSurplus}
                        measureRef={rowVirtualizer.measureElement}
                      />
                    );
                  })}
                  {paddingBottom > 0 && (
                    <tr>
                      <td style={{ height: `${paddingBottom}px` }} colSpan={10} />
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer tóm tắt số lượng */}
        <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div>
            Tổng số: <strong className="text-slate-800">{filteredItems.length}</strong> vật tư hàng dư
            {selectedConditions.length > 0 && ` (đang lọc theo ${selectedConditions.length} tình trạng)`}
          </div>
        </div>
      </div>

      {/* GIAO DIỆN MOBILE (Card View tinh gọn: Tên, Số lượng, ĐVT, Vị trí, Ghi chú, Tình trạng, Xóa có xác nhận) */}
      <div className="md:hidden flex-1 overflow-y-auto space-y-3 no-scrollbar pb-6">
        {filteredItems.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
            <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-sm text-slate-700">Không tìm thấy vật tư hàng dư</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            return (
              <div
                key={item.id}
                onClick={() => onEditItem(item)}
                className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200 space-y-2.5 hover:border-slate-300 transition-all cursor-pointer relative"
              >
                {/* 1. Phần trên: Ảnh bên trái (hình vuông nhỏ gọn cố định), bên phải là Tên vật tư + (Số lượng, ĐVT, Vị trí) */}
                <div className="flex items-start gap-3">
                  {/* Hình ảnh bên trái (hình vuông nhỏ gọn cố định) */}
                  <div
                    className="w-14 h-14 shrink-0 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative aspect-square"
                    onClick={(e) => {
                      if (item.image) {
                        e.stopPropagation();
                        setZoomImage({
                          isOpen: true,
                          imageUrl: item.image,
                          itemCode: item.code || `SD-${item.id.slice(0, 6)}`,
                          itemName: item.name,
                        });
                      }
                    }}
                    title={item.image ? 'Nhấn để phóng to ảnh' : undefined}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  {/* Cụm thông tin bên phải: Tên vật tư + (Dưới là Số lượng, ĐVT, Vị trí) */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className="font-bold text-slate-900 text-sm leading-snug line-clamp-2"
                      title={item.name}
                    >
                      {item.name}
                    </h4>

                    {/* Dưới tên vật tư là Số lượng, ĐVT, Vị trí (ghi rõ "Vị trí: ", chữ đen) */}
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs mt-1.5">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 shrink-0">
                        {item.quantity} {item.unit}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 text-slate-900 truncate min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">
                          <span className="font-semibold text-slate-900">Vị trí: </span>
                          <span className="font-medium text-slate-900">{item.location || '—'}</span>
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Dưới nữa là: Ghi chú */}
                {item.notes ? (
                  <div className="bg-slate-50/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 flex items-start gap-1.5 border border-slate-100">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-slate-700 italic">
                      {item.notes}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic px-1">
                    Ghi chú: —
                  </div>
                )}

                {/* 3. Dưới footer: bên trái là Tình trạng, bên phải là nút icon Xóa (áp dụng phân quyền) */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  {/* Trái: Tình trạng */}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {item.condition || 'Mới 100%'}
                  </span>

                  {/* Phải: Nút icon Xóa (áp dụng phân quyền canManageSurplus) */}
                  {(!userPermissions || userPermissions.canManageSurplus) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmItem(item);
                      }}
                      className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 transition-colors cursor-pointer shadow-2xs"
                      title="Xóa vật tư này"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Xác nhận xóa vật tư hàng dư */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Xác nhận xóa vật tư hàng dư
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bạn có chắc chắn muốn xóa bản ghi vật tư này?
                </p>
              </div>
            </div>

            {/* Chi tiết vật tư bị xóa */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="font-semibold text-slate-900 line-clamp-2">
                {deleteConfirmItem.name}
              </div>
              <div className="flex items-center gap-3 text-slate-600 flex-wrap">
                <span>
                  Số lượng: <strong className="text-slate-800">{deleteConfirmItem.quantity} {deleteConfirmItem.unit}</strong>
                </span>
                <span>•</span>
                <span>
                  Vị trí: <span className="font-medium">{deleteConfirmItem.location || '—'}</span>
                </span>
              </div>
              {deleteConfirmItem.condition && (
                <div className="text-slate-500">
                  Tình trạng: <span className="text-slate-700 font-medium">{deleteConfirmItem.condition}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-red-600 font-medium">
              * Hành động này sẽ xóa dữ liệu vĩnh viễn khỏi hệ thống và không thể hoàn tác.
            </p>

            {/* Footer hành động */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmItem) {
                    onDeleteItem(deleteConfirmItem.id);
                    setDeleteConfirmItem(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-red-500/20 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal phóng to ảnh */}
      {zoomImage.isOpen && (
        <ImageZoomModal
          isOpen={zoomImage.isOpen}
          onClose={() => setZoomImage((prev) => ({ ...prev, isOpen: false }))}
          imageUrl={zoomImage.imageUrl}
          itemCode={zoomImage.itemCode}
          itemName={zoomImage.itemName}
        />
      )}
    </div>
  );
};
