import React from 'react';

interface DashboardCardProps {
  /** Icon displayed in the header bar alongside the label. */
  icon: React.ReactNode;
  /** Uppercase label shown in the stone-coloured header strip. */
  label: string;
  /** Primary monetary value displayed large. */
  value: string;
  /** Percentage change string (e.g. "+18.6%"). Omit to hide. */
  changePercent?: string;
  /** Whether the change is positive. Controls green vs red colouring. */
  changePositive?: boolean;
  /** Descriptive footer line beneath the value. */
  description?: string;
  /** Optional action icon rendered on the right side of the header. */
  headerAction?: React.ReactNode;
}

/**
 * KPI card matching the two-tier design: a stone-coloured header strip
 * with icon + label, sitting above a white card body with value and metadata.
 */
export const DashboardCard: React.FC<DashboardCardProps> = ({
  icon,
  label,
  value,
  changePercent,
  changePositive = true,
  description,
  headerAction,
}) => {
  return (
    <div className="rounded-2xl bg-stone-200 overflow-hidden shadow-1 flex flex-col h-full">
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-stone-400">{icon}</span>
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            {label}
          </span>
        </div>
        {headerAction && (
          <span className="text-stone-400">{headerAction}</span>
        )}
      </div>

      {/* White card body */}
      <div className="bg-stone-50 rounded-2xl px-5 py-4 flex flex-col gap-1 flex-1">
        <div className="flex items-baseline gap-3 mt-1">
          <span className="text-2xl font-bold text-stone-900 tracking-tight">
            {value}
          </span>
          {changePercent && (
            <span
              className={`text-sm font-semibold ${
                changePercent === '—'
                  ? 'text-stone-300'
                  : changePositive
                  ? 'text-lime-500'
                  : 'text-red-500'
              }`}
            >
              {changePercent}
            </span>
          )}
        </div>

        {description && (
          <span className="text-sm text-stone-500 mt-1">{description}</span>
        )}
      </div>
    </div>
  );
};
