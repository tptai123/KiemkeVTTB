import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Wrench,
  AlertCircle,
  Upload,
  Camera,
  ChevronDown,
  Trash2,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { DCDNItem, CollaboratorPresence } from '../types';
import { WAREHOUSE_LOCATIONS } from '../mockData';

interface DCDNModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<DCDNItem>, imageFile?: File | null) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  editingItem?: DCDNItem | null;
  availableProposals?: string[];
  currentUserName: string;
  isReadOnly?: boolean;
  canDelete?: boolean;
  collaborators?: CollaboratorPresence[];
}

export const parseVietnameseNumber = (val: string | number): number => {
  if (typeof val === 'number') return val;
  if (!val || val.trim() === '') return 0;
  const cleanStr = val.toString().replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

export const formatVietnameseNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) return '';
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 3,
  }).format(num);
};

const formatVNInputLive = (value: string): string => {
  const raw = value.replace(/\./g, '').replace(/[^\d,]/g, '');
  if (raw === '') return '';

  const commaIdx = raw.indexOf(',');
  if (commaIdx !== -1) {
    const intPart = raw.slice(0, commaIdx).replace(/^0+(?=\d)/, '');
    const decPart = raw.slice(commaIdx + 1).replace(/,/g, '');
    const formattedInt = (intPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedInt},${decPart}`;
  }

  const intPart = raw.replace(/^0+(?=\d)/, '');
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const getTodayDDMMYY = (): string => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

const formatToDDMMYY = (dateStr?: string): string => {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(trimmed)) return trimmed;
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1].slice(-2)}`;
  }
  return trimmed;
};

