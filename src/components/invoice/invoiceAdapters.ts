import { InvoiceDetail, PersistedInvoiceItem, PersistedWorker } from '../../types/models';
import { CreateInvoicePayload, InvoiceItemPayload } from '../../types/electron';
import { InvoiceFormState, LineItem } from './invoiceTypes';

/**
 * Extracts invoice notes from a status string stored in the "status|notes" database format.
 *
 * @param status - Raw status string retrieved from SQLite database.
 */
export function extractNotes(status: string | null | undefined): string {
  if (!status) {
    return '';
  }

  if (status.includes('|')) {
    return status.split('|').slice(1).join('|');
  }

  return '';
}

/**
 * Hydrates an in-memory `InvoiceFormState` from a persisted `InvoiceDetail` database record.
 * Pure conversion utility shared across the editor, preview, and export workflows.
 *
 * @param detail - Full invoice record returned by `window.electronAPI.getInvoiceById`.
 */
export function hydrateFormState(detail: InvoiceDetail): InvoiceFormState {
  const notesStr = extractNotes(detail.status);

  let templateId = 'classic';

  if (detail.template_id) {
    templateId = detail.template_id;
  }

  const rawItems = detail.items || [];
  const items: LineItem[] = rawItems.map((item: PersistedInvoiceItem) => {
    let itemType: 'labour' | 'materials' = 'labour';

    if (item.type === 'materials') {
      itemType = 'materials';
    }

    let itemId = String(Math.random());

    if (item.id) {
      itemId = String(item.id);
    }

    let hours: number | undefined;

    if (item.hours !== null && item.hours !== undefined) {
      hours = item.hours;
    }

    const baseItem: LineItem = {
      id: itemId,
      type: itemType,
      description: item.description || '',
      quantity: item.quantity ?? 0,
      hours,
      date: item.date || undefined,
      unitPrice: item.rate ?? 0,
    };

    /* Hydrate workers for labour items. */
    if (itemType === 'labour') {
      const persistedWorkers: PersistedWorker[] = item.workers ?? [];
      if (persistedWorkers.length > 0) {
        baseItem.workers = persistedWorkers.map((w: PersistedWorker) => ({
          id: String(w.id),
          name: w.name || '',
          hours: w.hours ?? 0,
          rate: w.rate ?? 0,
        }));
      } else if (hours !== undefined && hours > 0) {
        /* Backwards compat: legacy item with hours/rate on the parent row. */
        baseItem.workers = [{
          id: crypto.randomUUID(),
          name: '',
          hours: hours,
          rate: item.rate ?? 0,
        }];
      } else {
        baseItem.workers = [{
          id: crypto.randomUUID(),
          name: '',
          hours: 0,
          rate: 0,
        }];
      }
    }

    return baseItem;
  });

  let discount = 0;
  let discountType: 'flat' | 'percentage' = 'flat';
  let discountDescription = '';
  const firstDiscount = detail.discounts && detail.discounts[0];

  if (firstDiscount) {
    discount = firstDiscount.amount;
    discountDescription = firstDiscount.description || '';

    if (firstDiscount.type === 'percentage') {
      discountType = 'percentage';
    }
  }

  let displayDueDate = true;

  if (detail.display_due_date !== undefined) {
    displayDueDate = Boolean(detail.display_due_date);
  }

  return {
    invoiceNumber: detail.invoice_number || '',
    dateIssued: detail.date || '',
    dueDate: detail.due_date || '',
    clientId: detail.client_id ?? null,
    items,
    gstEnabled: Boolean(detail.gst_added),
    displayDueDate,
    discount,
    discountType,
    discountDescription,
    notes: notesStr,
    templateId,
  };
}

/** Maps form LineItems to IPC payload item shapes. */
export function buildItemsPayload(items: LineItem[]): InvoiceItemPayload[] {
  return items.map(item => ({
    type: item.type,
    description: item.description,
    hours: item.type === 'labour' ? (item.hours ?? item.quantity ?? 0) : null,
    rate: item.unitPrice,
    quantity: item.type === 'materials' ? (item.quantity ?? 0) : null,
    date: item.type === 'labour' ? (item.date ?? '') : null,
    workers: item.workers?.map(w => ({ name: w.name, hours: w.hours, rate: w.rate })),
  }));
}

/** Constructs complete save payload for IPC create/update calls. */
export function buildSavePayload(
  form: InvoiceFormState,
  grandTotal: number
): CreateInvoicePayload {
  return {
    clientId: form.clientId!,
    invoiceNumber: form.invoiceNumber,
    date: form.dateIssued,
    dueDate: form.dueDate,
    gstEnabled: form.gstEnabled,
    displayDueDate: form.displayDueDate,
    discount: form.discount,
    discountType: form.discountType,
    discountDescription: form.discountDescription,
    price: grandTotal,
    items: buildItemsPayload(form.items),
    notes: form.notes,
    templateId: form.templateId,
  };
}

/** Wraps raw invoice preview HTML with standalone print and PDF stylesheet. */
export function buildPrintableHtml(invoiceNumber: string, cardHtml: string): string {
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceNumber}</title>
        ${styles}
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background: white !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #invoice-preview-card {
            width: 210mm !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 10mm !important;
            box-sizing: border-box !important;
          }
          .a4-page-breaks::before {
            display: none !important;
            background-image: none !important;
          }
        </style>
      </head>
      <body>
        ${cardHtml}
      </body>
    </html>
  `;
}

