import { create } from 'zustand';
import type { Project } from '../types';
import { useInvoiceStore } from './invoiceStore';
import { useProjectStore } from './projectStore';

export interface UploadedFile {
  id: string;
  file: File | null;
  name: string;
  size: number;
  type: 'image' | 'pdf';
  thumbnail: string | null;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  voucherNo: string;
  uploadTime: string;
  error?: string;
}

export interface LedgerRow {
  id: string;
  voucherNo: string;
  voucherDate: string;
  summary: string;
  amount: number;
  accountCode: string;
  accountName: string;
}

export interface SortableVoucher {
  id: string;
  fileId: string;
  voucherNo: string;
  fileName: string;
  thumbnail: string | null;
  order: number;
}

interface ImportState {
  projectForm: {
    clientName: string;
    projectCode: string;
    periodStart: string;
    periodEnd: string;
    auditor: string;
  };
  uploadedFiles: UploadedFile[];
  sortableVouchers: SortableVoucher[];
  ledgerData: LedgerRow[];
  isLedgerImported: boolean;

  setProjectForm: (field: keyof ImportState['projectForm'], value: string) => void;
  setProjectFormAll: (values: Partial<ImportState['projectForm']>) => void;
  resetProjectForm: () => void;

  addUploadedFile: (file: UploadedFile) => void;
  updateUploadedFile: (id: string, updates: Partial<UploadedFile>) => void;
  removeUploadedFile: (id: string) => void;
  clearUploadedFiles: () => void;

  addSortableVoucher: (voucher: SortableVoucher) => void;
  addSortableVouchers: (vouchers: SortableVoucher[]) => void;
  updateSortableVoucher: (id: string, updates: Partial<SortableVoucher>) => void;
  reorderSortableVouchers: (fromIndex: number, toIndex: number) => void;
  removeSortableVoucher: (id: string) => void;
  clearSortableVouchers: () => void;

  setLedgerData: (data: LedgerRow[]) => void;
  setLedgerImported: (imported: boolean) => void;
  clearLedgerData: () => void;

  applyMockData: () => void;
  resetAll: () => void;

  saveProject: () => Project | null;
  syncToInvoiceStore: () => void;
}

const defaultProjectForm = {
  clientName: '',
  projectCode: '',
  periodStart: '',
  periodEnd: '',
  auditor: '',
};

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export { formatFileSize };

