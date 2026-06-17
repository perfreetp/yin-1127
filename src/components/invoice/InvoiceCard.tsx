import React, { useMemo } from 'react';
import { AlertTriangle, AlertCircle, FileText, Calendar, Hash, DollarSign, ChevronRight, CheckCircle2, Loader2, HelpCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Invoice, InvoiceStatus, Anomaly, AnomalyLevel, AccountVoucher } from '@/types';

export interface InvoiceCardProps {
  invoice: Invoice;
  voucher?: AccountVoucher;
  anomalies?: Anomaly[];
  selected?: boolean;
  onClick?: () => void;
  onViewClick?: () => void;
  className?: string;
  showActions?: boolean;
  index?: number;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string; icon: React.ElementType; iconClassName: string }> = {
  pending: {
    label: '待识别',
    className: 'bg-audit-ink-light/10 text-audit-ink-light dark:bg-[#5c5a57]/20 dark:text-[#8a8782] border-audit-ink-light/20 dark:border-[#5c5a57]/30',
    icon: FileText,
    iconClassName: 'text-audit-ink-light dark:text-[#8a8782]',
  },
  recognizing: {
    label: '识别中',
    className: 'bg-audit-navy/10 text-audit-navy dark:bg-[#3d6499]/20 dark:text-[#6b9fd4] border-audit-navy/20 dark:border-[#3d6499]/30',
    icon: Loader2,
    iconClassName: 'text-audit-navy dark:text-[#6b9fd4] animate-spin',
  },
  recognized: {
    label: '已识别',
    className: 'bg-audit-green/10 text-audit-green dark:bg-[#3d7a52]/20 dark:text-[#6bbf8a] border-audit-green/20 dark:border-[#3d7a52]/30',
    icon: CheckCircle2,
    iconClassName: 'text-audit-green dark:text-[#6bbf8a]',
  },
  doubt: {
    label: '有疑问',
    className: 'bg-audit-amber/10 text-audit-amber dark:bg-[#e0b42e]/20 dark:text-[#e8c54d] border-audit-amber/20 dark:border-[#e0b42e]/30',
    icon: HelpCircle,
    iconClassName: 'text-audit-amber dark:text-[#e8c54d]',
  },
  confirmed: {
    label: '已确认',
    className: 'bg-audit-navy/10 text-audit-navy dark:bg-[#2d4f7c]/20 dark:text-[#6b9fd4] border-audit-navy/20 dark:border-[#2d4f7c]/30',
    icon: CheckCircle2,
    iconClassName: 'text-audit-navy dark:text-[#6b9fd4]',
  },
};

