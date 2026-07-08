import React, { useState } from 'react';
import { RiQuestionLine } from 'react-icons/ri';

interface HelpBadgeProps {
  tooltipText: string;
  onClick?: () => void;
}

export const HelpBadge: React.FC<HelpBadgeProps> = ({ tooltipText, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
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

      {showTooltip && (
        <div className="font-light absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-stone-900 text-white text-[11px] leading-normal rounded-xl p-2.5 shadow-22 z-50 text-center animate-in fade-in zoom-in-95 duration-100 pointer-events-none">
          <div>{tooltipText}</div>
          {onClick && (
            <div className="mt-1 font-semibold text-stone-300 border-t border-white/10 pt-1 text-[10px]">
              Click to learn more
            </div>
          )}
          {/* Subtle pointing arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-stone-900" />
        </div>
      )}
    </div>
  );
};
