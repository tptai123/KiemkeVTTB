import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { InventoryModule } from './components/InventoryModule';
import { DCDNModule } from './components/DCDNModule';
import { SurplusModule } from './components/SurplusModule';
import { UsersModule } from './components/UsersModule';
import { PermissionsModule } from './components/PermissionsModule';
import { InventoryModal } from './components/InventoryModal';
import { DCDNModal } from './components/DCDNModal';
import { SurplusModal } from './components/SurplusModal';
import { ImportModal } from './components/ImportModal';
import { DetailModal } from './components/DetailModal';
import { Toast, ToastMessage } from './components/Toast';
import { LoginScreen } from './components/LoginScreen';
import { getSavedSessionUser, signOut as authSignOut, LOCAL_AUTH_KEY } from './services/authService';
import { mapRowToUserInfo, UserRow } from './services/userService';
import {
  INITIAL_INVENTORY_ITEMS,
  INITIAL_DCDN_ITEMS,
  INITIAL_SURPLUS_ITEMS,
  INITIAL_USER,
} from './mockData';
import {
  AppRole,
  RolePermissions,
  InventoryItem,
  DCDNItem,
  SurplusItem,
  UserInfo,
  CollaboratorPresence,
} from './types';
import { ConcurrencyConflictError } from './services/errors';
import {
  fetchRolePermissionsFromSupabase,
  saveAllRolePermissionsToSupabase,
  DEFAULT_ROLE_PERMISSIONS,
} from './services/permissionService';
import { isSupabaseConfigured } from './lib/supabase';
import {
  fetchInventoryItems,
  updateInventoryItemInSupabase,
  createInventoryItemInSupabase,
  bulkCreateInventoryItemsInSupabase,
  deleteInventoryItemInSupabase,
  uploadInventoryImageToSupabase,
  mapRowToInventoryItem,
} from './services/inventoryService';
import {
  fetchDCDNItems,
  updateDCDNItemInSupabase,
  createDCDNItemInSupabase,
  bulkCreateDCDNItemsInSupabase,
  deleteDCDNItemInSupabase,
  uploadDCDNImageToSupabase,
  mapRowToDCDNItem,
} from './services/dcdnService';
import {
  fetchSurplusItemsFromSupabase,
  createSurplusItemInSupabase,
  updateSurplusItemInSupabase,
  deleteSurplusItemInSupabase,
  uploadSurplusImageToSupabase,
  mapRowToSurplusItem,
  SurplusRow,
} from './services/surplusService';
import { supabase } from './lib/supabase';

