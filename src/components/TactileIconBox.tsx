import React from 'react';
import { IconType } from 'react-icons';

export type IconBoxSize = 'sm' | 'md' | 'lg';

interface TactileIconBoxProps {
  /** React Icon component or custom React node to display inside the inner tile. */
  icon: IconType | React.ReactNode;
  /** Size variant controlling outer container and inner tile dimensions. Defaults to 'md'. */
  size?: IconBoxSize;
  /** Optional custom outer container className overrides. */
  className?: string;
  /** Optional custom icon className overrides. */
  iconClassName?: string;
}

interface SizeStyles {
  outer: string;
  inner: string;
  icon: string;
}

const SIZE_MAP: Record<IconBoxSize, SizeStyles> = {
  sm: { outer: 'w-10 h-10 rounded-xl', inner: 'w-7 h-7 rounded-lg', icon: 'w-4 h-4' },
  md: { outer: 'w-11 h-11 rounded-2xl', inner: 'w-8 h-8 rounded-xl', icon: 'w-4 h-4' },
  lg: { outer: 'w-14 h-14 rounded-2xl', inner: 'w-11 h-11 rounded-xl', icon: 'w-6 h-6' },
};

/**
 * Reusable two-square icon container with stone outer box and floating white inner tile.
 */
export const TactileIconBox: React.FC<TactileIconBoxProps> = ({
  icon,
  size = 'md',
  className = '',
  iconClassName = '',
}) => {
  const currentSize: SizeStyles = SIZE_MAP[size];

  /** Renders passed icon element or IconType component. */
  const renderIconNode = (): React.ReactNode => {
    const defaultIconClass: string = `${currentSize.icon} ${iconClassName}`.trim();

    if (React.isValidElement(icon)) {
      const existingClassName: string = (icon.props as { className?: string }).className || '';
      return React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className: `${defaultIconClass} ${existingClassName}`.trim(),
      });
    }
    if (typeof icon === 'function') {
      const IconComponent: IconType = icon as IconType;
      return <IconComponent className={defaultIconClass} />;
    }
    return icon;
  };

  return (
    <div
      className={`bg-stone-200/80 flex items-center justify-center flex-shrink-0 ${currentSize.outer} ${className}`.trim()}
    >
      <div
        className={`bg-white shadow-1 flex items-center justify-center text-stone-800 ${currentSize.inner}`.trim()}
      >
        {renderIconNode()}
      </div>
    </div>
  );
};
