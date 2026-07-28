import { InvoiceDetail, PersistedInvoiceItem } from '../../types/models';
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

    return {
      id: itemId,
      type: itemType,
      description: item.description || '',
      quantity: item.quantity ?? 0,
      hours,
      date: item.date || undefined,
      unitPrice: item.rate ?? 0,
    };
  });

  let discount = 0;
  let discountType: 'flat' | 'percentage' = 'flat';
  const firstDiscount = detail.discounts && detail.discounts[0];

  if (firstDiscount) {
    discount = firstDiscount.amount;
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
    notes: notesStr,
    templateId,
  };
}
