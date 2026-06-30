import React, { forwardRef, useRef, useEffect, useImperativeHandle } from 'react';

export interface InputProps {
  label?: string;
  icon?: React.ReactNode;
  multiline?: boolean;
  autoGrow?: boolean;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  name?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  rows?: number;
  id?: string;
  autoFocus?: boolean;
  onFocus?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}

/**
 * Reusable Input and Textarea component supporting icons, labels, error states, and auto-growing height.
 */
export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(({
  label,
  icon,
  multiline = false,
  autoGrow = false,
  error,
  value,
  onChange,
  placeholder,
  type = 'text',
  name,
  required,
  className = '',
  disabled,
  rows = 1,
  id,
  ...props
}, ref) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Expose the correct ref element to the parent
  useImperativeHandle(ref, () => {
    if (multiline) {
      return textareaRef.current!;
    }
    return inputRef.current!;
  });

  // Handle auto-growing height for textarea
  useEffect(() => {
    if (multiline && autoGrow && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, multiline, autoGrow]);

  const wrapperClass = `flex flex-col gap-1 w-full ${className}`.trim();
  const inputBaseClass = `w-full px-3 py-2 text-sm text-stone-900 bg-stone-50 border rounded-xl shadow-1 transition-all duration-150 focus:outline-none placeholder-stone-300 disabled:opacity-50 disabled:bg-stone-100/50
    ${error
      ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-400 focus:ring-offset-1'
      : 'border-transparent focus:border-stone-400 focus:ring-2 focus:ring-stone-400 focus:ring-offset-1'
    }
    ${icon ? 'pl-9' : ''}
  `.trim();

  return (
    <div className={wrapperClass}>
      {label && (
        <label htmlFor={id || name} className="text-xs font-medium text-stone-500 tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative w-full">
        {icon && (
          <div className={`absolute left-3 text-stone-400 flex items-center justify-center pointer-events-none
            ${multiline ? 'top-3' : 'top-1/2 -translate-y-1/2'}
          `}>
            {icon}
          </div>
        )}

        {multiline ? (
          <textarea
            ref={textareaRef}
            id={id || name}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={`${inputBaseClass} resize-none min-h-[40px]`}
            required={required}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={inputRef}
            id={id || name}
            name={name}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={inputBaseClass}
            required={required}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
      </div>

      {error && (
        <span className="text-xs text-red-500 mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
