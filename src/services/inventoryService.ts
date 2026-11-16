import { supabase } from '../lib/supabase';
import { InventoryItem } from '../types';
import { ConcurrencyConflictError } from './errors';

const TABLE_NAME = 'kiem_ke_vttb';
export const STORAGE_BUCKET = 'File all';

const sanitizeCodeForFileName = (code: string): string => {
  const trimmed = (code || 'VTTB').trim();
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
};

export const uploadInventoryImageToSupabase = async (
  file: File,
  itemCode: string
): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const safeCode = sanitizeCodeForFileName(itemCode);
  const rawExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const ext = rawExt.replace(/[^a-z0-9]/g, '') || 'jpg';
  const fileName = `${safeCode}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
};

export interface InventoryItemRow {
  id: string;
  ma_vat_tu: string;
  ten_vat_tu: string;
  nhom_vat_tu: string;
  model: string;
  don_vi_tinh: string;
  kho: string;
  vi_tri: string;
  sl_so_sach: number;
  sl_kiem_ke: number | null;
  sl_nhap: number | null;
  sl_xuat: number | null;
  de_xuat: string;
  ly_do_xu_ly: string;
  khong_tim_thay: boolean;
  hinh_anh: string | null;
  ghi_chu: string;
  ngay_kiem_ke: string | null;
  nguoi_kiem_ke: string | null;
  ngay_tao?: string;
  ngay_cap_nhat?: string;
}

const mapRowToInventoryItem = (row: InventoryItemRow): InventoryItem => ({
  id: row.id,
  code: row.ma_vat_tu,
  name: row.ten_vat_tu,
  group: row.nhom_vat_tu || '',
  model: row.model || '',
  unit: row.don_vi_tinh || 'Chiếc',
  warehouse: row.kho || 'Kho chính',
  location: row.vi_tri || '',
  bookQty: Number(row.sl_so_sach ?? 0),
  actualQty: row.sl_kiem_ke !== null && row.sl_kiem_ke !== undefined ? Number(row.sl_kiem_ke) : null,
  importQty: row.sl_nhap !== null && row.sl_nhap !== undefined ? Number(row.sl_nhap) : null,
  exportQty: row.sl_xuat !== null && row.sl_xuat !== undefined ? Number(row.sl_xuat) : null,
  proposal: row.de_xuat || '',
  proposalReason: row.ly_do_xu_ly || '',
  notFound: Boolean(row.khong_tim_thay),
  image: row.hinh_anh || undefined,
  notes: row.ghi_chu || '',
  auditedAt: row.ngay_kiem_ke || undefined,
  auditor: row.nguoi_kiem_ke || undefined,
  updatedAt: row.ngay_cap_nhat || undefined,
});
export { mapRowToInventoryItem };

const mapInventoryItemToRowPayload = (
  item: Partial<InventoryItem>
): Partial<InventoryItemRow> => {
  const payload: Partial<InventoryItemRow> = {};
  if (item.code !== undefined) payload.ma_vat_tu = item.code;
  if (item.name !== undefined) payload.ten_vat_tu = item.name;
  if (item.group !== undefined) payload.nhom_vat_tu = item.group;
  if (item.model !== undefined) payload.model = item.model;
  if (item.unit !== undefined) payload.don_vi_tinh = item.unit;
  if (item.warehouse !== undefined) payload.kho = item.warehouse;
  if (item.location !== undefined) payload.vi_tri = item.location;
  if (item.bookQty !== undefined) payload.sl_so_sach = item.bookQty;
  if (item.actualQty !== undefined) payload.sl_kiem_ke = item.actualQty;
  if (item.importQty !== undefined) payload.sl_nhap = item.importQty ?? null;
  if (item.exportQty !== undefined) payload.sl_xuat = item.exportQty ?? null;
  if (item.proposal !== undefined) payload.de_xuat = item.proposal || '';
  if (item.proposalReason !== undefined) payload.ly_do_xu_ly = item.proposalReason || '';
  if (item.notFound !== undefined) payload.khong_tim_thay = Boolean(item.notFound);
  if ('image' in item) payload.hinh_anh = item.image || null;
  if (item.notes !== undefined) payload.ghi_chu = item.notes || '';
  if ('auditedAt' in item) payload.ngay_kiem_ke = item.auditedAt || null;
  if ('auditor' in item) payload.nguoi_kiem_ke = item.auditor || null;
  return payload;
};

const PAGE_SIZE = 1000;

// Selected columns for list view — skips heavy/unused columns on initial load
const LIST_SELECT_COLUMNS =
  'id,ma_vat_tu,ten_vat_tu,nhom_vat_tu,model,don_vi_tinh,kho,vi_tri,sl_so_sach,sl_kiem_ke,sl_nhap,sl_xuat,de_xuat,ly_do_xu_ly,ghi_chu,hinh_anh,khong_tim_thay,ngay_kiem_ke,nguoi_kiem_ke,ngay_cap_nhat';

export const fetchInventoryItems = async (): Promise<InventoryItem[]> => {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  // Step 1: Get total count with a lightweight head request
  const { count, error: countError } = await supabase
    .from(TABLE_NAME)
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;
  const total = count ?? 0;
  if (total === 0) return [];

  // Step 2: Fire all batch requests in parallel
  const batchCount = Math.ceil(total / PAGE_SIZE);
  const batchPromises = Array.from({ length: batchCount }, (_, i) =>
    supabase!
      .from(TABLE_NAME)
      .select(LIST_SELECT_COLUMNS)
      .order('ma_vat_tu', { ascending: true })
      .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1)
  );

  const results = await Promise.all(batchPromises);

  const allRows: InventoryItemRow[] = [];
  for (const { data, error } of results) {
    if (error) throw error;
    if (data) allRows.push(...(data as InventoryItemRow[]));
  }

  return allRows.map(mapRowToInventoryItem);
};

export const updateInventoryItemInSupabase = async (
  id: string,
  updates: Partial<InventoryItem>,
  expectedUpdatedAt?: string
): Promise<InventoryItem> => {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const payload = mapInventoryItemToRowPayload(updates);
  payload.ngay_cap_nhat = new Date().toISOString();

  let query = supabase
    .from(TABLE_NAME)
    .update(payload)
    .eq('id', id);

  if (expectedUpdatedAt) {
    query = query.eq('ngay_cap_nhat', expectedUpdatedAt);
  }

  const { data, error } = await query.select('*');

  if (error) throw error;

  if (!data || data.length === 0) {
    if (expectedUpdatedAt) {
      throw new ConcurrencyConflictError();
    }
    throw new Error('Không tìm thấy bản ghi để cập nhật.');
  }

  return mapRowToInventoryItem(data[0] as InventoryItemRow);
};

export const createInventoryItemInSupabase = async (
  item: Partial<InventoryItem>
): Promise<InventoryItem> => {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const payload = mapInventoryItemToRowPayload(item);
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return mapRowToInventoryItem(data as InventoryItemRow);
};

export const bulkCreateInventoryItemsInSupabase = async (
  items: Partial<InventoryItem>[]
): Promise<InventoryItem[]> => {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình.');
  }
  if (items.length === 0) return [];

  const CHUNK_SIZE = 500;
  const createdAll: InventoryItem[] = [];

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE).map(mapInventoryItemToRowPayload);
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(chunk)
      .select('*');

    if (error) throw error;
    if (data) {
      createdAll.push(...(data as InventoryItemRow[]).map(mapRowToInventoryItem));
    }
  }

  return createdAll;
};
