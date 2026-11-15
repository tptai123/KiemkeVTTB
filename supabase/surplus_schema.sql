-- =============================================================================
-- SCHEMA BẢNG HÀNG DƯ (SURPLUS ITEMS) TRÊN SUPABASE
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- =============================================================================

-- 1. Tạo bảng public.hang_du
CREATE TABLE IF NOT EXISTS public.hang_du (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ten_vat_tu text NOT NULL,                                  -- Tên vật tư
  dvt text NOT NULL DEFAULT 'Cái',                           -- Đơn vị tính
  so_luong numeric NOT NULL DEFAULT 1,                       -- Số lượng
  vi_tri text DEFAULT '',                                    -- Vị trí kho / kệ
  tinh_trang text DEFAULT 'Mới 100%',                        -- Tình trạng
  quy_cach text DEFAULT '',                                  -- Quy cách kỹ thuật / Model
  ghi_chu text DEFAULT '',                                   -- Ghi chú thêm
  hinh_anh text DEFAULT '',                                  -- URL hình ảnh (lưu trên Storage bucket "File all")
  nguoi_tao text DEFAULT '',                                 -- Người tạo bản ghi
  ngay_tao timestamptz NOT NULL DEFAULT now(),               -- Dùng sắp xếp dữ liệu mới nhất lên trên
  ngay_cap_nhat timestamptz NOT NULL DEFAULT now()
);

-- 2. Đánh Index phục vụ tìm kiếm & lọc nhanh
CREATE INDEX IF NOT EXISTS idx_hang_du_ten_vat_tu ON public.hang_du (ten_vat_tu);
CREATE INDEX IF NOT EXISTS idx_hang_du_tinh_trang ON public.hang_du (tinh_trang);
CREATE INDEX IF NOT EXISTS idx_hang_du_vi_tri ON public.hang_du (vi_tri);
CREATE INDEX IF NOT EXISTS idx_hang_du_ngay_tao ON public.hang_du (ngay_tao DESC);

-- 3. Trigger tự động cập nhật ngay_cap_nhat
CREATE OR REPLACE FUNCTION public.cap_nhat_thoi_gian_hang_du()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ngay_cap_nhat = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hang_du_updated_at ON public.hang_du;
CREATE TRIGGER trg_hang_du_updated_at
BEFORE UPDATE ON public.hang_du
FOR EACH ROW
EXECUTE FUNCTION public.cap_nhat_thoi_gian_hang_du();

-- 4. Bật Row Level Security (RLS) cho bảng public.hang_du
ALTER TABLE public.hang_du ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon and auth read hang_du" ON public.hang_du;
CREATE POLICY "Allow anon and auth read hang_du"
ON public.hang_du FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow anon and auth insert hang_du" ON public.hang_du;
CREATE POLICY "Allow anon and auth insert hang_du"
ON public.hang_du FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and auth update hang_du" ON public.hang_du;
CREATE POLICY "Allow anon and auth update hang_du"
ON public.hang_du FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and auth delete hang_du" ON public.hang_du;
CREATE POLICY "Allow anon and auth delete hang_du"
ON public.hang_du FOR DELETE
TO anon, authenticated
USING (true);

-- 5. Bật Realtime cho bảng hang_du
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'hang_du'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hang_du;
  END IF;
END $$;

-- 6. Cấu hình Storage Bucket cho hình ảnh hàng dư
-- Tùy chọn A: Tạo bucket riêng "File hang du" (Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('File hang du', 'File hang du', true)
ON CONFLICT (id) DO NOTHING;

-- Cho phép upload và xem ảnh trong bucket "File hang du"
DROP POLICY IF EXISTS "Public Access File hang du" ON storage.objects;
CREATE POLICY "Public Access File hang du"
ON storage.objects FOR ALL
TO anon, authenticated
USING (bucket_id = 'File hang du')
WITH CHECK (bucket_id = 'File hang du');

-- 7. Khởi tạo một số dữ liệu mẫu ban đầu (Nếu chưa có)
INSERT INTO public.hang_du (ten_vat_tu, dvt, so_luong, vi_tri, tinh_trang, quy_cach, ghi_chu, hinh_anh)
VALUES
  ('Switch Cisco 24 Port Gigabit Catalyst Enterprise', 'Cái', 3, 'Kho A - Tầng 1 (Kệ IT)', 'Mới 100%', 'Catalyst C1000-24T-4G-L', 'Nguyên đai nguyên kiện, chưa qua sử dụng', 'https://izangkbanoxeivphmwyc.supabase.co/storage/v1/object/public/File%20all/cisco.svg'),
  ('Ghế gấp inox chân quỳ bọc đệm', 'Cái', 15, 'Kho B - Tầng hầm', 'Đã qua sử dụng (Còn 90%)', 'Inox Hòa Phát G04', 'Chân inox hơi xước nhẹ, đệm mút còn tốt', 'https://izangkbanoxeivphmwyc.supabase.co/storage/v1/object/public/File%20all/chair.svg'),
  ('Máy đếm tiền Silicon MC-8800 thông minh', 'Cái', 2, 'Phòng Kế toán - Tủ thiết bị', 'Mới 95%', 'Phát hiện tiền giả thông minh', 'Hoạt động tốt, đầy đủ phụ kiện', 'https://izangkbanoxeivphmwyc.supabase.co/storage/v1/object/public/File%20all/printer.svg'),
  ('Bộ kìm và tua vít đa năng hợp kim', 'Bộ', 5, 'Kho vật tư xưởng', 'Mới 100%', 'Stanley 65-980 43 chi tiết', 'Chưa bóc tem hộp', 'https://izangkbanoxeivphmwyc.supabase.co/storage/v1/object/public/File%20all/drill.svg')
ON CONFLICT DO NOTHING;
