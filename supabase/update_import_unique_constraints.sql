-- =============================================================================
-- CẬP NHẬT RÀNG BUỘC UNIQUE CHO BẢNG KIỂM KÊ VTTB & DCĐN
-- Hỗ trợ cơ chế import kiểm tra trùng theo bộ 3 cột: (Mã, Tên, Kho)
-- Cùng Mã nhưng khác Kho hoặc khác Tên sẽ được import bình thường.
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- =============================================================================

-- 1. BẢNG KIỂM KÊ VTTB (kiem_ke_vttb)
-- Dọn dẹp các dòng trùng hoàn toàn bộ 3 (ma_vat_tu, ten_vat_tu, kho) nếu có trước đó
DELETE FROM public.kiem_ke_vttb a
USING public.kiem_ke_vttb b
WHERE a.id < b.id
  AND a.ma_vat_tu = b.ma_vat_tu
  AND a.ten_vat_tu = b.ten_vat_tu
  AND a.kho = b.kho;

-- Xóa bỏ các constraint unique cũ trên một mình cột ma_vat_tu
ALTER TABLE public.kiem_ke_vttb DROP CONSTRAINT IF EXISTS inventory_items_code_key;
ALTER TABLE public.kiem_ke_vttb DROP CONSTRAINT IF EXISTS kiem_ke_vttb_ma_vat_tu_key;

-- Thêm composite unique constraint trên bộ 3: (ma_vat_tu, ten_vat_tu, kho)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kiem_ke_vttb_unique_code_name_kho'
  ) THEN
    ALTER TABLE public.kiem_ke_vttb 
      ADD CONSTRAINT kiem_ke_vttb_unique_code_name_kho UNIQUE (ma_vat_tu, ten_vat_tu, kho);
  END IF;
END $$;


-- 2. BẢNG KIỂM KÊ DCĐN (kiem_ke_dcdn)
-- Dọn dẹp các dòng trùng hoàn toàn bộ 3 (ma_dung_cu, ten_dung_cu, kho) nếu có
DELETE FROM public.kiem_ke_dcdn a
USING public.kiem_ke_dcdn b
WHERE a.id < b.id
  AND a.ma_dung_cu = b.ma_dung_cu
  AND a.ten_dung_cu = b.ten_dung_cu
  AND a.kho = b.kho;

-- Xóa bỏ constraint unique cũ trên một mình cột ma_dung_cu
ALTER TABLE public.kiem_ke_dcdn DROP CONSTRAINT IF EXISTS kiem_ke_dcdn_ma_dung_cu_key;
ALTER TABLE public.kiem_ke_dcdn DROP CONSTRAINT IF EXISTS dcdn_items_code_key;

-- Thêm composite unique constraint trên bộ 3: (ma_dung_cu, ten_dung_cu, kho)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kiem_ke_dcdn_unique_code_name_kho'
  ) THEN
    ALTER TABLE public.kiem_ke_dcdn 
      ADD CONSTRAINT kiem_ke_dcdn_unique_code_name_kho UNIQUE (ma_dung_cu, ten_dung_cu, kho);
  END IF;
END $$;
