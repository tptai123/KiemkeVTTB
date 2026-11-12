import React, { useState } from 'react';
import { Shield, Lock, Check, Plus, Key, Users } from 'lucide-react';

interface PermissionsModuleProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PermissionsModule: React.FC<PermissionsModuleProps> = ({ onShowToast }) => {
  const [roles, setRoles] = useState([
    {
      id: 'admin',
      name: 'Quản trị viên hệ thống (Admin)',
      description: 'Toàn quyền cấu hình hệ thống, thêm sửa xóa dữ liệu và phân quyền nhân sự',
      usersCount: 2,
      permissions: { inventory: true, surplus: true, users: true, settings: true },
    },
    {
      id: 'auditor',
      name: 'Chuyên viên Kiểm kê',
      description: 'Quyền thực hiện kiểm kê, nhập số lượng thực tế, quản lý hàng dư',
      usersCount: 5,
      permissions: { inventory: true, surplus: true, users: false, settings: false },
    },
    {
      id: 'manager',
      name: 'Trưởng phòng Kế toán / Quản lý',
      description: 'Xem báo cáo tổng hợp, xuất Excel, phê duyệt chênh lệch kiểm kê',
      usersCount: 3,
      permissions: { inventory: true, surplus: true, users: false, settings: false },
    },
    {
      id: 'viewer',
      name: 'Nhân viên tra cứu (Viewer)',
      description: 'Chỉ có quyền xem danh sách vật tư và tình trạng kiểm kê',
      usersCount: 12,
      permissions: { inventory: true, surplus: false, users: false, settings: false },
    },
  ]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Phân quyền & Vai trò người dùng</h3>
          <p className="text-xs text-slate-500">Quản lý quyền hạn truy cập các module trong hệ thống kiểm kê VTTB</p>
        </div>
        <button
          onClick={() => onShowToast('Thêm nhóm quyền mới thành công', 'success')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm vai trò mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{role.name}</h4>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Users className="w-3.5 h-3.5" /> {role.usersCount} nhân sự được gán
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">{role.description}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Quyền hạn module:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${role.permissions.inventory ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${role.permissions.inventory ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Kiểm kê VTTB</span>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${role.permissions.surplus ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${role.permissions.surplus ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Hàng dư</span>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${role.permissions.users ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${role.permissions.users ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Quản lý User</span>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${role.permissions.settings ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <Check className={`w-3.5 h-3.5 ${role.permissions.settings ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Phân quyền</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => onShowToast(`Cấu hình quyền cho vai trò ${role.name}`, 'info')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
              >
                Chỉnh sửa quyền
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
