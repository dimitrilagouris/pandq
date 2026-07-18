import React from 'react';

interface HorizontalProgressProps {
  current: number;
  total: number;
  className?: string;
}

const trackStyle: React.CSSProperties = {
  background: '#f2f1ef',
};

const fillStyle: React.CSSProperties = {
  background: '#ff6600',
};

/** Horizontal progress bar with a standard fill. */
export const HorizontalProgress: React.FC<HorizontalProgressProps> = ({ current, total, className = '' }) => {
  const percentage = total > 0 ? Math.min(current / total, 1) * 100 : 0;

  return (
    <div className={`relative w-full h-2 ${className}`}>
      {/* clipped to the pill shape, so the crisp fill never overshoots the track */}
      <div className="absolute inset-0 rounded-full overflow-hidden" style={trackStyle}>
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ ...fillStyle, width: `${percentage}%` }} />
      </div>
    </div>
  );
};