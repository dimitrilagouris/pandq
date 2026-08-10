import React, { useRef, useEffect, useState } from 'react';
import { Invoice } from '../../types/models';

export interface FilterPillOption<T extends string = string> {
  key: T;
  label: string;
  count?: number;
}

export interface InvoiceStatusFilterPillProps<T extends string = string> {
  /** Array of invoices used to compute status counts. */
  invoices?: Invoice[];
  /** Currently active status filter key when using invoices. */
  statusFilter?: T;
  /** Callback fired when a status pill is selected when using invoices. */
  onSelectStatus?: (status: T) => void;
  /** Explicit options array for generic usage (e.g. Dashboard timeframe, Drawer tabs). */
  options?: FilterPillOption<T>[];
  /** Currently active value for generic usage. */
  value?: T;
  /** Callback fired when a pill is selected for generic usage. */
  onChange?: (value: T) => void;
  /** Whether the pill container spans full width with equal tab sizes. */
  fullWidth?: boolean;
}

/**
 * Animated status filter navigation bar with a sliding highlight pill.
 * Supports both automatic invoice status counting and explicit custom options.
 */
export function InvoiceStatusFilterPill<T extends string = string>({
  invoices,
  statusFilter,
  onSelectStatus,
  options,
  value,
  onChange,
  fullWidth = false,
}: InvoiceStatusFilterPillProps<T>): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const activeValue = value ?? statusFilter ?? ('all' as T);

  const handleSelect = (selectedKey: T): void => {
    if (onChange) {
      onChange(selectedKey);
    } else if (onSelectStatus) {
      onSelectStatus(selectedKey);
    }
  };

  // Derive resolved options list
  let resolvedOptions: FilterPillOption<T>[] = [];
  if (options) {
    resolvedOptions = options;
  } else if (invoices) {
    const statusKeys: string[] = ['all'];
    const databaseStatuses = Array.from(
      new Set(
        invoices.map((inv) => inv.status.split('|')[0] || 'draft')
      )
    );

    const standardOrder = ['draft', 'sent', 'paid', 'cancelled'];
    for (const std of standardOrder) {
      statusKeys.push(std);
    }
    for (const custom of databaseStatuses) {
      if (!standardOrder.includes(custom)) {
        statusKeys.push(custom);
      }
    }

    resolvedOptions = statusKeys.map((optKey) => {
      let count = invoices.length;
      if (optKey !== 'all') {
        count = invoices.filter((inv) => (inv.status.split('|')[0] || 'draft') === optKey).length;
      }

      let label = 'All';
      if (optKey !== 'all') {
        label = optKey.charAt(0).toUpperCase() + optKey.slice(1);
      }

      return {
        key: optKey as T,
        label,
        count,
      };
    });
  }

  useEffect(() => {
    const activeBtn = buttonRefs.current[activeValue];
    const container = containerRef.current;
    if (activeBtn && container) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      setSliderStyle({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
        opacity: 1,
      });
    }
  }, [activeValue, invoices, options]);

  return (
    <div
      ref={containerRef}
      className={`relative flex bg-stone-200 p-0.5 rounded-xl text-xs font-medium select-none items-center gap-0.5 ${
        fullWidth ? 'w-full' : 'w-fit'
      } shadow-sm`}
    >
      {/* Sliding background highlight */}
      <div
        style={{
          transform: `translateX(${sliderStyle.left}px)`,
          width: `${sliderStyle.width}px`,
          opacity: sliderStyle.opacity,
        }}
        className="absolute top-0.5 bottom-0.5 left-0 bg-white rounded-lg shadow-1 transition-all duration-300 ease-out pointer-events-none"
      />

      {resolvedOptions.map((opt) => {
        const isSelected = activeValue === opt.key;

        return (
          <button
            key={opt.key}
            ref={(el) => { buttonRefs.current[opt.key] = el; }}
            type="button"
            onClick={() => handleSelect(opt.key)}
            className={`relative z-10 flex items-center justify-center px-3 py-1.5 rounded-lg transition-all duration-150 border-0 cursor-pointer text-xs font-medium bg-transparent ${
              fullWidth ? 'flex-1' : ''
            } ${
              isSelected ? 'text-stone-900 font-semibold' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all duration-150 ${
                  isSelected ? 'bg-stone-100 text-stone-855' : 'bg-stone-300 text-stone-600'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

