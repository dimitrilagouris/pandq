import React from 'react';
import { InvoiceTemplate, TemplateData } from './templateTypes';

/** Format a dollar amount with 2 decimal places and a $ prefix. */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Format a date string (YYYY-MM-DD) to a human-readable format. */
function formatDate(dateStr: string): string {
  if (!dateStr) {
    return '—';
  }
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Minimal invoice preview — clean, borderless design with a thin accent stripe.
 */
const MinimalPreview: React.FC<TemplateData> = ({ form, totals, client, org, payment }) => {
  const hasItems = form.items.length > 0;

  return (
    <div id="invoice-preview-card" className="w-[210mm] min-h-[297mm] bg-white rounded-none shadow-22 overflow-hidden flex flex-col box-border relative a4-page-breaks">

      {/* Thin accent stripe at the very top */}
      <div className="h-1 bg-stone-300 w-full" />

      <div className="px-10 py-8 flex flex-col gap-7 flex-1">

        {/* Top row: Invoice number + dates on left, org info on right */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Invoice</p>
            <h1 className="text-xl font-bold text-stone-900 tracking-tight">
              {form.invoiceNumber || 'INV-001'}
            </h1>
            <div className="flex gap-6 mt-3">
              <div>
                <p className="text-[10px] text-stone-400 uppercase tracking-wider">Issued</p>
                <p className="text-xs font-medium text-stone-800 mt-0.5">{formatDate(form.dateIssued)}</p>
              </div>
              {form.displayDueDate && (
                <div>
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider">Due</p>
                  <p className="text-xs font-medium text-stone-800 mt-0.5">{formatDate(form.dueDate)}</p>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-stone-900">{org.name}</p>
            {org.abn && <p className="text-[10px] text-stone-400 mt-0.5">ABN {org.abn}</p>}
            <p className="text-[10px] text-stone-500 mt-1 whitespace-pre-wrap">{org.address}</p>
            {org.phone && <p className="text-[10px] text-stone-500">{org.phone}</p>}
            {org.email && <p className="text-[10px] text-stone-500">{org.email}</p>}
          </div>
        </div>

        {/* Client block */}
        <div className="bg-stone-50 rounded-lg px-4 py-3">
          <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">Bill to</p>
          {client ? (
            <>
              <p className="text-sm font-semibold text-stone-900">{client.business_name || client.name}</p>
              {client.name && client.business_name && (
                <p className="text-xs text-stone-500 mt-0.5">{client.name}</p>
              )}
              {client.address && <p className="text-xs text-stone-500">{client.address}</p>}
              {client.email && <p className="text-xs text-stone-500">{client.email}</p>}
            </>
          ) : (
            <p className="text-sm text-stone-300 italic">No client selected</p>
          )}
        </div>

        {/* Line items — unified table */}
        <div className="flex flex-col">
          {/* Table header */}
          <div
            className="grid gap-2 pb-2 border-b-2 border-stone-200"
            style={{ gridTemplateColumns: '1fr 60px 80px 80px' }}
          >
            <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Description</span>
            <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-center">Qty</span>
            <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right">Rate</span>
            <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right">Amount</span>
          </div>

          {form.items.map((item) => {
            const workers = item.workers ?? [];
            const hasMultipleWorkers = item.type === 'labour' && workers.length > 1;

            if (hasMultipleWorkers) {
              const itemTotal = workers.reduce((sum, w) => sum + (w.hours * w.rate), 0);
              return (
                <React.Fragment key={item.id}>
                  <div
                    className="grid gap-2 py-2.5 border-b border-stone-100"
                    style={{ gridTemplateColumns: '1fr 60px 80px 80px' }}
                  >
                    <span className="text-sm text-stone-800 flex flex-col">
                      <span>{item.description || <span className="text-stone-300 italic">No description</span>}</span>
                      {item.date && (
                        <span className="text-[10px] text-stone-400 mt-0.5">{formatDate(item.date)}</span>
                      )}
                      <span className="text-[10px] text-stone-400 capitalize">{item.type}</span>
                    </span>
                    <span className="text-sm text-stone-600 text-center"></span>
                    <span className="text-sm text-stone-600 text-right"></span>
                    <span className="text-sm font-medium text-stone-900 text-right">{formatCurrency(itemTotal)}</span>
                  </div>
                  {workers.map((w) => (
                    <div
                      key={w.id}
                      className="grid gap-2 py-1.5 border-b border-stone-50 bg-stone-50/50"
                      style={{ gridTemplateColumns: '1fr 60px 80px 80px' }}
                    >
                      <span className="text-xs text-stone-500 pl-3">{w.name || 'Worker'}</span>
                      <span className="text-xs text-stone-500 text-center">{w.hours} hrs</span>
                      <span className="text-xs text-stone-500 text-right">{formatCurrency(w.rate)}</span>
                      <span className="text-xs text-stone-500 text-right">{formatCurrency(w.hours * w.rate)}</span>
                    </div>
                  ))}
                </React.Fragment>
              );
            }

            const qty = (item.type === 'labour' && workers.length === 1)
              ? workers[0].hours
              : item.type === 'labour' ? (item.hours ?? item.quantity ?? 0) : (item.quantity ?? 0);
            const rate = (item.type === 'labour' && workers.length === 1)
              ? workers[0].rate
              : item.unitPrice;
            return (
              <div
                key={item.id}
                className="grid gap-2 py-2.5 border-b border-stone-100"
                style={{ gridTemplateColumns: '1fr 60px 80px 80px' }}
              >
                <span className="text-sm text-stone-800 flex flex-col">
                  <span>{item.description || <span className="text-stone-300 italic">No description</span>}</span>
                  {item.date && (
                    <span className="text-[10px] text-stone-400 mt-0.5">{formatDate(item.date)}</span>
                  )}
                  <span className="text-[10px] text-stone-400 capitalize">{item.type}</span>
                </span>
                <span className="text-sm text-stone-600 text-center">{qty}</span>
                <span className="text-sm text-stone-600 text-right">{formatCurrency(rate)}</span>
                <span className="text-sm font-medium text-stone-900 text-right">{formatCurrency(qty * rate)}</span>
              </div>
            );
          })}

          {!hasItems && (
            <p className="text-sm text-stone-300 italic py-6 text-center">No items added yet</p>
          )}
        </div>

        {/* Totals */}
        <div className="flex flex-col gap-1 ml-auto w-56">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Subtotal</span>
            <span className="text-stone-900">{formatCurrency(totals.subtotal)}</span>
          </div>
          {form.gstEnabled && (
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">GST (10%)</span>
              <span className="text-stone-900">{formatCurrency(totals.gst)}</span>
            </div>
          )}
          {form.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">{form.discountType === 'percentage' ? `Discount (${form.discount}%)` : 'Discount'}</span>
              <span className="text-stone-900">−{formatCurrency(totals.discount)}</span>
            </div>
          )}
          <div className="h-px bg-stone-300 my-1.5" />
          <div className="flex justify-between">
            <span className="text-sm font-bold text-stone-900">Total</span>
            <span className="text-lg font-bold text-stone-900">{formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>

        {/* Notes */}
        {form.notes.trim() && (
          <div className="border-t border-stone-100 pt-4">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Notes</p>
            <p className="text-xs text-stone-600 whitespace-pre-wrap leading-relaxed">{form.notes}</p>
          </div>
        )}

        {/* Payment Details */}
        {(payment.bankName || payment.bsb || payment.accountNumber || payment.instructions) && (
          <div className="border-t border-stone-100 pt-4">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Payment Details</p>
            <div className="flex flex-col gap-0.5 text-xs text-stone-600">
              {payment.bankName && <p><span className="font-semibold text-stone-700">Bank:</span> {payment.bankName}</p>}
              {payment.bsb && <p><span className="font-semibold text-stone-700">BSB:</span> {payment.bsb}</p>}
              {payment.accountNumber && <p><span className="font-semibold text-stone-700">Account:</span> {payment.accountNumber}</p>}
              {payment.instructions && <p className="mt-1 italic text-stone-500 whitespace-pre-wrap">{payment.instructions}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── HTML builder for PDF/email export ── */

/** Build a self-contained HTML document for the minimal template. */
function minimalBuildHtml(data: TemplateData): string {
  const { form, totals, client, org, payment } = data;

  const clientDisplay = client ? (client.business_name || client.name || 'No client') : 'No client';
  const clientNameLine = client && client.business_name && client.name
    ? `<p style="font-size: 11px; color: #78716c; margin-top: 2px;">${client.name}</p>` : '';
  const clientAddressLine = client?.address
    ? `<p style="font-size: 11px; color: #78716c;">${client.address}</p>` : '';
  const clientEmailLine = client?.email
    ? `<p style="font-size: 11px; color: #78716c;">${client.email}</p>` : '';

  const itemRows = form.items.map(item => {
    const workers = item.workers ?? [];
    const hasMultipleWorkers = item.type === 'labour' && workers.length > 1;

    if (hasMultipleWorkers) {
      const itemTotal = workers.reduce((sum, w) => sum + (w.hours * w.rate), 0);
      const workerRows = workers.map(w => `
      <div style="display: grid; grid-template-columns: 1fr 60px 80px 80px; gap: 8px; padding: 6px 0; border-bottom: 1px solid #fafaf9; background: rgba(250,250,249,0.5);">
        <span style="font-size: 12px; color: #78716c; padding-left: 12px;">${w.name || 'Worker'}</span>
        <span style="font-size: 12px; color: #78716c; text-align: center;">${w.hours} hrs</span>
        <span style="font-size: 12px; color: #78716c; text-align: right;">${formatCurrency(w.rate)}</span>
        <span style="font-size: 12px; color: #78716c; text-align: right;">${formatCurrency(w.hours * w.rate)}</span>
      </div>`).join('');
      return `
      <div style="display: grid; grid-template-columns: 1fr 60px 80px 80px; gap: 8px; padding: 10px 0; border-bottom: 1px solid #f5f5f4;">
        <span style="font-size: 14px; color: #292524;">
          ${item.description || 'No description'}
          ${item.date ? `<span style="font-size: 10px; color: #a8a29e; margin-top: 2px; display: block;">${formatDate(item.date)}</span>` : ''}
          <span style="font-size: 10px; color: #a8a29e; text-transform: capitalize; display: block;">${item.type}</span>
        </span>
        <span style="font-size: 14px; color: #57534e; text-align: center;"></span>
        <span style="font-size: 14px; color: #57534e; text-align: right;"></span>
        <span style="font-size: 14px; font-weight: 500; color: #1c1917; text-align: right;">${formatCurrency(itemTotal)}</span>
      </div>
      ${workerRows}`;
    }

    const qty = (item.type === 'labour' && workers.length === 1)
      ? workers[0].hours
      : item.type === 'labour' ? (item.hours ?? item.quantity ?? 0) : (item.quantity ?? 0);
    const rate = (item.type === 'labour' && workers.length === 1)
      ? workers[0].rate
      : item.unitPrice;
    const dateLine = item.date
      ? `<span style="font-size: 10px; color: #a8a29e; margin-top: 2px; display: block;">${formatDate(item.date)}</span>`
      : '';
    return `
    <div style="display: grid; grid-template-columns: 1fr 60px 80px 80px; gap: 8px; padding: 10px 0; border-bottom: 1px solid #f5f5f4;">
      <span style="font-size: 14px; color: #292524;">
        ${item.description || 'No description'}
        ${dateLine}
        <span style="font-size: 10px; color: #a8a29e; text-transform: capitalize; display: block;">${item.type}</span>
      </span>
      <span style="font-size: 14px; color: #57534e; text-align: center;">${qty}</span>
      <span style="font-size: 14px; color: #57534e; text-align: right;">${formatCurrency(rate)}</span>
      <span style="font-size: 14px; font-weight: 500; color: #1c1917; text-align: right;">${formatCurrency(qty * rate)}</span>
    </div>`;
  }).join('');

  const gstRow = form.gstEnabled ? `
    <div style="display: flex; justify-content: space-between; font-size: 14px;">
      <span style="color: #78716c;">GST (10%)</span>
      <span style="color: #1c1917;">${formatCurrency(totals.gst)}</span>
    </div>` : '';

  const discountRow = form.discount > 0 ? `
    <div style="display: flex; justify-content: space-between; font-size: 14px;">
      <span style="color: #78716c;">${form.discountType === 'percentage' ? `Discount (${form.discount}%)` : 'Discount'}</span>
      <span style="color: #1c1917;">−${formatCurrency(totals.discount)}</span>
    </div>` : '';

  const notesBlock = form.notes.trim() ? `
    <div style="border-top: 1px solid #f5f5f4; padding-top: 16px;">
      <p style="font-size: 10px; font-weight: 600; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Notes</p>
      <p style="font-size: 11px; color: #57534e; white-space: pre-wrap; line-height: 1.6;">${form.notes}</p>
    </div>` : '';

  const paymentBlock = (payment.bankName || payment.bsb || payment.accountNumber || payment.instructions) ? `
    <div style="border-top: 1px solid #f5f5f4; padding-top: 16px;">
      <p style="font-size: 10px; font-weight: 600; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Payment Details</p>
      <div style="display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: #57534e;">
        ${payment.bankName ? `<p><span style="font-weight: 600; color: #44403c;">Bank:</span> ${payment.bankName}</p>` : ''}
        ${payment.bsb ? `<p><span style="font-weight: 600; color: #44403c;">BSB:</span> ${payment.bsb}</p>` : ''}
        ${payment.accountNumber ? `<p><span style="font-weight: 600; color: #44403c;">Account:</span> ${payment.accountNumber}</p>` : ''}
        ${payment.instructions ? `<p style="margin-top: 4px; font-style: italic; color: #78716c; white-space: pre-wrap;">${payment.instructions}</p>` : ''}
      </div>
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${form.invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .card {
      width: 210mm;
      min-height: 297mm;
    }
  </style>
</head>
<body>
  <div class="card">
    <!-- Accent stripe -->
    <div style="height: 4px; background: #d6d3d1; width: 100%;"></div>

    <div style="padding: 32px 40px; display: flex; flex-direction: column; gap: 28px;">
      <!-- Top row -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <p style="font-size: 10px; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Invoice</p>
          <h1 style="font-size: 20px; font-weight: 700; color: #1c1917; letter-spacing: -0.01em;">${form.invoiceNumber}</h1>
          <div style="display: flex; gap: 24px; margin-top: 12px;">
            <div>
              <p style="font-size: 10px; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.05em;">Issued</p>
              <p style="font-size: 11px; font-weight: 500; color: #292524; margin-top: 2px;">${formatDate(form.dateIssued)}</p>
            </div>
            ${form.displayDueDate ? `
            <div>
              <p style="font-size: 10px; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.05em;">Due</p>
              <p style="font-size: 11px; font-weight: 500; color: #292524; margin-top: 2px;">${formatDate(form.dueDate)}</p>
            </div>` : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 14px; font-weight: 600; color: #1c1917;">${org.name}</p>
          ${org.abn ? `<p style="font-size: 10px; color: #a8a29e; margin-top: 2px;">ABN ${org.abn}</p>` : ''}
          <p style="font-size: 10px; color: #78716c; margin-top: 4px; white-space: pre-wrap;">${org.address}</p>
          ${org.phone ? `<p style="font-size: 10px; color: #78716c;">${org.phone}</p>` : ''}
          ${org.email ? `<p style="font-size: 10px; color: #78716c;">${org.email}</p>` : ''}
        </div>
      </div>

      <!-- Client block -->
      <div style="background: #fafaf9; border-radius: 8px; padding: 12px 16px;">
        <p style="font-size: 10px; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Bill to</p>
        <p style="font-size: 14px; font-weight: 600; color: #1c1917;">${clientDisplay}</p>
        ${clientNameLine}
        ${clientAddressLine}
        ${clientEmailLine}
      </div>

      <!-- Line items table -->
      <div>
        <div style="display: grid; grid-template-columns: 1fr 60px 80px 80px; gap: 8px; padding-bottom: 8px; border-bottom: 2px solid #e7e5e4;">
          <span style="font-size: 10px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.05em;">Description</span>
          <span style="font-size: 10px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">Qty</span>
          <span style="font-size: 10px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">Rate</span>
          <span style="font-size: 10px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">Amount</span>
        </div>
        ${itemRows}
      </div>

      <!-- Totals -->
      <div style="margin-left: auto; width: 224px; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; justify-content: space-between; font-size: 14px;">
          <span style="color: #78716c;">Subtotal</span>
          <span style="color: #1c1917;">${formatCurrency(totals.subtotal)}</span>
        </div>
        ${gstRow}
        ${discountRow}
        <div style="height: 1px; background: #d6d3d1; margin: 6px 0;"></div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-size: 14px; font-weight: 700; color: #1c1917;">Total</span>
          <span style="font-size: 18px; font-weight: 700; color: #1c1917;">${formatCurrency(totals.grandTotal)}</span>
        </div>
      </div>

      ${notesBlock}
      ${paymentBlock}
    </div>
  </div>
</body>
</html>`;
}

/** Minimal invoice template — clean, borderless design with a thin accent stripe. */
export const minimalTemplate: InvoiceTemplate = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Clean, light design with no header band',
  Preview: MinimalPreview,
  buildHtml: minimalBuildHtml,
};
