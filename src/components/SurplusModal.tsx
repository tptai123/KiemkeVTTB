import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Package,
  AlertCircle,
  Upload,
  Camera,
  Trash2,
  Lock,
} from 'lucide-react';
import { SurplusItem } from '../types';

interface SurplusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<SurplusItem>, imageFile?: File | null) => Promise<void> | void;
  editingItem?: SurplusItem | null;
  isReadOnly?: boolean;
}

// Hàm nén ảnh trước khi lưu
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export const SurplusModal: React.FC<SurplusModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  isReadOnly = false,
}) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    group: 'Hàng dư',
    model: '',
    unit: 'Cái',
    quantity: 1,
    condition: 'Mới 100%',
    location: '',
    reason: '',
    notes: '',
    image: '',
  });

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        code: editingItem.code || '',
        name: editingItem.name || '',
        group: editingItem.group || 'Hàng dư',
        model: editingItem.model || '',
        unit: editingItem.unit || 'Cái',
        quantity: editingItem.quantity || 1,
        condition: editingItem.condition || 'Mới 100%',
        location: editingItem.location || '',
        reason: editingItem.reason || '',
        notes: editingItem.notes || '',
        image: editingItem.image || '',
      });
      setSelectedImageFile(null);
    } else {
      setFormData({
        code: `SD-${Date.now().toString().slice(-6)}`,
        name: '',
        group: 'Hàng dư',
        model: '',
        unit: 'Cái',
        quantity: 1,
        condition: 'Mới 100%',
        location: '',
        reason: '',
        notes: '',
        image: '',
      });
      setSelectedImageFile(null);
    }
    setError('');
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setSelectedImageFile(compressed);
      const previewUrl = URL.createObjectURL(compressed);
      setFormData((prev) => ({ ...prev, image: previewUrl }));
    } catch (err) {
      console.error('Image compression error:', err);
      setSelectedImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, image: previewUrl }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Vui lòng nhập Tên vật tư.');
      return;
    }
    if (!formData.unit.trim()) {
      setError('Vui lòng nhập Đơn vị tính (ĐVT).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(
        {
          ...formData,
          name: formData.name.trim(),
          unit: formData.unit.trim(),
          quantity: Math.max(1, Number(formData.quantity) || 1),
          model: formData.model.trim(),
          location: formData.location.trim(),
          condition: formData.condition.trim(),
          notes: formData.notes.trim(),
        },
        selectedImageFile
      );
      onClose();
    } catch (err: unknown) {
      console.error('Save surplus item error:', err);
      setError('Lỗi lưu thông tin vật tư.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Thông tin vật tư
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Xem và cập nhật thông tin chi tiết vật tư hàng dư
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 no-scrollbar">
          {isReadOnly && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-xs sm:text-sm font-semibold">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Chế độ chỉ xem (Tài khoản hiện tại không có quyền chỉnh sửa hàng dư)</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* HÀNG 1: 
              - Cột trái: Tên vật tư + (ĐVT & Số lượng nằm ngang hàng)
              - Cột phải: Hình ảnh vật tư (chiều cao bằng cụm bên trái)
          */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            {/* Cột trái */}
            <div className="flex-1 flex flex-col justify-between gap-3">
              {/* Tên vật tư */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên vật tư <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  disabled={isReadOnly}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập tên vật tư thiết bị..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 resize-none leading-snug break-words disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* ĐVT và Số lượng nằm ngang hàng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ĐVT <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isReadOnly}
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="VD: Cái, Bộ, Mét..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    disabled={isReadOnly}
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 text-sm font-bold text-right text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Cột phải: Hình ảnh (chiều cao bằng tên vật tư + (ĐVT & Số lượng)) */}
            <div className="w-full sm:w-60 shrink-0 flex flex-col">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hình ảnh vật tư
              </label>
              <div className="flex-1 min-h-[140px] rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col justify-between relative overflow-hidden">
                <div className="flex-1 w-full flex items-center justify-center p-2 relative min-h-[92px]">
                  {formData.image ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img
                        src={formData.image}
                        alt={formData.name}
                        className="max-h-24 sm:max-h-28 w-auto max-w-full object-contain rounded"
                      />
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, image: '' }));
                            setSelectedImageFile(null);
                          }}
                          title="Xóa hình ảnh"
                          className="absolute top-0 right-0 p-1 bg-white/95 hover:bg-red-50 text-red-600 rounded-lg border border-slate-200 shadow-2xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Chưa có hình ảnh</span>
                  )}
                </div>

                {!isReadOnly && (
                  <div className="w-full bg-slate-100/90 border-t border-slate-200 p-1.5 flex items-center justify-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-1 px-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 py-1 px-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Chụp ảnh</span>
                    </button>
                  </div>
                )}

                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* DƯỚI NỮA: Vị trí & Tình trạng (nằm ngang hàng) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vị trí
              </label>
              <input
                type="text"
                disabled={isReadOnly}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="VD: Kho A - Kệ 01, Tầng hầm..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tình trạng
              </label>
              <input
                type="text"
                disabled={isReadOnly}
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                placeholder="VD: Mới 100%, Mới 95%, Đã qua sử dụng..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* DƯỚI NỮA: Quy cách vật tư */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quy cách vật tư
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="Nhập quy cách kỹ thuật, model, kích thước..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* DƯỚI NỮA: Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú
            </label>
            <textarea
              rows={2}
              disabled={isReadOnly}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Nhập ghi chú chi tiết về vật tư..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 resize-none disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Modal Footer */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {isReadOnly ? 'Đóng' : 'Hủy'}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thông tin'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
