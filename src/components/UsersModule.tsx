import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Plus,
  Search,
  Mail,
  Building,
  CheckCircle2,
  Phone,
  SquarePen,
  Trash2,
  X,
  UserX,
  RefreshCw,
} from 'lucide-react';
import { UserInfo } from '../types';
import {
  fetchUsersFromSupabase,
  createUserInSupabase,
  updateUserInSupabase,
  deleteUserInSupabase,
} from '../services/userService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface UsersModuleProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_MOCK_USERS: UserInfo[] = [
  {
    id: '1',
    name: 'Nguyễn Văn Kiểm',
    email: 'kiem.nv@doanhnghiep.vn',
    role: 'Người kiểm kê',
    department: 'Phòng Tài chính - Kế toán',
    phone: '0912345678',
    status: 'Hoạt động',
    avatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces',
  },
  {
    id: '2',
    name: 'Trần Thị Mai',
    email: 'mai.tt@doanhnghiep.vn',
    role: 'Thủ kho',
    department: 'Bộ phận Kho & VTTB',
    phone: '0933445566',
    status: 'Hoạt động',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
  },
  {
    id: '3',
    name: 'Lê Hoàng Long',
    email: 'long.lh@doanhnghiep.vn',
    role: 'Người kiểm kê',
    department: 'Phòng Kiểm toán nội bộ',
    phone: '0977889900',
    status: 'Hoạt động',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
  },
  {
    id: '4',
    name: 'Phạm Thị Lan',
    email: 'admin@doanhnghiep.vn',
    role: 'Quản trị viên',
    department: 'Phòng Công nghệ thông tin',
    phone: '0987654321',
    status: 'Hoạt động',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces',
  },
];

const AVAILABLE_ROLES = [
  'Quản trị viên',
  'Thủ kho',
  'Người kiểm kê',
];

