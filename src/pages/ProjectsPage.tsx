import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TbPlus, TbSearch, TbTrash, TbReceipt, TbMail, TbChevronDown } from 'react-icons/tb';
import { Invoice } from '../types';
import { Page } from '../App';
import { Table, ColumnDef } from '../components/Table';
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
 * Supports multi-select to batch-email invoices for the same client.
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

  // Metric calculations
  const totalInvoices = invoices.length;

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

  const columns: ColumnDef<Invoice>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice ID',
      width: '2.5fr',
      sortable: true,
      render: (inv) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-stone-500">
            <TbReceipt className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-stone-900">{inv.invoice_number}</span>
            <span className="text-xs text-stone-500 font-semibold mt-0.5">
              {formatCurrency(inv.price)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'client_name',
      header: 'Client',
      width: '2fr',
      sortable: true,
      render: (inv) => (
        <span className={inv.client_name ? 'text-stone-750 font-medium' : 'text-stone-400 italic'}>
          {inv.client_name || 'No Client'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date Issued',
      width: '1.5fr',
      sortable: true,
      render: (inv) => <span>{formatDate(inv.date)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '1.2fr',
      sortable: true,
      className: 'overflow-visible',
      render: (inv) => {
        const parts = inv.status.split('|');
        const status = parts[0] || 'draft';
        const notes = parts.slice(1).join('|');

        let badgeClass = 'text-stone-700 bg-stone-100';
        if (status === 'sent') {
          badgeClass = 'text-blue-700 bg-blue-100/80';
        } else if (status === 'paid') {
          badgeClass = 'text-lime-700 bg-lime-100';
        } else if (status === 'cancelled') {
          badgeClass = 'text-red-700 bg-red-100';
        }

        const handleStatusSelect = async (newStatus: string) => {
          const updatedStatus = notes ? `${newStatus}|${notes}` : newStatus;
          try {
            await window.electronAPI.updateInvoiceStatus(inv.id, updatedStatus);
            loadInvoices();
          } catch (err) {
            console.error('Failed to update invoice status:', err);
          }
        };

        const statusOptions = [
          { value: 'draft', label: 'Draft' },
          { value: 'sent', label: 'Sent' },
          { value: 'paid', label: 'Paid' },
          { value: 'cancelled', label: 'Cancelled' }
        ];

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Dropdown
              options={statusOptions}
              onSelect={handleStatusSelect}
              triggerLabel={status.charAt(0).toUpperCase() + status.slice(1)}
              triggerClassName={`px-3 py-1 text-xs font-medium rounded-lg cursor-pointer hover:opacity-85 transition-all select-none border-0 ${badgeClass}`}
              widthClass="w-32"
            />
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '1.2fr',
      className: 'text-right justify-end pr-1',
      render: (inv) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEditInvoice(inv.id)}
          >
            Edit
          </Button>
          <button
            onClick={() => handleDelete(inv)}
            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
          >
            <TbTrash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full p-6 gap-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Invoices</h1>
          <p className="text-sm text-stone-500 mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex items-center gap-2">
          {canSendBatch && (
            <Button
              variant="secondary"
              leftIcon={<TbMail className="w-5 h-5" />}
              onClick={handleSendSelected}
              disabled={isSending}
            >
              {isSending ? 'Sending…' : `Send ${selectedInvoices.length} Invoice${selectedInvoices.length > 1 ? 's' : ''}`}
            </Button>
          )}
          {selectedInvoices.length > 0 && !allSameClient && (
            <span className="text-xs text-amber-600 mr-1">Select invoices for the same client</span>
          )}
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
      <div className="flex items-center justify-between gap-4">
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
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-stone-400">Loading invoices…</p>
        </div>
      ) : (
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(inv) => inv.id}
          onRowClick={(inv) => onEditInvoice(inv.id)}
          onSelectionChange={setSelectedIds}
          emptyMessage={search ? 'No invoices match your search.' : 'No invoices yet. Add your first one!'}
        />
      )}
    </div>
  );
}

