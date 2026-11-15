-- =============================================================================
-- HỖ TRỢ TẠO TÀI KHOẢN VÀ MẬT KHẨU BỞI QUẢN TRỊ VIÊN (ADMIN CREATE USER)
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- =============================================================================

-- 1. Bật extension pgcrypto để mã hóa mật khẩu theo chuẩn bcrypt của Supabase Auth
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Hàm Quản trị viên tạo tài khoản và mật khẩu trực tiếp vào auth.users & public.users
CREATE OR REPLACE FUNCTION public.admin_create_user(
  new_email text,
  new_password text,
  new_name text DEFAULT '',
  new_role text DEFAULT 'Người kiểm kê',
  new_department text DEFAULT 'Phòng Tài chính - Kế toán',
  new_phone text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  new_auth_id uuid;
  enc_pw text;
  clean_email text;
BEGIN
  clean_email := lower(trim(new_email));

  -- Kiểm tra định dạng email và mật khẩu
  IF clean_email = '' OR position('@' in clean_email) = 0 THEN
    RETURN json_build_object('success', false, 'message', 'Địa chỉ email không hợp lệ');
  END IF;

  IF length(new_password) < 6 THEN
    RETURN json_build_object('success', false, 'message', 'Mật khẩu phải có ít nhất 6 ký tự');
  END IF;

  -- Kiểm tra xem email đã tồn tại trong auth.users chưa
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email) THEN
    -- Nếu đã có trong auth.users, cập nhật mật khẩu mới và metadata
    enc_pw := crypt(new_password, gen_salt('bf'));
    UPDATE auth.users
    SET encrypted_password = enc_pw,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_build_object(
          'ho_va_ten', new_name,
          'vai_tro', new_role,
          'phong_ban', new_department,
          'so_dien_thoai', new_phone
        ),
        updated_at = now()
    WHERE email = clean_email
    RETURNING id INTO new_auth_id;

    -- Đồng bộ cập nhật public.users
    INSERT INTO public.users (
      auth_id, email, ho_va_ten, vai_tro, phong_ban, so_dien_thoai, trang_thai
    ) VALUES (
      new_auth_id, clean_email, new_name, new_role, new_department, new_phone, 'Hoạt động'
    )
    ON CONFLICT (email) DO UPDATE SET
      auth_id = EXCLUDED.auth_id,
      ho_va_ten = EXCLUDED.ho_va_ten,
      vai_tro = EXCLUDED.vai_tro,
      phong_ban = EXCLUDED.phong_ban,
      so_dien_thoai = EXCLUDED.so_dien_thoai,
      trang_thai = 'Hoạt động',
      ngay_cap_nhat = now();

    RETURN json_build_object('success', true, 'auth_id', new_auth_id, 'message', 'Đã cập nhật mật khẩu và thông tin tài khoản');
  END IF;

  -- Tạo mới trong auth.users
  enc_pw := crypt(new_password, gen_salt('bf'));
  new_auth_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_auth_id,
    'authenticated',
    'authenticated',
    clean_email,
    enc_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'ho_va_ten', new_name,
      'vai_tro', new_role,
      'phong_ban', new_department,
      'so_dien_thoai', new_phone
    ),
    now(),
    now()
  );

  -- Thêm vào public.users
  INSERT INTO public.users (
    auth_id,
    email,
    ho_va_ten,
    vai_tro,
    phong_ban,
    so_dien_thoai,
    trang_thai
  ) VALUES (
    new_auth_id,
    clean_email,
    new_name,
    new_role,
    new_department,
    new_phone,
    'Hoạt động'
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_id = EXCLUDED.auth_id,
    ho_va_ten = EXCLUDED.ho_va_ten,
    vai_tro = EXCLUDED.vai_tro,
    phong_ban = EXCLUDED.phong_ban,
    so_dien_thoai = EXCLUDED.so_dien_thoai,
    trang_thai = 'Hoạt động',
    ngay_cap_nhat = now();

  RETURN json_build_object('success', true, 'auth_id', new_auth_id);
END;
$$;

-- 3. Hàm đặt lại mật khẩu cho tài khoản (Admin Reset Password)
CREATE OR REPLACE FUNCTION public.admin_set_user_password(
  target_email text,
  new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  enc_pw text;
  clean_email text;
BEGIN
  clean_email := lower(trim(target_email));

  IF length(new_password) < 6 THEN
    RETURN json_build_object('success', false, 'message', 'Mật khẩu phải có ít nhất 6 ký tự');
  END IF;

  enc_pw := crypt(new_password, gen_salt('bf'));

  UPDATE auth.users
  SET encrypted_password = enc_pw,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE email = clean_email;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy tài khoản trong auth.users');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
