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
  updatedAt?: string;
}

export interface DCDNItem {
  id: string;
  code: string;
  name: string;
  group: string;
  model: string;
  unit: string;
  warehouse: string; // Cột Kho
  location: string;  // Cột Vị trí
  bookQty: number;   // SL tồn (SL sổ sách)
  actualQty: number | null; // null = Chưa kiểm kê
  proposal?: string; // Cột Đề xuất
  proposalReason?: string; // Lý do xử lý
  notFound?: boolean; // Không tìm thấy (Cần tìm)
  image?: string; // Hình ảnh dụng cụ
  notes: string;
  auditedAt?: string;
  auditor?: string;
  updatedAt?: string;
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
  image?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CollaboratorPresence {
  userId: string;
  userName: string;
  userRole?: string;
  activeModule?: string;
  editingItemId?: string | null;
  editingItemCode?: string | null;
  onlineAt?: string;
}

export type InventoryStatus = 'all' | 'match' | 'missing' | 'surplus' | 'pending';

export type AppRole = 'Quản trị viên' | 'Thủ kho' | 'Người kiểm kê';

export interface RolePermissions {
  // Kiểm kê VTTB
  canViewInventory: boolean;
  canAuditInventory: boolean;
  canManageInventoryItems: boolean;
  canExcelInventory: boolean;

  // Kiểm kê DCĐN
  canViewDCDN: boolean;
  canAuditDCDN: boolean;
  canManageDCDNItems: boolean;
  canExcelDCDN: boolean;

  // Hàng dư
  canViewSurplus: boolean;
  canAddSurplus: boolean;
  canManageSurplus: boolean;

  // Hệ thống
  canManageUsers: boolean;
  canManagePermissions: boolean;
}

export interface UserInfo {
  id?: string;
  authId?: string;
  name: string; // ho_va_ten
  email: string;
  role: string; // vai_tro
  department: string; // phong_ban
  phone?: string; // so_dien_thoai
  avatar?: string; // avatar_url
  status?: string; // trang_thai
  createdAt?: string;
}
