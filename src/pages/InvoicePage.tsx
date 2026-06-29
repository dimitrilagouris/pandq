import React, { useState, useEffect, useCallback } from 'react';
import { TbArrowLeft, TbMail, TbFileText, TbUpload, TbArrowUpRight, TbChevronRight } from 'react-icons/tb';
import { Client } from '../types';
import { Button } from '../components/Button';
import { InvoiceForm } from '../components/invoice/InvoiceForm';
import { InvoicePreview, computeTotals } from '../components/invoice/InvoicePreview';
import { InvoiceFormState } from '../components/invoice/invoiceTypes';
import { Page } from '../App';

interface InvoicePageProps {
  onNavigate: (page: Page) => void;
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
  discount: 0,
  notes: '',
};

/**
 * Two-panel invoice creation page — form on the left, live preview on the right.
 */
const InvoicePage: React.FC<InvoicePageProps> = ({ onNavigate }) => {
  const [form, setForm] = useState<InvoiceFormState>(INITIAL_FORM);
  const [clients, setClients] = useState<Client[]>([]);
  const [exportType, setExportType] = useState<'email' | 'pdf'>('email');

  useEffect(() => {
    window.electronAPI.getClients().then(setClients).catch(console.error);
  }, []);

  const selectedClient = clients.find(c => c.id === form.clientId) ?? null;

  const handleChange = useCallback((patch: Partial<InvoiceFormState>): void => {
    setForm(prev => ({ ...prev, ...patch }));
  }, []);

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
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<TbUpload className="w-4 h-4" />}
          >
            Save as Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<TbArrowUpRight className="w-4 h-4" />}
          >
            {exportType === 'email' ? 'Send Invoices' : 'Save as PDF'}
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
