import { supabase } from '../lib/supabase';
import { AppRole, RolePermissions } from '../types';

export const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  'Quản trị viên': {
    canViewInventory: true,
    canAuditInventory: true,
    canManageInventoryItems: true,
    canExcelInventory: true,
    canViewDCDN: true,
    canAuditDCDN: true,
    canManageDCDNItems: true,
    canExcelDCDN: true,
    canViewSurplus: true,
    canAddSurplus: true,
    canManageSurplus: true,
    canManageUsers: true,
    canManagePermissions: true,
  },
  'Thủ kho': {
    canViewInventory: true,
    canAuditInventory: false,
    canManageInventoryItems: true,
    canExcelInventory: true,
    canViewDCDN: true,
    canAuditDCDN: false,
    canManageDCDNItems: true,
    canExcelDCDN: true,
    canViewSurplus: true,
    canAddSurplus: true,
    canManageSurplus: true,
    canManageUsers: false,
    canManagePermissions: false,
  },
  'Người kiểm kê': {
    canViewInventory: true,
    canAuditInventory: true,
    canManageInventoryItems: false,
    canExcelInventory: false,
    canViewDCDN: true,
    canAuditDCDN: true,
    canManageDCDNItems: false,
    canExcelDCDN: false,
    canViewSurplus: true,
    canAddSurplus: true,
    canManageSurplus: false,
    canManageUsers: false,
    canManagePermissions: false,
  },
};

export interface PermissionFeatureDef {
  key: keyof RolePermissions;
  module: string;
  name: string;
  description: string;
}

export const PERMISSION_FEATURES: PermissionFeatureDef[] = [
  // VTTB
  {
    key: 'canViewInventory',
    module: 'Kiểm kê VTTB',
    name: 'Xem danh sách & tra cứu',
    description: 'Truy cập module và xem thông tin các vật tư thiết bị',
  },
  {
    key: 'canAuditInventory',
    module: 'Kiểm kê VTTB',
    name: 'Nhập kiểm kê & chụp ảnh',
    description: 'Nhập số lượng thực tế, chụp ảnh và đề xuất xử lý',
  },
  {
    key: 'canManageInventoryItems',
    module: 'Kiểm kê VTTB',
    name: 'Thêm mới / Xóa vật tư',
    description: 'Thêm mới mã vật tư vào danh mục hoặc xóa bản ghi',
  },
  {
    key: 'canExcelInventory',
    module: 'Kiểm kê VTTB',
    name: 'Nhập & Xuất file Excel',
    description: 'Tải xuống báo cáo kiểm kê hoặc tải lên file dữ liệu Excel',
  },

  // DCĐN
  {
    key: 'canViewDCDN',
    module: 'Kiểm kê DCĐN',
    name: 'Xem danh sách & tra cứu',
    description: 'Truy cập module và xem dụng cụ đo nghiệm, đồ nghề',
  },
  {
    key: 'canAuditDCDN',
    module: 'Kiểm kê DCĐN',
    name: 'Nhập kiểm kê & chụp ảnh',
    description: 'Ghi nhận số lượng kiểm kê thực tế của DCĐN',
  },
  {
    key: 'canManageDCDNItems',
    module: 'Kiểm kê DCĐN',
    name: 'Thêm mới / Xóa dụng cụ',
    description: 'Thêm dụng cụ mới hoặc xóa dụng cụ khỏi danh mục',
  },
  {
    key: 'canExcelDCDN',
    module: 'Kiểm kê DCĐN',
    name: 'Nhập & Xuất file Excel',
    description: 'Xuất danh sách DCĐN ra Excel và import file',
  },

  // Hàng dư
  {
    key: 'canViewSurplus',
    module: 'Hàng dư',
    name: 'Xem danh sách hàng dư',
    description: 'Tra cứu danh sách các mặt hàng phát hiện dư thừa',
  },
  {
    key: 'canAddSurplus',
    module: 'Hàng dư',
    name: 'Thêm bản ghi hàng dư',
    description: 'Tạo bản ghi hàng dư mới khi phát hiện thừa',
  },
  {
    key: 'canManageSurplus',
    module: 'Hàng dư',
    name: 'Sửa & Xóa hàng dư',
    description: 'Chỉnh sửa quy cách, số lượng hoặc xóa bản ghi hàng dư',
  },

  // Hệ thống
  {
    key: 'canManageUsers',
    module: 'Quản lý User',
    name: 'Quản lý tài khoản User',
    description: 'Tạo tài khoản, phân vai trò, tạm khóa và xóa người dùng',
  },
  {
    key: 'canManagePermissions',
    module: 'Phân quyền',
    name: 'Cấu hình phân quyền',
    description: 'Xem và điều chỉnh bảng ma trận quyền của hệ thống',
  },
];

/**
 * Tải danh sách quyền của các vai trò từ Supabase bảng role_permissions
 */
export async function fetchRolePermissionsFromSupabase(): Promise<Record<AppRole, RolePermissions>> {
  if (!supabase) return DEFAULT_ROLE_PERMISSIONS;

  try {
    const { data, error } = await supabase.from('role_permissions').select('*');
    if (error || !data || data.length === 0) {
      return DEFAULT_ROLE_PERMISSIONS;
    }

    const result = { ...DEFAULT_ROLE_PERMISSIONS };
    for (const row of data) {
      if (row.role && row.permissions) {
        const role = row.role as AppRole;
        if (result[role]) {
          result[role] = { ...result[role], ...row.permissions };
        }
      }
    }
    return result;
  } catch (err) {
    console.warn('Lỗi lấy quyền từ Supabase, sử dụng mặc định:', err);
    return DEFAULT_ROLE_PERMISSIONS;
  }
}

/**
 * Lưu toàn bộ cấu hình quyền lên Supabase
 */
export async function saveAllRolePermissionsToSupabase(
  permissionsMap: Record<AppRole, RolePermissions>
): Promise<void> {
  if (!supabase) return;

  const rows = (Object.keys(permissionsMap) as AppRole[]).map((role) => ({
    role,
    permissions: permissionsMap[role],
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('role_permissions').upsert(rows);
  if (error) {
    console.error('Lỗi lưu quyền lên Supabase:', error);
    throw error;
  }
}
