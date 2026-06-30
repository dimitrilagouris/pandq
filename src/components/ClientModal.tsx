import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { Input } from './Input';
import { TbX, TbChevronDown, TbUser, TbBuilding, TbPhone, TbMail, TbMapPin } from 'react-icons/tb';

interface ClientFormData {
  name: string;
  business_name: string;
  email: string;
  address: string;
}

interface ClientModalProps {
  client: Client | null;
  onClose: () => void;
  onSave: () => void;
}

const EMPTY_FORM: ClientFormData = { name: '', business_name: '', email: '', address: '' };

/**
 * Modal for creating or editing a client record.
 */
export const ClientModal: React.FC<ClientModalProps> = ({ client, onClose, onSave }) => {
  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM);
  const [countryCode, setCountryCode] = useState<string>('+61');
  const [rawPhone, setRawPhone] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isEditing = client !== null;

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        business_name: client.business_name,
        email: client.email,
        address: client.address
      });
      // Parse phone number
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
    } else {
      setForm(EMPTY_FORM);
      setCountryCode('+61');
      setRawPhone('');
    }
    setError('');
  }, [client]);

  const handleFieldChange = (key: keyof ClientFormData, val: string): void => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    const formattedPhone = rawPhone.trim() ? `${countryCode} ${rawPhone.trim()}` : '';
    try {
      setIsSaving(true);
      if (isEditing && client) {
        await window.electronAPI.updateClient(client.id, form.name, form.business_name, form.email, formattedPhone, form.address);
      } else {
        await window.electronAPI.createClient(form.name, form.business_name, form.email, formattedPhone, form.address);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-stone-100 border border-stone-200/80 rounded-2xl shadow-22 mx-4 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-base font-semibold text-stone-900">
            {isEditing ? 'Edit Client' : 'New Client'}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <TbX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Body */}
          <div className="p-6 flex flex-col gap-4">
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Input
              label={
                <span className="inline-flex items-center gap-1.5">
                  <TbUser className="w-3.5 h-3.5 text-stone-450" />
                  <span>Name</span>
                </span>
              }
              name="name"
              value={form.name}
              onChange={(val) => handleFieldChange('name', val)}
              required
              autoFocus
            />

            <Input
              label={
                <span className="inline-flex items-center gap-1.5">
                  <TbBuilding className="w-3.5 h-3.5 text-stone-450" />
                  <span>Business Name</span>
                </span>
              }
              name="business_name"
              value={form.business_name}
              onChange={(val) => handleFieldChange('business_name', val)}
            />

            <div className="flex flex-col gap-1 w-full">
              <label htmlFor="phone" className="text-xs font-medium text-stone-500 tracking-wide inline-flex items-center gap-1.5">
                <TbPhone className="w-3.5 h-3.5 text-stone-450" />
                <span>Phone</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-shrink-0">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="h-9 px-3 text-sm text-stone-900 bg-stone-50 border border-transparent rounded-xl shadow-1 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 appearance-none pr-8 cursor-pointer transition-all duration-150"
                  >
                    <option value="+61">🇦🇺 +61</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+64">🇳🇿 +64</option>
                    <option value="+81">🇯🇵 +81</option>
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                    <TbChevronDown className="w-4 h-4" />
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
              label={
                <span className="inline-flex items-center gap-1.5">
                  <TbMail className="w-3.5 h-3.5 text-stone-450" />
                  <span>Email</span>
                </span>
              }
              name="email"
              type="email"
              value={form.email}
              onChange={(val) => handleFieldChange('email', val)}
            />

            <Input
              label={
                <span className="inline-flex items-center gap-1.5">
                  <TbMapPin className="w-3.5 h-3.5 text-stone-450" />
                  <span>Address</span>
                </span>
              }
              name="address"
              value={form.address}
              onChange={(val) => handleFieldChange('address', val)}
            />
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-50 border border-stone-200/80 hover:bg-stone-200/50 rounded-xl transition-colors shadow-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-sm font-medium text-stone-50 bg-stone-900 hover:bg-stone-950 rounded-xl transition-colors shadow-1 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : isEditing ? 'Save Changes' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
