import { supabase } from '../lib/supabase';
import { DCDNItem } from '../types';
import { ConcurrencyConflictError } from './errors';

const TABLE_NAME = 'kiem_ke_dcdn';
export const STORAGE_BUCKET = 'File dcdn';
const FALLBACK_BUCKET = 'File all';

const sanitizeCodeForFileName = (code: string): string => {
  const trimmed = (code || 'DCDN').trim();
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
};

export const uploadDCDNImageToSupabase = async (
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

  // Try uploading to 'File dcdn', fallback to 'File all' if bucket not found
  let targetBucket = STORAGE_BUCKET;
  let uploadRes = await supabase.storage
    .from(targetBucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

  if (uploadRes.error && uploadRes.error.message?.includes('not found')) {
    targetBucket = FALLBACK_BUCKET;
    uploadRes = await supabase.storage
      .from(targetBucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });
  }

  if (uploadRes.error) throw uploadRes.error;

  const { data } = supabase.storage.from(targetBucket).getPublicUrl(fileName);
  return data.publicUrl;
};

export interface DCDNItemRow {
  id: string;
  ma_dung_cu?: string;
  ma_vat_tu?: string;
  ten_dung_cu?: string;
  ten_vat_tu?: string;
  nhom_dung_cu?: string;
  nhom_vat_tu?: string;
  model: string;
  don_vi_tinh: string;
  kho: string;
  vi_tri: string;
  sl_so_sach: number;
  sl_kiem_ke: number | null;
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

export const mapRowToDCDNItem = (row: DCDNItemRow): DCDNItem => ({
  id: row.id,
  code: row.ma_dung_cu || row.ma_vat_tu || '',
  name: row.ten_dung_cu || row.ten_vat_tu || '',
  group: row.nhom_dung_cu || row.nhom_vat_tu || 'Dụng cụ đo nghiệm',
  model: row.model || '',
  unit: row.don_vi_tinh || 'Bộ',
  warehouse: row.kho || 'Kho DCĐN',
  location: row.vi_tri || '',
  bookQty: Number(row.sl_so_sach ?? 0),
  actualQty: row.sl_kiem_ke !== null && row.sl_kiem_ke !== undefined ? Number(row.sl_kiem_ke) : null,
  proposal: row.de_xuat || '',
  proposalReason: row.ly_do_xu_ly || '',
  notFound: Boolean(row.khong_tim_thay),
  image: row.hinh_anh || undefined,
  notes: row.ghi_chu || '',
  auditedAt: row.ngay_kiem_ke || undefined,
  auditor: row.nguoi_kiem_ke || undefined,
  updatedAt: row.ngay_cap_nhat || undefined,
});

export const mapDCDNItemToRow = (item: Partial<DCDNItem>): Partial<DCDNItemRow> => {
  const row: Record<string, unknown> = {};

  if (item.code !== undefined) {
    row.ma_dung_cu = item.code;
  }
  if (item.name !== undefined) {
    row.ten_dung_cu = item.name;
  }
  if (item.group !== undefined) row.nhom_dung_cu = item.group;
  if (item.model !== undefined) row.model = item.model;
  if (item.unit !== undefined) row.don_vi_tinh = item.unit;
  if (item.warehouse !== undefined) row.kho = item.warehouse;
  if (item.location !== undefined) row.vi_tri = item.location;
  if (item.bookQty !== undefined) row.sl_so_sach = item.bookQty;
  if (item.actualQty !== undefined) row.sl_kiem_ke = item.actualQty;
  if (item.proposal !== undefined) row.de_xuat = item.proposal;
  if (item.proposalReason !== undefined) row.ly_do_xu_ly = item.proposalReason;
  if (item.notFound !== undefined) row.khong_tim_thay = item.notFound;
  if (item.image !== undefined) row.hinh_anh = item.image || null;
  if (item.notes !== undefined) row.ghi_chu = item.notes;
  if (item.auditedAt !== undefined) row.ngay_kiem_ke = item.auditedAt || null;
  if (item.auditor !== undefined) row.nguoi_kiem_ke = item.auditor || null;

  return row as Partial<DCDNItemRow>;
};

export const fetchDCDNItems = async (): Promise<DCDNItem[]> => {
  if (!supabase) return [];

  const PAGE_SIZE = 1000;
  let allRows: DCDNItemRow[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('ma_dung_cu', { ascending: true })
      .range(from, to);

    if (error) {
      console.warn('Lỗi khi tải dữ liệu kiem_ke_dcdn từ Supabase:', error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRows = allRows.concat(data as DCDNItemRow[]);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    }
  }

  return allRows.map(mapRowToDCDNItem);
};

export const updateDCDNItemInSupabase = async (
  id: string,
  updates: Partial<DCDNItem>,
  expectedUpdatedAt?: string
): Promise<DCDNItem> => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');

  const rowUpdates = mapDCDNItemToRow(updates);
  rowUpdates.ngay_cap_nhat = new Date().toISOString();

  let query = supabase
    .from(TABLE_NAME)
    .update(rowUpdates)
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

  return mapRowToDCDNItem(data[0] as DCDNItemRow);
};

export const createDCDNItemInSupabase = async (
  item: Partial<DCDNItem>
): Promise<DCDNItem> => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');

  const row = mapDCDNItemToRow(item);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([row])
    .select()
    .single();

  if (error) throw error;
  return mapRowToDCDNItem(data as DCDNItemRow);
};

export const bulkCreateDCDNItemsInSupabase = async (
  items: Partial<DCDNItem>[]
): Promise<number> => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  if (items.length === 0) return 0;

  const rows = items.map((i) => mapDCDNItemToRow(i));

  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let idx = 0; idx < rows.length; idx += BATCH_SIZE) {
    const chunk = rows.slice(idx, idx + BATCH_SIZE);
    const { error } = await supabase.from(TABLE_NAME).insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
  }

  return inserted;
};