export const UsersModule: React.FC<UsersModuleProps> = ({ onShowToast }) => {
  const [usersList, setUsersList] = useState<UserInfo[]>(DEFAULT_MOCK_USERS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [formData, setFormData] = useState<Partial<UserInfo>>({
    name: '',
    email: '',
    role: 'Người kiểm kê',
    department: 'Phòng Tài chính - Kế toán',
    phone: '',
    status: 'Hoạt động',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load users from Supabase on mount
  const loadUsers = async () => {
    if (!isSupabaseConfigured) return;
    setIsLoading(true);
    try {
      const data = await fetchUsersFromSupabase();
      if (data && data.length > 0) {
        setUsersList(data);
        setIsSupabaseConnected(true);
      } else {
        setIsSupabaseConnected(true);
      }
    } catch (err) {
      console.warn('Chưa kết nối bảng users Supabase, dùng dữ liệu mẫu:', err);
      setIsSupabaseConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Supabase Realtime subscription
  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConnected || !client) return;

    const channel = client
      .channel('public_users_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          loadUsers();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [isSupabaseConnected]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'Người kiểm kê',
      department: 'Phòng Tài chính - Kế toán',
      phone: '',
      status: 'Hoạt động',
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (user: UserInfo) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone || '',
      status: user.status || 'Hoạt động',
      avatar: user.avatar,
    });
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      onShowToast('Vui lòng nhập Họ và tên', 'error');
      return;
    }
    if (!formData.email?.trim()) {
      onShowToast('Vui lòng nhập Email', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingUser?.id) {
        // Update
        if (isSupabaseConnected) {
          const updated = await updateUserInSupabase(editingUser.id, formData);
          setUsersList((prev) =>
            prev.map((u) => (u.id === editingUser.id ? updated : u))
          );
          onShowToast(`Đã cập nhật tài khoản ${updated.name} thành công`, 'success');
        } else {
          setUsersList((prev) =>
            prev.map((u) =>
              u.id === editingUser.id ? ({ ...u, ...formData } as UserInfo) : u
            )
          );
          onShowToast(`Đã cập nhật tài khoản ${formData.name}`, 'success');
        }
      } else {
        // Create
        if (isSupabaseConnected) {
          const created = await createUserInSupabase(formData);
          setUsersList((prev) => [created, ...prev]);
          onShowToast(`Đã thêm mới tài khoản ${created.name} lên Supabase`, 'success');
        } else {
          const newUser: UserInfo = {
            id: `usr-${Date.now()}`,
            name: formData.name || 'Người dùng',
            email: formData.email || '',
            role: formData.role || 'Người kiểm kê',
            department: formData.department || '',
            phone: formData.phone || '',
            status: formData.status || 'Hoạt động',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
              formData.name || 'User'
            )}&background=0284c7&color=fff`,
          };
          setUsersList((prev) => [newUser, ...prev]);
          onShowToast(`Đã thêm tài khoản ${newUser.name}`, 'success');
        }
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      console.error('Error saving user:', err);
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Lỗi lưu thông tin người dùng.';
      onShowToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (user: UserInfo) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.name}"?`)) return;

    try {
      if (isSupabaseConnected && user.id) {
        await deleteUserInSupabase(user.id);
        setUsersList((prev) => prev.filter((u) => u.id !== user.id));
        onShowToast(`Đã xóa tài khoản ${user.name} khỏi Supabase`, 'info');
      } else {
        setUsersList((prev) => prev.filter((u) => u.id !== user.id));
        onShowToast(`Đã xóa tài khoản ${user.name}`, 'info');
      }
    } catch (err) {
      console.error('Delete error:', err);
      onShowToast(`Lỗi khi xóa tài khoản ${user.name}`, 'error');
    }
  };

  // Filter
  const filteredUsers = usersList.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search));
    const matchRole = selectedRole === 'all' || u.role === selectedRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-3 pb-12 animate-fade-in font-sans">
      {/* Filter Toolbar (Nút Thêm tài khoản nằm bên phải bộ lọc) */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên, email hoặc số điện thoại..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline">
              Vai trò:
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="all">Tất cả vai trò</option>
              {AVAILABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Nút Thêm tài khoản nằm bên phải */}
        <div className="flex items-center gap-2 justify-end shrink-0">
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/25 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm tài khoản</span>
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-3 text-center w-14">Stt</th>
                <th className="py-3.5 px-5">Nhân sự</th>
                <th className="py-3.5 px-4">Vai trò</th>
                <th className="py-3.5 px-4">Phòng ban</th>
                <th className="py-3.5 px-4">Số điện thoại</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Không tìm thấy tài khoản người dùng phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr key={user.id || user.email} className="hover:bg-slate-50/80 transition-colors">
                    {/* Cột Stt nằm đầu tiên */}
                    <td className="py-3 px-3 text-center font-bold text-slate-500">
                      {index + 1}
                    </td>

                    <td className="py-3 px-5 flex items-center gap-3">
                      <img
                        src={
                          user.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            user.name
                          )}&background=0284c7&color=fff`
                        }
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{user.name}</div>
                        <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <Shield className="w-3.5 h-3.5 shrink-0" /> {user.role}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{user.department}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {user.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{user.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa cập nhật</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {user.status === 'Hoạt động' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 shrink-0" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <UserX className="w-3 h-3 shrink-0" /> Tạm khóa
                        </span>
                      )}
                    </td>

                    {/* Cột thao tác: Edit ô vuông có cây viết (màu xanh dương), Xóa (màu đỏ) */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                          title="Chỉnh sửa thông tin"
                        >
                          <SquarePen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 transition-colors cursor-pointer shadow-2xs"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Deck View */}
      <div className="md:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-sm border border-slate-200">
            Không tìm thấy tài khoản phù hợp.
          </div>
        ) : (
          filteredUsers.map((user, index) => (
            <div
              key={user.id || user.email}
              className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                    #{index + 1}
                  </span>
                  <img
                    src={
                      user.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user.name
                      )}&background=0284c7&color=fff`
                    }
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate text-sm">
                      {user.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{user.email}</div>
                  </div>
                </div>

                {/* Mobile action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(user)}
                    className="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
                    title="Chỉnh sửa"
                  >
                    <SquarePen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors shadow-2xs"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Vai trò
                  </span>
                  <span className="font-semibold text-blue-700">{user.role}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Trạng thái
                  </span>
                  <span
                    className={`font-semibold ${
                      user.status === 'Hoạt động' ? 'text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    {user.status}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Phòng ban
                  </span>
                  <span className="font-medium text-slate-700">{user.department}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-800">
                  {editingUser ? 'Chỉnh sửa tài khoản' : 'Thêm mới tài khoản'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn Kiểm"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email đăng nhập <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="kiem.nv@doanhnghiep.vn"
                  required
                  disabled={Boolean(editingUser)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Vai trò / Quyền hạn
                  </label>
                  <select
                    value={formData.role || 'Người kiểm kê'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status || 'Hoạt động'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Tạm khóa">Tạm khóa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phòng ban / Đơn vị
                  </label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Phòng Tài chính - Kế toán"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0912345678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
