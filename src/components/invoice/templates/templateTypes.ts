import React from 'react';
import { Client } from '../../../types';
import { InvoiceFormState, InvoiceTotals } from '../invoiceTypes';

/** Resolved data bag passed to every template for rendering. */
export interface TemplateData {
  form: InvoiceFormState;
  totals: InvoiceTotals;
  client: Client | null;
  org: {
    name: string;
    address: string;
    phone: string;
    email: string;
    abn: string;
  };
  payment: {
    bankName: string;
    bsb: string;
    accountNumber: string;
    instructions: string;
  };
}

/** Registration interface that each template file must export. */
export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  /** Live React preview component rendered inside PreviewCanvas. */
  Preview: React.FC<TemplateData>;
  /** Builds a self-contained HTML string for PDF export and email. */
  buildHtml: (data: TemplateData) => string;
}
