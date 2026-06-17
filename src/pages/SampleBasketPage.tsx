import { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  DollarSign,
  Filter,
  CheckSquare,
  Square,
  Trash2,
  Tag,
  PlayCircle,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  FileText,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Eye,
  Edit3,
  Check,
  RefreshCw,
  Hash,
  Building2,
  FileCheck2,
  BarChart3,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInvoiceStore } from '@/store/invoiceStore';
import { useProjectStore } from '@/store/projectStore';
import TopNav from '@/components/layout/TopNav';
import SidePanel from '@/components/layout/SidePanel';
import InvoiceCard from '@/components/invoice/InvoiceCard';
import type { Invoice, InvoiceStatus, AnomalyType, AnomalyLevel } from '@/types';

const STATUS_OPTIONS: { value: InvoiceStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: '全部状态', color: 'text-audit-ink-light' },
  { value: 'pending', label: '待识别', color: 'text-audit-ink-light' },
  { value: 'recognizing', label: '识别中', color: 'text-audit-navy' },
  { value: 'recognized', label: '已识别', color: 'text-audit-green' },
  { value: 'doubt', label: '有疑问', color: 'text-audit-amber' },
  { value: 'confirmed', label: '已确认', color: 'text-audit-navy' },
];

const ANOMALY_TYPE_OPTIONS: { value: AnomalyType | 'all'; label: string; icon: React.ElementType; level: AnomalyLevel }[] = [
  { value: 'all', label: '全部异常', icon: Filter, level: 'low' },
  { value: 'consecutive_no', label: '连号发票', icon: Hash, level: 'medium' },
  { value: 'weekend', label: '周末开票', icon: Calendar, level: 'low' },
  { value: 'duplicate', label: '重复入账', icon: FileCheck2, level: 'high' },
  { value: 'round_amount', label: '整数金额', icon: DollarSign, level: 'medium' },
  { value: 'amount_mismatch', label: '金额不符', icon: BarChart3, level: 'high' },
];

const ANOMALY_LEVEL_STYLE: Record<AnomalyLevel, { bg: string; text: string; border: string; dot: string }> = {
  high: {
    bg: 'bg-audit-red/10 dark:bg-[#d66b5f]/20',
    text: 'text-audit-red dark:text-[#e8887e]',
    border: 'border-audit-red/20 dark:border-[#d66b5f]/30',
    dot: 'bg-audit-red dark:bg-[#d66b5f]',
  },
  medium: {
    bg: 'bg-audit-amber/10 dark:bg-[#e0b42e]/20',
    text: 'text-audit-amber dark:text-[#e8c54d]',
    border: 'border-audit-amber/20 dark:border-[#e0b42e]/30',
    dot: 'bg-audit-amber dark:bg-[#e0b42e]',
  },
  low: {
    bg: 'bg-audit-navy/10 dark:bg-[#3d6499]/20',
    text: 'text-audit-navy dark:text-[#6b9fd4]',
    border: 'border-audit-navy/20 dark:border-[#3d6499]/30',
    dot: 'bg-audit-navy dark:bg-[#3d6499]',
  },
};

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  pending: {
    bg: 'bg-audit-ink-light/10 dark:bg-[#5c5a57]/20',
    text: 'text-audit-ink-light dark:text-[#8a8782]',
    border: 'border-audit-ink-light/20 dark:border-[#5c5a57]/30',
    icon: FileText,
  },
  recognizing: {
    bg: 'bg-audit-navy/10 dark:bg-[#3d6499]/20',
    text: 'text-audit-navy dark:text-[#6b9fd4]',
    border: 'border-audit-navy/20 dark:border-[#3d6499]/30',
    icon: Loader2,
  },
  recognized: {
    bg: 'bg-audit-green/10 dark:bg-[#3d7a52]/20',
    text: 'text-audit-green dark:text-[#6bbf8a]',
    border: 'border-audit-green/20 dark:border-[#3d7a52]/30',
    icon: CheckCircle2,
  },
  doubt: {
    bg: 'bg-audit-amber/10 dark:bg-[#e0b42e]/20',
    text: 'text-audit-amber dark:text-[#e8c54d]',
    border: 'border-audit-amber/20 dark:border-[#e0b42e]/30',
    icon: HelpCircle,
  },
  confirmed: {
    bg: 'bg-audit-navy/10 dark:bg-[#2d4f7c]/20',
    text: 'text-audit-navy dark:text-[#6b9fd4]',
    border: 'border-audit-navy/20 dark:border-[#2d4f7c]/30',
    icon: CheckCircle2,
  },
};

