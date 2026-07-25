import React from 'react';

export type BadgeVariant = 'gray' | 'blue' | 'purple' | 'orange' | 'lime' | 'red' | 'amber' | 'emerald' | 'rose' | 'stone' | 'pink';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The theme variant of the badge. Defaults to 'gray'. */
  variant?: BadgeVariant;
  /** Optional invoice status to automatically resolve the variant. */
  invoiceStatus?: string;
  /** Optional activity action code to automatically resolve the variant. */
  activityAction?: string;
  /** Optional size of the badge. Defaults to 'sm'. */
  size?: 'sm' | 'lg';
}

/**
 * Maps an invoice status to a badge variant.
 */
export function getInvoiceStatusVariant(status: string): BadgeVariant {
  const normalized: string = status.toLowerCase();
  if (normalized.startsWith('sent')) return 'blue';
  if (normalized.startsWith('paid')) return 'lime';
  if (normalized.startsWith('cancelled')) return 'red';
  if (normalized.startsWith('overdue')) return 'amber';
  return 'gray';
}

/**
 * Maps an activity action code to a badge variant.
 */
export function getActivityActionVariant(actionCode: string): BadgeVariant {
  const code: string = actionCode.toLowerCase();
  if (code.includes('created')) return 'blue';
  if (code.includes('updated') || code.includes('toggled')) return 'pink';
  if (code.includes('sent')) return 'orange';
  if (code.includes('status_updated')) return 'lime';
  if (code.includes('deleted') || code.includes('removed')) return 'red';
  return 'gray';
}

/**
 * A reusable badge component for status and action representation.
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  invoiceStatus,
  activityAction,
  size = 'sm',
  className = '',
  ...props
}) => {
  let resolvedVariant: BadgeVariant = 'gray';

  if (variant) {
    resolvedVariant = variant;
  } else if (invoiceStatus !== undefined) {
    resolvedVariant = getInvoiceStatusVariant(invoiceStatus);
  } else if (activityAction !== undefined) {
    resolvedVariant = getActivityActionVariant(activityAction);
  }

  const sizeStyles = size === 'lg' 
    ? 'px-3 py-1 rounded-md text-xs font-medium uppercase'
    : 'px-2 py-0.5 rounded-md text-[10px] font-medium uppercase';

  const baseStyles: string = `inline-flex items-center tracking-wider ${sizeStyles}`;

  const variants: Record<BadgeVariant, string> = {
    gray: 'text-stone-700 bg-stone-100',
    blue: 'text-blue-700 bg-blue-100',
    purple: 'text-purple-700 bg-purple-100',
    orange: 'text-orange-700 bg-orange-100',
    lime: 'text-lime-700 bg-lime-100',
    red: 'text-red-700 bg-red-100',
    amber: 'text-amber-700 bg-amber-100',
    emerald: 'text-emerald-700 bg-emerald-100',
    rose: 'text-rose-700 bg-rose-100',
    stone: 'text-stone-700 bg-stone-100',
    pink: 'text-pink-700 bg-pink-100',
  };

  const combinedClasses: string = `${baseStyles} ${variants[resolvedVariant]} ${className}`.trim();

  return (
    <span className={combinedClasses} {...props}>
      {children}
    </span>
  );
};
