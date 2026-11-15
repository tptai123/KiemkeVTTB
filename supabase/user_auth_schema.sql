-- =============================================================================
-- Schema Supabase cho Bảng User & Liên kết Supabase Auth
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- =============================================================================

-- 1. Bảng public.users liên kết 1-1 với auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  ho_va_ten text NOT NULL,                                -- Họ và tên (hiển thị dòng 1 Navbar)
  vai_tro text NOT NULL DEFAULT 'Chuyên viên Kiểm kê',    -- Vai trò (hiển thị dòng 2 Navbar)
  phong_ban text NOT NULL DEFAULT 'Phòng Tài chính - Kế toán', -- Phòng ban
  so_dien_thoai text DEFAULT '',                          -- Số điện thoại
  avatar_url text DEFAULT '',                             -- Ảnh đại diện
  trang_thai text NOT NULL DEFAULT 'Hoạt động',           -- 'Hoạt động' | 'Tạm khóa'
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  ngay_cap_nhat timestamptz NOT NULL DEFAULT now()
);

-- Index phục vụ tìm kiếm & lọc nhanh
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users (auth_id);
CREATE INDEX IF NOT EXISTS idx_users_vai_tro ON public.users (vai_tro);
CREATE INDEX IF NOT EXISTS idx_users_trang_thai ON public.users (trang_thai);

-- 2. Trigger tự động cập nhật ngay_cap_nhat
CREATE OR REPLACE FUNCTION public.cap_nhat_thoi_gian_users()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ngay_cap_nhat = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.cap_nhat_thoi_gian_users();

-- 3. Trigger tự động đồng bộ khi tạo tài khoản trong auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, ho_va_ten, vai_tro, phong_ban, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'ho_va_ten', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'vai_tro', NEW.raw_user_meta_data->>'role', 'Chuyên viên Kiểm kê'),
    COALESCE(NEW.raw_user_meta_data->>'phong_ban', NEW.raw_user_meta_data->>'department', 'Bộ phận Kiểm kê'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_id = EXCLUDED.auth_id,
    ho_va_ten = COALESCE(EXCLUDED.ho_va_ten, public.users.ho_va_ten),
    vai_tro = COALESCE(EXCLUDED.vai_tro, public.users.vai_tro);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. Bật Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon and auth read users" ON public.users;
CREATE POLICY "Allow anon and auth read users"
ON public.users
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow anon and auth insert users" ON public.users;
CREATE POLICY "Allow anon and auth insert users"
ON public.users
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and auth update users" ON public.users;
CREATE POLICY "Allow anon and auth update users"
ON public.users
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and auth delete users" ON public.users;
CREATE POLICY "Allow anon and auth delete users"
ON public.users
FOR DELETE
TO anon, authenticated
USING (true);

-- 5. Bật Realtime cho bảng users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
END $$;

-- 6. Khởi tạo một số tài khoản mẫu ban đầu (Nếu chưa có)
INSERT INTO public.users (email, ho_va_ten, vai_tro, phong_ban, so_dien_thoai, trang_thai, avatar_url)
VALUES 
  ('kiem.nv@doanhnghiep.vn', 'Nguyễn Văn Kiểm', 'Chuyên viên Kiểm kê', 'Phòng Tài chính - Kế toán', '0912345678', 'Hoạt động', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces'),
  ('admin@doanhnghiep.vn', 'Phạm Thị Lan', 'Quản trị hệ thống', 'Phòng Công nghệ thông tin', '0987654321', 'Hoạt động', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces'),
  ('mai.tt@doanhnghiep.vn', 'Trần Thị Mai', 'Thủ kho', 'Bộ phận Kho & VTTB', '0933445566', 'Hoạt động', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces'),
  ('long.lh@doanhnghiep.vn', 'Lê Hoàng Long', 'Kiểm toán viên', 'Phòng Kiểm toán nội bộ', '0977889900', 'Hoạt động', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces')
ON CONFLICT (email) DO NOTHING;
