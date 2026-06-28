import React, { useState, useEffect } from 'react';
import { Client } from '../types';

interface ClientFormData {
  name: string;
  business_name: string;
  email: string;
  phone: string;
  address: string;
}

interface ClientModalProps {
  client: Client | null;
  onClose: () => void;
  onSave: () => void;
}

const EMPTY_FORM: ClientFormData = { name: '', business_name: '', email: '', phone: '', address: '' };

/**
 * Modal for creating or editing a client record.
 */
export const ClientModal: React.FC<ClientModalProps> = ({ client, onClose, onSave }) => {
  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM);
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isEditing = client !== null;

  useEffect(() => {
    setForm(client ? { name: client.name, business_name: client.business_name, email: client.email, phone: client.phone, address: client.address } : EMPTY_FORM);
    setError('');
  }, [client]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    try {
      setIsSaving(true);
      if (isEditing && client) {
        await window.electronAPI.updateClient(client.id, form.name, form.business_name, form.email, form.phone, form.address);
      } else {
        await window.electronAPI.createClient(form.name, form.business_name, form.email, form.phone, form.address);
      }
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save client.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-22 p-6 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-stone-900 mb-5">
          {isEditing ? 'Edit Client' : 'New Client'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Field label="Name" name="name" value={form.name} onChange={handleChange} required autoFocus />
          <Field label="Business Name" name="business_name" value={form.business_name} onChange={handleChange} />
          <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" />
          <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} type="tel" />
          <Field label="Address" name="address" value={form.address} onChange={handleChange} />

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-sm font-medium text-stone-50 bg-stone-900 hover:bg-stone-950 rounded-xl transition-colors shadow-1 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  autoFocus?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, name, value, onChange, type = 'text', required, autoFocus }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={name} className="text-xs font-medium text-stone-500">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      className="w-full px-3 py-2 text-sm text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 transition-colors placeholder-stone-300"
    />
  </div>
);
