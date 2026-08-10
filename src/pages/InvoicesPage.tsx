import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  RiAddLine,
  RiSubtractLine,
  RiSearchLine,
  RiReceiptLine,
  RiMailLine,
  RiEdit2Line,
  RiFlagFill,
  RiFlagLine,
} from 'react-icons/ri';
import { Invoice, Client, InvoiceStatus, Flag } from '../types/models';
import { Page } from '../App';
import { InvoicePreview } from '../components/invoice/InvoicePreview';
import { PreviewCanvas, PreviewCanvasHandle } from '../components/invoice/PreviewCanvas';
import { InvoiceFormState } from '../components/invoice/invoiceTypes';
import { Button } from '../components/common/Button.tsx';
import { Input } from '../components/common/Input.tsx';
import { Dropdown } from '../components/common/Dropdown.tsx';
import { InvoiceHistoryModal } from '../components/invoice/InvoiceHistoryModal';
import { DeleteInvoiceModal } from '../components/invoice/DeleteInvoiceModal';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { InvoiceCard } from '../components/invoice/InvoiceCard';
import { InvoiceStatusFilterPill } from '../components/invoice/InvoiceStatusFilterPill';
import { InvoiceContextMenu, ContextMenuState } from '../components/invoice/InvoiceContextMenu';
import { handleSingleInvoiceAction, handleSendBatchInvoices } from '../components/invoice/invoiceActionHelpers';
import { hydrateFormState } from '../components/invoice/invoiceAdapters';

interface InvoicesPageProps {
  onNavigate: (page: Page) => void;
  onEditInvoice: (id: number) => void;
}

/**
 * Main Invoices page — lists all saved invoices with search, filtering, multi-select, and preview panel.
 */
