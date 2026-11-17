-- =============================================================================
-- Schema Supabase cho Module Kiểm kê DCĐN (Dụng cụ đo nghiệm / Dụng cụ đồ nghề)
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kiem_ke_dcdn (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_dung_cu text NOT NULL,                           -- Mã DCĐN
  ten_dung_cu text NOT NULL,                          -- Tên dụng cụ đồ nghề
  nhom_dung_cu text NOT NULL DEFAULT 'Dụng cụ đo nghiệm', -- Nhóm dụng cụ
  model text NOT NULL DEFAULT '',                     -- Model / Quy cách
  don_vi_tinh text NOT NULL DEFAULT 'Bộ',             -- Đơn vị tính (ĐVT)
  kho text NOT NULL DEFAULT 'Kho DCĐN',               -- Kho
  vi_tri text NOT NULL DEFAULT '',                    -- Vị trí kệ/tủ
  sl_so_sach numeric(14, 3) NOT NULL DEFAULT 0,       -- SL tồn (SL sổ sách)
  sl_kiem_ke numeric(14, 3) NULL,                     -- SL kiểm (NULL = Chưa kiểm)
  de_xuat text NOT NULL DEFAULT '',                   -- Đề xuất xử lý
  ly_do_xu_ly text NOT NULL DEFAULT '',               -- Lý do xử lý
  khong_tim_thay boolean NOT NULL DEFAULT false,      -- Không tìm thấy dụng cụ (Cần tìm)
  hinh_anh text NULL,                                 -- Hình ảnh dụng cụ
  ghi_chu text NOT NULL DEFAULT '',                   -- Ghi chú
  ngay_kiem_ke text NULL,                             -- Ngày kiểm kê (DD/MM/YY)
  nguoi_kiem_ke text NULL,                            -- Tên User kiểm kê
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  ngay_cap_nhat timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kiem_ke_dcdn_unique_code_name_kho UNIQUE (ma_dung_cu, ten_dung_cu, kho)
);

-- Index phục vụ tìm kiếm / lọc nhanh
CREATE INDEX IF NOT EXISTS idx_kiem_ke_dcdn_ma_dung_cu ON public.kiem_ke_dcdn (ma_dung_cu);
CREATE INDEX IF NOT EXISTS idx_kiem_ke_dcdn_vi_tri ON public.kiem_ke_dcdn (vi_tri);
CREATE INDEX IF NOT EXISTS idx_kiem_ke_dcdn_de_xuat ON public.kiem_ke_dcdn (de_xuat);
CREATE INDEX IF NOT EXISTS idx_kiem_ke_dcdn_khong_tim_thay ON public.kiem_ke_dcdn (khong_tim_thay);
CREATE INDEX IF NOT EXISTS idx_kiem_ke_dcdn_sl_kiem_ke ON public.kiem_ke_dcdn (sl_kiem_ke);

-- Trigger tự động cập nhật ngay_cap_nhat
CREATE OR REPLACE FUNCTION public.cap_nhat_thoi_gian_dcdn()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ngay_cap_nhat = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kiem_ke_dcdn_updated_at ON public.kiem_ke_dcdn;
CREATE TRIGGER trg_kiem_ke_dcdn_updated_at
BEFORE UPDATE ON public.kiem_ke_dcdn
FOR EACH ROW
EXECUTE FUNCTION public.cap_nhat_thoi_gian_dcdn();

-- Bật Row Level Security (RLS)
ALTER TABLE public.kiem_ke_dcdn ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon full access to kiem_ke_dcdn" ON public.kiem_ke_dcdn;
CREATE POLICY "Allow anon full access to kiem_ke_dcdn"
ON public.kiem_ke_dcdn
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- =============================================================================
-- Storage Bucket "File dcdn" để lưu hình ảnh dụng cụ đo nghiệm
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('File dcdn', 'File dcdn', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read File dcdn" ON storage.objects;
CREATE POLICY "Public read File dcdn"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'File dcdn');

DROP POLICY IF EXISTS "Allow upload File dcdn" ON storage.objects;
CREATE POLICY "Allow upload File dcdn"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'File dcdn');

DROP POLICY IF EXISTS "Allow update File dcdn" ON storage.objects;
CREATE POLICY "Allow update File dcdn"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'File dcdn')
WITH CHECK (bucket_id = 'File dcdn');

-- =============================================================================
-- Bật Supabase Realtime cho bảng kiem_ke_dcdn (đồng bộ nhiều người dùng)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'kiem_ke_dcdn'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kiem_ke_dcdn;
  END IF;
END $$;