export default function App() {
  const [activeModule, setActiveModule] = useState<'inventory' | 'dcdn' | 'surplus' | 'users' | 'permissions'>('inventory');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    let isMounted = true;
    getSavedSessionUser()
      .then((user) => {
        if (isMounted) {
          setCurrentUser(user);
          setIsAuthChecking(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsAuthChecking(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await authSignOut();
    setCurrentUser(null);
    showToast('Đã đăng xuất khỏi hệ thống', 'info');
  };

  // Role Permissions State
  const [rolePermissions, setRolePermissions] = useState<Record<AppRole, RolePermissions>>(
    DEFAULT_ROLE_PERMISSIONS
  );

  // Load role permissions from Supabase on mount
  useEffect(() => {
    fetchRolePermissionsFromSupabase()
      .then((data) => {
        if (data) setRolePermissions(data);
      })
      .catch((err) => console.warn('Lỗi tải quyền từ Supabase:', err));
  }, []);

  // Resolve current user permissions
  const userRole = (currentUser?.role || 'Người kiểm kê') as AppRole;
  const currentUserPermissions: RolePermissions =
    rolePermissions[userRole] ||
    DEFAULT_ROLE_PERMISSIONS[userRole] ||
    DEFAULT_ROLE_PERMISSIONS['Người kiểm kê'];

  // Enforce module access restriction
  useEffect(() => {
    if (activeModule === 'users' && !currentUserPermissions.canManageUsers) {
      setActiveModule('inventory');
    } else if (activeModule === 'permissions' && !currentUserPermissions.canManagePermissions) {
      setActiveModule('inventory');
    }
  }, [activeModule, currentUserPermissions]);

  // Sidebar collapsed state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('vttb_sidebar_collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('vttb_sidebar_collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Data states - VTTB
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(
    isSupabaseConfigured ? [] : INITIAL_INVENTORY_ITEMS
  );
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(isSupabaseConfigured);

  // Data states - DCĐN
  const [dcdnItems, setDcdnItems] = useState<DCDNItem[]>(
    isSupabaseConfigured ? [] : INITIAL_DCDN_ITEMS
  );
  const [isDCDNConnected, setIsDCDNConnected] = useState(false);
  const [isLoadingDCDN, setIsLoadingDCDN] = useState(isSupabaseConfigured);

  const [surplusItems, setSurplusItems] = useState<SurplusItem[]>(INITIAL_SURPLUS_ITEMS);

  // Stat filter state for navbar
  const [statFilter, setStatFilter] = useState<'all' | 'audited' | 'pending' | 'discrepancy' | 'needed'>('all');
  const [dcdnStatFilter, setDcdnStatFilter] = useState<'all' | 'audited' | 'pending' | 'discrepancy' | 'needed'>('all');

  // Modal states
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [editingInvItem, setEditingInvItem] = useState<InventoryItem | null>(null);

  const [isDCDNModalOpen, setIsDCDNModalOpen] = useState(false);
  const [editingDCDNItem, setEditingDCDNItem] = useState<DCDNItem | null>(null);

  const [isSurModalOpen, setIsSurModalOpen] = useState(false);
  const [editingSurItem, setEditingSurItem] = useState<SurplusItem | null>(null);

  // Collaborators Presence
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const presenceChannelRef = useRef<any>(null);

  const activeEditingId = editingInvItem?.id || editingDCDNItem?.id || editingSurItem?.id || null;
  const activeEditingCode = editingInvItem?.code || editingDCDNItem?.code || editingSurItem?.code || null;

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importModuleType, setImportModuleType] = useState<'inventory' | 'dcdn' | 'surplus'>('inventory');

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<InventoryItem | SurplusItem | null>(null);
  const [detailType, setDetailType] = useState<'inventory' | 'surplus'>('inventory');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const newToast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      type,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Memoize available proposals list — recalculates only when inventoryItems changes
  const availableProposals = useMemo(
    () => inventoryItems.map((i) => i.proposal || '').filter((p) => p.trim() !== ''),
    [inventoryItems]
  );

  // Load inventory data from Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    const loadInventory = async () => {
      setIsLoadingInventory(true);
      try {
        const data = await fetchInventoryItems();
        if (!isMounted) return;
        setInventoryItems(data);
        setIsSupabaseConnected(true);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error('Supabase fetch error:', err);
        setIsSupabaseConnected(false);
        setInventoryItems(INITIAL_INVENTORY_ITEMS);
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Chưa thể kết nối bảng inventory_items trên Supabase';
        showToast(`Dùng dữ liệu mẫu tạm thời (${msg})`, 'info');
      } finally {
        if (isMounted) setIsLoadingInventory(false);
      }
    };

    loadInventory();
    return () => {
      isMounted = false;
    };
  }, []);

  // Supabase Realtime — subscribe to kiem_ke_vttb changes after connected
  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConnected || !client) return;

    const channel = client
      .channel('kiem_ke_vttb_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kiem_ke_vttb' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = mapRowToInventoryItem(payload.new as Parameters<typeof mapRowToInventoryItem>[0]);
            setInventoryItems((prev) => {
              if (prev.some((i) => i.id === newItem.id)) return prev;
              return [newItem, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapRowToInventoryItem(payload.new as Parameters<typeof mapRowToInventoryItem>[0]);
            setInventoryItems((prev) =>
              prev.map((i) => (i.id === updated.id ? updated : i))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setInventoryItems((prev) => prev.filter((i) => i.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [isSupabaseConnected]);

  // Memoize available proposals for DCDN
  const availableDCDNProposals = useMemo(
    () => dcdnItems.map((i) => i.proposal || '').filter((p) => p.trim() !== ''),
    [dcdnItems]
  );

  // Load DCĐN data from Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    const loadDCDN = async () => {
      setIsLoadingDCDN(true);
      try {
        const data = await fetchDCDNItems();
        if (!isMounted) return;
        setDcdnItems(data);
        setIsDCDNConnected(true);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.warn('Chưa kết nối bảng kiem_ke_dcdn, sử dụng dữ liệu mẫu:', err);
        setIsDCDNConnected(false);
        setDcdnItems(INITIAL_DCDN_ITEMS);
      } finally {
        if (isMounted) setIsLoadingDCDN(false);
      }
    };

    loadDCDN();
    return () => {
      isMounted = false;
    };
  }, []);

  // Supabase Realtime for kiem_ke_dcdn (Delta sync to optimize multi-user performance)
  useEffect(() => {
    const client = supabase;
    if (!isDCDNConnected || !client) return;

    const channel = client
      .channel('kiem_ke_dcdn_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kiem_ke_dcdn' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = mapRowToDCDNItem(payload.new as Parameters<typeof mapRowToDCDNItem>[0]);
            setDcdnItems((prev) => {
              if (prev.some((i) => i.id === newItem.id)) return prev;
              return [newItem, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapRowToDCDNItem(payload.new as Parameters<typeof mapRowToDCDNItem>[0]);
            setDcdnItems((prev) =>
              prev.map((i) => (i.id === updated.id ? updated : i))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setDcdnItems((prev) => prev.filter((i) => i.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [isDCDNConnected]);

  // Supabase Realtime — subscribe to role_permissions changes
  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const channel = client
      .channel('role_permissions_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'role_permissions' },
        () => {
          fetchRolePermissionsFromSupabase()
            .then((data) => {
              if (data) setRolePermissions(data);
            })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  // Surplus connection state
  const [isSurplusConnected, setIsSurplusConnected] = useState(false);

  // Load Surplus data from Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let isMounted = true;
    fetchSurplusItemsFromSupabase()
      .then((data) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          setSurplusItems(data);
          setIsSurplusConnected(true);
        } else {
          setIsSurplusConnected(true);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Chưa kết nối bảng hang_du Supabase, sử dụng dữ liệu mẫu:', err);
        setIsSurplusConnected(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Supabase Realtime — subscribe to hang_du changes
  useEffect(() => {
    const client = supabase;
    if (!isSurplusConnected || !client) return;

    const channel = client
      .channel('hang_du_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hang_du' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = mapRowToSurplusItem(payload.new as SurplusRow);
            setSurplusItems((prev) => {
              if (prev.some((i) => i.id === newItem.id)) return prev;
              return [newItem, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapRowToSurplusItem(payload.new as SurplusRow);
            setSurplusItems((prev) =>
              prev.map((i) => (i.id === updated.id ? updated : i))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setSurplusItems((prev) => prev.filter((i) => i.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [isSurplusConnected]);

  // Realtime subscription for current user profile changes in Supabase
  useEffect(() => {
    const client = supabase;
    if (!client || !currentUser?.email) return;

    const channel = client
      .channel('current_user_profile_navbar_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        (payload) => {
          if (payload.new) {
            const updated = mapRowToUserInfo(payload.new as UserRow);
            const isMatch =
              updated.email.toLowerCase() === currentUser.email.toLowerCase() ||
              (currentUser.id && updated.id === currentUser.id) ||
              (currentUser.authId && updated.authId === currentUser.authId);
            if (isMatch) {
              setCurrentUser(updated);
              localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(updated));
            }
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [currentUser?.email, currentUser?.id, currentUser?.authId]);

  // Supabase Presence Tracking for Online Collaborators & Collision Detection
  useEffect(() => {
    const client = supabase;
    if (!client || !currentUser) return;

    const presenceKey = currentUser.email || currentUser.id || 'user_' + Math.random().toString(36).slice(2, 6);
    const channel = client.channel('vttb_collaborators_presence', {
      config: {
        presence: {
          key: presenceKey,
        },
      },
    });

    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState<CollaboratorPresence>();
        const list: CollaboratorPresence[] = [];
        for (const key of Object.keys(presenceState)) {
          const presences = presenceState[key];
          if (presences && presences.length > 0) {
            list.push(presences[0]);
          }
        }
        setCollaborators(list);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: currentUser.email || currentUser.name,
            userName: currentUser.name || currentUser.email,
            userRole: currentUser.role,
            activeModule,
            editingItemId: activeEditingId,
            editingItemCode: activeEditingCode,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
      presenceChannelRef.current = null;
    };
  }, [currentUser?.email, currentUser?.name, currentUser?.role]);

  // Broadcast editing item / active module changes via Presence
  useEffect(() => {
    if (!presenceChannelRef.current || !currentUser) return;
    presenceChannelRef.current
      .track({
        userId: currentUser.email || currentUser.name,
        userName: currentUser.name || currentUser.email,
        userRole: currentUser.role,
        activeModule,
        editingItemId: activeEditingId,
        editingItemCode: activeEditingCode,
        onlineAt: new Date().toISOString(),
      })
      .catch(() => {});
  }, [activeModule, activeEditingId, activeEditingCode, currentUser]);

  // State & Handler for Syncing Data from Supabase
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAllData = async () => {
    if (!isSupabaseConfigured) {
      showToast('Chưa cấu hình Supabase, không thể đồng bộ', 'info');
      return;
    }
    setIsSyncing(true);
    try {
      const results = await Promise.allSettled([
        fetchInventoryItems(),
        fetchDCDNItems(),
        fetchRolePermissionsFromSupabase(),
        getSavedSessionUser(),
        fetchSurplusItemsFromSupabase(),
      ]);

      if (results[0].status === 'fulfilled') {
        setInventoryItems(results[0].value);
        setIsSupabaseConnected(true);
      }
      if (results[1].status === 'fulfilled') {
        setDcdnItems(results[1].value);
        setIsDCDNConnected(true);
      }
      if (results[2].status === 'fulfilled' && results[2].value) {
        setRolePermissions(results[2].value);
      }
      if (results[3].status === 'fulfilled' && results[3].value) {
        setCurrentUser(results[3].value);
      }
      if (results[4].status === 'fulfilled') {
        setSurplusItems(results[4].value);
        setIsSurplusConnected(true);
      }

      showToast('Đồng bộ dữ liệu Supabase mới nhất thành công!', 'success');
    } catch (err) {
      console.error('Lỗi khi đồng bộ dữ liệu:', err);
      showToast('Đồng bộ dữ liệu thất bại', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // --- INVENTORY HANDLERS ---
  const handleSaveInventory = async (
    itemData: Partial<InventoryItem>,
    imageFile?: File | null
  ) => {
    let resolvedImage = itemData.image;
    const itemCodeForFile = editingInvItem
      ? editingInvItem.code
      : itemData.code || `VT-${Date.now()}`;

    if (isSupabaseConnected && imageFile) {
      try {
        resolvedImage = await uploadInventoryImageToSupabase(imageFile, itemCodeForFile);
      } catch (err) {
        console.error('Supabase storage upload error:', err);
        showToast(
          `Lỗi tải ảnh lên bucket "File all" (${itemCodeForFile}). Kiểm tra quyền Storage Policy.`,
          'error'
        );
        return;
      }
    }

    const payloadToSave: Partial<InventoryItem> = {
      ...itemData,
      image: resolvedImage,
    };

    if (editingInvItem) {
      if (isSupabaseConnected) {
        try {
          const updated = await updateInventoryItemInSupabase(
            editingInvItem.id,
            payloadToSave,
            editingInvItem.updatedAt
          );
          setInventoryItems((prev) =>
            prev.map((item) => (item.id === editingInvItem.id ? updated : item))
          );
          showToast(`Đã lưu vật tư ${updated.code} lên Supabase`);
        } catch (err) {
          if (err instanceof ConcurrencyConflictError) {
            showToast(err.message, 'error');
          } else {
            console.error('Supabase update error:', err);
            showToast(`Lỗi lưu Supabase cho vật tư ${editingInvItem.code}`, 'error');
          }
        }
      } else {
        setInventoryItems((prev) =>
          prev.map((item) =>
            item.id === editingInvItem.id
              ? ({ ...item, ...payloadToSave } as InventoryItem)
              : item
          )
        );
        showToast(`Đã cập nhật thành công vật tư ${itemData.code}`);
      }
    } else {
      if (isSupabaseConnected) {
        try {
          const created = await createInventoryItemInSupabase({
            code: itemCodeForFile,
            name: payloadToSave.name || 'Vật tư mới',
            group: payloadToSave.group || 'Thiết bị IT',
            model: payloadToSave.model || '',
            unit: payloadToSave.unit || 'Chiếc',
            warehouse: payloadToSave.warehouse || 'Kho A',
            location: payloadToSave.location || 'Tầng 1 - Kệ IT 01',
            bookQty: payloadToSave.bookQty || 1,
            actualQty: payloadToSave.actualQty !== undefined ? payloadToSave.actualQty : null,
            importQty: payloadToSave.importQty ?? null,
            exportQty: payloadToSave.exportQty ?? null,
            proposal: payloadToSave.proposal || '',
            proposalReason: payloadToSave.proposalReason || '',
            notFound: Boolean(payloadToSave.notFound),
            image: payloadToSave.image,
            notes: payloadToSave.notes || '',
            auditedAt: payloadToSave.auditedAt,
            auditor: payloadToSave.auditor || currentUser?.name || INITIAL_USER.name,
          });
          setInventoryItems((prev) => [created, ...prev]);
          showToast(`Đã thêm mới vật tư ${created.code} lên Supabase`);
        } catch (err) {
          console.error('Supabase insert error:', err);
          showToast('Lỗi thêm mới vật tư lên Supabase', 'error');
        }
      } else {
        const newItem: InventoryItem = {
          id: `inv-${Date.now()}`,
          code: itemData.code || 'VT-NEW',
          name: itemData.name || 'Vật tư mới',
          group: itemData.group || 'Thiết bị IT',
          model: itemData.model || '',
          unit: itemData.unit || 'Chiếc',
          warehouse: itemData.warehouse || 'Kho A',
          location: itemData.location || 'Tầng 1 - Kệ IT 01',
          bookQty: itemData.bookQty || 1,
          actualQty: itemData.actualQty !== undefined ? itemData.actualQty : null,
          image: payloadToSave.image,
          notes: itemData.notes || '',
          auditedAt: itemData.actualQty !== null ? new Date().toLocaleString('vi-VN') : undefined,
          auditor: currentUser?.name || INITIAL_USER.name,
        };
        setInventoryItems((prev) => [newItem, ...prev]);
        showToast(`Đã thêm mới vật tư ${newItem.code} thành công`);
      }
    }
    setEditingInvItem(null);
  };

  // --- DCDN HANDLERS ---
  const handleSaveDCDN = async (
    itemData: Partial<DCDNItem>,
    imageFile?: File | null
  ) => {
    let resolvedImage = itemData.image;
    const itemCodeForFile = editingDCDNItem
      ? editingDCDNItem.code
      : itemData.code || `DC-${Date.now()}`;

    if (isDCDNConnected && imageFile) {
      try {
        resolvedImage = await uploadDCDNImageToSupabase(imageFile, itemCodeForFile);
      } catch (uploadErr) {
        console.error('Supabase DCDN image upload error:', uploadErr);
        showToast('Lỗi tải ảnh dụng cụ lên Supabase', 'error');
      }
    }

    const payloadToSave: Partial<DCDNItem> = {
      ...itemData,
      image: resolvedImage,
    };

    if (editingDCDNItem) {
      if (isDCDNConnected) {
        try {
          const updated = await updateDCDNItemInSupabase(
            editingDCDNItem.id,
            payloadToSave,
            editingDCDNItem.updatedAt
          );
          setDcdnItems((prev) =>
            prev.map((item) => (item.id === editingDCDNItem.id ? updated : item))
          );
          showToast(`Đã cập nhật dụng cụ ${updated.code || editingDCDNItem.code || itemData.code} lên Supabase`);
        } catch (err) {
          if (err instanceof ConcurrencyConflictError) {
            showToast(err.message, 'error');
          } else {
            console.error('Supabase update DCDN error:', err);
            setDcdnItems((prev) =>
              prev.map((item) =>
                item.id === editingDCDNItem.id
                  ? ({ ...item, ...payloadToSave } as DCDNItem)
                  : item
              )
            );
            showToast(`Lỗi lưu Supabase cho dụng cụ ${editingDCDNItem.code}`, 'error');
          }
        }
      } else {
        setDcdnItems((prev) =>
          prev.map((item) =>
            item.id === editingDCDNItem.id
              ? ({ ...item, ...payloadToSave } as DCDNItem)
              : item
          )
        );
        showToast(`Đã cập nhật thành công dụng cụ ${editingDCDNItem.code || itemData.code}`);
      }
    } else {
      if (isDCDNConnected) {
        try {
          const created = await createDCDNItemInSupabase({
            code: itemCodeForFile,
            name: payloadToSave.name || 'Dụng cụ mới',
            group: payloadToSave.group || 'Dụng cụ đo nghiệm',
            model: payloadToSave.model || '',
            unit: payloadToSave.unit || 'Bộ',
            warehouse: payloadToSave.warehouse || 'Kho DCĐN',
            location: payloadToSave.location || 'Tủ đo lường A1',
            bookQty: payloadToSave.bookQty || 1,
            actualQty: payloadToSave.actualQty !== undefined ? payloadToSave.actualQty : null,
            proposal: payloadToSave.proposal || '',
            proposalReason: payloadToSave.proposalReason || '',
            notFound: Boolean(payloadToSave.notFound),
            image: payloadToSave.image,
            notes: payloadToSave.notes || '',
            auditedAt: payloadToSave.auditedAt,
            auditor: payloadToSave.auditor || currentUser?.name || INITIAL_USER.name,
          });
          setDcdnItems((prev) => [created, ...prev]);
          showToast(`Đã thêm mới dụng cụ ${created.code} lên Supabase`);
        } catch (err) {
          console.error('Supabase insert DCDN error:', err);
          showToast('Lỗi thêm mới dụng cụ lên Supabase', 'error');
        }
      } else {
        const newItem: DCDNItem = {
          id: `dcdn-${Date.now()}`,
          code: itemData.code || 'DC-NEW',
          name: itemData.name || 'Dụng cụ mới',
          group: itemData.group || 'Dụng cụ đo nghiệm',
          model: itemData.model || '',
          unit: itemData.unit || 'Bộ',
          warehouse: itemData.warehouse || 'Kho DCĐN',
          location: itemData.location || 'Tủ đo lường A1',
          bookQty: itemData.bookQty || 1,
          actualQty: itemData.actualQty !== undefined ? itemData.actualQty : null,
          image: payloadToSave.image,
          notes: itemData.notes || '',
          auditedAt: itemData.actualQty !== null ? new Date().toLocaleString('vi-VN') : undefined,
          auditor: currentUser?.name || INITIAL_USER.name,
        };
        setDcdnItems((prev) => [newItem, ...prev]);
        showToast(`Đã thêm mới dụng cụ ${newItem.code} thành công`);
      }
    }
    setEditingDCDNItem(null);
  };

  // --- SURPLUS HANDLERS ---
  const handleSaveSurplus = async (
    itemData: Partial<SurplusItem>,
    imageFile?: File | null
  ) => {
    let resolvedImage = itemData.image;
    const itemCodeForFile = editingSurItem
      ? editingSurItem.code
      : itemData.code || `SD-${Date.now()}`;

    if (imageFile) {
      if (isSurplusConnected || isSupabaseConnected) {
        try {
          resolvedImage = await uploadSurplusImageToSupabase(imageFile, itemCodeForFile);
        } catch (err) {
          console.warn('Storage upload error for surplus image:', err);
        }
      }
    }

    const payloadToSave: Partial<SurplusItem> = {
      ...itemData,
      image: resolvedImage,
    };

    if (isSurplusConnected) {
      try {
        if (editingSurItem) {
          const updated = await updateSurplusItemInSupabase(
            editingSurItem.id,
            payloadToSave,
            editingSurItem.updatedAt
          );
          setSurplusItems((prev) =>
            prev.map((item) => (item.id === editingSurItem.id ? updated : item))
          );
          const targetName = updated.name || editingSurItem.name || itemData.name || editingSurItem.code || '';
          showToast(`Đã cập nhật thông tin vật tư ${targetName}`);
        } else {
          const created = await createSurplusItemInSupabase(payloadToSave);
          setSurplusItems((prev) => [created, ...prev]);
          showToast(`Đã thêm mới vật tư ${created.name || created.code} thành công`);
        }
      } catch (err) {
        if (err instanceof ConcurrencyConflictError) {
          showToast(err.message, 'error');
        } else {
          console.error('Lỗi lưu vật tư hàng dư vào Supabase:', err);
          showToast('Lỗi khi lưu vào Supabase, đang lưu tạm cục bộ', 'error');
          // Fallback local update
          if (editingSurItem) {
            setSurplusItems((prev) =>
              prev.map((item) =>
                item.id === editingSurItem.id
                  ? ({ ...item, ...payloadToSave } as SurplusItem)
                  : item
              )
            );
          } else {
            const newItem: SurplusItem = {
              id: `sur-${Date.now()}`,
              code: itemData.code || `SD-${Date.now().toString().slice(-6)}`,
              name: itemData.name || 'Hàng dư mới',
              group: itemData.group || 'Hàng dư',
              model: itemData.model || '',
              unit: itemData.unit || 'Cái',
              quantity: itemData.quantity || 1,
              condition: itemData.condition || 'Mới 100%',
              location: itemData.location || '',
              reason: itemData.reason || '',
              notes: itemData.notes || '',
              image: resolvedImage,
              createdAt: new Date().toISOString(),
            };
            setSurplusItems((prev) => [newItem, ...prev]);
          }
        }
      }
    } else {
      if (editingSurItem) {
        setSurplusItems((prev) =>
          prev.map((item) =>
            item.id === editingSurItem.id
              ? ({ ...item, ...payloadToSave } as SurplusItem)
              : item
          )
        );
        const targetName = editingSurItem.name || itemData.name || editingSurItem.code || '';
        showToast(`Đã cập nhật thông tin vật tư ${targetName}`);
      } else {
        const newItem: SurplusItem = {
          id: `sur-${Date.now()}`,
          code: itemData.code || `SD-${Date.now().toString().slice(-6)}`,
          name: itemData.name || 'Hàng dư mới',
          group: itemData.group || 'Hàng dư',
          model: itemData.model || '',
          unit: itemData.unit || 'Cái',
          quantity: itemData.quantity || 1,
          condition: itemData.condition || 'Mới 100%',
          location: itemData.location || '',
          reason: itemData.reason || '',
          notes: itemData.notes || '',
          image: resolvedImage,
          createdAt: new Date().toISOString(),
        };
        setSurplusItems((prev) => [newItem, ...prev]);
        showToast(`Đã thêm mới vật tư ${newItem.name || newItem.code} thành công`);
      }
    }
    setEditingSurItem(null);
  };

  const handleDeleteInventory = async (id: string) => {
    if (isSupabaseConnected) {
      try {
        await deleteInventoryItemInSupabase(id);
        setInventoryItems((prev) => prev.filter((item) => item.id !== id));
        showToast('Đã xóa vật tư kiểm kê thành công', 'info');
        return;
      } catch (err) {
        console.error('Lỗi khi xóa vật tư trên Supabase:', err);
        showToast('Lỗi khi xóa vật tư trên Supabase', 'error');
        return;
      }
    }
    setInventoryItems((prev) => prev.filter((item) => item.id !== id));
    showToast('Đã xóa vật tư kiểm kê thành công', 'info');
  };

  const handleDeleteDCDN = async (id: string) => {
    if (isDCDNConnected) {
      try {
        await deleteDCDNItemInSupabase(id);
        setDcdnItems((prev) => prev.filter((item) => item.id !== id));
        showToast('Đã xóa dụng cụ DCĐN thành công', 'info');
        return;
      } catch (err) {
        console.error('Lỗi khi xóa dụng cụ trên Supabase:', err);
        showToast('Lỗi khi xóa dụng cụ trên Supabase', 'error');
        return;
      }
    }
    setDcdnItems((prev) => prev.filter((item) => item.id !== id));
    showToast('Đã xóa dụng cụ DCĐN thành công', 'info');
  };

  const handleDeleteSurplus = async (id: string) => {
    if (isSurplusConnected) {
      try {
        await deleteSurplusItemInSupabase(id);
        setSurplusItems((prev) => prev.filter((item) => item.id !== id));
        showToast('Đã xóa hàng dư trên Supabase thành công', 'info');
        return;
      } catch (err) {
        console.error('Lỗi khi xóa hàng dư trên Supabase:', err);
        showToast('Lỗi khi xóa trên Supabase', 'error');
      }
    }
    setSurplusItems((prev) => prev.filter((item) => item.id !== id));
    showToast('Đã xóa hàng dư thành công', 'info');
  };

  const handleImportInventoryItems = async (itemsToImport: Partial<InventoryItem>[]) => {
    if (itemsToImport.length === 0) return;

    if (isSupabaseConnected) {
      const created = await bulkCreateInventoryItemsInSupabase(itemsToImport);
      setInventoryItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const uniqueCreated = created.filter((c) => !existingIds.has(c.id));
        return [...uniqueCreated, ...prev];
      });
    } else {
      const now = Date.now();
      const localCreated: InventoryItem[] = itemsToImport.map((item, idx) => ({
        id: `inv-imp-${now}-${idx}`,
        code: item.code || `VT-${now}-${idx}`,
        name: item.name || 'Vật tư mới',
        group: item.group || 'Thiết bị IT',
        model: item.model || '',
        unit: item.unit || 'Chiếc',
        warehouse: item.warehouse || 'Kho chính',
        location: item.location || '',
        bookQty: item.bookQty ?? 0,
        actualQty: null,
        proposal: '',
        notes: '',
      }));
      setInventoryItems((prev) => [...localCreated, ...prev]);
    }
  };

  const handleImportDCDNItems = async (itemsToImport: Partial<DCDNItem>[]) => {
    if (itemsToImport.length === 0) return;

    if (isDCDNConnected) {
      const insertedCount = await bulkCreateDCDNItemsInSupabase(itemsToImport);
      const reloaded = await fetchDCDNItems();
      setDcdnItems(reloaded);
      showToast(`Đã import thành công ${insertedCount} dụng cụ lên Supabase!`, 'success');
    } else {
      const now = Date.now();
      const localCreated: DCDNItem[] = itemsToImport.map((item, idx) => ({
        id: `dcdn-imp-${now}-${idx}`,
        code: item.code || `DC-${now}-${idx}`,
        name: item.name || 'Dụng cụ mới',
        group: item.group || 'Dụng cụ đo nghiệm',
        model: item.model || '',
        unit: item.unit || 'Bộ',
        warehouse: item.warehouse || 'Kho DCĐN',
        location: item.location || '',
        bookQty: item.bookQty ?? 0,
        actualQty: null,
        proposal: '',
        notes: '',
      }));
      setDcdnItems((prev) => [...localCreated, ...prev]);
      showToast(`Đã import thành công ${itemsToImport.length} dụng cụ!`, 'success');
    }
  };

  const handleImportSuccess = (count: number) => {
    const modLabel =
      importModuleType === 'inventory'
        ? 'Kiểm kê VTTB'
        : importModuleType === 'dcdn'
        ? 'Kiểm kê DCĐN'
        : 'Hàng dư';
    showToast(`Đã import thành công ${count} bản ghi vào ${modLabel}`, 'success');
  };

  const handleExportDCDNExcel = () => {
    if (dcdnItems.length === 0) {
      showToast('Không có dữ liệu DCĐN để xuất Excel', 'info');
      return;
    }

    const exportData = dcdnItems.map((item, index) => ({
      Stt: index + 1,
      'Mã DCĐN': item.code || '',
      'Tên dụng cụ đo nghiệm / đồ nghề': item.name || '',
      Kho: item.warehouse || '',
      ĐVT: item.unit || '',
      'SL tồn': item.bookQty ?? 0,
      'SL kiểm': item.actualQty !== null && item.actualQty !== undefined ? item.actualQty : '',
      'Vị trí': item.location || '',
      'Ghi chú': item.notes || '',
      'Đề xuất xử lý': item.proposal || '',
      'Lý do đề xuất': item.proposalReason || '',
      'Tìm hàng': item.notFound ? 'Có' : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 42 },
      { wch: 14 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 24 },
      { wch: 28 },
      { wch: 20 },
      { wch: 28 },
      { wch: 12 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kiem_Ke_DCDN');

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    XLSX.writeFile(workbook, `Kiem_Ke_DCDN_${dd}-${mm}-${yy}.xlsx`);

    showToast(`Đã xuất ${exportData.length} dòng DCĐN ra file Excel thành công!`, 'success');
  };

  const handleExportExcel = () => {
    if (inventoryItems.length === 0) {
      showToast('Không có dữ liệu để xuất Excel', 'info');
      return;
    }

    const exportData = inventoryItems.map((item, index) => ({
      Stt: index + 1,
      'Mã vật tư': item.code || '',
      'Tên vật tư': item.name || '',
      Kho: item.warehouse || '',
      ĐVT: item.unit || '',
      'SL sổ sách': item.bookQty ?? 0,
      'SL kiểm kê': item.actualQty !== null && item.actualQty !== undefined ? item.actualQty : '',
      'Vị trí': item.location || '',
      'Ghi chú': item.notes || '',
      'Đề xuất xử lý': item.proposal || '',
      'Lý do đề xuất': item.proposalReason || '',
      'Tìm hàng': item.notFound ? 'Có' : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 42 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 24 },
      { wch: 28 },
      { wch: 18 },
      { wch: 28 },
      { wch: 12 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kiem_Ke_VTTB');

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    XLSX.writeFile(workbook, `Kiem_Ke_VTTB_${dd}-${mm}-${yy}.xlsx`);

    showToast(`Đã xuất ${exportData.length} dòng ra file Excel thành công!`, 'success');
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-white text-xs sm:text-sm font-semibold tracking-wide">
          Đang kiểm tra phiên làm việc...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginScreen
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            showToast(`Xin chào ${user.name}!`, 'success');
          }}
          onShowToast={showToast}
        />
        <Toast toasts={toasts} onClose={removeToast} />
      </>
    );
  }

  return (
    <div
      className={`bg-slate-50 flex font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white ${
        activeModule === 'inventory' || activeModule === 'dcdn' ? 'h-screen overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        userPermissions={currentUserPermissions}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0 ${
          activeModule === 'inventory' || activeModule === 'dcdn' ? 'h-full overflow-hidden' : ''
        } ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}
      >
        <Header
          activeModule={activeModule}
          setIsMobileOpen={setIsMobileOpen}
          setIsCollapsed={setIsCollapsed}
          inventoryItems={activeModule === 'dcdn' ? dcdnItems : inventoryItems}
          onStatClick={(filter) => {
            if (activeModule === 'dcdn') setDcdnStatFilter(filter);
            else setStatFilter(filter);
          }}
          activeStatFilter={activeModule === 'dcdn' ? dcdnStatFilter : statFilter}
          currentUser={currentUser}
          onLogout={handleLogout}
          onSync={handleSyncAllData}
          isSyncing={isSyncing}
          collaborators={collaborators}
        />

        <main
          className={`flex-1 p-1 sm:p-2 lg:p-2.5 max-w-[1920px] w-full mx-auto relative ${
            activeModule === 'inventory' || activeModule === 'dcdn' ? 'min-h-0 overflow-hidden flex flex-col' : ''
          }`}
        >
          {/* Loading overlay hiển thị tại giao diện module khi đang đồng bộ dữ liệu */}
          {isSyncing && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 animate-fade-in pointer-events-auto select-none">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 shadow-lg flex items-center justify-center">
                <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <h4 className="font-bold text-sm text-slate-800">Đang đồng bộ dữ liệu với Supabase...</h4>
                <p className="text-xs text-slate-500 mt-0.5">Vui lòng chờ trong giây lát</p>
              </div>
            </div>
          )}

          {activeModule === 'inventory' && (
            <InventoryModule
              items={inventoryItems}
              onEditItem={(item) => {
                setEditingInvItem(item);
                setIsInvModalOpen(true);
              }}
              statFilter={statFilter}
              onStatFilterChange={setStatFilter}
              onOpenImport={() => {
                setImportModuleType('inventory');
                setIsImportOpen(true);
              }}
              onExportExcel={handleExportExcel}
              userPermissions={currentUserPermissions}
            />
          )}

          {activeModule === 'dcdn' && (
            <DCDNModule
              items={dcdnItems}
              onEditItem={(item) => {
                setEditingDCDNItem(item);
                setIsDCDNModalOpen(true);
              }}
              statFilter={dcdnStatFilter}
              onStatFilterChange={setDcdnStatFilter}
              onOpenImport={() => {
                setImportModuleType('dcdn');
                setIsImportOpen(true);
              }}
              onExportExcel={handleExportDCDNExcel}
              userPermissions={currentUserPermissions}
            />
          )}

          {activeModule === 'surplus' && (
            <SurplusModule
              items={surplusItems}
              onAddItem={() => {
                setEditingSurItem(null);
                setIsSurModalOpen(true);
              }}
              onEditItem={(item) => {
                setEditingSurItem(item);
                setIsSurModalOpen(true);
              }}
              onDeleteItem={handleDeleteSurplus}
              onViewDetail={(item) => {
                setSelectedDetailItem(item);
                setDetailType('surplus');
                setDetailModalOpen(true);
              }}
              onOpenImport={() => {
                setImportModuleType('surplus');
                setIsImportOpen(true);
              }}
              onShowToast={showToast}
              userPermissions={currentUserPermissions}
            />
          )}

          {activeModule === 'users' && (
            <UsersModule
              onShowToast={showToast}
              currentUser={currentUser}
              onCurrentUserUpdated={(updated) => {
                setCurrentUser(updated);
                localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(updated));
              }}
            />
          )}

          {activeModule === 'permissions' && (
            <PermissionsModule
              onShowToast={showToast}
              rolePermissions={rolePermissions}
              onSavePermissions={async (updated) => {
                await saveAllRolePermissionsToSupabase(updated);
                setRolePermissions(updated);
              }}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {isInvModalOpen && (
        <InventoryModal
          isOpen={isInvModalOpen}
          onClose={() => setIsInvModalOpen(false)}
          onSave={handleSaveInventory}
          onDelete={handleDeleteInventory}
          editingItem={editingInvItem}
          availableProposals={availableProposals}
          currentUserName={currentUser?.name || INITIAL_USER.name}
          isReadOnly={!currentUserPermissions.canAuditInventory}
          canDelete={currentUserPermissions.canManageInventoryItems}
          collaborators={collaborators}
        />
      )}

      {isDCDNModalOpen && (
        <DCDNModal
          isOpen={isDCDNModalOpen}
          onClose={() => setIsDCDNModalOpen(false)}
          onSave={handleSaveDCDN}
          onDelete={handleDeleteDCDN}
          editingItem={editingDCDNItem}
          availableProposals={availableDCDNProposals}
          currentUserName={currentUser?.name || INITIAL_USER.name}
          isReadOnly={!currentUserPermissions.canAuditDCDN}
          canDelete={currentUserPermissions.canManageDCDNItems}
          collaborators={collaborators}
        />
      )}

      <SurplusModal
        isOpen={isSurModalOpen}
        onClose={() => setIsSurModalOpen(false)}
        onSave={handleSaveSurplus}
        editingItem={editingSurItem}
        isReadOnly={
          editingSurItem
            ? !currentUserPermissions.canManageSurplus
            : !currentUserPermissions.canAddSurplus
        }
        collaborators={collaborators}
        currentUserName={currentUser?.name || INITIAL_USER.name}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
        moduleName={
          importModuleType === 'inventory'
            ? 'Kiểm Kê VTTB'
            : importModuleType === 'dcdn'
            ? 'Kiểm kê DCĐN'
            : 'Hàng Dư'
        }
        existingItems={
          importModuleType === 'inventory'
            ? inventoryItems
            : importModuleType === 'dcdn'
            ? dcdnItems
            : []
        }
        onImportInventoryItems={
          importModuleType === 'inventory'
            ? handleImportInventoryItems
            : importModuleType === 'dcdn'
            ? handleImportDCDNItems
            : undefined
        }
      />

      <DetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        item={selectedDetailItem}
        type={detailType}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
}
