import React, { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';

const MIN_SCALE = 0.2;
const MAX_SCALE = 2.0;
const INITIAL_TOP_PADDING = 24;

export interface PreviewCanvasHandle {
  /** Reset pan to centred position. */
  resetView: () => void;
}

interface PreviewCanvasProps {
  children: React.ReactNode;
  scale: number;
  onScaleChange: (scale: number) => void;
}

/**
 * Canvas-like container that supports smooth pinch-to-zoom, scroll-to-zoom,
 * and drag-to-pan. Renders children inside a CSS-transformed layer.
 */
export const PreviewCanvas = forwardRef<PreviewCanvasHandle, PreviewCanvasProps>(
  ({ children, scale, onScaleChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const hasCentred = useRef(false);

    // Pan offset tracked via ref for performance (avoids re-renders during drag)
    const panRef = useRef({ x: 0, y: 0 });
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const panStart = useRef({ x: 0, y: 0 });
    // Store scale in a ref so wheel handler always reads the latest value
    const scaleRef = useRef(scale);

    /** Apply the current transform to the content element directly. */
    const applyTransform = useCallback((s: number, p: { x: number; y: number }) => {
      if (contentRef.current) {
        contentRef.current.style.transform = `translate(${p.x}px, ${p.y}px) scale(${s})`;
      }
    }, []);

    /** Compute centred pan for a given scale. */
    const computeCentredPan = useCallback((s: number): { x: number; y: number } => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return { x: 0, y: INITIAL_TOP_PADDING };
      const containerW = container.clientWidth;
      const contentW = content.scrollWidth;
      return { x: (containerW - contentW * s) / 2, y: INITIAL_TOP_PADDING };
    }, []);

    const isInternalZoom = useRef(false);
    const resetRequested = useRef(false);

    // Expose resetView to parent via ref
    useImperativeHandle(ref, () => ({
      resetView: (targetScale?: number) => {
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

    // Centre the invoice card horizontally on first render
    useEffect(() => {
      if (hasCentred.current) return;
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

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
      
      checkAndCenter(); // Try immediately as well

      return () => observer.disconnect();
    }, [computeCentredPan]);

    // Keep the visual transform in sync with React state
    useEffect(() => {
      if (scaleRef.current !== scale || resetRequested.current) {
        if (resetRequested.current) {
          resetRequested.current = false;
          const centredPan = computeCentredPan(scale);
          panRef.current = centredPan;
          setPan(centredPan);
        } else if (isInternalZoom.current) {
          isInternalZoom.current = false;
        } else {
          // External zoom (e.g. buttons) - anchor at the center of the container
          const currentScale = scaleRef.current;
          const ratio = scale / currentScale;
          const container = containerRef.current;
          
          if (container) {
            const centerX = container.clientWidth / 2;
            const centerY = container.clientHeight / 2;
            
            const newPan = {
              x: centerX - ratio * (centerX - panRef.current.x),
              y: centerY - ratio * (centerY - panRef.current.y),
            };
            
            panRef.current = newPan;
            setPan(newPan);
          }
        }
        scaleRef.current = scale;
      }
      
      applyTransform(scale, panRef.current);
    }, [scale, applyTransform, computeCentredPan]);

    // Wheel handler: zoom toward cursor, or pan when no modifier
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const handleWheel = (e: WheelEvent) => {
        // Pinch-to-zoom on trackpad fires ctrlKey
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

          // Adjust pan so zoom centres on the cursor position
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
          // Regular scroll/two-finger swipe to pan
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

    // Mouse drag to pan
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      if (e.button === 1 || e.button === 0) {
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        panStart.current = { ...panRef.current };

        const handleMouseMove = (moveEvent: MouseEvent) => {
          if (!isDragging.current) return;
          const dx = moveEvent.clientX - dragStart.current.x;
          const dy = moveEvent.clientY - dragStart.current.y;
          const newPan = {
            x: panStart.current.x + dx,
            y: panStart.current.y + dy,
          };
          panRef.current = newPan;
          // Direct DOM manipulation for smooth 60fps dragging
          applyTransform(scaleRef.current, newPan);
        };

        const handleMouseUp = () => {
          isDragging.current = false;
          setPan({ ...panRef.current });
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
        className="preview-canvas"
        onMouseDown={handleMouseDown}
      >
        <div
          ref={contentRef}
          className="preview-canvas__content"
          style={{ padding: '40px' }}
        >
          {children}
        </div>
      </div>
    );
  }
);
