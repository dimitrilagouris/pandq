import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RiAddLine, RiSearchLine, RiDeleteBinLine, RiPencilLine, RiUser3Line } from 'react-icons/ri';
import { Client, Invoice } from '../types/models';
import { Table, ColumnDef } from '../components/common/Table.tsx';
import { Button } from '../components/common/Button.tsx';
import { ClientModal } from '../components/clients/ClientModal.tsx';
import { ClientDetailsDrawer } from '../components/clients/ClientDetailsDrawer.tsx';
import { Input } from '../components/common/Input.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Tooltip } from '../components/common/Tooltip.tsx';

/**
 * Clients page — lists all clients with search, add, edit, delete actions and details drawer.
 */
export default function ClientsPage(): React.JSX.Element {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [modalClient, setModalClient] = useState<Client | null | undefined>(undefined);
  const [drawerClient, setDrawerClient] = useState<Client | null>(null);
  const [_selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // undefined = closed, null = new client, Client = edit existing
  const isModalOpen = modalClient !== undefined;

  /** Fetches all clients and invoices concurrently from SQLite. */
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const [clientData, invoiceData] = await Promise.all([
        window.electronAPI.getClients(),
        window.electronAPI.getInvoices()
      ]);
      setClients(clientData);
      setInvoices(invoiceData);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load clients data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** Deletes a client record and refreshes the client list. */
  const handleDelete = async (client: Client): Promise<void> => {
    if (!confirm(`Delete client "${client.name}"? This will also remove all their invoices.`)) {
      return;
    }
    try {
      await window.electronAPI.deleteClient(client.id);
      if (drawerClient?.id === client.id) {
        setDrawerClient(null);
      }
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete client.');
    }
  };

  /** Handles modal save completion by closing the modal and re-fetching clients. */
  const handleModalSave = async (): Promise<void> => {
    setModalClient(undefined);
    await loadData();
  };

  const filtered = useMemo(
    () =>
      clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.toLowerCase().includes(search.toLowerCase())
      ),
    [clients, search]
  );

  const columns: ColumnDef<Client>[] = [
    {
      key: 'name',
      header: 'Name',
      width: '2fr',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-stone-500">
            <RiUser3Line className="w-4 h-4" />
          </div>
          <span className="font-regular text-stone-900">{c.name}</span>
        </div>
      ),
    },
    {
      key: 'business_name',
      header: 'Business',
      width: '1.5fr',
      sortable: true,
      render: (c) => (
        <div className="flex flex-col">
          <span className="font-regular text-stone-900">{c.business_name || '—'}</span>
          {c.address && (
            <Tooltip content="Click to view in Google Maps" className="mt-0.5">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-stone-400 font-normal hover:text-stone-600 hover:underline inline-flex w-fit transition-colors"
              >
                {c.address}
              </a>
            </Tooltip>
          )}
        </div>
      ),
    },
    { key: 'email', header: 'Email', width: '2fr', sortable: true },
    { key: 'phone', header: 'Phone', width: '1fr' },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setModalClient(c)}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <RiPencilLine className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(c)}
            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <RiDeleteBinLine className="w-4 h-4" />
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
          <h1 className="text-xl font-semibold text-stone-900">Clients</h1>
          <p className="text-sm text-stone-500 mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<RiAddLine className="w-4 h-4" />}
          onClick={() => setModalClient(null)}
        >
          New Client
        </Button>
      </div>

      {/* Search */}
      <Input
        value={search}
        onChange={setSearch}
        placeholder="Search clients…"
        icon={<RiSearchLine className="w-4 h-4" />}
        className="max-w-sm"
      />

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-stone-400">Loading clients…</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<RiUser3Line className="w-6 h-6 text-stone-400" />}
          title="No clients found"
          description={search ? 'No clients match your search.' : 'No clients yet. Add your first one!'}
          buttonText={search ? 'Clear search' : 'New Client'}
          onButtonClick={search ? () => setSearch('') : () => setModalClient(null)}
          className="rounded-2xl border border-stone-200 shadow-sm"
        />
      ) : (
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(c) => c.id}
          onRowClick={(c) => setDrawerClient(c)}
          onSelectionChange={setSelectedIds}
          emptyMessage=""
        />
      )}

      {/* Client Details Drawer */}
      <ClientDetailsDrawer
        client={drawerClient}
        invoices={invoices}
        onClose={() => setDrawerClient(null)}
        onClientUpdated={loadData}
        onEditClient={(c) => {
          setModalClient(c);
        }}
      />

      {/* Modal */}
      {isModalOpen && (
        <ClientModal
          client={modalClient ?? null}
          onClose={() => setModalClient(undefined)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
