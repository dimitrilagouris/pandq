import React, { useState, useEffect, useCallback } from 'react';
import { TbPlus, TbSearch, TbTrash, TbReceipt, TbMail, TbChevronDown } from 'react-icons/tb';
import { Invoice } from '../types';
import { Page } from '../App';
import { Table, ColumnDef } from '../components/Table';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
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
  const [openStatusMenuId, setOpenStatusMenuId] = useState<number | null>(null);

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings).catch(console.error);
  }, []);

  useEffect(() => {
    const handleDocumentClick = (): void => {
      setOpenStatusMenuId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
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
  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const totalInvoices = invoices.length;

  const overdueInvoicesCount = invoices.filter((inv) => {
    const status = inv.status.split('|')[0] || 'draft';
    return status === 'sent' && inv.due_date && inv.due_date < todayStr;
  }).length;

  const toBePaidInvoicesCount = invoices.filter((inv) => {
    const status = inv.status.split('|')[0] || 'draft';
    return status === 'sent';
  }).length;

  const recentlySentCount = invoices.filter((inv) => {
    const status = inv.status.split('|')[0] || 'draft';
    return status === 'sent' && inv.date && inv.date >= sevenDaysAgoStr;
  }).length;

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

        entries.push({ invoiceNumber: fullData.invoice_number, htmlContent });
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

  const filtered = invoices.filter((inv) =>
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    (inv.client_name && inv.client_name.toLowerCase().includes(search.toLowerCase()))
  );

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
        const isMenuOpen = openStatusMenuId === inv.id;

        let badgeClass = 'text-stone-700 bg-stone-100';
        if (status === 'sent') {
          badgeClass = 'text-blue-700 bg-blue-100/80';
        } else if (status === 'paid') {
          badgeClass = 'text-lime-700 bg-lime-100';
        } else if (status === 'cancelled') {
          badgeClass = 'text-red-700 bg-red-100';
        }

        const handleStatusClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          setOpenStatusMenuId(isMenuOpen ? null : inv.id);
        };

        const handleStatusSelect = async (newStatus: string) => {
          const updatedStatus = notes ? `${newStatus}|${notes}` : newStatus;
          try {
            await window.electronAPI.updateInvoiceStatus(inv.id, updatedStatus);
            loadInvoices();
          } catch (err) {
            console.error('Failed to update invoice status:', err);
          }
          setOpenStatusMenuId(null);
        };

        return (
          <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={handleStatusClick}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg cursor-pointer hover:opacity-85 transition-all select-none border-0 ${badgeClass}`}
            >
              <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
              <TbChevronDown className="w-3 h-3 text-stone-500/80" />
            </button>

            {isMenuOpen && (
              <div className="absolute z-50 left-0 mt-1 bg-stone-600/95 backdrop-blur-md border border-white/5 rounded-2xl shadow-2xl p-1.5 w-32 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
                {['draft', 'sent', 'paid', 'cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusSelect(st)}
                    className="w-full px-2.5 py-1.5 text-left text-xs font-medium text-white hover:bg-white/10 rounded-lg transition-colors capitalize border-0 bg-transparent cursor-pointer"
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
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

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-stone-100 border border-stone-200/40 rounded-2xl p-4 shadow-1 flex flex-col gap-1.5 select-none">
          <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Invoices Made</span>
          <span className="text-2xl font-bold text-stone-900">{totalInvoices}</span>
        </div>
        <div className="bg-stone-100 border border-stone-200/40 rounded-2xl p-4 shadow-1 flex flex-col gap-1.5 select-none">
          <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Overdue Invoices</span>
          <span className="text-2xl font-bold text-red-600">{overdueInvoicesCount}</span>
        </div>
        <div className="bg-stone-100 border border-stone-200/40 rounded-2xl p-4 shadow-1 flex flex-col gap-1.5 select-none">
          <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">To Be Paid</span>
          <span className="text-2xl font-bold text-stone-900">{toBePaidInvoicesCount}</span>
        </div>
        <div className="bg-stone-100 border border-stone-200/40 rounded-2xl p-4 shadow-1 flex flex-col gap-1.5 select-none">
          <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Recently Sent</span>
          <span className="text-2xl font-bold text-stone-900">{recentlySentCount}</span>
        </div>
      </div>

      {/* Search */}
      <Input
        value={search}
        onChange={setSearch}
        placeholder="Search invoices…"
        icon={<TbSearch className="w-4 h-4" />}
        className="max-w-sm"
      />

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

