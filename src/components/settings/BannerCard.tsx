import React from 'react';

import { Button, ButtonProps } from '../common/Button.tsx';

export type BannerColor = 'orange' | 'stone';

interface ColorTokens {
  bg: string;
  border: string;
  iconBg: string;
  text: string;
  dotText: string;
}

const colorTokens: Record<BannerColor, ColorTokens> = {
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    iconBg: 'bg-orange-600',
    text: 'text-orange-800',
    dotText: 'text-orange-300',
  },
  stone: {
    bg: 'bg-stone-50',
    border: 'border-stone-200',
    iconBg: 'bg-stone-700',
    text: 'text-stone-800',
    dotText: 'text-stone-300',
  },
};

interface DotGridProps {
  colorClassName: string;
}

// Mask alpha (not hue) controls visibility, so a plain black-to-transparent
// gradient is enough to fade the dots out towards the left.
const DotGrid: React.FC<DotGridProps> = ({ colorClassName }) => {
  const style: React.CSSProperties = {
    backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
    backgroundSize: '14px 14px',
    maskImage: 'linear-gradient(to right, transparent, black 70%)',
    WebkitMaskImage: 'linear-gradient(to right, transparent, black 70%)',
  };
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${colorClassName}`}
      style={style}
    />
  );
};

const DefaultWarningIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.5a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0v-4zM10 13a1 1 0 100 2 1 1 0 000-2z"
    />
  </svg>
);

export interface BannerCardProps {
  message: React.ReactNode;
  color?: BannerColor;
  icon?: React.ReactNode;
  showButton?: boolean;
  buttonLabel?: string;
  buttonProps?: Omit<ButtonProps, 'children'>;
  className?: string;
}

/**
 * Alert-style banner with a dot-grid backdrop that fades in from the left
 * and an optional action button.
 */
export const BannerCard: React.FC<BannerCardProps> = ({
  message,
  color = 'orange',
  icon,
  showButton = false,
  buttonLabel = 'Configure',
  buttonProps,
  className = '',
}) => {
  const tokens = colorTokens[color];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${tokens.bg} ${tokens.border} p-4 ${className}`.trim()}
    >
      <DotGrid colorClassName={tokens.dotText} />
      <div className="relative z-10 flex items-center gap-4">
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white ${tokens.iconBg}`}
        >
          {icon ?? <DefaultWarningIcon className="h-5 w-5" />}
        </span>
        <p className={`flex-1 text-sm font-medium leading-snug ${tokens.text}`}>{message}</p>
        {showButton && (
          // Separate backdrop so the button reads clearly over the dots,
          // regardless of the Button component's own variant background.
          <span className="relative flex-shrink-0">
            <span className={`absolute inset-0 rounded-xl ${tokens.bg}`} aria-hidden="true" />
            <Button variant="outline" size="md" {...buttonProps} className="relative">
              {buttonLabel}
            </Button>
          </span>
        )}
      </div>
    </div>
  );
};