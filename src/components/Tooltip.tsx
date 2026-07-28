import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Floating tooltip component rendered into document body via React Portal.
 */
export const Tooltip: React.FC<TooltipProps> = ({ content, children, className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (showTooltip && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    } else {
      setCoords(null);
    }
  }, [showTooltip]);

  useEffect(() => {
    if (!showTooltip) {
      return;
    }
    const hide = () => setShowTooltip(false);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
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
            top: coords.top,
            left: coords.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div>{content}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-stone-900" />
        </div>,
        document.body
      )}
    </>
  );
};
