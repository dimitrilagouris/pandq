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
  return status.includes('|') ? status.split('|').slice(1).join('|') : '';
}

/**
 * Hydrates an in-memory `InvoiceFormState` from a persisted `InvoiceDetail` database record.
 * Pure conversion utility shared across the editor, preview, and export workflows.
 *
 * @param detail - Full invoice record returned by `window.electronAPI.getInvoiceById`.
 */
export function hydrateFormState(detail: InvoiceDetail): InvoiceFormState {
  const notesStr = extractNotes(detail.status);
  const templateId = detail.template_id || 'classic';

  const items: LineItem[] = (detail.items || []).map((item: PersistedInvoiceItem) => ({
    id: String(item.id || Math.random()),
    type: (item.type || 'labour') as 'labour' | 'materials',
    description: item.description || '',
    quantity: item.quantity ?? 0,
    hours: item.hours !== null && item.hours !== undefined ? item.hours : undefined,
    date: item.date || undefined,
    unitPrice: item.rate ?? 0,
  }));

  const firstDiscount = detail.discounts && detail.discounts[0];
  const discount = firstDiscount ? firstDiscount.amount : 0;
  const discountType = firstDiscount && firstDiscount.type === 'percentage' ? 'percentage' : 'flat';

  return {
    invoiceNumber: detail.invoice_number || '',
    dateIssued: detail.date || '',
    dueDate: detail.due_date || '',
    clientId: detail.client_id ?? null,
    items,
    gstEnabled: Boolean(detail.gst_added),
    displayDueDate: detail.display_due_date !== undefined ? Boolean(detail.display_due_date) : true,
    discount,
    discountType,
    notes: notesStr,
    templateId,
  };
}
