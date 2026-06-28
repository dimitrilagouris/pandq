import React, { useState, useEffect, useCallback } from 'react';
import { TbPlus, TbSearch, TbTrash, TbPencil, TbUser } from 'react-icons/tb';
import { Client } from '../types';
import { Table, ColumnDef } from '../components/Table';
import { Button } from '../components/Button';
import { ClientModal } from '../components/ClientModal';

/**
 * Clients page — lists all clients with search, add, edit, delete actions.
 */
export default function ClientsPage(): React.JSX.Element {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [modalClient, setModalClient] = useState<Client | null | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // undefined = closed, null = new client, Client = edit existing
  const isModalOpen = modalClient !== undefined;

  const loadClients = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const data = await window.electronAPI.getClients();
      setClients(data);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load clients.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const handleDelete = async (client: Client): Promise<void> => {
    if (!confirm(`Delete client "${client.name}"? This will also remove all their invoices.`)) return;
    try {
      await window.electronAPI.deleteClient(client.id);
      await loadClients();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete client.');
    }
  };

  const handleModalSave = async (): Promise<void> => {
    setModalClient(undefined);
    await loadClients();
  };

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.toLowerCase().includes(search.toLowerCase())
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
            <TbUser className="w-4 h-4" />
          </div>
          <span className="font-medium text-stone-900">{c.name}</span>
        </div>
      ),
    },
    { key: 'business_name', header: 'Business', width: '1.5fr', sortable: true },
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
            <TbPencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(c)}
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
          <h1 className="text-xl font-semibold text-stone-900">Clients</h1>
          <p className="text-sm text-stone-500 mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<TbPlus className="w-5 h-5" />}
          onClick={() => setModalClient(null)}
        >
          New Client
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <TbSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm pl-9 pr-4 py-2 text-sm text-stone-900 bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 transition-colors placeholder-stone-300"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-stone-400">Loading clients…</p>
        </div>
      ) : (
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(c) => c.id}
          onRowClick={(c) => setModalClient(c)}
          onSelectionChange={setSelectedIds}
          emptyMessage={search ? 'No clients match your search.' : 'No clients yet. Add your first one!'}
        />
      )}

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
