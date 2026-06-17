import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  Play,
  Flag,
  Edit3,
  GripVertical,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Loader2,
  ZoomIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageViewer from '@/components/invoice/ImageViewer';
import { useInvoiceStore } from '@/store/invoiceStore';
import type {
  Invoice,
  InvoiceStatus,
  OcrResult,
  AccountVoucher,
  CompareDiff,
  DiffLevel,
} from '../types';
import {
  simulateOCR,
  createMockOCRResult,
  getFieldValue,
  analyzeConfidence,
  type OCRResult as OCRResultEngine,
  type OCRField,
  type ScanProgress,
} from '../utils/ocrEngine';
import {
  AnomalyDetector,
  quickDetect,
  type Anomaly,
  type AnomalySeverity,
  type InvoiceRecord,
  type LedgerRecord,
} from '../utils/anomalyDetector';
import { generateMockDataset } from '../utils/mockData';

const IMPORTANT_FIELDS = [
  '发票号码',
  '发票代码',
  '开票日期',
  '销售方名称',
  '销售方纳税人识别号',
  '购买方名称',
  '购买方纳税人识别号',
  '价税合计(小写)',
  '金额合计',
  '税额合计',
];

const FIELD_LABEL_MAP: Record<string, string> = {
  '发票号码': '发票号码',
  '发票代码': '发票代码',
  '开票日期': '开票日期',
  '销售方名称': '销售方',
  '销售方纳税人识别号': '销售方税号',
  '购买方名称': '购买方',
  '购买方纳税人识别号': '购买方税号',
  '价税合计(小写)': '价税合计',
  '金额合计': '不含税金额',
  '税额合计': '税额',
};

