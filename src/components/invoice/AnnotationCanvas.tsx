import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InvoiceAnnotation } from '@/types';

export type ResizeHandle =
  | 'nw' | 'n' | 'ne'
  | 'w' | 'e'
  | 'sw' | 's' | 'se';

export interface AnnotationCanvasProps {
  annotations: InvoiceAnnotation[];
  onChange?: (annotations: InvoiceAnnotation[]) => void;
  onCreate?: (annotation: Omit<InvoiceAnnotation, 'id' | 'invoiceId' | 'createTime'>) => void;
  onSelect?: (annotationId: string | null) => void;
  onDelete?: (annotationId: string) => void;
  selectedId?: string | null;
  readOnly?: boolean;
  className?: string;
  imageWidth?: number;
  imageHeight?: number;
}

interface DragState {
  type: 'create' | 'move' | 'resize';
  startX: number;
  startY: number;
  targetId?: string;
  resizeHandle?: ResizeHandle;
  originalRect?: { x: number; y: number; width: number; height: number };
}

const MIN_BOX_SIZE = 10;
const HANDLE_SIZE = 8;

export default function AnnotationCanvas({
  annotations,
  onChange,
  onCreate,
  onSelect,
  onDelete,
  selectedId,
  readOnly = false,
  className,
  imageWidth,
  imageHeight,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [creatingBox, setCreatingBox] = useState<InvoiceAnnotation | null>(null);
  const [selected, setSelected] = useState<string | null>(selectedId ?? null);

  useEffect(() => {
    setSelected(selectedId ?? null);
  }, [selectedId]);

  const getRelativeCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const width = imageWidth ?? rect.width;
    const height = imageHeight ?? rect.height;
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, [imageWidth, imageHeight]);

  const clampToImage = useCallback(
    (value: number, max: number, size = 0) => {
      return Math.max(0, Math.min(max - size, value));
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly) return;
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (target.dataset.annotationHandle || target.dataset.annotationBox) return;

      onSelect?.(null);
      setSelected(null);

      const { x, y } = getRelativeCoords(e.clientX, e.clientY);
      const width = imageWidth ?? (canvasRef.current?.getBoundingClientRect().width || 0);
      const height = imageHeight ?? (canvasRef.current?.getBoundingClientRect().height || 0);

      const clampedX = clampToImage(x, width);
      const clampedY = clampToImage(y, height);

      const newAnnotation: InvoiceAnnotation = {
        id: 'creating-' + Date.now(),
        invoiceId: '',
        x: clampedX,
        y: clampedY,
        width: 0,
        height: 0,
        label: '',
        createTime: new Date().toISOString(),
      };

      setCreatingBox(newAnnotation);
      setDragState({
        type: 'create',
        startX: clampedX,
        startY: clampedY,
        originalRect: { x: clampedX, y: clampedY, width: 0, height: 0 },
      });
    },
    [readOnly, getRelativeCoords, imageWidth, imageHeight, clampToImage, onSelect]
  );

  const handleBoxMouseDown = useCallback(
    (e: React.MouseEvent, annotationId: string) => {
      if (readOnly) return;
      if (e.button !== 0) return;
      e.stopPropagation();

      setSelected(annotationId);
      onSelect?.(annotationId);

      const annotation = annotations.find((a) => a.id === annotationId);
      if (!annotation) return;

      const { x, y } = getRelativeCoords(e.clientX, e.clientY);

      setDragState({
        type: 'move',
        startX: x,
        startY: y,
        targetId: annotationId,
        originalRect: {
          x: annotation.x,
          y: annotation.y,
          width: annotation.width,
          height: annotation.height,
        },
      });
    },
    [readOnly, annotations, getRelativeCoords, onSelect]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, annotationId: string, handle: ResizeHandle) => {
      if (readOnly) return;
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      setSelected(annotationId);
      onSelect?.(annotationId);

      const annotation = annotations.find((a) => a.id === annotationId);
      if (!annotation) return;

      const { x, y } = getRelativeCoords(e.clientX, e.clientY);

      setDragState({
        type: 'resize',
        startX: x,
        startY: y,
        targetId: annotationId,
        resizeHandle: handle,
        originalRect: {
          x: annotation.x,
          y: annotation.y,
          width: annotation.width,
          height: annotation.height,
        },
      });
    },
    [readOnly, annotations, getRelativeCoords, onSelect]
  );

  const calculateCreateBox = useCallback(
    (startX: number, startY: number, currentX: number, currentY: number) => {
      const width = imageWidth ?? (canvasRef.current?.getBoundingClientRect().width || 0);
      const height = imageHeight ?? (canvasRef.current?.getBoundingClientRect().height || 0);

      let x = Math.min(startX, currentX);
      let y = Math.min(startY, currentY);
      let w = Math.abs(currentX - startX);
      let h = Math.abs(currentY - startY);

      x = clampToImage(x, width, w);
      y = clampToImage(y, height, h);
      w = Math.min(w, width - x);
      h = Math.min(h, height - y);

      return { x, y, width: w, height: h };
    },
    [imageWidth, imageHeight, clampToImage]
  );

  const calculateMoveBox = useCallback(
    (original: { x: number; y: number; width: number; height: number }, deltaX: number, deltaY: number) => {
      const width = imageWidth ?? (canvasRef.current?.getBoundingClientRect().width || 0);
      const height = imageHeight ?? (canvasRef.current?.getBoundingClientRect().height || 0);

      return {
        x: clampToImage(original.x + deltaX, width, original.width),
        y: clampToImage(original.y + deltaY, height, original.height),
        width: original.width,
        height: original.height,
      };
    },
    [imageWidth, imageHeight, clampToImage]
  );

  const calculateResizeBox = useCallback(
    (original: { x: number; y: number; width: number; height: number }, handle: ResizeHandle, deltaX: number, deltaY: number) => {
      const width = imageWidth ?? (canvasRef.current?.getBoundingClientRect().width || 0);
      const height = imageHeight ?? (canvasRef.current?.getBoundingClientRect().height || 0);

      let { x, y, w, h } = {
        x: original.x,
        y: original.y,
        w: original.width,
        h: original.height,
      };

      const right = original.x + original.width;
      const bottom = original.y + original.height;

      switch (handle) {
        case 'nw':
          x = original.x + deltaX;
          y = original.y + deltaY;
          w = right - x;
          h = bottom - y;
          if (w < MIN_BOX_SIZE) { x = right - MIN_BOX_SIZE; w = MIN_BOX_SIZE; }
          if (h < MIN_BOX_SIZE) { y = bottom - MIN_BOX_SIZE; h = MIN_BOX_SIZE; }
          break;
        case 'n':
          y = original.y + deltaY;
          h = bottom - y;
          if (h < MIN_BOX_SIZE) { y = bottom - MIN_BOX_SIZE; h = MIN_BOX_SIZE; }
          break;
        case 'ne':
          y = original.y + deltaY;
          w = original.width + deltaX;
          h = bottom - y;
          if (w < MIN_BOX_SIZE) w = MIN_BOX_SIZE;
          if (h < MIN_BOX_SIZE) { y = bottom - MIN_BOX_SIZE; h = MIN_BOX_SIZE; }
          break;
        case 'w':
          x = original.x + deltaX;
          w = right - x;
          if (w < MIN_BOX_SIZE) { x = right - MIN_BOX_SIZE; w = MIN_BOX_SIZE; }
          break;
        case 'e':
          w = original.width + deltaX;
          if (w < MIN_BOX_SIZE) w = MIN_BOX_SIZE;
          break;
        case 'sw':
          x = original.x + deltaX;
          w = right - x;
          h = original.height + deltaY;
          if (w < MIN_BOX_SIZE) { x = right - MIN_BOX_SIZE; w = MIN_BOX_SIZE; }
          if (h < MIN_BOX_SIZE) h = MIN_BOX_SIZE;
          break;
        case 's':
          h = original.height + deltaY;
          if (h < MIN_BOX_SIZE) h = MIN_BOX_SIZE;
          break;
        case 'se':
          w = original.width + deltaX;
          h = original.height + deltaY;
          if (w < MIN_BOX_SIZE) w = MIN_BOX_SIZE;
          if (h < MIN_BOX_SIZE) h = MIN_BOX_SIZE;
          break;
      }

      x = clampToImage(x, width, w);
      y = clampToImage(y, height, h);
      w = Math.min(w, width - x);
      h = Math.min(h, height - y);

      return { x, y, width: w, height: h };
    },
    [imageWidth, imageHeight, clampToImage]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState) return;

      const { x, y } = getRelativeCoords(e.clientX, e.clientY);
      const deltaX = x - dragState.startX;
      const deltaY = y - dragState.startY;

      if (dragState.type === 'create') {
        const box = calculateCreateBox(dragState.startX, dragState.startY, x, y);
        setCreatingBox((prev) => (prev ? { ...prev, ...box } : null));
      } else if (dragState.type === 'move' && dragState.targetId && dragState.originalRect) {
        const box = calculateMoveBox(dragState.originalRect, deltaX, deltaY);
        const updated = annotations.map((a) =>
          a.id === dragState.targetId ? { ...a, ...box } : a
        );
        onChange?.(updated);
      } else if (dragState.type === 'resize' && dragState.targetId && dragState.resizeHandle && dragState.originalRect) {
        const box = calculateResizeBox(dragState.originalRect, dragState.resizeHandle, deltaX, deltaY);
        const updated = annotations.map((a) =>
          a.id === dragState.targetId ? { ...a, ...box } : a
        );
        onChange?.(updated);
      }
    },
    [dragState, getRelativeCoords, calculateCreateBox, calculateMoveBox, calculateResizeBox, annotations, onChange]
  );

  const handleMouseUp = useCallback(() => {
    if (dragState?.type === 'create' && creatingBox) {
      if (creatingBox.width >= MIN_BOX_SIZE && creatingBox.height >= MIN_BOX_SIZE) {
        const nextNumber = annotations.length + 1;
        onCreate?.({
          x: creatingBox.x,
          y: creatingBox.y,
          width: creatingBox.width,
          height: creatingBox.height,
          label: String(nextNumber),
        });
      }
      setCreatingBox(null);
    }
    setDragState(null);
  }, [dragState, creatingBox, annotations.length, onCreate]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState?.type === 'create' && creatingBox) {
        if (creatingBox.width >= MIN_BOX_SIZE && creatingBox.height >= MIN_BOX_SIZE) {
          const nextNumber = annotations.length + 1;
          onCreate?.({
            x: creatingBox.x,
            y: creatingBox.y,
            width: creatingBox.width,
            height: creatingBox.height,
            label: String(nextNumber),
          });
        }
        setCreatingBox(null);
      }
      setDragState(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragState, creatingBox, annotations.length, onCreate]);

  const handleDelete = useCallback(
    (e: React.MouseEvent, annotationId: string) => {
      e.stopPropagation();
      onDelete?.(annotationId);
      if (selected === annotationId) {
        setSelected(null);
        onSelect?.(null);
      }
    },
    [onDelete, selected, onSelect]
  );

  const getScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 1, y: 1 };
    const rect = canvas.getBoundingClientRect();
    const width = imageWidth ?? rect.width;
    const height = imageHeight ?? rect.height;
    return {
      x: rect.width / width,
      y: rect.height / height,
    };
  }, [imageWidth, imageHeight]);

  const scale = getScale();

  const renderAnnotation = (annotation: InvoiceAnnotation, index: number) => {
    const isSelected = selected === annotation.id;
    const style: React.CSSProperties = {
      left: annotation.x * scale.x,
      top: annotation.y * scale.y,
      width: annotation.width * scale.x,
      height: annotation.height * scale.y,
    };

    return (
      <div
        key={annotation.id}
        data-annotation-box
        className={cn(
          'absolute group',
          isSelected ? 'z-20' : 'z-10'
        )}
        style={style}
        onMouseDown={(e) => handleBoxMouseDown(e, annotation.id)}
      >
        <div
          className={cn(
            'absolute inset-0 border-2 rounded-sm transition-colors',
            isSelected
              ? 'border-audit-navy bg-audit-navy/10 dark:border-[#6b9fd4] dark:bg-[#6b9fd4]/10'
              : 'border-audit-amber bg-audit-amber/8 dark:border-[#e0b42e] dark:bg-[#e0b42e]/8 hover:border-audit-navy dark:hover:border-[#6b9fd4]'
          )}
        />

        <div
          data-annotation-label
          className={cn(
            'absolute -top-2 -left-2 flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold shadow-audit transition-all cursor-default',
            isSelected
              ? 'bg-audit-navy text-white dark:bg-[#6b9fd4] dark:text-[#1a1a1a]'
              : 'bg-audit-amber text-white dark:bg-[#e0b42e] dark:text-[#1a1a1a]'
          )}
        >
          {annotation.label || index + 1}
        </div>

        {isSelected && !readOnly && (
          <>
            <button
              type="button"
              data-annotation-delete
              className="absolute -top-2 -right-2 w-[22px] h-[22px] flex items-center justify-center rounded-full bg-audit-red text-white shadow-audit opacity-0 group-hover:opacity-100 transition-opacity hover:bg-audit-red-light"
              onClick={(e) => handleDelete(e, annotation.id)}
              title="删除标注"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            {(['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'] as ResizeHandle[]).map((handle) => (
              <div
                key={handle}
                data-annotation-handle
                className={cn(
                  'absolute w-2 h-2 bg-white dark:bg-[#22262f] border-2 border-audit-navy dark:border-[#6b9fd4] rounded-sm shadow-sm transition-transform hover:scale-125',
                  handle.includes('n') && '-top-1',
                  handle.includes('s') && '-bottom-1',
                  handle.includes('w') && '-left-1',
                  handle.includes('e') && '-right-1',
                  handle === 'n' && 'left-1/2 -translate-x-1/2 cursor-n-resize',
                  handle === 's' && 'left-1/2 -translate-x-1/2 cursor-s-resize',
                  handle === 'w' && 'top-1/2 -translate-y-1/2 cursor-w-resize',
                  handle === 'e' && 'top-1/2 -translate-y-1/2 cursor-e-resize',
                  handle === 'nw' && 'cursor-nw-resize',
                  handle === 'ne' && 'cursor-ne-resize',
                  handle === 'sw' && 'cursor-sw-resize',
                  handle === 'se' && 'cursor-se-resize'
                )}
                style={{
                  width: `${HANDLE_SIZE}px`,
                  height: `${HANDLE_SIZE}px`,
                }}
                onMouseDown={(e) => handleResizeMouseDown(e, annotation.id, handle)}
              />
            ))}
          </>
        )}
      </div>
    );
  };

  const renderCreatingBox = () => {
    if (!creatingBox) return null;
    const style: React.CSSProperties = {
      left: creatingBox.x * scale.x,
      top: creatingBox.y * scale.y,
      width: creatingBox.width * scale.x,
      height: creatingBox.height * scale.y,
    };

    return (
      <div
        className="absolute z-30 pointer-events-none"
        style={style}
      >
        <div className="absolute inset-0 border-2 border-dashed border-audit-navy dark:border-[#6b9fd4] bg-audit-navy/10 dark:bg-[#6b9fd4]/10 rounded-sm animate-pulse" />
        <div className="absolute -bottom-5 left-0 text-[10px] font-mono text-audit-navy dark:text-[#6b9fd4] whitespace-nowrap">
          {Math.round(creatingBox.width)} × {Math.round(creatingBox.height)}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={canvasRef}
      className={cn(
        'absolute inset-0 w-full h-full',
        readOnly ? 'cursor-default' : 'cursor-crosshair',
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {annotations.map(renderAnnotation)}
      {renderCreatingBox()}
    </div>
  );
}
