import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ImageViewer,
  AnnotationCanvas,
} from '@/components/invoice';
import { useFindingStore } from '@/store/findingStore';
import { useInvoiceStore } from '@/store/invoiceStore';
import { cn } from '@/lib/utils';
import type {
  AssertionType,
  AuditFinding,
  AuditSuggestion,
  SuggestionStatus,
  SuggestionType,
  InvoiceAnnotation,
} from '@/types';
import {
  Hash,
  MapPin,
  RefreshCw,
  FileText,
  MessageSquarePlus,
  Send,
  ClipboardList,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Save,
  X,
  Plus,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  User,
  CalendarDays,
  ZoomIn,
  LocateFixed,
  Copy,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

const ASSERTION_TAGS: {
  type: AssertionType;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  icon: React.ElementType;
}[] = [
  {
    type: 'existence',
    label: '真实性',
    description: '交易或事项真实发生',
    color: '#c44536',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-900/50',
    text: 'text-red-700 dark:text-red-400',
    icon: CheckCircle2,
  },
  {
    type: 'completeness',
    label: '完整性',
    description: '所有应记录的事项均已记录',
    color: '#2d5a3d',
    bg: 'bg-green-50 dark:bg-green-950/40',
    border: 'border-green-200 dark:border-green-900/50',
    text: 'text-green-700 dark:text-green-400',
    icon: ClipboardList,
  },
  {
    type: 'accuracy',
    label: '准确性',
    description: '金额及其他数据准确无误',
    color: '#1e3a5f',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-900/50',
    text: 'text-blue-700 dark:text-blue-400',
    icon: Target,
  },
  {
    type: 'cutoff',
    label: '截止',
    description: '交易记录于正确的会计期间',
    color: '#d4a017',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-900/50',
    text: 'text-amber-700 dark:text-amber-400',
    icon: Clock,
  },
  {
    type: 'classification',
    label: '分类',
    description: '事项记录于恰当的账户',
    color: '#7c3aed',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-900/50',
    text: 'text-purple-700 dark:text-purple-400',
    icon: Tag,
  },
];

const SUGGESTION_TYPES: {
  type: SuggestionType;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  icon: React.ElementType;
}[] = [
  {
    type: 'confirmation',
    label: '函证',
    description: '向第三方发函确认',
    color: '#1e3a5f',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-900/50',
    text: 'text-blue-700 dark:text-blue-400',
    icon: Send,
  },
  {
    type: 'supplement',
    label: '补证',
    description: '补充审计证据',
    color: '#2d5a3d',
    bg: 'bg-green-50 dark:bg-green-950/40',
    border: 'border-green-200 dark:border-green-900/50',
    text: 'text-green-700 dark:text-green-400',
    icon: ClipboardList,
  },
  {
    type: 'adjustment',
    label: '调整',
    description: '账务调整建议',
    color: '#c44536',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-900/50',
    text: 'text-red-700 dark:text-red-400',
    icon: SlidersHorizontal,
  },
  {
    type: 'note',
    label: '备注',
    description: '其他说明事项',
    color: '#6b7280',
    bg: 'bg-gray-50 dark:bg-gray-800/40',
    border: 'border-gray-200 dark:border-gray-700/50',
    text: 'text-gray-700 dark:text-gray-400',
    icon: MessageSquarePlus,
  },
];

const SUGGESTION_STATUS: {
  value: SuggestionStatus;
  label: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'pending',
    label: '待处理',
    color: '#d4a017',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-900/50',
    text: 'text-amber-700 dark:text-amber-400',
    icon: Clock,
  },
  {
    value: 'in_progress',
    label: '处理中',
    color: '#1e3a5f',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-900/50',
    text: 'text-blue-700 dark:text-blue-400',
    icon: RefreshCw,
  },
  {
    value: 'completed',
    label: '已完成',
    color: '#2d5a3d',
    bg: 'bg-green-50 dark:bg-green-950/40',
    border: 'border-green-200 dark:border-green-900/50',
    text: 'text-green-700 dark:text-green-400',
    icon: CheckCircle2,
  },
];

const DESCRIPTION_TEMPLATES: {
  title: string;
  description: string;
  content: string;
}[] = [
  {
    title: '金额不一致',
    description: '发票金额与账面记录存在差异',
    content:
      '经核对，发票记载金额与账面记录金额存在差异，差异金额为￥______。需要进一步核实差异原因，确认是否为录入错误或发票本身存在问题。',
  },
  {
    title: '日期异常',
    description: '开票日期或入账日期异常',
    content:
      '该发票开票日期为______，入账日期为______，存在跨期入账风险。根据审计准则关于截止认定的要求，需核实交易发生的真实日期，确认是否存在跨期调节利润的情况。',
  },
  {
    title: '信息模糊',
    description: '发票关键信息模糊不清',
    content:
      '发票关键信息（发票号码/金额/开票方等）因影像质量或打印原因模糊不清，无法准确识别。建议获取原始发票原件或联系开票方重新提供清晰影像进行核实。',
  },
  {
    title: '印章缺失',
    description: '发票专用章缺失或不清晰',
    content:
      '该发票未加盖发票专用章或印章模糊不清，不符合发票管理办法的相关规定。建议要求被审计单位更换合规发票或补充加盖有效印章。',
  },
  {
    title: '连号风险',
    description: '存在连号发票异常',
    content:
      '经检查，该发票与其他发票存在连号情况（连号范围：______），且开票时间跨度较大或开票方不一致，存在虚构交易的风险。需要进一步核实交易的真实性。',
  },
  {
    title: '周末开票',
    description: '节假日或周末开具发票',
    content:
      '该发票开具日期为周末/法定节假日（______），对于大多数正常经营的企业，节假日开票属于异常情况。需要核实该笔交易的真实背景和商业合理性。',
  },
];

