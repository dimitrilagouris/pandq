import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TbPlus, TbSearch, TbTrash, TbReceipt, TbMail, TbDotsVertical, TbCheck } from 'react-icons/tb';
import { Invoice } from '../types';
import { Page } from '../App';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Dropdown } from '../components/Dropdown';
import { buildInvoiceHtml } from '../utils/invoiceHtml';

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
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [isSending, setIsSending] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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

        const htmlContent = buildInvoiceHtml({
          invoice_number: fullData.invoice_number,
          date: fullData.date,
          due_date: fullData.due_date,
          gst_added: Boolean(fullData.gst_added),
          client_name: inv.client_name,
          client_business_name: inv.client_business_name,
          client_email: inv.client_email,
          client_address: (fullData as any).client_address || (inv as any).client_address,
          items: fullData.items || [],
          discounts: fullData.discounts || [],
        }, settings);

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
    const matchesSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.client_name && inv.client_name.toLowerCase().includes(search.toLowerCase()));

    if (statusFilter === 'all') return matchesSearch;
    const invStatus = inv.status.split('|')[0] || 'draft';
    return invStatus === statusFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full p-6 gap-5 overflow-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Invoices</h1>
          <p className="text-sm text-stone-500 mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex items-center gap-2">
          {isSelectionMode && canSendBatch && (
            <Button
              variant="secondary"
              leftIcon={<TbMail className="w-5 h-5" />}
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
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedIds(new Set());
            }}
          >
            {isSelectionMode ? 'Cancel Selection' : 'Select'}
          </Button>
          <Button
            variant="primary"
            leftIcon={<TbPlus className="w-5 h-5" />}
            onClick={() => onNavigate('invoices')}
          >
            New Invoice
          </Button>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
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
          icon={<TbSearch className="w-4 h-4" />}
          className="max-w-xs"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex-shrink-0">{error}</p>
      )}

      {/* Main 2-Column Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Left Column: Invoice Cards List */}
        <div className="w-[380px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-2 pb-10 custom-scrollbar">
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
              
              let badgeClass = 'text-stone-700 bg-stone-100';
              if (status === 'sent') {
                badgeClass = 'text-blue-700 bg-blue-100/80';
              } else if (status === 'paid') {
                badgeClass = 'text-lime-700 bg-lime-100';
              } else if (status === 'cancelled') {
                badgeClass = 'text-red-700 bg-red-100';
              }

              // Dropdown Actions
              const actionOptions = [
                { value: 'edit', label: 'Edit' },
                { value: 'delete', label: 'Delete', className: 'text-red-600 hover:bg-red-50' }
              ];

              const handleAction = (val: string) => {
                if (val === 'edit') onEditInvoice(inv.id);
                if (val === 'delete') handleDelete(inv);
              };
              
              const isSelected = selectedIds.has(inv.id);
              
              // Last Updated date
              let displayDate = inv.updated_at ? formatDate(inv.updated_at.split('T')[0]) : formatDate(inv.date);

              return (
                <div 
                  key={inv.id}
                  onClick={() => {
                    if (isSelectionMode) handleToggleSelection(inv.id);
                  }}
                  className={`border rounded-2xl p-3 shadow-sm transition-all flex flex-col justify-between relative group h-[80px] ${
                    isSelectionMode ? 'cursor-pointer hover:border-stone-300' : 'border-stone-200/60'
                  } ${isSelected ? 'bg-white border-stone-400 ring-2 ring-stone-400 ring-offset-1' : 'bg-stone-50'}`}
                >
                  {/* Selection Checkbox (transitions opacity) */}
                  <div className={`absolute top-3 left-3 z-10 transition-all duration-300 ease-out ${
                    isSelectionMode ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-95'
                  }`}>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isSelected ? 'bg-stone-800 border-stone-800 text-white' : 'border-stone-300 bg-white group-hover:border-stone-400'
                    }`}>
                      {isSelected && <TbCheck className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  <div className={`flex flex-col h-full justify-between transition-all duration-300 ease-out ${isSelectionMode ? 'pl-8' : 'pl-0'}`}>
                    {/* Top Row: Client Name, Status, Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-base truncate max-w-[120px] ${inv.client_name ? 'text-stone-900' : 'text-stone-400 italic'}`}>
                          {inv.client_name || 'No Client'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
                          {status}
                        </span>
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
                        onClick={(e) => e.stopPropagation()} 
                        className={`flex-shrink-0 transition-opacity duration-300 ${isSelectionMode ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
                      >
                        <Dropdown
                          variant="badge"
                          options={actionOptions}
                          onSelect={handleAction}
                          triggerLabel=""
                          icon={<TbDotsVertical className="w-4 h-4 text-stone-500 group-hover:text-stone-800 transition-colors" />}
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

        {/* Right Column: Empty details pane */}
        <div className="flex-1 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200 flex flex-col items-center justify-center p-8 text-center hidden md:flex">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-stone-100 mb-4">
            <TbReceipt className="w-6 h-6 text-stone-300" />
          </div>
          <h3 className="text-stone-500 font-medium mb-1">No invoice selected</h3>
          <p className="text-stone-400 text-sm">Select an invoice from the list to view its details</p>
        </div>
      </div>
    </div>
  );
}
