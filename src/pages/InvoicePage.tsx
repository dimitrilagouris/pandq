import React, { useState, useEffect, useCallback } from 'react';
import { TbMail, TbFileText, TbUpload, TbArrowUpRight, TbChevronRight } from 'react-icons/tb';
import { Client } from '../types';
import { Button } from '../components/Button';
import { InvoiceForm } from '../components/invoice/InvoiceForm';
import { InvoicePreview, computeTotals } from '../components/invoice/InvoicePreview';
import { InvoiceFormState } from '../components/invoice/invoiceTypes';
import { Page } from '../App';

interface InvoicePageProps {
  onNavigate: (page: Page) => void;
  invoiceId: number | null;
}

/** Derive today and 30-days-from-now as ISO date strings (YYYY-MM-DD). */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function dueDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

const INITIAL_FORM: InvoiceFormState = {
  invoiceNumber: `INV-${String(Date.now()).slice(-5)}`,
  dateIssued: todayStr(),
  dueDate: dueDateStr(),
  clientId: null,
  items: [],
  gstEnabled: true,
  displayDueDate: true,
  discount: 0,
  notes: '',
};

/**
 * Two-panel invoice creation page — form on the left, live preview on the right.
 */
const InvoicePage: React.FC<InvoicePageProps> = ({ onNavigate, invoiceId }) => {
  const [form, setForm] = useState<InvoiceFormState>(INITIAL_FORM);
  const [clients, setClients] = useState<Client[]>([]);
  const [exportType, setExportType] = useState<'email' | 'pdf'>('email');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    window.electronAPI.getClients().then(setClients).catch(console.error);
  }, []);

  useEffect(() => {
    if (invoiceId) {
      window.electronAPI.getInvoiceById(invoiceId).then(data => {
        if (data) {
          const statusStr = data.status || '';
          const notesStr = statusStr.includes('|') ? statusStr.split('|').slice(1).join('|') : '';
          
          setForm({
            invoiceNumber: data.invoice_number,
            dateIssued: data.date,
            dueDate: data.due_date,
            clientId: data.client_id,
            items: data.items.map((item: any) => ({
              id: item.id || String(Math.random()),
              type: (item.type || 'labour') as 'labour' | 'materials',
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.rate,
            })),
            gstEnabled: Boolean(data.gst_added),
            displayDueDate: data.display_due_date !== undefined ? Boolean(data.display_due_date) : true,
            discount: data.discounts && data.discounts[0] ? data.discounts[0].amount : 0,
            notes: notesStr,
          });
        }
      }).catch(console.error);
    } else {
      window.electronAPI.getSettings().then((settings) => {
        const defaultDueDays = settings['setting_default_due_days'] || '14';
        const days = parseInt(defaultDueDays, 10) || 14;
        const d = new Date();
        d.setDate(d.getDate() + days);
        const computedDueDate = d.toISOString().slice(0, 10);

        const prefix = settings['setting_invoice_prefix'] || 'INV-';
        const defaultNotes = settings['setting_default_notes'] || '';
        const defaultGst = settings['setting_default_gst_enabled'] === 'true';
        const defaultDisplayDue = settings['setting_default_display_due_date'] !== 'false';

        setForm({
          ...INITIAL_FORM,
          invoiceNumber: `${prefix}${String(Date.now()).slice(-5)}`,
          dueDate: computedDueDate,
          gstEnabled: defaultGst,
          displayDueDate: defaultDisplayDue,
          notes: defaultNotes,
        });
      }).catch(err => {
        console.error('Failed to load default settings:', err);
        setForm({
          ...INITIAL_FORM,
          invoiceNumber: `INV-${String(Date.now()).slice(-5)}`,
        });
      });
    }
    setError('');
  }, [invoiceId]);

  const selectedClient = clients.find(c => c.id === form.clientId) ?? null;

  const handleChange = useCallback((patch: Partial<InvoiceFormState>): void => {
    setForm(prev => ({ ...prev, ...patch }));
  }, []);

  const handleSave = async (_status: 'draft' | 'sent'): Promise<void> => {
    if (!form.clientId) {
      setError('Please select a client before saving.');
      return;
    }
    if (form.items.length === 0) {
      setError('Add at least one line item before saving.');
      return;
    }
    setError('');
    try {
      setIsSaving(true);
      const totals = computeTotals(form);
      const items = form.items.map(item => ({
        type: item.type,
        description: item.description,
        quantity: item.quantity,
        rate: item.unitPrice,
      }));
      
      if (invoiceId) {
        await window.electronAPI.updateInvoice(
          invoiceId,
          form.clientId,
          form.invoiceNumber,
          form.dateIssued,
          form.dueDate,
          form.gstEnabled,
          form.displayDueDate,
          form.discount,
          totals.grandTotal,
          items,
          form.notes,
        );
      } else {
        await window.electronAPI.createInvoice(
          form.clientId,
          form.invoiceNumber,
          form.dateIssued,
          form.dueDate,
          form.gstEnabled,
          form.displayDueDate,
          form.discount,
          totals.grandTotal,
          items,
          form.notes,
        );
      }
      onNavigate('projects');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async (): Promise<void> => {
    if (!form.clientId) {
      setError('Please select a client before exporting.');
      return;
    }
    if (form.items.length === 0) {
      setError('Add at least one line item before exporting.');
      return;
    }
    
    const cardEl = document.getElementById('invoice-preview-card');
    if (!cardEl) {
      setError('Could not find invoice preview card element.');
      return;
    }

    setError('');
    try {
      setIsSaving(true);
      
      const totals = computeTotals(form);
      const items = form.items.map(item => ({
        type: item.type,
        description: item.description,
        quantity: item.quantity,
        rate: item.unitPrice,
      }));

      // 1. Auto-save state to database first
      if (invoiceId) {
        await window.electronAPI.updateInvoice(
          invoiceId,
          form.clientId,
          form.invoiceNumber,
          form.dateIssued,
          form.dueDate,
          form.gstEnabled,
          form.displayDueDate,
          form.discount,
          totals.grandTotal,
          items,
          form.notes,
        );
      } else {
        await window.electronAPI.createInvoice(
          form.clientId,
          form.invoiceNumber,
          form.dateIssued,
          form.dueDate,
          form.gstEnabled,
          form.displayDueDate,
          form.discount,
          totals.grandTotal,
          items,
          form.notes,
        );
      }

      // 2. Build high fidelity printable document with styling
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Invoice ${form.invoiceNumber}</title>
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
                height: 297mm !important;
                min-height: 297mm !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                padding: 10mm !important;
                box-sizing: border-box !important;
              }
            </style>
          </head>
          <body>
            ${cardEl.outerHTML}
          </body>
        </html>
      `;

      // 3. Trigger print to PDF dialog
      const success = await window.electronAPI.printToPDF(form.invoiceNumber, htmlContent);
      if (success) {
        onNavigate('projects');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = async (): Promise<void> => {
    if (!form.clientId) {
      setError('Please select a client before sending.');
      return;
    }
    if (form.items.length === 0) {
      setError('Add at least one line item before sending.');
      return;
    }
    
    const cardEl = document.getElementById('invoice-preview-card');
    if (!cardEl) {
      setError('Could not find invoice preview card element.');
      return;
    }

    setError('');
    try {
      setIsSaving(true);
      
      const totals = computeTotals(form);
      const items = form.items.map(item => ({
        type: item.type,
        description: item.description,
        quantity: item.quantity,
        rate: item.unitPrice,
      }));

      // 1. Auto-save state to database first
      if (invoiceId) {
        await window.electronAPI.updateInvoice(
          invoiceId,
          form.clientId,
          form.invoiceNumber,
          form.dateIssued,
          form.dueDate,
          form.gstEnabled,
          form.displayDueDate,
          form.discount,
          totals.grandTotal,
          items,
          form.notes,
        );
      } else {
        await window.electronAPI.createInvoice(
          form.clientId,
          form.invoiceNumber,
          form.dateIssued,
          form.dueDate,
          form.gstEnabled,
          form.displayDueDate,
          form.discount,
          totals.grandTotal,
          items,
          form.notes,
        );
      }

      // 2. Build high fidelity printable document with styling
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Invoice ${form.invoiceNumber}</title>
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
                height: 297mm !important;
                min-height: 297mm !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                padding: 10mm !important;
                box-sizing: border-box !important;
              }
            </style>
          </head>
          <body>
            ${cardEl.outerHTML}
          </body>
        </html>
      `;

      // 3. Trigger email creation with attachment
      await window.electronAPI.emailInvoice(form.invoiceNumber, htmlContent, selectedClient?.email || '');
      onNavigate('projects');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Top Header Bar (Transparent background) ── */}
      <header className="flex items-center justify-between px-6 pt-6 pb-4 bg-transparent flex-shrink-0">
        <div className="flex flex-col">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-xs font-medium text-stone-400">
            <span
              onClick={() => onNavigate('invoices')}
              className="cursor-pointer hover:text-stone-600 transition-colors"
            >
              Invoices
            </span>
            <TbChevronRight className="w-3 h-3 text-stone-300" />
            <span className="text-stone-500">Create</span>
          </div>
          {/* Title */}
          <h1 className="text-xl font-bold text-stone-900 mt-1 select-none">
            Create New Invoice
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-500 max-w-[180px] text-right mr-2">{error}</span>
          )}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<TbUpload className="w-4 h-4" />}
            onClick={() => handleSave('draft')}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save as Draft'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<TbArrowUpRight className="w-4 h-4" />}
            onClick={exportType === 'email' ? handleSendEmail : handleExportPDF}
            disabled={isSaving}
          >
            {exportType === 'email' ? 'Send Invoice' : 'Save as PDF'}
          </Button>
        </div>
      </header>

      {/* ── Split Panels Layout ── */}
      <div className="flex-1 flex overflow-hidden px-6 py-6">
        {/* Left Form Panel */}
        <div className="w-[480px] flex-shrink-0 flex flex-col h-full border-stone-200/80 rounded-2xl shadow-1">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <InvoiceForm form={form} clients={clients} onChange={handleChange} />
          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="flex-1 overflow-hidden flex flex-col h-full">
          {/* Preview header with type toggle */}
          <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-stone-900">Preview</span>
              <span className="text-xs text-stone-400">— updates as you type</span>
            </div>

            {/* Email / PDF Toggle selector */}
            <div className="flex bg-stone-200/60 p-0.5 rounded-xl shadow-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setExportType('email')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 ${
                  exportType === 'email'
                    ? 'bg-white text-stone-900 shadow-1'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <TbMail className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => setExportType('pdf')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 ${
                  exportType === 'pdf'
                    ? 'bg-white text-stone-900 shadow-1'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <TbFileText className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <InvoicePreview form={form} client={selectedClient} />
          </div>
        </div>
      </div>

    </div>
  );
};

export default InvoicePage;
