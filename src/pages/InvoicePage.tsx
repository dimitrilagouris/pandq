import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RiMailLine, RiFileTextLine, RiSaveLine, RiShareBoxLine, RiAddLine, RiSubtractLine, RiArrowLeftLine, RiArrowGoBackLine, RiArrowGoForwardLine } from 'react-icons/ri';
import { Client } from '../types/models';
import { Button } from '../components/common/Button.tsx';
import { InvoiceForm } from '../components/invoice/InvoiceForm';
import { InvoicePreview, computeTotals } from '../components/invoice/InvoicePreview';
import { PreviewCanvas, PreviewCanvasHandle } from '../components/invoice/PreviewCanvas';
import { InvoiceFormState, LineItem } from '../components/invoice/invoiceTypes';
import type { InvoiceItemPayload } from '../types/electron';
import { hydrateFormState, buildSavePayload, buildPrintableHtml } from '../components/invoice/invoiceAdapters';
import { useUndoableState } from '../hooks/useUndoableState';
import { Page } from '../App';

interface InvoicePageProps {
  onNavigate: (page: Page, force?: boolean) => void;
  invoiceId: number | null;
  onDirtyChange?: (isDirty: boolean) => void;
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

/** Creates a fresh initial form state with up-to-date dates and invoice number. */
function createInitialFormState(): InvoiceFormState {
  return {
    invoiceNumber: `INV-${String(Date.now()).slice(-5)}`,
    dateIssued: todayStr(),
    dueDate: dueDateStr(),
    clientId: null,
    items: [],
    gstEnabled: true,
    displayDueDate: true,
    discount: 0,
    discountType: 'flat',
    discountDescription: '',
    notes: '',
    templateId: 'classic',
  };
}

/**
 * Two-panel invoice creation page — form on the left, live preview on the right.
 */
/** Keys that represent text-like fields where typing should be debounced. */
const DEBOUNCED_KEYS: ReadonlySet<keyof InvoiceFormState> = new Set([
  'invoiceNumber', 'notes', 'dateIssued', 'dueDate', 'discountDescription',
]);

const InvoicePage: React.FC<InvoicePageProps> = ({ onNavigate, invoiceId, onDirtyChange }) => {
  const undoable = useUndoableState<InvoiceFormState>(createInitialFormState());
  const form = undoable.state;
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [initialFormState, setInitialFormState] = useState<InvoiceFormState | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [exportType, setExportType] = useState<'email' | 'pdf'>('email');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [canvasScale, setCanvasScale] = useState<number>(0.8);
  const [formWidth, setFormWidth] = useState<number>(480);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<PreviewCanvasHandle>(null);

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = formWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Constraint to minimum 320px and maximum 850px width
      const newWidth = Math.max(320, Math.min(850, startWidth + deltaX));
      setFormWidth(newWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    window.electronAPI.getClients().then(setClients).catch(console.error);
    window.electronAPI.getSettings().then((loadedSettings) => {
      setSettings(loadedSettings);
      if (!invoiceId) {
        const defaultDueDays = loadedSettings['setting_default_due_days'] || '14';
        const days = parseInt(defaultDueDays, 10) || 14;
        const d = new Date();
        d.setDate(d.getDate() + days);
        const computedDueDate = d.toISOString().slice(0, 10);

        const prefix = loadedSettings['setting_invoice_prefix'] || 'INV-';
        const defaultNotes = loadedSettings['setting_default_notes'] || '';
        const defaultGst = loadedSettings['setting_default_gst_enabled'] === 'true';
        const defaultDisplayDue = loadedSettings['setting_default_display_due_date'] !== 'false';
        const defaultTemplate = loadedSettings['setting_default_template_id'] || 'classic';

        const defaultForm = {
          ...createInitialFormState(),
          invoiceNumber: `${prefix}${String(Date.now()).slice(-5)}`,
          dueDate: computedDueDate,
          gstEnabled: defaultGst,
          displayDueDate: defaultDisplayDue,
          notes: defaultNotes,
          templateId: defaultTemplate,
        };
        undoable.resetHistory(defaultForm);
        setInitialFormState(defaultForm);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (invoiceId) {
      window.electronAPI.getInvoiceById(invoiceId).then(data => {
        if (data) {
          const populatedForm = hydrateFormState(data);
          undoable.resetHistory(populatedForm);
          setInitialFormState(populatedForm);
        }
      }).catch(console.error);
    }
    setError('');
  }, [invoiceId]);

  /** Compares current invoice form state against initial loaded state to determine dirty status. */
  const isFormDirty = useCallback((current: InvoiceFormState, initial: InvoiceFormState | null): boolean => {
    if (!initial) {
      return false;
    }
    if (
      current.invoiceNumber !== initial.invoiceNumber ||
      current.dateIssued !== initial.dateIssued ||
      current.dueDate !== initial.dueDate ||
      current.clientId !== initial.clientId ||
      current.gstEnabled !== initial.gstEnabled ||
      current.displayDueDate !== initial.displayDueDate ||
      current.discount !== initial.discount ||
      current.discountDescription !== initial.discountDescription ||
      current.notes !== initial.notes ||
      current.templateId !== initial.templateId ||
      current.items.length !== initial.items.length
    ) {
      return true;
    }

    for (let i = 0; i < current.items.length; i++) {
      const c = current.items[i];
      const init = initial.items[i];
      if (
        !init ||
        c.type !== init.type ||
        c.description !== init.description ||
        c.quantity !== init.quantity ||
        c.unitPrice !== init.unitPrice ||
        c.hours !== init.hours ||
        c.date !== init.date
      ) {
        return true;
      }
      /* Compare worker arrays for labour items. */
      const cWorkers = c.workers ?? [];
      const initWorkers = init.workers ?? [];
      if (cWorkers.length !== initWorkers.length) {
        return true;
      }
      for (let j = 0; j < cWorkers.length; j++) {
        const cw = cWorkers[j];
        const iw = initWorkers[j];
        if (!iw || cw.name !== iw.name || cw.hours !== iw.hours || cw.rate !== iw.rate) {
          return true;
        }
      }
    }
    return false;
  }, []);

  // Update App's dirty state whenever form or initialFormState changes
  useEffect(() => {
    onDirtyChange?.(isFormDirty(form, initialFormState));
    return () => {
      onDirtyChange?.(false);
    };
  }, [form, initialFormState, onDirtyChange, isFormDirty]);

  const selectedClient = clients.find(c => c.id === form.clientId) ?? null;

  /**
   * Route form patches through the appropriate undo strategy.
   * Text-like fields are debounced; discrete actions create immediate snapshots.
   */
  const handleChange = useCallback((patch: Partial<InvoiceFormState>): void => {
    const patchKeys = Object.keys(patch) as (keyof InvoiceFormState)[];
    const isTextOnly = patchKeys.length > 0 && patchKeys.every(k => DEBOUNCED_KEYS.has(k));

    /* Items patches need special handling: if the patch contains only description
       changes (same item count, same IDs), treat as text input. */
    const isItemDescriptionOnly = patchKeys.length === 1 && patchKeys[0] === 'items';

    if (isTextOnly) {
      undoable.setState(prev => ({ ...prev, ...patch }));
    } else if (isItemDescriptionOnly) {
      undoable.setState(prev => ({ ...prev, ...patch }));
    } else {
      undoable.setStateImmediate(prev => ({ ...prev, ...patch }));
    }
  }, [undoable]);

  /* ── Keyboard shortcuts for undo/redo ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key.toLowerCase() !== 'z') {
        return;
      }
      e.preventDefault();
      if (e.shiftKey) {
        undoable.redo();
      } else {
        undoable.undo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoable]);

  /** Maps form LineItems to the IPC payload shape, including workers. */
  const buildItemsPayload = (items: LineItem[]): InvoiceItemPayload[] => {
  const saveInvoiceState = async (): Promise<number> => {
    const totals = computeTotals(form);
    const payload = buildSavePayload(form, totals.grandTotal);
    if (invoiceId) {
      await window.electronAPI.updateInvoice({ ...payload, invoiceId });
      return invoiceId;
    }
    const newId = await window.electronAPI.createInvoice(payload);
    return Number(newId);
  };

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
      await saveInvoiceState();
      onNavigate('invoices', true);
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
      await saveInvoiceState();
      const htmlContent = buildPrintableHtml(form.invoiceNumber, cardEl.outerHTML);
      const success = await window.electronAPI.printToPDF(form.invoiceNumber, htmlContent);
      if (success) {
        onNavigate('invoices', true);
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
      const currentInvoiceId = await saveInvoiceState();
      const htmlContent = buildPrintableHtml(form.invoiceNumber, cardEl.outerHTML);

      const clientName = selectedClient ? (selectedClient.business_name || selectedClient.name) : '';
      await window.electronAPI.emailInvoice(
        form.invoiceNumber,
        htmlContent,
        selectedClient?.email || '',
        clientName,
        totals.grandTotal,
        form.dueDate
      );

      const autoUpdateSent = settings['setting_email_auto_update_status'] !== 'false';
      if (autoUpdateSent && currentInvoiceId) {
        await window.electronAPI.updateInvoiceStatus(currentInvoiceId, 'sent');
      }

      onNavigate('invoices', true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Top Header Bar (Transparent background) ── */}
      <header className="flex items-center justify-between px-6 pt-6 pb-2 bg-transparent flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <button
            type="button"
            onClick={() => onNavigate('invoices')}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200/80 text-stone-600 hover:text-stone-900 transition-colors shadow-sm cursor-pointer"
            title="Back to Invoices"
          >
            <RiArrowLeftLine className="w-4 h-4" />
          </button>

          <div className="flex flex-col">
            {/* Title */}
            <h1 className="text-xl font-semibold text-stone-900 select-none">
              {invoiceId ? 'Edit Invoice' : 'Create New Invoice'}
            </h1>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={undoable.undo}
              disabled={!undoable.canUndo}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200/80 text-stone-600 hover:text-stone-900 transition-colors shadow-sm cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:bg-stone-100"
              title="Undo (⌘Z)"
            >
              <RiArrowGoBackLine className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={undoable.redo}
              disabled={!undoable.canRedo}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200/80 text-stone-600 hover:text-stone-900 transition-colors shadow-sm cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:bg-stone-100"
              title="Redo (⌘⇧Z)"
            >
              <RiArrowGoForwardLine className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-500 max-w-[180px] text-right mr-2">{error}</span>
          )}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RiSaveLine className="w-4 h-4" />}
            onClick={() => handleSave('draft')}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save as Draft'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<RiShareBoxLine className="w-4 h-4" />}
            onClick={exportType === 'email' ? handleSendEmail : handleExportPDF}
            disabled={isSaving}
          >
            {exportType === 'email' ? 'Send Invoice' : 'Save as PDF'}
          </Button>
        </div>
      </header>

      {/* ── Split Panels Layout ── */}
      <div className="flex-1 flex overflow-hidden px-6 pt-2 pb-6 gap-0">
        {/* Left Form Panel */}
        <div
          style={{ width: `${formWidth}px` }}
          className="flex-shrink-0 flex flex-col h-full rounded-2xl shadow-1 bg-stone-50"
        >
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <InvoiceForm form={form} clients={clients} onChange={handleChange} />
          </div>
        </div>

        {/* Draggable Divider Column */}
        <div
          className="w-5 flex-shrink-0 flex items-center justify-center cursor-col-resize group select-none"
          onMouseDown={handleDividerMouseDown}
        >
          <div className="w-1 h-8 rounded-full bg-stone-300 group-hover:bg-stone-500 transition-colors" />
        </div>

        {/* Right Preview Panel */}
        <div className="flex-1 overflow-hidden flex flex-col h-full rounded-2xl shadow-1 bg-stone-50">
          {/* Preview header with type toggle and zoom */}
          <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-stone-900">Preview</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Zoom Controls */}
              <div className="flex items-center bg-stone-200 p-0.5 rounded-xl shadow-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setCanvasScale(s => Math.max(0.2, s - 0.1))}
                  className="px-2 py-1.5 text-stone-600 hover:text-stone-900 transition-colors"
                  title="Zoom Out"
                >
                  <RiSubtractLine className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center text-xs text-stone-700 select-none font-medium">
                  {Math.round(canvasScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setCanvasScale(s => Math.min(2.0, s + 0.1))}
                  className="px-2 py-1.5 text-stone-600 hover:text-stone-900 transition-colors"
                  title="Zoom In"
                >
                  <RiAddLine className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCanvasScale(0.8);
                    canvasRef.current?.recenter(0.8);
                  }}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 border-l border-stone-300 transition-colors font-medium"
                >
                  Reset
                </button>
              </div>

              {/* Email / PDF Toggle selector */}
              <div className="flex bg-stone-200 p-0.5 rounded-xl shadow-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setExportType('email')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 ${exportType === 'email'
                    ? 'bg-white text-stone-900 shadow-1'
                    : 'text-stone-500 hover:text-stone-900'
                    }`}
                >
                  <RiMailLine className="w-3.5 h-3.5" />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportType('pdf')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 ${exportType === 'pdf'
                    ? 'bg-white text-stone-900 shadow-1'
                    : 'text-stone-500 hover:text-stone-900'
                    }`}
                >
                  <RiFileTextLine className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

          <div ref={previewContainerRef} className="flex-1 overflow-hidden">
            <PreviewCanvas ref={canvasRef} scale={canvasScale} onScaleChange={setCanvasScale}>
              <InvoicePreview form={form} client={selectedClient} settings={settings} />
            </PreviewCanvas>
          </div>
        </div>
      </div>

    </div>
  );
};

export default InvoicePage;
