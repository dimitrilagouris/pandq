import React from 'react';
import { InvoiceTemplate, TemplateData } from './templateTypes';

const BLUE = '#4281A4';

/** Format a dollar amount with 2 decimal places and a $ prefix. */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Format a date string (YYYY-MM-DD) to a numeric format (DD/MM/YYYY) like the example. */
function formatDate(dateStr: string): string {
  if (!dateStr) {
    return '—';
  }
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}


/**
 * Classic invoice preview — redesigned to match the crisp white/blue corporate layout.
 */
const ClassicPreview: React.FC<TemplateData> = ({ form, totals, client, org, payment }) => {
  return (
    <div id="invoice-preview-card" className="w-[210mm] min-h-[297mm] bg-white rounded-none shadow-22 overflow-hidden flex flex-col p-[15mm] box-border relative a4-page-breaks font-sans text-stone-900">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <h1 className="text-5xl font-light tracking-wide" style={{ color: BLUE }}>TAX INVOICE</h1>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-3 gap-8 mb-12">
        {/* Col 1 */}
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: BLUE }}>Invoice #</h2>
            <p className="text-sm">{form.invoiceNumber}</p>
          </div>
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: BLUE }}>Bill To</h2>
            <p className="text-sm text-stone-800">{client?.business_name || client?.name || 'No client selected'}</p>
            {client && client.name && client.business_name && <p className="text-sm text-stone-600">{client.name}</p>}
            {client?.address && <p className="text-sm text-stone-600 whitespace-pre-wrap">{client.address}</p>}
            {client?.email && <p className="text-sm text-stone-600">{client.email}</p>}
          </div>
        </div>

        {/* Col 2 */}
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: BLUE }}>Date of Issue</h2>
            <p className="text-sm">{formatDate(form.dateIssued)}</p>
          </div>
        </div>

        {/* Col 3 */}
        <div className="flex flex-col gap-8 text-right items-end">
          {form.displayDueDate && (
            <div className="w-full">
              <h2 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: BLUE }}>Due Date</h2>
              <p className="text-sm">{formatDate(form.dueDate)}</p>
            </div>
          )}
          <div className="w-full mt-auto">
            <h2 className="text-xl font-normal uppercase mb-2 text-stone-800 tracking-wide">{org.name}</h2>
            {org.address && <p className="text-sm text-stone-600 whitespace-pre-wrap">{org.address}</p>}
            {org.phone && <p className="text-sm text-stone-600">{org.phone}</p>}
            {org.email && <p className="text-sm text-stone-600">{org.email}</p>}
            {org.abn && <p className="text-sm text-stone-600">ABN {org.abn}</p>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mb-8">
        <div className="grid gap-4 pb-2 border-b-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) 80px 60px 100px', borderColor: BLUE }}>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BLUE }}>Description</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: BLUE }}>Unit Cost</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: BLUE }}>Qty</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: BLUE }}>Amount</span>
        </div>

        {form.items.length > 0 ? form.items.map((item) => {
          const workers = item.workers ?? [];
          const hasMultipleWorkers = item.type === 'labour' && workers.length > 1;

          if (hasMultipleWorkers) {
            const itemTotal = workers.reduce((sum, w) => sum + (w.hours * w.rate), 0);
            return (
              <React.Fragment key={item.id}>
                {/* Parent row — description only */}
                <div className="grid gap-4 py-4 border-b border-stone-300" style={{ gridTemplateColumns: 'minmax(0, 1fr) 80px 60px 100px' }}>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-stone-800 whitespace-pre-wrap break-words">{item.description || 'No description'}</span>
                    {item.date && <span className="text-xs text-stone-400 mt-1">{formatDate(item.date)}</span>}
                  </div>
                  <span className="text-sm text-stone-800 text-center"></span>
                  <span className="text-sm text-stone-800 text-center"></span>
                  <span className="text-sm font-medium text-stone-800 text-right">{formatCurrency(itemTotal)}</span>
                </div>
                {/* Worker sub-rows */}
                {workers.map((w) => (
                  <div key={w.id} className="grid gap-4 py-2 border-b border-stone-200 bg-stone-50/50" style={{ gridTemplateColumns: 'minmax(0, 1fr) 80px 60px 100px' }}>
                    <span className="text-xs text-stone-500 pl-4 min-w-0 break-words">{w.name || (workers.length === 1 ? 'Labour' : 'Worker')}</span>
                    <span className="text-xs text-stone-500 text-center">{formatCurrency(w.rate)}</span>
                    <span className="text-xs text-stone-500 text-center">{w.hours} hrs</span>
                    <span className="text-xs text-stone-500 text-right">{formatCurrency(w.hours * w.rate)}</span>
                  </div>
                ))}
              </React.Fragment>
            );
          }

          const qty = (item.type === 'labour' && workers.length === 1)
            ? workers[0].hours
            : item.hours ?? item.quantity ?? 0;
          const rate = (item.type === 'labour' && workers.length === 1)
            ? workers[0].rate
            : item.unitPrice;
          return (
            <div key={item.id} className="grid gap-4 py-4 border-b border-stone-300" style={{ gridTemplateColumns: 'minmax(0, 1fr) 80px 60px 100px' }}>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-stone-800 whitespace-pre-wrap break-words">{item.description || 'No description'}</span>
                {item.date && <span className="text-xs text-stone-400 mt-1">{formatDate(item.date)}</span>}
              </div>
              <span className="text-sm text-stone-800 text-center">{formatCurrency(rate)}</span>
              <span className="text-sm text-stone-800 text-center">{qty}</span>
              <span className="text-sm text-stone-800 text-right">{formatCurrency(qty * rate)}</span>
            </div>
          );
        }) : (
          <p className="text-sm text-stone-400 italic py-8 text-center">No items added yet</p>
        )}
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-12">
        <div className="flex gap-12 w-[60%]">
          {/* Left side of totals */}
          <div className="flex flex-col justify-end">
            <p className="text-xs font-bold text-stone-600 uppercase tracking-widest mb-1">Grand Total</p>
            <p className="text-4xl font-light" style={{ color: BLUE }}>{formatCurrency(totals.grandTotal)}</p>
          </div>
          {/* Right side of totals */}
          <div className="flex flex-col gap-2 flex-1 text-sm font-bold text-stone-800">
            <div className="flex justify-between">
              <span>SUBTOTAL</span>
              <span className="font-normal">{formatCurrency(totals.subtotal)}</span>
            </div>
            {form.discount > 0 && (
              <div className="flex justify-between">
                <span>{form.discountType === 'percentage' ? `${form.discountDescription ? form.discountDescription.toUpperCase() : 'DISCOUNT'} (${form.discount}%)` : (form.discountDescription ? form.discountDescription.toUpperCase() : 'DISCOUNT')}</span>
                <span className="font-normal" style={{ color: BLUE }}>-{formatCurrency(totals.discount)}</span>
              </div>
            )}
            {form.gstEnabled && (
              <div className="flex justify-between">
                <span>GST (10%)</span>
                <span className="font-normal">{formatCurrency(totals.gst)}</span>
              </div>
            )}
            <div className="flex justify-between mt-2 pt-2">
              <span>TOTAL</span>
              <span className="font-normal">{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Area (Terms, Payment, Logo) */}
      <div className="mt-auto grid grid-cols-2 gap-12 items-end">
        <div className="flex flex-col gap-8">
          {form.notes.trim() && (
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: BLUE }}>Terms & Conditions</h2>
              <p className="text-xs text-stone-800 whitespace-pre-wrap">{form.notes}</p>
            </div>
          )}
          {(payment.bankName || payment.bsb || payment.accountNumber || payment.instructions) && (
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: BLUE }}>Payment Instructions</h2>
              <div className="text-xs text-stone-800">
                {payment.bankName && <p>{payment.bankName}</p>}
                {payment.accountNumber && <p>Acc.No. {payment.accountNumber}</p>}
                {payment.bsb && <p>BSB {payment.bsb}</p>}
                {payment.instructions && <p className="mt-2 text-stone-600 italic whitespace-pre-wrap">{payment.instructions}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end text-right gap-4">
          <div>
            <p className="text-sm font-medium tracking-wide text-stone-800">THANK YOU FOR YOUR BUSINESS!</p>
            {org.email && (
              <p className="text-xs mt-2 underline" style={{ color: BLUE }}>{org.email}</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

/* ── HTML builder for PDF/email export ── */

function classicBuildHtml(data: TemplateData): string {
  const { form, totals, client, org, payment } = data;

  const clientDisplay = client ? (client.business_name || client.name || 'No client selected') : 'No client selected';

  const itemsHtml = form.items.map(item => {
    const workers = item.workers ?? [];
    const hasMultipleWorkers = item.type === 'labour' && workers.length > 1;

    if (hasMultipleWorkers) {
      const itemTotal = workers.reduce((sum, w) => sum + (w.hours * w.rate), 0);
      const workerRows = workers.map(w => `
        <div style="display: grid; grid-template-columns: minmax(0, 1fr) 80px 60px 100px; gap: 16px; padding: 8px 0; border-bottom: 1px solid #e7e5e4; background: rgba(250,250,249,0.5);">
          <span style="font-size: 12px; color: #78716c; padding-left: 16px; word-break: break-word; overflow-wrap: break-word;">${w.name || (workers.length === 1 ? 'Labour' : 'Worker')}</span>
          <span style="font-size: 12px; color: #78716c; text-align: center;">${formatCurrency(w.rate)}</span>
          <span style="font-size: 12px; color: #78716c; text-align: center;">${w.hours} hrs</span>
          <span style="font-size: 12px; color: #78716c; text-align: right;">${formatCurrency(w.hours * w.rate)}</span>
        </div>
      `).join('');
      return `
        <div style="display: grid; grid-template-columns: minmax(0, 1fr) 80px 60px 100px; gap: 16px; padding: 16px 0; border-bottom: 1px solid #d6d3d1;">
          <div style="display: flex; flex-direction: column; min-width: 0;">
            <span style="font-size: 14px; font-weight: 500; color: #292524; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word;">${item.description || 'No description'}</span>
            ${item.date ? `<span style="font-size: 12px; color: #a8a29e; margin-top: 4px;">${formatDate(item.date)}</span>` : ''}
          </div>
          <span style="font-size: 14px; color: #292524; text-align: center;"></span>
          <span style="font-size: 14px; color: #292524; text-align: center;"></span>
          <span style="font-size: 14px; font-weight: 500; color: #292524; text-align: right;">${formatCurrency(itemTotal)}</span>
        </div>
        ${workerRows}
      `;
    }

    const qty = (item.type === 'labour' && workers.length === 1) ? workers[0].hours : (item.hours ?? item.quantity ?? 0);
    const rate = (item.type === 'labour' && workers.length === 1) ? workers[0].rate : item.unitPrice;
    return `
      <div style="display: grid; grid-template-columns: minmax(0, 1fr) 80px 60px 100px; gap: 16px; padding: 16px 0; border-bottom: 1px solid #d6d3d1;">
        <div style="display: flex; flex-direction: column; min-width: 0;">
          <span style="font-size: 14px; font-weight: 500; color: #292524; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word;">${item.description || 'No description'}</span>
          ${item.date ? `<span style="font-size: 12px; color: #a8a29e; margin-top: 4px;">${formatDate(item.date)}</span>` : ''}
        </div>
        <span style="font-size: 14px; color: #292524; text-align: center;">${formatCurrency(rate)}</span>
        <span style="font-size: 14px; color: #292524; text-align: center;">${qty}</span>
        <span style="font-size: 14px; color: #292524; text-align: right;">${formatCurrency(qty * rate)}</span>
      </div>
    `;
  }).join('');

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
      color: #1c1917;
    }
    .card {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
      display: flex;
      flex-direction: column;
    }
  </style>
</head>
<body>
  <div class="card">
    
    <!-- Top Header -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 48px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <h1 style="font-size: 48px; font-weight: 300; letter-spacing: 0.05em; color: ${BLUE}; margin-left: 8px;">TAX INVOICE</h1>
      </div>
    </div>

    <!-- Info Grid -->
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; margin-bottom: 48px;">
      <!-- Col 1 -->
      <div style="display: flex; flex-direction: column; gap: 32px;">
        <div>
          <h2 style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; color: ${BLUE};">Invoice #</h2>
          <p style="font-size: 14px;">${form.invoiceNumber}</p>
        </div>
        <div>
          <h2 style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; color: ${BLUE};">Bill To</h2>
          <p style="font-size: 14px; color: #292524;">${clientDisplay}</p>
          ${client && client.name && client.business_name ? `<p style="font-size: 14px; color: #57534e;">${client.name}</p>` : ''}
          ${client?.address ? `<p style="font-size: 14px; color: #57534e; white-space: pre-wrap;">${client.address}</p>` : ''}
          ${client?.email ? `<p style="font-size: 14px; color: #57534e;">${client.email}</p>` : ''}
        </div>
      </div>

      <!-- Col 2 -->
      <div style="display: flex; flex-direction: column; gap: 32px;">
        <div>
          <h2 style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; color: ${BLUE};">Date of Issue</h2>
          <p style="font-size: 14px;">${formatDate(form.dateIssued)}</p>
        </div>
      </div>

      <!-- Col 3 -->
      <div style="display: flex; flex-direction: column; gap: 32px; text-align: right; align-items: flex-end;">
        ${form.displayDueDate ? `
        <div style="width: 100%;">
          <h2 style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; color: ${BLUE};">Due Date</h2>
          <p style="font-size: 14px;">${formatDate(form.dueDate)}</p>
        </div>
        ` : ''}
        <div style="width: 100%; margin-top: auto;">
          <h2 style="font-size: 20px; font-weight: 400; text-transform: uppercase; margin-bottom: 8px; color: #292524; letter-spacing: 0.05em;">${org.name}</h2>
          ${org.address ? `<p style="font-size: 14px; color: #57534e; white-space: pre-wrap;">${org.address}</p>` : ''}
          ${org.phone ? `<p style="font-size: 14px; color: #57534e;">${org.phone}</p>` : ''}
          ${org.email ? `<p style="font-size: 14px; color: #57534e;">${org.email}</p>` : ''}
          ${org.abn ? `<p style="font-size: 14px; color: #57534e;">ABN ${org.abn}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- Table -->
    <div style="margin-bottom: 32px;">
      <div style="display: grid; grid-template-columns: minmax(0, 1fr) 80px 60px 100px; gap: 16px; padding-bottom: 8px; border-bottom: 2px solid ${BLUE};">
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: ${BLUE};">Description</span>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; text-align: center; color: ${BLUE};">Unit Cost</span>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; text-align: center; color: ${BLUE};">Qty</span>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; text-align: right; color: ${BLUE};">Amount</span>
      </div>
      ${itemsHtml || '<p style="font-size: 14px; color: #a8a29e; font-style: italic; padding: 32px 0; text-align: center;">No items added yet</p>'}
    </div>

    <!-- Totals Section -->
    <div style="display: flex; justify-content: flex-end; margin-bottom: 48px;">
      <div style="display: flex; gap: 48px; width: 60%;">
        <!-- Left side -->
        <div style="display: flex; flex-direction: column; justify-content: flex-end;">
          <p style="font-size: 12px; font-weight: 700; color: #57534e; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Grand Total</p>
          <p style="font-size: 36px; font-weight: 300; color: ${BLUE}; margin: 0;">${formatCurrency(totals.grandTotal)}</p>
        </div>
        <!-- Right side -->
        <div style="display: flex; flex-direction: column; gap: 8px; flex: 1; font-size: 14px; font-weight: 700; color: #292524;">
          <div style="display: flex; justify-content: space-between;">
            <span>SUBTOTAL</span>
            <span style="font-weight: 400;">${formatCurrency(totals.subtotal)}</span>
          </div>
          ${form.discount > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>${form.discountType === 'percentage' ? `${form.discountDescription ? form.discountDescription.toUpperCase() : 'DISCOUNT'} (${form.discount}%)` : (form.discountDescription ? form.discountDescription.toUpperCase() : 'DISCOUNT')}</span>
            <span style="font-weight: 400; color: ${BLUE};">-${formatCurrency(totals.discount)}</span>
          </div>` : ''}
          ${form.gstEnabled ? `
          <div style="display: flex; justify-content: space-between;">
            <span>GST (10%)</span>
            <span style="font-weight: 400;">${formatCurrency(totals.gst)}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px;">
            <span>TOTAL</span>
            <span style="font-weight: 400;">${formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Area -->
    <div style="margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: flex-end;">
      <div style="display: flex; flex-direction: column; gap: 32px;">
        ${form.notes.trim() ? `
        <div>
          <h2 style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; color: ${BLUE};">Terms & Conditions</h2>
          <p style="font-size: 12px; color: #292524; white-space: pre-wrap;">${form.notes}</p>
        </div>` : ''}
        ${(payment.bankName || payment.bsb || payment.accountNumber || payment.instructions) ? `
        <div>
          <h2 style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; color: ${BLUE};">Payment Instructions</h2>
          <div style="font-size: 12px; color: #292524;">
            ${payment.bankName ? `<p>${payment.bankName}</p>` : ''}
            ${payment.accountNumber ? `<p>Acc.No. ${payment.accountNumber}</p>` : ''}
            ${payment.bsb ? `<p>BSB ${payment.bsb}</p>` : ''}
            ${payment.instructions ? `<p style="margin-top: 8px; color: #57534e; font-style: italic; white-space: pre-wrap;">${payment.instructions}</p>` : ''}
          </div>
        </div>` : ''}
      </div>

      <div style="display: flex; flex-direction: column; align-items: flex-end; text-align: right; gap: 16px;">
        <div>
          <p style="font-size: 14px; font-weight: 500; letter-spacing: 0.05em; color: #292524;">THANK YOU FOR YOUR BUSINESS!</p>
          ${org.email ? `<p style="font-size: 12px; margin-top: 8px; text-decoration: underline; color: ${BLUE};">${org.email}</p>` : ''}
        </div>
      </div>
    </div>

  </div>
</body>
</html>`;
}

/** Classic invoice template — crisp corporate blue/white design. */
export const classicTemplate: InvoiceTemplate = {
  id: 'classic',
  name: 'Classic',
  description: 'Crisp corporate layout with blue accents',
  Preview: ClassicPreview,
  buildHtml: classicBuildHtml,
};
