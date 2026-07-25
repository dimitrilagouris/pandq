import React, { useState, useEffect, useRef } from 'react';
import {
  RiArrowLeftLine,
  RiUser3Line,
  RiBuildingLine,
  RiPencilLine,
  RiAddLine,
  RiFileTextLine,
  RiCheckboxCircleFill
} from 'react-icons/ri';
import { Client, Invoice } from '../types';
import { Badge } from './Badge';
import { Button } from './Button';

type DrawerTab = 'overview' | 'outstanding' | 'invoices';

interface ClientDetailsDrawerProps {
  client: Client | null;
  invoices: Invoice[];
  onClose: () => void;
  onEditClient: (client: Client) => void;
  onCreateInvoice?: (client: Client) => void;
}

/** Helper to derive status badge variant. */
function getStatusVariant(statusStr: string): 'neutral' | 'info' | 'success' | 'warning' | 'error' {
  const code = (statusStr.split('|')[0]) || 'draft';
  switch (code) {
    case 'paid': return 'success';
    case 'sent': return 'info';
    case 'overdue': return 'error';
    case 'cancelled': return 'neutral';
    case 'draft':
    default:
      return 'warning';
  }
}

/** Format currency with Australian locale. */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
}

/**
 * Slide-over drawer presenting detailed view of a client matching reference design.
 */