export default function ComparePage() {
  const navigate = useNavigate();
  const {
    invoices,
    selectedInvoiceId,
    accountVouchers,
    addInvoices,
    addAccountVouchers,
    setSelectedInvoice,
    setInvoiceStatus,
    setOcrResult,
    updateInvoice,
  } = useInvoiceStore();

  const [leftWidth, setLeftWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResults, setOcrResults] = useState<Record<string, OCRResultEngine>>({});
  const [fieldConfidence, setFieldConfidence] = useState<Record<string, OCRField[]>>({});
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [compareDiffsMap, setCompareDiffsMap] = useState<Record<string, CompareDiff[]>>({});
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId) || null;
  const selectedIndex = invoices.findIndex((inv) => inv.id === selectedInvoiceId);
  const linkedVoucher = selectedInvoice?.accountVoucherId
    ? accountVouchers.find((v) => v.id === selectedInvoice.accountVoucherId)
    : null;

  const currentOcrResult = selectedInvoiceId ? ocrResults[selectedInvoiceId] : null;
  const currentConfidence = selectedInvoiceId ? fieldConfidence[selectedInvoiceId] : [];
  const currentDiffs = selectedInvoiceId ? compareDiffsMap[selectedInvoiceId] || [] : [];
  const invoiceAnomalies = useMemo(
    () => anomalies.filter((a) => a.affectedRecords.includes(selectedInvoiceId || '')),
    [anomalies, selectedInvoiceId]
  );

  useEffect(() => {
    if (invoices.length === 0) {
      const dataset = generateMockDataset({
        invoiceCount: 15,
        seed: 20240101,
        includeAnomalies: true,
      });

      const sampleImageUrl =
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80';

      const newInvoices: Invoice[] = dataset.invoices.map((inv, idx) => ({
        id: inv.id,
        projectId: 'proj_demo',
        voucherNo: inv.voucherNumber || '',
        imageUrl: sampleImageUrl,
        fileName: `发票_${idx + 1}_${inv.invoiceNumber}.jpg`,
        uploadTime: new Date().toISOString(),
        status: 'pending' as InvoiceStatus,
        accountVoucherId: undefined,
      }));

      const vouchers: AccountVoucher[] = dataset.ledgers.map((led) => ({
        id: led.id,
        projectId: 'proj_demo',
        voucherNo: led.voucherNumber,
        voucherDate: typeof led.entryDate === 'string' ? led.entryDate : led.entryDate.toISOString(),
        summary: led.description || `采购支出 - ${led.category}`,
        amount: led.amount,
        accountCode: `660${(led.category.length % 9) + 1}`,
        accountName: led.category,
      }));

      addInvoices(newInvoices);
      addAccountVouchers(vouchers);

      const linkedInvoices = newInvoices.map((inv, idx) => {
        const matchingLedger = dataset.ledgers[idx];
        if (matchingLedger && matchingLedger.invoiceCode && matchingLedger.invoiceNumber) {
          const datasetInv = dataset.invoices[idx];
          if (
            datasetInv &&
            datasetInv.invoiceCode === matchingLedger.invoiceCode &&
            datasetInv.invoiceNumber === matchingLedger.invoiceNumber
          ) {
            return { ...inv, accountVoucherId: vouchers[idx]?.id };
          }
        }
        return inv;
      });

      useInvoiceStore.setState({ invoices: linkedInvoices });

      const detectAnomalies = quickDetect(dataset.invoices, dataset.ledgers, {
        holidayDates: [],
      });
      setAnomalies(detectAnomalies);

      if (linkedInvoices.length > 0) {
        setSelectedInvoice(linkedInvoices[0].id);
      }

      dataset.invoices.forEach((inv, idx) => {
        const ocrResult = createMockOCRResult(20240101 + idx);
        const confidence = analyzeConfidence(ocrResult);
        setOcrResults((prev) => ({ ...prev, [linkedInvoices[idx].id]: ocrResult }));
        setFieldConfidence((prev) => ({ ...prev, [linkedInvoices[idx].id]: confidence.needsReview }));

        const diffs = computeDiffs(linkedInvoices[idx], ocrResult, vouchers[idx]);
        if (diffs.length > 0) {
          setCompareDiffsMap((prev) => ({ ...prev, [linkedInvoices[idx].id]: diffs }));
        }
      });
    }
  }, [invoices.length, addInvoices, addAccountVouchers, setSelectedInvoice]);

  const computeDiffs = useCallback(
    (
      invoice: Invoice,
      ocrResult: OCRResultEngine,
      voucher: AccountVoucher | undefined
    ): CompareDiff[] => {
      if (!voucher) return [];

      const diffs: CompareDiff[] = [];

      const ocrAmount = getFieldValue(ocrResult, '价税合计(小写)');
      const ocrAmountNum = parseFloat(ocrAmount.replace(/[¥￥,\s]/g, '')) || 0;
      if (ocrAmountNum > 0 && Math.abs(ocrAmountNum - voucher.amount) > 0.01) {
        diffs.push({
          field: '价税合计',
          ocrValue: ocrAmount,
          accountValue: `¥${voucher.amount.toFixed(2)}`,
          diffType: 'amount',
          diffLevel: Math.abs(ocrAmountNum - voucher.amount) > 100 ? 'critical' : 'warning',
        });
      }

      const ocrDate = getFieldValue(ocrResult, '开票日期');
      if (ocrDate && voucher.voucherDate) {
        const voucherDateStr = new Date(voucher.voucherDate).toISOString().slice(0, 10);
        const ocrClean = ocrDate.replace(/[年月日]/g, '-').replace(/年/g, '-').replace(/-+/g, '-');
        if (!ocrClean.includes(voucherDateStr.slice(0, 7)) && Math.abs(ocrAmountNum - voucher.amount) < 1) {
          diffs.push({
            field: '开票日期',
            ocrValue: ocrDate,
            accountValue: voucherDateStr,
            diffType: 'date',
            diffLevel: 'warning',
          });
        }
      }

      const ocrSeller = getFieldValue(ocrResult, '销售方名称');
      if (ocrSeller && voucher.summary && !voucher.summary.includes(ocrSeller.slice(0, 4))) {
        diffs.push({
          field: '销售方/摘要',
          ocrValue: ocrSeller,
          accountValue: voucher.summary,
          diffType: 'other',
          diffLevel: 'minor',
        });
      }

      return diffs;
    },
    []
  );

  const handleMouseDownResizer = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(75, Math.max(25, newWidth)));
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handlePrevInvoice = useCallback(() => {
    if (selectedIndex > 0) {
      setSelectedInvoice(invoices[selectedIndex - 1].id);
    }
  }, [selectedIndex, invoices, setSelectedInvoice]);

  const handleNextInvoice = useCallback(() => {
    if (selectedIndex < invoices.length - 1) {
      setSelectedInvoice(invoices[selectedIndex + 1].id);
    }
  }, [selectedIndex, invoices, setSelectedInvoice]);

  const handleAnomalyClick = useCallback(
    (anomaly: Anomaly) => {
      const affectedId = anomaly.affectedRecords[0];
      if (affectedId && invoices.some((inv) => inv.id === affectedId)) {
        setSelectedInvoice(affectedId);
      }
    },
    [invoices, setSelectedInvoice]
  );

  const handleRecognize = useCallback(async () => {
    if (!selectedInvoice || isScanning) return;

    setIsScanning(true);
    setScanProgress({
      phase: 'loading',
      progress: 0,
      message: '正在加载图像...',
    });

    try {
      const result = await simulateOCR(selectedInvoice.imageUrl, {
        onProgress: setScanProgress,
        minDurationMs: 1800,
      });

      setOcrResults((prev) => ({ ...prev, [selectedInvoice.id]: result }));

      const confidence = analyzeConfidence(result);
      setFieldConfidence((prev) => ({ ...prev, [selectedInvoice.id]: confidence.needsReview }));

      const voucher = selectedInvoice.accountVoucherId
        ? accountVouchers.find((v) => v.id === selectedInvoice.accountVoucherId)
        : null;
      const diffs = computeDiffs(selectedInvoice, result, voucher);
      if (diffs.length > 0) {
        setCompareDiffsMap((prev) => ({ ...prev, [selectedInvoice.id]: diffs }));
      }

      const overallConf = result.overallConfidence;
      setOcrResult(
        selectedInvoice.id,
        {
          invoiceNo: getFieldValue(result, '发票号码'),
          invoiceCode: getFieldValue(result, '发票代码'),
          invoiceDate: getFieldValue(result, '开票日期'),
          amount: parseFloat(getFieldValue(result, '价税合计(小写)').replace(/[¥￥,\s]/g, '')) || 0,
          taxAmount: parseFloat(getFieldValue(result, '税额合计').replace(/[¥￥,\s]/g, '')) || 0,
          priceAmount: parseFloat(getFieldValue(result, '金额合计').replace(/[¥￥,\s]/g, '')) || 0,
          sellerName: getFieldValue(result, '销售方名称'),
          sellerTaxNo: getFieldValue(result, '销售方纳税人识别号'),
          buyerName: getFieldValue(result, '购买方名称'),
          summary: '',
          remark: '',
        },
        overallConf
      );
    } catch (err) {
      console.error('OCR failed:', err);
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  }, [selectedInvoice, isScanning, accountVouchers, computeDiffs, setOcrResult]);

  const handleBatchRecognize = useCallback(async () => {
    if (isBatchProcessing) return;
    setIsBatchProcessing(true);

    const pendingInvoices = invoices.filter((inv) => inv.status === 'pending');

    for (const inv of pendingInvoices) {
      setSelectedInvoice(inv.id);
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          try {
            const result = await simulateOCR(inv.imageUrl, { minDurationMs: 400 });
            setOcrResults((prev) => ({ ...prev, [inv.id]: result }));

            const confidence = analyzeConfidence(result);
            setFieldConfidence((prev) => ({ ...prev, [inv.id]: confidence.needsReview }));

            const voucher = inv.accountVoucherId
              ? accountVouchers.find((v) => v.id === inv.accountVoucherId)
              : null;
            const diffs = computeDiffs(inv, result, voucher);
            if (diffs.length > 0) {
              setCompareDiffsMap((prev) => ({ ...prev, [inv.id]: diffs }));
            }

            const overallConf = result.overallConfidence;
            setOcrResult(
              inv.id,
              {
                invoiceNo: getFieldValue(result, '发票号码'),
                invoiceCode: getFieldValue(result, '发票代码'),
                invoiceDate: getFieldValue(result, '开票日期'),
                amount: parseFloat(getFieldValue(result, '价税合计(小写)').replace(/[¥￥,\s]/g, '')) || 0,
                taxAmount: parseFloat(getFieldValue(result, '税额合计').replace(/[¥￥,\s]/g, '')) || 0,
                priceAmount: parseFloat(getFieldValue(result, '金额合计').replace(/[¥￥,\s]/g, '')) || 0,
                sellerName: getFieldValue(result, '销售方名称'),
                sellerTaxNo: getFieldValue(result, '销售方纳税人识别号'),
                buyerName: getFieldValue(result, '购买方名称'),
                summary: '',
                remark: '',
              },
              overallConf
            );
          } catch (err) {
            console.error('Batch OCR failed for', inv.id, err);
          }
          resolve();
        }, 100);
      });
    }

    setIsBatchProcessing(false);
  }, [invoices, isBatchProcessing, accountVouchers, computeDiffs, setSelectedInvoice, setOcrResult]);

  const handleMarkDoubt = useCallback(() => {
    if (!selectedInvoice) return;
    setInvoiceStatus(
      selectedInvoice.id,
      selectedInvoice.status === 'doubt' ? 'recognized' : 'doubt'
    );
  }, [selectedInvoice, setInvoiceStatus]);

  const handleJumpToAnnotation = useCallback(() => {
    if (selectedInvoice) {
      setSelectedInvoice(selectedInvoice.id);
      navigate('/mark');
    }
  }, [selectedInvoice, setSelectedInvoice, navigate]);

  const severityIcon = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertOctagon className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'low':
        return <AlertTriangle className="w-4 h-4 text-blue-500" />;
    }
  };

  const severityBg = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:border-red-900/60';
      case 'high':
        return 'bg-red-50/60 border-red-200/60 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-900/40';
      case 'medium':
        return 'bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40';
      case 'low':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40';
    }
  };

  const confidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400';
    if (conf >= 0.75) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400';
    return 'text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400';
  };

  const diffBgClass = (level: DiffLevel) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 border-red-300 animate-blink dark:bg-red-950/60 dark:border-red-800';
      case 'warning':
        return 'bg-amber-100 border-amber-300 animate-blink dark:bg-amber-950/60 dark:border-amber-800';
      case 'minor':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800/50';
    }
  };

  const diffForField = (fieldLabel: string): CompareDiff | undefined => {
    return currentDiffs.find((d) => {
      const mapped = FIELD_LABEL_MAP[d.field] || d.field;
      return mapped === fieldLabel || d.field === fieldLabel;
    });
  };

  const accountValueForField = (fieldLabel: string): string | undefined => {
    if (!linkedVoucher) return undefined;
    switch (fieldLabel) {
      case '价税合计':
        return `¥${linkedVoucher.amount.toFixed(2)}`;
      case '开票日期':
        return linkedVoucher.voucherDate ? new Date(linkedVoucher.voucherDate).toISOString().slice(0, 10) : undefined;
      case '销售方':
      case '销售方/摘要':
        return linkedVoucher.summary;
      case '不含税金额':
        return linkedVoucher.amount ? `¥${(linkedVoucher.amount / 1.13).toFixed(2)}` : undefined;
      case '税额':
        return linkedVoucher.amount ? `¥${(linkedVoucher.amount - linkedVoucher.amount / 1.13).toFixed(2)}` : undefined;
      default:
        return undefined;
    }
  };

  const getDiffArrow = (ocrVal: string, accountVal: string): string => {
    const ocrNum = parseFloat(ocrVal.replace(/[¥￥,\s]/g, ''));
    const accNum = parseFloat(accountVal.replace(/[¥￥,\s]/g, ''));
    if (!isNaN(ocrNum) && !isNaN(accNum)) {
      return ocrNum > accNum ? '↑' : ocrNum < accNum ? '↓' : '=';
    }
    return '↔';
  };

  return (
    <div className="h-full flex flex-col bg-audit-paper-dark/30 dark:bg-[#141619]">
      <div className="flex-none border-b border-audit-border dark:border-[#2d3139] bg-white/80 dark:bg-[#1a1d23]/80 backdrop-blur-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-audit-ink dark:text-[#e8e6e2] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-audit-amber" />
              异常检测提示
              <span className="text-xs font-normal text-audit-ink-light dark:text-[#8a8782]">
                （共 {anomalies.length} 条异常 · 点击卡片可快速定位）
              </span>
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertOctagon className="w-3 h-3" /> 严重
                {anomalies.filter((a) => a.severity === 'critical').length}
              </span>
              <span className="flex items-center gap-1 text-red-500 dark:text-red-400/80">
                <AlertCircle className="w-3 h-3" /> 高
                {anomalies.filter((a) => a.severity === 'high').length}
              </span>
              <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400/80">
                <AlertTriangle className="w-3 h-3" /> 中
                {anomalies.filter((a) => a.severity === 'medium').length}
              </span>
              <span className="flex items-center gap-1 text-blue-500 dark:text-blue-400/80">
                <AlertTriangle className="w-3 h-3" /> 低
                {anomalies.filter((a) => a.severity === 'low').length}
              </span>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {anomalies.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-4 text-sm text-audit-ink-light dark:text-[#8a8782]">
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                暂无异常检测结果
              </div>
            ) : (
              anomalies.map((anomaly) => {
                const isActive = anomaly.affectedRecords.includes(selectedInvoiceId || '');
                return (
                  <button
                    key={anomaly.id}
                    onClick={() => handleAnomalyClick(anomaly)}
                    className={cn(
                      'flex-none w-72 p-3 rounded-lg border transition-all duration-200',
                      'text-left shadow-audit hover:shadow-audit-hover hover:-translate-y-0.5',
                      severityBg(anomaly.severity),
                      isActive && 'ring-2 ring-audit-navy dark:ring-[#6b9fd4] ring-offset-1'
                    )}
                  >
                    <div className="flex items-start gap-2 mb-1.5">
                      {severityIcon(anomaly.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-audit-ink dark:text-[#e8e6e2] truncate">
                          {anomaly.title}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-audit-ink-light dark:text-[#8a8782] line-clamp-2 leading-relaxed">
                      {anomaly.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-white/70 dark:bg-black/20 text-audit-ink-light dark:text-[#8a8782]">
                        涉及 {anomaly.affectedRecords.length} 张票据
                      </span>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded bg-audit-navy/10 dark:bg-[#3d6499]/30 text-audit-navy dark:text-[#6b9fd4] font-medium">
                          当前票据
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 flex min-h-0 overflow-hidden">
        <div
          className="flex flex-col min-w-0 bg-white dark:bg-[#1a1d23]"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="flex-none p-3 border-b border-audit-border dark:border-[#2d3139] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-audit-ink dark:text-[#e8e6e2]">
                票据影像与OCR识别结果
              </h3>
              {selectedInvoice && (
                <span className="text-xs px-2 py-0.5 rounded bg-audit-navy/10 dark:bg-[#3d6499]/30 text-audit-navy dark:text-[#6b9fd4] font-mono">
                  {selectedInvoice.fileName}
                </span>
              )}
            </div>
            <button
              onClick={handleRecognize}
              disabled={isScanning || !selectedInvoice}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                isScanning
                  ? 'bg-audit-navy/10 text-audit-navy dark:bg-[#3d6499]/30 dark:text-[#6b9fd4] cursor-wait'
                  : 'bg-audit-navy text-white hover:bg-audit-navy-light dark:bg-[#3d6499] dark:hover:bg-[#4a74a8]'
              )}
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  识别中 {scanProgress ? `${Math.round(scanProgress.progress * 100)}%` : ''}
                </>
              ) : (
                <>
                  <ZoomIn className="w-3.5 h-3.5" />
                  识别当前
                </>
              )}
            </button>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-none h-[55%] min-h-[280px] border-b border-audit-border dark:border-[#2d3139]">
              {selectedInvoice?.imageUrl ? (
                <ImageViewer
                  src={selectedInvoice.imageUrl}
                  alt={selectedInvoice.fileName}
                  showScanLine={isScanning}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-audit-ink-light dark:text-[#8a8782]">
                  请选择一张票据
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-audit-ink dark:text-[#e8e6e2] uppercase tracking-wider">
                    OCR识别字段
                  </h4>
                  {currentOcrResult && (
                    <span className="text-xs text-audit-ink-light dark:text-[#8a8782]">
                      整体置信度:
                      <span
                        className={cn(
                          'ml-1 px-1.5 py-0.5 rounded font-mono font-medium',
                          confidenceColor(currentOcrResult.overallConfidence)
                        )}
                      >
                        {Math.round(currentOcrResult.overallConfidence * 100)}%
                      </span>
                    </span>
                  )}
                </div>

                {!currentOcrResult ? (
                  <div className="py-8 text-center text-sm text-audit-ink-light dark:text-[#8a8782]">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-audit-paper-dark dark:bg-[#22262f] flex items-center justify-center">
                      <ZoomIn className="w-5 h-5 text-audit-ink-light/60 dark:text-[#6a6762]" />
                    </div>
                    点击上方「识别当前」开始OCR识别
                  </div>
                ) : (
                  <div className="space-y-2">
                    {IMPORTANT_FIELDS.map((fieldKey) => {
                      const field = currentOcrResult.fields.find(
                        (f) => f.name === fieldKey
                      );
                      const label = FIELD_LABEL_MAP[fieldKey] || fieldKey;
                      const diff = diffForField(label);
                      const accValue = accountValueForField(label);
                      const hasDiff = !!diff;

                      return (
                        <div
                          key={fieldKey}
                          className={cn(
                            'rounded-lg border p-2.5 transition-all',
                            hasDiff
                              ? diffBgClass(diff!.diffLevel)
                              : 'bg-white dark:bg-[#22262f] border-audit-border dark:border-[#2d3139]'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium text-audit-ink-light dark:text-[#8a8782]">
                              {label}
                            </span>
                            {field && (
                              <span
                                className={cn(
                                  'text-[10px] font-mono px-1.5 py-0.5 rounded',
                                  confidenceColor(field.confidence)
                                )}
                              >
                                {Math.round(field.confidence * 100)}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-mono text-audit-ink dark:text-[#e8e6e2] break-all">
                                {field?.value || (
                                  <span className="text-audit-ink-light/50 dark:text-[#6a6762] italic">
                                    ——
                                  </span>
                                )}
                              </div>
                              {hasDiff && diff && accValue && (
                                <div className="mt-1.5 pt-1.5 border-t border-current/10 flex items-center gap-2">
                                  <ArrowLeftRight className="w-3 h-3 text-audit-ink-light dark:text-[#8a8782] flex-none" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[10px] text-audit-ink-light dark:text-[#8a8782] mb-0.5">
                                      账载数据:
                                    </div>
                                    <div className="text-sm font-mono break-all text-audit-ink dark:text-[#e8e6e2]">
                                      {accValue}
                                    </div>
                                  </div>
                                  <span
                                    className={cn(
                                      'text-lg font-bold flex-none',
                                      diff!.diffLevel === 'critical'
                                        ? 'text-red-600 dark:text-red-400'
                                        : diff!.diffLevel === 'warning'
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-yellow-600 dark:text-yellow-400'
                                    )}
                                    title={
                                      diff!.ocrValue !== accValue ? '存在差异' : '一致'
                                    }
                                  >
                                    {getDiffArrow(diff!.ocrValue, diff!.accountValue)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {currentConfidence.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-audit-border dark:border-[#2d3139]">
                        <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          需人工复核字段 ({currentConfidence.length})
                        </h4>
                        <div className="grid grid-cols-2 gap-1.5">
                          {currentConfidence.slice(0, 10).map((f) => (
                            <div
                              key={f.name}
                              className="text-[11px] px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/30 text-audit-ink dark:text-[#e8e6e2] truncate"
                              title={f.value}
                            >
                              <span className="text-audit-ink-light dark:text-[#8a8782]">
                                {f.name}:
                              </span>{' '}
                              <span className="font-mono">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          onMouseDown={handleMouseDownResizer}
          className={cn(
            'flex-none w-1.5 cursor-col-resize flex items-center justify-center transition-colors',
            isResizing
              ? 'bg-audit-navy dark:bg-[#3d6499]'
              : 'bg-audit-border dark:bg-[#2d3139] hover:bg-audit-navy/30 dark:hover:bg-[#3d6499]/50'
          )}
        >
          <div
            className={cn(
              'p-1 rounded transition-colors',
              isResizing
                ? 'bg-white dark:bg-[#22262f]'
                : 'bg-transparent'
            )}
          >
            <GripVertical
              className={cn(
                'w-3 h-3 transition-colors',
                isResizing
                  ? 'text-audit-navy dark:text-[#6b9fd4]'
                  : 'text-audit-ink-light/40 dark:text-[#6a6762]'
              )}
            />
          </div>
        </div>

        <div
          className="flex flex-col min-w-0 bg-audit-paper-dark/20 dark:bg-[#16191f]"
          style={{ width: `${100 - leftWidth}%` }}
        >
          <div className="flex-none p-3 border-b border-audit-border dark:border-[#2d3139] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-audit-ink dark:text-[#e8e6e2]">
              账载凭证数据比对
            </h3>
            {currentDiffs.length > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-medium">
                <XCircle className="w-3.5 h-3.5" />
                存在 {currentDiffs.length} 处差异
              </span>
            )}
            {currentDiffs.length === 0 && linkedVoucher && currentOcrResult && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                数据一致
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <div className="p-3 space-y-3">
              <div className="rounded-lg border border-audit-border dark:border-[#2d3139] bg-white dark:bg-[#1a1d23] overflow-hidden">
                <div className="px-3 py-2 bg-audit-paper-dark/50 dark:bg-[#22262f]/60 border-b border-audit-border dark:border-[#2d3139]">
                  <h4 className="text-xs font-semibold text-audit-ink dark:text-[#e8e6e2]">
                    凭证基本信息
                  </h4>
                </div>
                <div className="p-3">
                  {!linkedVoucher ? (
                    <div className="py-6 text-center text-sm text-audit-ink-light dark:text-[#8a8782]">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-audit-ink-light/40 dark:text-[#6a6762]" />
                      该票据暂未关联账载凭证
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-audit-ink-light dark:text-[#8a8782] block mb-1">
                          凭证编号
                        </label>
                        <div className="text-sm font-mono text-audit-ink dark:text-[#e8e6e2] px-2.5 py-1.5 rounded bg-audit-paper-dark/30 dark:bg-[#22262f]">
                          {linkedVoucher.voucherNo}
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-audit-ink-light dark:text-[#8a8782] block mb-1">
                          凭证日期
                        </label>
                        <div
                          className={cn(
                            'text-sm font-mono text-audit-ink dark:text-[#e8e6e2] px-2.5 py-1.5 rounded',
                            diffForField('开票日期')
                              ? diffBgClass(diffForField('开票日期')!.diffLevel)
                              : 'bg-audit-paper-dark/30 dark:bg-[#22262f]'
                          )}
                        >
                          {linkedVoucher.voucherDate
                            ? new Date(linkedVoucher.voucherDate).toISOString().slice(0, 10)
                            : '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-audit-ink-light dark:text-[#8a8782] block mb-1">
                          科目代码
                        </label>
                        <div className="text-sm font-mono text-audit-ink dark:text-[#e8e6e2] px-2.5 py-1.5 rounded bg-audit-paper-dark/30 dark:bg-[#22262f]">
                          {linkedVoucher.accountCode}
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-audit-ink-light dark:text-[#8a8782] block mb-1">
                          科目名称
                        </label>
                        <div className="text-sm font-mono text-audit-ink dark:text-[#e8e6e2] px-2.5 py-1.5 rounded bg-audit-paper-dark/30 dark:bg-[#22262f] truncate">
                          {linkedVoucher.accountName}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[11px] text-audit-ink-light dark:text-[#8a8782] block mb-1">
                          摘要 / 销售方
                        </label>
                        <div
                          className={cn(
                            'text-sm font-mono text-audit-ink dark:text-[#e8e6e2] px-2.5 py-1.5 rounded',
                            diffForField('销售方') || diffForField('销售方/摘要')
                              ? diffBgClass(
                                  (diffForField('销售方') || diffForField('销售方/摘要'))!.diffLevel
                                )
                              : 'bg-audit-paper-dark/30 dark:bg-[#22262f]'
                          )}
                        >
                          {linkedVoucher.summary}
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-audit-ink-light dark:text-[#8a8782] block mb-1">
                          入账金额
                        </label>
                        <div
                          className={cn(
                            'text-lg font-mono font-bold text-audit-navy dark:text-[#6b9fd4] px-2.5 py-1.5 rounded',
                            diffForField('价税合计')
                              ? diffBgClass(diffForField('价税合计')!.diffLevel)
                              : 'bg-audit-paper-dark/30 dark:bg-[#22262f]'
                          )}
                        >
                          ¥{linkedVoucher.amount.toFixed(2)}
                          {diffForField('价税合计') && (
                            <span
                              className={cn(
                                'ml-2 text-base',
                                diffForField('价税合计')!.diffLevel === 'critical'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              )}
                            >
                              {getDiffArrow(
                                diffForField('价税合计')!.ocrValue,
                                diffForField('价税合计')!.accountValue
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-audit-ink-light dark:text-[#8a8782] block mb-1">
                          估算税额
                        </label>
                        <div className="text-sm font-mono text-audit-ink dark:text-[#e8e6e2] px-2.5 py-1.5 rounded bg-audit-paper-dark/30 dark:bg-[#22262f]">
                          ¥{(linkedVoucher.amount - linkedVoucher.amount / 1.13).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {currentDiffs.length > 0 && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 overflow-hidden">
                  <div className="px-3 py-2 bg-red-100/60 dark:bg-red-950/50 border-b border-red-200/60 dark:border-red-900/40">
                    <h4 className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />
                      差异字段明细 ({currentDiffs.length} 项)
                    </h4>
                  </div>
                  <div className="divide-y divide-red-200/40 dark:divide-red-900/30">
                    {currentDiffs.map((diff, idx) => (
                      <div
                        key={idx}
                        className="p-3 grid grid-cols-[auto_1fr_auto_1fr] gap-3 items-center"
                      >
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full flex-none',
                            diff.diffLevel === 'critical'
                              ? 'bg-red-500'
                              : diff.diffLevel === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-yellow-500'
                          )}
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] text-audit-ink-light dark:text-[#8a8782] mb-0.5">
                            OCR识别
                          </div>
                          <div className="text-sm font-mono text-audit-ink dark:text-[#e8e6e2] truncate">
                            {diff.ocrValue}
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              'text-xl font-bold',
                              diff.diffLevel === 'critical'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-600 dark:text-amber-400'
                            )}
                          >
                            {getDiffArrow(diff.ocrValue, diff.accountValue)}
                          </span>
                          <span className="text-[10px] text-audit-ink-light dark:text-[#8a8782] mt-0.5">
                            {diff.field}
                          </span>
                        </div>
                        <div className="min-w-0 text-right">
                          <div className="text-[10px] text-audit-ink-light dark:text-[#8a8782] mb-0.5">
                            账载数据
                          </div>
                          <div className="text-sm font-mono text-audit-ink dark:text-[#e8e6e2] truncate">
                            {diff.accountValue}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invoiceAnomalies.length > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 overflow-hidden">
                  <div className="px-3 py-2 bg-amber-100/60 dark:bg-amber-950/50 border-b border-amber-200/60 dark:border-amber-900/40">
                    <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      当前票据关联异常 ({invoiceAnomalies.length} 项)
                    </h4>
                  </div>
                  <div className="p-3 space-y-2">
                    {invoiceAnomalies.map((anom) => (
                      <div
                        key={anom.id}
                        className="flex items-start gap-2 p-2 rounded bg-white/60 dark:bg-black/20"
                      >
                        {severityIcon(anom.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-audit-ink dark:text-[#e8e6e2]">
                            {anom.title}
                          </div>
                          <div className="text-xs text-audit-ink-light dark:text-[#8a8782] mt-0.5 line-clamp-2">
                            {anom.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-audit-border dark:border-[#2d3139] bg-white dark:bg-[#1a1d23] overflow-hidden">
                <div className="px-3 py-2 bg-audit-paper-dark/50 dark:bg-[#22262f]/60 border-b border-audit-border dark:border-[#2d3139]">
                  <h4 className="text-xs font-semibold text-audit-ink dark:text-[#e8e6e2]">
                    票据状态
                  </h4>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
                        selectedInvoice?.status === 'recognized' &&
                          'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/50',
                        selectedInvoice?.status === 'doubt' &&
                          'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
                        selectedInvoice?.status === 'pending' &&
                          'bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-950/40 dark:text-gray-400 dark:border-gray-800/50'
                      )}
                    >
                      {selectedInvoice?.status === 'recognized' && (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {selectedInvoice?.status === 'doubt' && (
                        <Flag className="w-4 h-4" />
                      )}
                      {selectedInvoice?.status === 'pending' && (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      {selectedInvoice?.status === 'recognized' && '已识别确认'}
                      {selectedInvoice?.status === 'doubt' && '存疑待核查'}
                      {selectedInvoice?.status === 'pending' && '待识别'}
                      {!selectedInvoice && '未选择票据'}
                    </div>
                    {currentOcrResult && (
                      <div className="text-xs text-audit-ink-light dark:text-[#8a8782]">
                        识别时间: {new Date(currentOcrResult.processedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-none border-t border-audit-border dark:border-[#2d3139] bg-white/90 dark:bg-[#1a1d23]/90 backdrop-blur-sm px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevInvoice}
              disabled={selectedIndex <= 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm border border-audit-border dark:border-[#2d3139] text-audit-ink dark:text-[#e8e6e2] hover:bg-audit-paper-dark dark:hover:bg-[#22262f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              上一张
            </button>
            <div className="px-3 py-1 text-sm font-mono text-audit-ink-light dark:text-[#8a8782] bg-audit-paper-dark/50 dark:bg-[#22262f] rounded-md min-w-[100px] text-center">
              {invoices.length > 0 ? `${selectedIndex + 1} / ${invoices.length}` : '0 / 0'}
            </div>
            <button
              onClick={handleNextInvoice}
              disabled={selectedIndex >= invoices.length - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm border border-audit-border dark:border-[#2d3139] text-audit-ink dark:text-[#e8e6e2] hover:bg-audit-paper-dark dark:hover:bg-[#22262f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              下一张
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchRecognize}
              disabled={isBatchProcessing}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                isBatchProcessing
                  ? 'bg-audit-navy/10 text-audit-navy dark:bg-[#3d6499]/30 dark:text-[#6b9fd4] cursor-wait'
                  : 'bg-audit-green text-white hover:bg-audit-green-light dark:bg-[#2d5a3d] dark:hover:bg-[#3d7a52]'
              )}
            >
              {isBatchProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              批量识别当前批次
            </button>
            <button
              onClick={handleMarkDoubt}
              disabled={!selectedInvoice}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                selectedInvoice?.status === 'doubt'
                  ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/60'
                  : 'border-audit-border dark:border-[#2d3139] text-audit-ink dark:text-[#e8e6e2] hover:bg-audit-paper-dark dark:hover:bg-[#22262f]'
              )}
            >
              <Flag className="w-4 h-4" />
              {selectedInvoice?.status === 'doubt' ? '取消存疑' : '标记存疑'}
            </button>
            <button
              onClick={handleJumpToAnnotation}
              disabled={!selectedInvoice}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-audit-amber text-white hover:bg-audit-amber/90 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              标注疑点
            </button>
            <button
              onClick={handleJumpToAnnotation}
              disabled={!selectedInvoice}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-audit-navy text-white hover:bg-audit-navy-light dark:bg-[#3d6499] dark:hover:bg-[#4a74a8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              跳转标注页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
