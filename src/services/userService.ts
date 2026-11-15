import { supabase, createIsolatedAuthClient } from '../lib/supabase';
import { UserInfo } from '../types';

export interface UserRow {
  id: string;
  auth_id?: string | null;
  email: string;
  ho_va_ten: string;
  vai_tro: string;
  phong_ban: string;
  so_dien_thoai?: string | null;
  avatar_url?: string | null;
  trang_thai: string;
  ngay_tao?: string;
  ngay_cap_nhat?: string;
}

export const mapRowToUserInfo = (row: UserRow): UserInfo => ({
  id: row.id,
  authId: row.auth_id || undefined,
  name: row.ho_va_ten || '',
  email: row.email || '',
  role: row.vai_tro || 'Chuyên viên Kiểm kê',
  department: row.phong_ban || 'Phòng Tài chính - Kế toán',
  phone: row.so_dien_thoai || '',
  avatar:
    row.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(row.ho_va_ten || 'User')}&background=0D8ABC&color=fff`,
  status: row.trang_thai || 'Hoạt động',
  createdAt: row.ngay_tao,
});

export const mapUserInfoToRow = (user: Partial<UserInfo>): Partial<UserRow> => {
  const row: Partial<UserRow> = {};
  if (user.email !== undefined) row.email = user.email.trim().toLowerCase();
  if (user.name !== undefined) row.ho_va_ten = user.name.trim();
  if (user.role !== undefined) row.vai_tro = user.role.trim();
  if (user.department !== undefined) row.phong_ban = user.department.trim();
  if (user.phone !== undefined) row.so_dien_thoai = user.phone.trim();
  if (user.avatar !== undefined) row.avatar_url = user.avatar.trim();
  if (user.status !== undefined) row.trang_thai = user.status.trim();
  if (user.authId !== undefined) row.auth_id = user.authId;
  return row;
};

/**
 * Lấy danh sách toàn bộ người dùng từ bảng public.users
 */
export async function fetchUsersFromSupabase(): Promise<UserInfo[]> {
  const client = supabase;
  if (!client) throw new Error('Supabase client chưa được cấu hình');

  const { data, error } = await client
    .from('users')
    .select('*')
    .order('ngay_tao', { ascending: false });

  if (error) {
    console.error('Error fetching users from Supabase:', error);
    throw error;
  }

  return (data as UserRow[]).map(mapRowToUserInfo);
}

/**
 * Thêm mới người dùng vào bảng public.users
 */
export async function createUserInSupabase(user: Partial<UserInfo>): Promise<UserInfo> {
  const client = supabase;
  if (!client) throw new Error('Supabase client chưa được cấu hình');

  const row = mapUserInfoToRow(user);
  const { data, error } = await client
    .from('users')
    .insert([row])
    .select()
    .single();

  if (error) {
    console.error('Error creating user in Supabase:', error);
    throw error;
  }

  return mapRowToUserInfo(data as UserRow);
}

/**
 * Cập nhật thông tin người dùng trong bảng public.users
 */
export async function updateUserInSupabase(
  id: string,
  user: Partial<UserInfo>
): Promise<UserInfo> {
  const client = supabase;
  if (!client) throw new Error('Supabase client chưa được cấu hình');

  const row = mapUserInfoToRow(user);
  const { data, error } = await client
    .from('users')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating user in Supabase:', error);
    throw error;
  }

  return mapRowToUserInfo(data as UserRow);
}

/**
 * Quản trị viên tạo tài khoản có kèm mật khẩu:
 * Đồng thời đồng bộ sang cả auth.users và public.users để người dùng có thể đăng nhập ngay lập tức.
 */
export async function createAuthUserAndProfile(
  user: Partial<UserInfo>,
  password?: string
): Promise<UserInfo> {
  const client = supabase;
  if (!client) throw new Error('Supabase client chưa được cấu hình');

  const cleanEmail = (user.email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanEmail) {
    throw new Error('Vui lòng nhập email đăng nhập');
  }

  // 1. Nếu có mật khẩu, ưu tiên gọi PostgreSQL RPC admin_create_user nếu đã chạy script SQL
  if (cleanPassword) {
    try {
      const { data: rpcRes, error: rpcErr } = await client.rpc('admin_create_user', {
        new_email: cleanEmail,
        new_password: cleanPassword,
        new_name: user.name || '',
        new_role: user.role || 'Người kiểm kê',
        new_department: user.department || 'Phòng Tài chính - Kế toán',
        new_phone: user.phone || '',
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        // Truy vấn lại bản ghi từ public.users
        const { data: profile } = await client
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (profile) {
          return mapRowToUserInfo(profile as UserRow);
        }
      }
    } catch (err) {
      console.warn('RPC admin_create_user không khả dụng, chuyển sang đăng ký qua Auth Client:', err);
    }

    // 2. Fallback: Dùng client Supabase độc lập (không lưu session) để đăng ký vào auth.users
    const authClient = createIsolatedAuthClient();
    if (authClient) {
      const { data: authData, error: authErr } = await authClient.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            ho_va_ten: user.name,
            vai_tro: user.role,
            phong_ban: user.department,
            so_dien_thoai: user.phone,
          },
        },
      });

      if (authErr && !authErr.message.toLowerCase().includes('already registered')) {
        throw new Error(`Lỗi tạo tài khoản Auth: ${authErr.message}`);
      }

      if (authData?.user?.id) {
        user.authId = authData.user.id;
      }
    }
  }

  // 3. Đảm bảo bản ghi được lưu hoàn chỉnh vào public.users
  const row = mapUserInfoToRow(user);

  // Thử insert hoặc update nếu đã có trigger tạo trước
  const { data: existing } = await client
    .from('users')
    .select('*')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existing) {
    const { data: updated, error: updateErr } = await client
      .from('users')
      .update(row)
      .eq('id', existing.id)
      .select()
      .single();

    if (updateErr) throw updateErr;
    return mapRowToUserInfo(updated as UserRow);
  }

  const { data: created, error: createErr } = await client
    .from('users')
    .insert([row])
    .select()
    .single();

  if (createErr) throw createErr;
  return mapRowToUserInfo(created as UserRow);
}

/**
 * Quản trị viên cập nhật mật khẩu cho một tài khoản người dùng
 */
export async function adminUpdateUserPassword(
  email: string,
  newPassword: string
): Promise<void> {
  const client = supabase;
  if (!client) throw new Error('Supabase client chưa được cấu hình');

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = newPassword.trim();

  if (!cleanPassword || cleanPassword.length < 6) {
    throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
  }

  const { data, error } = await client.rpc('admin_set_user_password', {
    target_email: cleanEmail,
    new_password: cleanPassword,
  });

  if (error || (data && !data.success)) {
    const msg = error?.message || data?.message || 'Không thể cập nhật mật khẩu';
    throw new Error(msg);
  }
}

/**
 * Xóa người dùng khỏi bảng public.users
 */
export async function deleteUserInSupabase(id: string): Promise<void> {
  const client = supabase;
  if (!client) throw new Error('Supabase client chưa được cấu hình');

  const { error } = await client
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting user in Supabase:', error);
    throw error;
  }
}
