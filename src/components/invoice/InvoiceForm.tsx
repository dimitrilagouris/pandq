import React, { useState, useRef, useEffect } from 'react';
import { TbPlus, TbTrash, TbCalendar, TbUser, TbHash, TbChevronDown } from 'react-icons/tb';
import { Client } from '../../types';
import { Input } from '../Input';
import { Button } from '../Button';
import { InvoiceFormState, LineItem } from './invoiceTypes';

interface InvoiceFormProps {
  form: InvoiceFormState;
  clients: Client[];
  onChange: (next: Partial<InvoiceFormState>) => void;
}

/**
 * Left-panel form for composing a new invoice.
 * All state lives in the parent; this component is purely presentational.
 */
export const InvoiceForm: React.FC<InvoiceFormProps> = ({ form, clients, onChange }) => {
  const selectedClient = clients.find(c => c.id === form.clientId) ?? null;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClients = clients.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.business_name && c.business_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const updateItem = (id: string, patch: Partial<LineItem>): void => {
    onChange({
      items: form.items.map(item => item.id === id ? { ...item, ...patch } : item),
    });
  };

  const addItem = (type: 'labour' | 'materials'): void => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      type,
      description: '',
      quantity: 1,
      unitPrice: 0,
    };
    onChange({ items: [...form.items, newItem] });
  };

  const removeItem = (id: string): void => {
    onChange({ items: form.items.filter(item => item.id !== id) });
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Invoice Information ── */}
      <Section title="Invoice Information">
        <Input
          label="Invoice number"
          name="invoiceNumber"
          value={form.invoiceNumber}
          onChange={(val) => onChange({ invoiceNumber: val })}
          icon={<TbHash className="w-4 h-4" />}
          placeholder="INV-001"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date issued"
            name="dateIssued"
            type="date"
            value={form.dateIssued}
            onChange={(val) => onChange({ dateIssued: val })}
            icon={<TbCalendar className="w-4 h-4" />}
          />
          <Input
            label="Due date"
            name="dueDate"
            type="date"
            value={form.dueDate}
            onChange={(val) => onChange({ dueDate: val })}
            icon={<TbCalendar className="w-4 h-4" />}
          />
        </div>
      </Section>

      {/* ── Billed To ── */}
      <Section title="Billed To">
        <div className="flex flex-col gap-1 w-full" ref={dropdownRef}>
          <label className="text-xs font-medium text-stone-500 tracking-wide">Client</label>
          <div className="relative">
            <Input
              value={isOpen ? searchQuery : (selectedClient ? (selectedClient.business_name ? `${selectedClient.name} · ${selectedClient.business_name}` : selectedClient.name) : '')}
              onChange={(val) => {
                setSearchQuery(val);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => {
                setIsOpen(true);
                setSearchQuery('');
              }}
              placeholder="Search client by name, business..."
              icon={<TbUser className="w-4 h-4" />}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
              <TbChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 border border-stone-200/80 rounded-xl shadow-22 max-h-60 overflow-y-auto">
                {filteredClients.length > 0 ? (
                  <div className="py-1">
                    {filteredClients.map(c => {
                      const isSelected = c.id === form.clientId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onChange({ clientId: c.id });
                            setIsOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors flex flex-col gap-0.5
                            ${isSelected ? 'bg-stone-200/50 text-stone-950 font-medium' : 'text-stone-900 hover:bg-stone-200/30'}
                          `}
                        >
                          <span className="font-medium">{c.name}</span>
                          {c.business_name && (
                            <span className="text-xs text-stone-500">{c.business_name}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 py-3 text-center">No clients found</p>
                )}
              </div>
            )}
          </div>

          {/* Selected client detail pill */}
          {selectedClient && (
            <div className="mt-1.5 rounded-xl bg-stone-200 px-4 py-3 flex flex-col gap-0.5">
              <span className="text-sm font-medium text-stone-950">
                {selectedClient.business_name || selectedClient.name}
              </span>
              {selectedClient.email && (
                <span className="text-xs text-stone-600">{selectedClient.email}</span>
              )}
              {selectedClient.address && (
                <span className="text-xs text-stone-600">{selectedClient.address}</span>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* ── Labour Section ── */}
      <Section title="Labour">
        {/* Column headers */}
        {form.items.some(item => item.type === 'labour') && (
          <div className="grid items-center gap-2 px-1" style={{ gridTemplateColumns: '1fr 72px 96px 32px' }}>
            <span className="text-xs font-medium text-stone-400">Description</span>
            <span className="text-xs font-medium text-stone-400 text-center">Quantity</span>
            <span className="text-xs font-medium text-stone-400 text-right">Cost/hr</span>
            <span />
          </div>
        )}

        {/* Item rows */}
        {form.items
          .filter(item => item.type === 'labour')
          .map((item) => (
            <div key={item.id} className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 72px 96px 32px' }}>
              <Input
                value={item.description}
                onChange={(val) => updateItem(item.id, { description: val })}
                placeholder="Labour description"
                name={`desc-${item.id}`}
              />
              <Input
                value={String(item.quantity)}
                onChange={(val) => updateItem(item.id, { quantity: Number(val) || 0 })}
                type="number"
                name={`qty-${item.id}`}
                placeholder="1"
              />
              <Input
                value={String(item.unitPrice)}
                onChange={(val) => updateItem(item.id, { unitPrice: Number(val) || 0 })}
                type="number"
                name={`price-${item.id}`}
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="flex items-center justify-center w-8 h-8 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <TbTrash className="w-4 h-4" />
              </button>
            </div>
          ))}

        {/* Divider with centred add button */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-stone-200" />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<TbPlus className="w-3.5 h-3.5" />}
            onClick={() => addItem('labour')}
          >
            Add Labour Item
          </Button>
          <div className="flex-1 h-px bg-stone-200" />
        </div>
      </Section>

      {/* ── Materials Section ── */}
      <Section title="Materials">
        {/* Column headers */}
        {form.items.some(item => item.type === 'materials') && (
          <div className="grid items-center gap-2 px-1" style={{ gridTemplateColumns: '1fr 72px 96px 32px' }}>
            <span className="text-xs font-medium text-stone-400">Description</span>
            <span className="text-xs font-medium text-stone-400 text-center">Quantity</span>
            <span className="text-xs font-medium text-stone-400 text-right">Cost</span>
            <span />
          </div>
        )}

        {/* Item rows */}
        {form.items
          .filter(item => item.type === 'materials')
          .map((item) => (
            <div key={item.id} className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 72px 96px 32px' }}>
              <Input
                value={item.description}
                onChange={(val) => updateItem(item.id, { description: val })}
                placeholder="Material description"
                name={`desc-${item.id}`}
              />
              <Input
                value={String(item.quantity)}
                onChange={(val) => updateItem(item.id, { quantity: Number(val) || 0 })}
                type="number"
                name={`qty-${item.id}`}
                placeholder="1"
              />
              <Input
                value={String(item.unitPrice)}
                onChange={(val) => updateItem(item.id, { unitPrice: Number(val) || 0 })}
                type="number"
                name={`price-${item.id}`}
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="flex items-center justify-center w-8 h-8 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <TbTrash className="w-4 h-4" />
              </button>
            </div>
          ))}

        {/* Divider with centred add button */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-stone-200" />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<TbPlus className="w-3.5 h-3.5" />}
            onClick={() => addItem('materials')}
          >
            Add Material Item
          </Button>
          <div className="flex-1 h-px bg-stone-200" />
        </div>
      </Section>

      {/* ── Totals Configuration ── */}
      <Section title="Totals">
        <div className="grid grid-cols-2 gap-3">
          {/* GST Toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500 tracking-wide">GST (10%)</label>
            <div className="flex items-center h-10">
              <button
                type="button"
                onClick={() => onChange({ gstEnabled: !form.gstEnabled })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out shadow-3 ${
                  form.gstEnabled ? 'bg-stone-800' : 'bg-stone-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-1 ring-0 transition duration-200 ease-in-out ${
                    form.gstEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-stone-700 ml-3 select-none">
                {form.gstEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Discount */}
          <Input
            label="Discount (optional)"
            name="discount"
            type="number"
            value={form.discount > 0 ? String(form.discount) : ''}
            onChange={(val) => onChange({ discount: Number(val) || 0 })}
            placeholder="$0.00"
          />
        </div>
      </Section>

      {/* ── Notes ── */}
      <Section title="Notes">
        <Input
          name="notes"
          value={form.notes}
          onChange={(val) => onChange({ notes: val })}
          multiline
          autoGrow
          placeholder="Payment terms, bank details, or any other notes…"
        />
      </Section>

    </div>
  );
};

/** Simple section wrapper with a title. */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-3">
    <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
    {children}
  </div>
);
