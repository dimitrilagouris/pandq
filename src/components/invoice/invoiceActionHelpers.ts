import { Invoice, Client } from '../../types/models';
import { InvoiceFormState } from './invoiceTypes';
import { buildTemplateData } from './InvoicePreview';
import { getTemplate } from './templates/registry';

/** Format a YYYY-MM-DD date string for display. */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** Format currency value for display. */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Build template HTML and either email or export PDF for a single invoice. */
export async function handleSingleInvoiceAction(
  inv: Invoice,
  action: 'send' | 'pdf',
  clients: Client[],
  settings: Record<string, string>,
  onSuccess?: () => Promise<void>
): Promise<void> {
  const fullData = await window.electronAPI.getInvoiceById(inv.id);
  if (!fullData) return;

  const statusStr = fullData.status || '';
  const notesStr = statusStr.includes('|') ? statusStr.split('|').slice(1).join('|') : '';
  const templateId = fullData.template_id || 'classic';

  const formState: InvoiceFormState = {
    invoiceNumber: fullData.invoice_number,
    dateIssued: fullData.date,
    dueDate: fullData.due_date,
    clientId: fullData.client_id,
    items: (fullData.items || []).map((item: any) => ({
      id: item.id || String(Math.random()),
      type: (item.type || 'labour') as 'labour' | 'materials',
      description: item.description,
      quantity: item.quantity,
      hours: item.hours !== null ? item.hours : undefined,
      date: item.date || undefined,
      unitPrice: item.rate,
    })),
    gstEnabled: Boolean(fullData.gst_added),
    displayDueDate: fullData.display_due_date !== undefined ? Boolean(fullData.display_due_date) : true,
    discount: fullData.discounts && fullData.discounts[0] ? fullData.discounts[0].amount : 0,
    discountType: fullData.discounts && fullData.discounts[0] && fullData.discounts[0].type === 'percentage' ? 'percentage' : 'flat',
    notes: notesStr,
    templateId,
  };

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
      if (onSuccess) await onSuccess();
    }
  } else {
    await window.electronAPI.printToPDF(fullData.invoice_number, htmlContent);
  }
}

/** Build HTML for selected invoices and send them in a single batch email. */
export async function handleSendBatchInvoices(
  selectedInvoices: Invoice[],
  clients: Client[],
  settings: Record<string, string>,
  onSuccess?: () => Promise<void>
): Promise<void> {
  if (selectedInvoices.length === 0) return;
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
    if (!fullData) continue;

    const statusStr = fullData.status || '';
    const notesStr = statusStr.includes('|') ? statusStr.split('|').slice(1).join('|') : '';
    const templateId = fullData.template_id || 'classic';

    const formState: InvoiceFormState = {
      invoiceNumber: fullData.invoice_number,
      dateIssued: fullData.date,
      dueDate: fullData.due_date,
      clientId: fullData.client_id,
      items: (fullData.items || []).map((item: any) => ({
        id: item.id || String(Math.random()),
        type: (item.type || 'labour') as 'labour' | 'materials',
        description: item.description,
        quantity: item.quantity,
        hours: item.hours !== null ? item.hours : undefined,
        date: item.date || undefined,
        unitPrice: item.rate,
      })),
      gstEnabled: Boolean(fullData.gst_added),
      displayDueDate: fullData.display_due_date !== undefined ? Boolean(fullData.display_due_date) : true,
      discount: fullData.discounts && fullData.discounts[0] ? fullData.discounts[0].amount : 0,
      discountType: fullData.discounts && fullData.discounts[0] && fullData.discounts[0].type === 'percentage' ? 'percentage' : 'flat',
      notes: notesStr,
      templateId,
    };

    const client: Client = clients.find(c => c.id === fullData.client_id) || {
      id: fullData.client_id,
      name: inv.client_name || '',
      business_name: inv.client_business_name || '',
      email: inv.client_email || '',
      phone: '',
      address: (fullData as any).client_address || (inv as any).client_address || '',
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

  if (onSuccess) await onSuccess();
}
