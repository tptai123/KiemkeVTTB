import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  Users,
  RotateCcw,
  Save,
  Check,
  X,
  Boxes,
  ClipboardCheck,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AppRole, RolePermissions, UserInfo } from '../types';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_FEATURES,
  PermissionFeatureDef,
} from '../services/permissionService';

interface PermissionsModuleProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  rolePermissions?: Record<AppRole, RolePermissions>;
  onSavePermissions?: (updated: Record<AppRole, RolePermissions>) => Promise<void> | void;
  usersList?: UserInfo[];
}

export const PermissionsModule: React.FC<PermissionsModuleProps> = ({
  onShowToast,
  rolePermissions = DEFAULT_ROLE_PERMISSIONS,
  onSavePermissions,
  usersList = [],
}) => {
  // Local state of permissions for editing
  const [permissionsMap, setPermissionsMap] = useState<Record<AppRole, RolePermissions>>(
    rolePermissions
  );
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMobileRole, setSelectedMobileRole] = useState<AppRole>('Người kiểm kê');

  // Keep local state in sync when parent prop changes
  useEffect(() => {
    setPermissionsMap(rolePermissions);
  }, [rolePermissions]);

  // Calculate user counts per role
  const userCounts = useMemo(() => {
    const counts: Record<AppRole, number> = {
      'Quản trị viên': 0,
      'Thủ kho': 0,
      'Người kiểm kê': 0,
    };
    for (const u of usersList) {
      if (u.role === 'Quản trị viên' || u.role === 'Thủ kho' || u.role === 'Người kiểm kê') {
        counts[u.role]++;
      }
    }
    return counts;
  }, [usersList]);

  // Toggle single permission for a role
  const handleToggle = (role: AppRole, key: keyof RolePermissions) => {
    // Không cho phép tắt quyền của Quản trị viên để tránh tự khóa hệ thống
    if (role === 'Quản trị viên') {
      onShowToast('Vai trò Quản trị viên luôn có toàn quyền trong hệ thống.', 'info');
      return;
    }

    setPermissionsMap((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: !prev[role][key],
      },
    }));
  };

  // Reset to default
  const handleResetDefault = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục cấu hình phân quyền về mặc định ban đầu?')) {
      setPermissionsMap(DEFAULT_ROLE_PERMISSIONS);
      onShowToast('Đã khôi phục ma trận phân quyền về mặc định.', 'info');
    }
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSavePermissions) {
        await onSavePermissions(permissionsMap);
      }
      onShowToast('Đã lưu cấu hình phân quyền thành công!', 'success');
    } catch (err) {
      console.error('Save permissions error:', err);
      onShowToast('Lỗi khi lưu cấu hình phân quyền.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Roles definition for UI
  const ROLES_INFO: { role: AppRole; icon: React.ElementType; color: string; desc: string }[] = [
    {
      role: 'Quản trị viên',
      icon: ShieldCheck,
      color: 'blue',
      desc: 'Toàn quyền quản trị hệ thống, quản lý dữ liệu, người dùng và phân quyền.',
    },
    {
      role: 'Thủ kho',
      icon: Boxes,
      color: 'emerald',
      desc: 'Quản lý kho, cập nhật thông tin vật tư, xuất nhập file Excel và hàng dư.',
    },
    {
      role: 'Người kiểm kê',
      icon: ClipboardCheck,
      color: 'indigo',
      desc: 'Thực hiện kiểm đếm thực tế, chụp ảnh và ghi nhận số lượng tồn.',
    },
  ];

  return (
    <div className="space-y-4 pb-12 animate-fade-in font-sans">
      {/* 3 Summary Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {ROLES_INFO.map((item) => {
          const Icon = item.icon;
          const count = userCounts[item.role];
          const isSelectedMobile = selectedMobileRole === item.role;
          return (
            <div
              key={item.role}
              onClick={() => setSelectedMobileRole(item.role)}
              className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                isSelectedMobile
                  ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 shadow-xs hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      item.color === 'blue'
                        ? 'bg-blue-50 text-blue-600'
                        : item.color === 'emerald'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-800">
                      {item.role}
                    </h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5" />
                      <span>{count} nhân sự</span>
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Desktop Permission Matrix View */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
                <th className="py-3.5 px-5 min-w-[280px]">Chức năng & Hành động</th>
                <th className="py-3.5 px-4 text-center w-48">
                  <span className="inline-flex items-center gap-1 text-blue-700 font-bold">
                    <ShieldCheck className="w-4 h-4" /> Quản trị viên
                  </span>
                </th>
                <th className="py-3.5 px-4 text-center w-48">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <Boxes className="w-4 h-4" /> Thủ kho
                  </span>
                </th>
                <th className="py-3.5 px-4 text-center w-48">
                  <span className="inline-flex items-center gap-1 text-indigo-700 font-bold">
                    <ClipboardCheck className="w-4 h-4" /> Người kiểm kê
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {PERMISSION_FEATURES.map((feature, idx) => {
                const isFirstOfModule =
                  idx === 0 || PERMISSION_FEATURES[idx - 1].module !== feature.module;

                return (
                  <React.Fragment key={feature.key}>
                    {/* Module Separator Row */}
                    {isFirstOfModule && (
                      <tr className="bg-slate-100/60 border-t border-b border-slate-200/80 font-bold text-slate-700 text-xs">
                        <td colSpan={4} className="py-2 px-5 flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span>{feature.module.toUpperCase()}</span>
                        </td>
                      </tr>
                    )}

                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-5">
                        <div className="font-semibold text-slate-800">{feature.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {feature.description}
                        </div>
                      </td>

                      {/* Quản trị viên (Cố định bật) */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <div
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 text-blue-700 shadow-2xs cursor-not-allowed"
                            title="Quản trị viên luôn có quyền này"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        </div>
                      </td>

                      {/* Thủ kho */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleToggle('Thủ kho', feature.key)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                              permissionsMap['Thủ kho'][feature.key]
                                ? 'bg-emerald-600 justify-end'
                                : 'bg-slate-200 justify-start'
                            }`}
                            title={`Nhấn để ${
                              permissionsMap['Thủ kho'][feature.key] ? 'Tắt' : 'Bật'
                            } quyền`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                          </button>
                        </div>
                      </td>

                      {/* Người kiểm kê */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleToggle('Người kiểm kê', feature.key)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                              permissionsMap['Người kiểm kê'][feature.key]
                                ? 'bg-indigo-600 justify-end'
                                : 'bg-slate-200 justify-start'
                            }`}
                            title={`Nhấn để ${
                              permissionsMap['Người kiểm kê'][feature.key] ? 'Tắt' : 'Bật'
                            } quyền`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions Desktop */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-2xs"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Khôi phục mặc định</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/25 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-60"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu cấu hình phân quyền</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Card Deck & Tab View */}
      <div className="lg:hidden space-y-3">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl overflow-x-auto no-scrollbar">
          {(['Quản trị viên', 'Thủ kho', 'Người kiểm kê'] as AppRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedMobileRole(r)}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap text-center cursor-pointer ${
                selectedMobileRole === r
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Permissions list for the selected mobile role */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {PERMISSION_FEATURES.map((feature) => {
            const isEnabled = permissionsMap[selectedMobileRole][feature.key];
            const isAdmin = selectedMobileRole === 'Quản trị viên';

            return (
              <div
                key={feature.key}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-bold text-blue-600 uppercase tracking-wider">
                    {feature.module}
                  </div>
                  <div className="font-semibold text-slate-800 text-xs sm:text-sm">
                    {feature.name}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {feature.description}
                  </div>
                </div>

                <div className="shrink-0">
                  {isAdmin ? (
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggle(selectedMobileRole, feature.key)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                        isEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-200 justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Sticky / Bottom Action Buttons */}
        <div className="sticky bottom-3 pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu cấu hình quyền</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
