import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RiCalendarLine, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';

interface DatePickerProps {
  label?: React.ReactNode;
  value: string; // Format: YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
  variant?: 'default' | 'inline';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Custom DatePicker component that matches the app's premium design aesthetics.
 * Uses a custom overlay calendar instead of the browser's default calendar popup.
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  required = false,
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left });
    }
    setIsOpen(!isOpen);
  };

  // Parse YYYY-MM-DD safely into year, month, date components in local time
  const parseDateString = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date();
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  };

  const selectedDate = parseDateString(value);

  // Calendar view state (which month and year is currently displayed in the picker)
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  // Sync view state with value changes when modal opens
  useEffect(() => {
    if (isOpen) {
      const current = parseDateString(value);
      setViewYear(current.getFullYear());
      setViewMonth(current.getMonth());
    }
  }, [isOpen, value]);

  // Click outside listener to close calendar popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        (!popupRef.current || !popupRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on scroll or resize when open (since it is fixed positioned)
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => setIsOpen(false);
    const handleResize = () => setIsOpen(false);

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Format a JS Date object as YYYY-MM-DD in local time
  const formatDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Format for text input display: e.g. "30 June 2026"
  const formatDisplayString = (dateStr: string) => {
    if (!dateStr) return '';
    const date = parseDateString(dateStr);
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Calendar math
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const nextDate = new Date(viewYear, viewMonth, day);
    onChange(formatDateString(nextDate));
    setIsOpen(false);
  };

  // Detect keyboard Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Generate day grid cells
  const dayCells = [];
  // Empty slots for preceding month days
  for (let i = 0; i < firstDayIndex; i++) {
    dayCells.push(<div key={`empty-${i}`} className="h-8 w-8" />);
  }
  // Days of the current month
  for (let day = 1; day <= daysInMonth; day++) {
    const isSelected = selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear;

    const today = new Date();
    const isToday = today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear;

    dayCells.push(
      <button
        key={`day-${day}`}
        type="button"
        onClick={() => handleSelectDay(day)}
        className={`h-8 w-8 text-xs font-medium rounded-xl flex items-center justify-center transition-all duration-100
          ${isSelected
            ? 'bg-stone-900 text-stone-50 shadow-1 hover:bg-stone-950'
            : 'text-stone-700 hover:bg-stone-200/60'
          }
          ${isToday && !isSelected ? 'border border-stone-300' : ''}
        `}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full relative" ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="text-xs font-medium text-stone-500 tracking-wide select-none">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative w-full">
        {(() => {
          const isPlaceholder = !value;
          const textClass = isPlaceholder ? 'text-stone-300 font-regular' : 'text-stone-900 font-regular';
          
          if (variant === 'inline') {
            return (
              <button
                ref={buttonRef}
                type="button"
                onClick={handleOpen}
                className={`bg-transparent outline-none cursor-pointer flex items-center justify-start ${isPlaceholder ? 'text-stone-400 font-medium' : 'text-stone-600 font-medium'}`}
              >
                <span>{value ? formatDisplayString(value) : 'Select date'}</span>
              </button>
            );
          }

          return (
            <button
              ref={buttonRef}
              type="button"
              onClick={handleOpen}
              className={`w-full h-10 px-3 text-left text-sm bg-white border border-transparent rounded-xl shadow-1 transition-all duration-150 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 flex items-center justify-between cursor-pointer ${textClass}`}
            >
              <span>{formatDisplayString(value) || 'Select date…'}</span>
              <RiCalendarLine className="w-4 h-4 text-stone-400 flex-shrink-0" />
            </button>
          );
        })()}

        {isOpen && createPortal(
          <div
            ref={popupRef}
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-[9999] w-64 bg-stone-100 border border-stone-200/80 rounded-2xl shadow-22 p-4 animate-in fade-in slide-in-from-top-2 duration-150 select-none"
          >
            {/* Header controls */}
            <div className="flex items-center justify-between mb-3.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"
              >
                <RiArrowLeftSLine className="w-4 h-4" />
              </button>

              <span className="text-xs font-semibold text-stone-800">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"
              >
                <RiArrowRightSLine className="w-4 h-4" />
              </button>
            </div>

            {/* Weekdays header */}
            <div className="grid grid-cols-7 gap-y-1.5 text-center mb-1">
              {WEEKDAYS.map((day) => (
                <span key={day} className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  {day}
                </span>
              ))}
            </div>

            {/* Grid of days */}
            <div className="grid grid-cols-7 gap-y-1 gap-x-1 justify-items-center">
              {dayCells}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};
