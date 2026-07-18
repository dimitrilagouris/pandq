import React from 'react';

interface CircularProgressProps {
  current: number;
  total: number;
  className?: string;
}

/** Circular progress ring with a standard solid fill. */
export const CircularProgress: React.FC<CircularProgressProps> = ({ current, total, className = '' }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const percentage = total > 0 ? current / total : 0;
  const dashOffset = circumference - percentage * circumference;

  return (
    <div className={`relative w-24 h-24 flex-shrink-0 flex items-center justify-center ${className}`}>
      <svg className="w-full h-full transform -rotate-90 absolute inset-0" viewBox="0 0 100 100">
        <circle 
          cx="50" 
          cy="50" 
          r={radius} 
          stroke="#f2f1ef" 
          strokeWidth="10" 
          fill="transparent" 
        />

        {percentage > 0 && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#ff6600"
            strokeWidth="10"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out"
          />
        )}
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-stone-700">{current}/{total}</span>
      </div>
    </div>
  );
};