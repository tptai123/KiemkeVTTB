import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { InventoryItem } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
  moduleName: string;
  existingItems?: { code?: string; name?: string; warehouse?: string }[];
  onImportInventoryItems?: (items: any[]) => Promise<void> | void;
}

interface PreviewRowInfo {
  rowNumber: number;
  status: 'ok' | 'duplicate' | 'invalid';
  code: string;
  name: string;
  warehouse: string;
  unit: string;
  bookQty: number;
  location: string;
  reason?: string;
}

const normalizeHeader = (header: string): string =>
  header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const cleanStr = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  return String(val)
    .normalize('NFC')
    .replace(/[\s\u00A0]+/g, ' ')
    .trim()
    .toLowerCase();
};

const makeCompositeKey = (code: string, name: string, warehouse: string, isDCDN: boolean = false): string => {
  const normCode = cleanStr(code);
  const normName = cleanStr(name);
  const defaultWarehouse = isDCDN ? 'kho dcdn' : 'kho chính';
  const normWarehouse = cleanStr(warehouse) || defaultWarehouse;
  return `${normCode}||${normName}||${normWarehouse}`;
};

const parseNumericCell = (val: unknown): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val === null || val === undefined) return 0;
  const str = String(val).trim();
  if (!str) return 0;
  const normalized =
    str.includes(',') && str.includes('.')
      ? str.replace(/\./g, '').replace(',', '.')
      : str.includes(',')
      ? str.replace(',', '.')
      : str;
  const num = Number(normalized);
  return isNaN(num) ? 0 : num;
};

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  moduleName,
  existingItems = [],
  onImportInventoryItems,
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validNewItems, setValidNewItems] = useState<Partial<InventoryItem>[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRowInfo[]>([]);

  const isDCDN = moduleName.includes('DCĐN');
  const defaultWarehouse = isDCDN ? 'Kho DCĐN' : 'Kho chính';
  const isInventoryModule = (moduleName === 'Kiểm Kê VTTB' || isDCDN) && Boolean(onImportInventoryItems);

  // Build O(1) lookup Set of (Mã vật tư, Tên vật tư, Kho) from existing table data
  const existingKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const item of existingItems) {
      if (item.code && item.name) {
        set.add(makeCompositeKey(item.code, item.name, item.warehouse || defaultWarehouse, isDCDN));
      }
    }
    return set;
  }, [existingItems, defaultWarehouse, isDCDN]);

  const duplicateCount = useMemo(
    () => previewRows.filter((r) => r.status !== 'ok').length,
    [previewRows]
  );

  const resetState = () => {
    setFileName(null);
    setIsUploading(false);
    setSuccessCount(null);
    setParseError(null);
    setValidNewItems([]);
    setPreviewRows([]);
  };

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const isDCDN = moduleName.includes('DCĐN');
    const templateData = isDCDN
      ? [
          {
            Stt: 1,
            'Mã DCĐN': 'DC-OTDR-001',
            'Tên dụng cụ đo nghiệm / đồ nghề': 'Máy đo quang OTDR Yokogawa AQ7280',
            Kho: 'Kho DCĐN',
            ĐVT: 'Bộ',
            'Số lượng tồn': 3,
            'Vị trí': 'Tủ đo lường A1',
          },
          {
            Stt: 2,
            'Mã DCĐN': 'DC-FUSION-002',
            'Tên dụng cụ đo nghiệm / đồ nghề': 'Máy hàn sợi quang Fujikura 90S+',
            Kho: 'Kho DCĐN',
            ĐVT: 'Bộ',
            'Số lượng tồn': 2,
            'Vị trí': 'Tủ đo lường A2',
          },
        ]
      : [
          {
            Stt: 1,
            'Mã vật tư': '1.02.05.101.203.01.999',
            'Tên vật tư': 'Máy in laser HP LaserJet Pro M404dn',
            Kho: 'Kho A',
            ĐVT: 'Chiếc',
            'Số lượng sổ sách': 10,
            'Vị trí': 'Tầng 1 - Kệ IT 01',
          },
          {
            Stt: 2,
            'Mã vật tư': '1.02.05.101.203.01.998',
            'Tên vật tư': 'Switch Cisco Catalyst 2960X 24 Port',
            Kho: 'Kho B',
            ĐVT: 'Bộ',
            'Số lượng sổ sách': 5,
            'Vị trí': 'Tầng 2 - Tủ mạng 02',
          },
        ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 40 },
      { wch: 14 },
      { wch: 10 },
      { wch: 18 },
      { wch: 24 },
    ];
    const sheetTitle = isDCDN ? 'Mau_Kiem_Ke_DCDN' : 'Mau_Kiem_Ke_VTTB';
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);
    XLSX.writeFile(workbook, `${sheetTitle}.xlsx`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSuccessCount(null);
    setParseError(null);
    setValidNewItems([]);
    setPreviewRows([]);

    if (!isInventoryModule) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setParseError('Tệp Excel không có sheet dữ liệu nào.');
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
      });

      if (rawRows.length === 0) {
        setParseError('Tệp Excel không có dòng dữ liệu nào.');
        return;
      }

      const newItems: Partial<InventoryItem>[] = [];
      const previews: PreviewRowInfo[] = [];
      const seenInFile = new Set<string>();

      rawRows.forEach((rawRow, idx) => {
        const rowNumber = idx + 2; // +1 header +1 1-based index
        const normalizedRow: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rawRow)) {
          normalizedRow[normalizeHeader(key)] = value;
        }

        const code = String(
          normalizedRow['mavattu'] ??
            normalizedRow['madcdn'] ??
            normalizedRow['madungcu'] ??
            normalizedRow['mahang'] ??
            normalizedRow['code'] ??
            ''
        ).trim();
        const name = String(
          normalizedRow['tenvattu'] ??
            normalizedRow['tendcdn'] ??
            normalizedRow['tendungcu'] ??
            normalizedRow['tendungcudonghiemdonghe'] ??
            normalizedRow['tenhang'] ??
            normalizedRow['name'] ??
            ''
        ).trim();
        const rawWarehouse = String(
          normalizedRow['kho'] ?? normalizedRow['warehouse'] ?? ''
        ).trim();
        const warehouse = rawWarehouse || defaultWarehouse;
        const defaultUnit = isDCDN ? 'Bộ' : 'Chiếc';
        const unit = String(
          normalizedRow['dvt'] ?? normalizedRow['donvitinh'] ?? normalizedRow['unit'] ?? defaultUnit
        ).trim() || defaultUnit;
        const bookQty = parseNumericCell(
          normalizedRow['soluongsosach'] ??
            normalizedRow['slsosach'] ??
            normalizedRow['soluongton'] ??
            normalizedRow['slton'] ??
            normalizedRow['bookqty'] ??
            0
        );
        const location = String(
          normalizedRow['vitri'] ?? normalizedRow['location'] ?? ''
        ).trim();

        // Skip completely blank rows
        if (!code && !name && !rawWarehouse && !location) return;

        if (!code || !name) {
          previews.push({
            rowNumber,
            status: 'invalid',
            code: code || '(Trống)',
            name: name || '(Trống)',
            warehouse,
            unit,
            bookQty,
            location,
            reason: 'Thiếu Mã vật tư hoặc Tên vật tư',
          });
          return;
        }

        const key = makeCompositeKey(code, name, warehouse, isDCDN);
        if (existingKeySet.has(key)) {
          previews.push({
            rowNumber,
            status: 'duplicate',
            code,
            name,
            warehouse,
            unit,
            bookQty,
            location,
            reason: 'Trùng Mã vật tư, Tên vật tư và Kho với bảng dữ liệu',
          });
          return;
        }

        if (seenInFile.has(key)) {
          previews.push({
            rowNumber,
            status: 'duplicate',
            code,
            name,
            warehouse,
            unit,
            bookQty,
            location,
            reason: 'Trùng lặp ngay trong tệp tải lên (cùng Mã, Tên và Kho)',
          });
          return;
        }

        seenInFile.add(key);
        previews.push({
          rowNumber,
          status: 'ok',
          code,
          name,
          warehouse,
          unit,
          bookQty,
          location,
        });
        newItems.push({
          code,
          name,
          warehouse,
          unit,
          bookQty,
          actualQty: null,
          location,
          proposal: '',
          notes: '',
        });
      });

      if (previews.length === 0) {
        setParseError(
          'Không đọc được cột dữ liệu hợp lệ. Vui lòng tải file mẫu để kiểm tra đúng tên cột (Stt, Mã vật tư, Tên vật tư, Kho, ĐVT, Số lượng sổ sách, Vị trí).'
        );
        return;
      }

      setValidNewItems(newItems);
      setPreviewRows(previews);
    } catch (err) {
      console.error('Excel parse error:', err);
      setParseError('Không thể đọc tệp Excel. Vui lòng kiểm tra định dạng .xlsx, .xls hoặc .csv.');
    } finally {
      e.target.value = '';
    }
  };

  const handleImport = async () => {
    if (!fileName) return;

    if (!isInventoryModule) {
      setIsUploading(true);
      setTimeout(() => {
        setIsUploading(false);
        const randomImported = Math.floor(12 + Math.random() * 25);
        setSuccessCount(randomImported);
      }, 800);
      return;
    }

    if (validNewItems.length === 0) return;

    setIsUploading(true);
    setParseError(null);
    try {
      await onImportInventoryItems!(validNewItems);
      setSuccessCount(validNewItems.length);
    } catch (err: unknown) {
      console.error('Import error:', err);
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Lỗi lưu dữ liệu import.';
      setParseError(`Không thể import dữ liệu: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinish = () => {
    if (successCount) {
      onImportSuccess(successCount);
    }
    resetState();
    onClose();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Import Excel</h3>
              <p className="text-xs text-slate-300">Tải lên và xem trước danh sách {moduleName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 no-scrollbar">
          {successCount !== null ? (
            <div className="py-8 text-center space-y-3 max-w-md mx-auto">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="font-bold text-lg text-slate-800">Import thành công!</h4>
              <p className="text-sm text-slate-600">
                Đã thêm thành công <strong className="text-emerald-600">{successCount}</strong> bản ghi đủ điều kiện vào hệ thống.
                {duplicateCount > 0 && (
                  <span className="block text-xs text-amber-700 mt-1">
                    (Đã bỏ qua {duplicateCount} dòng trùng / không hợp lệ)
                  </span>
                )}
              </p>
              <button
                onClick={handleFinish}
                className="w-full mt-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
              >
                Hoàn tất
              </button>
            </div>
          ) : (
            <>
              {/* Download Template Banner + File Dropzone */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-blue-900 text-xs">
                    <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block mb-0.5">File mẫu chuẩn Import Excel:</span>
                      <span>
                        Cột: <strong>Stt, Mã vật tư, Tên vật tư, Kho, ĐVT, Số lượng sổ sách, Vị trí</strong>.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="shrink-0 px-3 py-1.5 bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải file mẫu</span>
                  </button>
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-3.5 text-center hover:border-blue-500 transition-colors bg-slate-50/50 relative flex items-center justify-center gap-3">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-left min-w-0">
                    <h4 className="text-sm font-semibold text-slate-700 truncate">
                      {fileName ? fileName : 'Kéo thả tệp Excel vào đây hoặc bấm để chọn'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Hỗ trợ .xlsx, .xls, .csv (Tối đa 10MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Parse Error */}
              {parseError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex flex-col gap-2 text-red-800 text-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{parseError}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5 pl-6">
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={isUploading || validNewItems.length === 0}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-2xs"
                    >
                      Thử lại
                    </button>
                    <button
                      type="button"
                      onClick={() => setParseError(null)}
                      className="px-2.5 py-1 text-slate-600 hover:text-slate-800 text-xs hover:underline"
                    >
                      Bỏ qua
                    </button>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              {isInventoryModule && previewRows.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                  {/* Summary Bar */}
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-slate-700">
                        Xem trước dữ liệu ({previewRows.length} dòng):
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đủ điều kiện: {validNewItems.length}
                      </span>
                      {duplicateCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Cảnh báo trùng / lỗi: {duplicateCount}
                        </span>
                      )}
                    </div>
                    {duplicateCount > 0 && (
                      <span className="text-[11px] text-slate-500">
                        Khi lưu sẽ chỉ import {validNewItems.length} dòng màu xanh lá đậm.
                      </span>
                    )}
                  </div>

                  {/* Table */}
                  <div className="max-h-[42vh] overflow-auto no-scrollbar">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-2.5 border-b border-r border-slate-200 text-center w-12">Dòng</th>
                          <th className="py-2 px-2.5 border-b border-r border-slate-200 w-44">Trạng thái</th>
                          <th className="py-2 px-2.5 border-b border-r border-slate-200 w-36">Mã vật tư</th>
                          <th className="py-2 px-2.5 border-b border-r border-slate-200 min-w-[220px]">Tên vật tư</th>
                          <th className="py-2 px-2.5 border-b border-r border-slate-200 w-24">Kho</th>
                          <th className="py-2 px-2.5 border-b border-r border-slate-200 text-center w-16">ĐVT</th>
                          <th className="py-2 px-2.5 border-b border-r border-slate-200 text-right w-24">SL sổ sách</th>
                          <th className="py-2 px-2.5 border-b border-slate-200 min-w-[150px]">Vị trí</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row) => {
                          const isOk = row.status === 'ok';
                          return (
                            <tr
                              key={`${row.rowNumber}-${row.code}`}
                              className={
                                isOk
                                  ? 'bg-white text-green-700 font-medium hover:bg-green-50/40'
                                  : 'bg-amber-50/70 text-red-700 hover:bg-amber-100/60'
                              }
                            >
                              <td className="py-1.5 px-2.5 border-b border-r border-slate-200 text-center">
                                {row.rowNumber}
                              </td>
                              <td className="py-1.5 px-2.5 border-b border-r border-slate-200">
                                {isOk ? (
                                  <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    Hợp lệ
                                  </span>
                                ) : (
                                  <span className="inline-flex items-start gap-1 text-red-700 font-semibold">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                                    <span>{row.reason}</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 border-b border-r border-slate-200 font-mono whitespace-nowrap">
                                {row.code}
                              </td>
                              <td className="py-1.5 px-2.5 border-b border-r border-slate-200">
                                {row.name}
                              </td>
                              <td className="py-1.5 px-2.5 border-b border-r border-slate-200 whitespace-nowrap">
                                {row.warehouse}
                              </td>
                              <td className="py-1.5 px-2.5 border-b border-r border-slate-200 text-center whitespace-nowrap">
                                {row.unit}
                              </td>
                              <td className="py-1.5 px-2.5 border-b border-r border-slate-200 text-right whitespace-nowrap">
                                {row.bookQty}
                              </td>
                              <td className="py-1.5 px-2.5 border-b border-slate-200">
                                {row.location}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={
                    !fileName ||
                    isUploading ||
                    (isInventoryModule && validNewItems.length === 0)
                  }
                  onClick={handleImport}
                  className={`px-5 py-2 rounded-xl text-white text-sm font-medium shadow-md transition-all flex items-center gap-2 ${
                    !fileName ||
                    isUploading ||
                    (isInventoryModule && validNewItems.length === 0)
                      ? 'bg-slate-300 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : isInventoryModule && validNewItems.length > 0 ? (
                    <span>Lưu & Import {validNewItems.length.toLocaleString('vi-VN')} dòng đủ điều kiện</span>
                  ) : (
                    <span>Tiến hành Import</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