export const useImportStore = create<ImportState>()((set, get) => ({
  projectForm: { ...defaultProjectForm },
  uploadedFiles: [],
  sortableVouchers: [],
  ledgerData: [],
  isLedgerImported: false,

  setProjectForm: (field, value) =>
    set((state) => ({
      projectForm: { ...state.projectForm, [field]: value },
    })),

  setProjectFormAll: (values) =>
    set((state) => ({
      projectForm: { ...state.projectForm, ...values },
    })),

  resetProjectForm: () => set({ projectForm: { ...defaultProjectForm } }),

  addUploadedFile: (file) =>
    set((state) => ({ uploadedFiles: [...state.uploadedFiles, file] })),

  updateUploadedFile: (id, updates) =>
    set((state) => ({
      uploadedFiles: state.uploadedFiles.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),

  removeUploadedFile: (id) => {
    const { sortableVouchers } = get();
    set({
      uploadedFiles: get().uploadedFiles.filter((f) => f.id !== id),
      sortableVouchers: sortableVouchers
        .filter((v) => v.fileId !== id)
        .map((v, idx) => ({ ...v, order: idx })),
    });
  },

  clearUploadedFiles: () => {
    set({ uploadedFiles: [], sortableVouchers: [] });
  },

  addSortableVoucher: (voucher) =>
    set((state) => ({ sortableVouchers: [...state.sortableVouchers, voucher] })),

  addSortableVouchers: (vouchers) =>
    set((state) => {
      const nextOrder = state.sortableVouchers.length;
      const withOrder = vouchers.map((v, i) => ({ ...v, order: nextOrder + i }));
      return { sortableVouchers: [...state.sortableVouchers, ...withOrder] };
    }),

  updateSortableVoucher: (id, updates) =>
    set((state) => ({
      sortableVouchers: state.sortableVouchers.map((v) =>
        v.id === id ? { ...v, ...updates } : v
      ),
    })),

  reorderSortableVouchers: (fromIndex, toIndex) =>
    set((state) => {
      const sorted = [...state.sortableVouchers].sort(
        (a, b) => a.order - b.order
      );
      const [removed] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, removed);
      return {
        sortableVouchers: sorted.map((v, idx) => ({ ...v, order: idx })),
      };
    }),

  removeSortableVoucher: (id) =>
    set((state) => {
      const filtered = state.sortableVouchers
        .filter((v) => v.id !== id)
        .map((v, idx) => ({ ...v, order: idx }));
      return { sortableVouchers: filtered };
    }),

  clearSortableVouchers: () => set({ sortableVouchers: [] }),

  setLedgerData: (data) => set({ ledgerData: data, isLedgerImported: true }),

  setLedgerImported: (imported) => set({ isLedgerImported: imported }),

  clearLedgerData: () => set({ ledgerData: [], isLedgerImported: false }),

  applyMockData: () => {
    const mockProjectForm = {
      clientName: '北京华信科技股份有限公司',
      projectCode: 'AUD-2024-HX-001',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
      auditor: '张明远',
    };

    const mockFiles: UploadedFile[] = Array.from({ length: 8 }, (_, i) => {
      const isImage = i % 3 !== 2;
      const voucherMonth = String(Math.floor(i / 2) + 1).padStart(2, '0');
      const voucherDay = String((i % 15) + 10).padStart(2, '0');
      return {
        id: generateId(),
        file: null,
        name: isImage
          ? `发票_2024${voucherMonth}${voucherDay}_${String(i + 1).padStart(3, '0')}.jpg`
          : `凭证附件_${String(i + 1).padStart(3, '0')}.pdf`,
        size: isImage ? 1500000 + i * 120000 : 800000 + i * 95000,
        type: isImage ? 'image' : 'pdf',
        thumbnail: isImage
          ? `https://picsum.photos/seed/invoice${i + 1}/200/280`
          : null,
        progress: 100,
        status: 'success',
        voucherNo: `记-2024${voucherMonth}-${String((i % 50) + 1).padStart(4, '0')}`,
        uploadTime: `2024-${voucherMonth}-${voucherDay} 1${i % 9}:${String(
          (i * 7) % 60
        ).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`,
      };
    });

    const mockVouchers: SortableVoucher[] = mockFiles.map((f, idx) => ({
      id: generateId(),
      fileId: f.id,
      voucherNo: f.voucherNo,
      fileName: f.name,
      thumbnail: f.thumbnail,
      order: idx,
    }));

    const accountMap = [
      { code: '6601', name: '销售费用' },
      { code: '6602', name: '管理费用' },
      { code: '6603', name: '财务费用' },
      { code: '6401', name: '主营业务成本' },
      { code: '1403', name: '原材料' },
    ];

    const sellers = [
      '北京科技有限公司',
      '上海贸易发展公司',
      '广州电子科技股份有限公司',
      '深圳创新信息技术有限公司',
      '杭州软件开发有限公司',
    ];

    const mockLedger: LedgerRow[] = Array.from({ length: 15 }, (_, i) => {
      const month = String(Math.floor(i / 2) + 1).padStart(2, '0');
      const day = String((i % 20) + 5).padStart(2, '0');
      const account = accountMap[i % accountMap.length];
      const seller = sellers[i % sellers.length];
      return {
        id: generateId(),
        voucherNo: `记-2024${month}-${String((i % 80) + 1).padStart(4, '0')}`,
        voucherDate: `2024-${month}-${day}`,
        summary: `支付${seller}货款/服务费`,
        amount: Math.round((5000 + Math.random() * 95000) * 100) / 100,
        accountCode: account.code,
        accountName: account.name,
      };
    });

    set({
      projectForm: mockProjectForm,
      uploadedFiles: mockFiles,
      sortableVouchers: mockVouchers,
      ledgerData: mockLedger,
      isLedgerImported: true,
    });

    get().syncToInvoiceStore();
  },

  resetAll: () =>
    set({
      projectForm: { ...defaultProjectForm },
      uploadedFiles: [],
      sortableVouchers: [],
      ledgerData: [],
      isLedgerImported: false,
    }),

  saveProject: () => {
    const { projectForm } = get();
    if (
      !projectForm.clientName ||
      !projectForm.projectCode ||
      !projectForm.periodStart ||
      !projectForm.periodEnd ||
      !projectForm.auditor
    ) {
      return null;
    }

    const project: Project = {
      id: generateId(),
      clientName: projectForm.clientName,
      projectCode: projectForm.projectCode,
      periodStart: projectForm.periodStart,
      periodEnd: projectForm.periodEnd,
      auditor: projectForm.auditor,
      createTime: new Date().toISOString(),
    };

    return project;
  },

  syncToInvoiceStore: () => {
    const { projectForm, uploadedFiles, ledgerData } = get();
    if (!projectForm.clientName || !projectForm.projectCode) return;

    const projectStore = useProjectStore.getState();
    let projectId = projectStore.currentProject?.id;

    if (!projectId) {
      const project: Project = {
        id: generateId(),
        clientName: projectForm.clientName,
        projectCode: projectForm.projectCode,
        periodStart: projectForm.periodStart,
        periodEnd: projectForm.periodEnd,
        auditor: projectForm.auditor,
        createTime: new Date().toISOString(),
      };
      projectStore.addProject(project);
      projectId = project.id;
    }

    const invoiceStore = useInvoiceStore.getState();
    invoiceStore.syncFromImport(projectId, uploadedFiles, ledgerData);
  },
}));
