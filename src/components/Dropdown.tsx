import React, { useState, useEffect, useRef } from 'react';
import { TbChevronDown } from 'react-icons/tb';

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
  placeholder
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const alignmentClass = align === 'left' ? 'left-0' : 'right-0';

  const isPlaceholder = variant === 'input' && (!value || value === 'all' || value === '');
  const textClass = isPlaceholder ? 'text-stone-300 font-normal' : 'text-stone-900 font-medium';
  const labelToDisplay = isPlaceholder && placeholder ? placeholder : triggerLabel;

  const baseClass = variant === 'input'
    ? `w-full h-10 px-3 text-left text-sm bg-white border border-transparent rounded-xl shadow-1 transition-all duration-150 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 flex items-center justify-between select-none cursor-pointer ${textClass}`
    : 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg cursor-pointer hover:opacity-85 transition-all select-none border-0';

  return (
    <div className={variant === 'input' ? 'w-full relative' : 'relative inline-block text-left'} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${baseClass} ${triggerClassName}`}
      >
        <span className="truncate">{labelToDisplay}</span>
        {icon !== undefined ? icon : (
          variant === 'input'
            ? <TbChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
            : <TbChevronDown className="w-3 h-3 text-stone-500/80" />
        )}
      </button>

      {isOpen && (
        <div className={`absolute z-50 mt-1 bg-stone-600/95 backdrop-blur-md border border-white/5 rounded-2xl shadow-22 p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150 ${alignmentClass} ${widthClass}`}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSelect(opt.value);
                setIsOpen(false);
              }}
              className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-white hover:bg-white/10 rounded-lg transition-colors capitalize border-0 bg-transparent cursor-pointer"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
