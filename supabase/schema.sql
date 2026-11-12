-- =============================================================================
-- Schema Supabase cho Module Kiểm kê VTTB (Tên bảng & cột tiếng Việt không dấu)
-- Chạy script này trong Supabase Dashboard -> SQL Editor (nếu tạo bảng mới từ đầu)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kiem_ke_vttb (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_vat_tu text NOT NULL UNIQUE,                    -- Mã vật tư
  ten_vat_tu text NOT NULL,                          -- Tên vật tư
  nhom_vat_tu text NOT NULL DEFAULT 'Thiết bị IT',   -- Nhóm vật tư
  model text NOT NULL DEFAULT '',                    -- Model / Quy cách
  don_vi_tinh text NOT NULL DEFAULT 'Chiếc',         -- Đơn vị tính (ĐVT)
  kho text NOT NULL DEFAULT 'Kho chính',             -- Kho
  vi_tri text NOT NULL DEFAULT '',                   -- Vị trí
  sl_so_sach numeric(14, 3) NOT NULL DEFAULT 0,      -- SL sổ sách
  sl_kiem_ke numeric(14, 3) NULL,                    -- SL kiểm kê (NULL = Chưa kiểm kê)
  sl_nhap numeric(14, 3) NULL,                       -- SL nhập
  sl_xuat numeric(14, 3) NULL,                       -- SL xuất
  de_xuat text NOT NULL DEFAULT '',                  -- Đề xuất xử lý
  ly_do_xu_ly text NOT NULL DEFAULT '',              -- Lý do xử lý
  khong_tim_thay boolean NOT NULL DEFAULT false,     -- Không tìm thấy vật tư (Cần tìm)
  hinh_anh text NULL,                                -- Hình ảnh vật tư
  ghi_chu text NOT NULL DEFAULT '',                  -- Ghi chú
  ngay_kiem_ke text NULL,                            -- Ngày kiểm kê (DD/MM/YY)
  nguoi_kiem_ke text NULL,                           -- User kiểm kê
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  ngay_cap_nhat timestamptz NOT NULL DEFAULT now()
);

-- Index phục vụ tìm kiếm / lọc nhanh cho ~10.000+ dòng
CREATE INDEX IF NOT EXISTS idx_kiem_ke_vttb_ma_vat_tu ON public.kiem_ke_vttb (ma_vat_tu);
CREATE INDEX IF NOT EXISTS idx_kiem_ke_vttb_vi_tri ON public.kiem_ke_vttb (vi_tri);
CREATE INDEX IF NOT EXISTS idx_kiem_ke_vttb_de_xuat ON public.kiem_ke_vttb (de_xuat);
CREATE INDEX IF NOT EXISTS idx_kiem_ke_vttb_khong_tim_thay ON public.kiem_ke_vttb (khong_tim_thay);
CREATE INDEX IF NOT EXISTS idx_kiem_ke_vttb_sl_kiem_ke ON public.kiem_ke_vttb (sl_kiem_ke);

-- Trigger tự động cập nhật ngay_cap_nhat
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

-- Bật Row Level Security (RLS)
ALTER TABLE public.kiem_ke_vttb ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon full access to kiem_ke_vttb" ON public.kiem_ke_vttb;
CREATE POLICY "Allow anon full access to kiem_ke_vttb"
ON public.kiem_ke_vttb
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- =============================================================================
-- Storage Bucket "File all" để lưu hình ảnh vật tư
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('File all', 'File all', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read File all" ON storage.objects;
CREATE POLICY "Public read File all"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'File all');

DROP POLICY IF EXISTS "Allow upload File all" ON storage.objects;
CREATE POLICY "Allow upload File all"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'File all');

DROP POLICY IF EXISTS "Allow update File all" ON storage.objects;
CREATE POLICY "Allow update File all"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'File all')
WITH CHECK (bucket_id = 'File all');

-- =============================================================================
-- Bật Supabase Realtime cho bảng kiem_ke_vttb (đồng bộ nhiều người dùng)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'kiem_ke_vttb'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kiem_ke_vttb;
  END IF;
END $$;
