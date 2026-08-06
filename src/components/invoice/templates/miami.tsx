import React from 'react';
import { InvoiceTemplate, TemplateData } from './templateTypes';

const TERRACOTTA = '#C05638';

/** Format currency with $ and 2 decimal places. */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Format ISO date (YYYY-MM-DD) to MM.DD.YYYY. */
function formatDateDots(dateStr: string): string {
  if (!dateStr) {
    return '—';
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[1]}.${parts[2]}.${parts[0]}`;
  }
  return dateStr;
}

/** Format a date string (YYYY-MM-DD) to human readable format. */
function formatDateReadable(dateStr: string): string {
  if (!dateStr) {
    return '';
  }
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Miami invoice preview — elegant editorial serif template with dotted leader sub-rows.
 */
const MiamiPreview: React.FC<TemplateData> = ({ form, totals, client, org, payment }) => {
  const hasItems = form.items.length > 0;
  const labourItems = form.items.filter(i => i.type === 'labour');
  const materialsItems = form.items.filter(i => i.type === 'materials');
  const footerParts = [org.name, org.address, org.phone, org.email, org.abn ? `ABN ${org.abn}` : ''].filter(Boolean);

  return (
    <div
      id="invoice-preview-card"
      className="w-[210mm] min-h-[297mm] bg-white rounded-none shadow-22 overflow-hidden flex flex-col p-[15mm] box-border relative a4-page-breaks text-stone-900 leading-normal"
      style={{ fontFamily: "'EB Garamond', Garamond, 'Georgia', serif" }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Luxurious+Script&display=swap');
      `}} />

      {/* Top Header Row */}
      <div className="flex justify-between items-start mb-6">
        <span className="text-xs font-bold text-stone-900 uppercase tracking-widest">TAX INVOICE</span>
      </div>

      {/* Title & Centered Metadata */}
      <div className="flex flex-col items-center text-center mb-10">
        <h1 className="text-6xl font-normal tracking-wide text-stone-900 max-w-xl leading-tight py-1 select-none" style={{ fontFamily: "'Luxurious Script', cursive" }}>
          {org.name}
        </h1>

        <div className="mt-5 grid grid-cols-[auto_auto] gap-x-5 gap-y-1 text-sm text-stone-900 text-left">
          <span className="font-semibold">Invoice number:</span>
          <span className="text-right font-normal">{form.invoiceNumber || '1001'}</span>
          <span className="font-semibold">Invoice date:</span>
          <span className="text-right font-normal">{formatDateDots(form.dateIssued)}</span>
          {form.displayDueDate && (
            <>
              <span className="font-semibold">Due date:</span>
              <span className="text-right font-normal">{formatDateDots(form.dueDate)}</span>
            </>
          )}
          {org.abn && (
            <>
              <span className="font-semibold">ABN:</span>
              <span className="text-right font-normal">{org.abn}</span>
            </>
          )}
        </div>
      </div>

      {/* Side-by-side Addresses */}
      <div className="grid grid-cols-2 gap-12 mb-12 text-sm">
        {/* Client (Left) */}
        <div className="flex flex-col gap-1 text-stone-900">
          <span className="font-semibold text-base">{client?.business_name || client?.name || 'Client Name'}</span>
          {client?.business_name && client?.name && <span>{client.name}</span>}
          {client?.address && <span className="whitespace-pre-wrap">{client.address}</span>}
          {client?.email && <span>{client.email}</span>}
        </div>

        {/* Sender / Org (Right aligned) */}
        <div className="flex flex-col gap-1 text-right text-stone-900">
          <span className="font-semibold text-base">{org.name}</span>
          {org.address && <span className="whitespace-pre-wrap">{org.address}</span>}
          {org.phone && <span>{org.phone}</span>}
          {org.email && <span>{org.email}</span>}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mb-10 flex flex-col gap-8">
        {/* Labour Section */}
        {labourItems.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-stone-900 uppercase tracking-widest border-b border-stone-900 pb-1">Labour</span>
            {labourItems.map((item) => {
              const workers = item.workers ?? [];
              const hasWorkers = workers.length > 0;
              const dateText = formatDateReadable(item.date || '');

              return (
                <div key={item.id} className="flex flex-col gap-1 py-1">
                  {dateText && <span className="text-xs text-stone-400 font-normal">{dateText}</span>}
                  <span className="font-semibold text-sm text-stone-900 whitespace-pre-wrap break-words">{item.description || 'Labour Task'}</span>

                  {/* Worker sub-rows with dotted leaders */}
                  <div className="flex flex-col gap-1 pl-4">
                    {hasWorkers ? (
                      workers.map((w) => (
                        <div key={w.id} className="flex items-baseline text-sm text-stone-800">
                          <span className="font-medium">{w.name || (workers.length === 1 ? 'Labour' : 'Worker')}</span>
                          <span className="text-stone-500 ml-1.5">&mdash; {w.hours} hrs</span>
                          <div className="flex-1 border-b border-dotted border-stone-300 mx-3 self-center opacity-60" />
                          <span className="font-semibold text-stone-900">{formatCurrency(w.hours * w.rate)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-baseline text-sm text-stone-800">
                        <span className="font-medium">Labour</span>
                        <span className="text-stone-500 ml-1.5">&mdash; {item.hours ?? 0} hrs</span>
                        <div className="flex-1 border-b border-dotted border-stone-300 mx-3 self-center opacity-60" />
                        <span className="font-semibold text-stone-900">{formatCurrency((item.hours ?? 0) * item.unitPrice)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Materials Section */}
        {materialsItems.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-stone-900 uppercase tracking-widest border-b border-stone-900 pb-1">Materials</span>
            {materialsItems.map((item) => (
              <div key={item.id} className="flex items-baseline text-sm py-1">
                <span className="font-semibold text-sm text-stone-900 whitespace-pre-wrap break-words">
                  {item.description || 'Material Item'}
                  {item.quantity > 0 && <span className="font-normal text-stone-500 ml-1.5">({item.quantity}x)</span>}
                </span>
                <div className="flex-1 border-b border-dotted border-stone-300 mx-3 self-center opacity-60" />
                <span className="font-semibold text-stone-900">{formatCurrency((item.quantity || 1) * item.unitPrice)}</span>
              </div>
            ))}
          </div>
        )}

        {!hasItems && (
          <p className="text-base text-stone-400 italic py-8 text-center">No items added yet</p>
        )}
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-12">
        <div className="grid grid-cols-[auto_auto] gap-x-10 gap-y-1.5 text-sm text-stone-900 text-right">
          <span className="font-semibold">Subtotal:</span>
          <span>{formatCurrency(totals.subtotal)}</span>
          {form.gstEnabled && (
            <>
              <span className="font-semibold">Tax:</span>
              <span>{formatCurrency(totals.gst)}</span>
            </>
          )}
          {form.discount > 0 && (
            <>
              <span className="font-semibold">{form.discountType === 'percentage' ? `Discount (${form.discount}%):` : 'Discount:'}</span>
              <span className="text-[#C05638]">-{formatCurrency(totals.discount)}</span>
            </>
          )}
          <span className="font-bold text-base pt-1.5">Invoice total:</span>
          <span className="font-bold text-base pt-1.5">{formatCurrency(totals.grandTotal)}</span>
        </div>
      </div>

      {/* Payment Details & Notes */}
      <div className="flex flex-col gap-4 max-w-md mb-12">
        {(payment.bankName || payment.accountNumber || payment.bsb) && (
          <div className="flex flex-col text-sm text-stone-900 leading-relaxed">
            <span className="font-bold uppercase tracking-wider text-xs text-stone-900 mb-1">PLEASE MAKE PAYMENT TO</span>
            <span className="font-semibold text-sm">{org.name}</span>
            {payment.accountNumber && <span>{payment.accountNumber}</span>}
            {payment.bsb && <span>BSB {payment.bsb}</span>}
            {payment.bankName && <span>{payment.bankName}</span>}
          </div>
        )}
        {form.notes.trim() && (
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{form.notes}</p>
        )}
      </div>

      {/* Footer Line */}
      <div className="mt-auto pt-6 border-t border-stone-200 text-center text-xs text-stone-400">
        {footerParts.join('  |  ')}
      </div>
    </div>
  );
};

/* ── HTML builder for PDF/email export ── */

function miamiBuildHtml(data: TemplateData): string {
  const { form, totals, client, org, payment } = data;

  const clientDisplay = client ? (client.business_name || client.name || 'Client Name') : 'Client Name';
  const labourItems = form.items.filter(i => i.type === 'labour');
  const materialsItems = form.items.filter(i => i.type === 'materials');
  const footerParts = [org.name, org.address, org.phone, org.email, org.abn ? `ABN ${org.abn}` : ''].filter(Boolean);

  const labourHtml = labourItems.length > 0 ? `
    <div style="margin-bottom: 24px;">
      <span style="font-size: 12px; font-weight: 700; color: #1c1917; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #1c1917; padding-bottom: 4px; display: block; margin-bottom: 12px;">Labour</span>
      ${labourItems.map(item => {
        const workers = item.workers ?? [];
        const hasWorkers = workers.length > 0;
        const dateText = formatDateReadable(item.date || '');

        const workerRowsHtml = hasWorkers ? workers.map(w => `
          <div style="display: flex; align-items: baseline; font-size: 14px; color: #1c1917; margin-top: 4px;">
            <span style="font-weight: 500;">${w.name || (workers.length === 1 ? 'Labour' : 'Worker')}</span>
            <span style="color: #78716c; margin-left: 6px;">&mdash; ${w.hours} hrs</span>
            <div style="flex: 1; border-bottom: 1px dotted #d6d3d1; margin: 0 12px;"></div>
            <span style="font-weight: 600;">${formatCurrency(w.hours * w.rate)}</span>
          </div>
        `).join('') : `
          <div style="display: flex; align-items: baseline; font-size: 14px; color: #1c1917; margin-top: 4px;">
            <span style="font-weight: 500;">Labour</span>
            <span style="color: #78716c; margin-left: 6px;">&mdash; ${item.hours ?? 0} hrs</span>
            <div style="flex: 1; border-bottom: 1px dotted #d6d3d1; margin: 0 12px;"></div>
            <span style="font-weight: 600;">${formatCurrency((item.hours ?? 0) * item.unitPrice)}</span>
          </div>
        `;

        return `
          <div style="padding: 4px 0;">
            ${dateText ? `<div style="font-size: 12px; color: #a8a29e; margin-bottom: 2px;">${dateText}</div>` : ''}
            <span style="font-size: 14px; font-weight: 600; color: #1c1917; white-space: pre-wrap; word-break: break-word;">${item.description || 'Labour Task'}</span>
            <div style="padding-left: 16px; margin-top: 4px;">
              ${workerRowsHtml}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  const materialsHtml = materialsItems.length > 0 ? `
    <div style="margin-bottom: 24px;">
      <span style="font-size: 12px; font-weight: 700; color: #1c1917; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #1c1917; padding-bottom: 4px; display: block; margin-bottom: 12px;">Materials</span>
      ${materialsItems.map(item => `
        <div style="display: flex; align-items: baseline; font-size: 14px; padding: 4px 0;">
          <span style="font-weight: 600; color: #1c1917; white-space: pre-wrap; word-break: break-word;">
            ${item.description || 'Material Item'}
            ${item.quantity > 0 ? `<span style="font-weight: 400; color: #78716c; margin-left: 6px;">(${item.quantity}x)</span>` : ''}
          </span>
          <div style="flex: 1; border-bottom: 1px dotted #d6d3d1; margin: 0 12px;"></div>
          <span style="font-weight: 600; color: #1c1917;">${formatCurrency((item.quantity || 1) * item.unitPrice)}</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${form.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Luxurious+Script&display=swap');
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: white;
      font-family: 'EB Garamond', Garamond, 'Georgia', serif;
      color: #1c1917;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .card {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="card">
    <!-- Top Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
      <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #1c1917;">TAX INVOICE</span>
    </div>

    <!-- Title & Centered Metadata -->
    <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 40px;">
      <h1 style="font-family: 'Luxurious Script', cursive; font-size: 56px; font-weight: 400; color: #1c1917; letter-spacing: 0.02em; line-height: 1.1; margin-bottom: 24px;">${org.name}</h1>
      <div style="display: inline-grid; grid-template-columns: auto auto; gap: 4px 20px; font-size: 14px; color: #1c1917; text-align: left;">
        <span style="font-weight: 700;">Invoice number:</span>
        <span style="text-align: right;">${form.invoiceNumber || '1001'}</span>
        <span style="font-weight: 700;">Invoice date:</span>
        <span style="text-align: right;">${formatDateDots(form.dateIssued)}</span>
        ${form.displayDueDate ? `
        <span style="font-weight: 700;">Due date:</span>
        <span style="text-align: right;">${formatDateDots(form.dueDate)}</span>
        ` : ''}
        ${org.abn ? `
        <span style="font-weight: 700;">ABN:</span>
        <span style="text-align: right;">${org.abn}</span>
        ` : ''}
      </div>
    </div>

    <!-- Side-by-side Addresses -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-bottom: 48px; font-size: 14px;">
      <div style="display: flex; flex-direction: column; gap: 4px; color: #1c1917;">
        <span style="font-weight: 600; font-size: 16px;">${clientDisplay}</span>
        ${client?.business_name && client?.name ? `<span>${client.name}</span>` : ''}
        ${client?.address ? `<span style="white-space: pre-wrap;">${client.address}</span>` : ''}
        ${client?.email ? `<span>${client.email}</span>` : ''}
      </div>
      <div style="display: flex; flex-direction: column; gap: 4px; text-align: right; color: #1c1917;">
        <span style="font-weight: 600; font-size: 16px;">${org.name}</span>
        ${org.address ? `<span style="white-space: pre-wrap;">${org.address}</span>` : ''}
        ${org.phone ? `<span>${org.phone}</span>` : ''}
        ${org.email ? `<span>${org.email}</span>` : ''}
      </div>
    </div>

    <!-- Line Items Section -->
    <div style="margin-bottom: 40px;">
      ${labourHtml}
      ${materialsHtml}
      ${!form.items.length ? '<p style="font-size: 16px; color: #a8a29e; font-style: italic; padding: 32px 0; text-align: center;">No items added yet</p>' : ''}
    </div>

    <!-- Totals Section -->
    <div style="display: flex; justify-content: flex-end; margin-bottom: 48px;">
      <div style="display: grid; grid-template-columns: auto auto; gap: 6px 40px; font-size: 14px; color: #1c1917; text-align: right;">
        <span style="font-weight: 600;">Subtotal:</span>
        <span>${formatCurrency(totals.subtotal)}</span>
        ${form.gstEnabled ? `
        <span style="font-weight: 600;">Tax:</span>
        <span>${formatCurrency(totals.gst)}</span>
        ` : ''}
        ${form.discount > 0 ? `
        <span style="font-weight: 600;">${form.discountType === 'percentage' ? `Discount (${form.discount}%):` : 'Discount:'}</span>
        <span style="color: ${TERRACOTTA};">-${formatCurrency(totals.discount)}</span>
        ` : ''}
        <span style="font-weight: 700; font-size: 16px; padding-top: 6px;">Invoice total:</span>
        <span style="font-weight: 700; font-size: 16px; padding-top: 6px;">${formatCurrency(totals.grandTotal)}</span>
      </div>
    </div>

    <!-- Payment Details & Notes -->
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 380px; margin-bottom: 48px;">
      ${(payment.bankName || payment.accountNumber || payment.bsb) ? `
      <div style="display: flex; flex-direction: column; font-size: 14px; color: #1c1917; line-height: 1.5;">
        <span style="font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">PLEASE MAKE PAYMENT TO</span>
        <span style="font-weight: 600; font-size: 14px;">${org.name}</span>
        ${payment.accountNumber ? `<span>${payment.accountNumber}</span>` : ''}
        ${payment.bsb ? `<span>BSB ${payment.bsb}</span>` : ''}
        ${payment.bankName ? `<span>${payment.bankName}</span>` : ''}
      </div>
      ` : ''}
      ${form.notes.trim() ? `<p style="font-size: 14px; color: #44403c; white-space: pre-wrap;">${form.notes}</p>` : ''}
    </div>

    <!-- Footer Line -->
    <div style="margin-top: auto; padding-top: 24px; border-top: 1px solid #e7e5e4; text-align: center; font-size: 12px; color: #a8a29e;">
      ${footerParts.join(' &nbsp;|&nbsp; ')}
    </div>
  </div>
</body>
</html>`;
}

/** Miami invoice template — editorial serif design with dotted leaders. */
export const miamiTemplate: InvoiceTemplate = {
  id: 'miami',
  name: 'Miami',
  description: 'Editorial serif layout with dotted leader worker rows',
  Preview: MiamiPreview,
  buildHtml: miamiBuildHtml,
};
