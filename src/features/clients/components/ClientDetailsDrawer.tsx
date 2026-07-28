import React, { useState, useEffect } from 'react';
import {
  RiArrowLeftLine,
  RiUser3Line,
  RiBuildingLine,
  RiPencilLine,
  RiAddLine,
  RiFileTextLine,
  RiCheckboxCircleFill,
  RiArrowDownSLine
} from 'react-icons/ri';
import { Client, Invoice } from '../../../types/models';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { InvoiceStatusFilterPill, FilterPillOption } from '../../../components/invoice/InvoiceStatusFilterPill';

type DrawerTab = 'overview' | 'outstanding' | 'invoices';

interface ClientDetailsDrawerProps {
  client: Client | null;
  invoices: Invoice[];
  onClose: () => void;
  onEditClient?: (client: Client) => void;
  onClientUpdated?: () => void;
  onCreateInvoice?: (client: Client) => void;
}

interface ClientFormData {
  name: string;
  business_name: string;
  email: string;
  address: string;
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
  onClientUpdated,
  onCreateInvoice
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
  const [isRendered, setIsRendered] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Inline Editing state inside drawer
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<ClientFormData>({
    name: '',
    business_name: '',
    email: '',
    address: '',
  });
  const [countryCode, setCountryCode] = useState<string>('+61');
  const [rawPhone, setRawPhone] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Reset inline edit state when client changes
  useEffect(() => {
    setIsEditing(false);
    setError('');
  }, [client]);

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

  /** Initialises inline edit mode with current client details. */
  const startEditing = (): void => {
    if (!client) {
      return;
    }
    setEditForm({
      name: client.name || '',
      business_name: client.business_name || '',
      email: client.email || '',
      address: client.address || '',
    });
    const phoneStr = client.phone || '';
    if (phoneStr.startsWith('+1 ')) {
      setCountryCode('+1');
      setRawPhone(phoneStr.slice(3));
    } else if (phoneStr.startsWith('+61 ')) {
      setCountryCode('+61');
      setRawPhone(phoneStr.slice(4));
    } else if (phoneStr.startsWith('+44 ')) {
      setCountryCode('+44');
      setRawPhone(phoneStr.slice(4));
    } else if (phoneStr.startsWith('+64 ')) {
      setCountryCode('+64');
      setRawPhone(phoneStr.slice(4));
    } else if (phoneStr.startsWith('+81 ')) {
      setCountryCode('+81');
      setRawPhone(phoneStr.slice(4));
    } else {
      setCountryCode('+61');
      setRawPhone(phoneStr);
    }
    setError('');
    setIsEditing(true);
    setActiveTab('overview');
  };

  /** Saves inline edited client details to backend storage. */
  const handleSaveInline = async (): Promise<void> => {
    if (!client) {
      return;
    }
    if (!editForm.name.trim()) {
      setError('Name is required.');
      return;
    }
    const formattedPhone = rawPhone.trim() ? `${countryCode} ${rawPhone.trim()}` : '';
    try {
      setIsSaving(true);
      await window.electronAPI.updateClient({
        id: client.id,
        name: editForm.name,
        businessName: editForm.business_name,
        email: editForm.email,
        phone: formattedPhone,
        address: editForm.address,
      });
      client.name = editForm.name;
      client.business_name = editForm.business_name;
      client.email = editForm.email;
      client.phone = formattedPhone;
      client.address = editForm.address;
      setIsEditing(false);
      setError('');
      if (onClientUpdated) {
        onClientUpdated();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save client.');
    } finally {
      setIsSaving(false);
    }
  };

  const clientInvoices = client ? invoices.filter(inv => inv.client_id === client.id) : [];
  const outstandingInvoices = clientInvoices.filter(inv => inv.status.split('|')[0] !== 'paid');

  // Tab definitions matching InvoicesPage status filter style
  const tabs: FilterPillOption<DrawerTab>[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'outstanding', label: 'Outstanding', count: outstandingInvoices.length > 0 ? outstandingInvoices.length : undefined },
    { key: 'invoices', label: 'Invoices', count: clientInvoices.length > 0 ? clientInvoices.length : undefined },
  ];

  if (!isRendered || !client) {
    return null;
  }

  let saveButtonLabel = 'Save';
  if (isSaving) {
    saveButtonLabel = 'Saving…';
  }

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

            {isEditing ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="text-xs !py-1.5"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveInline}
                  disabled={isSaving}
                  className="text-xs !py-1.5"
                >
                  {saveButtonLabel}
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RiPencilLine className="w-3.5 h-3.5" />}
                onClick={startEditing}
                className="text-xs !py-1.5"
              >
                Edit
              </Button>
            )}
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
          <InvoiceStatusFilterPill
            options={tabs}
            value={activeTab}
            onChange={setActiveTab}
            fullWidth
          />
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">
          {activeTab === 'overview' && (
            isEditing ? (
              <div className="flex flex-col gap-4">
                <h3 className="text-base text-black font-medium select-none">
                  Edit Client Details
                </h3>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Input
                  label="Contact Name"
                  name="name"
                  value={editForm.name}
                  onChange={(val) => setEditForm(prev => ({ ...prev, name: val }))}
                  required
                />

                <Input
                  label="Business / Company"
                  name="business_name"
                  value={editForm.business_name}
                  onChange={(val) => setEditForm(prev => ({ ...prev, business_name: val }))}
                />

                <div className="flex flex-col gap-1 w-full">
                  <label className="text-xs font-medium text-stone-500 tracking-wide select-none">
                    Phone Number
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-shrink-0">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="h-9 px-3 text-[14px] text-stone-900 bg-white border border-transparent rounded-xl shadow-1 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 appearance-none pr-8 cursor-pointer transition-all duration-150"
                      >
                        <option value="+61">🇦🇺 +61</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+64">🇳🇿 +64</option>
                        <option value="+81">🇯🇵 +81</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                        <RiArrowDownSLine className="w-4 h-4" />
                      </div>
                    </div>
                    <Input
                      name="phone"
                      value={rawPhone}
                      onChange={setRawPhone}
                      placeholder="412 345 678"
                      type="tel"
                      className="flex-1"
                    />
                  </div>
                </div>

                <Input
                  label="Primary Email"
                  name="email"
                  type="email"
                  value={editForm.email}
                  onChange={(val) => setEditForm(prev => ({ ...prev, email: val }))}
                />

                <Input
                  label="Billing Address"
                  name="address"
                  value={editForm.address}
                  onChange={(val) => setEditForm(prev => ({ ...prev, address: val }))}
                  multiline
                  autoGrow
                  rows={3}
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveInline}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Basic Information */}
                <div>
                  <h3 className="text-base text-black font-medium select-none mb-3.5">
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
                  <h3 className="text-base text-black font-medium select-none mb-3.5">
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
            )
          )}

          {activeTab === 'outstanding' && (
            <div className="flex flex-col gap-2.5">
              <h3 className="text-base text-black font-medium select-none mb-3">
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
              <h3 className="text-base text-black font-medium select-none mb-3">
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
