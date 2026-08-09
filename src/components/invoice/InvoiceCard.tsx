import React from 'react';
import { RiCheckLine, RiFlagFill } from 'react-icons/ri';
import { Invoice, InvoiceStatus } from '../../types/models';
import { Badge, BadgeVariant } from '../common/Badge.tsx';
import { formatCurrency, formatDate } from './invoiceActionHelpers';

interface InvoiceCardProps {
  /** The invoice item to render. */
  invoice: Invoice;
  /** List of configured invoice statuses for color matching. */
  invoiceStatuses: InvoiceStatus[];
  /** Application settings object. */
  settings: Record<string, string>;
  /** Whether multi-selection mode is active. */
  isSelectionMode: boolean;
  /** Whether this particular invoice card is selected. */
  isSelected: boolean;
  /** Card click callback. */
  onClick: (e: React.MouseEvent) => void;
  /** Card double-click callback. */
  onDoubleClick?: (e: React.MouseEvent) => void;
  /** Card right-click context menu callback. */
  onContextMenu: (e: React.MouseEvent) => void;
}

/** Derive status badge color variant matching configured invoice statuses. */
function getStatusVariant(statusName: string, invoiceStatuses: InvoiceStatus[]): BadgeVariant {
  const norm = statusName.toLowerCase();
  const found = invoiceStatuses.find((s) => s.name.toLowerCase() === norm);
  return (found?.color as BadgeVariant) || 'gray';
}

/**
 * Single invoice card component rendered in the invoices list column.
 */
export const InvoiceCard: React.FC<InvoiceCardProps> = React.memo(({
  invoice,
  invoiceStatuses,
  settings,
  isSelectionMode,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu,
}): React.JSX.Element => {
  const parts = invoice.status.split('|');
  const status = parts[0] || 'draft';
  const flagColors = (typeof invoice.flags === 'string' ? invoice.flags : '').split(',').filter(Boolean);

  let rawDate = invoice.date;
  if (invoice.updated_at) {
    rawDate = invoice.updated_at.split('T')[0];
  }
  const displayDate = formatDate(rawDate);

  let clientDisplayName = 'No Client';
  if (settings['setting_display_client_name_as'] === 'company' && invoice.client_business_name) {
    clientDisplayName = invoice.client_business_name;
  } else if (invoice.client_name) {
    clientDisplayName = invoice.client_name;
  } else if (invoice.client_business_name) {
    clientDisplayName = invoice.client_business_name;
  }

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={`scroll-animate-card border rounded-2xl p-3 shadow-sm transition-colors flex flex-col justify-between relative group hover:z-50 focus-within:z-50 cursor-pointer hover:border-stone-300 ${
        isSelected
          ? 'z-10 bg-white border-stone-400 ring-2 ring-stone-400 ring-offset-1'
          : 'z-0 bg-stone-50 border-stone-200/60'
      }`}
    >
      {/* Selection Checkbox */}
      <div
        className={`absolute top-3 left-3 z-10 transition-all duration-300 ease-out ${
          isSelectionMode ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-95'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
            isSelected ? 'bg-stone-800 border-stone-800 text-white' : 'border-stone-300 bg-white group-hover:border-stone-400'
          }`}
        >
          {isSelected && <RiCheckLine className="w-3.5 h-3.5" />}
        </div>
      </div>

      <div className={`flex flex-col h-full justify-between transition-all duration-300 ease-out ${isSelectionMode ? 'pl-8' : 'pl-0'}`}>
        {/* Top Row: Client Name, Status, Date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`font-medium text-base truncate max-w-[220px] ${
                invoice.client_name || invoice.client_business_name ? 'text-stone-900' : 'text-stone-400 italic'
              }`}
            >
              {clientDisplayName}
            </span>
            <div className="flex items-center gap-1">
              <Badge variant={getStatusVariant(status, invoiceStatuses)}>
                {status}
              </Badge>
            </div>
          </div>
          <span className="text-xs text-stone-400 whitespace-nowrap">
            {displayDate}
          </span>
        </div>

        {/* Bottom Row: ID, Client Address, Price & Flags */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="font-normal text-stone-600 text-sm leading-none tracking-tight flex-shrink-0">
              {invoice.invoice_number || `#${invoice.id}`}
            </span>
            <span className="text-xs font-normal text-stone-500 truncate max-w-[160px]">
              {invoice.client_address || ''}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {flagColors.length > 0 && (
              <div className="flex items-center gap-0.5 px-1 py-0.5 rounded border border-stone-200 bg-white shadow-sm flex-shrink-0">
                {flagColors.slice(0, 3).map((color: string) => (
                  <RiFlagFill key={color} className={`w-[11px] h-[11px] ${color.replace('bg-', 'text-')}`} />
                ))}
                {flagColors.length > 3 && (
                  <span className="text-[9px] text-stone-400 font-bold leading-none select-none px-0.5 -mt-0.5">
                    ...
                  </span>
                )}
              </div>
            )}
            <span className="font-normal text-stone-600 text-sm leading-none tracking-tight">
              {formatCurrency(invoice.price || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

InvoiceCard.displayName = 'InvoiceCard';
