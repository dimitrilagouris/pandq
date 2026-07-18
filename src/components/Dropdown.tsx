import React, { useState, useEffect, useRef } from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  onSelect: (value: string) => void;
  triggerLabel: string;
  triggerClassName?: string;
  icon?: React.ReactNode;
  align?: 'left' | 'right';
  widthClass?: string;
  variant?: 'input' | 'badge';
  value?: string;
  placeholder?: string;
  showNavigationHelp?: boolean;
}

/**
 * Reusable Dropdown component styled as a backdrop-filtered popup.
 * Supports 'input' variant (looks like text/search inputs) and 'badge' variant (looks like status pills).
 * Mutes text color and displays placeholder value when no item is selected.
 */
export const Dropdown: React.FC<DropdownProps> = ({
  options,
  onSelect,
  triggerLabel,
  triggerClassName = '',
  icon,
  align = 'left',
  widthClass = 'w-32',
  variant = 'badge',
  value,
  placeholder,
  showNavigationHelp = false
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset focus when opened
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Close dropdown menu when user clicks outside the component boundaries
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown when scrolling
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => {
      setIsOpen(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  const alignmentClass = align === 'left' ? 'left-0' : 'right-0';

  const isPlaceholder = variant === 'input' && (!value || value === 'all' || value === '');
  const textClass = isPlaceholder ? 'text-stone-300 font-regular' : 'text-stone-900 font-regular';
  const labelToDisplay = isPlaceholder && placeholder ? placeholder : triggerLabel;

  const baseClass = variant === 'input'
    ? `w-full h-10 px-3 text-left text-sm bg-white border border-transparent rounded-xl shadow-1 transition-all duration-150 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 flex items-center justify-between select-none cursor-pointer ${textClass}`
    : 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-regular rounded-lg cursor-pointer hover:opacity-85 transition-all select-none border-0';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < options.length) {
        onSelect(options[focusedIndex].value);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className={variant === 'input' ? 'w-full relative' : 'relative inline-block text-left'} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`${baseClass} ${triggerClassName}`}
      >
        <span className="truncate">{labelToDisplay}</span>
        {icon !== undefined ? icon : (
          variant === 'input'
            ? <RiArrowDownSLine className={`w-4 h-4 text-stone-400 transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
            : <RiArrowDownSLine className="w-3 h-3 text-stone-500/80" />
        )}
      </button>

      {isOpen && (
        <div className={`dropdown-menu-open absolute z-50 mt-1 bg-stone-600/95 backdrop-blur-md border border-white/5 rounded-2xl shadow-22 p-1 flex flex-col animate-in fade-in slide-in-from-top-2 duration-150 ${alignmentClass} ${widthClass}`}>
          <div className="flex flex-col gap-0.5 p-0.5 overflow-y-auto max-h-60">
            {options.map((opt, idx) => (
              <button
                key={opt.value}
                type="button"
                onMouseEnter={() => setFocusedIndex(idx)}
                onClick={() => {
                  onSelect(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 text-left text-xs font-regular text-white hover:bg-white/10 rounded-lg transition-colors capitalize border-0 cursor-pointer
                  ${focusedIndex === idx ? 'bg-white/10' : 'bg-transparent'}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
          
          {showNavigationHelp && (
            <div className="flex items-center gap-3 px-2 py-2 mt-0.5 border-t border-white/10 text-[10px] text-stone-300 select-none bg-stone-700/30 rounded-b-xl -mx-1 -mb-1">
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  <kbd className="w-[18px] h-[18px] flex items-center justify-center bg-white/10 rounded-[4px] shadow-sm border border-white/5 text-white/90 font-sans text-[10px]">↑</kbd>
                  <kbd className="w-[18px] h-[18px] flex items-center justify-center bg-white/10 rounded-[4px] shadow-sm border border-white/5 text-white/90 font-sans text-[10px]">↓</kbd>
                </div>
                <span>to navigate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="w-[18px] h-[18px] flex items-center justify-center bg-white/10 rounded-[4px] shadow-sm border border-white/5 text-white/90 font-sans text-[10px]">↵</kbd>
                <span>to select</span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <kbd className="px-1.5 h-[18px] flex items-center justify-center bg-white/10 rounded-[4px] shadow-sm border border-white/5 text-white/90 font-sans text-[10px]">esc</kbd>
                <span>to close</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
