import React from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';

interface CollapsibleSectionProps {
  /** Title string or node to display in the section header. */
  title: React.ReactNode;
  /** Whether the section body is expanded. */
  isOpen: boolean;
  /** Callback triggered when clicking the header to expand/collapse. */
  onToggle: () => void;
  /** Optional action elements to render next to the section title. */
  headerActions?: React.ReactNode;
  /** Content inside the collapsible body. */
  children: React.ReactNode;
}

/**
 * Animated collapsible section container.
 * Features a smooth height expand/collapse slide transition and arrow icon animation.
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  isOpen,
  onToggle,
  headerActions,
  children,
}): React.JSX.Element => {
  return (
    <div className="flex flex-col">
      <div
        className="flex items-center justify-between group cursor-pointer outline-none w-full select-none py-1"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          {typeof title === 'string' ? (
            <h2 className="text-base text-black font-medium select-none">{title}</h2>
          ) : (
            title
          )}
          {headerActions}
        </div>
        <RiArrowDownSLine
          className={`w-5 h-5 text-stone-400 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      <div className={`accordion-grid ${isOpen ? 'is-open' : ''}`}>
        <div className="accordion-inner">
          <div className="pt-4 flex flex-col gap-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
