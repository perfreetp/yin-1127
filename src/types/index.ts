export interface Project {
  id: string;
  clientName: string;
  projectCode: string;
  periodStart: string;
  periodEnd: string;
  auditor: string;
  createTime: string;
}

export type InvoiceStatus = 'pending' | 'recognizing' | 'recognized' | 'doubt' | 'confirmed';

export interface Invoice {
  id: string;
  projectId: string;
  voucherNo: string;
  imageUrl: string;
  fileName: string;
  uploadTime: string;
  status: InvoiceStatus;
  ocrResult?: OcrResult;
  recognitionConfidence?: number;
  accountVoucherId?: string;
}

export interface OcrResult {
  invoiceNo: string;
  invoiceCode: string;
  invoiceDate: string;
  amount: number;
  taxAmount: number;
  priceAmount: number;
  sellerName: string;
  sellerTaxNo: string;
  buyerName: string;
  summary: string;
  remark: string;
}

export interface AccountVoucher {
  id: string;
  projectId: string;
  voucherNo: string;
  voucherDate: string;
  summary: string;
  amount: number;
  accountCode: string;
  accountName: string;
}

export type DiffType = 'amount' | 'date' | 'summary' | 'other';
export type DiffLevel = 'warning' | 'critical' | 'minor';

export interface CompareDiff {
  field: string;
  ocrValue: string;
  accountValue: string;
  diffType: DiffType;
  diffLevel: DiffLevel;
}

export type AnomalyType =
  | 'consecutive_no'
  | 'weekend'
  | 'duplicate'
  | 'round_amount'
  | 'amount_mismatch';

export type AnomalyLevel = 'high' | 'medium' | 'low';

export interface Anomaly {
  id: string;
  invoiceId: string;
  type: AnomalyType;
  level: AnomalyLevel;
  description: string;
  relatedInvoices?: string[];
}

export interface InvoiceAnnotation {
  id: string;
  invoiceId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  ocrReread?: string;
  createTime: string;
}

export type AssertionType =
  | 'existence'
  | 'completeness'
  | 'accuracy'
  | 'cutoff'
  | 'classification';

export interface AssertionTag {
  type: AssertionType;
  label: string;
  color: string;
}

export type SuggestionType = 'confirmation' | 'supplement' | 'adjustment' | 'note';
export type SuggestionStatus = 'pending' | 'in_progress' | 'completed';

export interface AuditSuggestion {
  type: SuggestionType;
  content: string;
  responsible: string;
  deadline?: string;
  status: SuggestionStatus;
}

export interface AuditFinding {
  id: string;
  invoiceId: string;
  title: string;
  description: string;
  assertions: AssertionType[];
  annotationIds: string[];
  suggestion?: AuditSuggestion;
  createTime: string;
  createBy: string;
}

export type ReviewConclusion = 'pass' | 'fail' | 'pending';

export interface ReviewItem {
  id: string;
  projectId: string;
  category: string;
  content: string;
  conclusion: ReviewConclusion;
  reviewer?: string;
  reviewTime?: string;
  remark?: string;
}