export const ClientDetailsDrawer: React.FC<ClientDetailsDrawerProps> = ({
  client,
  invoices,
  onClose,
  onEditClient,
  onCreateInvoice
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  const [isRendered, setIsRendered] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Tab slider pill navigation
  const [sliderStyle, setSliderStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Handle smooth enter/exit animations
  useEffect(() => {
    if (client) {
      setIsRendered(true);
      // Double rAF ensures the browser registers the initial off-screen DOM state before transitioning
      const timer = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      return () => cancelAnimationFrame(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [client]);

  // Handle smooth dismissal
  const handleDismiss = (): void => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const clientInvoices = client ? invoices.filter(inv => inv.client_id === client.id) : [];
  const outstandingInvoices = clientInvoices.filter(inv => inv.status.split('|')[0] !== 'paid');
  const paidInvoices = clientInvoices.filter(inv => inv.status.split('|')[0] === 'paid');

  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + (inv.price || 0), 0);
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.price || 0), 0);
  const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + (inv.price || 0), 0);

  // Tab definitions matching InvoicesPage status filter style
  const tabs: { key: DrawerTab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'outstanding', label: 'Outstanding', count: outstandingInvoices.length },
    { key: 'invoices', label: 'Invoices', count: clientInvoices.length },
  ];

  // Update slider position whenever activeTab or client changes
  useEffect(() => {
    if (!isRendered) return;
    const btn = buttonRefs.current[activeTab];
    const container = containerRef.current;
    if (btn && container) {
      const btnRect = btn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setSliderStyle({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
        opacity: 1,
      });
    }
  }, [activeTab, isRendered, client]);

  if (!isRendered || !client) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
      {/* Backdrop — no blur as requested */}
      <div
        className={`fixed inset-0 bg-stone-900/20 transition-opacity duration-300 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
      />

      {/* Drawer Body — smooth slide in & out */}
      <aside
        className={`relative w-full max-w-[480px] bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden border-l border-stone-200/80 transition-transform duration-300 ease-out transform ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Top Close Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <RiArrowLeftLine className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Client Header Info */}
        <div className="px-6 pb-5 flex flex-col gap-3 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-start justify-between">
            {/* Two-Square Icon Container */}
            <div className="w-11 h-11 bg-stone-200/80 rounded-2xl flex items-center justify-center flex-shrink-0">
              <div className="w-8 h-8 bg-white rounded-xl shadow-1 flex items-center justify-center text-stone-800">
                {client.business_name ? <RiBuildingLine className="w-4 h-4" /> : <RiUser3Line className="w-4 h-4" />}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<RiPencilLine className="w-3.5 h-3.5" />}
              onClick={() => onEditClient(client)}
              className="text-xs !py-1.5 shadow-2xs"
            >
              Edit
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight leading-snug">
              {client.name}
            </h2>
            {client.business_name && (
              <p className="text-xs font-medium text-stone-500 mt-0.5">{client.business_name}</p>
            )}
          </div>

          <div className="border-y border-stone-100 py-2.5 my-1 flex items-center justify-between text-xs text-stone-500">
            <span className="flex items-center gap-1.5 text-stone-600 font-medium">
              <RiFileTextLine className="w-3.5 h-3.5 text-stone-400" />
              <span>Client ID</span>
            </span>
            <span className="font-mono text-stone-900 font-medium">CLI_{client.id}</span>
          </div>
        </div>

        {/* Segmented Status Filter Style Tab Navigation */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div
            ref={containerRef}
            className="relative flex bg-stone-200/80 p-0.5 rounded-xl w-full shadow-sm text-xs font-medium select-none items-center gap-0.5"
          >
            {/* Sliding background highlight pill */}
            <div
              style={{
                transform: `translateX(${sliderStyle.left}px)`,
                width: `${sliderStyle.width}px`,
                opacity: sliderStyle.opacity,
              }}
              className="absolute top-0.5 bottom-0.5 left-0 bg-white rounded-lg shadow-1 transition-all duration-300 ease-out pointer-events-none"
            />

            {tabs.map((tab) => {
              const isSelected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  ref={(el) => { buttonRefs.current[tab.key] = el; }}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative z-10 flex-1 flex items-center justify-center py-1.5 px-3 rounded-lg transition-all duration-150 border-0 cursor-pointer text-xs font-medium bg-transparent ${
                    isSelected ? 'text-stone-900 font-semibold' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all duration-150 ${
                      isSelected ? 'bg-stone-100 text-stone-900' : 'bg-stone-300/80 text-stone-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">
          {activeTab === 'overview' && (
            <>

              {/* Basic Information */}
              <div>
                <h3 className="text-base font-bold text-stone-900 mb-3.5">
                  Basic Information
                </h3>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-stone-500 font-normal">Contact Name</span>
                    <span className="font-medium text-stone-900">{client.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-stone-500 font-normal">Business / Company</span>
                    <span className="font-medium text-stone-900">{client.business_name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-stone-500 font-normal">Primary Email</span>
                    <span className="font-medium text-stone-900">{client.email || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-stone-500 font-normal">Phone Number</span>
                    <span className="font-medium text-stone-900">{client.phone || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h3 className="text-base font-bold text-stone-900 mb-3.5">
                  Billing Address
                </h3>
                <div className="bg-stone-100 rounded-xl p-3.5 border-0">
                  <p className="text-xs text-stone-700 leading-relaxed font-regular">
                    {client.address || 'No billing address specified for this client.'}
                  </p>
                  {client.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-stone-900 hover:underline inline-flex items-center gap-1 mt-2.5"
                    >
                      View in Google Maps →
                    </a>
                  )}
                </div>
              </div>

              {onCreateInvoice && (
                <div className="pt-2">
                  <Button
                    variant="primary"
                    fullWidth
                    leftIcon={<RiAddLine className="w-4 h-4" />}
                    onClick={() => onCreateInvoice(client)}
                  >
                    Create Invoice for {client.name}
                  </Button>
                </div>
              )}
            </>
          )}

          {activeTab === 'outstanding' && (
            <div className="flex flex-col gap-2.5">
              <h3 className="text-base font-bold text-stone-900 mb-3">
                Outstanding Invoices ({outstandingInvoices.length})
              </h3>

              {outstandingInvoices.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center bg-stone-100 rounded-2xl border border-dashed border-stone-200">
                  <RiCheckboxCircleFill className="w-8 h-8 text-stone-300 mb-2" />
                  <p className="text-xs font-medium text-stone-600">All clear!</p>
                  <p className="text-xs text-stone-400 mt-0.5">This client has no outstanding invoices.</p>
                </div>
              ) : (
                outstandingInvoices.map((inv) => {
                  const status = inv.status.split('|')[0] || 'draft';
                  return (
                    <div
                      key={inv.id}
                      className="bg-stone-100 hover:bg-stone-200/60 rounded-xl px-4 py-3.5 transition-all flex items-center justify-between border-0"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13.5px] font-semibold text-stone-900 leading-snug">{inv.invoice_number}</span>
                        <span className="text-[11.5px] text-stone-500 font-normal">{inv.due_date ? `Due ${inv.due_date}` : inv.date || '—'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge invoiceStatus={status}>{status}</Badge>
                        <span className="text-sm font-semibold text-stone-900">
                          {formatCurrency(inv.price || 0)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="flex flex-col gap-2.5">
              <h3 className="text-base font-bold text-stone-900 mb-3">
                All Client Invoices ({clientInvoices.length})
              </h3>

              {clientInvoices.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center bg-stone-100 rounded-2xl border border-dashed border-stone-200">
                  <RiFileTextLine className="w-8 h-8 text-stone-300 mb-2" />
                  <p className="text-xs font-medium text-stone-600">No invoices</p>
                  <p className="text-xs text-stone-400 mt-0.5">No invoices recorded for this client yet.</p>
                </div>
              ) : (
                clientInvoices.map((inv) => {
                  const status = inv.status.split('|')[0] || 'draft';
                  return (
                    <div
                      key={inv.id}
                      className="bg-stone-100 hover:bg-stone-200/60 rounded-xl px-4 py-3.5 transition-all flex items-center justify-between border-0"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13.5px] font-semibold text-stone-900 leading-snug">{inv.invoice_number}</span>
                        <span className="text-[11.5px] text-stone-500 font-normal">{inv.date || inv.due_date || '—'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge invoiceStatus={status}>{status}</Badge>
                        <span className="text-sm font-semibold text-stone-900">
                          {formatCurrency(inv.price || 0)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
