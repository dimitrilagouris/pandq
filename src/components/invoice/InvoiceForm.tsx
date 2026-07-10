import React, { useState, useRef, useEffect } from 'react';
import { RiAddLine, RiDeleteBinLine, RiPencilLine, RiDraggable, RiUserLine, RiHashtag, RiArrowDownSLine, RiCheckLine, RiCalendarEventLine, RiTimeLine, RiMoneyDollarCircleLine, RiArchiveLine } from 'react-icons/ri';
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
import { TemplateSelector } from './TemplateSelector';

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



  const labourItems = form.items.filter(item => item.type === 'labour');
  const materialItems = form.items.filter(item => item.type === 'materials');

  return (
    <div className="flex flex-col gap-5">
      {/* ── Invoice Details ── */}
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => setIsDetailsOpen(!isDetailsOpen)} className="flex items-center justify-between group outline-none w-full">
          <h2 className="text-base text-black font-medium">Invoice Details</h2>
          <RiArrowDownSLine className={`w-5 h-5 text-stone-400 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`} />
        </button>
        {isDetailsOpen && (
          <div className="flex flex-col gap-3">
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
                  <RiUserLine className="w-5 h-5 text-stone-400" />
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
                      if (!isOpen) setIsOpen(true);
                    }}
                    autoFocus
                  />
                )}
              </div>
              <RiArrowDownSLine className={`w-4 h-4 text-stone-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Invoice number"
            name="invoiceNumber"
            value={form.invoiceNumber}
            onChange={(val) => onChange({ invoiceNumber: val })}
            icon={<RiHashtag className="w-4 h-4" />}
            placeholder="INV-001"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
        </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-stone-200/80" />

      {/* ── Line Items ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between group cursor-pointer outline-none w-full" onClick={() => setIsItemsOpen(!isItemsOpen)}>
          <div className="flex items-center gap-4">
            <h2 className="text-base text-black font-medium select-none">Invoice Items</h2>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" leftIcon={<RiAddLine className="w-3.5 h-3.5" />} onClick={(e) => { e.stopPropagation(); addItem('labour'); }}>
                Labour
              </Button>
              <Button type="button" variant="ghost" size="sm" leftIcon={<RiAddLine className="w-3.5 h-3.5" />} onClick={(e) => { e.stopPropagation(); addItem('materials'); }}>
                Material
              </Button>
            </div>
          </div>
          <RiArrowDownSLine className={`w-5 h-5 text-stone-400 transition-transform ${isItemsOpen ? 'rotate-180' : ''}`} />
        </div>
        {isItemsOpen && (
          <div className="flex flex-col gap-3">
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

        </div>
      </DndContext>
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-stone-200/80" />

      {/* ── Template ── */}
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => setIsTemplateOpen(!isTemplateOpen)} className="flex items-center justify-between group outline-none w-full">
          <h2 className="text-base text-black font-medium">Template</h2>
          <RiArrowDownSLine className={`w-5 h-5 text-stone-400 transition-transform ${isTemplateOpen ? 'rotate-180' : ''}`} />
        </button>
        {isTemplateOpen && (
          <div className="flex flex-col gap-3">
            <TemplateSelector
              selectedTemplateId={form.templateId}
              onSelect={(val) => onChange({ templateId: val })}
            />
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-stone-200/80" />

      {/* ── Additional Options ── */}
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => setIsOptionsOpen(!isOptionsOpen)} className="flex items-center justify-between group outline-none w-full">
          <h2 className="text-base text-black font-medium">Additional Options</h2>
          <RiArrowDownSLine className={`w-5 h-5 text-stone-400 transition-transform ${isOptionsOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOptionsOpen && (
          <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <div className="flex flex-col gap-4">
              <Input
                label="Discount"
                name="discount"
                type="number"
                value={form.discount > 0 ? String(form.discount) : ''}
                onChange={(val) => onChange({ discount: Number(val) || 0 })}
                placeholder="$0.00"
                icon={<span className="text-stone-400 font-medium">$</span>}
              />
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-medium text-stone-500 tracking-wide select-none">Preferences</label>
              <div className="flex flex-col rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                <label className="flex items-center justify-between p-3 border-b border-stone-100 cursor-pointer hover:bg-stone-50 transition-colors">
                  <span className="text-sm font-medium text-stone-700 select-none">Apply GST (10%)</span>
                  <button
                    type="button"
                    onClick={() => onChange({ gstEnabled: !form.gstEnabled })}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${form.gstEnabled ? 'bg-stone-800' : 'bg-stone-300'}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${form.gstEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </label>
                
                <label className="flex items-center justify-between p-3 cursor-pointer hover:bg-stone-50 transition-colors">
                  <span className="text-sm font-medium text-stone-700 select-none">Show Due Date</span>
                  <button
                    type="button"
                    onClick={() => onChange({ displayDueDate: !form.displayDueDate })}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${form.displayDueDate ? 'bg-stone-800' : 'bg-stone-300'}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${form.displayDueDate ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </label>
              </div>
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
          </div>
        )}
      </div>

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
  const total = item.type === 'labour'
    ? (item.hours ?? item.quantity ?? 0) * item.unitPrice
    : item.quantity * item.unitPrice;

  return (
    <div
      className={`group rounded-xl border bg-white transition-all duration-150 ${isDragging ? 'border-stone-400 shadow-md' : 'shadow-sm'} ${isEditing && !isDragging ? 'border-stone-400 ring-2 ring-stone-400 ring-offset-1' : 'border-stone-200/80 hover:border-stone-300'}`}
    >
      <div className="flex items-start gap-2 p-3">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="mt-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 transition-colors focus:outline-none"
        >
          <RiDraggable className="w-4 h-4" />
        </div>

        {/* Content area */}
        <div className={`flex-1 flex flex-col gap-1.5 min-w-0 ${!isEditing ? 'cursor-pointer' : ''}`} onClick={!isEditing ? onEdit : undefined}>
          
          {/* Top row: Description & Badge */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                type="text"
                value={item.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder={item.type === 'labour' ? "Labour Description" : "Material description"}
                className="font-medium text-sm text-stone-900 bg-transparent outline-none flex-1 placeholder-stone-300"
                autoFocus
              />
            ) : (
              <span className="font-medium text-sm text-stone-900 truncate flex-1">
                {item.description || 'Untitled'}
              </span>
            )}
          </div>

          {/* Bottom row: Details */}
          <div className="flex items-center gap-4 text-xs text-stone-500">
             {item.type === 'labour' ? (
               isEditing ? (
                 <div className="flex items-center gap-3 flex-wrap">
                   <div className="flex items-center gap-1.5">
                     <RiCalendarEventLine className="w-3.5 h-3.5 text-stone-400" />
                     <input type="date" value={item.date || ''} onChange={e => onUpdate({date: e.target.value})} className="bg-transparent outline-none text-stone-600 w-auto font-medium" />
                   </div>
                   <div className="flex items-center gap-1">
                     <RiTimeLine className="w-3.5 h-3.5 text-stone-400" />
                     <input type="number" value={item.hours !== undefined ? item.hours : ''} onChange={e => onUpdate({hours: Number(e.target.value) || 0})} className="bg-transparent outline-none text-stone-600 w-10 border-b border-dashed border-stone-300 focus:border-stone-400 font-medium" placeholder="0" />
                     <span>hrs</span>
                   </div>
                   <div className="flex items-center gap-1">
                     <span className="text-stone-400 font-medium">$</span>
                     <input type="number" value={item.unitPrice || ''} onChange={e => onUpdate({unitPrice: Number(e.target.value) || 0})} className="bg-transparent outline-none text-stone-600 w-12 border-b border-dashed border-stone-300 focus:border-stone-400 font-medium" placeholder="0.00" />
                     <span>/hr</span>
                   </div>
                 </div>
               ) : (
                 <div className="flex items-center gap-3">
                   {item.date && (
                     <div className="flex items-center gap-1.5">
                       <RiCalendarEventLine className="w-3.5 h-3.5 text-stone-400" />
                       <span className="font-medium text-stone-600">{formatShortDate(item.date)}</span>
                     </div>
                   )}
                   <div className="flex items-center gap-1.5">
                     <RiTimeLine className="w-3.5 h-3.5 text-stone-400" />
                     <span className="font-medium text-stone-600">{item.hours ?? 0} hrs</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <span className="text-stone-400 font-medium">$</span>
                     <span className="font-medium text-stone-600">{item.unitPrice}/hr</span>
                   </div>
                 </div>
               )
             ) : (
               /* Materials */
               isEditing ? (
                 <div className="flex items-center gap-4 flex-wrap">
                   <div className="flex items-center gap-1.5">
                     <RiArchiveLine className="w-3.5 h-3.5 text-stone-400" />
                     <input type="number" value={item.quantity || ''} onChange={e => onUpdate({quantity: Number(e.target.value) || 0})} className="bg-transparent outline-none text-stone-600 w-10 border-b border-dashed border-stone-300 focus:border-stone-400 font-medium" placeholder="1" />
                     <span>qty</span>
                   </div>
                   <div className="flex items-center gap-1">
                     <span className="text-stone-400 font-medium">$</span>
                     <input type="number" value={item.unitPrice || ''} onChange={e => onUpdate({unitPrice: Number(e.target.value) || 0})} className="bg-transparent outline-none text-stone-600 w-12 border-b border-dashed border-stone-300 focus:border-stone-400 font-medium" placeholder="0.00" />
                     <span>ea</span>
                   </div>
                 </div>
               ) : (
                 <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1.5">
                     <RiArchiveLine className="w-3.5 h-3.5 text-stone-400" />
                     <span className="font-medium text-stone-600">{item.quantity} qty</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <span className="text-stone-400 font-medium">$</span>
                     <span className="font-medium text-stone-600">{item.unitPrice} ea</span>
                   </div>
                 </div>
               )
             )}
          </div>
        </div>

        {/* Total and Actions */}
        <div className="flex flex-col items-end justify-between self-stretch ml-2">
           <div className={`flex items-center gap-0.5 transition-opacity duration-150 ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {isEditing ? (
                <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 text-stone-400 hover:text-lime-600 hover:bg-lime-50 rounded-md transition-colors" title="Done">
                  <RiCheckLine className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors" title="Edit">
                  <RiPencilLine className="w-4 h-4" />
                </button>
              )}
              <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                <RiDeleteBinLine className="w-4 h-4" />
              </button>
           </div>
           {total > 0 ? (
             <span className="text-sm font-medium text-stone-800 mt-2">
               {formatCurrency(total)}
             </span>
           ) : <div />}
        </div>

      </div>
    </div>
  );
};
