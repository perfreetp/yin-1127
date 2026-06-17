import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Invoice,
  InvoiceStatus,
  OcrResult,
  AccountVoucher,
  CompareDiff,
  Anomaly,
} from '../types';
import type { UploadedFile, LedgerRow } from './importStore';

interface InvoiceState {
  invoices: Invoice[];
  accountVouchers: AccountVoucher[];
  anomalies: Anomaly[];
  selectedInvoiceId: string | null;
  compareDiffs: Record<string, CompareDiff[]>;

  addInvoice: (invoice: Invoice) => void;
  addInvoices: (invoices: Invoice[]) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  setOcrResult: (id: string, ocrResult: OcrResult, confidence: number) => void;
  setSelectedInvoice: (id: string | null) => void;
  linkAccountVoucher: (invoiceId: string, voucherId: string) => void;
  clearInvoices: () => void;

  addAccountVouchers: (vouchers: AccountVoucher[]) => void;
  addAccountVoucher: (voucher: AccountVoucher) => void;
  updateAccountVoucher: (id: string, updates: Partial<AccountVoucher>) => void;
  deleteAccountVoucher: (id: string) => void;
  clearAccountVouchers: () => void;

  setCompareDiffs: (invoiceId: string, diffs: CompareDiff[]) => void;
  clearCompareDiffs: (invoiceId: string) => void;

  addAnomaly: (anomaly: Anomaly) => void;
  addAnomalies: (anomalies: Anomaly[]) => void;
  deleteAnomaly: (id: string) => void;
  deleteAnomaliesByInvoice: (invoiceId: string) => void;
  clearAnomalies: () => void;

  getInvoicesByProject: (projectId: string) => Invoice[];
  getVouchersByProject: (projectId: string) => AccountVoucher[];
  getAnomaliesByInvoice: (invoiceId: string) => Anomaly[];

  syncFromImport: (
    projectId: string,
    uploadedFiles: UploadedFile[],
    ledgerData: LedgerRow[]
  ) => void;
}

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      invoices: [],
      accountVouchers: [],
      anomalies: [],
      selectedInvoiceId: null,
      compareDiffs: {},

      addInvoice: (invoice) => {
        const { invoices } = get();
        set({ invoices: [...invoices, invoice] });
      },

      addInvoices: (newInvoices) => {
        const { invoices } = get();
        set({ invoices: [...invoices, ...newInvoices] });
      },

      updateInvoice: (id, updates) => {
        const { invoices } = get();
        set({
          invoices: invoices.map((inv) =>
            inv.id === id ? { ...inv, ...updates } : inv
          ),
        });
      },

      deleteInvoice: (id) => {
        const { invoices, anomalies, compareDiffs } = get();
        const newAnomalies = anomalies.filter((a) => a.invoiceId !== id);
        const newCompareDiffs = { ...compareDiffs };
        delete newCompareDiffs[id];
        set({
          invoices: invoices.filter((inv) => inv.id !== id),
          anomalies: newAnomalies,
          compareDiffs: newCompareDiffs,
          selectedInvoiceId:
            get().selectedInvoiceId === id ? null : get().selectedInvoiceId,
        });
      },

      setInvoiceStatus: (id, status) => {
        get().updateInvoice(id, { status });
      },

      setOcrResult: (id, ocrResult, confidence) => {
        get().updateInvoice(id, {
          ocrResult,
          recognitionConfidence: confidence,
          status: 'recognized',
        });
      },

      setSelectedInvoice: (id) => set({ selectedInvoiceId: id }),

      linkAccountVoucher: (invoiceId, voucherId) => {
        get().updateInvoice(invoiceId, { accountVoucherId: voucherId });
      },

      clearInvoices: () => {
        set({
          invoices: [],
          selectedInvoiceId: null,
          anomalies: [],
          compareDiffs: {},
        });
      },

      addAccountVouchers: (vouchers) => {
        const { accountVouchers } = get();
        set({ accountVouchers: [...accountVouchers, ...vouchers] });
      },

      addAccountVoucher: (voucher) => {
        const { accountVouchers } = get();
        set({ accountVouchers: [...accountVouchers, voucher] });
      },

      updateAccountVoucher: (id, updates) => {
        const { accountVouchers } = get();
        set({
          accountVouchers: accountVouchers.map((v) =>
            v.id === id ? { ...v, ...updates } : v
          ),
        });
      },

      deleteAccountVoucher: (id) => {
        const { accountVouchers, invoices } = get();
        set({
          accountVouchers: accountVouchers.filter((v) => v.id !== id),
          invoices: invoices.map((inv) =>
            inv.accountVoucherId === id
              ? { ...inv, accountVoucherId: undefined }
              : inv
          ),
        });
      },

      clearAccountVouchers: () => set({ accountVouchers: [] }),

      setCompareDiffs: (invoiceId, diffs) => {
        const { compareDiffs } = get();
        set({
          compareDiffs: { ...compareDiffs, [invoiceId]: diffs },
        });
      },

      clearCompareDiffs: (invoiceId) => {
        const { compareDiffs } = get();
        const newCompareDiffs = { ...compareDiffs };
        delete newCompareDiffs[invoiceId];
        set({ compareDiffs: newCompareDiffs });
      },

      addAnomaly: (anomaly) => {
        const { anomalies } = get();
        set({ anomalies: [...anomalies, anomaly] });
      },

      addAnomalies: (newAnomalies) => {
        const { anomalies } = get();
        set({ anomalies: [...anomalies, ...newAnomalies] });
      },

      deleteAnomaly: (id) => {
        const { anomalies } = get();
        set({ anomalies: anomalies.filter((a) => a.id !== id) });
      },

      deleteAnomaliesByInvoice: (invoiceId) => {
        const { anomalies } = get();
        set({ anomalies: anomalies.filter((a) => a.invoiceId !== invoiceId) });
      },

      clearAnomalies: () => set({ anomalies: [] }),

      getInvoicesByProject: (projectId) => {
        return get().invoices.filter((inv) => inv.projectId === projectId);
      },

      getVouchersByProject: (projectId) => {
        return get().accountVouchers.filter((v) => v.projectId === projectId);
      },

      getAnomaliesByInvoice: (invoiceId) => {
        return get().anomalies.filter((a) => a.invoiceId === invoiceId);
      },

      syncFromImport: (projectId, uploadedFiles, ledgerData) => {
        const generateId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        const newVouchers: AccountVoucher[] = ledgerData.map((ledger) => ({
          id: generateId(),
          projectId,
          voucherNo: ledger.voucherNo,
          voucherDate: ledger.voucherDate,
          summary: ledger.summary,
          amount: ledger.amount,
          accountCode: ledger.accountCode,
          accountName: ledger.accountName,
        }));

        const newInvoices: Invoice[] = uploadedFiles.map((file) => {
          const matchedVoucher = newVouchers.find((v) => v.voucherNo === file.voucherNo);
          return {
            id: generateId(),
            projectId,
            voucherNo: file.voucherNo,
            imageUrl: file.thumbnail || '',
            fileName: file.name,
            uploadTime: file.uploadTime,
            status: 'pending' as InvoiceStatus,
            accountVoucherId: matchedVoucher?.id,
          };
        });

        set((state) => ({
          invoices: [...state.invoices, ...newInvoices],
          accountVouchers: [...state.accountVouchers, ...newVouchers],
        }));
      },
    }),
    {
      name: 'audit-invoice-store',
    }
  )
);
