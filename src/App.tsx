import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { InventoryModule } from './components/InventoryModule';
import { SurplusModule } from './components/SurplusModule';
import { UsersModule } from './components/UsersModule';
import { PermissionsModule } from './components/PermissionsModule';
import { InventoryModal } from './components/InventoryModal';
import { SurplusModal } from './components/SurplusModal';
import { ImportModal } from './components/ImportModal';
import { DetailModal } from './components/DetailModal';
import { Toast, ToastMessage } from './components/Toast';
import { INITIAL_INVENTORY_ITEMS, INITIAL_SURPLUS_ITEMS, INITIAL_USER } from './mockData';
import { InventoryItem, SurplusItem } from './types';
import { isSupabaseConfigured } from './lib/supabase';
import {
  fetchInventoryItems,
  updateInventoryItemInSupabase,
  createInventoryItemInSupabase,
  bulkCreateInventoryItemsInSupabase,
  uploadInventoryImageToSupabase,
  mapRowToInventoryItem,
} from './services/inventoryService';
import { supabase } from './lib/supabase';

export default function App() {
  const [activeModule, setActiveModule] = useState<'inventory' | 'surplus' | 'users' | 'permissions'>('inventory');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sidebar collapsed state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('vttb_sidebar_collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('vttb_sidebar_collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Data states
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(
    isSupabaseConfigured ? [] : INITIAL_INVENTORY_ITEMS
  );
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(isSupabaseConfigured);
  const [surplusItems, setSurplusItems] = useState<SurplusItem[]>(INITIAL_SURPLUS_ITEMS);

  // Stat filter state for inventory navbar
  const [statFilter, setStatFilter] = useState<'all' | 'audited' | 'pending' | 'discrepancy' | 'needed'>('all');

  // Modal states
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [editingInvItem, setEditingInvItem] = useState<InventoryItem | null>(null);

  const [isSurModalOpen, setIsSurModalOpen] = useState(false);
  const [editingSurItem, setEditingSurItem] = useState<SurplusItem | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importModuleType, setImportModuleType] = useState<'inventory' | 'surplus'>('inventory');

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
  const realtimeToastShown = useRef(false);
  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConnected || !client) return;

    if (!realtimeToastShown.current) {
      showToast('Đã kết nối Supabase · Realtime bật', 'success');
      realtimeToastShown.current = true;
    }

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
          const updated = await updateInventoryItemInSupabase(editingInvItem.id, payloadToSave);
          setInventoryItems((prev) =>
            prev.map((item) => (item.id === editingInvItem.id ? updated : item))
          );
          showToast(`Đã lưu vật tư ${updated.code} lên Supabase`);
        } catch (err) {
          console.error('Supabase update error:', err);
          showToast(`Lỗi lưu Supabase cho vật tư ${editingInvItem.code}`, 'error');
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
            auditor: payloadToSave.auditor || INITIAL_USER.name,
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
          auditor: INITIAL_USER.name,
        };
        setInventoryItems((prev) => [newItem, ...prev]);
        showToast(`Đã thêm mới vật tư ${newItem.code} thành công`);
      }
    }
    setEditingInvItem(null);
  };

  // --- SURPLUS HANDLERS ---
  const handleSaveSurplus = (itemData: Partial<SurplusItem>) => {
    if (editingSurItem) {
      setSurplusItems((prev) =>
        prev.map((item) => (item.id === editingSurItem.id ? ({ ...item, ...itemData } as SurplusItem) : item))
      );
      showToast(`Đã cập nhật hàng dư ${itemData.code}`);
    } else {
      const newItem: SurplusItem = {
        id: `sur-${Date.now()}`,
        code: itemData.code || 'SD-NEW',
        name: itemData.name || 'Hàng dư mới',
        group: itemData.group || 'Thiết bị IT',
        model: itemData.model || '',
        unit: itemData.unit || 'Cái',
        quantity: itemData.quantity || 1,
        condition: itemData.condition || 'Mới 100%',
        location: itemData.location || 'Kho A',
        reason: itemData.reason || 'Dư thừa kiểm kê',
        notes: itemData.notes || '',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setSurplusItems((prev) => [newItem, ...prev]);
      showToast(`Đã thêm mới hàng dư ${newItem.code} thành công`);
    }
    setEditingSurItem(null);
  };

  const handleDeleteSurplus = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi hàng dư này?')) {
      setSurplusItems((prev) => prev.filter((item) => item.id !== id));
      showToast('Đã xóa hàng dư thành công', 'info');
    }
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

  const handleImportSuccess = (count: number) => {
    showToast(`Đã import thành công ${count} bản ghi vào ${importModuleType === 'inventory' ? 'Kiểm kê VTTB' : 'Hàng dư'}`, 'success');
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

  return (
    <div
      className={`bg-slate-50 flex font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white ${
        activeModule === 'inventory' ? 'h-screen overflow-hidden' : 'min-h-screen'
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
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0 ${
          activeModule === 'inventory' ? 'h-full overflow-hidden' : ''
        } ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}
      >
        <Header
          activeModule={activeModule}
          setIsMobileOpen={setIsMobileOpen}
          setIsCollapsed={setIsCollapsed}
          inventoryItems={inventoryItems}
          onStatClick={(filter) => setStatFilter(filter)}
          activeStatFilter={statFilter}
        />

        <main
          className={`flex-1 p-1 sm:p-2 lg:p-2.5 max-w-[1920px] w-full mx-auto ${
            activeModule === 'inventory' ? 'min-h-0 overflow-hidden flex flex-col' : ''
          }`}
        >
          {activeModule === 'inventory' && (
            <InventoryModule
              items={inventoryItems}
              onEditItem={(item) => {
                setEditingInvItem(item);
                setIsInvModalOpen(true);
              }}
              statFilter={statFilter}
              onOpenImport={() => {
                setImportModuleType('inventory');
                setIsImportOpen(true);
              }}
              onExportExcel={handleExportExcel}
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
            />
          )}

          {activeModule === 'users' && <UsersModule onShowToast={showToast} />}

          {activeModule === 'permissions' && <PermissionsModule onShowToast={showToast} />}
        </main>
      </div>

      {/* Modals */}
      {isInvModalOpen && (
        <InventoryModal
          isOpen={isInvModalOpen}
          onClose={() => setIsInvModalOpen(false)}
          onSave={handleSaveInventory}
          editingItem={editingInvItem}
          availableProposals={availableProposals}
          currentUserName={INITIAL_USER.name}
        />
      )}

      <SurplusModal
        isOpen={isSurModalOpen}
        onClose={() => setIsSurModalOpen(false)}
        onSave={handleSaveSurplus}
        editingItem={editingSurItem}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
        moduleName={importModuleType === 'inventory' ? 'Kiểm Kê VTTB' : 'Hàng Dư'}
        existingItems={importModuleType === 'inventory' ? inventoryItems : []}
        onImportInventoryItems={
          importModuleType === 'inventory' ? handleImportInventoryItems : undefined
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