const MOCK_IMAGE =
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=800&fit=crop';

interface SectionCardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: string;
}

function SectionCard({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  accent = 'border-audit-navy dark:border-[#6b9fd4]',
}: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        'rounded-xl border bg-white dark:bg-[#22262f] shadow-audit overflow-hidden',
        'border-audit-border dark:border-[#3d4148]'
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 transition-colors',
          'hover:bg-audit-paper dark:hover:bg-[#2a2f3a]',
          'border-l-4',
          accent
        )}
      >
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              'w-4 h-4',
              'text-audit-navy dark:text-[#6b9fd4]'
            )}
          />
          <span className="text-sm font-semibold text-audit-ink dark:text-[#e8e6e3]">
            {title}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-audit-ink-light dark:text-[#8a8782]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-audit-ink-light dark:text-[#8a8782]" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-audit-border dark:border-[#3d4148]/60">
          {children}
        </div>
      )}
    </div>
  );
}

interface AssertionTagChipProps {
  assertion: (typeof ASSERTION_TAGS)[number];
  selected: boolean;
  onToggle: () => void;
}

function AssertionTagChip({
  assertion,
  selected,
  onToggle,
}: AssertionTagChipProps) {
  const Icon = assertion.icon;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'group relative flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all duration-200',
        selected
          ? cn(assertion.bg, assertion.border, assertion.text, 'shadow-sm scale-[1.02]')
          : cn(
              'bg-white dark:bg-[#2a2f3a]',
              'border-audit-border dark:border-[#3d4148]',
              'text-audit-ink-light dark:text-[#8a8782]',
              'hover:border-audit-navy/40 dark:hover:border-[#6b9fd4]/40',
              'hover:text-audit-navy dark:hover:text-[#6b9fd4]'
            )
      )}
      title={assertion.description}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-xs font-medium whitespace-nowrap">
        {assertion.label}
      </span>
      {selected && (
        <CheckCircle2
          className={cn(
            'w-3 h-3 shrink-0 -mr-0.5',
            assertion.text
          )}
        />
      )}
    </button>
  );
}