export default function InvoicesPage({ onNavigate, onEditInvoice }: InvoicesPageProps): React.JSX.Element {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [isSending, setIsSending] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<number | null>(null);
  const [previewForm, setPreviewForm] = useState<InvoiceFormState | null>(null);
  const [previewClient, setPreviewClient] = useState<Client | null>(null);
  const [canvasScale, setCanvasScale] = useState<number>(0.85);
  const [historyInvoiceId, setHistoryInvoiceId] = useState<number | null>(null);
  const [historyDefaultTab, setHistoryDefaultTab] = useState<'summary' | 'history'>('summary');
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [invoiceStatuses, setInvoiceStatuses] = useState<InvoiceStatus[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [flagFilter, setFlagFilter] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const canvasRef = useRef<PreviewCanvasHandle>(null);
  const lastClickedIndexRef = useRef<number>(-1);

  useEffect(() => {
    Promise.all([
      window.electronAPI.getClients(),
      window.electronAPI.getSettings(),
      window.electronAPI.getInvoiceStatuses(),
      window.electronAPI.getFlags(),
    ])
      .then(([clientsData, settingsData, statusesData, flagsData]) => {
        setClients(clientsData || []);
        setSettings(settingsData || {});
        setInvoiceStatuses(statusesData || []);
        setFlags(flagsData || []);
      })
      .catch((err) => {
        console.error('Failed to load initial invoice metadata:', err);
      });
  }, []);

  const loadInvoices = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const data = await window.electronAPI.getInvoices();
      setInvoices(data || []);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  /* ── Context Menu & Selection Shortcuts ── */
  useEffect(() => {
    if (!contextMenu) {
      return;
    }
    const close = () => setContextMenu(null);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
        lastClickedIndexRef.current = -1;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode]);

  /* ── Selection logic ── */
  const selectedInvoices = useMemo(
    () => invoices.filter((inv) => selectedIds.has(inv.id)),
    [invoices, selectedIds]
  );
  const allSameClient = useMemo(
    () =>
      selectedInvoices.length > 0 &&
      selectedInvoices.every((inv) => inv.client_id === selectedInvoices[0].client_id),
    [selectedInvoices]
  );
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

  /* ── Filter logic ── */
  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const statusParts = inv.status.split('|');
      const invStatus = statusParts[0] || 'draft';
      const invNotes = statusParts.slice(1).join('|');
      const searchLower = search.toLowerCase();

      const matchesNumber = inv.invoice_number.toLowerCase().includes(searchLower);
      const matchesClient =
        (inv.client_name && inv.client_name.toLowerCase().includes(searchLower)) ||
        (inv.client_business_name && inv.client_business_name.toLowerCase().includes(searchLower));
      const matchesAddress = inv.client_address && inv.client_address.toLowerCase().includes(searchLower);
      const matchesNotes = invNotes.toLowerCase().includes(searchLower);
      const matchesItems = inv.items_description && inv.items_description.toLowerCase().includes(searchLower);

      const matchesSearch = matchesNumber || matchesClient || matchesAddress || matchesNotes || matchesItems;

      let matchesFlag = true;
      if (flagFilter !== null) {
        const selectedFlag = flags.find((f) => Number(f.id) === Number(flagFilter));
        if (selectedFlag) {
          const invoiceFlagsStr = typeof inv.flags === 'string' ? inv.flags : '';
          matchesFlag = invoiceFlagsStr.includes(selectedFlag.color);
        } else {
          matchesFlag = false;
        }
      }

      if (statusFilter === 'all') {
        return matchesSearch && matchesFlag;
      }
      return invStatus === statusFilter && matchesSearch && matchesFlag;
    });
  }, [invoices, search, statusFilter, flagFilter, flags]);

  const handleCardClick = async (inv: Invoice, e?: React.MouseEvent) => {
    if (e?.shiftKey) {
      const currentIndex = filtered.findIndex((f) => f.id === inv.id);
      if (!isSelectionMode) {
        setIsSelectionMode(true);
        setSelectedIds(new Set([inv.id]));
        lastClickedIndexRef.current = currentIndex;
        return;
      }
      const lastIndex = lastClickedIndexRef.current;
      if (lastIndex >= 0 && currentIndex >= 0) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = filtered.slice(start, end + 1).map((f) => f.id);
        const newSelected = new Set(selectedIds);
        for (const id of rangeIds) newSelected.add(id);
        setSelectedIds(newSelected);
      }
      lastClickedIndexRef.current = currentIndex;
      return;
    }

    if (isSelectionMode) {
      handleToggleSelection(inv.id);
      lastClickedIndexRef.current = filtered.findIndex((f) => f.id === inv.id);
      return;
    }

    setSelectedPreviewId(inv.id);
    try {
      const fullData = await window.electronAPI.getInvoiceById(inv.id);
      if (fullData) {
        setPreviewForm(hydrateFormState(fullData));

        const client =
          clients.find((c) => c.id === fullData.client_id) ||
          ({
            id: fullData.client_id,
            name: inv.client_name || '',
            business_name: inv.client_business_name || '',
            email: inv.client_email || '',
            address: inv.client_address || '',
          } as Client);

        setPreviewClient(client);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const onSendBatch = async () => {
    setIsSending(true);
    setError('');
    try {
      await handleSendBatchInvoices(selectedInvoices, clients, settings, async () => {
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        await loadInvoices();
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invoices.');
    } finally {
      setIsSending(false);
    }
  };

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
              onClick={onSendBatch}
              disabled={isSending}
            >
              {isSending ? 'Sending…' : `Send ${selectedInvoices.length} Invoice${selectedInvoices.length > 1 ? 's' : ''}`}
            </Button>
          )}
          {isSelectionMode && selectedInvoices.length > 0 && !allSameClient && (
            <span className="text-xs text-amber-600 mr-2">Select invoices for the same client</span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) {
                setSelectedIds(new Set());
              }
            }}
          >
            {isSelectionMode ? 'Cancel Selection' : 'Select'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<RiAddLine className="w-4 h-4" />}
            onClick={() => onNavigate('invoice-editor')}
          >
            New Invoice
          </Button>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0 px-6 pb-2">
        <div className="flex items-center gap-2">
          <InvoiceStatusFilterPill
            invoices={invoices}
            statusFilter={statusFilter}
            onSelectStatus={setStatusFilter}
          />

          {/* Flag filter dropdown */}
          <div className="flex items-center border-l border-stone-300 pl-2 h-6">
            <Dropdown
              options={[
                { value: 'all', label: 'All Flags', icon: <RiFlagLine className="w-4 h-4 text-stone-500" /> },
                ...flags.map((f) => ({
                  value: f.id.toString(),
                  label:
                    f.color.replace('bg-', '').replace('-500', '').charAt(0).toUpperCase() +
                    f.color.replace('bg-', '').replace('-500', '').slice(1),
                  icon: <RiFlagFill className={`w-4 h-4 ${f.color.replace('bg-', 'text-')}`} />,
                })),
              ]}
              onSelect={(val) => setFlagFilter(val === 'all' ? null : parseInt(val, 10))}
              triggerLabel=""
              icon={
                flagFilter === null ? (
                  <RiFlagLine className="w-4 h-4 text-stone-900" />
                ) : (
                  <RiFlagFill className={`w-4 h-4 ${flags.find((f) => f.id === flagFilter)?.color.replace('bg-', 'text-')}`} />
                )
              }
              widthClass="w-36"
              triggerClassName={`w-8 h-8 !px-0 !gap-0 flex items-center justify-center rounded-xl transition-colors border border-stone-200/80 shadow-1 ${
                flagFilter !== null ? 'bg-stone-300 text-stone-900' : 'bg-stone-200 text-stone-900 hover:bg-stone-300'
              }`}
            />
          </div>
        </div>

        <Input
          value={search}
          onChange={setSearch}
          placeholder="Search invoices…"
          icon={<RiSearchLine className="w-4 h-4" />}
          className="max-w-xs"
        />
      </div>

      {error && (
        <div className="px-6 flex-shrink-0">
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0 px-6 pt-2 pb-6">
        {/* Left Column: List */}
        <div className="w-[384px] flex-shrink-0 relative flex flex-col overflow-hidden">
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
              filtered.map((inv) => (
                <InvoiceCard
                  key={inv.id}
                  invoice={inv}
                  invoiceStatuses={invoiceStatuses}
                  settings={settings}
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelectionMode ? selectedIds.has(inv.id) : selectedPreviewId === inv.id}
                  onClick={(e) => handleCardClick(inv, e)}
                  onDoubleClick={() => onEditInvoice(inv.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, invoice: inv });
                  }}
                />
              ))
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-stone-100 to-transparent pointer-events-none z-10" />
        </div>

        {/* Right Column: Preview Pane */}
        <div className="flex-1 bg-stone-50 rounded-2xl shadow-1 flex flex-col overflow-hidden hidden md:flex relative">
          {previewForm && previewClient ? (
            <div className="flex-1 overflow-hidden relative flex flex-col">
              <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
                <span className="text-sm font-semibold text-stone-900">Preview</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<RiEdit2Line className="w-3.5 h-3.5" />}
                    onClick={() => onEditInvoice(selectedPreviewId!)}
                  >
                    Open in Editor
                  </Button>
                  <div className="flex items-center bg-stone-200 p-0.5 rounded-xl shadow-1 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setCanvasScale((s) => Math.max(0.2, s - 0.1))}
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
                      onClick={() => setCanvasScale((s) => Math.min(2.0, s + 0.1))}
                      className="px-2 py-1.5 text-stone-600 hover:text-stone-900 transition-colors"
                      title="Zoom In"
                    >
                      <RiAddLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCanvasScale(0.85);
                        canvasRef.current?.recenter(0.85);
                      }}
                      className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 border-l border-stone-300 transition-colors font-medium"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden relative">
                <PreviewCanvas ref={canvasRef} scale={canvasScale} onScaleChange={setCanvasScale}>
                  <InvoicePreview form={previewForm} client={previewClient} settings={settings} />
                </PreviewCanvas>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<RiReceiptLine className="w-6 h-6 text-stone-400" />}
              title="No invoice selected"
              description="Select an invoice from the list to view its details."
              buttonText="Create new invoice"
              onButtonClick={() => onNavigate('invoice-editor')}
              className="rounded-r-2xl"
            />
          )}
        </div>

        {/* Modals & Overlays */}
        {contextMenu && (
          <InvoiceContextMenu
            contextMenu={contextMenu}
            flags={flags}
            onClose={() => setContextMenu(null)}
            onViewSummary={(inv) => {
              setHistoryDefaultTab('summary');
              setHistoryInvoiceId(inv.id);
            }}
            onViewHistory={(inv) => {
              setHistoryDefaultTab('history');
              setHistoryInvoiceId(inv.id);
            }}
            onEdit={(inv) => onEditInvoice(inv.id)}
            onDelete={(inv) => setDeletingInvoice(inv)}
            onSend={(inv) => handleSingleInvoiceAction(inv, 'send', clients, settings, loadInvoices)}
            onSavePdf={(inv) => handleSingleInvoiceAction(inv, 'pdf', clients, settings)}
            onMarkPaid={async (inv) => {
              try {
                await window.electronAPI.updateInvoiceStatus(inv.id, 'paid');
                await loadInvoices();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to mark as paid.');
              }
            }}
            onToggleFlag={async (inv, flagId) => {
              try {
                await window.electronAPI.toggleInvoiceFlag?.(inv.id, flagId);
                await loadInvoices();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to toggle flag');
              }
            }}
          />
        )}

        {historyInvoiceId && (
          <InvoiceHistoryModal
            invoiceId={historyInvoiceId}
            defaultTab={historyDefaultTab}
            onClose={() => setHistoryInvoiceId(null)}
          />
        )}

        <DeleteInvoiceModal
          isOpen={deletingInvoice !== null}
          invoice={deletingInvoice}
          onClose={() => setDeletingInvoice(null)}
          onConfirm={async (inv) => {
            await window.electronAPI.deleteInvoice(inv.id);
            await loadInvoices();
            if (selectedPreviewId === inv.id) {
              setSelectedPreviewId(null);
              setPreviewForm(null);
            }
          }}
        />
      </div>
    </div>
  );
}
