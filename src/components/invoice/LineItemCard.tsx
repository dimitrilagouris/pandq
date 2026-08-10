import React, { useRef, useEffect } from 'react';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiPencilLine,
  RiDraggable,
  RiUser3Line,
  RiCheckLine,
  RiCalendarEventLine,
  RiTimeLine,
  RiArchiveLine,
  RiCloseLine,
  RiGroup3Line,
} from 'react-icons/ri';
import { DatePicker } from '../common/DatePicker.tsx';
import { LabourWorker, LineItem } from './invoiceTypes';

export interface SortableLineItemCardProps {
  item: LineItem;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<LineItem>) => void;
}

export interface LineItemCardProps extends SortableLineItemCardProps {
  /** Synthetic drag handle attributes from dnd-kit */
  dragHandleProps: Record<string, unknown>;
  /** Active dragging state discriminant */
  isDragging: boolean;
}

/** Format a numeric currency amount for line item display. */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Format an ISO date string to short display format. */
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
 * Compact card for a line item. Displays summary view by default and expands
 * inline editing inputs when selected. Memoised to avoid parent form re-render cascading.
 */
export const LineItemCard: React.FC<LineItemCardProps> = React.memo(({
  item,
  isEditing,
  onEdit,
  onDelete,
  onUpdate,
  dragHandleProps,
  isDragging,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const workers = item.workers ?? [];
  const hasMultipleWorkers = workers.length > 1;

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [isEditing, item.description]);

  const total = (item.type === 'labour' && workers.length > 0)
    ? workers.reduce((sum, w) => sum + (w.hours * w.rate), 0)
    : item.type === 'labour'
      ? (item.hours ?? item.quantity ?? 0) * item.unitPrice
      : item.quantity * item.unitPrice;

  const totalHours = workers.reduce((sum, w) => sum + w.hours, 0);

  /** Appends a new worker snapshot to this labour line item. */
  const addWorker = (): void => {
    const newWorker: LabourWorker = { id: crypto.randomUUID(), name: '', hours: 1, rate: workers[0]?.rate ?? 0 };
    onUpdate({ workers: [...workers, newWorker] });
  };

  /** Removes a worker by ID if more than one exists. */
  const removeWorker = (workerId: string): void => {
    if (workers.length <= 1) {
      return;
    }
    onUpdate({ workers: workers.filter(w => w.id !== workerId) });
  };

  /** Updates an individual worker property. */
  const updateWorker = (workerId: string, patch: Partial<LabourWorker>): void => {
    onUpdate({
      workers: workers.map(w => w.id === workerId ? { ...w, ...patch } : w),
    });
  };

  return (
    <div
      className={`group rounded-xl border bg-white transition-all duration-150 ${isDragging ? 'border-stone-400 shadow-md' : 'shadow-sm'} ${isEditing && !isDragging ? 'border-stone-400 ring-2 ring-stone-400 ring-offset-1' : 'border-stone-200/80 hover:border-stone-300'}`}
    >
      <div className="flex items-start gap-2 p-3">
        <div
          {...dragHandleProps}
          className="mt-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 transition-colors focus:outline-none"
        >
          <RiDraggable className="w-4 h-4" />
        </div>

        <div className={`flex-1 flex flex-col gap-1.5 min-w-0 ${!isEditing ? 'cursor-pointer' : ''}`} onClick={!isEditing ? onEdit : undefined}>
          <div className="flex items-start gap-2">
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={item.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder={item.type === 'labour' ? 'Labour description' : 'Material description'}
                className="font-medium text-sm text-stone-900 bg-transparent outline-none flex-1 placeholder-stone-300 resize-none overflow-hidden min-h-[24px] leading-tight break-words"
                rows={1}
                autoFocus
              />
            ) : (
              <span className="font-medium text-sm text-stone-900 line-clamp-2 flex-1 leading-tight break-words whitespace-pre-wrap">
                {item.description || 'Untitled'}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 text-xs text-stone-500 mt-0.5">
            {item.type === 'labour' ? (
              isEditing ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <RiCalendarEventLine className="w-3.5 h-3.5 text-stone-400" />
                    <DatePicker
                      variant="inline"
                      value={item.date || ''}
                      onChange={(val) => onUpdate({ date: val })}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {workers.map((worker, idx) => (
                      <div key={worker.id} className="flex items-center gap-2 flex-wrap">
                        {hasMultipleWorkers && (
                          <div className="flex items-center gap-1 min-w-[80px]">
                            <RiUser3Line className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                            <input
                              type="text"
                              value={worker.name}
                              onChange={e => updateWorker(worker.id, { name: e.target.value })}
                              className="bg-transparent outline-none text-stone-600 w-[70px] border-b border-dashed border-stone-300 focus:border-stone-400 font-medium"
                              placeholder={`Person ${idx + 1}`}
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <RiTimeLine className="w-3.5 h-3.5 text-stone-400" />
                          <input type="number" value={worker.hours || ''} onChange={e => updateWorker(worker.id, { hours: Number(e.target.value) || 0 })} className="bg-transparent outline-none text-stone-600 w-10 border-b border-dashed border-stone-300 focus:border-stone-400 font-medium" placeholder="0" />
                          <span>hrs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-stone-400 font-medium">$</span>
                          <input type="number" value={worker.rate || ''} onChange={e => updateWorker(worker.id, { rate: Number(e.target.value) || 0 })} className="bg-transparent outline-none text-stone-600 w-12 border-b border-dashed border-stone-300 focus:border-stone-400 font-medium" placeholder="0.00" />
                          <span>/hr</span>
                        </div>
                        {hasMultipleWorkers && (
                          <button
                            type="button"
                            onClick={() => removeWorker(worker.id)}
                            className="p-0.5 text-stone-300 hover:text-red-500 transition-colors rounded"
                            title="Remove person"
                          >
                            <RiCloseLine className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addWorker}
                    className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-600 transition-colors w-fit mt-0.5"
                  >
                    <RiAddLine className="w-3 h-3" />
                    <span>Add Person</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  {item.date && (
                    <div className="flex items-center gap-1.5">
                      <RiCalendarEventLine className="w-3.5 h-3.5 text-stone-400" />
                      <span className="font-medium text-stone-600">{formatShortDate(item.date)}</span>
                    </div>
                  )}
                  {hasMultipleWorkers && (
                    <div className="flex items-center gap-1.5">
                      <RiGroup3Line className="w-3.5 h-3.5 text-stone-400" />
                      <span className="font-medium text-stone-600">{workers.length} people</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <RiTimeLine className="w-3.5 h-3.5 text-stone-400" />
                    <span className="font-medium text-stone-600">{totalHours} hrs</span>
                  </div>
                  {!hasMultipleWorkers && workers.length === 1 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-400 font-medium">$</span>
                      <span className="font-medium text-stone-600">{workers[0].rate}/hr</span>
                    </div>
                  )}
                </div>
              )
            ) : (
              isEditing ? (
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <RiArchiveLine className="w-3.5 h-3.5 text-stone-400" />
                    <input type="number" value={item.quantity || ''} onChange={e => onUpdate({ quantity: Number(e.target.value) || 0 })} className="bg-transparent outline-none text-stone-600 w-10 border-b border-dashed border-stone-300 focus:border-stone-400 font-medium" placeholder="1" />
                    <span>qty</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-stone-400 font-medium">$</span>
                    <input type="number" value={item.unitPrice || ''} onChange={e => onUpdate({ unitPrice: Number(e.target.value) || 0 })} className="bg-transparent outline-none text-stone-600 w-12 border-b border-dashed border-stone-300 focus:border-stone-400 font-medium" placeholder="0.00" />
                    <span>ea</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6">
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
});

LineItemCard.displayName = 'LineItemCard';
