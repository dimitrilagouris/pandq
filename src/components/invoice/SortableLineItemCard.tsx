import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LineItemCard, SortableLineItemCardProps } from './LineItemCard';

/**
 * Sortable wrapper around LineItemCard for dnd-kit drag and drop reordering.
 */
export const SortableLineItemCard: React.FC<SortableLineItemCardProps> = React.memo((props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <LineItemCard {...props} dragHandleProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  );
});

SortableLineItemCard.displayName = 'SortableLineItemCard';