const PAGE_SIZE = 12;

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

export default function SampleBasketPage() {
  const { currentProject } = useProjectStore();
  const { invoices, getInvoicesByProject, getAnomaliesByInvoice, updateInvoice, deleteInvoice, setInvoiceStatus } = useInvoiceStore();

  const [searchVoucherNo, setSearchVoucherNo] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [amountMin, setAmountMin] = useState(0);
  const [amountMax, setAmountMax] = useState(500000);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [anomalyTypeFilter, setAnomalyTypeFilter] = useState<AnomalyType | 'all'>('all');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  const projectInvoices = useMemo(() => {
    return currentProject ? getInvoicesByProject(currentProject.id) : invoices;
  }, [currentProject, invoices, getInvoicesByProject]);

  const amountBounds = useMemo(() => {
    const amounts = projectInvoices
      .map((i) => i.ocrResult?.amount)
      .filter((a): a is number => a !== undefined && a !== null);
    if (amounts.length === 0) return { min: 0, max: 500000 };
    return {
      min: Math.floor(Math.min(...amounts) / 1000) * 1000,
      max: Math.ceil(Math.max(...amounts) / 1000) * 1000,
    };
  }, [projectInvoices]);

  const filteredInvoices = useMemo(() => {
    return projectInvoices.filter((invoice) => {
      if (searchVoucherNo && !invoice.voucherNo.toLowerCase().includes(searchVoucherNo.toLowerCase())) {
        return false;
      }

      const invoiceDate = invoice.ocrResult?.invoiceDate || invoice.uploadTime;
      if (dateStart && invoiceDate < dateStart) return false;
      if (dateEnd && invoiceDate > dateEnd) return false;

      const amount = invoice.ocrResult?.amount ?? 0;
      if (amount < amountMin || amount > amountMax) return false;

      if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;

      if (anomalyTypeFilter !== 'all') {
        const anomalies = getAnomaliesByInvoice(invoice.id);
        if (!anomalies.some((a) => a.type === anomalyTypeFilter)) return false;
      }

      return true;
    });
  }, [projectInvoices, searchVoucherNo, dateStart, dateEnd, amountMin, amountMax, statusFilter, anomalyTypeFilter, getAnomaliesByInvoice]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedInvoices = filteredInvoices.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allVisibleSelected = paginatedInvoices.length > 0 && paginatedInvoices.every((i) => selectedIds.has(i.id));
  const someVisibleSelected = paginatedInvoices.some((i) => selectedIds.has(i.id));

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      paginatedInvoices.forEach((i) => next.delete(i.id));
    } else {
      paginatedInvoices.forEach((i) => next.add(i.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCardClick = (invoice: Invoice) => {
    setActiveInvoice(invoice);
    setDetailOpen(true);
  };

  const handleBatchRecognize = () => {
    selectedIds.forEach((id) => setInvoiceStatus(id, 'recognizing'));
  };

  const handleBatchDelete = () => {
    selectedIds.forEach((id) => deleteInvoice(id));
    setSelectedIds(new Set());
  };

  const handleBatchMark = () => {
    selectedIds.forEach((id) => setInvoiceStatus(id, 'doubt'));
  };

  const handleExport = () => {
    alert(`已导出 ${selectedIds.size || filteredInvoices.length} 条清单`);
  };

  const handleResetFilters = () => {
    setSearchVoucherNo('');
    setDateStart('');
    setDateEnd('');
    setAmountMin(amountBounds.min);
    setAmountMax(amountBounds.max);
    setStatusFilter('all');
    setAnomalyTypeFilter('all');
    setCurrentPage(1);
  };

  const activeAnomalies = activeInvoice ? getAnomaliesByInvoice(activeInvoice.id) : [];

  return (
    <div className="h-screen flex flex-col bg-audit-paper dark:bg-[#1a1d23] overflow-hidden">
      <TopNav currentStep="basket" completedSteps={['import']} />

      <div className="flex-1 flex overflow-hidden">
        <SidePanel />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 pb-2 border-b border-audit-border dark:border-[#3d4148] bg-white/50 dark:bg-[#22262f]/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-audit-navy to-audit-navy-light" />
                <h1 className="text-lg font-bold text-audit-ink dark:text-[#e8e6e3] tracking-wide">
                  抽样篮
                </h1>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-audit-navy/10 text-audit-navy dark:bg-[#3d6499]/20 dark:text-[#6b9fd4]">
                  共 {filteredInvoices.length} 份样本
                </span>
                {selectedIds.size > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-audit-green/15 text-audit-green dark:bg-[#3d7a52]/20 dark:text-[#6bbf8a] border border-audit-green/20">
                    已选 {selectedIds.size} 项
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-audit-border dark:border-[#3d4148] text-audit-ink-light dark:text-[#8a8782] hover:text-audit-navy dark:hover:text-[#6b9fd4] hover:border-audit-navy/30 dark:hover:border-[#3d6499]/30 hover:bg-audit-navy/5 dark:hover:bg-[#3d6499]/10 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                重置筛选
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[240px] max-w-[360px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-audit-ink-light dark:text-[#8a8782]" />
                  <input
                    type="text"
                    value={searchVoucherNo}
                    onChange={(e) => {
                      setSearchVoucherNo(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="搜索凭证号..."
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-audit-border dark:border-[#3d4148] bg-white dark:bg-[#2a2f3a] text-audit-ink dark:text-[#e8e6e3] placeholder:text-audit-ink-light/60 dark:placeholder:text-[#5c5a57] focus:outline-none focus:ring-2 focus:ring-audit-navy/20 dark:focus:ring-[#3d6499]/20 focus:border-audit-navy dark:focus:border-[#3d6499] transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-audit-ink-light dark:text-[#8a8782]" />
                    <input
                      type="date"
                      value={dateStart}
                      onChange={(e) => {
                        setDateStart(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-9 pr-3 py-2 text-sm rounded-xl border border-audit-border dark:border-[#3d4148] bg-white dark:bg-[#2a2f3a] text-audit-ink dark:text-[#e8e6e3] focus:outline-none focus:ring-2 focus:ring-audit-navy/20 dark:focus:ring-[#3d6499]/20 focus:border-audit-navy dark:focus:border-[#3d6499] transition-all"
                    />
                  </div>
                  <span className="text-sm text-audit-ink-light dark:text-[#8a8782]">至</span>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-audit-ink-light dark:text-[#8a8782]" />
                    <input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => {
                        setDateEnd(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-9 pr-3 py-2 text-sm rounded-xl border border-audit-border dark:border-[#3d4148] bg-white dark:bg-[#2a2f3a] text-audit-ink dark:text-[#e8e6e3] focus:outline-none focus:ring-2 focus:ring-audit-navy/20 dark:focus:ring-[#3d6499]/20 focus:border-audit-navy dark:focus:border-[#3d6499] transition-all"
                    />
                  </div>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setStatusDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 px-3.5 py-2 text-sm rounded-xl border border-audit-border dark:border-[#3d4148] bg-white dark:bg-[#2a2f3a] text-audit-ink dark:text-[#e8e6e3] hover:border-audit-navy/30 dark:hover:border-[#3d6499]/30 focus:outline-none focus:ring-2 focus:ring-audit-navy/20 dark:focus:ring-[#3d6499]/20 transition-all min-w-[130px]"
                  >
                    <Filter className="w-4 h-4 text-audit-ink-light dark:text-[#8a8782]" />
                    <span className={STATUS_OPTIONS.find((s) => s.value === statusFilter)?.color}>
                      {STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label}
                    </span>
                    <ChevronRight className={cn(
                      'w-3.5 h-3.5 text-audit-ink-light dark:text-[#8a8782] ml-auto transition-transform',
                      statusDropdownOpen && 'rotate-90'
                    )} />
                  </button>
                  {statusDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setStatusDropdownOpen(false)}
                      />
                      <div className="absolute top-full left-0 mt-2 w-44 rounded-xl border border-audit-border dark:border-[#3d4148] bg-white dark:bg-[#2a2f3a] shadow-audit-raised z-50 py-1 overflow-hidden">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setStatusFilter(opt.value);
                              setCurrentPage(1);
                              setStatusDropdownOpen(false);
                            }}
                            className={cn(
                              'w-full flex items-center gap-2 px-3.5 py-2 text-sm transition-all text-left',
                              statusFilter === opt.value
                                ? 'bg-audit-navy/8 dark:bg-[#3d6499]/15 text-audit-navy dark:text-[#6b9fd4]'
                                : 'text-audit-ink dark:text-[#e8e6e3] hover:bg-audit-paper-dark dark:hover:bg-[#333945]'
                            )}
                          >
                            {statusFilter === opt.value && (
                              <Check className="w-3.5 h-3.5 text-audit-navy dark:text-[#6b9fd4] flex-shrink-0" />
                            )}
                            {statusFilter !== opt.value && <div className="w-3.5 h-3.5 flex-shrink-0" />}
                            <span className={opt.color}>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-[320px]">
                  <DollarSign className="w-4 h-4 text-audit-green dark:text-[#6bbf8a] flex-shrink-0" />
                  <div className="flex-1 flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="range"
                        min={amountBounds.min}
                        max={amountBounds.max}
                        step={1000}
                        value={amountMin}
                        onChange={(e) => {
                          const val = Math.min(Number(e.target.value), amountMax);
                          setAmountMin(val);
                          setCurrentPage(1);
                        }}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-audit-paper-dark dark:bg-[#333945] accent-audit-navy dark:accent-[#3d6499]"
                      />
                    </div>
                    <span className="text-xs font-mono text-audit-ink-light dark:text-[#8a8782] min-w-[110px] text-center">
                      ¥{formatCurrency(amountMin)} ~ ¥{formatCurrency(amountMax)}
                    </span>
                    <div className="relative flex-1">
                      <input
                        type="range"
                        min={amountBounds.min}
                        max={amountBounds.max}
                        step={1000}
                        value={amountMax}
                        onChange={(e) => {
                          const val = Math.max(Number(e.target.value), amountMin);
                          setAmountMax(val);
                          setCurrentPage(1);
                        }}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-audit-paper-dark dark:bg-[#333945] accent-audit-navy dark:accent-[#3d6499]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {ANOMALY_TYPE_OPTIONS.map((opt) => {
                    const isActive = anomalyTypeFilter === opt.value;
                    const Icon = opt.icon;
                    const style = ANOMALY_LEVEL_STYLE[opt.level];
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setAnomalyTypeFilter(isActive ? 'all' : opt.value);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          isActive
                            ? cn(style.bg, style.text, style.border, 'shadow-sm')
                            : 'bg-white dark:bg-[#2a2f3a] text-audit-ink-light dark:text-[#8a8782] border-audit-border dark:border-[#3d4148] hover:border-audit-navy/30 dark:hover:border-[#3d6499]/30 hover:text-audit-navy dark:hover:text-[#6b9fd4]'
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-3 border-b border-audit-border dark:border-[#3d4148] bg-white/30 dark:bg-[#22262f]/30 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                    allVisibleSelected || someVisibleSelected
                      ? 'border-audit-navy/30 dark:border-[#3d6499]/30 bg-audit-navy/8 dark:bg-[#3d6499]/15 text-audit-navy dark:text-[#6b9fd4]'
                      : 'border-audit-border dark:border-[#3d4148] bg-white dark:bg-[#2a2f3a] text-audit-ink-light dark:text-[#8a8782] hover:border-audit-navy/30 dark:hover:border-[#3d6499]/30 hover:text-audit-navy dark:hover:text-[#6b9fd4]'
                  )}
                >
                  {allVisibleSelected ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : someVisibleSelected ? (
                    <CheckSquare className="w-4 h-4 opacity-70" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {allVisibleSelected ? '取消全选' : '全选当前页'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBatchRecognize}
                  disabled={selectedIds.size === 0}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                    selectedIds.size > 0
                      ? 'border-audit-navy/30 dark:border-[#3d6499]/30 bg-audit-navy/8 dark:bg-[#3d6499]/15 text-audit-navy dark:text-[#6b9fd4] hover:bg-audit-navy/15 dark:hover:bg-[#3d6499]/25'
                      : 'border-audit-border dark:border-[#3d4148] bg-white dark:bg-[#2a2f3a] text-audit-ink-light/50 dark:text-[#5c5a57] cursor-not-allowed opacity-60'
                  )}
                >
                  <PlayCircle className="w-4 h-4" />
                  批量识别
                </button>
                <button
                  type="button"
                  onClick={handleBatchMark}
                  disabled={selectedIds.size === 0}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                    selectedIds.size > 0
                      ? 'border-audit-amber/30 dark:border-[#e0b42e]/30 bg-audit-amber/8 dark:bg-[#e0b42e]/15 text-audit-amber dark:text-[#e8c54d] hover:bg-audit-amber/15 dark:hover:bg-[#e0b42e]/25'
                      : 'border-audit-border dark:border-[#3d4148] bg-white dark:bg-[#2a2f3a] text-audit-ink-light/50 dark:text-[#5c5a57] cursor-not-allowed opacity-60'
                  )}
                >
                  <Tag className="w-4 h-4" />
                  批量标记
                </button>
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  disabled={selectedIds.size === 0}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                    selectedIds.size > 0
                      ? 'border-audit-red/30 dark:border-[#d66b5f]/30 bg-audit-red/8 dark:bg-[#d66b5f]/15 text-audit-red dark:text-[#e8887e] hover:bg-audit-red/15 dark:hover:bg-[#d66b5f]/25'
                      : 'border-audit-border dark:border-[#3d4148] bg-white dark:bg-[#2a2f3a] text-audit-ink-light/50 dark:text-[#5c5a57] cursor-not-allowed opacity-60'
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  批量删除
                </button>
                <div className="w-px h-5 bg-audit-border dark:bg-[#3d4148] mx-1" />
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-audit-border dark:border-[#3d4148] bg-white dark:bg-[#2a2f3a] text-audit-ink dark:text-[#e8e6e3] hover:border-audit-navy/30 dark:hover:border-[#3d6499]/30 hover:text-audit-navy dark:hover:text-[#6b9fd4] hover:bg-audit-navy/5 dark:hover:bg-[#3d6499]/10 transition-all"
                >
                  <Download className="w-4 h-4" />
                  导出清单
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {paginatedInvoices.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-audit-paper-dark dark:bg-[#2a2f3a] flex items-center justify-center mb-4 border border-audit-border dark:border-[#3d4148]">
                  <FileText className="w-10 h-10 text-audit-ink-light/40 dark:text-[#5c5a57]" />
                </div>
                <h3 className="text-base font-semibold text-audit-ink dark:text-[#e8e6e3] mb-1">
                  暂无符合条件的样本
                </h3>
                <p className="text-sm text-audit-ink-light dark:text-[#8a8782] max-w-sm">
                  请尝试调整筛选条件，或导入新的票据样本到抽样篮中
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedInvoices.map((invoice, idx) => {
                    const anomalies = getAnomaliesByInvoice(invoice.id);
                    const isSelected = selectedIds.has(invoice.id);
                    const globalIndex = (safePage - 1) * PAGE_SIZE + idx;
                    return (
                      <div key={invoice.id} className="relative group">
                        <div className="absolute -top-1 -left-1 z-20">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(invoice.id)}
                            className={cn(
                              'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shadow-audit',
                              isSelected
                                ? 'bg-audit-navy dark:bg-[#3d6499] border-audit-navy dark:border-[#3d6499] text-white'
                                : 'bg-white dark:bg-[#2a2f3a] border-audit-border dark:border-[#4a4f5a] text-transparent hover:border-audit-navy/50 dark:hover:border-[#3d6499]/50'
                            )}
                          >
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </button>
                        </div>
                        <InvoiceCard
                          invoice={invoice}
                          anomalies={anomalies}
                          selected={isSelected}
                          onClick={() => handleCardClick(invoice)}
                          onViewClick={() => handleCardClick(invoice)}
                          index={globalIndex}
                        />
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                      disabled={safePage === 1}
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center border transition-all',
                        safePage === 1
                          ? 'border-audit-border dark:border-[#3d4148] text-audit-ink-light/40 dark:text-[#5c5a57] cursor-not-allowed'
                          : 'border-audit-border dark:border-[#3d4148] text-audit-ink-light dark:text-[#8a8782] hover:border-audit-navy/30 dark:hover:border-[#3d6499]/30 hover:text-audit-navy dark:hover:text-[#6b9fd4] hover:bg-audit-navy/5 dark:hover:bg-[#3d6499]/10'
                      )}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .map((page, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev !== undefined && page - prev > 1;
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsis && (
                              <span className="w-8 h-8 flex items-center justify-center text-audit-ink-light dark:text-[#8a8782]">
                                <MoreHorizontal className="w-4 h-4" />
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium border transition-all',
                                safePage === page
                                  ? 'bg-audit-navy dark:bg-[#3d6499] border-audit-navy dark:border-[#3d6499] text-white shadow-audit'
                                  : 'border-audit-border dark:border-[#3d4148] text-audit-ink-light dark:text-[#8a8782] hover:border-audit-navy/30 dark:hover:border-[#3d6499]/30 hover:text-audit-navy dark:hover:text-[#6b9fd4] hover:bg-audit-navy/5 dark:hover:bg-[#3d6499]/10'
                              )}
                            >
                              {page}
                            </button>
                          </div>
                        );
                      })}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                      disabled={safePage === totalPages}
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center border transition-all',
                        safePage === totalPages
                          ? 'border-audit-border dark:border-[#3d4148] text-audit-ink-light/40 dark:text-[#5c5a57] cursor-not-allowed'
                          : 'border-audit-border dark:border-[#3d4148] text-audit-ink-light dark:text-[#8a8782] hover:border-audit-navy/30 dark:hover:border-[#3d6499]/30 hover:text-audit-navy dark:hover:text-[#6b9fd4] hover:bg-audit-navy/5 dark:hover:bg-[#3d6499]/10'
                      )}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="ml-3 text-xs text-audit-ink-light dark:text-[#8a8782]">
                      第 {safePage} / {totalPages} 页
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-audit-ink/30 dark:bg-black/50 backdrop-blur-sm transition-all duration-300',
          detailOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setDetailOpen(false)}
      />
      <aside
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-[480px] max-w-[92vw] bg-white dark:bg-[#22262f] shadow-audit-raised flex flex-col transition-transform duration-300 ease-out border-l border-audit-border dark:border-[#3d4148]',
          detailOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {activeInvoice && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-audit-border dark:border-[#3d4148] bg-gradient-to-r from-audit-paper-dark/50 to-transparent dark:from-[#2a2f3a]/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-audit-navy/10 dark:bg-[#3d6499]/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-audit-navy dark:text-[#6b9fd4]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-audit-ink dark:text-[#e8e6e3] truncate">
                    票据详情
                  </h2>
                  <p className="text-xs text-audit-ink-light dark:text-[#8a8782] font-mono truncate">
                    {activeInvoice.voucherNo || activeInvoice.fileName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-audit-ink-light dark:text-[#8a8782] hover:text-audit-navy dark:hover:text-[#6b9fd4] hover:bg-audit-navy/8 dark:hover:bg-[#3d6499]/15 transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="relative aspect-[4/3] bg-audit-paper-dark dark:bg-[#1a1d23] border-b border-audit-border dark:border-[#3d4148] overflow-hidden">
                {activeInvoice.imageUrl ? (
                  <img
                    src={activeInvoice.imageUrl}
                    alt={activeInvoice.fileName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-16 h-16 text-audit-ink-light/30 dark:text-[#5c5a57]" />
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border backdrop-blur-sm',
                    STATUS_STYLE[activeInvoice.status].bg,
                    STATUS_STYLE[activeInvoice.status].text,
                    STATUS_STYLE[activeInvoice.status].border
                  )}>
                    {(() => {
                      const Icon = STATUS_STYLE[activeInvoice.status].icon;
                      return <Icon className={cn('w-3.5 h-3.5', activeInvoice.status === 'recognizing' && 'animate-spin')} />;
                    })()}
                    {{
                      pending: '待识别',
                      recognizing: '识别中',
                      recognized: '已识别',
                      doubt: '有疑问',
                      confirmed: '已确认',
                    }[activeInvoice.status]}
                  </div>
                  {activeInvoice.recognitionConfidence !== undefined && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 dark:bg-[#2a2f3a]/90 backdrop-blur-sm border border-audit-border/50 dark:border-[#3d4148]/50 text-[11px] font-mono font-medium text-audit-ink dark:text-[#e8e6e3]">
                      置信度 {Math.round(activeInvoice.recognitionConfidence * 100)}%
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-audit-green to-audit-green-light" />
                    <h3 className="text-sm font-bold text-audit-ink dark:text-[#e8e6e3]">
                      识别信息
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-audit-paper-dark/50 dark:bg-[#2a2f3a]/50 border border-audit-border/50 dark:border-[#3d4148]/50">
                      <div className="flex items-center gap-1.5 text-[11px] text-audit-ink-light dark:text-[#8a8782] mb-1">
                        <Hash className="w-3 h-3" />
                        发票号码
                      </div>
                      <div className="text-sm font-mono font-semibold text-audit-ink dark:text-[#e8e6e3]">
                        {activeInvoice.ocrResult?.invoiceNo || '-'}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-audit-paper-dark/50 dark:bg-[#2a2f3a]/50 border border-audit-border/50 dark:border-[#3d4148]/50">
                      <div className="flex items-center gap-1.5 text-[11px] text-audit-ink-light dark:text-[#8a8782] mb-1">
                        <Calendar className="w-3 h-3" />
                        开票日期
                      </div>
                      <div className="text-sm font-mono font-semibold text-audit-ink dark:text-[#e8e6e3]">
                        {formatDate(activeInvoice.ocrResult?.invoiceDate)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-audit-paper-dark/50 dark:bg-[#2a2f3a]/50 border border-audit-border/50 dark:border-[#3d4148]/50 col-span-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-audit-ink-light dark:text-[#8a8782] mb-1">
                        <DollarSign className="w-3 h-3 text-audit-green dark:text-[#6bbf8a]" />
                        价税合计
                      </div>
                      <div className="text-2xl font-mono font-bold text-audit-green dark:text-[#6bbf8a]">
                        ¥{formatCurrency(activeInvoice.ocrResult?.amount)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-audit-paper-dark/50 dark:bg-[#2a2f3a]/50 border border-audit-border/50 dark:border-[#3d4148]/50">
                      <div className="flex items-center gap-1.5 text-[11px] text-audit-ink-light dark:text-[#8a8782] mb-1">
                        <DollarSign className="w-3 h-3" />
                        不含税金额
                      </div>
                      <div className="text-sm font-mono font-semibold text-audit-ink dark:text-[#e8e6e3]">
                        ¥{formatCurrency(activeInvoice.ocrResult?.priceAmount)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-audit-paper-dark/50 dark:bg-[#2a2f3a]/50 border border-audit-border/50 dark:border-[#3d4148]/50">
                      <div className="flex items-center gap-1.5 text-[11px] text-audit-ink-light dark:text-[#8a8782] mb-1">
                        <DollarSign className="w-3 h-3 text-audit-amber dark:text-[#e8c54d]" />
                        税额
                      </div>
                      <div className="text-sm font-mono font-semibold text-audit-amber dark:text-[#e8c54d]">
                        ¥{formatCurrency(activeInvoice.ocrResult?.taxAmount)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-audit-paper-dark/50 dark:bg-[#2a2f3a]/50 border border-audit-border/50 dark:border-[#3d4148]/50 col-span-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-audit-ink-light dark:text-[#8a8782] mb-1">
                        <Building2 className="w-3 h-3" />
                        销售方
                      </div>
                      <div className="text-sm font-semibold text-audit-ink dark:text-[#e8e6e3] truncate">
                        {activeInvoice.ocrResult?.sellerName || '-'}
                      </div>
                      {activeInvoice.ocrResult?.sellerTaxNo && (
                        <div className="text-xs font-mono text-audit-ink-light dark:text-[#8a8782] mt-0.5">
                          {activeInvoice.ocrResult.sellerTaxNo}
                        </div>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-audit-paper-dark/50 dark:bg-[#2a2f3a]/50 border border-audit-border/50 dark:border-[#3d4148]/50 col-span-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-audit-ink-light dark:text-[#8a8782] mb-1">
                        <FileText className="w-3 h-3" />
                        项目摘要
                      </div>
                      <div className="text-sm text-audit-ink dark:text-[#e8e6e3]">
                        {activeInvoice.ocrResult?.summary || '-'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-audit-border to-transparent dark:via-[#3d4148]" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-gradient-to-b from-audit-amber to-yellow-500" />
                      <h3 className="text-sm font-bold text-audit-ink dark:text-[#e8e6e3]">
                        异常检测
                      </h3>
                    </div>
                    {activeAnomalies.length > 0 && (
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full border',
                        activeAnomalies.some((a) => a.level === 'high')
                          ? cn(ANOMALY_LEVEL_STYLE.high.bg, ANOMALY_LEVEL_STYLE.high.text, ANOMALY_LEVEL_STYLE.high.border)
                          : activeAnomalies.some((a) => a.level === 'medium')
                          ? cn(ANOMALY_LEVEL_STYLE.medium.bg, ANOMALY_LEVEL_STYLE.medium.text, ANOMALY_LEVEL_STYLE.medium.border)
                          : cn(ANOMALY_LEVEL_STYLE.low.bg, ANOMALY_LEVEL_STYLE.low.text, ANOMALY_LEVEL_STYLE.low.border)
                      )}>
                        {activeAnomalies.length} 项异常
                      </span>
                    )}
                  </div>

                  {activeAnomalies.length === 0 ? (
                    <div className="p-5 rounded-xl bg-audit-green/5 dark:bg-[#3d7a52]/10 border border-audit-green/20 dark:border-[#3d7a52]/20 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-audit-green/15 dark:bg-[#3d7a52]/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-audit-green dark:text-[#6bbf8a]" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-audit-green dark:text-[#6bbf8a]">
                          未检测到异常
                        </div>
                        <div className="text-xs text-audit-ink-light dark:text-[#8a8782] mt-0.5">
                          该票据通过所有异常规则检测
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeAnomalies.map((anomaly) => {
                        const style = ANOMALY_LEVEL_STYLE[anomaly.level];
                        const Icon = anomaly.level === 'high' ? AlertCircle : AlertTriangle;
                        const label = {
                          consecutive_no: '连号发票',
                          weekend: '周末开票',
                          duplicate: '重复入账',
                          round_amount: '整数金额',
                          amount_mismatch: '金额不符',
                        }[anomaly.type];
                        return (
                          <div
                            key={anomaly.id}
                            className={cn(
                              'p-3.5 rounded-xl border transition-all hover:shadow-audit',
                              style.bg,
                              style.border
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                                style.bg,
                                'border',
                                style.border
                              )}>
                                <Icon className={cn('w-4 h-4', style.text)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={cn('text-sm font-bold', style.text)}>{label}</span>
                                  <span className={cn(
                                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border',
                                    style.bg,
                                    style.text,
                                    style.border
                                  )}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                                    {{ high: '高风险', medium: '中风险', low: '低风险' }[anomaly.level]}
                                  </span>
                                </div>
                                <p className="text-xs text-audit-ink-light dark:text-[#8a8782] leading-relaxed">
                                  {anomaly.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-audit-border to-transparent dark:via-[#3d4148]" />

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-audit-ink-light to-audit-ink" />
                    <h3 className="text-sm font-bold text-audit-ink dark:text-[#e8e6e3]">
                      元信息
                    </h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-audit-border/50 dark:border-[#3d4148]/50">
                      <span className="text-audit-ink-light dark:text-[#8a8782]">上传时间</span>
                      <span className="font-mono text-audit-ink dark:text-[#e8e6e3]">
                        {formatDate(activeInvoice.uploadTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-audit-border/50 dark:border-[#3d4148]/50">
                      <span className="text-audit-ink-light dark:text-[#8a8782]">文件名</span>
                      <span className="font-mono text-audit-ink dark:text-[#e8e6e3] truncate max-w-[220px]">
                        {activeInvoice.fileName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-audit-border/50 dark:border-[#3d4148]/50">
                      <span className="text-audit-ink-light dark:text-[#8a8782]">关联凭证号</span>
                      <span className="font-mono text-audit-ink dark:text-[#e8e6e3]">
                        {activeInvoice.voucherNo || '-'}
                      </span>
                    </div>
                    {activeInvoice.ocrResult?.buyerName && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-audit-ink-light dark:text-[#8a8782]">购买方</span>
                        <span className="text-audit-ink dark:text-[#e8e6e3] truncate max-w-[220px]">
                          {activeInvoice.ocrResult.buyerName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-audit-border dark:border-[#3d4148] bg-gradient-to-b from-transparent to-audit-paper-dark/30 dark:to-[#2a2f3a]/30 flex items-center gap-2">
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-audit-navy to-audit-navy-light text-white shadow-audit hover:shadow-audit-hover hover:brightness-105 transition-all"
              >
                <Eye className="w-4 h-4" />
                查看大图
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border border-audit-border dark:border-[#3d4148] bg-white dark:bg-[#2a2f3a] text-audit-ink dark:text-[#e8e6e3] hover:border-audit-navy/30 dark:hover:border-[#3d6499]/30 hover:text-audit-navy dark:hover:text-[#6b9fd4] hover:bg-audit-navy/5 dark:hover:bg-[#3d6499]/10 transition-all"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeInvoice) {
                    const next: InvoiceStatus = activeInvoice.status === 'confirmed' ? 'recognized' : 'confirmed';
                    updateInvoice(activeInvoice.id, { status: next });
                    setActiveInvoice({ ...activeInvoice, status: next });
                  }
                }}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                  activeInvoice.status === 'confirmed'
                    ? 'border-audit-navy/30 dark:border-[#3d6499]/30 bg-audit-navy/10 dark:bg-[#3d6499]/20 text-audit-navy dark:text-[#6b9fd4]'
                    : 'border-audit-green/30 dark:border-[#3d7a52]/30 bg-audit-green/10 dark:bg-[#3d7a52]/20 text-audit-green dark:text-[#6bbf8a] hover:bg-audit-green/15 dark:hover:bg-[#3d7a52]/30'
                )}
              >
                <Check className="w-4 h-4" />
                {activeInvoice.status === 'confirmed' ? '取消确认' : '确认无误'}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
