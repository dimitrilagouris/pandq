import React, { useState, useEffect, useCallback } from 'react';
import { TbPlus, TbSearch, TbTrash, TbReceipt } from 'react-icons/tb';
import { Invoice } from '../types';
import { Page } from '../App';
import { Table, ColumnDef } from '../components/Table';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

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
 */
export default function ProjectsPage({ onNavigate, onEditInvoice }: ProjectsPageProps): React.JSX.Element {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

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
      render: (inv) => {
        const status = inv.status.split('|')[0] || 'draft';
        let badgeClass = 'text-stone-700 bg-stone-200 border border-stone-300';
        if (status === 'sent') {
          badgeClass = 'text-emerald-700 bg-emerald-50 border border-emerald-100';
        }
        return (
          <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-lg ${badgeClass}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (inv) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleDelete(inv)}
            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
        <Button
          variant="primary"
          leftIcon={<TbPlus className="w-5 h-5" />}
          onClick={() => onNavigate('invoices')}
        >
          New Invoice
        </Button>
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
