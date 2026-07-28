import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;

export interface PreviewCanvasHandle {
  recenter: (targetScale?: number) => void;
}

interface PreviewCanvasProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  children: React.ReactNode;
}

/**
 * Interactive canvas container wrapping the invoice preview.
 * Provides smooth 60fps pan/zoom gestures, mouse drag navigation, and automatic horizontal centering.
 */
export const PreviewCanvas = forwardRef<PreviewCanvasHandle, PreviewCanvasProps>(({
  scale,
  onScaleChange,
  children,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const scaleRef = useRef<number>(scale);
  const [, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasCentred = useRef<boolean>(false);
  const resetRequested = useRef<boolean>(false);
  const isInternalZoom = useRef<boolean>(false);

  scaleRef.current = scale;

  /** Directly updates hardware-accelerated CSS transform properties for smooth 60fps interaction. */
  const applyTransform = useCallback((s: number, p: { x: number; y: number }) => {
    if (contentRef.current) {
      contentRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0px) scale(${s})`;
    }
  }, []);

  /** Calculates horizontal offset required to centre the invoice card in the container. */
  const computeCentredPan = useCallback((targetScale: number): { x: number; y: number } => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      return { x: 0, y: 0 };
    }

    const containerWidth = container.clientWidth;
    const unscaledWidth = content.scrollWidth;
    const scaledWidth = unscaledWidth * targetScale;
    const x = Math.max(24, (containerWidth - scaledWidth) / 2);
    return { x, y: 0 };
  }, []);

  useImperativeHandle(ref, () => ({
    recenter: (targetScale?: number) => {
      resetRequested.current = true;
      const currentScale = scaleRef.current;
      const s = targetScale ?? currentScale;

      if (s === currentScale) {
        resetRequested.current = false;
        const centredPan = computeCentredPan(s);
        panRef.current = centredPan;
        setPan(centredPan);
        applyTransform(s, centredPan);
      }
    },
  }), [computeCentredPan, applyTransform]);

  /** Centre the invoice card horizontally on first render. */
  useEffect(() => {
    if (hasCentred.current) {
      return;
    }
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      return;
    }

    const checkAndCenter = () => {
      if (!hasCentred.current && container.clientWidth > 0 && content.scrollWidth > 0) {
        const centredPan = computeCentredPan(scaleRef.current);
        panRef.current = centredPan;
        setPan(centredPan);
        hasCentred.current = true;
        observer.disconnect();
      }
    };

    const observer = new ResizeObserver(() => checkAndCenter());
    observer.observe(container);
    observer.observe(content);

    checkAndCenter();

    return () => observer.disconnect();
  }, [computeCentredPan]);

  /** Keep visual transform in sync with React scale state changes. */
  useEffect(() => {
    if (isInternalZoom.current) {
      isInternalZoom.current = false;
      return;
    }

    if (resetRequested.current) {
      resetRequested.current = false;
      const centredPan = computeCentredPan(scale);
      panRef.current = centredPan;
      setPan(centredPan);
    }

    applyTransform(scale, panRef.current);
  }, [scale, applyTransform, computeCentredPan]);

  /** Mouse wheel handler: zoom toward cursor on ctrl/meta key, or pan when scrolling. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        const currentScale = scaleRef.current;
        const rect = el.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        const delta = -e.deltaY * 0.008;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, currentScale * Math.exp(delta)));
        const ratio = newScale / currentScale;

        const newPan = {
          x: cursorX - ratio * (cursorX - panRef.current.x),
          y: cursorY - ratio * (cursorY - panRef.current.y),
        };

        panRef.current = newPan;
        applyTransform(newScale, newPan);
        setPan(newPan);
        isInternalZoom.current = true;
        onScaleChange(newScale);
      } else {
        e.preventDefault();
        const newPan = {
          x: panRef.current.x - e.deltaX,
          y: panRef.current.y - e.deltaY,
        };
        panRef.current = newPan;
        applyTransform(scaleRef.current, newPan);
        setPan(newPan);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [onScaleChange, applyTransform]);

  /** Mouse drag handler for panning across the canvas surface. */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0) {
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { ...panRef.current };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) {
          return;
        }
        const dx = moveEvent.clientX - dragStart.current.x;
        const dy = moveEvent.clientY - dragStart.current.y;
        const newPan = {
          x: panStart.current.x + dx,
          y: panStart.current.y + dy,
        };
        panRef.current = newPan;
        applyTransform(scaleRef.current, newPan);
      };

      const handleMouseUp = () => {
        if (isDragging.current) {
          isDragging.current = false;
          setPan({ ...panRef.current });
        }
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  }, [applyTransform]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className="w-full h-full overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
    >
      <div
        ref={contentRef}
        className="inline-block origin-top-left transition-transform duration-75 ease-out"
        style={{
          transform: `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0px) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
});

PreviewCanvas.displayName = 'PreviewCanvas';
