import React from 'react';
import { Client } from '../../types/models';
import { InvoiceFormState, InvoiceTotals } from './invoiceTypes';
import { getTemplate } from './templates/registry';
import { TemplateData } from './templates/templateTypes';

const GST_RATE = 0.1;

/** Derive invoice totals from form state. */
export function computeTotals(form: InvoiceFormState): InvoiceTotals {
  const subtotal = form.items.reduce((sum, item) => {
    if (item.type === 'labour' && item.workers && item.workers.length > 0) {
      return sum + item.workers.reduce((wSum, w) => wSum + (w.hours * w.rate), 0);
    }
    const qty = item.type === 'labour' ? (item.hours ?? item.quantity ?? 0) : (item.quantity ?? 0);
    return sum + qty * item.unitPrice;
  }, 0);
  const gst = form.gstEnabled ? subtotal * GST_RATE : 0;
  
  const discount = form.discountType === 'percentage'
    ? subtotal * ((form.discount ?? 0) / 100)
    : (form.discount ?? 0);
    
  const grandTotal = subtotal + gst - discount;
  return { subtotal, gst, discount, grandTotal };
}

/** Resolve settings into the structured TemplateData shape. */
export function buildTemplateData(
  form: InvoiceFormState,
  client: Client | null,
  settings: Record<string, string>,
): TemplateData {
  return {
    form,
    totals: computeTotals(form),
    client,
    org: {
      name: settings['setting_org_name'] || 'Your Business',
      address: settings['setting_org_address'] || 'Your address here',
      phone: settings['setting_org_phone'] || '',
      email: settings['setting_org_email'] || '',
      abn: settings['setting_org_abn'] || '',
    },
    payment: {
      bankName: settings['setting_bank_name'] || '',
      bsb: settings['setting_bsb'] || '',
      accountNumber: settings['setting_account_number'] || '',
      instructions: settings['setting_payment_instructions'] || '',
    },
  };
}

interface InvoicePreviewProps {
  form: InvoiceFormState;
  client: Client | null;
  settings?: Record<string, string>;
}

/**
 * Invoice document card — resolves the active template from the registry
 * and renders its Preview component. Zoom and pan are handled by PreviewCanvas.
 */
export const InvoicePreview: React.FC<InvoicePreviewProps> = React.memo(({ form, client, settings = {} }) => {
  const template = getTemplate(form.templateId);
  const data = buildTemplateData(form, client, settings);

  return <template.Preview {...data} />;
});

InvoicePreview.displayName = 'InvoicePreview';
