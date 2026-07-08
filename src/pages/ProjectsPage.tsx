import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RiAddLine, RiSubtractLine, RiSearchLine, RiDeleteBinLine, RiReceiptLine, RiMailLine, RiMore2Fill, RiCheckLine } from 'react-icons/ri';
import { Invoice, Client } from '../types';
import { Page } from '../App';
import { InvoicePreview, computeTotals, buildTemplateData } from '../components/invoice/InvoicePreview';
import { PreviewCanvas, PreviewCanvasHandle } from '../components/invoice/PreviewCanvas';
import { InvoiceFormState } from '../components/invoice/invoiceTypes';
import { getTemplate } from '../components/invoice/templates/registry';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Dropdown } from '../components/Dropdown';
import { Badge } from '../components/Badge';

/** Format a date string YYYY-MM-DD into a nicer layout. */
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** Format currency value. */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

interface ProjectsPageProps {
  onNavigate: (page: Page) => void;
  onEditInvoice: (id: number) => void;
}

/**
 * Invoices page — lists all saved invoices with search, add, delete actions.
 * Displays a list of cards on the left, with space reserved on the right.
 */
export default function ProjectsPage({ onNavigate, onEditInvoice }: ProjectsPageProps): React.JSX.Element {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [isSending, setIsSending] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<number | null>(null);
  const [previewForm, setPreviewForm] = useState<InvoiceFormState | null>(null);
  const [previewClient, setPreviewClient] = useState<Client | null>(null);
  const [canvasScale, setCanvasScale] = useState(0.85);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const canvasRef = useRef<PreviewCanvasHandle>(null);

  useEffect(() => {
    const activeBtn = buttonRefs.current[statusFilter];
    const container = containerRef.current;
    if (activeBtn && container) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      setSliderStyle({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
        opacity: 1,
      });
    }
  }, [statusFilter, invoices]);

  useEffect(() => {
    window.electronAPI.getClients().then(setClients).catch(console.error);
    window.electronAPI.getSettings().then(setSettings).catch(console.error);
  }, []);

  const loadInvoices = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const data = await window.electronAPI.getInvoices();
      setInvoices(data);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const handleDelete = async (invoice: Invoice): Promise<void> => {
    if (!confirm(`Delete invoice "${invoice.invoice_number}"?`)) return;
    try {
      await window.electronAPI.deleteInvoice(invoice.id);
      await loadInvoices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice.');
    }
  };

  /* ── Selection logic ── */
  const selectedInvoices = invoices.filter(inv => selectedIds.has(inv.id));
  const allSameClient = selectedInvoices.length > 0
    && selectedInvoices.every(inv => inv.client_id === selectedInvoices[0].client_id);
  const canSendBatch = selectedInvoices.length > 0 && allSameClient;

  const handleToggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleCardClick = async (inv: Invoice) => {
    if (isSelectionMode) {
      handleToggleSelection(inv.id);
      return;
    }

    setSelectedPreviewId(inv.id);
    try {
      const fullData = await window.electronAPI.getInvoiceById(inv.id);
      if (fullData) {
        const statusStr = fullData.status || '';
        const notesStr = statusStr.includes('|') ? statusStr.split('|').slice(1).join('|') : '';

        setPreviewForm({
          invoiceNumber: fullData.invoice_number,
          dateIssued: fullData.date,
          dueDate: fullData.due_date,
          clientId: fullData.client_id,
          items: fullData.items.map((item: any) => ({
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
          notes: notesStr,
          templateId: fullData.template_id || 'classic',
        });

        const client = clients.find(c => c.id === fullData.client_id) || {
          id: fullData.client_id,
          name: inv.client_name || '',
          business_name: inv.client_business_name || '',
          email: inv.client_email || '',
          address: inv.client_address || '',
        } as Client;

        setPreviewClient(client);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamic list of statuses for expandable pill navigation
  const statusOptions = ['all'];
  const databaseStatuses = Array.from(
    new Set(
      invoices.map((inv) => inv.status.split('|')[0] || 'draft')
    )
  );

  const standardOrder = ['draft', 'sent', 'paid', 'cancelled'];
  for (const std of standardOrder) {
    statusOptions.push(std);
  }
  for (const custom of databaseStatuses) {
    if (!standardOrder.includes(custom)) {
      statusOptions.push(custom);
    }
  }

  const getStatusCount = (statusKey: string): number => {
    if (statusKey === 'all') return invoices.length;
    return invoices.filter((inv) => (inv.status.split('|')[0] || 'draft') === statusKey).length;
  };

  /** Fetch full data for each selected invoice, build HTML, and email as a batch. */
  const handleSendSelected = async (): Promise<void> => {
    if (!canSendBatch) return;
    const recipientEmail = selectedInvoices[0].client_email || '';
    setError('');
    setIsSending(true);

    try {
      const entries: Array<{ invoiceNumber: string; htmlContent: string }> = [];

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
        setError('No valid invoices to send.');
        return;
      }

      await window.electronAPI.emailMultipleInvoices(entries, recipientEmail);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      await loadInvoices(); // Refresh to fetch newly updated_at timestamps
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invoices.');
    } finally {
      setIsSending(false);
    }
  };

  const filtered = invoices.filter((inv) => {
    const statusParts = inv.status.split('|');
    const invStatus = statusParts[0] || 'draft';
    const invNotes = statusParts.slice(1).join('|');

    const searchLower = search.toLowerCase();

    const matchesNumber = inv.invoice_number.toLowerCase().includes(searchLower);

    const matchesClient = (inv.client_name && inv.client_name.toLowerCase().includes(searchLower)) ||
      (inv.client_business_name && inv.client_business_name.toLowerCase().includes(searchLower));

    const matchesAddress = inv.client_address && inv.client_address.toLowerCase().includes(searchLower);

    const matchesNotes = invNotes.toLowerCase().includes(searchLower);

    const matchesItems = inv.items_description && inv.items_description.toLowerCase().includes(searchLower);

    const matchesSearch = matchesNumber || matchesClient || matchesAddress || matchesNotes || matchesItems;

    if (statusFilter === 'all') return matchesSearch;
    return invStatus === statusFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-shrink-0 px-6 pt-6 pb-2">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Invoices</h1>
          <p className="text-sm text-stone-500 mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex items-center gap-2">
          {isSelectionMode && canSendBatch && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RiMailLine className="w-4 h-4" />}
              onClick={handleSendSelected}
              disabled={isSending}
            >
              {isSending ? 'Sending…' : `Send ${selectedInvoices.length} Invoice${selectedInvoices.length > 1 ? 's' : ''}`}
            </Button>
          )}
          {isSelectionMode && selectedInvoices.length > 0 && !allSameClient && (
            <span className="text-xs text-amber-600 mr-2">Select invoices for the same client</span>
          )}
          <Button
            variant={isSelectionMode ? 'secondary' : 'secondary'}
            size="sm"
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedIds(new Set());
            }}
          >
            {isSelectionMode ? 'Cancel Selection' : 'Select'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<RiAddLine className="w-4 h-4" />}
            onClick={() => onNavigate('invoices')}
          >
            New Invoice
          </Button>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0 px-6 pb-2">
        {/* Status Filters Pill Navigation */}
        <div
          ref={containerRef}
          className="relative flex bg-stone-200 p-0.5 rounded-xl w-fit shadow-sm text-xs font-medium select-none items-center gap-0.5"
        >
          {/* Sliding background highlight */}
          <div
            style={{
              transform: `translateX(${sliderStyle.left}px)`,
              width: `${sliderStyle.width}px`,
              opacity: sliderStyle.opacity,
            }}
            className="absolute top-0.5 bottom-0.5 left-0 bg-white rounded-lg shadow-1 transition-all duration-300 ease-out pointer-events-none"
          />

          {statusOptions.map((opt) => {
            const isSelected = statusFilter === opt;
            const count = getStatusCount(opt);
            const displayLabel = opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1);

            return (
              <button
                key={opt}
                ref={(el) => { buttonRefs.current[opt] = el; }}
                type="button"
                onClick={() => setStatusFilter(opt)}
                className={`relative z-10 flex items-center px-3 py-1.5 rounded-lg transition-all duration-150 border-0 cursor-pointer text-xs font-medium bg-transparent ${isSelected
                  ? 'text-stone-900'
                  : 'text-stone-500 hover:text-stone-900'
                  }`}
              >
                <span>{displayLabel}</span>
                <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all duration-150 ${isSelected
                  ? 'bg-stone-100 text-stone-855'
                  : 'bg-stone-300 text-stone-600'
                  }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <Input
          value={search}
          onChange={setSearch}
          placeholder="Search invoices…"
          icon={<RiSearchLine className="w-4 h-4" />}
          className="max-w-xs"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 flex-shrink-0">
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0 px-6 pt-2 pb-6">
        {/* Left Column: Wrapper with Gradient Overlay */}
        <div className="w-[384px] flex-shrink-0 relative flex flex-col overflow-hidden">
          {/* Scrollable list */}
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto px-1 pt-1 pr-3 pb-24 custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-stone-400">Loading invoices…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-32 border border-dashed border-stone-200 rounded-2xl">
                <p className="text-sm text-stone-400">
                  {search ? 'No invoices match your search.' : 'No invoices yet. Add your first one!'}
                </p>
              </div>
            ) : (
              filtered.map((inv) => {
                const parts = inv.status.split('|');
                const status = parts[0] || 'draft';

                // Dropdown Actions
                const actionOptions = [
                  { value: 'edit', label: 'Edit' },
                  { value: 'delete', label: 'Delete', className: 'text-red-600 hover:bg-red-50' }
                ];

                const handleAction = (val: string) => {
                  if (val === 'edit') onEditInvoice(inv.id);
                  if (val === 'delete') handleDelete(inv);
                };

                const isSelected = isSelectionMode ? selectedIds.has(inv.id) : selectedPreviewId === inv.id;

                // Last Updated date
                let displayDate = inv.updated_at ? formatDate(inv.updated_at.split('T')[0]) : formatDate(inv.date);

                return (
                  <div
                    key={inv.id}
                    onClick={() => handleCardClick(inv)}
                    className={`scroll-animate-card border rounded-2xl p-3 shadow-sm transition-colors flex flex-col justify-between relative group h-[80px] hover:z-50 focus-within:z-50 cursor-pointer hover:border-stone-300 ${isSelected ? 'z-10 bg-white border-stone-400 ring-2 ring-stone-400 ring-offset-1' : 'z-0 bg-stone-50 border-stone-200/60'
                      }`}
                  >
                    {/* Selection Checkbox (transitions opacity) */}
                    <div className={`absolute top-3 left-3 z-10 transition-all duration-300 ease-out ${isSelectionMode ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-95'
                      }`}>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-stone-800 border-stone-800 text-white' : 'border-stone-300 bg-white group-hover:border-stone-400'
                        }`}>
                        {isSelected && <RiCheckLine className="w-3.5 h-3.5" />}
                      </div>
                    </div>

                    <div className={`flex flex-col h-full justify-between transition-all duration-300 ease-out ${isSelectionMode ? 'pl-8' : 'pl-0'}`}>
                      {/* Top Row: Client Name, Status, Date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-base truncate max-w-[120px] ${inv.client_name ? 'text-stone-900' : 'text-stone-400 italic'}`}>
                            {inv.client_name || 'No Client'}
                          </span>
                          <Badge invoiceStatus={status}>
                            {status}
                          </Badge>
                        </div>
                        <span className="text-xs text-stone-400 whitespace-nowrap">
                          {displayDate}
                        </span>
                      </div>

                      {/* Bottom Row: Invoice ID, Client Address, More Menu */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="font-normal text-stone-600 text-sm leading-none tracking-tight flex-shrink-0">
                            {inv.invoice_number}
                          </span>
                          <span className="text-xs font-normal text-stone-500 truncate max-w-[160px]">
                            {inv.client_address || ''}
                          </span>
                        </div>

                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(inv);
                          }}
                          className={`flex-shrink-0 transition-opacity duration-300 ${isSelectionMode ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
                        >
                          <Dropdown
                            variant="badge"
                            options={actionOptions}
                            onSelect={handleAction}
                            triggerLabel=""
                            icon={<RiMore2Fill className="w-4 h-4 text-stone-550 group-hover:text-stone-800 transition-colors" />}
                            triggerClassName="w-7 h-7 flex items-center justify-center bg-transparent border border-stone-200 shadow-sm hover:bg-stone-50 hover:border-stone-300 rounded-md cursor-pointer !p-0 [&>span]:hidden"
                            widthClass="w-32"
                            align="right"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Bottom gradient overlay matching the background color (bg-stone-100) */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-stone-100 to-transparent pointer-events-none z-10" />
        </div>

        {/* Right Column: Details Pane */}
        <div className="flex-1 bg-stone-50 rounded-2xl shadow-1 flex flex-col overflow-hidden hidden md:flex relative">
          {previewForm && previewClient ? (
            <div className="flex-1 overflow-hidden relative flex flex-col">
              {/* Header with zoom controls */}
              <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
                <span className="text-sm font-semibold text-stone-900">Preview</span>
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
                      setCanvasScale(0.85);
                      canvasRef.current?.resetView(0.85);
                    }}
                    className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 border-l border-stone-300 transition-colors font-medium"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Canvas area */}
              <div className="flex-1 overflow-hidden relative">
                <PreviewCanvas ref={canvasRef} scale={canvasScale} onScaleChange={setCanvasScale}>
                  <InvoicePreview form={previewForm} client={previewClient} settings={settings} />
                </PreviewCanvas>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-stone-100 mb-4">
                <RiReceiptLine className="w-6 h-6 text-stone-300" />
              </div>
              <h3 className="text-stone-500 font-medium mb-1">No invoice selected</h3>
              <p className="text-stone-400 text-sm">Select an invoice from the list to view its details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
