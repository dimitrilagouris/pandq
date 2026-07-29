import React from 'react';
import { Button } from './Button';
import { TactileIconBox } from './TactileIconBox';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText?: string;
  onButtonClick?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  buttonText,
  onButtonClick,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center bg-stone-100 relative overflow-hidden ${className}`}>
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-lg">
        {/* Icon Container */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Concentric Circles Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
            <div className="absolute w-[240px] h-[240px] rounded-full border border-stone-200"></div>
            <div className="absolute w-[360px] h-[360px] rounded-full border border-stone-200"></div>
            <div className="absolute w-[480px] h-[480px] rounded-full border border-stone-200"></div>
            <div className="absolute w-[600px] h-[600px] rounded-full border border-stone-200"></div>
          </div>

          <TactileIconBox
            icon={icon}
            size="lg"
          />
        </div>

        {/* Typography */}
        <h3 className="text-xl font-semibold text-stone-900 mb-2">{title}</h3>
        <p className="text-stone-400 text-[15px] max-w-sm mb-8">
          {description}
        </p>

        {/* Button */}
        {buttonText && onButtonClick && (
          <Button
            variant="secondary"
            onClick={onButtonClick}
            className="px-5 py-2.5"
          >
            {buttonText}
          </Button>
        )}
      </div>
    </div>
  );
}
