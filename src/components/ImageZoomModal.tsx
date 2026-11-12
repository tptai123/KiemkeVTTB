import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  itemCode: string;
  itemName: string;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  itemCode,
  itemName,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imageAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);

  // Support mouse wheel zooming cleanly without passive listener warnings
  useEffect(() => {
    const el = imageAreaRef.current;
    if (!isOpen || !el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setScale((prev) => {
        const next = Math.min(Math.max(prev + delta, 0.5), 5);
        if (next <= 1) {
          setPosition({ x: 0, y: 0 });
        }
        return Number(next.toFixed(2));
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    /* Không làm mờ và không làm tối giao diện phía sau; chỉ đóng khi click dấu X */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden flex flex-col">
        {/* Header với 2 trường Mã vật tư & Tên vật tư nằm ngang hàng nhau + nút X */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-slate-500">Mã vật tư:</span>
              <span className="text-sm font-mono font-bold text-blue-700">{itemCode}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Tên vật tư:</span>
              <span className="text-sm font-bold text-slate-900 truncate" title={itemName}>
                {itemName}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            title="Đóng"
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Khu vực hiển thị hình ảnh hỗ trợ phóng to bằng lăn chuột */}
        <div
          ref={imageAreaRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative bg-slate-100 h-[420px] sm:h-[480px] flex items-center justify-center overflow-hidden select-none ${
            scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
          }`}
        >
          <img
            src={imageUrl}
            alt={itemName}
            draggable={false}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            }}
            className="max-h-full max-w-full object-contain pointer-events-none"
          />

          {/* Thanh điều khiển thu phóng nhỏ gọn ở góc dưới */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 border border-slate-200 rounded-xl px-2 py-1 shadow-md text-xs text-slate-700">
            <button
              type="button"
              onClick={() =>
                setScale((prev) => {
                  const next = Math.max(Number((prev - 0.25).toFixed(2)), 0.5);
                  if (next <= 1) setPosition({ x: 0, y: 0 });
                  return next;
                })
              }
              title="Thu nhỏ"
              className="p-1 hover:bg-slate-100 rounded-lg"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="min-w-[46px] text-center font-semibold">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() =>
                setScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 5))
              }
              title="Phóng to"
              className="p-1 hover:bg-slate-100 rounded-lg"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
              title="Đặt lại kích thước (100%)"
              className="p-1 hover:bg-slate-100 rounded-lg border-l border-slate-200 ml-0.5 pl-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
