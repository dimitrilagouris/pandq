import { InvoiceDetail, PersistedInvoiceItem } from '../../types/models';
import { InvoiceFormState, LineItem } from './invoiceTypes';

/**
 * Extract invoice notes from status string where status is stored in "status|notes" format.
 * @param status - The raw status string from database.
 */
export function extractNotes(status: string | null | undefined): string {
  if (!status) return '';
  return status.includes('|') ? status.split('|').slice(1).join('|') : '';
}

/**
 * Hydrates an in-memory `InvoiceFormState` from a persisted `InvoiceDetail` fetched from DB.
 * Pure converter function to prevent code duplication across editor, preview, and export helpers.
 *
 * @param detail - The full invoice detail loaded from `window.electronAPI.getInvoiceById`.
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
