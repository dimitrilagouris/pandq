import React, { useRef, useEffect, useState } from 'react';
import { Invoice } from '../../types';

interface InvoiceStatusFilterPillProps {
  /** Array of invoices used to compute status counts. */
  invoices: Invoice[];
  /** Currently active status filter key. */
  statusFilter: string;
  /** Callback fired when a status pill is selected. */
  onSelectStatus: (status: string) => void;
}

/**
 * Animated status filter navigation bar with a sliding highlight pill.
 */
export const InvoiceStatusFilterPill: React.FC<InvoiceStatusFilterPillProps> = ({
  invoices,
  statusFilter,
  onSelectStatus,
}): React.JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0, opacity: 0 });

  // Dynamic list of statuses for expandable pill navigation
  const statusOptions = ['all'];
  const databaseStatuses = Array.from(
    new Set(
      invoices.map((inv) => inv.status.split('|')[0] || 'draft')
    )
  );

  const standardOrder = ['draft', 'sent', 'paid', 'cancelled'];
  for (const std of standardOrder) {
    statusOptions.push(std);
  }
  for (const custom of databaseStatuses) {
    if (!standardOrder.includes(custom)) {
      statusOptions.push(custom);
    }
  }

  useEffect(() => {
    const activeBtn = buttonRefs.current[statusFilter];
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
  }, [statusFilter, invoices]);

  const getStatusCount = (statusKey: string): number => {
    if (statusKey === 'all') return invoices.length;
    return invoices.filter((inv) => (inv.status.split('|')[0] || 'draft') === statusKey).length;
  };

  return (
    <div
      ref={containerRef}
      className="relative flex bg-stone-200 p-0.5 rounded-xl w-fit shadow-sm text-xs font-medium select-none items-center gap-0.5"
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

      {statusOptions.map((opt) => {
        const isSelected = statusFilter === opt;
        const count = getStatusCount(opt);
        const displayLabel = opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1);

        return (
          <button
            key={opt}
            ref={(el) => { buttonRefs.current[opt] = el; }}
            type="button"
            onClick={() => onSelectStatus(opt)}
            className={`relative z-10 flex items-center px-3 py-1.5 rounded-lg transition-all duration-150 border-0 cursor-pointer text-xs font-medium bg-transparent ${
              isSelected ? 'text-stone-900' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <span>{displayLabel}</span>
            <span
              className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all duration-150 ${
                isSelected ? 'bg-stone-100 text-stone-855' : 'bg-stone-300 text-stone-600'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
