import React from 'react';
import { InvoiceTemplate, TemplateData } from './templateTypes';

/** Format a dollar amount with 2 decimal places, a $ prefix, and a non-breaking thin space before thousands. */
function formatCurrency(amount: number): string {
  const parts = amount.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  return `$${parts[0]}.${parts[1]}`;
}

/** Format a date string (YYYY-MM-DD) to DD/MM/YYYY. */
function formatDate(dateStr: string): string {
  if (!dateStr) {
    return '—';
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}


/**
 * Minimal invoice preview — redesigned to match the clean, typographic "TAX INVOICE" reference layout.
 */
const MinimalPreview: React.FC<TemplateData> = ({ form, totals, client, org, payment }) => {
  const hasItems = form.items.length > 0;
  const hasPaymentInfo = !!(payment.bankName || payment.accountNumber || payment.bsb || payment.instructions);

  // Split org name across two lines for the logo block (matches the reference)
  const orgWords = org.name ? org.name.split(' ') : ['Company'];
  const orgLine1 = orgWords[0] ?? '';
  const orgLine2 = orgWords.slice(1).join(' ');

  return (
    <div
      id="invoice-preview-card"
      className="w-[210mm] min-h-[297mm] bg-white rounded-[12px] shadow-22 flex flex-col box-border overflow-hidden"
      style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}
    >
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');` }} />

      <div className="px-12 pt-10 pb-10 flex flex-col gap-7 flex-1">

        {/* ── Header: logo-mark + company name left | TAX INVOICE right ── */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col leading-snug">
            <span className="text-[18px] font-semibold text-stone-900 tracking-tight">{orgLine1}</span>
            {orgLine2 && <span className="text-[18px] font-semibold text-stone-900 tracking-tight">{orgLine2}</span>}
          </div>
          <h1 className="text-[38px] font-extrabold text-stone-950 tracking-tight leading-none mt-1">
            TAX INVOICE
          </h1>
        </div>

        {/* ── Address row: client bill-to left | org address right ── */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-0.5">
            {client ? (
              <>
                <p className="text-[13px] font-bold text-stone-900">{client.business_name || client.name}</p>
                {client.business_name && client.name && (
                  <p className="text-[12px] text-stone-600">{client.name}</p>
                )}
                {client.address && (
                  <p className="text-[12px] text-stone-600 whitespace-pre-wrap">{client.address}</p>
                )}
                {client.email && (
                  <p className="text-[12px] text-stone-600">{client.email}</p>
                )}
              </>
            ) : (
              <p className="text-[12px] text-stone-300 italic">No client selected</p>
            )}
          </div>

          <div className="flex flex-col gap-0.5 text-right">
            <p className="text-[13px] font-bold text-stone-900">{org.name}</p>
            {org.address && (
              <p className="text-[12px] text-stone-600 whitespace-pre-wrap">{org.address}</p>
            )}
            {org.phone && <p className="text-[12px] text-stone-600">{org.phone}</p>}
            {org.email && <p className="text-[12px] text-stone-600">{org.email}</p>}
            {org.abn && <p className="text-[12px] text-stone-500">ABN {org.abn}</p>}
          </div>
        </div>

        {/* ── Invoice meta: right-aligned label/value pairs ── */}
        <div className="flex flex-col gap-1 ml-auto">
          <div className="flex items-baseline">
            <span className="text-[13px] font-bold text-stone-900 w-36 text-right">Invoice number:</span>
            <span className="text-[13px] text-stone-700 w-24 text-right ml-12">{form.invoiceNumber || '—'}</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-[13px] font-bold text-stone-900 w-36 text-right">Invoice date:</span>
            <span className="text-[13px] text-stone-700 w-24 text-right ml-12">{formatDate(form.dateIssued)}</span>
          </div>
          {form.displayDueDate && (
            <div className="flex items-baseline">
              <span className="text-[13px] font-bold text-stone-900 w-36 text-right">Due date:</span>
              <span className="text-[13px] text-stone-700 w-24 text-right ml-12">{formatDate(form.dueDate)}</span>
            </div>
          )}
        </div>

        {/* ── Line items table card ── */}
        <div className="rounded-[10px] bg-stone-50 px-5 py-4 flex flex-col">
          {/* Table header */}
          <div
            className="grid pb-2 border-b border-stone-200"
            style={{ gridTemplateColumns: 'minmax(0,1.6fr) 90px 70px 70px 80px' }}
          >
            <span className="text-[11px] italic text-stone-500">Product</span>
            <span className="text-[11px] italic text-stone-500 text-right">Hourly rate</span>
            <span className="text-[11px] italic text-stone-500 text-center">Quantity</span>
            <span className="text-[11px] italic text-stone-500 text-center">Tax rate</span>
            <span className="text-[11px] italic text-stone-500 text-right">Amount</span>
          </div>

          {/* Rows */}
          {form.items.map((item) => {
            const workers = item.workers ?? [];
            const hasMultipleWorkers = item.type === 'labour' && workers.length > 1;

            if (hasMultipleWorkers) {
              const itemTotal = workers.reduce((sum, w) => sum + (w.hours * w.rate), 0);
              return (
                <React.Fragment key={item.id}>
                  <div
                    className="grid py-3 border-b border-stone-100"
                    style={{ gridTemplateColumns: 'minmax(0,1.6fr) 90px 70px 70px 80px' }}
                  >
                    <span className="text-[13px] text-stone-800 whitespace-pre-wrap break-words">
                      {item.description || <span className="text-stone-300 italic">No description</span>}
                    </span>
                    <span className="text-[13px] text-stone-700 text-right" />
                    <span className="text-[13px] text-stone-700 text-center" />
                    <span className="text-[13px] text-stone-700 text-center">
                      {form.gstEnabled ? '10%' : '—'}
                    </span>
                    <span className="text-[13px] text-stone-800 text-right">{formatCurrency(itemTotal)}</span>
                  </div>
                  {workers.map((w) => (
                    <div
                      key={w.id}
                      className="grid py-2 border-b border-stone-50"
                      style={{ gridTemplateColumns: 'minmax(0,1.6fr) 90px 70px 70px 80px' }}
                    >
                      <span className="text-[12px] text-stone-500 pl-3 break-words">{w.name || 'Worker'}</span>
                      <span className="text-[12px] text-stone-500 text-right">{formatCurrency(w.rate)}</span>
                      <span className="text-[12px] text-stone-500 text-center">{w.hours}</span>
                      <span className="text-[12px] text-stone-500 text-center">—</span>
                      <span className="text-[12px] text-stone-500 text-right">{formatCurrency(w.hours * w.rate)}</span>
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
                className="grid py-3 border-b border-stone-100 last:border-0"
                style={{ gridTemplateColumns: 'minmax(0,1.6fr) 90px 70px 70px 80px' }}
              >
                <span className="text-[13px] text-stone-800 whitespace-pre-wrap break-words">
                  {item.description || <span className="text-stone-300 italic">No description</span>}
                </span>
                <span className="text-[13px] text-stone-700 text-right">{formatCurrency(rate)}</span>
                <span className="text-[13px] text-stone-700 text-center">{qty}</span>
                <span className="text-[13px] text-stone-700 text-center">
                  {form.gstEnabled ? '10%' : '—'}
                </span>
                <span className="text-[13px] text-stone-800 text-right">{formatCurrency(qty * rate)}</span>
              </div>
            );
          })}

          {!hasItems && (
            <p className="text-[12px] text-stone-300 italic py-5 text-center">No items added yet</p>
          )}
        </div>

        {/* ── Totals ── */}
        <div className="flex flex-col gap-0.5 ml-auto min-w-52">
          <div className="flex justify-between gap-12 text-[13px]">
            <span className="font-bold text-stone-900">Subtotal:</span>
            <span className="text-stone-800">{formatCurrency(totals.subtotal)}</span>
          </div>
          {form.gstEnabled && (
            <div className="flex justify-between gap-12 text-[13px]">
              <span className="font-bold text-stone-900">Tax:</span>
              <span className="text-stone-800">{formatCurrency(totals.gst)}</span>
            </div>
          )}
          {form.discount > 0 && (
            <div className="flex justify-between gap-12 text-[13px]">
              <span className="font-bold text-stone-900">
                {form.discountType === 'percentage'
                  ? `${form.discountDescription || 'Discount'} (${form.discount}%):`
                  : `${form.discountDescription || 'Discount'}:`}
              </span>
              <span className="text-stone-800">−{formatCurrency(totals.discount)}</span>
            </div>
          )}
          <div className="flex justify-between gap-12 text-[13px] mt-0.5">
            <span className="font-bold text-stone-900">Invoice total:</span>
            <span className="font-bold text-stone-900">{formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>

        {/* ── Footer: notes left / payment right ── */}
        <div className="mt-auto border-t border-stone-200 pt-6 flex justify-between items-start gap-8">
          {/* Custom note replaces the signature placeholder */}
          <div className="flex flex-col gap-0.5 flex-1">
            {form.notes.trim() && (
              <p className="text-[12px] text-stone-600 whitespace-pre-wrap leading-relaxed">{form.notes}</p>
            )}
          </div>

          {/* Payment info */}
          {hasPaymentInfo && (
            <div className="flex flex-col gap-0.5 text-right">
              <p className="text-[13px] font-bold text-stone-900 mb-1">Please make payment to</p>
              {payment.bankName && <p className="text-[12px] text-stone-700">{payment.bankName}</p>}
              {payment.accountNumber && <p className="text-[12px] text-stone-700">{payment.accountNumber}</p>}
              {payment.bsb && <p className="text-[12px] text-stone-700">BSB: {payment.bsb}</p>}
              {payment.instructions && (
                <p className="text-[12px] text-stone-500 italic whitespace-pre-wrap">{payment.instructions}</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

/* ── HTML builder for PDF/email export ── */

/** Build a self-contained HTML document for the minimal template. */
function minimalBuildHtml(data: TemplateData): string {
  const { form, totals, client, org, payment } = data;

  const clientName = client ? (client.business_name || client.name || '') : '';
  const clientSubName = (client && client.business_name && client.name)
    ? `<p style="font-size:12px;color:#57534e;margin:1px 0;">${client.name}</p>` : '';
  const clientAddress = client?.address
    ? `<p style="font-size:12px;color:#57534e;white-space:pre-wrap;margin:1px 0;">${client.address}</p>` : '';
  const clientEmail = client?.email
    ? `<p style="font-size:12px;color:#57534e;margin:1px 0;">${client.email}</p>` : '';
  const noClient = !client
    ? `<p style="font-size:12px;color:#d4d4d4;font-style:italic;">No client selected</p>` : '';

  const orgWords = org.name ? org.name.split(' ') : ['Company'];
  const orgLine1 = orgWords[0] ?? '';
  const orgLine2 = orgWords.slice(1).join(' ');

  const dueDateRow = form.displayDueDate ? `
    <div style="display:flex;align-items:baseline;">
      <span style="font-size:13px;font-weight:700;color:#1c1917;width:144px;text-align:right;">Due date:</span>
      <span style="font-size:13px;color:#44403c;width:96px;text-align:right;margin-left:48px;">${formatDate(form.dueDate)}</span>
    </div>` : '';

  const itemRows = form.items.map(item => {
    const workers = item.workers ?? [];
    const hasMultipleWorkers = item.type === 'labour' && workers.length > 1;

    if (hasMultipleWorkers) {
      const itemTotal = workers.reduce((sum, w) => sum + (w.hours * w.rate), 0);
      const workerRows = workers.map(w => `
        <div style="display:grid;grid-template-columns:minmax(0,1.6fr) 90px 70px 70px 80px;padding:8px 0;border-bottom:1px solid #fafaf9;">
          <span style="font-size:12px;color:#78716c;padding-left:12px;">${w.name || 'Worker'}</span>
          <span style="font-size:12px;color:#78716c;text-align:right;">${formatCurrency(w.rate)}</span>
          <span style="font-size:12px;color:#78716c;text-align:center;">${w.hours}</span>
          <span style="font-size:12px;color:#78716c;text-align:center;">—</span>
          <span style="font-size:12px;color:#78716c;text-align:right;">${formatCurrency(w.hours * w.rate)}</span>
        </div>`).join('');
      return `
        <div style="display:grid;grid-template-columns:minmax(0,1.6fr) 90px 70px 70px 80px;padding:12px 0;border-bottom:1px solid #f5f5f4;">
          <span style="font-size:13px;color:#292524;white-space:pre-wrap;word-break:break-word;">${item.description || 'No description'}</span>
          <span style="font-size:13px;color:#44403c;text-align:right;"></span>
          <span style="font-size:13px;color:#44403c;text-align:center;"></span>
          <span style="font-size:13px;color:#44403c;text-align:center;">${form.gstEnabled ? '10%' : '—'}</span>
          <span style="font-size:13px;color:#292524;text-align:right;">${formatCurrency(itemTotal)}</span>
        </div>
        ${workerRows}`;
    }

    const qty = (item.type === 'labour' && workers.length === 1)
      ? workers[0].hours
      : item.type === 'labour' ? (item.hours ?? item.quantity ?? 0) : (item.quantity ?? 0);
    const rate = (item.type === 'labour' && workers.length === 1)
      ? workers[0].rate
      : item.unitPrice;
    return `
      <div style="display:grid;grid-template-columns:minmax(0,1.6fr) 90px 70px 70px 80px;padding:12px 0;border-bottom:1px solid #f5f5f4;">
        <span style="font-size:13px;color:#292524;white-space:pre-wrap;word-break:break-word;">${item.description || 'No description'}</span>
        <span style="font-size:13px;color:#44403c;text-align:right;">${formatCurrency(rate)}</span>
        <span style="font-size:13px;color:#44403c;text-align:center;">${qty}</span>
        <span style="font-size:13px;color:#44403c;text-align:center;">${form.gstEnabled ? '10%' : '—'}</span>
        <span style="font-size:13px;color:#292524;text-align:right;">${formatCurrency(qty * rate)}</span>
      </div>`;
  }).join('');

  const gstRow = form.gstEnabled ? `
    <div style="display:flex;justify-content:space-between;gap:48px;font-size:13px;">
      <span style="font-weight:700;color:#1c1917;">Tax:</span>
      <span style="color:#44403c;">${formatCurrency(totals.gst)}</span>
    </div>` : '';

  const discountLabel = form.discountType === 'percentage'
    ? `${form.discountDescription || 'Discount'} (${form.discount}%):`
    : `${form.discountDescription || 'Discount'}:`;
  const discountRow = form.discount > 0 ? `
    <div style="display:flex;justify-content:space-between;gap:48px;font-size:13px;">
      <span style="font-weight:700;color:#1c1917;">${discountLabel}</span>
      <span style="color:#44403c;">−${formatCurrency(totals.discount)}</span>
    </div>` : '';

  const hasPaymentInfo = !!(payment.bankName || payment.accountNumber || payment.bsb || payment.instructions);
  const paymentBlock = hasPaymentInfo ? `
    <div style="text-align:right;">
      <p style="font-size:13px;font-weight:700;color:#1c1917;margin-bottom:4px;">Please make payment to</p>
      ${payment.bankName ? `<p style="font-size:12px;color:#44403c;margin:2px 0;">${payment.bankName}</p>` : ''}
      ${payment.accountNumber ? `<p style="font-size:12px;color:#44403c;margin:2px 0;">${payment.accountNumber}</p>` : ''}
      ${payment.bsb ? `<p style="font-size:12px;color:#44403c;margin:2px 0;">BSB: ${payment.bsb}</p>` : ''}
      ${payment.instructions ? `<p style="font-size:12px;color:#78716c;font-style:italic;white-space:pre-wrap;margin-top:4px;">${payment.instructions}</p>` : ''}
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${form.invoiceNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: white;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .card { width: 210mm; min-height: 297mm; }
  </style>
</head>
<body>
  <div class="card">
    <div style="padding:40px 48px;display:flex;flex-direction:column;gap:28px;">

      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="display:flex;flex-direction:column;line-height:1.25;">
            <span style="font-size:18px;font-weight:600;color:#1c1917;letter-spacing:-0.01em;">${orgLine1}</span>
            ${orgLine2 ? `<span style="font-size:18px;font-weight:600;color:#1c1917;letter-spacing:-0.01em;">${orgLine2}</span>` : ''}
          </div>
        </div>
        <h1 style="font-size:38px;font-weight:800;color:#0c0a09;letter-spacing:-0.02em;line-height:1;margin-top:4px;">TAX INVOICE</h1>
      </div>

      <!-- Address row -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:8px;">
        <div style="display:flex;flex-direction:column;gap:2px;">
          ${clientName ? `<p style="font-size:13px;font-weight:700;color:#1c1917;margin:0;">${clientName}</p>` : ''}
          ${clientSubName}
          ${clientAddress}
          ${clientEmail}
          ${noClient}
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;text-align:right;">
          <p style="font-size:13px;font-weight:700;color:#1c1917;margin:0;">${org.name}</p>
          ${org.address ? `<p style="font-size:12px;color:#57534e;white-space:pre-wrap;margin:1px 0;">${org.address}</p>` : ''}
          ${org.phone ? `<p style="font-size:12px;color:#57534e;margin:1px 0;">${org.phone}</p>` : ''}
          ${org.email ? `<p style="font-size:12px;color:#57534e;margin:1px 0;">${org.email}</p>` : ''}
          ${org.abn ? `<p style="font-size:12px;color:#78716c;margin:1px 0;">ABN ${org.abn}</p>` : ''}
        </div>
      </div>

      <!-- Invoice meta -->
      <div style="display:flex;flex-direction:column;gap:4px;margin-left:auto;">
        <div style="display:flex;align-items:baseline;">
          <span style="font-size:13px;font-weight:700;color:#1c1917;width:144px;text-align:right;">Invoice number:</span>
          <span style="font-size:13px;color:#44403c;width:96px;text-align:right;margin-left:48px;">${form.invoiceNumber || '—'}</span>
        </div>
        <div style="display:flex;align-items:baseline;">
          <span style="font-size:13px;font-weight:700;color:#1c1917;width:144px;text-align:right;">Invoice date:</span>
          <span style="font-size:13px;color:#44403c;width:96px;text-align:right;margin-left:48px;">${formatDate(form.dateIssued)}</span>
        </div>
        ${dueDateRow}
      </div>

      <!-- Items table card -->
      <div style="background:#fafaf9;border-radius:10px;padding:16px 20px;">
        <div style="display:grid;grid-template-columns:minmax(0,1.6fr) 90px 70px 70px 80px;padding-bottom:8px;border-bottom:1px solid #e7e5e4;">
          <span style="font-size:11px;font-style:italic;color:#78716c;">Product</span>
          <span style="font-size:11px;font-style:italic;color:#78716c;text-align:right;">Hourly rate</span>
          <span style="font-size:11px;font-style:italic;color:#78716c;text-align:center;">Quantity</span>
          <span style="font-size:11px;font-style:italic;color:#78716c;text-align:center;">Tax rate</span>
          <span style="font-size:11px;font-style:italic;color:#78716c;text-align:right;">Amount</span>
        </div>
        ${itemRows || '<p style="font-size:12px;color:#d4d4d4;font-style:italic;padding:20px 0;text-align:center;">No items added yet</p>'}
      </div>

      <!-- Totals -->
      <div style="display:flex;flex-direction:column;gap:2px;margin-left:auto;min-width:208px;">
        <div style="display:flex;justify-content:space-between;gap:48px;font-size:13px;">
          <span style="font-weight:700;color:#1c1917;">Subtotal:</span>
          <span style="color:#44403c;">${formatCurrency(totals.subtotal)}</span>
        </div>
        ${gstRow}
        ${discountRow}
        <div style="display:flex;justify-content:space-between;gap:48px;font-size:13px;margin-top:2px;">
          <span style="font-weight:700;color:#1c1917;">Invoice total:</span>
          <span style="font-weight:700;color:#1c1917;">${formatCurrency(totals.grandTotal)}</span>
        </div>
      </div>

      <!-- Footer: notes left / payment right -->
      <div style="margin-top:auto;border-top:1px solid #e7e5e4;padding-top:24px;display:flex;justify-content:space-between;align-items:flex-start;gap:32px;">
        <div style="flex:1;">
          ${form.notes.trim()
            ? `<p style="font-size:12px;color:#57534e;white-space:pre-wrap;line-height:1.6;">${form.notes}</p>`
            : ''
          }
        </div>
        ${paymentBlock}
      </div>

    </div>
  </div>
</body>
</html>`;
}

/** Minimal invoice template — redesigned to match the clean TAX INVOICE reference layout. */
export const minimalTemplate: InvoiceTemplate = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Clean, typographic TAX INVOICE layout with logo mark and payment footer',
  Preview: MinimalPreview,
  buildHtml: minimalBuildHtml,
};
