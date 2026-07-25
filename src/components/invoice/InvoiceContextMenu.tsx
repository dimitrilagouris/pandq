import React from 'react';
import {
  RiDeleteBinLine,
  RiMailSendLine,
  RiHistoryLine,
  RiEdit2Line,
  RiCheckboxCircleLine,
  RiFilePdfLine,
  RiFileList3Line,
  RiFlagFill,
  RiFlagLine,
} from 'react-icons/ri';
import { Invoice, Flag } from '../../types';
import { DropdownFooter } from '../Dropdown';

export interface ContextMenuState {
  x: number;
  y: number;
  invoice: Invoice;
}

interface InvoiceContextMenuProps {
  /** Active context menu position and target invoice data. */
  contextMenu: ContextMenuState;
  /** Available flag options. */
  flags: Flag[];
  /** Callback to close the menu. */
  onClose: () => void;
  /** View summary callback. */
  onViewSummary: (inv: Invoice) => void;
  /** View history callback. */
  onViewHistory: (inv: Invoice) => void;
  /** Edit invoice callback. */
  onEdit: (inv: Invoice) => void;
  /** Delete invoice callback. */
  onDelete: (inv: Invoice) => void;
  /** Send single invoice email callback. */
  onSend: (inv: Invoice) => void;
  /** Export PDF callback. */
  onSavePdf: (inv: Invoice) => void;
  /** Mark as paid status callback. */
  onMarkPaid: (inv: Invoice) => void;
  /** Flag toggle callback. */
  onToggleFlag: (inv: Invoice, flagId: number) => void;
}

/**
 * Right-click context menu overlay for invoice list items.
 */
export const InvoiceContextMenu: React.FC<InvoiceContextMenuProps> = ({
  contextMenu,
  flags,
  onClose,
  onViewSummary,
  onViewHistory,
  onEdit,
  onDelete,
  onSend,
  onSavePdf,
  onMarkPaid,
  onToggleFlag,
}): React.JSX.Element => {
  const inv = contextMenu.invoice;
  const ctxStatus = inv.status.split('|')[0] || 'draft';

  const ctxOptions = [
    { value: 'summary', label: 'View Summary', icon: <RiFileList3Line className="w-4 h-4" /> },
    { value: 'history', label: 'View History', icon: <RiHistoryLine className="w-4 h-4" /> },
    { value: 'edit', label: 'Edit', icon: <RiEdit2Line className="w-4 h-4" /> },
    { value: 'flags_row', isFlagsRow: true, divider: true },
    { value: 'send', label: 'Send', icon: <RiMailSendLine className="w-4 h-4" />, divider: true },
    { value: 'save_pdf', label: 'Save as PDF', icon: <RiFilePdfLine className="w-4 h-4" /> },
    ...(ctxStatus !== 'paid'
      ? [{ value: 'mark_paid', label: 'Mark as Paid', icon: <RiCheckboxCircleLine className="w-4 h-4" />, divider: true }]
      : []),
    { value: 'delete', label: 'Delete', icon: <RiDeleteBinLine className="w-4 h-4" />, danger: true, divider: ctxStatus === 'paid' },
  ];

  const ctxFooter: DropdownFooter | undefined = inv.updated_at
    ? (() => {
        const d = new Date(inv.updated_at!.includes('T') ? inv.updated_at! : inv.updated_at! + 'Z');
        const today = new Date();
        const isToday = d.toDateString() === today.toDateString();
        const dateLabel = isToday ? 'Today' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeLabel = d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
        return { label: 'Last edited', sublabel: `${dateLabel} at ${timeLabel}` };
      })()
    : undefined;

  const handleAction = (val: string) => {
    onClose();
    if (val === 'summary') onViewSummary(inv);
    if (val === 'history') onViewHistory(inv);
    if (val === 'edit') onEdit(inv);
    if (val === 'delete') onDelete(inv);
    if (val === 'send') onSend(inv);
    if (val === 'save_pdf') onSavePdf(inv);
    if (val === 'mark_paid') onMarkPaid(inv);
  };

  const menuWidth = 208;
  const menuHeight = 330;
  const menuLeft = contextMenu.x + menuWidth > window.innerWidth ? Math.max(0, contextMenu.x - menuWidth) : contextMenu.x;
  const menuTop = contextMenu.y + menuHeight > window.innerHeight ? Math.max(0, contextMenu.y - menuHeight) : contextMenu.y;

  return (
    <div
      className="fixed inset-0 z-[200]"
      onMouseDown={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="fixed z-[201] bg-stone-700/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-22 py-1.5 flex flex-col w-52 animate-in fade-in zoom-in-95 duration-100"
        style={{ left: menuLeft, top: menuTop }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col overflow-y-auto max-h-96">
          {ctxOptions.map((opt, i) => (
            <React.Fragment key={opt.value + i}>
              {opt.divider && <div className="border-t border-white/[0.08] my-1 mx-2" />}

              {opt.isFlagsRow ? (
                <div className="flex items-center justify-between px-3 py-1 mb-1">
                  {flags.map((flag) => {
                    const invoiceFlags = (typeof inv.flags === 'string' ? inv.flags : '').split(',');
                    const isSet = invoiceFlags.includes(flag.color);
                    return (
                      <button
                        key={flag.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleFlag(inv, flag.id);
                          onClose();
                        }}
                        className="p-1 hover:bg-white/10 rounded-md transition-colors border-0 bg-transparent cursor-pointer"
                        title={flag.color.replace('bg-', '').replace('-500', '')}
                      >
                        {isSet ? (
                          <RiFlagFill className={`w-4 h-4 ${flag.color.replace('bg-', 'text-')}`} />
                        ) : (
                          <RiFlagLine className={`w-4 h-4 ${flag.color.replace('bg-', 'text-')} opacity-40 hover:opacity-80`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAction(opt.value)}
                  className={`flex items-center gap-3 px-3 py-2 text-left text-[13px] font-medium rounded-lg transition-colors border-0 cursor-pointer ${
                    opt.danger
                      ? 'text-red-400 bg-transparent hover:bg-red-500/15'
                      : 'text-stone-300 bg-transparent hover:bg-white/10'
                  }`}
                >
                  <span className="flex-shrink-0 opacity-80">{opt.icon}</span>
                  <span className="truncate">{opt.label}</span>
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {ctxFooter && (
          <div className="border-t border-white/[0.08] mt-1 mx-2 pt-2 pb-1 px-1">
            <p className="text-[11.5px] text-stone-300 leading-none">{ctxFooter.label}</p>
            {ctxFooter.sublabel && (
              <p className="text-[11.5px] text-stone-400 leading-none mt-0.5">{ctxFooter.sublabel}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
