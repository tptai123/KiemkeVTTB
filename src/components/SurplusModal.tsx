import React, { useState, useEffect } from 'react';
import { X, Save, PackagePlus, AlertCircle } from 'lucide-react';
import { SurplusItem } from '../types';
import { ITEM_GROUPS, SURPLUS_CONDITIONS, WAREHOUSE_LOCATIONS } from '../mockData';

interface SurplusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<SurplusItem>) => void;
  editingItem?: SurplusItem | null;
}

export const SurplusModal: React.FC<SurplusModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
}) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    group: ITEM_GROUPS[1],
    model: '',
    unit: 'Cái',
    quantity: 1,
    condition: SURPLUS_CONDITIONS[1],
    location: WAREHOUSE_LOCATIONS[0],
    reason: 'Dư thừa sau khi triển khai dự án',
    notes: '',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (editingItem) {
      setFormData({
        code: editingItem.code,
        name: editingItem.name,
        group: editingItem.group,
        model: editingItem.model,
        unit: editingItem.unit,
        quantity: editingItem.quantity,
        condition: editingItem.condition,
        location: editingItem.location,
        reason: editingItem.reason,
        notes: editingItem.notes,
      });
    } else {
      setFormData({
        code: `SD-NEW-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        group: ITEM_GROUPS[1],
        model: '',
        unit: 'Cái',
        quantity: 2,
        condition: SURPLUS_CONDITIONS[1],
        location: WAREHOUSE_LOCATIONS[0],
        reason: 'Mua dự phòng còn thừa',
        notes: '',
      });
    }
    setError('');
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      setError('Vui lòng nhập đầy đủ Mã vật tư và Tên vật tư.');
      return;
    }

    onSave({
      ...formData,
      quantity: Number(formData.quantity) || 1,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {editingItem ? 'Chỉnh sửa thông tin hàng dư' : 'Thêm mới hàng dư thừa'}
              </h3>
              <p className="text-xs text-slate-300">Quản lý vật tư thiết bị dư sau kiểm kê</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Mã vật tư <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="VD: SD-IT-010"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Nhóm vật tư
              </label>
              <select
                value={formData.group}
                onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
              >
                {ITEM_GROUPS.filter((g) => g !== 'Tất cả nhóm').map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Tên vật tư <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Switch Cisco 24 Port..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Quy cách / Model
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="VD: Catalyst C1000..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Đơn vị tính
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
              >
                <option value="Chiếc">Chiếc</option>
                <option value="Cái">Cái</option>
                <option value="Bộ">Bộ</option>
                <option value="Thùng">Thùng</option>
                <option value="Cuộn">Cuộn</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Số lượng hàng dư
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Tình trạng vật tư
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
              >
                {SURPLUS_CONDITIONS.filter((c) => c !== 'Tất cả tình trạng').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Kho / Vị trí lưu trữ
            </label>
            <select
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
            >
              {WAREHOUSE_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Nguyên nhân dư thừa
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="VD: Mua dự phòng cho dự án cũ..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Nhập ghi chú chi tiết..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 shadow-md shadow-emerald-500/25 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Lưu hàng dư</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
