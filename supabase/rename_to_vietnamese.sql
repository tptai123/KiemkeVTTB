-- =============================================================================
-- Script chuyển đổi bảng `inventory_items` đã tạo sang tiếng Việt không dấu (`kiem_ke_vttb`)
-- An toàn cho dữ liệu đã có sẵn. Chạy 1 lần trong Supabase SQL Editor.
-- =============================================================================

-- 1. Xóa trigger cũ (vì trigger cũ gán NEW.updated_at)
DROP TRIGGER IF EXISTS trg_inventory_items_updated_at ON public.inventory_items;

-- 2. Đổi tên các cột sang tiếng Việt không dấu
ALTER TABLE public.inventory_items RENAME COLUMN code TO ma_vat_tu;
ALTER TABLE public.inventory_items RENAME COLUMN name TO ten_vat_tu;
ALTER TABLE public.inventory_items RENAME COLUMN group_name TO nhom_vat_tu;
ALTER TABLE public.inventory_items RENAME COLUMN unit TO don_vi_tinh;
ALTER TABLE public.inventory_items RENAME COLUMN warehouse TO kho;
ALTER TABLE public.inventory_items RENAME COLUMN location TO vi_tri;
ALTER TABLE public.inventory_items RENAME COLUMN book_qty TO sl_so_sach;
ALTER TABLE public.inventory_items RENAME COLUMN actual_qty TO sl_kiem_ke;
ALTER TABLE public.inventory_items RENAME COLUMN import_qty TO sl_nhap;
ALTER TABLE public.inventory_items RENAME COLUMN export_qty TO sl_xuat;
ALTER TABLE public.inventory_items RENAME COLUMN proposal TO de_xuat;
ALTER TABLE public.inventory_items RENAME COLUMN proposal_reason TO ly_do_xu_ly;
ALTER TABLE public.inventory_items RENAME COLUMN not_found TO khong_tim_thay;
ALTER TABLE public.inventory_items RENAME COLUMN image TO hinh_anh;
ALTER TABLE public.inventory_items RENAME COLUMN notes TO ghi_chu;
ALTER TABLE public.inventory_items RENAME COLUMN audited_at TO ngay_kiem_ke;
ALTER TABLE public.inventory_items RENAME COLUMN auditor TO nguoi_kiem_ke;
ALTER TABLE public.inventory_items RENAME COLUMN created_at TO ngay_tao;
ALTER TABLE public.inventory_items RENAME COLUMN updated_at TO ngay_cap_nhat;

-- 3. Đổi tên bảng sang kiem_ke_vttb
ALTER TABLE public.inventory_items RENAME TO kiem_ke_vttb;

-- 4. Tạo lại trigger cập nhật ngay_cap_nhat
CREATE OR REPLACE FUNCTION public.cap_nhat_thoi_gian_vttb()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ngay_cap_nhat = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kiem_ke_vttb_updated_at ON public.kiem_ke_vttb;
CREATE TRIGGER trg_kiem_ke_vttb_updated_at
BEFORE UPDATE ON public.kiem_ke_vttb
FOR EACH ROW
EXECUTE FUNCTION public.cap_nhat_thoi_gian_vttb();
