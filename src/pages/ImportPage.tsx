import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
import TopNav from '@/components/layout/TopNav';
import SidePanel from '@/components/layout/SidePanel';
import {
  useImportStore,
  formatFileSize,
  type UploadedFile,
  type SortableVoucher,
  type LedgerRow,
} from '@/store/importStore';
import { useProjectStore } from '@/store/projectStore';
import {
  Building2,
  FileDigit,
  CalendarDays,
  UserCircle2,
  Upload,
  FolderOpen,
  Image as ImageIcon,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GripVertical,
  Pencil,
  Save,
  Sparkles,
  RotateCcw,
  FileSpreadsheet,
  Download,
  Eye,
  Trash2,
  Plus,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

function SectionHeader({
  icon: Icon,
  title,
  description,
  right,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-audit-navy/10 to-audit-navy/5 border border-audit-navy/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-audit-navy" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-base font-bold text-audit-ink tracking-wide">{title}</h2>
          {description && (
            <p className="text-xs text-audit-ink-light mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

function ProjectInfoSection() {
  const { projectForm, setProjectForm, saveProject } = useImportStore();
  const { addProject, currentProject } = useProjectStore();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const project = saveProject();
    if (project) {
      addProject(project);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const fields = [
    {
      key: 'clientName' as const,
      label: '客户名称',
      placeholder: '请输入被审计单位全称',
      icon: Building2,
      type: 'text',
    },
    {
      key: 'projectCode' as const,
      label: '项目编号',
      placeholder: '如 AUD-2024-001',
      icon: FileDigit,
      type: 'text',
    },
    {
      key: 'periodStart' as const,
      label: '审计期间（起）',
      placeholder: '',
      icon: CalendarDays,
      type: 'date',
    },
    {
      key: 'periodEnd' as const,
      label: '审计期间（止）',
      placeholder: '',
      icon: CalendarDays,
      type: 'date',
    },
    {
      key: 'auditor' as const,
      label: '审计人员',
      placeholder: '请输入项目负责人姓名',
      icon: UserCircle2,
      type: 'text',
    },
  ];

  return (
    <section className="bg-white rounded-2xl border border-audit-border shadow-audit p-5">
      <SectionHeader
        icon={Building2}
        title="项目信息录入"
        description="填写审计项目的基础信息，用于标识和归档"
        right={
          <button
            type="button"
            onClick={handleSave}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
              saved
                ? 'bg-audit-green text-white shadow-audit-hover'
                : 'bg-audit-navy text-white hover:bg-audit-navy-light shadow-audit hover:shadow-audit-hover'
            )}
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                已保存
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存项目
              </>
            )}
          </button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((field) => {
          const Icon = field.icon;
          const isPeriodField = field.key === 'periodStart' || field.key === 'periodEnd';
          return (
            <div key={field.key} className="group">
              <label className="block text-xs font-semibold text-audit-ink-light mb-1.5 ml-0.5">
                {field.label}
              </label>
              <div
                className={cn(
                  'relative flex items-center rounded-xl border transition-all duration-200 overflow-hidden',
                  'bg-white border-audit-border group-hover:border-audit-navy/40',
                  'focus-within:border-audit-navy focus-within:ring-2 focus-within:ring-audit-navy/15 focus-within:shadow-audit-hover'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 border-r flex-shrink-0',
                    isPeriodField
                      ? 'bg-audit-amber/10 border-audit-amber/20 text-audit-amber'
                      : 'bg-audit-navy/8 border-audit-navy/15 text-audit-navy'
                  )}
                >
                  <Icon className="w-4.5 h-4.5" strokeWidth={2} />
                </div>
                <input
                  type={field.type}
                  value={projectForm[field.key]}
                  onChange={(e) => setProjectForm(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="flex-1 px-3 py-2.5 text-sm text-audit-ink bg-transparent outline-none placeholder:text-audit-ink-light/50"
                />
              </div>
            </div>
          );
        })}
      </div>
      {currentProject && (
        <div className="mt-4 p-3 rounded-xl bg-audit-green/8 border border-audit-green/25 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-audit-green flex-shrink-0" strokeWidth={2.2} />
          <span className="text-xs text-audit-ink-light">
            当前激活项目：<span className="font-semibold text-audit-green">{currentProject.clientName}</span>
            <span className="mx-1.5 text-audit-border">|</span>
            编号：{currentProject.projectCode}
          </span>
        </div>
      )}
    </section>
  );
}

function FileUploadSection() {
  const {
    uploadedFiles,
    addUploadedFile,
    updateUploadedFile,
    removeUploadedFile,
    clearUploadedFiles,
    addSortableVouchers,
  } = useImportStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createSortableVouchers = useCallback(
    (files: UploadedFile[]) => {
      const vouchers: SortableVoucher[] = files.map((f) => ({
        id: generateId(),
        fileId: f.id,
        voucherNo: f.voucherNo,
        fileName: f.name,
        thumbnail: f.thumbnail,
        order: 0,
      }));
      addSortableVouchers(vouchers);
    },
    [addSortableVouchers]
  );

  const simulateUpload = useCallback(
    (uploadedFile: UploadedFile) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 18 + 7;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          updateUploadedFile(uploadedFile.id, {
            progress: 100,
            status: 'success',
          });
          createSortableVouchers([
            {
              ...uploadedFile,
              progress: 100,
              status: 'success',
            },
          ]);
        } else {
          updateUploadedFile(uploadedFile.id, {
            progress: Math.round(progress),
          });
        }
      }, 180);
    },
    [updateUploadedFile, createSortableVouchers]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      fileArr.forEach((file) => {
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        if (!isImage && !isPdf) return;

        const id = generateId();
        const voucherMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const voucherNum = String(Math.floor(Math.random() * 99) + 1).padStart(4, '0');

        const uploadedFile: UploadedFile = {
          id,
          file,
          name: file.name,
          size: file.size,
          type: isImage ? 'image' : 'pdf',
          thumbnail: null,
          progress: 0,
          status: 'uploading',
          voucherNo: `记-2024${voucherMonth}-${voucherNum}`,
          uploadTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
        };

        if (isImage) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const thumbnail = e.target?.result as string;
            updateUploadedFile(id, { thumbnail });
          };
          reader.readAsDataURL(file);
        }

        addUploadedFile(uploadedFile);
        simulateUpload(uploadedFile);
      });
    },
    [addUploadedFile, updateUploadedFile, simulateUpload]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = '';
      }
    },
    [handleFiles]
  );

  const getStatusBadge = (file: UploadedFile) => {
    switch (file.status) {
      case 'uploading':
        return (
          <div className="flex items-center gap-1.5 text-audit-navy">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-[11px] font-semibold">上传中</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-1.5 text-audit-green">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">已完成</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 text-audit-red">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">上传失败</span>
          </div>
        );
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-audit-border shadow-audit p-5">
      <SectionHeader
        icon={Upload}
        title="文件上传区"
        description="支持拖拽上传发票影像、凭证附件等（图片 / PDF格式）"
        right={
          uploadedFiles.length > 0 && (
            <button
              type="button"
              onClick={clearUploadedFiles}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-audit-red bg-audit-red/8 border border-audit-red/20 hover:bg-audit-red/15 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空
            </button>
          )
        }
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden',
          'flex flex-col items-center justify-center py-14 px-8',
          isDragOver
            ? 'border-audit-navy bg-audit-navy/[0.06] scale-[1.01] shadow-audit-raised'
            : 'border-audit-border bg-audit-paper hover:border-audit-navy/50 hover:bg-audit-paper-dark/40'
        )}
      >
        <div
          className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300',
            isDragOver
              ? 'bg-audit-navy text-white shadow-lg scale-110'
              : 'bg-audit-navy/10 text-audit-navy'
          )}
        >
          <FolderOpen className="w-8 h-8" strokeWidth={1.8} />
        </div>
        <p className="text-sm font-semibold text-audit-ink mb-1.5">
          {isDragOver ? '松开鼠标开始上传' : '将文件拖拽到此处，或点击选择文件'}
        </p>
        <p className="text-xs text-audit-ink-light mb-4">
          支持 JPG、PNG、PDF 格式 · 单文件不超过 20MB
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-audit-border text-[11px] text-audit-ink-light">
            <ImageIcon className="w-3 h-3 text-audit-navy" />
            图片格式
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-audit-border text-[11px] text-audit-ink-light">
            <FileText className="w-3 h-3 text-audit-red-light" />
            PDF 文档
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-audit-navy" />
              <span className="text-sm font-semibold text-audit-ink">已上传文件</span>
              <span className="px-2 py-0.5 rounded-full bg-audit-navy/10 text-audit-navy text-[11px] font-bold">
                {uploadedFiles.length}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'relative group rounded-xl border transition-all duration-200 overflow-hidden',
                  'bg-white border-audit-border hover:border-audit-navy/40 hover:shadow-audit-hover'
                )}
              >
                <div className="relative h-32 bg-audit-paper-dark/60 overflow-hidden">
                  {file.thumbnail ? (
                    <img
                      src={file.thumbnail}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-12 h-12 text-audit-red/40" strokeWidth={1.5} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUploadedFile(file.id);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-audit-red"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2">
                    {getStatusBadge(file)}
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-xs font-semibold text-audit-ink truncate mb-1" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-audit-ink-light/80 mb-2.5">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{file.uploadTime.split(' ')[1]}</span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-audit-paper-dark overflow-hidden">
                    <div
                      className={cn(
                        'absolute left-0 top-0 h-full rounded-full transition-all duration-300',
                        file.status === 'success'
                          ? 'bg-gradient-to-r from-audit-green to-audit-green-light'
                          : file.status === 'error'
                          ? 'bg-audit-red'
                          : 'bg-gradient-to-r from-audit-navy to-audit-navy-light'
                      )}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-mono text-audit-navy/80 bg-audit-navy/8 px-1.5 py-0.5 rounded">
                      {file.voucherNo}
                    </span>
                    <span className="text-[10px] text-audit-ink-light">{file.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function VoucherSortSection() {
  const { sortableVouchers, updateSortableVoucher, reorderSortableVouchers } = useImportStore();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const sortedVouchers = [...sortableVouchers].sort((a, b) => a.order - b.order);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderSortableVouchers(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const startEditing = (v: SortableVoucher) => {
    setEditingId(v.id);
    setEditValue(v.voucherNo);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const saveEditing = (id: string) => {
    if (editValue.trim()) {
      updateSortableVoucher(id, { voucherNo: editValue.trim() });
    }
    setEditingId(null);
  };

  return (
    <section className="bg-white rounded-2xl border border-audit-border shadow-audit p-5">
      <SectionHeader
        icon={GripVertical}
        title="凭证排序表格"
        description="调整凭证顺序，拖拽行首抓手即可排序；双击凭证号可编辑"
        right={
          sortedVouchers.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-audit-ink-light">
              <span className="px-2 py-1 rounded-md bg-audit-paper-dark border border-audit-border">
                共 <span className="font-bold text-audit-navy">{sortedVouchers.length}</span> 条凭证
              </span>
            </div>
          )
        }
      />

      {sortedVouchers.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-audit-border bg-audit-paper/50 py-16 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-xl bg-audit-ink-light/10 flex items-center justify-center mb-3">
            <ClipboardList className="w-7 h-7 text-audit-ink-light/60" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-audit-ink-light mb-1">暂无凭证数据</p>
          <p className="text-xs text-audit-ink-light/70">请先在上方上传文件，或使用演示数据填充</p>
        </div>
      ) : (
        <div className="rounded-xl border border-audit-border overflow-hidden">
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-audit-navy to-audit-navy-light text-white">
                  <th className="w-12 px-3 py-3 text-center text-[11px] font-semibold tracking-wider">
                    排序
                  </th>
                  <th className="w-16 px-3 py-3 text-left text-[11px] font-semibold tracking-wider">
                    序号
                  </th>
                  <th className="w-20 px-3 py-3 text-left text-[11px] font-semibold tracking-wider">
                    预览
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold tracking-wider">
                    文件名
                  </th>
                  <th className="w-48 px-3 py-3 text-left text-[11px] font-semibold tracking-wider">
                    凭证号
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedVouchers.map((v, idx) => (
                  <tr
                    key={v.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'transition-all duration-150 border-b border-audit-border/60 last:border-b-0',
                      idx % 2 === 0 ? 'bg-white' : 'bg-audit-paper/60',
                      draggedIndex === idx && 'opacity-40',
                      dragOverIndex === idx && draggedIndex !== null && draggedIndex !== idx
                        ? 'bg-audit-navy/8 border-t-2 border-audit-navy'
                        : 'hover:bg-audit-navy/[0.04]'
                    )}
                  >
                    <td className="px-3 py-2.5 text-center">
                      <div
                        className={cn(
                          'inline-flex items-center justify-center w-7 h-7 rounded-lg cursor-grab active:cursor-grabbing transition-colors',
                          'bg-audit-paper-dark hover:bg-audit-navy/15 text-audit-ink-light/70 hover:text-audit-navy'
                        )}
                      >
                        <GripVertical className="w-4 h-4" strokeWidth={2.2} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-audit-navy/10 text-audit-navy text-xs font-bold">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {v.thumbnail ? (
                        <div className="w-12 h-16 rounded-lg overflow-hidden border border-audit-border bg-white shadow-sm">
                          <img
                            src={v.thumbnail}
                            alt={v.fileName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-16 rounded-lg border border-audit-border bg-audit-paper-dark flex items-center justify-center">
                          <FileText className="w-5 h-5 text-audit-red/40" strokeWidth={1.5} />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs font-medium text-audit-ink truncate max-w-[360px] pr-2" title={v.fileName}>
                        {v.fileName}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      {editingId === v.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveEditing(v.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing(v.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border-2 border-audit-navy text-xs font-mono text-audit-navy bg-white outline-none focus:ring-2 focus:ring-audit-navy/20"
                        />
                      ) : (
                        <button
                          type="button"
                          onDoubleClick={() => startEditing(v)}
                          className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-audit-green/10 border border-audit-green/25 text-audit-green text-xs font-mono font-semibold hover:bg-audit-green/15 transition-colors"
                        >
                          {v.voucherNo}
                          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2.2} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function LedgerImportSection() {
  const { ledgerData, setLedgerData, clearLedgerData, isLedgerImported } = useImportStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateImport = () => {
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
      '成都智能科技有限公司',
    ];
    const data: LedgerRow[] = Array.from({ length: 12 }, (_, i) => {
      const month = String(Math.floor(i / 2) + 1).padStart(2, '0');
      const day = String((i % 20) + 5).padStart(2, '0');
      const account = accountMap[i % accountMap.length];
      const seller = sellers[i % sellers.length];
      return {
        id: generateId(),
        voucherNo: `记-2024${month}-${String((i % 80) + 1).padStart(4, '0')}`,
        voucherDate: `2024-${month}-${day}`,
        summary: `支付${seller}货款/服务费`,
        amount: Math.round((3000 + Math.random() * 97000) * 100) / 100,
        accountCode: account.code,
        accountName: account.name,
      };
    });
    setLedgerData(data);
  };

  const totalAmount = ledgerData.reduce((sum, row) => sum + row.amount, 0);

  return (
    <section className="bg-white rounded-2xl border border-audit-border shadow-audit p-5">
      <SectionHeader
        icon={FileSpreadsheet}
        title="账载数据导入"
        description="导入企业账套中的凭证数据（CSV / Excel格式），用于后续比对分析"
        right={
          isLedgerImported ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearLedgerData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-audit-ink-light border border-audit-border hover:border-audit-red/40 hover:text-audit-red hover:bg-audit-red/5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                清空数据
              </button>
            </div>
          ) : null
        }
      />

      {!isLedgerImported ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border-2 border-dashed border-audit-border bg-audit-paper/60 p-6 flex flex-col items-center justify-center cursor-pointer hover:border-audit-navy/50 hover:bg-audit-navy/[0.03] transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-audit-navy/10 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-6 h-6 text-audit-navy" strokeWidth={1.8} />
            </div>
            <p className="text-sm font-semibold text-audit-ink mb-1">导入账载数据</p>
            <p className="text-xs text-audit-ink-light mb-3">支持 .csv / .xlsx 格式</p>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-audit-border text-[11px] text-audit-ink-light">
              <Upload className="w-3.5 h-3.5" />
              点击选择文件
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={simulateImport}
              className="hidden"
            />
          </div>

          <div className="rounded-xl border border-audit-border bg-gradient-to-br from-audit-paper to-white p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-audit-amber/15 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-audit-amber" strokeWidth={2} />
                </div>
                <p className="text-sm font-semibold text-audit-ink">数据格式要求</p>
              </div>
              <ul className="space-y-1.5 mt-3 text-xs text-audit-ink-light">
                <li className="flex items-start gap-2">
                  <span className="text-audit-green mt-0.5">✓</span>
                  <span>包含字段：凭证号、凭证日期、摘要、金额、科目编码、科目名称</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-audit-green mt-0.5">✓</span>
                  <span>第一行为表头，从第二行开始为数据行</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-audit-green mt-0.5">✓</span>
                  <span>金额保留 2 位小数，日期格式为 YYYY-MM-DD</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-audit-green mt-0.5">✓</span>
                  <span>编码格式使用 UTF-8（CSV）</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-audit-navy/5 border border-audit-navy/20 text-xs font-semibold text-audit-navy hover:bg-audit-navy/10 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              下载导入模板
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl bg-gradient-to-br from-audit-navy/12 to-audit-navy/5 border border-audit-navy/20 p-3.5">
              <div className="flex items-center gap-2 text-[11px] text-audit-ink-light mb-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-audit-navy" />
                凭证总条数
              </div>
              <div className="text-xl font-bold text-audit-navy tracking-tight">
                {ledgerData.length.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-audit-green/12 to-audit-green/5 border border-audit-green/20 p-3.5">
              <div className="flex items-center gap-2 text-[11px] text-audit-ink-light mb-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-audit-green" />
                涉及科目数
              </div>
              <div className="text-xl font-bold text-audit-green tracking-tight">
                {new Set(ledgerData.map((r) => r.accountCode)).size}
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-audit-amber/15 to-audit-amber/6 border border-audit-amber/30 p-3.5">
              <div className="flex items-center gap-2 text-[11px] text-audit-ink-light mb-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-audit-amber" />
                月份跨度
              </div>
              <div className="text-xl font-bold text-audit-amber tracking-tight">
                12 个月
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-audit-red/12 to-audit-red/5 border border-audit-red/20 p-3.5">
              <div className="flex items-center gap-2 text-[11px] text-audit-ink-light mb-1.5">
                <FileDigit className="w-3.5 h-3.5 text-audit-red" />
                账载金额合计
              </div>
              <div className="text-xl font-bold text-audit-red tracking-tight">
                ¥{totalAmount.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-audit-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-audit-paper-dark/70 border-b border-audit-border">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-audit-navy" />
                <span className="text-sm font-semibold text-audit-ink">数据预览</span>
                <span className="text-[11px] text-audit-ink-light/80">
                  （共 {ledgerData.length} 条，显示前 {Math.min(ledgerData.length, 100)} 条）
                </span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-audit-paper-dark">
                  <tr className="text-audit-ink-light">
                    <th className="w-12 px-3 py-2.5 text-center text-[11px] font-semibold border-b border-audit-border/80">
                      #
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold border-b border-audit-border/80 min-w-[130px]">
                      凭证号
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold border-b border-audit-border/80 min-w-[100px]">
                      凭证日期
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold border-b border-audit-border/80 min-w-[240px]">
                      摘要
                    </th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold border-b border-audit-border/80 min-w-[120px]">
                      金额
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold border-b border-audit-border/80 min-w-[90px]">
                      科目编码
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold border-b border-audit-border/80 min-w-[120px]">
                      科目名称
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-audit-border/50 last:border-b-0 transition-colors',
                        idx % 2 === 0 ? 'bg-white' : 'bg-audit-paper/40',
                        'hover:bg-audit-navy/[0.04]'
                      )}
                    >
                      <td className="px-3 py-2 text-center text-[11px] text-audit-ink-light/70 font-mono">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono font-semibold text-audit-navy">
                        {row.voucherNo}
                      </td>
                      <td className="px-3 py-2 text-xs text-audit-ink-light/90 font-mono">
                        {row.voucherDate}
                      </td>
                      <td className="px-3 py-2 text-xs text-audit-ink">{row.summary}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-audit-green/8 text-audit-green text-xs font-mono font-bold">
                          ¥{row.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-audit-ink-light">
                        {row.accountCode}
                      </td>
                      <td className="px-3 py-2 text-xs text-audit-ink font-medium">
                        {row.accountName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function ImportPage() {
  const { applyMockData, resetAll, projectForm, uploadedFiles, ledgerData, sortableVouchers } =
    useImportStore();
  const [showToast, setShowToast] = useState(false);

  const completionSteps = [
    { done: !!projectForm.clientName && !!projectForm.projectCode, label: '项目信息' },
    { done: uploadedFiles.length > 0, label: `文件上传 (${uploadedFiles.length})` },
    { done: sortableVouchers.length > 0, label: '凭证排序' },
    { done: ledgerData.length > 0, label: `账载数据 (${ledgerData.length})` },
  ];
  const completedCount = completionSteps.filter((s) => s.done).length;

  const handleMockData = () => {
    applyMockData();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  return (
    <div className="h-screen flex flex-col bg-audit-paper overflow-hidden">
      <TopNav currentStep="import" completedSteps={[]} />

      <div className="flex-1 flex overflow-hidden">
        <SidePanel />

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="relative">
            <div className="sticky top-0 z-30 bg-audit-paper/90 backdrop-blur-md border-b border-audit-border/70">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 rounded-full bg-gradient-to-b from-audit-navy to-audit-navy-light" />
                    <h1 className="text-xl font-bold text-audit-ink tracking-wide">样本导入</h1>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-audit-border text-xs">
                    <span className="text-audit-ink-light/80">完成进度</span>
                    <div className="flex items-center gap-1">
                      {completionSteps.map((s, i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-2 h-2 rounded-full transition-all duration-300',
                            s.done
                              ? 'bg-audit-green shadow-[0_0_0_3px_rgba(45,90,61,0.15)]'
                              : 'bg-audit-border'
                          )}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-audit-navy">
                      {completedCount}/{completionSteps.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleMockData}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-audit-amber/90 to-audit-amber text-white shadow-audit hover:shadow-audit-hover hover:from-audit-amber transition-all duration-200"
                  >
                    <Sparkles className="w-4 h-4" />
                    填充演示数据
                  </button>
                  <button
                    type="button"
                    onClick={resetAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white text-audit-ink border border-audit-border hover:border-audit-navy/40 hover:bg-audit-navy/[0.03] shadow-audit transition-all duration-200"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重置
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-audit-navy to-audit-navy-light text-white shadow-audit hover:shadow-audit-raised transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    下一步：抽样篮
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 space-y-6 max-w-[1600px] mx-auto pb-20">
              <ProjectInfoSection />
              <FileUploadSection />
              <VoucherSortSection />
              <LedgerImportSection />
            </div>
          </div>
        </main>
      </div>

      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-audit-green text-white shadow-audit-raised">
            <CheckCircle2 className="w-5 h-5" strokeWidth={2.2} />
            <span className="text-sm font-semibold">演示数据已成功填充！</span>
          </div>
        </div>
      )}
    </div>
  );
}
