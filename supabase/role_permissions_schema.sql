-- =============================================================================
-- Schema Supabase cho Bảng Phân quyền (role_permissions)
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role text PRIMARY KEY,                   -- 'Quản trị viên' | 'Thủ kho' | 'Người kiểm kê'
  permissions jsonb NOT NULL,              -- Cấu hình quyền hạn dạng JSON
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bật Row Level Security (RLS)
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all read role_permissions" ON public.role_permissions;
CREATE POLICY "Allow all read role_permissions"
ON public.role_permissions
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow all write role_permissions" ON public.role_permissions;
CREATE POLICY "Allow all write role_permissions"
ON public.role_permissions
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Bật Realtime cho bảng role_permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'role_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;
  END IF;
END $$;

-- Khởi tạo dữ liệu phân quyền mặc định ban đầu
INSERT INTO public.role_permissions (role, permissions)
VALUES
  (
    'Quản trị viên',
    '{
      "canViewInventory": true,
      "canAuditInventory": true,
      "canManageInventoryItems": true,
      "canExcelInventory": true,
      "canViewDCDN": true,
      "canAuditDCDN": true,
      "canManageDCDNItems": true,
      "canExcelDCDN": true,
      "canViewSurplus": true,
      "canAddSurplus": true,
      "canManageSurplus": true,
      "canManageUsers": true,
      "canManagePermissions": true
    }'::jsonb
  ),
  (
    'Thủ kho',
    '{
      "canViewInventory": true,
      "canAuditInventory": false,
      "canManageInventoryItems": true,
      "canExcelInventory": true,
      "canViewDCDN": true,
      "canAuditDCDN": false,
      "canManageDCDNItems": true,
      "canExcelDCDN": true,
      "canViewSurplus": true,
      "canAddSurplus": true,
      "canManageSurplus": true,
      "canManageUsers": false,
      "canManagePermissions": false
    }'::jsonb
  ),
  (
    'Người kiểm kê',
    '{
      "canViewInventory": true,
      "canAuditInventory": true,
      "canManageInventoryItems": false,
      "canExcelInventory": false,
      "canViewDCDN": true,
      "canAuditDCDN": true,
      "canManageDCDNItems": false,
      "canExcelDCDN": false,
      "canViewSurplus": true,
      "canAddSurplus": true,
      "canManageSurplus": false,
      "canManageUsers": false,
      "canManagePermissions": false
    }'::jsonb
  )
ON CONFLICT (role) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  updated_at = now();
