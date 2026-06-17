import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  InvoiceAnnotation,
  AuditFinding,
  AssertionType,
  AuditSuggestion,
  ReviewItem,
  ReviewConclusion,
} from '../types';

interface FindingState {
  annotations: InvoiceAnnotation[];
  findings: AuditFinding[];
  reviewItems: ReviewItem[];
  selectedFindingId: string | null;

  addAnnotation: (annotation: InvoiceAnnotation) => void;
  addAnnotations: (annotations: InvoiceAnnotation[]) => void;
  updateAnnotation: (id: string, updates: Partial<InvoiceAnnotation>) => void;
  deleteAnnotation: (id: string) => void;
  getAnnotationsByInvoice: (invoiceId: string) => InvoiceAnnotation[];
  clearAnnotations: () => void;

  addFinding: (finding: AuditFinding) => void;
  updateFinding: (id: string, updates: Partial<AuditFinding>) => void;
  deleteFinding: (id: string) => void;
  setSelectedFinding: (id: string | null) => void;
  addAssertionToFinding: (findingId: string, assertion: AssertionType) => void;
  removeAssertionFromFinding: (
    findingId: string,
    assertion: AssertionType
  ) => void;
  linkAnnotationToFinding: (findingId: string, annotationId: string) => void;
  unlinkAnnotationFromFinding: (findingId: string, annotationId: string) => void;
  setFindingSuggestion: (findingId: string, suggestion: AuditSuggestion) => void;
  getFindingsByInvoice: (invoiceId: string) => AuditFinding[];
  getFindingsByProject: (projectId: string, invoices: { id: string; projectId: string }[]) => AuditFinding[];
  clearFindings: () => void;

  addReviewItem: (item: ReviewItem) => void;
  addReviewItems: (items: ReviewItem[]) => void;
  updateReviewItem: (id: string, updates: Partial<ReviewItem>) => void;
  deleteReviewItem: (id: string) => void;
  setReviewConclusion: (
    id: string,
    conclusion: ReviewConclusion,
    reviewer: string,
    remark?: string
  ) => void;
  getReviewItemsByProject: (projectId: string) => ReviewItem[];
  clearReviewItems: () => void;

  clearAll: () => void;
}

export const useFindingStore = create<FindingState>()(
  persist(
    (set, get) => ({
      annotations: [],
      findings: [],
      reviewItems: [],
      selectedFindingId: null,

      addAnnotation: (annotation) => {
        const { annotations } = get();
        set({ annotations: [...annotations, annotation] });
      },

      addAnnotations: (newAnnotations) => {
        const { annotations } = get();
        set({ annotations: [...annotations, ...newAnnotations] });
      },

      updateAnnotation: (id, updates) => {
        const { annotations } = get();
        set({
          annotations: annotations.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        });
      },

      deleteAnnotation: (id) => {
        const { annotations, findings } = get();
        set({
          annotations: annotations.filter((a) => a.id !== id),
          findings: findings.map((f) => ({
            ...f,
            annotationIds: f.annotationIds.filter((aid) => aid !== id),
          })),
        });
      },

      getAnnotationsByInvoice: (invoiceId) => {
        return get().annotations.filter((a) => a.invoiceId === invoiceId);
      },

      clearAnnotations: () => set({ annotations: [] }),

      addFinding: (finding) => {
        const { findings } = get();
        set({
          findings: [...findings, finding],
          selectedFindingId: finding.id,
        });
      },

      updateFinding: (id, updates) => {
        const { findings } = get();
        set({
          findings: findings.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        });
      },

      deleteFinding: (id) => {
        const { findings, selectedFindingId } = get();
        set({
          findings: findings.filter((f) => f.id !== id),
          selectedFindingId: selectedFindingId === id ? null : selectedFindingId,
        });
      },

      setSelectedFinding: (id) => set({ selectedFindingId: id }),

      addAssertionToFinding: (findingId, assertion) => {
        const { findings } = get();
        set({
          findings: findings.map((f) =>
            f.id === findingId && !f.assertions.includes(assertion)
              ? { ...f, assertions: [...f.assertions, assertion] }
              : f
          ),
        });
      },

      removeAssertionFromFinding: (findingId, assertion) => {
        const { findings } = get();
        set({
          findings: findings.map((f) =>
            f.id === findingId
              ? { ...f, assertions: f.assertions.filter((a) => a !== assertion) }
              : f
          ),
        });
      },

      linkAnnotationToFinding: (findingId, annotationId) => {
        const { findings } = get();
        set({
          findings: findings.map((f) =>
            f.id === findingId && !f.annotationIds.includes(annotationId)
              ? { ...f, annotationIds: [...f.annotationIds, annotationId] }
              : f
          ),
        });
      },

      unlinkAnnotationFromFinding: (findingId, annotationId) => {
        const { findings } = get();
        set({
          findings: findings.map((f) =>
            f.id === findingId
              ? {
                  ...f,
                  annotationIds: f.annotationIds.filter((id) => id !== annotationId),
                }
              : f
          ),
        });
      },

      setFindingSuggestion: (findingId, suggestion) => {
        get().updateFinding(findingId, { suggestion });
      },

      getFindingsByInvoice: (invoiceId) => {
        return get().findings.filter((f) => f.invoiceId === invoiceId);
      },

      getFindingsByProject: (projectId, invoices) => {
        const projectInvoiceIds = invoices
          .filter((inv) => inv.projectId === projectId)
          .map((inv) => inv.id);
        return get().findings.filter((f) => projectInvoiceIds.includes(f.invoiceId));
      },

      clearFindings: () => {
        set({ findings: [], selectedFindingId: null });
      },

      addReviewItem: (item) => {
        const { reviewItems } = get();
        set({ reviewItems: [...reviewItems, item] });
      },

      addReviewItems: (items) => {
        const { reviewItems } = get();
        set({ reviewItems: [...reviewItems, ...items] });
      },

      updateReviewItem: (id, updates) => {
        const { reviewItems } = get();
        set({
          reviewItems: reviewItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        });
      },

      deleteReviewItem: (id) => {
        const { reviewItems } = get();
        set({ reviewItems: reviewItems.filter((item) => item.id !== id) });
      },

      setReviewConclusion: (id, conclusion, reviewer, remark) => {
        const { reviewItems } = get();
        set({
          reviewItems: reviewItems.map((item) =>
            item.id === id
              ? {
                  ...item,
                  conclusion,
                  reviewer,
                  reviewTime: new Date().toISOString(),
                  remark: remark ?? item.remark,
                }
              : item
          ),
        });
      },

      getReviewItemsByProject: (projectId) => {
        return get().reviewItems.filter((item) => item.projectId === projectId);
      },

      clearReviewItems: () => set({ reviewItems: [] }),

      clearAll: () => {
        set({
          annotations: [],
          findings: [],
          reviewItems: [],
          selectedFindingId: null,
        });
      },
    }),
    {
      name: 'audit-finding-store',
    }
  )
);
