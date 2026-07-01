import React, { useRef, useEffect, useCallback, useState } from 'react';

const MIN_SCALE = 0.2;
const MAX_SCALE = 2.0;
const INITIAL_TOP_PADDING = 32;

interface PreviewCanvasProps {
  children: React.ReactNode;
  scale: number;
  onScaleChange: (scale: number) => void;
}

/**
 * Canvas-like container that supports smooth pinch-to-zoom, scroll-to-zoom,
 * and drag-to-pan. Renders children inside a CSS-transformed layer.
 */
export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({ children, scale, onScaleChange }) => {
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
  scaleRef.current = scale;

  /** Apply the current transform to the content element directly. */
  const applyTransform = useCallback((s: number, p: { x: number; y: number }) => {
    if (contentRef.current) {
      contentRef.current.style.transform = `translate(${p.x}px, ${p.y}px) scale(${s})`;
    }
  }, []);

  // Centre the invoice card horizontally on first render
  useEffect(() => {
    if (hasCentred.current) return;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    // Wait a frame for children to render and have dimensions
    requestAnimationFrame(() => {
      const containerW = container.clientWidth;
      const contentW = content.scrollWidth;
      const centredX = (containerW - contentW * scale) / 2;
      const initialPan = { x: centredX, y: INITIAL_TOP_PADDING };
      panRef.current = initialPan;
      setPan(initialPan);
      hasCentred.current = true;
    });
  }, [scale, applyTransform]);

  // Keep the visual transform in sync with React state
  useEffect(() => {
    applyTransform(scale, pan);
  }, [scale, pan, applyTransform]);

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
        // Direct DOM update for immediate visual feedback
        applyTransform(newScale, newPan);
        setPan(newPan);
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
        // Sync React state once drag ends
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
      >
        {children}
      </div>
    </div>
  );
};
