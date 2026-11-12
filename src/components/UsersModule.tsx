import React, { useState } from 'react';
import { User, Shield, Plus, Search, Mail, Building, CheckCircle2, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { UserInfo } from '../types';

interface UsersModuleProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const UsersModule: React.FC<UsersModuleProps> = ({ onShowToast }) => {
  const [usersList, setUsersList] = useState([
    { id: '1', name: 'Nguyễn Văn Kiểm', email: 'kiem.nv@doanhnghiep.vn', role: 'Chuyên viên Kiểm kê', department: 'Phòng Tài chính - Kế toán', status: 'Hoạt động', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces' },
    { id: '2', name: 'Trần Thị Mai', email: 'mai.tt@doanhnghiep.vn', role: 'Thủ kho', department: 'Bộ phận Kho & VTTB', status: 'Hoạt động', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces' },
    { id: '3', name: 'Lê Hoàng Long', email: 'long.lh@doanhnghiep.vn', role: 'Kiểm toán viên', department: 'Phòng Kiểm toán nội bộ', status: 'Hoạt động', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces' },
    { id: '4', name: 'Phạm Thị Lan', email: 'lan.pt@doanhnghiep.vn', role: 'Quản trị hệ thống', department: 'Phòng Công nghệ thông tin', status: 'Hoạt động', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces' },
  ]);

  const [search, setSearch] = useState('');

  const filtered = usersList.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Quản lý Tài khoản Người dùng</h3>
          <p className="text-xs text-slate-500">Danh sách nhân sự tham gia hệ thống kiểm kê và quản lý tài sản</p>
        </div>
        <button
          onClick={() => onShowToast('Chức năng thêm người dùng đang được phát triển', 'info')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm tài khoản</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm nhân sự theo tên hoặc email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-6">Nhân sự</th>
                <th className="py-3.5 px-6">Vai trò / Chức vụ</th>
                <th className="py-3.5 px-6">Phòng ban</th>
                <th className="py-3.5 px-6">Trạng thái</th>
                <th className="py-3.5 px-6 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-6 flex items-center gap-3">
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs" />
                    <div>
                      <div className="font-semibold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      <Shield className="w-3.5 h-3.5" /> {user.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-slate-400" />
                      <span>{user.department}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {user.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onShowToast(`Chỉnh sửa tài khoản ${user.name}`, 'info')}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onShowToast(`Xóa tài khoản ${user.name}`, 'info')}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
