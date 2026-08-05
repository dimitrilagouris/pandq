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

interface GroupedLabour {
  date: string;
  items: any[];
  totalHours: number;
  totalAmount: number;
}

/** Group labour items by their date string */
function getGroupedLabour(items: any[]): GroupedLabour[] {
  const labourItems = items.filter(i => i.type === 'labour');
  const groupsMap = new Map<string, GroupedLabour>();

  for (const item of labourItems) {
    const key = item.date || '';
    const workers = item.workers ?? [];
    const qty = (workers.length === 1) ? workers[0].hours
      : (workers.length > 1) ? workers.reduce((s: number, w: any) => s + w.hours, 0)
      : (item.hours ?? item.quantity ?? 0);
    const amount = (workers.length > 0)
      ? workers.reduce((s: number, w: any) => s + (w.hours * w.rate), 0)
      : qty * item.unitPrice;
    const existing = groupsMap.get(key);

    if (existing) {
      existing.items.push(item);
      existing.totalHours += qty;
      existing.totalAmount += amount;
    } else {
      groupsMap.set(key, {
        date: key,
        items: [item],
        totalHours: qty,
        totalAmount: amount,
      });
    }
  }

  const list = Array.from(groupsMap.values());
  // Sort by date: oldest to newest (undated first)
  list.sort((a, b) => {
    if (!a.date) {
      return -1;
    }
    if (!b.date) {
      return 1;
    }
    return a.date.localeCompare(b.date);
  });
  return list;
}

/**
 * Miami invoice preview — completely black and white art-deco design.
 * Groups labour items on the same day together.
 */
