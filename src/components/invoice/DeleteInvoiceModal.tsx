import React, { useState, useEffect } from 'react';
import { Invoice } from '../../types/models';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { RiCloseLine, RiDeleteBinLine, RiAlertLine } from 'react-icons/ri';

export interface DeleteInvoiceModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (invoice: Invoice) => Promise<void> | void;
}

/**
 * Confirmation modal requiring the user to type "delete" before permanently destroying an invoice.
 */
export const DeleteInvoiceModal: React.FC<DeleteInvoiceModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [confirmText, setConfirmText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setError('');
      setIsDeleting(false);
    }
  }, [isOpen, invoice]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !invoice) {
    return null;
  }

  const isEnabled = confirmText.trim().toLowerCase() === 'delete';

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!isEnabled || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);
      setError('');
      await onConfirm(invoice);
      onClose();
    } catch (err: unknown) {
      let errorMessage = 'Failed to delete invoice.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  let deleteButtonLabel = 'Delete Invoice';
  if (isDeleting) {
    deleteButtonLabel = 'Deleting…';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md bg-stone-100 border border-stone-200/80 rounded-2xl shadow-22 mx-4 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[14px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2 text-red-600 font-semibold text-[20px]">
            <RiAlertLine className="w-5 h-5 text-red-600 flex-shrink-0" />
            <h2 className="text-[20px] font-semibold text-stone-900">Delete Invoice</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 pt-3 flex flex-col gap-4">
            <p className="text-stone-600 text-sm leading-relaxed">
              Are you sure you want to delete invoice <strong className="font-semibold text-stone-900">{invoice.invoice_number}</strong>? This action is permanent and cannot be undone.
            </p>

            <div className="flex flex-col gap-2">
              <label htmlFor="confirm-delete-input" className="text-xs text-stone-500 font-medium">
                To confirm, type <code className="font-semibold text-stone-900 bg-stone-200/80 px-1.5 py-0.5 rounded text-xs">delete</code> below:
              </label>
              <Input
                id="confirm-delete-input"
                name="confirmDelete"
                value={confirmText}
                onChange={setConfirmText}
                placeholder='Type "delete"'
                autoFocus
                error={error}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 flex justify-end gap-3">
            <Button
              variant="secondary"
              type="button"
              size="sm"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="submit"
              size="sm"
              disabled={!isEnabled || isDeleting}
              leftIcon={<RiDeleteBinLine className="w-4 h-4" />}
            >
              {deleteButtonLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
