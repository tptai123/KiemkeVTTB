import { supabase } from '../lib/supabase';
import { SurplusItem } from '../types';

export interface SurplusRow {
  id: string;
  ten_vat_tu: string;
  dvt: string;
  so_luong: number;
  vi_tri: string;
  tinh_trang: string;
  quy_cach: string;
  ghi_chu: string;
  hinh_anh?: string | null;
  nguoi_tao?: string | null;
  ngay_tao?: string;
  ngay_cap_nhat?: string;
}

export const mapRowToSurplusItem = (row: SurplusRow): SurplusItem => ({
  id: row.id,
  code: `SD-${row.id.slice(0, 6)}`,
  name: row.ten_vat_tu || '',
  group: 'Hàng dư',
  model: row.quy_cach || '',
  unit: row.dvt || 'Cái',
  quantity: Number(row.so_luong) || 1,
  condition: row.tinh_trang || 'Mới 100%',
  location: row.vi_tri || '',
  reason: '',
  notes: row.ghi_chu || '',
  image: row.hinh_anh || undefined,
  createdAt: row.ngay_tao || new Date().toISOString(),
});

export const mapSurplusItemToRow = (item: Partial<SurplusItem>): Partial<SurplusRow> => {
  const row: Partial<SurplusRow> = {};
  if (item.name !== undefined) row.ten_vat_tu = item.name.trim();
  if (item.unit !== undefined) row.dvt = item.unit.trim();
  if (item.quantity !== undefined) row.so_luong = Number(item.quantity) || 1;
  if (item.location !== undefined) row.vi_tri = item.location.trim();
  if (item.condition !== undefined) row.tinh_trang = item.condition.trim();
  if (item.model !== undefined) row.quy_cach = item.model.trim();
  if (item.notes !== undefined) row.ghi_chu = item.notes.trim();
  if (item.image !== undefined) row.hinh_anh = item.image;
  return row;
};

/**
 * Lấy danh sách hàng dư từ bảng public.hang_du (Sắp xếp mới nhất lên đầu)
 */
export async function fetchSurplusItemsFromSupabase(): Promise<SurplusItem[]> {
  const client = supabase;
  if (!client) throw new Error('Supabase client chưa được cấu hình');

  const { data, error } = await client
    .from('hang_du')
    .select('*')
    .order('ngay_tao', { ascending: false });

  if (error) {
    console.error('Lỗi truy vấn bảng hang_du từ Supabase:', error);
    throw error;
  }

  return (data as SurplusRow[]).map(mapRowToSurplusItem);
}

/**
 * Thêm mới vật tư hàng dư vào Supabase
 */
export async function createSurplusItemInSupabase(
  item: Partial<SurplusItem>
): Promise<SurplusItem> {
  const client = supabase;
  if (!client) throw new Error('Supabase client chưa được cấu hình');

  const row = mapSurplusItemToRow(item);
  const { data, error } = await client
    .from('hang_du')
    .insert([row])
    .select()
    .single();

  if (error) {
    console.error('Lỗi thêm mới hàng dư lên Supabase:', error);
    throw error;
  }

  return mapRowToSurplusItem(data as SurplusRow);
}

/**
 * Cập nhật thông tin vật tư hàng dư trong Supabase
 */
export async function updateSurplusItemInSupabase(
  id: string,
  item: Partial<SurplusItem>
): Promise<SurplusItem> {
  const client = supabase;
  if (!client) throw new Error('Supabase client chưa được cấu hình');

  const row = mapSurplusItemToRow(item);
  const { data, error } = await client
    .from('hang_du')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Lỗi cập nhật hàng dư trên Supabase:', error);
    throw error;
  }

  return mapRowToSurplusItem(data as SurplusRow);
}

/**
 * Xóa vật tư hàng dư khỏi Supabase
 */
export async function deleteSurplusItemInSupabase(id: string): Promise<void> {
  const client = supabase;
  if (!client) throw new Error('Supabase client chưa được cấu hình');

  const { error } = await client
    .from('hang_du')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Lỗi xóa hàng dư trên Supabase:', error);
    throw error;
  }
}

export const SURPLUS_STORAGE_BUCKET = 'File hang du';
export const FALLBACK_SURPLUS_BUCKET = 'File all';

/**
 * Tải hình ảnh vật tư hàng dư lên Storage Bucket trong Supabase
 * Ưu tiên bucket chuyên biệt "File hang du", tự động fallback sang "File all/hang_du/" nếu chưa tạo bucket riêng
 */
export async function uploadSurplusImageToSupabase(
  file: File,
  prefix: string = 'hang_du'
): Promise<string> {
  const client = supabase;
  if (!client) throw new Error('Supabase client chưa được cấu hình');

  const fileExt = file.name.split('.').pop() || 'jpg';
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanPrefix}_${Date.now()}.${fileExt}`;

  // 1. Thử tải lên bucket chuyên biệt "File hang du"
  let targetBucket = SURPLUS_STORAGE_BUCKET;
  let targetPath = fileName;

  let { error: uploadError } = await client.storage
    .from(targetBucket)
    .upload(targetPath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

  // 2. Nếu bucket chưa tồn tại (error not found), tự động fallback sang bucket có sẵn "File all"
  if (
    uploadError &&
    (uploadError.message?.toLowerCase().includes('not found') ||
      (uploadError as any).statusCode === 404 ||
      (uploadError as any).statusCode === '404')
  ) {
    targetBucket = FALLBACK_SURPLUS_BUCKET;
    targetPath = `hang_du/${fileName}`;

    const fallbackRes = await client.storage
      .from(targetBucket)
      .upload(targetPath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

    uploadError = fallbackRes.error;
  }

  if (uploadError) {
    console.error(`Lỗi tải ảnh hàng dư lên Storage bucket (${targetBucket}):`, uploadError);
    throw uploadError;
  }

  const { data } = client.storage.from(targetBucket).getPublicUrl(targetPath);
  return data.publicUrl;
}
