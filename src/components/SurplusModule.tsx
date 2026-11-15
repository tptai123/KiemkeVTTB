import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Edit2,
  Trash2,
  Eye,
  PackagePlus,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Box,
} from 'lucide-react';
import { SurplusItem, RolePermissions } from '../types';
import { ITEM_GROUPS, SURPLUS_CONDITIONS } from '../mockData';

interface SurplusModuleProps {
  items: SurplusItem[];
  onAddItem: () => void;
  onEditItem: (item: SurplusItem) => void;
  onDeleteItem: (id: string) => void;
  onViewDetail: (item: SurplusItem) => void;
  onOpenImport: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  userPermissions?: RolePermissions;
}

export const SurplusModule: React.FC<SurplusModuleProps> = ({
  items,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onViewDetail,
  onOpenImport,
  onShowToast,
  userPermissions,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Tất cả nhóm');
  const [selectedCondition, setSelectedCondition] = useState('Tất cả tình trạng');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchGroup = selectedGroup === 'Tất cả nhóm' || item.group === selectedGroup;
      const matchCondition =
        selectedCondition === 'Tất cả tình trạng' || item.condition === selectedCondition;

      return matchSearch && matchGroup && matchCondition;
    });
  }, [items, searchQuery, selectedGroup, selectedCondition]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportExcel = () => {
    onShowToast('Đã xuất báo cáo hàng dư thừa Excel thành công!', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Danh sách vật tư thiết bị hàng dư</h3>
          <p className="text-xs text-slate-500">Quản lý tồn dư thừa, chưa sử dụng hoặc chờ thanh lý sau kiểm kê</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {(!userPermissions || userPermissions.canAddSurplus) && (
            <button
              onClick={onOpenImport}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium rounded-xl border border-emerald-200 transition-colors text-sm flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Import Excel</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-xl border border-slate-200 transition-colors text-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>

          {(!userPermissions || userPermissions.canAddSurplus) && (
            <button
              onClick={onAddItem}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-md shadow-emerald-500/25 transition-all text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm hàng dư</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm kiếm theo mã vật tư, tên, model hoặc vị trí kho..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 flex-1 md:w-56">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              {ITEM_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedCondition}
            onChange={(e) => {
              setSelectedCondition(e.target.value);
              setCurrentPage(1);
            }}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500"
          >
            {SURPLUS_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-4 text-center w-12">STT</th>
                <th className="py-3.5 px-4">Mã vật tư</th>
                <th className="py-3.5 px-4">Tên vật tư</th>
                <th className="py-3.5 px-4">Quy cách / Model</th>
                <th className="py-3.5 px-4">ĐVT</th>
                <th className="py-3.5 px-4 text-center">Số lượng</th>
                <th className="py-3.5 px-4">Tình trạng</th>
                <th className="py-3.5 px-4">Kho / Vị trí</th>
                <th className="py-3.5 px-4">Ghi chú</th>
                <th className="py-3.5 px-4 text-center w-36">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <PackagePlus className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Không tìm thấy vật tư hàng dư nào.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => {
                  const stt = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-medium text-slate-500">{stt}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-600">{item.code}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-400">{item.group}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">{item.model || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-600">{item.unit}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700">{item.quantity}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.condition}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.location}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs max-w-[180px] truncate" title={item.notes}>
                        {item.notes || item.reason || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewDetail(item)}
                            title="Xem chi tiết"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(!userPermissions || userPermissions.canManageSurplus) && (
                            <>
                              <button
                                onClick={() => onEditItem(item)}
                                title="Chỉnh sửa"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeleteItem(item.id)}
                                title="Xóa"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {paginatedItems.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
            <PackagePlus className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            Không tìm thấy hàng dư nào.
          </div>
        ) : (
          paginatedItems.map((item, index) => {
            const stt = (currentPage - 1) * itemsPerPage + index + 1;
            return (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      #{stt} - {item.code}
                    </span>
                    <h4 className="font-bold text-slate-900 mt-1">{item.name}</h4>
                    <p className="text-xs text-slate-400">{item.group} • {item.model || 'Model chuẩn'}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700">
                    SL: {item.quantity} {item.unit}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="font-semibold">Tình trạng:</span> {item.condition}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{item.location}</span>
                  </div>
                  {item.reason && (
                    <div className="text-slate-500 italic">Lý do: {item.reason}</div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => onViewDetail(item)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Chi tiết
                  </button>
                  {(!userPermissions || userPermissions.canManageSurplus) && (
                    <>
                      <button
                        onClick={() => onEditItem(item)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Sửa
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500">
            Hiển thị trang <strong className="text-slate-800">{currentPage}</strong> / <strong className="text-slate-800">{totalPages}</strong> ({filteredItems.length} hàng dư)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
