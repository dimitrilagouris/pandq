import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

interface TooltipCoords {
  top: number;
  left: number;
  arrowOffset: number;
}

/**
 * Floating tooltip component rendered into document body via React Portal with viewport clamping.
 */
export const Tooltip: React.FC<TooltipProps> = ({ content, children, className = '' }) => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);

  useLayoutEffect(() => {
    if (!showTooltip || !triggerRef.current) {
      setCoords(null);
      return;
    }

    const rect: DOMRect = triggerRef.current.getBoundingClientRect();
    const maxTooltipWidth: number = 200;
    const halfWidth: number = maxTooltipWidth / 2;
    const padding: number = 16;
    const triggerCenter: number = rect.left + rect.width / 2;

    const clampedLeft: number = Math.max(
      padding + halfWidth,
      Math.min(window.innerWidth - padding - halfWidth, triggerCenter)
    );
    const arrowOffset: number = Math.max(-halfWidth + 16, Math.min(halfWidth - 16, triggerCenter - clampedLeft));

    setCoords({
      top: rect.top - 8,
      left: clampedLeft,
      arrowOffset,
    });
  }, [showTooltip]);

  useEffect(() => {
    if (!showTooltip) {
      return;
    }

    const handleDismiss = (): void => setShowTooltip(false);

    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);

    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [showTooltip]);

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-flex items-center w-fit ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        {children}
      </div>

      {showTooltip && coords && createPortal(
        <div
          className="font-light fixed z-[9999] w-max max-w-[200px] bg-stone-900 text-white text-[11px] leading-normal rounded-xl p-2.5 shadow-22 text-center animate-in fade-in zoom-in-95 duration-100 pointer-events-none"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div>{content}</div>
          <div
            className="absolute top-full -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-stone-900"
            style={{ left: `calc(50% + ${coords.arrowOffset}px)` }}
          />
        </div>,
        document.body
      )}
    </>
  );
};
