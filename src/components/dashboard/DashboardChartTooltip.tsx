import React from 'react';

interface ChartTooltipPayload {
  monthYear: string;
  Amount: number;
}

interface DashboardChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartTooltipPayload }>;
}

/**
 * Custom tooltip component rendered on hover over the payment history area chart.
 */
export const DashboardChartTooltip: React.FC<DashboardChartTooltipProps> = ({
  active,
  payload,
}): React.ReactElement | null => {
  if (active && payload && payload.length) {
    const data: ChartTooltipPayload = payload[0].payload;
    return (
      <div className="bg-stone-800 border border-stone-700/50 rounded-xl px-3 py-2 shadow-lg flex flex-col gap-0.5 select-none">
        <span className="text-stone-100 text-xs font-regular leading-none">
          {data.monthYear}
        </span>
        <span className="text-white font-mono font-semibold text-sm mt-0.5">
          ${Number(data.Amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    );
  }
  return null;
};