const DEFAULT_PROPOSAL_OPTIONS = [
  'Xin thanh lý',
  'Xin hiệu chuẩn',
  'Báo mất dụng cụ',
  'Xin sửa chữa / bảo dưỡng',
  'Điều chuyển đội khác',
];

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
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
          0.8
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export const DCDNModal: React.FC<DCDNModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingItem,
  availableProposals = [],
  currentUserName,
  isReadOnly = false,
  canDelete = false,
  collaborators = [],
}) => {
  const otherEditors = collaborators.filter(
    (c) =>
      editingItem &&
      c.editingItemId === editingItem.id &&
      c.userName !== currentUserName &&
      c.userId !== currentUserName
  );
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit: 'Bộ',
    warehouse: 'Kho DCĐN',
    location: '',
    bookQtyStr: '0',
    actualQtyStr: '',
    proposal: '',
    proposalReason: '',
    notFound: false,
    image: '',
    notes: '',
    auditedAt: '',
    auditor: '',
  });

  const [initialSnapshot, setInitialSnapshot] = useState<string>('');
  const [isProposalMenuOpen, setIsProposalMenuOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const proposalMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const proposalOptions = Array.from(
    new Set([
      ...DEFAULT_PROPOSAL_OPTIONS,
      ...availableProposals.filter((p) => Boolean(p && p.trim())),
    ])
  );

  useEffect(() => {
    if (!isOpen) return;

    if (editingItem) {
      const initialData = {
        code: editingItem.code || '',
        name: editingItem.name || '',
        unit: editingItem.unit || 'Bộ',
        warehouse: editingItem.warehouse || 'Kho DCĐN',
        location: editingItem.location || '',
        bookQtyStr: formatVietnameseNumber(editingItem.bookQty),
        actualQtyStr:
          editingItem.actualQty !== null && editingItem.actualQty !== undefined
            ? formatVietnameseNumber(editingItem.actualQty)
            : '',
        proposal: editingItem.proposal || '',
        proposalReason: editingItem.proposalReason || '',
        notFound: Boolean(editingItem.notFound),
        image: editingItem.image || '',
        notes: editingItem.notes || '',
        auditedAt: formatToDDMMYY(editingItem.auditedAt),
        auditor: editingItem.auditor || currentUserName,
      };
      setFormData(initialData);
      setInitialSnapshot(JSON.stringify(initialData));
    } else {
      const emptyData = {
        code: '',
        name: '',
        unit: 'Bộ',
        warehouse: 'Kho DCĐN',
        location: '',
        bookQtyStr: '0',
        actualQtyStr: '',
        proposal: '',
        proposalReason: '',
        notFound: false,
        image: '',
        notes: '',
        auditedAt: '',
        auditor: currentUserName,
      };
      setFormData(emptyData);
      setInitialSnapshot(JSON.stringify(emptyData));
    }

    setIsProposalMenuOpen(false);
    setSelectedImageFile(null);
    setIsSubmitting(false);
    setHasSubmitted(false);
    setIsConfirmDeleteOpen(false);
    setIsDeleting(false);
    setError('');
  }, [editingItem, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (proposalMenuRef.current && !proposalMenuRef.current.contains(e.target as Node)) {
        setIsProposalMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const isDirty =
    selectedImageFile !== null ||
    (initialSnapshot !== '' && JSON.stringify(formData) !== initialSnapshot);
  const isActualQtyMissing = !formData.notFound && formData.actualQtyStr.trim() === '';
  const showActualQtyError = hasSubmitted && isActualQtyMissing;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp hình ảnh hợp lệ.');
      return;
    }
    const compressed = await compressImage(file);
    setSelectedImageFile(compressed);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({ ...prev, image: reader.result as string }));
        setError('');
      }
    };
    reader.readAsDataURL(compressed);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isDirty) return;
    if (!formData.name.trim()) {
      setError('Vui lòng nhập Tên dụng cụ.');
      return;
    }
    if (isActualQtyMissing) {
      setHasSubmitted(true);
      setError('Vui lòng nhập SL kiểm hoặc tích chọn "Không tìm thấy dụng cụ".');
      return;
    }

    const parsedActualQty =
      formData.actualQtyStr.trim() === ''
        ? null
        : parseVietnameseNumber(formData.actualQtyStr);

    const trimmedProposal = formData.proposal.trim();
    const hasActualQty = parsedActualQty !== null;

    setIsSubmitting(true);
    try {
      let payloadToSave: Partial<DCDNItem>;
      if (editingItem) {
        let initialObj: Record<string, any> = {};
        try {
          if (initialSnapshot) initialObj = JSON.parse(initialSnapshot);
        } catch {}

        payloadToSave = { code: editingItem.code };
        if (formData.name.trim() !== (initialObj.name || '')) {
          payloadToSave.name = formData.name.trim();
        }
        if (formData.warehouse !== (initialObj.warehouse || '')) {
          payloadToSave.warehouse = formData.warehouse;
        }
        if (formData.location.trim() !== (initialObj.location || '')) {
          payloadToSave.location = formData.location.trim();
        }
        if (formData.actualQtyStr !== initialObj.actualQtyStr) {
          payloadToSave.actualQty = parsedActualQty;
          if (hasActualQty) {
            payloadToSave.auditedAt = getTodayDDMMYY();
            payloadToSave.auditor = currentUserName;
          }
        }
        if (trimmedProposal !== (initialObj.proposal || '')) {
          payloadToSave.proposal = trimmedProposal;
        }
        if (formData.proposalReason.trim() !== (initialObj.proposalReason || '')) {
          payloadToSave.proposalReason = trimmedProposal ? formData.proposalReason.trim() : '';
        }
        if (formData.notes !== (initialObj.notes || '')) {
          payloadToSave.notes = formData.notes;
        }
        if (formData.notFound !== Boolean(initialObj.notFound)) {
          payloadToSave.notFound = formData.notFound;
        }
        if (selectedImageFile || formData.image !== (initialObj.image || '')) {
          payloadToSave.image = formData.image || undefined;
        }
      } else {
        payloadToSave = {
          code: formData.code,
          unit: formData.unit,
          bookQty: parseVietnameseNumber(formData.bookQtyStr),
          name: formData.name.trim(),
          warehouse: formData.warehouse,
          location: formData.location.trim(),
          actualQty: parsedActualQty,
          proposal: trimmedProposal,
          proposalReason: trimmedProposal ? formData.proposalReason.trim() : '',
          image: formData.image || undefined,
          notes: formData.notes,
          notFound: formData.notFound,
          auditedAt: hasActualQty ? getTodayDDMMYY() : undefined,
          auditor: hasActualQty ? currentUserName : undefined,
        };
      }

      await onSave(payloadToSave, selectedImageFile);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const showRowAudit = formData.actualQtyStr.trim() !== '' && formData.auditedAt.trim() !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-slate-800">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 pt-3 pb-3.5 bg-blue-600 text-white flex flex-col shrink-0">
          <div className="w-10 h-1 bg-white/40 rounded-full mx-auto mb-2 sm:hidden" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-700/70 rounded-xl text-white">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg leading-tight">
                  Thông tin kiểm kê DCĐN
                </h3>
                <p className="text-xs text-blue-100">
                  Xem và cập nhật số lượng kiểm kê dụng cụ đo nghiệm, đồ nghề
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {editingItem && canDelete && (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="p-1.5 rounded-xl text-red-100 hover:text-white bg-red-500/25 hover:bg-red-600 transition-colors cursor-pointer"
                  title="Xóa dụng cụ này"
                  aria-label="Xóa dụng cụ"
                >
                  <Trash2 className="w-5 h-5 text-red-200 hover:text-white" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-blue-100 hover:text-white hover:bg-blue-700 transition-colors"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {otherEditors.length > 0 && (
            <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-300/40 text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-300" />
              <span>
                <strong>{otherEditors.map((e) => e.userName).join(', ')}</strong> cũng đang mở dụng cụ này! Cẩn trọng kiểm tra để tránh ghi đè dữ liệu.
              </span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 no-scrollbar">
          {isReadOnly && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-xs sm:text-sm font-semibold">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Chế độ chỉ xem thông tin (Tài khoản hiện tại không có quyền kiểm kê DCĐN)</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Hàng 1: Mã dụng cụ + Tên dụng cụ (trái), Hình ảnh (phải) */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <div className="flex-1 flex flex-col justify-between gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã DCĐN
                </label>
                <input
                  type="text"
                  value={formData.code}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed text-sm font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên dụng cụ đo nghiệm / đồ nghề <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập tên dụng cụ..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 resize-none leading-snug break-words"
                />
              </div>
            </div>

            {/* Cột phải: Hình ảnh */}
            <div className="w-full sm:w-60 shrink-0 flex flex-col">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hình ảnh dụng cụ
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
                          className="absolute top-0 right-0 p-1 bg-white/95 hover:bg-red-50 text-red-600 rounded-lg border border-slate-200 shadow-2xs"
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
                      className="flex-1 py-1 px-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 py-1 px-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Chụp ảnh</span>
                    </button>
                  </div>
                )}

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

          {/* Hàng 2: ĐVT, SL tồn, SL kiểm, Vị trí (KHÔNG CÓ NHẬP, XUẤT) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ĐVT
              </label>
              <input
                type="text"
                value={formData.unit}
                readOnly
                disabled
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SL tồn (sổ sách)
              </label>
              <input
                type="text"
                value={formData.bookQtyStr}
                readOnly
                disabled
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed text-sm font-semibold text-right"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  SL kiểm {!formData.notFound && <span className="text-red-500">*</span>}
                </label>
                {editingItem && !isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const bookFormatted = formatVietnameseNumber(editingItem.bookQty);
                      setFormData((prev) => ({
                        ...prev,
                        actualQtyStr: bookFormatted,
                        notFound: false,
                      }));
                      setHasSubmitted(false);
                      setError('');
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-colors"
                    title="Điền nhanh bằng SL sổ sách (SL tồn)"
                  >
                    Khớp số tồn
                  </button>
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                disabled={isReadOnly}
                value={formData.actualQtyStr}
                onChange={(e) => {
                  const formatted = formatVNInputLive(e.target.value);
                  setFormData({ ...formData, actualQtyStr: formatted });
                  if (formatted.trim() !== '') {
                    setHasSubmitted(false);
                    setError('');
                  }
                }}
                placeholder="VD: 5"
                className={`w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 text-sm font-semibold text-right text-blue-700 ${
                  showActualQtyError
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {showActualQtyError && (
                <p className="mt-1 text-[11px] font-medium text-red-600">
                  Bắt buộc nhập SL kiểm
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vị trí
              </label>
              <input
                type="text"
                list="modal-dcdn-location-options"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Nhập hoặc chọn vị trí..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <datalist id="modal-dcdn-location-options">
                {WAREHOUSE_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Hàng 3: Đề xuất xử lý */}
          <div className="relative" ref={proposalMenuRef}>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Đề xuất xử lý
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={formData.proposal}
                onFocus={() => setIsProposalMenuOpen(true)}
                onChange={(e) => {
                  setFormData({ ...formData, proposal: e.target.value });
                  setIsProposalMenuOpen(true);
                }}
                placeholder="Chọn hoặc nhập đề xuất mới (VD: Xin thanh lý, Xin hiệu chuẩn...)..."
                className="w-full pl-3 pr-12 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {formData.proposal && (
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, proposal: '', proposalReason: '' })
                  }
                  title="Xóa đề xuất"
                  className="absolute right-7 text-red-500 hover:text-red-700 p-0.5 rounded-full hover:bg-red-50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsProposalMenuOpen((prev) => !prev)}
                title="Chọn từ danh sách"
                className="absolute right-2 text-slate-400 hover:text-slate-700 p-0.5"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {isProposalMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-30 max-h-44 overflow-y-auto p-1">
                {proposalOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, proposal: opt });
                      setIsProposalMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      formData.proposal === opt
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hàng 4: Ghi chú và Lý do xử lý */}
          <div
            className={`grid gap-3 ${
              formData.proposal.trim() !== '' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Nhập ghi chú tình trạng dụng cụ..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
              />
            </div>

            {formData.proposal.trim() !== '' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do xử lý
                </label>
                <textarea
                  rows={3}
                  value={formData.proposalReason}
                  onChange={(e) =>
                    setFormData({ ...formData, proposalReason: e.target.value })
                  }
                  placeholder="Nhập lý do đề xuất xử lý..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                />
              </div>
            )}
          </div>

          {/* Hàng 5: Ngày kiểm & User kiểm */}
          {showRowAudit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày kiểm kê
                </label>
                <input
                  type="text"
                  value={formData.auditedAt}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  User kiểm kê
                </label>
                <input
                  type="text"
                  value={formData.auditor || currentUserName}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed text-sm font-medium"
                />
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {!isReadOnly ? (
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.notFound}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData({ ...formData, notFound: checked });
                    if (checked) {
                      setHasSubmitted(false);
                      setError('');
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Không tìm thấy dụng cụ (Cần tìm)</span>
              </label>
            ) : <div />}

            <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors text-center cursor-pointer"
              >
                {isReadOnly ? 'Đóng' : 'Hủy'}
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={isSubmitting || !isDirty}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-center cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Modal Xác nhận xóa dụng cụ DCĐN */}
      {isConfirmDeleteOpen && editingItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in text-slate-800">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Xác nhận xóa dụng cụ DCĐN
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bạn có chắc chắn muốn xóa dụng cụ này khỏi hệ thống kiểm kê?
                </p>
              </div>
            </div>

            {/* Chi tiết dụng cụ bị xóa */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Mã dụng cụ:</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {editingItem.code}
                </span>
              </div>
              <div className="font-semibold text-slate-900 line-clamp-2">
                {editingItem.name}
              </div>
              <div className="flex items-center gap-3 text-slate-600 flex-wrap">
                <span>
                  Kho: <span className="font-medium">{editingItem.warehouse || '—'}</span>
                </span>
                <span>•</span>
                <span>
                  Vị trí: <span className="font-medium">{editingItem.location || '—'}</span>
                </span>
                <span>•</span>
                <span>
                  SL tồn: <strong className="text-slate-800">{editingItem.bookQty} {editingItem.unit}</strong>
                </span>
              </div>
            </div>

            <p className="text-xs text-red-600 font-medium">
              * Hành động này sẽ xóa dữ liệu vĩnh viễn khỏi hệ thống và không thể hoàn tác.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (onDelete && editingItem) {
                    setIsDeleting(true);
                    try {
                      await onDelete(editingItem.id);
                      setIsConfirmDeleteOpen(false);
                      onClose();
                    } finally {
                      setIsDeleting(false);
                    }
                  }
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-red-500/20 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