const ANOMALY_LEVEL_CONFIG: Record<AnomalyLevel, { label: string; className: string; dotClassName: string }> = {
  high: {
    label: '高风险',
    className: 'bg-audit-red/10 text-audit-red dark:bg-[#d66b5f]/20 dark:text-[#e8887e] border-audit-red/20 dark:border-[#d66b5f]/30',
    dotClassName: 'bg-audit-red dark:bg-[#d66b5f]',
  },
  medium: {
    label: '中风险',
    className: 'bg-audit-amber/10 text-audit-amber dark:bg-[#e0b42e]/20 dark:text-[#e8c54d] border-audit-amber/20 dark:border-[#e0b42e]/30',
    dotClassName: 'bg-audit-amber dark:bg-[#e0b42e]',
  },
  low: {
    label: '低风险',
    className: 'bg-audit-navy/10 text-audit-navy dark:bg-[#3d6499]/20 dark:text-[#6b9fd4] border-audit-navy/20 dark:border-[#3d6499]/30',
    dotClassName: 'bg-audit-navy dark:bg-[#3d6499]',
  },
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '-';
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function InvoiceCard({
  invoice,
  voucher,
  anomalies = [],
  selected = false,
  onClick,
  onViewClick,
  className,
  showActions = true,
  index,
}: InvoiceCardProps) {
  const statusConfig = STATUS_CONFIG[invoice.status];
  const StatusIcon = statusConfig.icon;

  const highestAnomaly = useMemo(() => {
    if (anomalies.length === 0) return null;
    const levelOrder: AnomalyLevel[] = ['high', 'medium', 'low'];
    for (const level of levelOrder) {
      const found = anomalies.find((a) => a.level === level);
      if (found) return found;
    }
    return anomalies[0];
  }, [anomalies]);

  const anomalyConfig = highestAnomaly ? ANOMALY_LEVEL_CONFIG[highestAnomaly.level] : null;

  const ocrAmount = invoice.ocrResult?.amount;
  const voucherAmount = voucher?.amount;
  const invoiceDate = invoice.ocrResult?.invoiceDate;

  const amountDisplay = useMemo(() => {
    const hasOcr = ocrAmount !== undefined;
    const hasVoucher = voucherAmount !== undefined;

    if (!hasOcr && !hasVoucher) {
      return {
        showVoucher: true,
        voucherAmount: undefined,
        showOcr: false,
        ocrColor: '',
      };
    }

    if (hasVoucher && !hasOcr) {
      return {
        showVoucher: true,
        voucherAmount,
        showOcr: false,
        ocrColor: '',
      };
    }

    if (hasOcr && hasVoucher) {
      const diff = Math.abs(ocrAmount - voucherAmount);
      const diffPercent = voucherAmount > 0 ? diff / voucherAmount : 0;
      const isMismatch = ocrAmount !== voucherAmount;
      const ocrColor = diffPercent > 0.01
        ? 'text-audit-red dark:text-[#e8887e]'
        : isMismatch
        ? 'text-audit-amber dark:text-[#e8c54d]'
        : 'text-audit-ink-light dark:text-[#8a8782]';

      return {
        showVoucher: true,
        voucherAmount,
        showOcr: true,
        ocrAmount,
        ocrColor,
      };
    }

    return {
      showVoucher: false,
      showOcr: true,
      ocrAmount,
      ocrColor: 'text-audit-ink dark:text-[#e8e6e3]',
    };
  }, [ocrAmount, voucherAmount]);

  const anomalyTooltip = anomalies.length > 0
    ? anomalies.map((a) => a.description).join('\n')
    : undefined;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer',
        'bg-white dark:bg-[#22262f] shadow-audit hover:shadow-audit-hover',
        selected
          ? 'border-audit-navy ring-2 ring-audit-navy/20 dark:border-[#3d6499] dark:ring-[#3d6499]/20 -translate-y-0.5'
          : 'border-audit-border dark:border-[#3d4148] hover:border-audit-navy/50 dark:hover:border-[#3d6499]/50 hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
    >
      {index !== undefined && (
        <div className="absolute top-2 left-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-audit-navy/90 dark:bg-[#2d4f7c]/90 text-white text-[10px] font-bold shadow-audit backdrop-blur-sm">
          {index + 1}
        </div>
      )}

      {showActions && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewClick?.();
          }}
          className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-lg bg-white/90 dark:bg-[#22262f]/90 backdrop-blur-sm text-audit-ink-light dark:text-[#b0ada8] opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-audit border border-audit-border/50 dark:border-[#3d4148]/50 hover:text-audit-navy dark:hover:text-[#6b9fd4] hover:bg-white dark:hover:bg-[#2a2f3a]"
          title="查看详情"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="relative aspect-[4/3] overflow-hidden bg-audit-paper-dark dark:bg-[#1a1d23] border-b border-audit-border dark:border-[#3d4148]">
        {invoice.imageUrl ? (
          <img
            src={invoice.imageUrl}
            alt={invoice.fileName}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-12 h-12 text-audit-ink-light/30 dark:text-[#5c5a57]/50" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border backdrop-blur-sm',
              statusConfig.className
            )}
          >
            <StatusIcon className={cn('w-3 h-3', statusConfig.iconClassName, invoice.status === 'recognizing' && 'animate-spin')} />
            {statusConfig.label}
          </span>

          {anomalies.length > 0 && anomalyConfig && (
            <div
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border backdrop-blur-sm',
                anomalyConfig.className
              )}
              title={anomalyTooltip}
            >
              {highestAnomaly?.level === 'high' ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <AlertTriangle className="w-3 h-3" />
              )}
              {anomalies.length > 1 ? `${anomalyConfig.label}×${anomalies.length}` : anomalyConfig.label}
            </div>
          )}
        </div>

        {invoice.recognitionConfidence !== undefined && invoice.recognitionConfidence < 0.8 && (
          <div className="absolute top-10 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-audit-amber/90 dark:bg-[#e0b42e]/90 text-white text-[9px] font-medium shadow-audit backdrop-blur-sm">
            <AlertTriangle className="w-2.5 h-2.5" />
            {Math.round(invoice.recognitionConfidence * 100)}%
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-audit-ink-light dark:text-[#8a8782] mb-1">
              <Hash className="w-3 h-3 flex-shrink-0" />
              <span className="truncate font-mono text-audit-ink dark:text-[#e8e6e3] font-medium">
                {invoice.voucherNo || '-'}
              </span>
            </div>
          </div>
          <ChevronRight className={cn(
            'w-4 h-4 flex-shrink-0 transition-all duration-200',
            'text-audit-ink-light/50 dark:text-[#5c5a57] group-hover:text-audit-navy dark:group-hover:text-[#6b9fd4] group-hover:translate-x-0.5'
          )} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <DollarSign className="w-3.5 h-3.5 text-audit-green dark:text-[#6bbf8a] flex-shrink-0" />
            <div className="min-w-0">
              {amountDisplay.showVoucher && (
                <span className={cn(
                  'font-mono font-bold text-sm truncate block',
                  amountDisplay.voucherAmount !== undefined && amountDisplay.voucherAmount > 0
                    ? 'text-audit-ink dark:text-[#e8e6e3]'
                    : 'text-audit-ink-light dark:text-[#8a8782]'
                )}>
                  ¥{formatCurrency(amountDisplay.voucherAmount)}
                </span>
              )}
              {amountDisplay.showOcr && (
                <span className={cn(
                  'font-mono text-xs truncate block',
                  amountDisplay.ocrColor
                )}>
                  OCR ¥{formatCurrency(amountDisplay.ocrAmount)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-audit-border/50 dark:border-[#3d4148]/50">
          <div className="flex items-center gap-1.5 text-[11px] text-audit-ink-light dark:text-[#8a8782]">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{formatDate(invoiceDate || invoice.uploadTime)}</span>
          </div>

          {anomalies.length > 0 && (
            <div className="flex items-center gap-0.5">
              {anomalies.slice(0, 3).map((a) => (
                <span
                  key={a.id}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    ANOMALY_LEVEL_CONFIG[a.level].dotClassName
                  )}
                  title={a.description}
                />
              ))}
              {anomalies.length > 3 && (
                <span className="text-[10px] text-audit-ink-light dark:text-[#8a8782] ml-0.5">
                  +{anomalies.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1 transition-all duration-200',
        highestAnomaly
          ? ANOMALY_LEVEL_CONFIG[highestAnomaly.level].dotClassName
          : selected
          ? 'bg-audit-navy dark:bg-[#3d6499]'
          : 'bg-transparent group-hover:bg-audit-navy/30 dark:group-hover:bg-[#3d6499]/30'
      )} />
    </div>
  );
}
