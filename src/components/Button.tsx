import React, { ButtonHTMLAttributes } from 'react';

import '/shadows.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none rounded-xl';
  
  const variants = {
    primary: 'bg-stone-800 text-stone-50 hover:bg-stone-950 shadow-1 transition-all',
    secondary: 'bg-stone-200 text-stone-900 hover:bg-stone-300 shadow-1',
    outline: 'border border-stone-200 bg-transparent hover:bg-stone-100 text-stone-900 shadow-sm',
    ghost: 'bg-transparent hover:bg-stone-100 text-stone-900',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-1'
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2.5'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  const combinedClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`.trim();

  return (
    <button ref={ref} className={combinedClasses} {...props}>
      {leftIcon && <span className="flex-shrink-0 flex items-center justify-center">{leftIcon}</span>}
      {children && <span>{children}</span>}
      {rightIcon && <span className="flex-shrink-0 flex items-center justify-center">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';
