import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RiQuestionLine } from 'react-icons/ri';

interface HelpBadgeProps {
  tooltipText: string;
  onClick?: () => void;
}

interface TooltipCoords {
  top: number;
  left: number;
  arrowOffset: number;
}

/**
 * Interactive help badge rendering a portal-based tooltip to avoid parent container overflow clipping.
 */
export const HelpBadge: React.FC<HelpBadgeProps> = ({ tooltipText, onClick }) => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);

  useLayoutEffect(() => {
    if (!showTooltip || !buttonRef.current) {
      setCoords(null);
      return;
    }

    const rect: DOMRect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth: number = 192;
    const halfWidth: number = tooltipWidth / 2;
    const padding: number = 16;
    const buttonCenter: number = rect.left + rect.width / 2;

    const clampedLeft: number = Math.max(
      padding + halfWidth,
      Math.min(window.innerWidth - padding - halfWidth, buttonCenter)
    );
    const arrowOffset: number = Math.max(-halfWidth + 16, Math.min(halfWidth - 16, buttonCenter - clampedLeft));

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        className="text-stone-400 hover:text-stone-600 transition-colors p-0.5 rounded-full outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        aria-label="Help information"
      >
        <RiQuestionLine className="w-3.5 h-3.5" />
      </button>

      {showTooltip && coords && createPortal(
        <div
          className="font-light fixed z-[9999] w-48 bg-stone-900 text-white text-[11px] leading-normal rounded-xl p-2.5 shadow-22 text-center animate-in fade-in zoom-in-95 duration-100 pointer-events-none"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div>{tooltipText}</div>
          {onClick && (
            <div className="mt-1 font-semibold text-stone-300 border-t border-white/10 pt-1 text-[10px]">
              Click to learn more
            </div>
          )}
          <div
            className="absolute top-full -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-stone-900"
            style={{ left: `calc(50% + ${coords.arrowOffset}px)` }}
          />
        </div>,
        document.body
      )}
    </div>
  );
};
