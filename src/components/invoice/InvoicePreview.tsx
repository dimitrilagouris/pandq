import React from 'react';
import { Client } from '../../types';
import { InvoiceFormState, InvoiceTotals } from './invoiceTypes';

const GST_RATE = 0.1;

/** Format a dollar amount with 2 decimal places and a $ prefix. */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Format a date string (YYYY-MM-DD) to a human-readable format. */
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Derive invoice totals from form state. */
export function computeTotals(form: InvoiceFormState): InvoiceTotals {
  const subtotal = form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const gst = form.gstEnabled ? subtotal * GST_RATE : 0;
  const discount = form.discount ?? 0;
  const grandTotal = subtotal + gst - discount;
  return { subtotal, gst, discount, grandTotal };
}

interface InvoicePreviewProps {
  form: InvoiceFormState;
  client: Client | null;
}

/**
 * Right-panel live preview — renders the invoice document as it will appear when exported.
 */
export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ form, client }) => {
  const totals = computeTotals(form);
  const hasItems = form.items.length > 0;

  return (
    <div className="h-full flex flex-col items-center py-8 px-6 overflow-y-auto">
      {/* Document card */}
      <div id="invoice-preview-card" className="w-full max-w-[620px] bg-white rounded-2xl shadow-22 overflow-hidden flex flex-col">

        {/* Document header band */}
        <div className="bg-stone-900 px-8 py-7 flex items-start justify-between">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">Invoice</p>
            <h1 className="text-2xl font-semibold text-white">
              {form.invoiceNumber || 'INV-001'}
            </h1>
          </div>
          {/* Logo placeholder — a tasteful brand mark */}
          <div className="w-12 h-12 rounded-xl bg-stone-700 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-0.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-stone-300" />
              <div className="w-2.5 h-2.5 rounded-sm bg-stone-400" />
              <div className="w-2.5 h-2.5 rounded-sm bg-stone-500" />
              <div className="w-2.5 h-2.5 rounded-sm bg-stone-300" />
            </div>
          </div>
        </div>

        <div className="px-8 py-6 flex flex-col gap-6">

          {/* Billed By / Billed To */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-stone-400 mb-1.5">Billed by</p>
              <p className="text-sm font-semibold text-stone-900">Your Business</p>
              <p className="text-xs text-stone-500 mt-0.5">Your address here</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 mb-1.5">Billed to</p>
              {client ? (
                <>
                  <p className="text-sm font-semibold text-stone-900">
                    {client.business_name || client.name}
                  </p>
                  {client.name && client.business_name && (
                    <p className="text-xs text-stone-500 mt-0.5">{client.name}</p>
                  )}
                  {client.address && (
                    <p className="text-xs text-stone-500">{client.address}</p>
                  )}
                  {client.email && (
                    <p className="text-xs text-stone-500">{client.email}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-stone-300 italic">No client selected</p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-stone-100" />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-stone-400 mb-1">Date issued</p>
              <p className="text-sm font-semibold text-stone-900">{formatDate(form.dateIssued)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 mb-1">Due date</p>
              <p className="text-sm font-semibold text-stone-900">{formatDate(form.dueDate)}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-stone-100" />

          {/* Line items table */}
          <div className="flex flex-col gap-6">
            {/* Labour Table */}
            {form.items.some(item => item.type === 'labour') && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Labour</p>
                <div className="grid gap-2 pb-1.5 border-b border-stone-100" style={{ gridTemplateColumns: '1fr 64px 88px 80px' }}>
                  <span className="text-xs font-medium text-stone-400">Description</span>
                  <span className="text-xs font-medium text-stone-400 text-center">Qty</span>
                  <span className="text-xs font-medium text-stone-400 text-right">Rate</span>
                  <span className="text-xs font-medium text-stone-400 text-right">Total</span>
                </div>
                {form.items
                  .filter(item => item.type === 'labour')
                  .map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-2 py-2 border-b border-stone-50"
                      style={{ gridTemplateColumns: '1fr 64px 88px 80px' }}
                    >
                      <span className="text-sm text-stone-900">{item.description || <span className="text-stone-300 italic">No description</span>}</span>
                      <span className="text-sm text-stone-600 text-center">{item.quantity}</span>
                      <span className="text-sm text-stone-600 text-right">{formatCurrency(item.unitPrice)}</span>
                      <span className="text-sm font-medium text-stone-900 text-right">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* Materials Table */}
            {form.items.some(item => item.type === 'materials') && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Materials</p>
                <div className="grid gap-2 pb-1.5 border-b border-stone-100" style={{ gridTemplateColumns: '1fr 64px 88px 80px' }}>
                  <span className="text-xs font-medium text-stone-400">Description</span>
                  <span className="text-xs font-medium text-stone-400 text-center">Qty</span>
                  <span className="text-xs font-medium text-stone-400 text-right">Cost</span>
                  <span className="text-xs font-medium text-stone-400 text-right">Total</span>
                </div>
                {form.items
                  .filter(item => item.type === 'materials')
                  .map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-2 py-2 border-b border-stone-50"
                      style={{ gridTemplateColumns: '1fr 64px 88px 80px' }}
                    >
                      <span className="text-sm text-stone-900">{item.description || <span className="text-stone-300 italic">No description</span>}</span>
                      <span className="text-sm text-stone-600 text-center">{item.quantity}</span>
                      <span className="text-sm text-stone-600 text-right">{formatCurrency(item.unitPrice)}</span>
                      <span className="text-sm font-medium text-stone-900 text-right">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {!hasItems && (
              <p className="text-sm text-stone-300 italic py-4 text-center">No items added yet</p>
            )}
          </div>

          {/* Totals */}
          <div className="flex flex-col gap-1.5 ml-auto w-64">
            <TotalRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
            {form.gstEnabled && (
              <TotalRow label="GST (10%)" value={formatCurrency(totals.gst)} />
            )}
            {totals.discount > 0 && (
              <TotalRow label="Discount" value={`−${formatCurrency(totals.discount)}`} />
            )}
            <div className="h-px bg-stone-200 my-1" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-900">Grand total</span>
              <span className="text-base font-bold text-stone-900">{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>

          {/* Notes */}
          {form.notes.trim() && (
            <>
              <div className="h-px bg-stone-100" />
              <div className="bg-stone-50 rounded-xl px-4 py-3">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-widest mb-2">Notes</p>
                <p className="text-xs text-stone-600 whitespace-pre-wrap">{form.notes}</p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

/** Simple label + value row for the totals block. */
const TotalRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-stone-500">{label}</span>
    <span className="text-sm text-stone-900">{value}</span>
  </div>
);
