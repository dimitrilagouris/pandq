import { Invoice, Client } from '../../types/models';
import { InvoiceFormState } from './invoiceTypes';
import { buildTemplateData } from './InvoicePreview';
import { getTemplate } from './templates/registry';
import { hydrateFormState } from './invoiceAdapters';

/**
 * Formats a YYYY-MM-DD ISO date string into a user-friendly Australian display format (e.g. 15 Jul 2026).
 *
 * @param dateStr - ISO date string to format.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) {
    return '—';
  }

  try {
    const d = new Date(dateStr + 'T00:00:00');

    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  catch {
    return dateStr;
  }
}

/**
 * Formats a raw numeric amount as a standard currency string (e.g. $120.00).
 *
 * @param amount - Currency value to format.
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Renders an invoice template into HTML and triggers either email dispatch or PDF save.
 *
 * @param inv - Selected invoice row summary.
 * @param action - Desired action: 'send' for AppleScript mail dispatch or 'pdf' for print-to-pdf.
 * @param clients - Cached client registry.
 * @param settings - Cached application settings.
 * @param onSuccess - Optional callback to refresh parent view after successfully updating state.
 */
export async function handleSingleInvoiceAction(
  inv: Invoice,
  action: 'send' | 'pdf',
  clients: Client[],
  settings: Record<string, string>,
  onSuccess?: () => Promise<void>
): Promise<void> {
  const fullData = await window.electronAPI.getInvoiceById(inv.id);

  if (!fullData) {
    return;
  }

  const formState: InvoiceFormState = hydrateFormState(fullData);
  const templateId = formState.templateId;

  const client: Client = clients.find(c => c.id === fullData.client_id) || {
    id: fullData.client_id,
    name: inv.client_name || '',
    business_name: inv.client_business_name || '',
    email: inv.client_email || '',
    phone: '',
    address: inv.client_address || '',
  };

  const templateData = buildTemplateData(formState, client, settings);
  const template = getTemplate(templateId);
  const htmlContent = template.buildHtml(templateData);

  if (action === 'send') {
    await window.electronAPI.emailInvoice(
      fullData.invoice_number,
      htmlContent,
      client.email,
      client.name || client.business_name,
      inv.price,
      inv.due_date || '',
    );

    const autoUpdate = settings['setting_email_auto_update_status'] !== 'false';

    if (autoUpdate) {
      await window.electronAPI.updateInvoiceStatus(inv.id, 'sent');

      if (onSuccess) {
        await onSuccess();
      }
    }
  }

  else {
    await window.electronAPI.printToPDF(fullData.invoice_number, htmlContent);
  }
}

/**
 * Compiles multiple invoices into HTML attachments and opens a single batch email draft in Mail.app.
 *
 * @param selectedInvoices - Array of selected invoices belonging to the same client.
 * @param clients - Cached client registry.
 * @param settings - Cached application settings.
 * @param onSuccess - Optional callback to refresh parent view after batch email succeeds.
 */
export async function handleSendBatchInvoices(
  selectedInvoices: Invoice[],
  clients: Client[],
  settings: Record<string, string>,
  onSuccess?: () => Promise<void>
): Promise<void> {
  if (selectedInvoices.length === 0) {
    return;
  }

  const recipientEmail = selectedInvoices[0].client_email || '';

  const entries: Array<{
    invoiceNumber: string;
    htmlContent: string;
    clientName: string;
    grandTotal: number;
    dueDate: string;
  }> = [];

  for (const inv of selectedInvoices) {
    const fullData = await window.electronAPI.getInvoiceById(inv.id);

    if (!fullData) {
      continue;
    }

    const formState: InvoiceFormState = hydrateFormState(fullData);
    const templateId = formState.templateId;

    const client: Client = clients.find(c => c.id === fullData.client_id) || {
      id: fullData.client_id,
      name: inv.client_name || '',
      business_name: inv.client_business_name || '',
      email: inv.client_email || '',
      phone: '',
      address: fullData.client_address || inv.client_address || '',
    };

    const templateData = buildTemplateData(formState, client, settings);
    const template = getTemplate(templateId);
    const htmlContent = template.buildHtml(templateData);

    entries.push({
      invoiceNumber: fullData.invoice_number,
      htmlContent,
      clientName: inv.client_name || inv.client_business_name || '',
      grandTotal: inv.price,
      dueDate: inv.due_date || '',
    });
  }

  if (entries.length === 0) {
    throw new Error('No valid invoices to send.');
  }

  await window.electronAPI.emailMultipleInvoices(entries, recipientEmail);

  const autoUpdateSent = settings['setting_email_auto_update_status'] !== 'false';

  if (autoUpdateSent) {
    for (const inv of selectedInvoices) {
      await window.electronAPI.updateInvoiceStatus(inv.id, 'sent');
    }
  }

  if (onSuccess) {
    await onSuccess();
  }
}
