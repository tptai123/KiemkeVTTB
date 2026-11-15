import { supabase } from '../lib/supabase';
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
