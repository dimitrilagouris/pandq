import React from 'react';

export interface StatusMetric {
  id: string;
  label: string;
  /** Hex colour for the dot. */
  colorHex: string;
  /** Tailwind color name for the gradient (e.g., 'blue', 'lime') */
  colorName: string;
  value: number;
  count: number;
  percentage: number;
}

interface StatusDistributionCardProps {
  metrics: StatusMetric[];
  className?: string;
}

const gradientMap: Record<string, string> = {
  stone: 'bg-gradient-to-t from-stone-500 to-stone-400',
  gray: 'bg-gradient-to-t from-stone-500 to-stone-400',
  blue: 'bg-gradient-to-t from-blue-500 to-blue-400',
  lime: 'bg-gradient-to-t from-lime-500 to-lime-400',
  amber: 'bg-gradient-to-t from-amber-500 to-amber-400',
  rose: 'bg-gradient-to-t from-rose-500 to-rose-400',
  emerald: 'bg-gradient-to-t from-emerald-500 to-emerald-400',
  red: 'bg-gradient-to-t from-red-500 to-red-400',
  purple: 'bg-gradient-to-t from-purple-500 to-purple-400',
  orange: 'bg-gradient-to-t from-orange-500 to-orange-400',
  yellow: 'bg-gradient-to-t from-amber-500 to-amber-400',
};

/**
 * Renders an invoice status distribution card matching the "Market Leaders" reference design.
 * Features a segmented horizontal bar inside a grey track with percentage labels above,
 * followed by a per-status breakdown list.
 */
export const StatusDistributionCard: React.FC<StatusDistributionCardProps> = ({ metrics, className = '' }) => {
  const activeMetrics = metrics.filter(m => m.percentage > 0);

  return (
    <div className={`bg-stone-50 border border-stone-200 rounded-2xl p-5 shadow-sm flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base text-black font-medium">Invoice Statuses</h2>
      </div>

      {/* Chart area */}
      <div className="relative mb-1">
        {activeMetrics.length > 0 ? (
          <div className="flex w-full" style={{ gap: '0px' }}>
            {activeMetrics.map((m, i) => (
              <div
                key={m.id}
                style={{ width: `${m.percentage}%` }}
                className="flex flex-col gap-1 relative pl-0.5 pr-0.5 min-w-0"
              >
                {/* Left accent border */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-stone-200" />

                {/* Percentage label */}
                <span className="text-stone-600 text-xs font-semibold whitespace-nowrap pl-2.5">
                  {m.percentage.toFixed(1)}%
                </span>

                {/* Segmented bar inside a grey track */}
                <div className="h-7 bg-stone-100 rounded-lg overflow-hidden">
                  <div
                    style={{
                      width: '100%',
                      opacity: 1 - (i * 0.2),
                    }}
                    className={`h-full rounded-md ${gradientMap[m.colorName] || 'bg-gradient-to-t from-stone-500 to-stone-400'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-7 rounded-lg bg-stone-100 flex items-center justify-center">
            <span className="text-[10px] text-stone-400">No invoices yet</span>
          </div>
        )}
      </div>

      {/* Per-status list */}
      <div className="flex flex-col gap-1.5 mt-3 overflow-y-auto">
        {metrics.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-0.5 text-sm">
            {/* Status label with rounded-sm pill */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-3 h-3 rounded-[4px] flex-shrink-0"
                style={{ backgroundColor: m.colorHex }}
              />
              <span className="font-regular text-stone-700 truncate">
                {m.label.replace(' Invoices', '')}
              </span>
            </div>
            {/* Count right */}
            <span className="font-mono font-medium text-base text-stone-950 flex-shrink-0">
              {m.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