export default function MarkPage() {
  const navigate = useNavigate();
  const {
    findings,
    selectedFindingId,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    addFinding,
    updateFinding,
    deleteFinding,
    setSelectedFinding,
    addAssertionToFinding,
    linkAnnotationToFinding,
    getAnnotationsByInvoice,
    getFindingsByInvoice,
  } = useFindingStore();

  const { invoices, selectedInvoiceId } = useInvoiceStore();

  const [selectedAnnotationId, setSelectedAnnotationId] = useState<
    string | null
  >(null);
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [rereadLoading, setRereadLoading] = useState(false);

  const currentInvoice = useMemo(() => {
    if (selectedInvoiceId) {
      return invoices.find((inv) => inv.id === selectedInvoiceId);
    }
    return invoices[0] || null;
  }, [invoices, selectedInvoiceId]);

  const workingInvoiceId = currentInvoice?.id || 'demo-invoice-001';

  const invoiceAnnotations = useMemo(
    () => getAnnotationsByInvoice(workingInvoiceId),
    [getAnnotationsByInvoice, workingInvoiceId]
  );

  const invoiceFindings = useMemo(
    () => getFindingsByInvoice(workingInvoiceId),
    [getFindingsByInvoice, workingInvoiceId]
  );

  const selectedAnnotation = useMemo(
    () =>
      invoiceAnnotations.find((a) => a.id === selectedAnnotationId) || null,
    [invoiceAnnotations, selectedAnnotationId]
  );



  const [formState, setFormState] = useState<{
    title: string;
    description: string;
    assertions: AssertionType[];
    suggestionType: SuggestionType;
    suggestionContent: string;
    responsible: string;
    deadline: string;
    status: SuggestionStatus;
    rereadText: string;
  }>({
    title: '',
    description: '',
    assertions: [],
    suggestionType: 'note',
    suggestionContent: '',
    responsible: '',
    deadline: '',
    status: 'pending',
    rereadText: '',
  });

  const syncFormFromFinding = useCallback(
    (finding: AuditFinding | null) => {
      if (finding) {
        setFormState((prev) => ({
          ...prev,
          title: finding.title,
          description: finding.description,
          assertions: [...finding.assertions],
          suggestionType: finding.suggestion?.type || 'note',
          suggestionContent: finding.suggestion?.content || '',
          responsible: finding.suggestion?.responsible || '',
          deadline: finding.suggestion?.deadline || '',
          status: finding.suggestion?.status || 'pending',
        }));
        const ann = invoiceAnnotations.find(
          (a) => a.id === finding.annotationIds[0]
        );
        if (ann) {
          setSelectedAnnotationId(ann.id);
          setFormState((prev) => ({
            ...prev,
            rereadText: ann.ocrReread || '',
          }));
        }
      } else {
        setFormState({
          title: '',
          description: '',
          assertions: [],
          suggestionType: 'note',
          suggestionContent: '',
          responsible: '',
          deadline: '',
          status: 'pending',
          rereadText: '',
        });
      }
    },
    [invoiceAnnotations]
  );

  const handleCreateAnnotation = useCallback(
    (data: Omit<InvoiceAnnotation, 'id' | 'invoiceId' | 'createTime'>) => {
      const newAnnotation: InvoiceAnnotation = {
        ...data,
        id: `ann_${Date.now()}`,
        invoiceId: workingInvoiceId,
        createTime: new Date().toISOString(),
      };
      addAnnotation(newAnnotation);
      setSelectedAnnotationId(newAnnotation.id);
      setFormState((prev) => ({ ...prev, rereadText: '' }));
    },
    [addAnnotation, workingInvoiceId]
  );

  const handleUpdateAnnotation = useCallback(
    (updated: InvoiceAnnotation[]) => {
      updated.forEach((a) => {
        updateAnnotation(a.id, {
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
        });
      });
    },
    [updateAnnotation]
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      deleteAnnotation(id);
      if (selectedAnnotationId === id) {
        setSelectedAnnotationId(null);
        setFormState((prev) => ({ ...prev, rereadText: '' }));
      }
    },
    [deleteAnnotation, selectedAnnotationId]
  );

  const handleReread = useCallback(async () => {
    if (!selectedAnnotation) return;
    setRereadLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const mockResults = [
      '￥12,580.00',
      '2024年12月25日',
      '北京科技有限公司',
      '增值税专用发票 No.00123456',
      '91110108MA00789012',
    ];
    const result = mockResults[Math.floor(Math.random() * mockResults.length)];
    updateAnnotation(selectedAnnotation.id, { ocrReread: result });
    setFormState((prev) => ({ ...prev, rereadText: result }));
    setRereadLoading(false);
  }, [selectedAnnotation, updateAnnotation]);

  const handleAssertionToggle = useCallback(
    (type: AssertionType) => {
      setFormState((prev) => {
        const exists = prev.assertions.includes(type);
        return {
          ...prev,
          assertions: exists
            ? prev.assertions.filter((a) => a !== type)
            : [...prev.assertions, type],
        };
      });
    },
    []
  );

  const handleInsertTemplate = useCallback((template: (typeof DESCRIPTION_TEMPLATES)[number]) => {
    setFormState((prev) => ({
      ...prev,
      title: prev.title || template.title,
      description: prev.description
        ? prev.description + '\n\n' + template.content
        : template.content,
    }));
  }, []);

  const handleSaveFinding = useCallback(() => {
    if (!formState.title.trim()) return;

    const suggestion: AuditSuggestion = {
      type: formState.suggestionType,
      content: formState.suggestionContent,
      responsible: formState.responsible,
      deadline: formState.deadline || undefined,
      status: formState.status,
    };

    if (selectedFindingId && editingFindingId === selectedFindingId) {
      updateFinding(selectedFindingId, {
        title: formState.title,
        description: formState.description,
        assertions: formState.assertions,
        suggestion,
      });
      formState.assertions.forEach((a) =>
        addAssertionToFinding(selectedFindingId, a)
      );
      setEditingFindingId(null);
    } else {
      const annotationIds = selectedAnnotation ? [selectedAnnotation.id] : [];
      const newFinding: AuditFinding = {
        id: `finding_${Date.now()}`,
        invoiceId: workingInvoiceId,
        title: formState.title,
        description: formState.description,
        assertions: formState.assertions,
        annotationIds,
        suggestion,
        createTime: new Date().toISOString(),
        createBy: 'current-user',
      };
      addFinding(newFinding);
      annotationIds.forEach((aid) =>
        linkAnnotationToFinding(newFinding.id, aid)
      );
    }
  }, [
    formState,
    selectedFindingId,
    editingFindingId,
    selectedAnnotation,
    workingInvoiceId,
    updateFinding,
    addAssertionToFinding,
    addFinding,
    linkAnnotationToFinding,
  ]);

  const handleEditFinding = useCallback(
    (finding: AuditFinding) => {
      setSelectedFinding(finding.id);
      setEditingFindingId(finding.id);
      syncFormFromFinding(finding);
    },
    [setSelectedFinding, syncFormFromFinding]
  );

  const handleNewFinding = useCallback(() => {
    setSelectedFinding(null);
    setEditingFindingId(null);
    syncFormFromFinding(null);
  }, [setSelectedFinding, syncFormFromFinding]);

  const handleLocateAnnotation = useCallback(
    (annotationId: string) => {
      setSelectedAnnotationId(annotationId);
    },
    []
  );

  const handleUpdateRereadText = useCallback(
    (value: string) => {
      setFormState((prev) => ({ ...prev, rereadText: value }));
      if (selectedAnnotation) {
        updateAnnotation(selectedAnnotation.id, { ocrReread: value });
      }
    },
    [selectedAnnotation, updateAnnotation]
  );

  const handleCopyAnnotationInfo = useCallback(() => {
    if (!selectedAnnotation) return;
    const info = `区域信息: 坐标(${Math.round(selectedAnnotation.x)}, ${Math.round(
      selectedAnnotation.y
    )}) 尺寸(${Math.round(selectedAnnotation.width)}×${Math.round(
      selectedAnnotation.height
    )})`;
    navigator.clipboard?.writeText(info);
  }, [selectedAnnotation]);

  const currentSuggestionType = SUGGESTION_TYPES.find(
    (s) => s.type === formState.suggestionType
  );

  return (
    <div className="h-full flex flex-col bg-audit-paper dark:bg-[#1a1d23] overflow-hidden">
      {invoices.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-audit-paper-dark dark:bg-[#2a2f3a] flex items-center justify-center border border-audit-border dark:border-[#3d4148]">
            <AlertCircle className="w-10 h-10 text-audit-ink-light/40 dark:text-[#5c5a57]" />
          </div>
          <h2 className="text-lg font-bold text-audit-ink dark:text-[#e8e6e3]">暂无票据数据</h2>
          <p className="text-sm text-audit-ink-light dark:text-[#8a8782] max-w-sm text-center">
            请先前往抽样篮选择需要标注的票据
          </p>
          <button
            type="button"
            onClick={() => navigate('/sample')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-audit-navy to-audit-navy-light text-white shadow-audit hover:shadow-audit-raised transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            前往抽样篮
          </button>
        </div>
      ) : (
      <>
      <header className="shrink-0 border-b border-audit-border dark:border-[#3d4148] bg-white dark:bg-[#22262f] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-audit-navy dark:text-[#6b9fd4] flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              疑点标注工作台
            </h1>
            <p className="text-xs text-audit-ink-light dark:text-[#8a8782] mt-0.5">
              框选模糊区域 → 标记审计断言 → 记录疑点与建议
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewFinding}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-audit-navy hover:bg-audit-navy-light dark:bg-[#2d4f7c] dark:hover:bg-[#3d6499] text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            新建疑点
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-audit-border dark:border-[#3d4148]">
          <div className="shrink-0 px-4 py-2 bg-white dark:bg-[#22262f] border-b border-audit-border dark:border-[#3d4148] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-audit-navy dark:text-[#6b9fd4]" />
              <div>
                <span className="text-sm font-medium text-audit-ink dark:text-[#e8e6e3]">
                  {currentInvoice?.fileName || '示例发票影像'}
                </span>
                {currentInvoice?.voucherNo && (
                  <span className="text-xs text-audit-ink-light dark:text-[#8a8782] ml-2">
                    凭证号: {currentInvoice.voucherNo}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-audit-ink-light dark:text-[#8a8782]">
              <ZoomIn className="w-3.5 h-3.5" />
              <span>滚轮缩放</span>
              <span className="w-px h-3 bg-audit-border dark:bg-[#3d4148]" />
              <MapPin className="w-3.5 h-3.5" />
              <span>拖拽框选区域</span>
            </div>
          </div>

          <div className="flex-1 relative min-h-0 bg-audit-paper-dark dark:bg-[#1a1d23]">
            <ImageViewer src={currentInvoice?.imageUrl || MOCK_IMAGE}>
              <AnnotationCanvas
                annotations={invoiceAnnotations}
                selectedId={selectedAnnotationId}
                onCreate={handleCreateAnnotation}
                onChange={handleUpdateAnnotation}
                onSelect={setSelectedAnnotationId}
                onDelete={handleDeleteAnnotation}
              />
            </ImageViewer>
          </div>
        </div>

        <aside className="w-[420px] shrink-0 flex flex-col bg-audit-paper-secondary dark:bg-[#1e2128] min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <SectionCard
              title="审计断言"
              icon={Target}
              accent="border-l-audit-navy dark:border-l-[#6b9fd4]"
            >
              <p className="text-xs text-audit-ink-light dark:text-[#8a8782] mb-3">
                选择该疑点涉及的审计认定（可多选）
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ASSERTION_TAGS.map((tag) => (
                  <AssertionTagChip
                    key={tag.type}
                    assertion={tag}
                    selected={formState.assertions.includes(tag.type)}
                    onToggle={() => handleAssertionToggle(tag.type)}
                  />
                ))}
              </div>
              {formState.assertions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-audit-border dark:border-[#3d4148]/60">
                  <p className="text-xs font-medium text-audit-ink dark:text-[#e8e6e3] mb-1.5">
                    已选断言说明：
                  </p>
                  <ul className="space-y-1">
                    {formState.assertions.map((type) => {
                      const tag = ASSERTION_TAGS.find((t) => t.type === type);
                      return tag ? (
                        <li
                          key={type}
                          className={cn(
                            'text-xs flex items-start gap-1.5',
                            tag.text
                          )}
                        >
                          <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="leading-relaxed">
                            <strong>{tag.label}</strong>：{tag.description}
                          </span>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="区域信息"
              icon={LocateFixed}
              accent="border-l-audit-amber"
            >
              {selectedAnnotation ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-audit-paper dark:bg-[#2a2f3a] rounded-lg px-3 py-2 border border-audit-border dark:border-[#3d4148]">
                      <div className="flex items-center gap-1.5 text-[10px] text-audit-ink-light dark:text-[#8a8782] mb-1">
                        <Hash className="w-3 h-3" />
                        标注编号
                      </div>
                      <div className="font-mono text-sm font-bold text-audit-ink dark:text-[#e8e6e3]">
                        #{selectedAnnotation.label}
                      </div>
                    </div>
                    <div className="bg-audit-paper dark:bg-[#2a2f3a] rounded-lg px-3 py-2 border border-audit-border dark:border-[#3d4148]">
                      <div className="flex items-center gap-1.5 text-[10px] text-audit-ink-light dark:text-[#8a8782] mb-1">
                        <MapPin className="w-3 h-3" />
                        坐标位置
                      </div>
                      <div className="font-mono text-sm text-audit-ink dark:text-[#e8e6e3]">
                        ({Math.round(selectedAnnotation.x)},{' '}
                        {Math.round(selectedAnnotation.y)})
                      </div>
                    </div>
                    <div className="col-span-2 bg-audit-paper dark:bg-[#2a2f3a] rounded-lg px-3 py-2 border border-audit-border dark:border-[#3d4148]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] text-audit-ink-light dark:text-[#8a8782] mb-1">
                            <SlidersHorizontal className="w-3 h-3" />
                            区域尺寸
                          </div>
                          <div className="font-mono text-sm text-audit-ink dark:text-[#e8e6e3]">
                            {Math.round(selectedAnnotation.width)} ×{' '}
                            {Math.round(selectedAnnotation.height)} px
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyAnnotationInfo}
                          className="p-1.5 rounded-md hover:bg-white dark:hover:bg-[#22262f] text-audit-ink-light dark:text-[#8a8782] hover:text-audit-navy dark:hover:text-[#6b9fd4] transition-colors"
                          title="复制信息"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-audit-ink dark:text-[#e8e6e3]">
                        复识别结果
                      </label>
                      <button
                        type="button"
                        onClick={handleReread}
                        disabled={rereadLoading}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all',
                          rereadLoading
                            ? 'bg-audit-navy/20 text-audit-navy dark:text-[#6b9fd4] cursor-not-allowed'
                            : 'bg-audit-navy hover:bg-audit-navy-light dark:bg-[#2d4f7c] dark:hover:bg-[#3d6499] text-white'
                        )}
                      >
                        <RefreshCw
                          className={cn(
                            'w-3 h-3',
                            rereadLoading && 'animate-spin'
                          )}
                        />
                        {rereadLoading ? '识别中...' : '手动复识别'}
                      </button>
                    </div>
                    <textarea
                      value={formState.rereadText}
                      onChange={(e) => handleUpdateRereadText(e.target.value)}
                      placeholder="点击上方按钮重新识别，或直接输入识别结果..."
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-sm',
                        'bg-white dark:bg-[#2a2f3a]',
                        'border border-audit-border dark:border-[#3d4148]',
                        'text-audit-ink dark:text-[#e8e6e3]',
                        'placeholder:text-audit-ink-muted dark:placeholder:text-[#5c5a57]',
                        'focus:outline-none focus:ring-2 focus:ring-audit-navy/30 dark:focus:ring-[#6b9fd4]/30 focus:border-audit-navy dark:focus:border-[#6b9fd4]',
                        'resize-none',
                        'transition-colors'
                      )}
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-audit-amber/10 dark:bg-[#e0b42e]/10 flex items-center justify-center mb-3">
                    <LocateFixed className="w-6 h-6 text-audit-amber" />
                  </div>
                  <p className="text-sm font-medium text-audit-ink dark:text-[#e8e6e3]">
                    未选择标注区域
                  </p>
                  <p className="text-xs text-audit-ink-light dark:text-[#8a8782] mt-1">
                    请在左侧图像上拖拽框选疑点区域
                  </p>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="疑点描述"
              icon={AlertCircle}
              accent="border-l-audit-red dark:border-l-[#d66b5f]"
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-audit-ink dark:text-[#e8e6e3] mb-1.5">
                    疑点标题 <span className="text-audit-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="简要描述疑点，如：金额不一致"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      'bg-white dark:bg-[#2a2f3a]',
                      'border border-audit-border dark:border-[#3d4148]',
                      'text-audit-ink dark:text-[#e8e6e3]',
                      'placeholder:text-audit-ink-muted dark:placeholder:text-[#5c5a57]',
                      'focus:outline-none focus:ring-2 focus:ring-audit-navy/30 dark:focus:ring-[#6b9fd4]/30 focus:border-audit-navy dark:focus:border-[#6b9fd4]',
                      'transition-colors'
                    )}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-audit-ink dark:text-[#e8e6e3]">
                      详细描述
                    </label>
                    <span className="text-[10px] text-audit-ink-muted dark:text-[#5c5a57] font-mono">
                      {formState.description.length} 字
                    </span>
                  </div>
                  <textarea
                    value={formState.description}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="详细描述疑点情况、风险分析、影响范围..."
                    rows={4}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm leading-relaxed',
                      'bg-white dark:bg-[#2a2f3a]',
                      'border border-audit-border dark:border-[#3d4148]',
                      'text-audit-ink dark:text-[#e8e6e3]',
                      'placeholder:text-audit-ink-muted dark:placeholder:text-[#5c5a57]',
                      'focus:outline-none focus:ring-2 focus:ring-audit-navy/30 dark:focus:ring-[#6b9fd4]/30 focus:border-audit-navy dark:focus:border-[#6b9fd4]',
                      'resize-none',
                      'transition-colors'
                    )}
                  />
                </div>

                <div>
                  <p className="text-[11px] font-medium text-audit-ink-light dark:text-[#8a8782] mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-audit-amber" />
                    快捷插入模板：
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {DESCRIPTION_TEMPLATES.map((tpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInsertTemplate(tpl)}
                        className={cn(
                          'px-2 py-1 rounded-md text-xs transition-all',
                          'bg-audit-paper dark:bg-[#2a2f3a]',
                          'border border-audit-border dark:border-[#3d4148]',
                          'text-audit-ink-light dark:text-[#b0ada8]',
                          'hover:border-audit-navy/40 dark:hover:border-[#6b9fd4]/40 hover:text-audit-navy dark:hover:text-[#6b9fd4] hover:bg-white dark:hover:bg-[#333945]'
                        )}
                        title={tpl.description}
                      >
                        {tpl.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="审计建议"
              icon={ClipboardList}
              accent="border-l-audit-green dark:border-l-[#3d7a52]"
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-audit-ink dark:text-[#e8e6e3] mb-2">
                    建议类型
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SUGGESTION_TYPES.map((type) => {
                      const TypeIcon = type.icon;
                      const active = formState.suggestionType === type.type;
                      return (
                        <button
                          key={type.type}
                          type="button"
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              suggestionType: type.type,
                            }))
                          }
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                            active
                              ? cn(
                                  type.bg,
                                  type.border,
                                  type.text,
                                  'shadow-sm scale-[1.02]'
                                )
                              : cn(
                                  'bg-white dark:bg-[#2a2f3a]',
                                  'border-audit-border dark:border-[#3d4148]',
                                  'text-audit-ink-light dark:text-[#8a8782]',
                                  'hover:border-audit-navy/40 dark:hover:border-[#6b9fd4]/40'
                                )
                          )}
                        >
                          <TypeIcon className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-medium">
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {currentSuggestionType && (
                    <p
                      className={cn(
                        'text-[11px] mt-2 leading-relaxed',
                        currentSuggestionType.text
                      )}
                    >
                      {currentSuggestionType.description}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-audit-ink dark:text-[#e8e6e3] mb-1.5">
                    建议内容
                  </label>
                  <textarea
                    value={formState.suggestionContent}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        suggestionContent: e.target.value,
                      }))
                    }
                    placeholder="具体的审计处理建议..."
                    rows={2}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      'bg-white dark:bg-[#2a2f3a]',
                      'border border-audit-border dark:border-[#3d4148]',
                      'text-audit-ink dark:text-[#e8e6e3]',
                      'placeholder:text-audit-ink-muted dark:placeholder:text-[#5c5a57]',
                      'focus:outline-none focus:ring-2 focus:ring-audit-navy/30 dark:focus:ring-[#6b9fd4]/30 focus:border-audit-navy dark:focus:border-[#6b9fd4]',
                      'resize-none',
                      'transition-colors'
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-audit-ink dark:text-[#e8e6e3] mb-1.5 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      责任人
                    </label>
                    <input
                      type="text"
                      value={formState.responsible}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          responsible: e.target.value,
                        }))
                      }
                      placeholder="输入姓名"
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-sm',
                        'bg-white dark:bg-[#2a2f3a]',
                        'border border-audit-border dark:border-[#3d4148]',
                        'text-audit-ink dark:text-[#e8e6e3]',
                        'placeholder:text-audit-ink-muted dark:placeholder:text-[#5c5a57]',
                        'focus:outline-none focus:ring-2 focus:ring-audit-navy/30 dark:focus:ring-[#6b9fd4]/30 focus:border-audit-navy dark:focus:border-[#6b9fd4]',
                        'transition-colors'
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-audit-ink dark:text-[#e8e6e3] mb-1.5 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      截止日期
                    </label>
                    <input
                      type="date"
                      value={formState.deadline}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          deadline: e.target.value,
                        }))
                      }
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-sm',
                        'bg-white dark:bg-[#2a2f3a]',
                        'border border-audit-border dark:border-[#3d4148]',
                        'text-audit-ink dark:text-[#e8e6e3]',
                        'focus:outline-none focus:ring-2 focus:ring-audit-navy/30 dark:focus:ring-[#6b9fd4]/30 focus:border-audit-navy dark:focus:border-[#6b9fd4]',
                        'transition-colors'
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-audit-ink dark:text-[#e8e6e3] mb-2">
                    处理状态
                  </label>
                  <div className="flex gap-2">
                    {SUGGESTION_STATUS.map((st) => {
                      const StatusIcon = st.icon;
                      const active = formState.status === st.value;
                      return (
                        <button
                          key={st.value}
                          type="button"
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              status: st.value,
                            }))
                          }
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all',
                            active
                              ? cn(st.bg, st.border, 'shadow-sm')
                              : cn(
                                  'bg-white dark:bg-[#2a2f3a]',
                                  'border-audit-border dark:border-[#3d4148]',
                                  'hover:border-audit-navy/40 dark:hover:border-[#6b9fd4]/40'
                                )
                          )}
                        >
                          <StatusIcon
                            className={cn(
                              'w-3.5 h-3.5',
                              active ? st.text : 'text-audit-ink-light dark:text-[#8a8782]'
                            )}
                          />
                          <span
                            className={cn(
                              'text-xs font-medium',
                              active
                                ? st.text
                                : 'text-audit-ink-light dark:text-[#8a8782]'
                            )}
                          >
                            {st.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-audit-border dark:border-[#3d4148]/60 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFindingId(null);
                      setFormState({
                        title: '',
                        description: '',
                        assertions: [],
                        suggestionType: 'note',
                        suggestionContent: '',
                        responsible: '',
                        deadline: '',
                        status: 'pending',
                        rereadText: formState.rereadText,
                      });
                    }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      'bg-audit-paper dark:bg-[#2a2f3a]',
                      'border border-audit-border dark:border-[#3d4148]',
                      'text-audit-ink-light dark:text-[#b0ada8]',
                      'hover:bg-white dark:hover:bg-[#333945]'
                    )}
                  >
                    <X className="w-4 h-4" />
                    清空
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveFinding}
                    disabled={!formState.title.trim()}
                    className={cn(
                      'flex-[2] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      formState.title.trim()
                        ? cn(
                            'bg-audit-green hover:bg-audit-green-light dark:bg-[#2d5a3d] dark:hover:bg-[#3d7a52]',
                            'text-white shadow-sm'
                          )
                        : 'bg-gray-200 dark:bg-[#3d4148] text-gray-400 dark:text-[#5c5a57] cursor-not-allowed'
                    )}
                  >
                    <Save className="w-4 h-4" />
                    {editingFindingId === selectedFindingId && selectedFindingId
                      ? '更新疑点'
                      : '保存疑点'}
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        </aside>
      </div>

      <div className="shrink-0 border-t border-audit-border dark:border-[#3d4148] bg-white dark:bg-[#22262f]">
        <div className="px-6 py-3 border-b border-audit-border dark:border-[#3d4148] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-audit-navy/10 dark:bg-[#6b9fd4]/10 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-audit-navy dark:text-[#6b9fd4]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-audit-ink dark:text-[#e8e6e3]">
                  当前票据疑点列表
                </h2>
                <p className="text-[11px] text-audit-ink-light dark:text-[#8a8782]">
                  共 {invoiceFindings.length} 条疑点 · 关联{' '}
                  {invoiceAnnotations.length} 个标注区域
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {SUGGESTION_STATUS.map((st) => {
              const StatusIcon = st.icon;
              const count = invoiceFindings.filter(
                (f) => f.suggestion?.status === st.value
              ).length;
              return (
                <div
                  key={st.value}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border',
                    st.bg,
                    st.border
                  )}
                >
                  <StatusIcon className={cn('w-3 h-3', st.text)} />
                  <span className={cn('font-medium', st.text)}>
                    {st.label}
                  </span>
                  <span
                    className={cn(
                      'font-mono font-bold min-w-[18px] text-center px-1 rounded',
                      count > 0 ? st.bg : 'bg-transparent',
                      st.text
                    )}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="max-h-[220px] overflow-y-auto">
          {invoiceFindings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-14 h-14 rounded-full bg-audit-paper-dark dark:bg-[#2a2f3a] flex items-center justify-center mb-3">
                <MessageSquarePlus className="w-7 h-7 text-audit-ink-muted dark:text-[#5c5a57]" />
              </div>
              <p className="text-sm font-medium text-audit-ink-light dark:text-[#b0ada8]">
                暂无疑点记录
              </p>
              <p className="text-xs text-audit-ink-muted dark:text-[#5c5a57] mt-1">
                在右侧面板填写信息后点击"保存疑点"即可创建
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-audit-paper dark:bg-[#22262f] z-10">
                <tr className="text-[11px] text-audit-ink-light dark:text-[#8a8782]">
                  <th className="text-left px-4 py-2 font-medium w-10">#</th>
                  <th className="text-left px-4 py-2 font-medium w-12">
                    标注
                  </th>
                  <th className="text-left px-4 py-2 font-medium">疑点标题</th>
                  <th className="text-left px-4 py-2 font-medium w-40">
                    审计断言
                  </th>
                  <th className="text-left px-4 py-2 font-medium w-28">
                    建议类型
                  </th>
                  <th className="text-left px-4 py-2 font-medium w-24">
                    责任人
                  </th>
                  <th className="text-left px-4 py-2 font-medium w-28">
                    截止日期
                  </th>
                  <th className="text-left px-4 py-2 font-medium w-24">
                    状态
                  </th>
                  <th className="text-right px-4 py-2 font-medium w-24">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoiceFindings.map((finding, idx) => {
                  const findingStatusConfig = SUGGESTION_STATUS.find(
                    (s) => s.value === finding.suggestion?.status
                  );
                  const findingSuggestionType = SUGGESTION_TYPES.find(
                    (s) => s.type === finding.suggestion?.type
                  );
                  const linkedAnnotation = invoiceAnnotations.find(
                    (a) => a.id === finding.annotationIds[0]
                  );
                  const isSelected = selectedFindingId === finding.id;
                  const StatusIcon = findingStatusConfig?.icon || AlertCircle;

                  return (
                    <tr
                      key={finding.id}
                      onClick={() => setSelectedFinding(finding.id)}
                      className={cn(
                        'border-t border-audit-border dark:border-[#3d4148]/60 cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-audit-navy/5 dark:bg-[#6b9fd4]/10'
                          : 'hover:bg-audit-paper dark:hover:bg-[#2a2f3a]'
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-audit-ink-light dark:text-[#8a8782]">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3">
                        {linkedAnnotation ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLocateAnnotation(linkedAnnotation.id);
                            }}
                            className="group w-8 h-8 rounded-lg bg-audit-amber/10 dark:bg-[#e0b42e]/10 flex items-center justify-center text-audit-amber hover:bg-audit-amber hover:text-white transition-colors"
                            title="定位标注区域"
                          >
                            <Hash className="w-4 h-4 font-bold" />
                          </button>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#2a2f3a] flex items-center justify-center text-gray-400 dark:text-[#5c5a57]">
                            —
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-audit-ink dark:text-[#e8e6e3] line-clamp-1">
                          {finding.title}
                        </div>
                        {finding.description && (
                          <div className="text-[11px] text-audit-ink-light dark:text-[#8a8782] mt-0.5 line-clamp-1">
                            {finding.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {finding.assertions.length > 0 ? (
                            finding.assertions.map((a) => {
                              const tag = ASSERTION_TAGS.find(
                                (t) => t.type === a
                              );
                              return tag ? (
                                <span
                                  key={a}
                                  className={cn(
                                    'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
                                    tag.bg,
                                    tag.border,
                                    tag.text
                                  )}
                                >
                                  {tag.label}
                                </span>
                              ) : null;
                            })
                          ) : (
                            <span className="text-[11px] text-audit-ink-muted dark:text-[#5c5a57]">
                              未标记
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {findingSuggestionType ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border',
                              findingSuggestionType.bg,
                              findingSuggestionType.border,
                              findingSuggestionType.text
                            )}
                          >
                            <findingSuggestionType.icon className="w-3 h-3" />
                            {findingSuggestionType.label}
                          </span>
                        ) : (
                          <span className="text-[11px] text-audit-ink-muted dark:text-[#5c5a57]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-audit-ink dark:text-[#e8e6e3]">
                          {finding.suggestion?.responsible || (
                            <span className="text-audit-ink-muted dark:text-[#5c5a57]">
                              未指派
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-audit-ink dark:text-[#e8e6e3]">
                          {finding.suggestion?.deadline || (
                            <span className="text-audit-ink-muted dark:text-[#5c5a57] font-sans">
                              无期限
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {findingStatusConfig ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border',
                              findingStatusConfig.bg,
                              findingStatusConfig.border
                            )}
                          >
                            <StatusIcon
                              className={cn(
                                'w-3 h-3',
                                findingStatusConfig.text
                              )}
                            />
                            <span
                              className={findingStatusConfig.text}
                            >
                              {findingStatusConfig.label}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-audit-ink-muted dark:text-[#5c5a57]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditFinding(finding);
                            }}
                            className="p-1.5 rounded-md text-audit-ink-light dark:text-[#8a8782] hover:bg-audit-navy/10 hover:text-audit-navy dark:hover:text-[#6b9fd4] transition-colors"
                            title="编辑疑点"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFinding(finding.id);
                              if (selectedFindingId === finding.id) {
                                handleNewFinding();
                              }
                            }}
                            className="p-1.5 rounded-md text-audit-ink-light dark:text-[#8a8782] hover:bg-audit-red/10 hover:text-audit-red dark:hover:text-[#d66b5f] transition-colors"
                            title="删除疑点"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
