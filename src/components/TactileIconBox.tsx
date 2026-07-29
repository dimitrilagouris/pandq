import React from 'react';
import { IconType } from 'react-icons';

interface TactileIconBoxProps {
  /** React Icon component or custom React node to display inside the box. */
  icon: IconType | React.ReactNode;
  /** Optional container sizing or positioning style overrides. */
  className?: string;
  /** Optional icon size or color style overrides. */
  iconClassName?: string;
}

/**
 * Reusable rounded icon container featuring a 360-degree inner glow and icon drop shadow.
 */
export const TactileIconBox: React.FC<TactileIconBoxProps> = ({
  icon,
  className = 'w-11 h-11',
  iconClassName = 'w-5 h-5'
}) => {
  /** Renders passed icon element or IconType component with shadow styling. */
  const renderIconNode = (): React.ReactNode => {
    if (React.isValidElement(icon)) {
      const existingClassName = (icon.props as { className?: string }).className || '';
      return React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className: `${iconClassName} tactile-icon-svg ${existingClassName}`.trim()
      });
    }
    if (typeof icon === 'function') {
      const IconComponent = icon as IconType;
      return <IconComponent className={`${iconClassName} tactile-icon-svg`} />;
    }
    return icon;
  };

  return (
    <div className={`tactile-icon-box rounded-2xl flex items-center justify-center flex-shrink-0 ${className}`.trim()}>
      {renderIconNode()}
    </div>
  );
};
