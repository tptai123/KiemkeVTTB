import React from 'react';
import { X, Info, CheckCircle2, AlertTriangle, XCircle, Clock, User, Tag } from 'lucide-react';
import { InventoryItem, SurplusItem } from '../types';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | SurplusItem | null;
  type: 'inventory' | 'surplus';
}

export const DetailModal: React.FC<DetailModalProps> = ({ isOpen, onClose, item, type }) => {
  if (!isOpen || !item) return null;

  const isInventory = type === 'inventory';
  const invItem = isInventory ? (item as InventoryItem) : null;
  const surItem = !isInventory ? (item as SurplusItem) : null;

  // Calculate status for inventory
  let statusBadge = null;
  if (invItem) {
    if (invItem.actualQty === null) {
      statusBadge = (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <Clock className="w-3.5 h-3.5" /> Chưa kiểm kê
        </span>
      );
    } else {
      const diff = invItem.actualQty - invItem.bookQty;
      if (diff === 0) {
        statusBadge = (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Khớp số lượng
          </span>
        );
      } else if (diff < 0) {
        statusBadge = (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" /> Thiếu ({Math.abs(diff)} {invItem.unit})
          </span>
        );
      } else {
        statusBadge = (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Thừa (+{diff} {invItem.unit})
          </span>
        );
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Chi tiết vật tư thiết bị</h3>
              <p className="text-xs text-slate-300">Mã: {item.code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg mb-2">
                <Tag className="w-3.5 h-3.5" /> {item.group}
              </span>
              <h4 className="text-xl font-bold text-slate-900">{item.name}</h4>
              <p className="text-sm text-slate-500 mt-0.5">{item.model || 'Không có quy cách'}</p>
            </div>
            {statusBadge}
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-xs text-slate-500 block">Đơn vị tính</span>
              <strong className="text-sm text-slate-800">{item.unit}</strong>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Mã định danh</span>
              <strong className="text-sm text-slate-800">{item.code}</strong>
            </div>

            {invItem && (
              <>
                <div>
                  <span className="text-xs text-slate-500 block">Số lượng sổ sách</span>
                  <strong className="text-sm text-slate-800">{invItem.bookQty} {invItem.unit}</strong>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Số lượng thực tế</span>
                  <strong className="text-sm text-blue-600">
                    {invItem.actualQty !== null ? `${invItem.actualQty} ${invItem.unit}` : 'Chưa kiểm kê'}
                  </strong>
                </div>
              </>
            )}

            {surItem && (
              <>
                <div>
                  <span className="text-xs text-slate-500 block">Số lượng hàng dư</span>
                  <strong className="text-sm text-emerald-600">{surItem.quantity} {surItem.unit}</strong>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Tình trạng vật tư</span>
                  <strong className="text-sm text-slate-800">{surItem.condition}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-slate-500 block">Kho / Vị trí lưu trữ</span>
                  <strong className="text-sm text-slate-800">{surItem.location}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-slate-500 block">Nguyên nhân dư thừa</span>
                  <strong className="text-sm text-slate-800">{surItem.reason}</strong>
                </div>
              </>
            )}
          </div>

          {invItem && (
            <div className="space-y-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Thời gian kiểm kê: <strong>{invItem.auditedAt || 'Chưa thực hiện'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>Người thực hiện: <strong>{invItem.auditor || 'Chưa phân công'}</strong></span>
              </div>
            </div>
          )}

          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Ghi chú</span>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700">
              {item.notes || 'Không có ghi chú nào.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
