export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  group: string;
  model: string;
  unit: string;
  warehouse: string; // Cột Kho
  location: string;  // Cột Vị trí
  bookQty: number;
  actualQty: number | null; // null means 'Chưa kiểm kê'
  importQty?: number | null; // Cột Nhập (số)
  exportQty?: number | null; // Cột Xuất (số)
  proposal?: string; // Cột Đề xuất
  proposalReason?: string; // Lý do xử lý
  notFound?: boolean; // Không tìm thấy vật tư (Cần tìm)
  image?: string; // Hình ảnh vật tư
  notes: string;
  auditedAt?: string;
  auditor?: string;
}

export interface SurplusItem {
  id: string;
  code: string;
  name: string;
  group: string;
  model: string;
  unit: string;
  quantity: number;
  condition: string;
  location: string;
  reason: string;
  notes: string;
  createdAt: string;
}

export type InventoryStatus = 'all' | 'match' | 'missing' | 'surplus' | 'pending';

export interface UserInfo {
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
}