const MiamiPreview: React.FC<TemplateData> = ({ form, totals, client, org, payment }) => {
  const hasItems = form.items.length > 0;
  const groupedLabour = getGroupedLabour(form.items);
  const materials = form.items.filter(i => i.type === 'materials');

  return (
    <div id="invoice-preview-card" className="w-[210mm] min-h-[297mm] bg-white rounded-none shadow-22 overflow-hidden flex flex-col p-[12mm] box-border relative a4-page-breaks text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>
      
      {/* Dynamic Font Loading */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=MonteCarlo&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');
      `}} />

      {/* Top Header Block (ABN & Physical Address centered) */}
      <div className="mt-6 text-center flex flex-col items-center gap-1">
        {org.abn ? (
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.2em]">ABN {org.abn}</span>
        ) : (
          <span className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em]">ABN NOT PROVIDED</span>
        )}
        {org.address && (
          <span className="text-xs text-stone-600 tracking-wider font-serif whitespace-pre-wrap">{org.address}</span>
        )}
      </div>

      {/* Business Name in MonteCarlo cursive font (Black) */}
      <div className="text-center mt-4 mb-8">
        <h1 
          className="text-6xl text-stone-900 font-normal tracking-wide py-1 select-none" 
          style={{ fontFamily: "'MonteCarlo', cursive" }}
        >
          {org.name}
        </h1>
        <div className="w-20 h-[2px] bg-stone-900 mx-auto mt-4" />
      </div>

      {/* Customer Details Block (Print-like, no rounded background) */}
      <div className="border-t border-b border-stone-900 py-6 mb-6 flex justify-between gap-8">
        <div className="flex-1">
          <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-2">Billed to</p>
          {client ? (
            <>
              <p className="text-base font-bold text-stone-900">{client.business_name || client.name}</p>
              {client.name && client.business_name && (
                <p className="text-sm text-stone-600 mt-1">{client.name}</p>
              )}
              {client.address && <p className="text-sm text-stone-600 mt-1">{client.address}</p>}
              {client.email && <p className="text-sm text-stone-800 mt-1 font-medium">{client.email}</p>}
            </>
          ) : (
            <p className="text-sm text-stone-300 italic">No client selected</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-2">Invoice Ref</p>
          <p className="text-base font-bold text-stone-900 tracking-tight">{form.invoiceNumber || 'INV-001'}</p>
          <div className="mt-4 text-stone-600 text-sm leading-relaxed">
            {org.email && <p>{org.email}</p>}
            {org.phone && <p>{org.phone}</p>}
          </div>
        </div>
      </div>

      {/* Dates Block */}
      <div className="flex justify-between items-center mb-8 text-sm text-stone-900 font-medium">
        <span><span className="text-stone-500 italic mr-1">Created</span> {formatDate(form.dateIssued)}</span>
        {form.displayDueDate && (
          <span><span className="text-stone-500 italic mr-1">Due</span> {formatDate(form.dueDate)}</span>
        )}
      </div>

      {/* Table Area */}
      <div className="flex flex-col mb-6 gap-6">
        
        {/* Labour Section (Grouped by Day) */}
        {groupedLabour.length > 0 && (
          <div>
            <p className="text-xs font-bold text-stone-900 uppercase tracking-widest mb-2">Labour</p>
            <div 
              className="grid gap-3 pb-2 border-b-2 border-stone-900"
              style={{ gridTemplateColumns: 'minmax(0, 1fr) 60px 80px 80px' }}
            >
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Date / Description</span>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider text-center">Hours</span>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider text-right">Rate</span>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider text-right">Amount</span>
            </div>

            {groupedLabour.map((group) => {
              const firstRate = group.items[0]?.unitPrice;
              const allSameRate = group.items.every(item => item.unitPrice === firstRate);
              const rateDisplay = allSameRate ? formatCurrency(firstRate) : '—';

              return (
                <div key={group.date || 'undated'} className="border-b border-stone-200 py-3">
                  {/* Group Header Row */}
                  <div className="grid gap-3 font-bold text-stone-900" style={{ gridTemplateColumns: 'minmax(0, 1fr) 60px 80px 80px' }}>
                    <span className="text-sm">
                      {group.date ? formatDate(group.date) : 'Labour (Undated)'}
                    </span>
                    <span className="text-sm text-center">{group.totalHours}</span>
                    <span className="text-sm text-right">{rateDisplay}</span>
                    <span className="text-sm text-right">{formatCurrency(group.totalAmount)}</span>
                  </div>

                  {/* Sub-items list */}
                  <div className="mt-1.5 flex flex-col gap-1 pl-4">
                    {group.items.map((item) => {
                      const workers = item.workers ?? [];
                      const hasMultipleWorkers = workers.length > 1;

                      if (hasMultipleWorkers) {
                        const itemTotal = workers.reduce((s: number, w: any) => s + (w.hours * w.rate), 0);
                        return (
                          <React.Fragment key={item.id}>
                            <div className="grid gap-3 text-xs text-stone-500" style={{ gridTemplateColumns: 'minmax(0, 1fr) 60px 80px 80px' }}>
                              <span className="whitespace-pre-wrap break-words">{item.description || <span className="italic text-stone-300">No description</span>}</span>
                              <span className="text-center"></span>
                              <span className="text-right"></span>
                              <span className="text-right">{formatCurrency(itemTotal)}</span>
                            </div>
                            {workers.map((w: any) => (
                              <div key={w.id} className="grid gap-3 text-[10px] text-stone-400 pl-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) 60px 80px 80px' }}>
                                <span className="break-words">{w.name || 'Worker'}</span>
                                <span className="text-center">{w.hours}</span>
                                <span className="text-right">{formatCurrency(w.rate)}</span>
                                <span className="text-right">{formatCurrency(w.hours * w.rate)}</span>
                              </div>
                            ))}
                          </React.Fragment>
                        );
                      }

                      const qty = (workers.length === 1) ? workers[0].hours : (item.hours ?? item.quantity ?? 0);
                      const rate = (workers.length === 1) ? workers[0].rate : item.unitPrice;
                      return (
                        <div key={item.id} className="grid gap-3 text-xs text-stone-500" style={{ gridTemplateColumns: 'minmax(0, 1fr) 60px 80px 80px' }}>
                          <span className="whitespace-pre-wrap break-words">{item.description || <span className="italic text-stone-300">No description</span>}</span>
                          <span className="text-center">{qty}</span>
                          <span className="text-right">{formatCurrency(rate)}</span>
                          <span className="text-right">{formatCurrency(qty * rate)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Materials Section */}
        {materials.length > 0 && (
          <div>
            <p className="text-xs font-bold text-stone-900 uppercase tracking-widest mb-2">Materials</p>
            <div 
              className="grid gap-3 pb-2 border-b-2 border-stone-900"
              style={{ gridTemplateColumns: 'minmax(0, 1fr) 60px 80px 80px' }}
            >
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Description</span>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider text-center">Qty</span>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider text-right">Cost</span>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider text-right">Amount</span>
            </div>

            {materials.map((item) => {
              const qty = item.quantity ?? 0;
              return (
                <div
                  key={item.id}
                  className="grid gap-3 py-3 border-b border-stone-200"
                  style={{ gridTemplateColumns: 'minmax(0, 1fr) 60px 80px 80px' }}
                >
                  <span className="text-sm text-stone-850 flex flex-col min-w-0">
                    <span className="font-medium whitespace-pre-wrap break-words">{item.description || <span className="text-stone-300 italic">No description</span>}</span>
                  </span>
                  <span className="text-sm text-stone-600 text-center self-center">{qty}</span>
                  <span className="text-sm text-stone-600 text-right self-center">{formatCurrency(item.unitPrice)}</span>
                  <span className="text-sm font-semibold text-stone-900 text-right self-center">{formatCurrency(qty * item.unitPrice)}</span>
                </div>
              );
            })}
          </div>
        )}

        {!hasItems && (
          <p className="text-sm text-stone-300 italic py-6 text-center">No items added yet</p>
        )}
      </div>

      {/* Totals */}
      <div className="flex flex-col gap-1 ml-auto w-56 mb-8">
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">Subtotal</span>
          <span className="text-stone-900 font-medium">{formatCurrency(totals.subtotal)}</span>
        </div>
        {form.gstEnabled && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">GST (10%)</span>
            <span className="text-stone-900 font-medium">{formatCurrency(totals.gst)}</span>
          </div>
        )}
        {form.discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">{form.discountType === 'percentage' ? `Discount (${form.discount}%)` : 'Discount'}</span>
            <span className="text-stone-950 font-medium">−{formatCurrency(totals.discount)}</span>
          </div>
        )}
        <div className="h-[2px] bg-stone-900 my-1.5" />
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-bold text-stone-900">Total Due</span>
          <span className="text-xl font-bold text-stone-950 tracking-tight">{formatCurrency(totals.grandTotal)}</span>
        </div>
      </div>

      {/* Notes / Footer Content */}
      <div className="flex flex-col gap-4 mt-auto">
        {form.notes.trim() && (
          <div className="border-t border-stone-900 pt-4">
            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-2">Notes</p>
            <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{form.notes}</p>
          </div>
        )}

        {/* Payment details */}
        {(payment.bankName || payment.bsb || payment.accountNumber || payment.instructions) && (
          <div className="pt-4 border-t border-stone-900">
            <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-3">Payment Details</p>
            <div className="grid grid-cols-3 gap-4 text-sm text-stone-800">
              {payment.bankName && <p><span className="font-bold text-stone-900 text-[10px] uppercase tracking-wider block mb-0.5">Bank</span> {payment.bankName}</p>}
              {payment.bsb && <p><span className="font-bold text-stone-900 text-[10px] uppercase tracking-wider block mb-0.5">BSB</span> {payment.bsb}</p>}
              {payment.accountNumber && <p><span className="font-bold text-stone-900 text-[10px] uppercase tracking-wider block mb-0.5">Account</span> {payment.accountNumber}</p>}
            </div>
            {payment.instructions && <p className="mt-4 text-sm italic text-stone-600 whitespace-pre-wrap">{payment.instructions}</p>}
          </div>
        )}

      </div>

    </div>
  );
};

/* ── HTML builder for PDF/email export ── */

/** Build grouped items HTML block for labour section */
function buildGroupedLabourRowsHtml(items: any[]): string {
  const grouped = getGroupedLabour(items);
  if (grouped.length === 0) {
    return '';
  }

  const rows = grouped.map(group => {
    const firstRate = group.items[0]?.unitPrice;
    const allSameRate = group.items.every(item => item.unitPrice === firstRate);
    const rateDisplay = allSameRate ? formatCurrency(firstRate) : '—';

    const subrows = group.items.map(item => {
      const workers = item.workers ?? [];
      const hasMultipleWorkers = workers.length > 1;

      if (hasMultipleWorkers) {
        const itemTotal = workers.reduce((s: number, w: any) => s + (w.hours * w.rate), 0);
        const wRows = workers.map((w: any) => `
          <div style="display: grid; grid-template-columns: minmax(0, 1fr) 60px 80px 80px; gap: 12px; padding: 2px 0 2px 8px; font-size: 10px; color: #a8a29e;">
            <span style="word-break: break-word; overflow-wrap: break-word;">${w.name || 'Worker'}</span>
            <span style="text-align: center;">${w.hours}</span>
            <span style="text-align: right;">${formatCurrency(w.rate)}</span>
            <span style="text-align: right;">${formatCurrency(w.hours * w.rate)}</span>
          </div>`).join('');
        return `
        <div style="display: grid; grid-template-columns: minmax(0, 1fr) 60px 80px 80px; gap: 12px; padding: 4px 0; font-size: 12px; color: #57534e;">
          <span style="white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word;">${item.description || 'No description'}</span>
          <span style="text-align: center;"></span>
          <span style="text-align: right;"></span>
          <span style="text-align: right;">${formatCurrency(itemTotal)}</span>
        </div>
        ${wRows}`;
      }

      const qty = (workers.length === 1) ? workers[0].hours : (item.hours ?? item.quantity ?? 0);
      const rate = (workers.length === 1) ? workers[0].rate : item.unitPrice;
      return `
      <div style="display: grid; grid-template-columns: minmax(0, 1fr) 60px 80px 80px; gap: 12px; padding: 4px 0; font-size: 12px; color: #57534e;">
        <span style="white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word;">${item.description || 'No description'}</span>
        <span style="text-align: center;">${qty}</span>
        <span style="text-align: right;">${formatCurrency(rate)}</span>
        <span style="text-align: right;">${formatCurrency(qty * rate)}</span>
      </div>`;
    }).join('');

    return `
    <div style="border-bottom: 1px solid #e7e5e4; padding: 12px 0;">
      <!-- Group Header -->
      <div style="display: grid; grid-template-columns: minmax(0, 1fr) 60px 80px 80px; gap: 12px; font-weight: 700; color: #1c1917; font-size: 14px;">
        <span>${group.date ? formatDate(group.date) : 'Labour (Undated)'}</span>
        <span style="text-align: center;">${group.totalHours}</span>
        <span style="text-align: right;">${rateDisplay}</span>
        <span style="text-align: right;">${formatCurrency(group.totalAmount)}</span>
      </div>
      <!-- Group Sub-items -->
      <div style="margin-top: 6px; padding-left: 16px;">
        ${subrows}
      </div>
    </div>`;
  }).join('');

  return `
  <div style="margin-top: 8px;">
    <p style="font-size: 12px; font-weight: 700; color: #1c1917; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Labour</p>
    <div style="display: grid; grid-template-columns: minmax(0, 1fr) 60px 80px 80px; gap: 12px; padding-bottom: 6px; border-bottom: 2px solid #1c1917;">
      <span style="font-size: 10px; font-weight: 700; color: #78716c; text-transform: uppercase;">Date / Description</span>
      <span style="font-size: 10px; font-weight: 700; color: #78716c; text-transform: uppercase; text-align: center;">Hours</span>
      <span style="font-size: 10px; font-weight: 700; color: #78716c; text-transform: uppercase; text-align: right;">Rate</span>
      <span style="font-size: 10px; font-weight: 700; color: #78716c; text-transform: uppercase; text-align: right;">Amount</span>
    </div>
    ${rows}
  </div>`;
}

/** Build flat items HTML block for materials section */
function buildMaterialsRowsHtml(items: any[]): string {
  const materials = items.filter(i => i.type === 'materials');
  if (materials.length === 0) {
    return '';
  }

  const rows = materials.map(item => {
    const qty = item.quantity ?? 0;
    return `
    <div style="display: grid; grid-template-columns: minmax(0, 1fr) 60px 80px 80px; gap: 12px; padding: 12px 0; border-bottom: 1px solid #e7e5e4;">
      <span style="font-size: 14px; color: #292524; font-weight: 500; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word;">${item.description || 'No description'}</span>
      <span style="font-size: 14px; color: #57534e; text-align: center; margin-top: auto; margin-bottom: auto;">${qty}</span>
      <span style="font-size: 14px; color: #57534e; text-align: right; margin-top: auto; margin-bottom: auto;">${formatCurrency(item.unitPrice)}</span>
      <span style="font-size: 14px; font-weight: 600; color: #1c1917; text-align: right; margin-top: auto; margin-bottom: auto;">${formatCurrency(qty * item.unitPrice)}</span>
    </div>`;
  }).join('');

  return `
  <div style="margin-top: 16px;">
    <p style="font-size: 12px; font-weight: 700; color: #1c1917; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Materials</p>
    <div style="display: grid; grid-template-columns: minmax(0, 1fr) 60px 80px 80px; gap: 12px; padding-bottom: 6px; border-bottom: 2px solid #1c1917;">
      <span style="font-size: 10px; font-weight: 700; color: #78716c; text-transform: uppercase;">Description</span>
      <span style="font-size: 10px; font-weight: 700; color: #78716c; text-transform: uppercase; text-align: center;">Qty</span>
      <span style="font-size: 10px; font-weight: 700; color: #78716c; text-transform: uppercase; text-align: right;">Cost</span>
      <span style="font-size: 10px; font-weight: 700; color: #78716c; text-transform: uppercase; text-align: right;">Amount</span>
    </div>
    ${rows}
  </div>`;
}

/** Build a self-contained HTML document for the Miami template. */
function miamiBuildHtml(data: TemplateData): string {
  const { form, totals, client, org, payment } = data;

  const clientDisplay = client ? (client.business_name || client.name || 'No client') : 'No client';
  const clientNameLine = client && client.business_name && client.name
    ? `<p style="font-size: 14px; color: #57534e; margin-top: 4px;">${client.name}</p>` : '';
  const clientAddressLine = client?.address
    ? `<p style="font-size: 14px; color: #57534e; margin-top: 4px;">${client.address}</p>` : '';
  const clientEmailLine = client?.email
    ? `<p style="font-size: 14px; color: #1c1917; margin-top: 4px; font-weight: 600;">${client.email}</p>` : '';

  const gstRow = form.gstEnabled ? `
    <div style="display: flex; justify-content: space-between; font-size: 14px;">
      <span style="color: #78716c;">GST (10%)</span>
      <span style="color: #1c1917; font-weight: 500;">${formatCurrency(totals.gst)}</span>
    </div>` : '';

  const discountRow = form.discount > 0 ? `
    <div style="display: flex; justify-content: space-between; font-size: 14px;">
      <span style="color: #78716c;">${form.discountType === 'percentage' ? `Discount (${form.discount}%)` : 'Discount'}</span>
      <span style="color: #1c1917; font-weight: 500;">−${formatCurrency(totals.discount)}</span>
    </div>` : '';

  const notesBlock = form.notes.trim() ? `
    <div style="border-top: 1px solid #1c1917; padding-top: 16px;">
      <p style="font-size: 9px; font-weight: 700; color: #78716c; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Notes</p>
      <p style="font-size: 14px; color: #44403c; white-space: pre-wrap; line-height: 1.6;">${form.notes}</p>
    </div>` : '';

  const paymentBlock = (payment.bankName || payment.bsb || payment.accountNumber || payment.instructions) ? `
    <div style="border-top: 1px solid #1c1917; padding-top: 16px;">
      <p style="font-size: 9px; font-weight: 700; color: #78716c; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">Payment Details</p>
      <div style="display: flex; gap: 24px; font-size: 14px; color: #44403c;">
        ${payment.bankName ? `<div><span style="font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #1c1917; display: block; margin-bottom: 2px;">Bank</span> ${payment.bankName}</div>` : ''}
        ${payment.bsb ? `<div><span style="font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #1c1917; display: block; margin-bottom: 2px;">BSB</span> ${payment.bsb}</div>` : ''}
        ${payment.accountNumber ? `<div><span style="font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #1c1917; display: block; margin-bottom: 2px;">Account</span> ${payment.accountNumber}</div>` : ''}
      </div>
      ${payment.instructions ? `<p style="margin-top: 12px; font-size: 14px; font-style: italic; color: #57534e; white-space: pre-wrap;">${payment.instructions}</p>` : ''}
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${form.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=MonteCarlo&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: white;
      font-family: 'Playfair Display', serif;
      color: #1c1917;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .card {
      width: 210mm;
      min-height: 297mm;
      padding: 12mm;
      display: flex;
      flex-direction: column;
      position: relative;
    }
  </style>
</head>
<body>
  <div class="card">
    <!-- ABN & Physical Address centered at top -->
    <div style="margin-top: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <span style="font-size: 10px; font-weight: 700; color: #78716c; text-transform: uppercase; letter-spacing: 0.2em;">ABN ${org.abn || 'NOT PROVIDED'}</span>
      ${org.address ? `<span style="font-size: 12px; color: #57534e; font-family: 'Playfair Display', serif; white-space: pre-wrap;">${org.address}</span>` : ''}
    </div>

    <!-- Business name in MonteCarlo font -->
    <div style="text-align: center; margin-top: 16px; margin-bottom: 32px;">
      <h1 style="font-family: 'MonteCarlo', cursive; font-size: 64px; color: #1c1917; font-weight: 400; line-height: 1;">${org.name}</h1>
      <div style="width: 80px; height: 2px; background: #1c1917; margin: 16px auto 0 auto;"></div>
    </div>

    <!-- Customer Details -->
    <div style="border-top: 1px solid #1c1917; border-bottom: 1px solid #1c1917; padding: 24px 0; margin-bottom: 24px; display: flex; justify-content: space-between; gap: 32px;">
      <div style="flex: 1;">
        <p style="font-size: 9px; font-weight: 700; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Billed to</p>
        <p style="font-size: 16px; font-weight: 700; color: #1c1917;">${clientDisplay}</p>
        ${clientNameLine}
        ${clientAddressLine}
        ${clientEmailLine}
      </div>
      <div style="text-align: right;">
        <p style="font-size: 9px; font-weight: 700; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Invoice Ref</p>
        <p style="font-size: 16px; font-weight: 700; color: #1c1917;">${form.invoiceNumber}</p>
        <div style="margin-top: 16px; font-size: 14px; color: #57534e; line-height: 1.5;">
          ${org.email ? `<p>${org.email}</p>` : ''}
          ${org.phone ? `<p>${org.phone}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- Dates Block -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; font-size: 14px; color: #1c1917; font-weight: 500;">
      <span><span style="color: #78716c; font-style: italic; margin-right: 4px;">Created</span> ${formatDate(form.dateIssued)}</span>
      ${form.displayDueDate ? `<span><span style="color: #78716c; font-style: italic; margin-right: 4px;">Due</span> ${formatDate(form.dueDate)}</span>` : ''}
    </div>

    <!-- Grouped Table Sections -->
    <div style="margin-bottom: 24px;">
      ${buildGroupedLabourRowsHtml(form.items)}
      ${buildMaterialsRowsHtml(form.items)}
    </div>

    <!-- Totals -->
    <div style="margin-left: auto; width: 224px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 32px;">
      <div style="display: flex; justify-content: space-between; font-size: 14px;">
        <span style="color: #78716c;">Subtotal</span>
        <span style="color: #1c1917; font-weight: 500;">${formatCurrency(totals.subtotal)}</span>
      </div>
      ${gstRow}
      ${discountRow}
      <div style="height: 2px; background: #1c1917; margin: 6px 0;"></div>
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span style="font-size: 14px; font-weight: 700; color: #1c1917;">Total Due</span>
        <span style="font-size: 20px; font-weight: 900; color: #1c1917;">${formatCurrency(totals.grandTotal)}</span>
      </div>
    </div>

    <!-- Footer Area -->
    <div style="margin-top: auto; display: flex; flex-direction: column; gap: 16px;">
      ${notesBlock}
      ${paymentBlock}
      
    </div>
  </div>
</body>
</html>`;
}

/** Miami invoice template — sunset art-deco design with MonteCarlo font. */
export const miamiTemplate: InvoiceTemplate = {
  id: 'miami',
  name: 'Miami',
  description: 'Art-deco sunset styling with elegant cursive typography',
  Preview: MiamiPreview,
  buildHtml: miamiBuildHtml,
};
