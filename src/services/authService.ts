import { supabase } from '../lib/supabase';
import { UserInfo } from '../types';
import { mapRowToUserInfo, UserRow } from './userService';

export const LOCAL_AUTH_KEY = 'kiem_ke_vttb_auth_user';

/**
 * Đăng nhập: Đối chiếu nghiêm ngặt với hệ thống Supabase Auth.
 * Nếu không khớp hoặc không tồn tại trong auth.users -> ném lỗi 'Tài khoản hoặc mật khẩu không đúng'
 */
export async function signIn(email: string, password: string): Promise<UserInfo> {
  const cleanEmail = email.trim().toLowerCase();

  if (!supabase) {
    throw new Error('Chưa cấu hình kết nối Supabase.');
  }

  // 1. Xác thực trực tiếp với Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    console.error('Supabase signInWithPassword error:', error);
    const errText = (error.message || '').toLowerCase();

    if (errText.includes('email not confirmed') || errText.includes('not confirmed')) {
      throw new Error(
        'Email chưa được xác thực trong Supabase. Vui lòng bật "Auto Confirm" hoặc tắt "Confirm email" trong Supabase Auth Settings.'
      );
    }

    // Lỗi sai thông tin đăng nhập hoặc chưa confirm (Supabase trả về invalid_credentials)
    throw new Error('Tài khoản hoặc mật khẩu không đúng');
  }

  if (!data.user) {
    throw new Error('Tài khoản hoặc mật khẩu không đúng');
  }

  // 2. Lấy thông tin hồ sơ người dùng từ bảng public.users
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .or(`auth_id.eq.${data.user.id},email.eq.${cleanEmail}`)
    .maybeSingle();

  if (profile) {
    if (profile.trang_thai === 'Tạm khóa') {
      await supabase.auth.signOut();
      throw new Error('Tài khoản của bạn hiện đang bị tạm khóa. Vui lòng liên hệ quản trị viên.');
    }
    const user = mapRowToUserInfo(profile as UserRow);
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
    return user;
  }

  // 3. Nếu tài khoản tồn tại trong auth.users nhưng chưa có trong public.users
  const fallbackUser: UserInfo = {
    id: data.user.id,
    authId: data.user.id,
    name:
      data.user.user_metadata?.ho_va_ten ||
      data.user.user_metadata?.name ||
      cleanEmail.split('@')[0],
    email: cleanEmail,
    role: data.user.user_metadata?.vai_tro || 'Chuyên viên Kiểm kê',
    department: data.user.user_metadata?.phong_ban || 'Bộ phận Kiểm kê',
    avatar:
      data.user.user_metadata?.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanEmail)}&background=0284c7&color=fff`,
    status: 'Hoạt động',
  };
  localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(fallbackUser));
  return fallbackUser;
}

export async function signOut(): Promise<void> {
  localStorage.removeItem(LOCAL_AUTH_KEY);
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign-out warning:', err);
    }
  }
}

export async function getSavedSessionUser(): Promise<UserInfo | null> {
  // 1. Kiểm tra session từ Supabase nếu có
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const email = data.session.user.email?.toLowerCase();
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .or(`auth_id.eq.${data.session.user.id},email.eq.${email}`)
          .maybeSingle();

        if (profile) {
          if (profile.trang_thai === 'Tạm khóa') {
            await supabase.auth.signOut();
            localStorage.removeItem(LOCAL_AUTH_KEY);
            return null;
          }
          const user = mapRowToUserInfo(profile as UserRow);
          localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
          return user;
        }
      }
    } catch (e) {
      console.warn('Check Supabase session error:', e);
    }
  }

  // 2. Kiểm tra LocalStorage
  const saved = localStorage.getItem(LOCAL_AUTH_KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as UserInfo;
    } catch {
      localStorage.removeItem(LOCAL_AUTH_KEY);
    }
  }

  return null;
}
