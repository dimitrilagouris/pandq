import React, { useState, useRef, useEffect } from 'react';
import {
  RiAddLine,
  RiUser3Line,
  RiHashtag,
  RiArrowDownSLine,
  RiCloseLine,
} from 'react-icons/ri';
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
} from '@dnd-kit/sortable';

import { Client } from '../../types/models';
import { Input } from '../common/Input.tsx';
import { DatePicker } from '../common/DatePicker.tsx';
import { Button } from '../common/Button.tsx';
import { HelpBadge } from '../common/HelpBadge.tsx';
import { Toggle } from '../common/Toggle.tsx';
import { CollapsibleSection } from './CollapsibleSection.tsx';
import { InvoiceFormState, LineItem } from './invoiceTypes';
import { TemplateSelector } from './TemplateSelector';
import { SortableLineItemCard } from './SortableLineItemCard';

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
  if (!dateStr) {
    return '';
  }
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return dateStr;
  }
  const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/**
 * Left-panel form for composing a new invoice.
 * All state lives in the parent; this component is purely presentational.
 */
export const InvoiceForm: React.FC<InvoiceFormProps> = React.memo(({ form, clients, onChange }) => {
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const selectedClient = clients.find(c => c.id === form.clientId) ?? null;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // Section toggle states
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [isItemsOpen, setIsItemsOpen] = useState(true);
  const [isTemplateOpen, setIsTemplateOpen] = useState(true);
  const [isOptionsOpen, setIsOptionsOpen] = useState(true);
  
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
      workers: type === 'labour' ? [{ id: crypto.randomUUID(), name: '', hours: 1, rate: 0 }] : undefined,
    };
    onChange({ items: [...form.items, newItem] });
    setEditingItemId(newItem.id);
  };

  const removeItem = (id: string): void => {
    if (editingItemId === id) {
      setEditingItemId(null);
    }
    onChange({ items: form.items.filter(item => item.id !== id) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const activeItem = form.items.find(i => i.id === active.id);
    const overItem = form.items.find(i => i.id === over.id);

    // Only allow reordering within the same type
    if (activeItem && overItem && activeItem.type === overItem.type) {
      const oldIndex = form.items.findIndex(i => i.id === active.id);
      const newIndex = form.items.findIndex(i => i.id === over.id);
      onChange({ items: arrayMove(form.items, oldIndex, newIndex) });
    }
  };



  const labourItems = form.items.filter(item => item.type === 'labour');
  const materialItems = form.items.filter(item => item.type === 'materials');

  return (
    <div className="flex flex-col gap-5">
      {/* ── Invoice Details ── */}
      <CollapsibleSection
        title="Invoice Details"
        isOpen={isDetailsOpen}
        onToggle={() => setIsDetailsOpen(!isDetailsOpen)}
      >
        {/* Client selector */}
        <div className="flex flex-col gap-1 w-full" ref={dropdownRef}>
          <label className="text-xs font-medium text-stone-500 tracking-wide">Bill To</label>
          <div className="relative">
            <div 
              className={`w-full bg-white border rounded-xl shadow-1 p-3 flex items-center gap-3 transition-all cursor-text ${isOpen ? 'border-stone-400 ring-2 ring-stone-400 ring-offset-1' : 'border-transparent hover:border-stone-300'}`}
              onClick={() => {
                if (!isOpen) {
                  setIsOpen(true);
                  setSearchQuery('');
                }
              }}
            >
              <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
                {(!isOpen && selectedClient) ? (
                  <span className="text-stone-500 font-medium text-sm">{selectedClient.name.charAt(0).toUpperCase()}</span>
                ) : (
                  <RiUser3Line className="w-5 h-5 text-stone-400" />
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0 justify-center">
                {(!isOpen && selectedClient) ? (
                  <div className="flex flex-col cursor-pointer">
                    <span className="text-sm font-medium text-stone-900 truncate">{selectedClient.business_name || selectedClient.name}</span>
                    {(selectedClient.email || selectedClient.address) && (
                      <span className="text-xs text-stone-500 truncate mt-0.5">
                        {[selectedClient.email, selectedClient.address].filter(Boolean).join(' • ')}
                      </span>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="w-full bg-transparent outline-none text-sm font-regular text-stone-900 placeholder-stone-400"
                    placeholder={selectedClient ? "Search to change client..." : "Search client by name, business..."}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setFocusedIndex(0);
                      if (!isOpen) {
                        setIsOpen(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!isOpen) {
                        if (e.key === 'ArrowDown' || e.key === 'Enter') {
                          setIsOpen(true);
                        }
                        return;
                      }
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setFocusedIndex(prev => {
                          const next = prev < filteredClients.length - 1 ? prev + 1 : prev;
                          itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
                          return next;
                        });
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setFocusedIndex(prev => {
                          const next = prev > 0 ? prev - 1 : prev;
                          itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
                          return next;
                        });
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (filteredClients[focusedIndex]) {
                          onChange({ clientId: filteredClients[focusedIndex].id });
                          setIsOpen(false);
                          setSearchQuery('');
                        }
                      } else if (e.key === 'Escape') {
                        setIsOpen(false);
                      }
                    }}
                    autoFocus
                  />
                )}
              </div>
              <RiArrowDownSLine className={`w-4 h-4 text-stone-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-stone-700/95 backdrop-blur-md border border-white/5 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-dropdown-pop">
                <div className="flex flex-col gap-0.5 overflow-y-auto max-h-60 custom-scrollbar">
                  {filteredClients.length > 0 ? (
                    filteredClients.map((c, idx) => {
                      const isClientSelected = c.id === form.clientId;
                      const isFocused = idx === focusedIndex;
                      return (
                        <button
                          key={c.id}
                          ref={(el) => { itemRefs.current[idx] = el; }}
                          type="button"
                          onMouseEnter={() => setFocusedIndex(idx)}
                          onClick={() => {
                            onChange({ clientId: c.id });
                            setIsOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl transition-all duration-150 flex flex-col gap-0.5
                            ${isClientSelected ? 'bg-white/20 text-white shadow-sm' : isFocused ? 'bg-white/10 text-white' : 'text-stone-200 hover:bg-white/5'}
                          `}
                        >
                          <span className="text-xs font-normal">{c.name}</span>
                          {c.business_name && (
                            <span className="text-[10px] text-stone-300/80 mt-0.5">{c.business_name}</span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-xs text-stone-300 py-3 text-center select-none">No clients found</p>
                  )}
                </div>

                <div className="flex items-center gap-4 px-2 py-2 mt-0.5 border-t border-white/10 text-[10px] text-stone-300 select-none bg-stone-700/30 rounded-b-xl -mx-1.5 -mb-1.5 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      <kbd className="w-[18px] h-[18px] flex items-center justify-center bg-white/10 rounded-[4px] shadow-sm border border-white/5 text-white/90 font-sans text-[10px]">↑</kbd>
                      <kbd className="w-[18px] h-[18px] flex items-center justify-center bg-white/10 rounded-[4px] shadow-sm border border-white/5 text-white/90 font-sans text-[10px]">↓</kbd>
                    </div>
                    <span>to navigate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="w-[18px] h-[18px] flex items-center justify-center bg-white/10 rounded-[4px] shadow-sm border border-white/5 text-white/90 font-sans text-[10px]">↵</kbd>
                    <span>to select</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <kbd className="px-1.5 h-[18px] flex items-center justify-center bg-white/10 rounded-[4px] shadow-sm border border-white/5 text-white/90 font-sans text-[10px]">esc</kbd>
                    <span>to close</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Invoice number"
            name="invoiceNumber"
            value={form.invoiceNumber}
            onChange={(val) => onChange({ invoiceNumber: val })}
            icon={<RiHashtag className="w-4 h-4" />}
            placeholder="INV-001"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <DatePicker
            label="Date issued"
            value={form.dateIssued}
            onChange={(val) => onChange({ dateIssued: val })}
          />
          <DatePicker
            label="Due date"
            value={form.dueDate}
            onChange={(val) => onChange({ dueDate: val })}
          />
        </div>
      </CollapsibleSection>

      {/* ── Divider ── */}
      <div className="h-px bg-stone-200/80" />

      {/* ── Line Items ── */}
      <CollapsibleSection
        title="Invoice Items"
        isOpen={isItemsOpen}
        onToggle={() => setIsItemsOpen(!isItemsOpen)}
        headerActions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" leftIcon={<RiAddLine className="w-3.5 h-3.5" />} onClick={(e) => { e.stopPropagation(); addItem('labour'); }}>
              Labour
            </Button>
            <Button type="button" variant="ghost" size="sm" leftIcon={<RiAddLine className="w-3.5 h-3.5" />} onClick={(e) => { e.stopPropagation(); addItem('materials'); }}>
              Material
            </Button>
          </div>
        }
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-6">
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
          </div>
        </DndContext>
      </CollapsibleSection>

      {/* ── Divider ── */}
      <div className="h-px bg-stone-200/80" />

      {/* ── Template ── */}
      <CollapsibleSection
        title="Template"
        isOpen={isTemplateOpen}
        onToggle={() => setIsTemplateOpen(!isTemplateOpen)}
      >
        <TemplateSelector
          selectedTemplateId={form.templateId}
          onSelect={(val) => onChange({ templateId: val })}
        />
      </CollapsibleSection>

      {/* ── Divider ── */}
      <div className="h-px bg-stone-200/80" />

      {/* ── Additional Options ── */}
      <CollapsibleSection
        title="Additional Options"
        isOpen={isOptionsOpen}
        onToggle={() => setIsOptionsOpen(!isOptionsOpen)}
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <div className="flex flex-col gap-3">
              <Input
                label={
                  <span className="inline-flex items-center gap-1.5 select-none">
                    <span>Discount</span>
                    <HelpBadge 
                      tooltipText="Click to learn how flat and percentage discounts work." 
                      onClick={() => setIsDiscountModalOpen(true)} 
                    />
                  </span>
                }
                name="discount"
                type="number"
                value={form.discount > 0 ? String(form.discount) : ''}
                onChange={(val) => onChange({ discount: Number(val) || 0 })}
                placeholder={form.discountType === 'percentage' ? '0' : '0.00'}
                icon={
                  <button
                    type="button"
                    onClick={() => onChange({ discountType: form.discountType === 'percentage' ? 'flat' : 'percentage' })}
                    className="pointer-events-auto text-stone-400 font-medium hover:text-stone-600 transition-colors bg-stone-100 hover:bg-stone-200 rounded px-1.5 py-0.5 text-xs -ml-1 relative z-10 cursor-pointer"
                    title="Toggle discount type"
                  >
                    {form.discountType === 'percentage' ? '%' : '$'}
                  </button>
                }
              />
            </div>

            <div className="flex flex-col gap-3">
              <Input
                label="Discount Description"
                name="discountDescription"
                value={form.discountDescription}
                onChange={(val) => onChange({ discountDescription: val })}
                placeholder="e.g. Loyalty discount"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full">
            <label className="text-xs font-medium text-stone-500 tracking-wide select-none">Preferences</label>
            <div className="flex flex-col rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
              <label className="flex items-center justify-between p-3 border-b border-stone-100 cursor-pointer hover:bg-stone-50 transition-colors">
                <span className="text-sm font-medium text-stone-700 select-none">Apply GST (10%)</span>
                <Toggle enabled={form.gstEnabled} onChange={(val) => onChange({ gstEnabled: val })} />
              </label>
              
              <label className="flex items-center justify-between p-3 cursor-pointer hover:bg-stone-50 transition-colors">
                <span className="text-sm font-medium text-stone-700 select-none">Show Due Date</span>
                <Toggle enabled={form.displayDueDate} onChange={(val) => onChange({ displayDueDate: val })} />
              </label>
            </div>
          </div>
          
          <Input
            label="Add Note"
            name="notes"
            value={form.notes}
            onChange={(val) => onChange({ notes: val })}
            multiline
            autoGrow
            placeholder="Payment terms, bank details, or any other notes…"
          />
        </div>
      </CollapsibleSection>

      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40" onClick={() => setIsDiscountModalOpen(false)}>
          <div
            className="w-full max-w-sm bg-stone-50 border border-stone-200/80 rounded-2xl shadow-22 mx-4 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[14px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <h2 className="text-base font-semibold text-stone-900">
                Discount Help
              </h2>
              <button 
                type="button" 
                onClick={() => setIsDiscountModalOpen(false)} 
                className="text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-3 text-stone-600 leading-relaxed text-xs">
              <p>
                Click on the <kbd className="inline-flex items-center justify-center w-5 h-5 bg-white rounded-md shadow-1 text-stone-900 font-bold border border-stone-200/50 text-[12px] mx-1 align-middle select-none">$</kbd> or <kbd className="inline-flex items-center justify-center w-5 h-5 bg-white rounded-md shadow-1 text-stone-900 font-bold border border-stone-200/50 text-[12px] mx-1 align-middle select-none">%</kbd> button inside the input field to toggle between a flat discount amount (e.g. $10.00 off) and a percentage discount (e.g. 10% off).
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 pt-2 flex justify-end">
              <Button
                variant="primary"
                type="button"
                size="sm"
                onClick={() => setIsDiscountModalOpen(false)}
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

InvoiceForm.displayName = 'InvoiceForm';
