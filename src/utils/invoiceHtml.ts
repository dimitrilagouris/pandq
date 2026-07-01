const GST_RATE = 0.1;

interface InvoiceData {
  invoice_number: string;
  date: string;
  due_date: string;
  gst_added: boolean;
  client_name?: string;
  client_business_name?: string;
  client_email?: string;
  client_address?: string;
  items: Array<{ type: string; description: string; quantity: number; rate: number; hours?: number | null; date?: string | null }>;
  discounts: Array<{ amount: number }>;
}

/** Format a dollar amount with 2 decimal places. */
function fmtCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Format a date string (YYYY-MM-DD) to a human-readable format. */
function fmtDate(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Build item rows HTML for a given type section. */
function buildItemRows(items: InvoiceData['items'], type: string): string {
  const filtered = items.filter(i => i.type === type);
  if (filtered.length === 0) return '';

  const label = type === 'labour' ? 'Labour' : 'Materials';
  const qtyLabel = type === 'labour' ? 'Hours' : 'Qty';
  const rateLabel = type === 'labour' ? 'Rate' : 'Cost';

  const rows = filtered.map(item => {
    const qty = type === 'labour' ? (item.hours ?? item.quantity ?? 0) : (item.quantity ?? 0);
    const dateLine = type === 'labour' && item.date
      ? `<p style="font-size: 11px; color: #78716c; margin-top: 2px;">${fmtDate(item.date)}</p>`
      : '';
    return `
    <div style="display: grid; grid-template-columns: 1fr 64px 88px 80px; gap: 8px; padding: 8px 0; border-bottom: 1px solid #fafaf9;">
      <span style="font-size: 14px; color: #1c1917;">
        <span>${item.description || 'No description'}</span>
        ${dateLine}
      </span>
      <span style="font-size: 14px; color: #57534e; text-align: center;">${qty}</span>
      <span style="font-size: 14px; color: #57534e; text-align: right;">${fmtCurrency(item.rate)}</span>
      <span style="font-size: 14px; font-weight: 500; color: #1c1917; text-align: right;">${fmtCurrency(qty * item.rate)}</span>
    </div>
    `;
  }).join('');

  return `
    <div>
      <p style="font-size: 11px; font-weight: 600; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">${label}</p>
      <div style="display: grid; grid-template-columns: 1fr 64px 88px 80px; gap: 8px; padding-bottom: 6px; border-bottom: 1px solid #f5f5f4;">
        <span style="font-size: 11px; font-weight: 500; color: #a8a29e;">Description</span>
        <span style="font-size: 11px; font-weight: 500; color: #a8a29e; text-align: center;">${qtyLabel}</span>
        <span style="font-size: 11px; font-weight: 500; color: #a8a29e; text-align: right;">${rateLabel}</span>
        <span style="font-size: 11px; font-weight: 500; color: #a8a29e; text-align: right;">Total</span>
      </div>
      ${rows}
    </div>
  `;
}

/**
 * Build a fully self-contained, printable HTML document for a single invoice.
 * Uses inline styles rather than Tailwind classes so it renders correctly in an offscreen window.
 */
export function buildInvoiceHtml(data: InvoiceData): string {
  const subtotal = data.items.reduce((sum, i) => {
    const qty = i.type === 'labour' ? (i.hours ?? i.quantity ?? 0) : (i.quantity ?? 0);
    return sum + qty * i.rate;
  }, 0);
  const gst = data.gst_added ? subtotal * GST_RATE : 0;
  const discount = data.discounts?.[0]?.amount ?? 0;
  const grandTotal = subtotal + gst - discount;

  const clientDisplay = data.client_business_name || data.client_name || 'No client';
  const clientNameLine = data.client_business_name && data.client_name
    ? `<p style="font-size: 11px; color: #78716c; margin-top: 2px;">${data.client_name}</p>` : '';
  const clientAddressLine = data.client_address
    ? `<p style="font-size: 11px; color: #78716c;">${data.client_address}</p>` : '';
  const clientEmailLine = data.client_email
    ? `<p style="font-size: 11px; color: #78716c;">${data.client_email}</p>` : '';

  const gstRow = data.gst_added ? `
    <div style="display: flex; justify-content: space-between;">
      <span style="font-size: 14px; color: #78716c;">GST (10%)</span>
      <span style="font-size: 14px; color: #1c1917;">${fmtCurrency(gst)}</span>
    </div>` : '';

  const discountRow = discount > 0 ? `
    <div style="display: flex; justify-content: space-between;">
      <span style="font-size: 14px; color: #78716c;">Discount</span>
      <span style="font-size: 14px; color: #1c1917;">−${fmtCurrency(discount)}</span>
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${data.invoice_number}</title>
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
      padding: 10mm;
    }
  </style>
</head>
<body>
  <div class="card">
    <!-- Header band -->
    <div style="background: #1c1917; padding: 28px 32px; display: flex; justify-content: space-between; align-items: flex-start; border-radius: 16px 16px 0 0;">
      <div>
        <p style="font-size: 11px; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Invoice</p>
        <h1 style="font-size: 24px; font-weight: 600; color: white;">${data.invoice_number}</h1>
      </div>
      <div style="width: 48px; height: 48px; border-radius: 12px; background: #44403c; display: flex; align-items: center; justify-content: center;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px;">
          <div style="width: 10px; height: 10px; border-radius: 2px; background: #d6d3d1;"></div>
          <div style="width: 10px; height: 10px; border-radius: 2px; background: #a8a29e;"></div>
          <div style="width: 10px; height: 10px; border-radius: 2px; background: #78716c;"></div>
          <div style="width: 10px; height: 10px; border-radius: 2px; background: #d6d3d1;"></div>
        </div>
      </div>
    </div>

    <div style="padding: 24px 32px; display: flex; flex-direction: column; gap: 24px;">
      <!-- Billed By / Billed To -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div>
          <p style="font-size: 11px; color: #a8a29e; margin-bottom: 6px;">Billed by</p>
          <p style="font-size: 14px; font-weight: 600; color: #1c1917;">Your Business</p>
          <p style="font-size: 11px; color: #78716c; margin-top: 2px;">Your address here</p>
        </div>
        <div>
          <p style="font-size: 11px; color: #a8a29e; margin-bottom: 6px;">Billed to</p>
          <p style="font-size: 14px; font-weight: 600; color: #1c1917;">${clientDisplay}</p>
          ${clientNameLine}
          ${clientAddressLine}
          ${clientEmailLine}
        </div>
      </div>

      <div style="height: 1px; background: #f5f5f4;"></div>

      <!-- Dates -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div>
          <p style="font-size: 11px; color: #a8a29e; margin-bottom: 4px;">Date issued</p>
          <p style="font-size: 14px; font-weight: 600; color: #1c1917;">${fmtDate(data.date)}</p>
        </div>
        <div>
          <p style="font-size: 11px; color: #a8a29e; margin-bottom: 4px;">Due date</p>
          <p style="font-size: 14px; font-weight: 600; color: #1c1917;">${fmtDate(data.due_date)}</p>
        </div>
      </div>

      <div style="height: 1px; background: #f5f5f4;"></div>

      <!-- Line items -->
      <div style="display: flex; flex-direction: column; gap: 24px;">
        ${buildItemRows(data.items, 'labour')}
        ${buildItemRows(data.items, 'materials')}
      </div>

      <!-- Totals -->
      <div style="margin-left: auto; width: 256px; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="font-size: 14px; color: #78716c;">Subtotal</span>
          <span style="font-size: 14px; color: #1c1917;">${fmtCurrency(subtotal)}</span>
        </div>
        ${gstRow}
        ${discountRow}
        <div style="height: 1px; background: #e7e5e4; margin: 4px 0;"></div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-size: 14px; font-weight: 600; color: #1c1917;">Grand total</span>
          <span style="font-size: 16px; font-weight: 700; color: #1c1917;">${fmtCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
