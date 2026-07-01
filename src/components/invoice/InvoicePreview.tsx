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
  const subtotal = form.items.reduce((sum, item) => {
    const qty = item.type === 'labour' ? (item.hours ?? item.quantity ?? 0) : (item.quantity ?? 0);
    return sum + qty * item.unitPrice;
  }, 0);
  const gst = form.gstEnabled ? subtotal * GST_RATE : 0;
  const discount = form.discount ?? 0;
  const grandTotal = subtotal + gst - discount;
  return { subtotal, gst, discount, grandTotal };
}

interface InvoicePreviewProps {
  form: InvoiceFormState;
  client: Client | null;
  settings?: Record<string, string>;
}

/**
 * Invoice document card — renders the A4 invoice as it will appear when exported.
 * Zoom and pan are handled externally by PreviewCanvas.
 */
export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ form, client, settings = {} }) => {
  const totals = computeTotals(form);
  const hasItems = form.items.length > 0;

  // Extract Organisation details
  const orgName = settings['setting_org_name'] || 'Your Business';
  const orgAddress = settings['setting_org_address'] || 'Your address here';
  const orgPhone = settings['setting_org_phone'] || '';
  const orgEmail = settings['setting_org_email'] || '';
  const orgAbn = settings['setting_org_abn'] || '';

  // Extract Payment details
  const bankName = settings['setting_bank_name'] || '';
  const bsb = settings['setting_bsb'] || '';
  const accountNumber = settings['setting_account_number'] || '';
  const paymentInstructions = settings['setting_payment_instructions'] || '';

  return (
    <div id="invoice-preview-card" className="w-[210mm] min-h-[297mm] bg-white rounded-none shadow-22 overflow-hidden flex flex-col p-[10mm] box-border relative a4-page-breaks">

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
              <p className="text-sm font-semibold text-stone-900">{orgName}</p>
              {orgAbn && <p className="text-xs text-stone-500 mt-0.5">ABN: {orgAbn}</p>}
              <p className="text-xs text-stone-500 mt-0.5 whitespace-pre-wrap">{orgAddress}</p>
              {orgPhone && <p className="text-xs text-stone-500 mt-0.5">{orgPhone}</p>}
              {orgEmail && <p className="text-xs text-stone-500 mt-0.5">{orgEmail}</p>}
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
            {form.displayDueDate && (
              <div>
                <p className="text-xs text-stone-400 mb-1">Due date</p>
                <p className="text-sm font-semibold text-stone-900">{formatDate(form.dueDate)}</p>
              </div>
            )}
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
                  <span className="text-xs font-medium text-stone-400 text-center">Hours</span>
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
                      <span className="text-sm text-stone-900 flex flex-col">
                        <span>{item.description || <span className="text-stone-300 italic">No description</span>}</span>
                        {item.date && (
                          <span className="text-[10px] text-stone-400 font-normal mt-0.5">
                            {formatDate(item.date)}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-stone-600 text-center">{item.hours ?? item.quantity}</span>
                      <span className="text-sm text-stone-600 text-right">{formatCurrency(item.unitPrice)}</span>
                      <span className="text-sm font-medium text-stone-900 text-right">
                        {formatCurrency((item.hours ?? item.quantity) * item.unitPrice)}
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
          {/* Payment Details */}
          {(bankName || bsb || accountNumber || paymentInstructions) && (
            <>
              <div className="h-px bg-stone-100" />
              <div className="bg-stone-50 rounded-xl px-4 py-3">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-widest mb-2">Payment Details</p>
                <div className="flex flex-col gap-1 text-xs text-stone-600">
                  {bankName && <p><span className="font-semibold text-stone-700">Bank:</span> {bankName}</p>}
                  {bsb && <p><span className="font-semibold text-stone-700">BSB:</span> {bsb}</p>}
                  {accountNumber && <p><span className="font-semibold text-stone-700">Account No:</span> {accountNumber}</p>}
                  {paymentInstructions && <p className="mt-1.5 italic text-stone-500 whitespace-pre-wrap">{paymentInstructions}</p>}
                </div>
              </div>
            </>
          )}
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
