import React, { useState, useRef, useEffect } from 'react';
import { RiAddLine, RiDeleteBinLine, RiPencilLine, RiDraggable, RiUserLine, RiHashtag, RiArrowDownSLine } from 'react-icons/ri';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Client } from '../../types';
import { Input } from '../Input';
import { DatePicker } from '../DatePicker';
import { Dropdown } from '../Dropdown';
import { Button } from '../Button';
import { InvoiceFormState, LineItem } from './invoiceTypes';
import { templates } from './templates/registry';

interface InvoiceFormProps {
  form: InvoiceFormState;
  clients: Client[];
  onChange: (next: Partial<InvoiceFormState>) => void;
}

/** Format a currency value for display in the summary badge. */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Format an ISO date string to a short display format (e.g. "8 Jul"). */
function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/**
 * Left-panel form for composing a new invoice.
 * All state lives in the parent; this component is purely presentational.
 */
export const InvoiceForm: React.FC<InvoiceFormProps> = ({ form, clients, onChange }) => {
  const selectedClient = clients.find(c => c.id === form.clientId) ?? null;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      quantity: type === 'materials' ? 1 : 0,
      hours: type === 'labour' ? 1 : undefined,
      date: type === 'labour' ? new Date().toISOString().slice(0, 10) : undefined,
      unitPrice: 0,
    };
    onChange({ items: [...form.items, newItem] });
    // Auto-expand newly created item for editing
    setEditingItemId(newItem.id);
  };

  const removeItem = (id: string): void => {
    if (editingItemId === id) setEditingItemId(null);
    onChange({ items: form.items.filter(item => item.id !== id) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeItem = form.items.find(i => i.id === active.id);
    const overItem = form.items.find(i => i.id === over.id);

    // Only allow reordering within the same type
    if (activeItem && overItem && activeItem.type === overItem.type) {
      const oldIndex = form.items.findIndex(i => i.id === active.id);
      const newIndex = form.items.findIndex(i => i.id === over.id);
      onChange({ items: arrayMove(form.items, oldIndex, newIndex) });
    }
  };

  const templateOptions = templates.map(t => ({ value: t.id, label: t.name }));
  const selectedTemplateName = templates.find(t => t.id === form.templateId)?.name || 'Classic';

  const labourItems = form.items.filter(item => item.type === 'labour');
  const materialItems = form.items.filter(item => item.type === 'materials');

  return (
    <div className="flex flex-col gap-5">
      {/* ── Invoice Details ── */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Invoice number"
            name="invoiceNumber"
            value={form.invoiceNumber}
            onChange={(val) => onChange({ invoiceNumber: val })}
            icon={<RiHashtag className="w-4 h-4" />}
            placeholder="INV-001"
          />
          <Dropdown
            options={templateOptions}
            onSelect={(val) => onChange({ templateId: val })}
            triggerLabel={selectedTemplateName}
            variant="input"
            value={form.templateId}
            placeholder="Select template…"
            widthClass="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DatePicker
            label="Date issued"
            value={form.dateIssued}
            onChange={(val) => onChange({ dateIssued: val })}
          />
          <div className="flex flex-col gap-1">
            <DatePicker
              label="Due date"
              value={form.dueDate}
              onChange={(val) => onChange({ dueDate: val })}
            />
            <label className="flex items-center gap-2 cursor-pointer select-none mt-1 pl-0.5">
              <button
                type="button"
                onClick={() => onChange({ displayDueDate: !form.displayDueDate })}
                className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${form.displayDueDate ? 'bg-stone-800' : 'bg-stone-300'}`}
              >
                <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${form.displayDueDate ? 'translate-x-3' : 'translate-x-0'}`} />
              </button>
              <span className="text-[11px] text-stone-450 font-regular">
                {form.displayDueDate ? 'Shown on invoice' : 'Hidden from invoice'}
              </span>
            </label>
          </div>
        </div>

        {/* Client selector */}
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
              icon={<RiUserLine className="w-4 h-4" />}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
              <RiArrowDownSLine className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-stone-600/95 backdrop-blur-md border border-white/5 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
                {filteredClients.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {filteredClients.map(c => {
                      const isClientSelected = c.id === form.clientId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onChange({ clientId: c.id });
                            setIsOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl transition-all duration-150 flex flex-col gap-0.5
                            ${isClientSelected ? 'bg-white/10 text-white shadow-sm' : 'text-stone-200 hover:bg-white/5'}
                          `}
                        >
                          <span className="text-xs font-normal">{c.name}</span>
                          {c.business_name && (
                            <span className="text-[10px] text-stone-300/80 mt-0.5">{c.business_name}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-stone-300 py-3 text-center select-none">No clients found</p>
                )}
              </div>
            )}
          </div>

          {selectedClient && (
            <div className="mt-1 rounded-xl bg-stone-200 px-4 py-2.5 flex flex-col gap-0.5">
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
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-stone-200/80" />

      {/* ── Line Items ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col gap-2">
          {/* Labour items */}
          {labourItems.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Labour</span>
              <SortableContext
                items={labourItems.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {labourItems.map((item) => (
                  <SortableLineItemCard
                    key={item.id}
                    item={item}
                    isEditing={editingItemId === item.id}
                    onEdit={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
                    onDelete={() => removeItem(item.id)}
                    onUpdate={(patch) => updateItem(item.id, patch)}
                  />
                ))}
              </SortableContext>
            </div>
          )}

          {/* Materials items */}
          {materialItems.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Materials</span>
              <SortableContext
                items={materialItems.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {materialItems.map((item) => (
                  <SortableLineItemCard
                    key={item.id}
                    item={item}
                    isEditing={editingItemId === item.id}
                    onEdit={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
                    onDelete={() => removeItem(item.id)}
                    onUpdate={(patch) => updateItem(item.id, patch)}
                  />
                ))}
              </SortableContext>
            </div>
          )}

          {/* Add buttons */}
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" leftIcon={<RiAddLine className="w-3.5 h-3.5" />} onClick={() => addItem('labour')}>
              Labour
            </Button>
            <span className="text-stone-300 text-xs select-none">·</span>
            <Button type="button" variant="ghost" size="sm" leftIcon={<RiAddLine className="w-3.5 h-3.5" />} onClick={() => addItem('materials')}>
              Material
            </Button>
          </div>
        </div>
      </DndContext>

      {/* ── Divider ── */}
      <div className="h-px bg-stone-200/80" />

      {/* ── Totals Bar ── */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ gstEnabled: !form.gstEnabled })}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${form.gstEnabled ? 'bg-stone-800' : 'bg-stone-300'}`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${form.gstEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <span className="text-xs font-regular text-stone-600 select-none">GST (10%)</span>
        </div>
        <div className="h-4 w-px bg-stone-200" />
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-regular text-stone-600 select-none flex-shrink-0">Discount</span>
          <Input
            name="discount"
            type="number"
            value={form.discount > 0 ? String(form.discount) : ''}
            onChange={(val) => onChange({ discount: Number(val) || 0 })}
            placeholder="$0.00"
            className="max-w-[120px]"
          />
        </div>
      </div>

      {/* ── Notes ── */}
      <Input
        label="Notes"
        name="notes"
        value={form.notes}
        onChange={(val) => onChange({ notes: val })}
        multiline
        autoGrow
        placeholder="Payment terms, bank details, or any other notes…"
      />

    </div>
  );
};

/* ─── Line Item Card ─── */

interface SortableLineItemCardProps {
  item: LineItem;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<LineItem>) => void;
}

const SortableLineItemCard: React.FC<SortableLineItemCardProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <LineItemCard {...props} dragHandleProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  );
};

interface LineItemCardProps extends SortableLineItemCardProps {
  dragHandleProps: any;
  isDragging: boolean;
}

/**
 * Compact card for a line item. Shows a summary row by default;
 * expands inline editing fields when the edit button is clicked.
 */
const LineItemCard: React.FC<LineItemCardProps> = ({
  item, isEditing, onEdit, onDelete, onUpdate, dragHandleProps, isDragging
}) => {
  /** Build a short summary badge string for the collapsed state. */
  const summaryBadge = item.type === 'labour'
    ? `${item.hours ?? item.quantity ?? 0} hrs · ${formatCurrency(item.unitPrice)}/hr`
    : `${item.quantity} × ${formatCurrency(item.unitPrice)}`;

  const total = item.type === 'labour'
    ? (item.hours ?? item.quantity ?? 0) * item.unitPrice
    : item.quantity * item.unitPrice;

  return (
    <div
      className={`rounded-xl border bg-white transition-shadow duration-150 ${isDragging ? 'border-stone-400 shadow-md' : 'shadow-sm'} ${isEditing && !isDragging ? 'border-stone-400 ring-2 ring-stone-400 ring-offset-1' : 'border-stone-200/80'}`}
    >
      {/* Summary row — always visible */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-stone-350 hover:text-stone-500 transition-colors focus:outline-none"
        >
          <RiDraggable className="w-4 h-4" />
        </div>

        {/* Description + badge */}
        <div className="flex-1 flex items-center gap-2 min-w-0" onClick={onEdit}>
          <span className="text-sm font-medium text-stone-900 truncate cursor-pointer">
            {item.description || 'Untitled'}
          </span>
          <span className="text-[11px] font-regular text-stone-500 bg-stone-100 px-2 py-0.5 rounded-lg flex-shrink-0 select-none">
            {summaryBadge}
          </span>
          {total > 0 && (
            <span className="text-[11px] font-medium text-stone-700 flex-shrink-0 ml-auto select-none">
              {formatCurrency(total)}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'text-stone-800 bg-stone-200' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'}`}
          >
            <RiPencilLine className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <RiDeleteBinLine className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded edit fields — revealed on edit click */}
      {isEditing && (
        <div className="px-3 pb-3 pt-1 border-t border-stone-100 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <Input
            label="Description"
            value={item.description}
            onChange={(val) => onUpdate({ description: val })}
            placeholder={item.type === 'labour' ? 'e.g. Code Review, Wiring...' : 'Material description'}
            name={`desc-${item.id}`}
            autoFocus
          />

          {item.type === 'labour' ? (
            <div className="grid gap-2" style={{ gridTemplateColumns: '1.5fr 0.75fr 0.75fr' }}>
              <DatePicker
                label="Date"
                value={item.date || ''}
                onChange={(val) => onUpdate({ date: val })}
              />
              <Input
                label="Hours"
                value={item.hours !== undefined ? String(item.hours) : String(item.quantity)}
                onChange={(val) => onUpdate({ hours: Number(val) || 0 })}
                type="number"
                name={`hours-${item.id}`}
                placeholder="0"
              />
              <Input
                label="Rate/hr"
                value={String(item.unitPrice)}
                onChange={(val) => onUpdate({ unitPrice: Number(val) || 0 })}
                type="number"
                name={`price-${item.id}`}
                placeholder="0.00"
              />
            </div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <Input
                label="Quantity"
                value={String(item.quantity)}
                onChange={(val) => onUpdate({ quantity: Number(val) || 0 })}
                type="number"
                name={`qty-${item.id}`}
                placeholder="1"
              />
              <Input
                label="Unit price"
                value={String(item.unitPrice)}
                onChange={(val) => onUpdate({ unitPrice: Number(val) || 0 })}
                type="number"
                name={`price-${item.id}`}
                placeholder="0.00"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
