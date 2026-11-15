-- =============================================================================
-- FIX SUPABASE AUTH: Tự động xác thực Email (Auto Confirm User)
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- =============================================================================

-- 1. Kích hoạt xác thực (Confirm) cho TOÀN BỘ tài khoản hiện có trong auth.users
-- Lưu ý: Chỉ cần update email_confirmed_at, cột confirmed_at là cột tự sinh (generated column) nên Supabase sẽ tự tính toán
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- 2. Trigger tự động xác thực (Auto Confirm) cho TẤT CẢ tài khoản tạo mới về sau
CREATE OR REPLACE FUNCTION public.auto_confirm_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_auth_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_auth_user
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_auth_user();
