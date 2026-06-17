import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Move, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageViewerProps {
  src: string;
  alt?: string;
  showScanLine?: boolean;
  className?: string;
  children?: React.ReactNode;
  onViewChange?: (view: ViewState) => void;
}

export interface ViewState {
  scale: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  offsetX: number;
  offsetY: number;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 5;
const SCALE_STEP = 0.1;
const ROTATE_STEP = 90;

export default function ImageViewer({
  src,
  alt = 'invoice image',
  showScanLine = false,
  className,
  children,
  onViewChange,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [viewState, setViewState] = useState<ViewState>({
    scale: 1,
    rotation: 0,
    flipX: false,
    flipY: false,
    offsetX: 0,
    offsetY: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showPanningCursor, setShowPanningCursor] = useState(false);

  const updateViewState = useCallback(
    (updates: Partial<ViewState>) => {
      setViewState((prev) => {
        const next = { ...prev, ...updates };
        onViewChange?.(next);
        return next;
      });
    },
    [onViewChange]
  );

  const resetView = useCallback(() => {
    setImageLoaded(false);
    updateViewState({
      scale: 1,
      rotation: 0,
      flipX: false,
      flipY: false,
      offsetX: 0,
      offsetY: 0,
    });
  }, [updateViewState]);

  const handleZoomIn = useCallback(() => {
    setViewState((prev) => ({
      ...prev,
      scale: Math.min(MAX_SCALE, prev.scale + SCALE_STEP),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewState((prev) => ({
      ...prev,
      scale: Math.max(MIN_SCALE, prev.scale - SCALE_STEP),
    }));
  }, []);

  const handleRotateLeft = useCallback(() => {
    setViewState((prev) => ({
      ...prev,
      rotation: prev.rotation - ROTATE_STEP,
    }));
  }, []);

  const handleRotateRight = useCallback(() => {
    setViewState((prev) => ({
      ...prev,
      rotation: prev.rotation + ROTATE_STEP,
    }));
  }, []);

  const handleFlipX = useCallback(() => {
    setViewState((prev) => ({
      ...prev,
      flipX: !prev.flipX,
    }));
  }, []);

  const handleFlipY = useCallback(() => {
    setViewState((prev) => ({
      ...prev,
      flipY: !prev.flipY,
    }));
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return;
    const container = containerRef.current;
    const img = imgRef.current;
    const containerRect = container.getBoundingClientRect();
    const padding = 40;
    const availableWidth = containerRect.width - padding * 2;
    const availableHeight = containerRect.height - padding * 2 - 60;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    const scaleX = availableWidth / imgWidth;
    const scaleY = availableHeight / imgHeight;
    const newScale = Math.min(scaleX, scaleY, 1);
    updateViewState({
      scale: newScale,
      rotation: 0,
      flipX: false,
      flipY: false,
      offsetX: 0,
      offsetY: 0,
    });
  }, [updateViewState]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    setViewState((prev) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale + delta));
      return { ...prev, scale: newScale };
    });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (viewState.scale <= 1) return;
      e.preventDefault();
      setIsDragging(true);
      setShowPanningCursor(true);
      setDragStart({
        x: e.clientX - viewState.offsetX,
        y: e.clientY - viewState.offsetY,
      });
    },
    [viewState.scale, viewState.offsetX, viewState.offsetY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      updateViewState({
        offsetX: e.clientX - dragStart.x,
        offsetY: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart, updateViewState]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setShowPanningCursor(false);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setShowPanningCursor(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  useEffect(() => {
    resetView();
  }, [src, resetView]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    requestAnimationFrame(() => {
      handleFitToScreen();
    });
  }, [handleFitToScreen]);

  const imageTransform = `
    translate(${viewState.offsetX}px, ${viewState.offsetY}px)
    scale(${viewState.flipX ? -viewState.scale : viewState.scale}, ${viewState.flipY ? -viewState.scale : viewState.scale})
    rotate(${viewState.rotation}deg)
  `;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full overflow-hidden bg-audit-paper-dark dark:bg-[#1a1d23] select-none',
        className
      )}
      onWheel={handleWheel}
    >
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1.5 bg-white/95 dark:bg-[#22262f]/95 backdrop-blur-sm rounded-lg shadow-audit border border-audit-border dark:border-[#3d4148]">
        <ToolbarButton onClick={handleZoomOut} title="缩小">
          <ZoomOut className="w-4 h-4" />
        </ToolbarButton>
        <div className="px-2 text-xs font-mono text-audit-ink-light dark:text-[#b0ada8] min-w-[52px] text-center">
          {Math.round(viewState.scale * 100)}%
        </div>
        <ToolbarButton onClick={handleZoomIn} title="放大">
          <ZoomIn className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-4 mx-1 bg-audit-border dark:bg-[#3d4148]" />
        <ToolbarButton onClick={handleRotateLeft} title="向左旋转">
          <RotateCcw className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleRotateRight} title="向右旋转">
          <RotateCw className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-4 mx-1 bg-audit-border dark:bg-[#3d4148]" />
        <ToolbarButton onClick={handleFlipX} title="水平翻转" active={viewState.flipX}>
          <FlipHorizontal className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleFlipY} title="垂直翻转" active={viewState.flipY}>
          <FlipVertical className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-4 mx-1 bg-audit-border dark:bg-[#3d4148]" />
        <ToolbarButton onClick={handleFitToScreen} title="适应窗口">
          <Maximize2 className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          showPanningCursor ? 'cursor-grabbing' : viewState.scale > 1 ? 'cursor-grab' : 'cursor-default'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          className="relative transition-transform duration-100 ease-out"
          style={{ transform: imageTransform, transformOrigin: 'center center' }}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center min-w-[400px] min-h-[300px] bg-white dark:bg-[#22262f] border border-dashed border-audit-border dark:border-[#3d4148] rounded">
              <div className="flex flex-col items-center gap-2 text-audit-ink-light dark:text-[#8a8782]">
                <div className="w-6 h-6 border-2 border-audit-navy-light dark:border-[#3d6499] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">加载中...</span>
              </div>
            </div>
          )}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            onLoad={handleImageLoad}
            draggable={false}
            className={cn(
              'max-w-none shadow-audit-raised',
              !imageLoaded && 'opacity-0'
            )}
            style={{ display: 'block' }}
          />

          {showScanLine && imageLoaded && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-x-0 h-24 animate-scan bg-scan-line opacity-60" />
              <div
                className="absolute inset-x-0 h-px bg-blue-400/60 animate-scan"
                style={{ animationDelay: '-0.5s' }}
              />
            </div>
          )}

          {children}
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 text-xs text-audit-ink-light dark:text-[#8a8782] bg-white/80 dark:bg-[#22262f]/80 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-audit border border-audit-border dark:border-[#3d4148]">
        <Move className="w-3 h-3" />
        <span>滚轮缩放 · 拖拽平移</span>
      </div>

      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 text-xs font-mono text-audit-ink-light dark:text-[#8a8782] bg-white/80 dark:bg-[#22262f]/80 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-audit border border-audit-border dark:border-[#3d4148]">
        <span>{viewState.rotation}°</span>
        {(viewState.flipX || viewState.flipY) && (
          <>
            <span className="w-px h-3 bg-audit-border dark:bg-[#3d4148]" />
            <span className="flex gap-1">
              {viewState.flipX && <span className="text-audit-navy">H</span>}
              {viewState.flipY && <span className="text-audit-navy">V</span>}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, title, active, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-all duration-150',
        'text-audit-ink-light dark:text-[#b0ada8] hover:text-audit-navy dark:hover:text-[#6b9fd4] hover:bg-audit-paper dark:hover:bg-[#2a2f3a]',
        active && 'bg-audit-navy/10 dark:bg-[#3d6499]/20 text-audit-navy dark:text-[#6b9fd4]'
      )}
    >
      {children}
    </button>
  );
}
