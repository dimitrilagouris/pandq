import React, { useState, useEffect, useMemo } from 'react';
import {
  RiPaletteLine,
  RiBuildingLine,
  RiReceiptLine,
  RiMailLine,
  RiBankCardLine,
  RiCheckboxCircleFill
} from 'react-icons/ri';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { TemplatedInput } from '../components/TemplatedInput';
import { TemplateSelector } from '../components/invoice/TemplateSelector';
import { HelpBadge } from '../components/HelpBadge';
import { TutorialModal } from '../components/TutorialModal';
import { CircularProgress } from '../components/CircularProgress';
import { Toggle } from '../components/Toggle';

type SettingsTab = 'personalisation' | 'organisation' | 'invoice' | 'email' | 'payment';

interface SettingsPageProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

/** Internal structured state shape for all user settings. */
export interface SettingsFormState {
  setting_org_name: string;
  setting_org_abn: string;
  setting_org_address: string;
  setting_org_phone: string;
  setting_org_email: string;
  setting_language: string;
  setting_display_client_name_as: 'name' | 'company';
  setting_default_due_days: string;
  setting_invoice_prefix: string;
  setting_default_notes: string;
  setting_default_gst_enabled: boolean;
  setting_default_display_due_date: boolean;
  setting_default_template_id: string;
  setting_sender_name: string;
  setting_email_subject: string;
  setting_email_body: string;
  setting_email_auto_update_status: boolean;
  setting_bank_name: string;
  setting_bsb: string;
  setting_account_number: string;
  setting_payment_instructions: string;
}

/** Canonical default values for all settings. */
const DEFAULT_SETTINGS: SettingsFormState = {
  setting_org_name: 'Your Business',
  setting_org_abn: '',
  setting_org_address: 'Your address here',
  setting_org_phone: '',
  setting_org_email: '',
  setting_language: 'en-AU',
  setting_display_client_name_as: 'name',
  setting_default_due_days: '14',
  setting_invoice_prefix: 'INV-',
  setting_default_notes: '',
  setting_default_gst_enabled: false,
  setting_default_display_due_date: true,
  setting_default_template_id: 'classic',
  setting_sender_name: '',
  setting_email_subject: 'Invoice {invoiceNumber}',
  setting_email_body: 'Hi,\n\nPlease find attached invoice {invoiceNumber}.\n\nKind regards,\nYour Business',
  setting_email_auto_update_status: true,
  setting_bank_name: '',
  setting_bsb: '',
  setting_account_number: '',
  setting_payment_instructions: 'Please pay within terms.',
};

/** Key mapping per settings tab for saving. */
const TAB_KEYS: Record<SettingsTab, Array<keyof SettingsFormState>> = {
  organisation: ['setting_org_name', 'setting_org_abn', 'setting_org_address', 'setting_org_phone', 'setting_org_email'],
  personalisation: ['setting_language', 'setting_display_client_name_as'],
  invoice: ['setting_default_due_days', 'setting_invoice_prefix', 'setting_default_notes', 'setting_default_gst_enabled', 'setting_default_display_due_date', 'setting_default_template_id'],
  email: ['setting_sender_name', 'setting_email_subject', 'setting_email_body', 'setting_email_auto_update_status'],
  payment: ['setting_bank_name', 'setting_bsb', 'setting_account_number', 'setting_payment_instructions'],
};

/** Convert a raw key-value dictionary from DB into a clean `SettingsFormState` object. */
function parseSettings(settings: Record<string, string>): SettingsFormState {
  return {
    setting_org_name: settings['setting_org_name'] ?? DEFAULT_SETTINGS.setting_org_name,
    setting_org_abn: settings['setting_org_abn'] ?? DEFAULT_SETTINGS.setting_org_abn,
    setting_org_address: settings['setting_org_address'] ?? DEFAULT_SETTINGS.setting_org_address,
    setting_org_phone: settings['setting_org_phone'] ?? DEFAULT_SETTINGS.setting_org_phone,
    setting_org_email: settings['setting_org_email'] ?? DEFAULT_SETTINGS.setting_org_email,
    setting_language: settings['setting_language'] ?? DEFAULT_SETTINGS.setting_language,
    setting_display_client_name_as: (settings['setting_display_client_name_as'] as 'name' | 'company') || DEFAULT_SETTINGS.setting_display_client_name_as,
    setting_default_due_days: settings['setting_default_due_days'] ?? DEFAULT_SETTINGS.setting_default_due_days,
    setting_invoice_prefix: settings['setting_invoice_prefix'] ?? DEFAULT_SETTINGS.setting_invoice_prefix,
    setting_default_notes: settings['setting_default_notes'] ?? DEFAULT_SETTINGS.setting_default_notes,
    setting_default_gst_enabled: settings['setting_default_gst_enabled'] !== undefined ? settings['setting_default_gst_enabled'] === 'true' : DEFAULT_SETTINGS.setting_default_gst_enabled,
    setting_default_display_due_date: settings['setting_default_display_due_date'] !== undefined ? settings['setting_default_display_due_date'] !== 'false' : DEFAULT_SETTINGS.setting_default_display_due_date,
    setting_default_template_id: settings['setting_default_template_id'] ?? DEFAULT_SETTINGS.setting_default_template_id,
    setting_sender_name: settings['setting_sender_name'] ?? DEFAULT_SETTINGS.setting_sender_name,
    setting_email_subject: settings['setting_email_subject'] ?? DEFAULT_SETTINGS.setting_email_subject,
    setting_email_body: settings['setting_email_body'] ?? DEFAULT_SETTINGS.setting_email_body,
    setting_email_auto_update_status: settings['setting_email_auto_update_status'] !== undefined ? settings['setting_email_auto_update_status'] !== 'false' : DEFAULT_SETTINGS.setting_email_auto_update_status,
    setting_bank_name: settings['setting_bank_name'] ?? DEFAULT_SETTINGS.setting_bank_name,
    setting_bsb: settings['setting_bsb'] ?? DEFAULT_SETTINGS.setting_bsb,
    setting_account_number: settings['setting_account_number'] ?? DEFAULT_SETTINGS.setting_account_number,
    setting_payment_instructions: settings['setting_payment_instructions'] ?? DEFAULT_SETTINGS.setting_payment_instructions,
  };
}

/**
 * SettingsPage - provides user preferences and organisation config with persistent local storage.
 */
export default function SettingsPage({ onDirtyChange }: SettingsPageProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>('organisation');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);

  const [form, setForm] = useState<SettingsFormState>(DEFAULT_SETTINGS);
  const [initialState, setInitialState] = useState<SettingsFormState | null>(null);

  // Load settings on mount
  useEffect(() => {
    window.electronAPI.getSettings().then((settings) => {
      const parsed = parseSettings(settings);
      setForm(parsed);
      setInitialState(parsed);
    }).catch(console.error);
  }, []);

  const updateField = <K extends keyof SettingsFormState>(key: K, value: SettingsFormState[K]): void => {
    if (saveSuccess) {
      setSaveSuccess(false);
    }
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // Compute dirty state
  const isDirty = useMemo(() => {
    if (!initialState) {
      return false;
    }
    return (Object.keys(DEFAULT_SETTINGS) as Array<keyof SettingsFormState>).some(
      key => form[key] !== initialState[key]
    );
  }, [form, initialState]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  /** Save current tab's settings to database. */
  const handleSave = async (): Promise<void> => {
    const keysToSave = TAB_KEYS[activeTab];
    const toSave: Record<string, string> = {};
    for (const key of keysToSave) {
      toSave[key] = String(form[key]);
    }

    try {
      setIsSaving(true);
      await window.electronAPI.saveSettings(toSave);
      setInitialState(prev => prev ? { ...prev, ...parseSettings(toSave) } : parseSettings(toSave));
      setIsSaving(false);
      setSaveSuccess(true);
      window.dispatchEvent(new Event('settings-updated'));
    } catch (err) {
      setIsSaving(false);
      console.error('Failed to save settings:', err);
    }
  };

  /** Render active settings tab form. */
  const renderForm = (): React.JSX.Element => {
    switch (activeTab) {
      case 'personalisation':
        return (
          <div className="flex flex-col gap-5 max-w-lg">
            <Input
              label="Language"
              value={form.setting_language}
              onChange={(val) => updateField('setting_language', val)}
              placeholder="e.g. en-AU"
            />
            <div>
              <label className="block text-sm font-semibold text-stone-900 mb-1">
                Invoice Client Display Name
              </label>
              <p className="text-xs text-stone-500 mb-3 leading-relaxed">
                Choose whether to display the client's personal name or their company name on invoice cards.
              </p>
              <div className="flex flex-col gap-2.5 mt-2">
                <label className="flex items-center gap-3 cursor-pointer group w-fit">
                  <input
                    type="radio"
                    name="displayClientNameAs"
                    value="name"
                    checked={form.setting_display_client_name_as === 'name'}
                    onChange={() => updateField('setting_display_client_name_as', 'name')}
                    className={`appearance-none m-0 w-4 h-4 rounded-full cursor-pointer outline-none transition-all flex-shrink-0 ${
                      form.setting_display_client_name_as === 'name'
                        ? 'bg-stone-600 shadow-[inset_0_0_0_3px_#fff,0_0_0_1px_#57534e]'
                        : 'bg-white shadow-1 hover:shadow-md'
                    }`}
                  />
                  <span className="text-[14px] text-stone-800 font-medium select-none group-hover:text-stone-900">Personal Name</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group w-fit">
                  <input
                    type="radio"
                    name="displayClientNameAs"
                    value="company"
                    checked={form.setting_display_client_name_as === 'company'}
                    onChange={() => updateField('setting_display_client_name_as', 'company')}
                    className={`appearance-none m-0 w-4 h-4 rounded-full cursor-pointer outline-none transition-all flex-shrink-0 ${
                      form.setting_display_client_name_as === 'company'
                        ? 'bg-stone-600 shadow-[inset_0_0_0_3px_#fff,0_0_0_1px_#57534e]'
                        : 'bg-white shadow-1 hover:shadow-md'
                    }`}
                  />
                  <span className="text-[14px] text-stone-800 font-medium select-none group-hover:text-stone-900">Company Name</span>
                </label>
              </div>
            </div>
          </div>
        );
      case 'organisation':
        return (
          <div className="flex flex-col gap-5 max-w-lg">
            <Input
              label="Organisation Name"
              value={form.setting_org_name}
              onChange={(val) => updateField('setting_org_name', val)}
              placeholder="e.g. PandQ"
            />
            <Input
              label={
                <span className="inline-flex items-center gap-1.5">
                  <span>Business Number / ABN</span>
                  <HelpBadge tooltipText="Your Australian Business Number (11 digits)." />
                </span>
              }
              value={form.setting_org_abn}
              onChange={(val) => updateField('setting_org_abn', val)}
              placeholder="e.g. 12 345 678 901"
            />
            <Input
              label="Address"
              value={form.setting_org_address}
              onChange={(val) => updateField('setting_org_address', val)}
              placeholder="Full mailing address"
              multiline
              rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                value={form.setting_org_phone}
                onChange={(val) => updateField('setting_org_phone', val)}
                placeholder="e.g. +61 400 000 000"
              />
              <Input
                label="Public/Billing Email"
                value={form.setting_org_email}
                onChange={(val) => updateField('setting_org_email', val)}
                placeholder="e.g. accounts@pandq.com"
                type="email"
              />
            </div>
          </div>
        );
      case 'invoice':
        return (
          <div className="flex flex-col gap-5 max-w-lg">
            <Input
              label="Default Payment Terms (Days)"
              value={form.setting_default_due_days}
              onChange={(val) => updateField('setting_default_due_days', val)}
              placeholder="e.g. 14"
              type="number"
            />
            <Input
              label="Default Invoice Prefix"
              value={form.setting_invoice_prefix}
              onChange={(val) => updateField('setting_invoice_prefix', val)}
              placeholder="e.g. INV-"
            />
            <Input
              label="Default Notes & Footers"
              value={form.setting_default_notes}
              onChange={(val) => updateField('setting_default_notes', val)}
              placeholder="Terms, thank-you note or disclaimer"
              multiline
              rows={4}
            />

            {/* Toggle: Default GST Enabled */}
            <div className="flex items-center justify-between py-2.5 border-b border-stone-100">
              <div className="flex flex-col gap-0.5 max-w-[80%]">
                <span className="text-sm font-medium text-stone-700 inline-flex items-center gap-1.5">
                  <span>Enable GST by default</span>
                  <HelpBadge tooltipText="Automatically adds a 10% GST calculation to all newly created invoices." />
                </span>
                <span className="text-xs text-stone-400">Enable GST calculations automatically on all new invoices.</span>
              </div>
              <Toggle enabled={form.setting_default_gst_enabled} onChange={(val) => updateField('setting_default_gst_enabled', val)} />
            </div>

            {/* Toggle: Default Display Due Date */}
            <div className="flex items-center justify-between py-2.5 border-b border-stone-100 mb-2">
              <div className="flex flex-col gap-0.5 max-w-[80%]">
                <span className="text-sm font-medium text-stone-700">Display Due Date to client</span>
                <span className="text-xs text-stone-400">Toggle whether the due date is visible on new client invoices.</span>
              </div>
              <Toggle enabled={form.setting_default_display_due_date} onChange={(val) => updateField('setting_default_display_due_date', val)} />
            </div>

            {/* Default Template Selector */}
            <div className="flex flex-col gap-2 pt-2">
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Default Invoice Template</label>
              <TemplateSelector
                selectedTemplateId={form.setting_default_template_id}
                onSelect={(val) => updateField('setting_default_template_id', val)}
              />
            </div>
          </div>
        );
      case 'email':
        return (
          <div className="flex flex-col gap-5 max-w-lg">
            <Input
              label="Default Sender Name"
              value={form.setting_sender_name}
              onChange={(val) => updateField('setting_sender_name', val)}
              placeholder="e.g. PandQ Billing"
            />
            <TemplatedInput
              label={
                <span className="inline-flex items-center gap-1.5">
                  <span>Default Subject Template</span>
                  <HelpBadge tooltipText="Customise the email subject line using variables." onClick={() => setIsTutorialOpen(true)} />
                </span>
              }
              value={form.setting_email_subject}
              onChange={(val) => updateField('setting_email_subject', val)}
              placeholder="Use tags to dynamic prefill, e.g. Invoice {invoiceNumber}"
            />
            <TemplatedInput
              label={
                <span className="inline-flex items-center gap-1.5">
                  <span>Default Message Body</span>
                  <HelpBadge tooltipText="Customise the email message body using variables." onClick={() => setIsTutorialOpen(true)} />
                </span>
              }
              value={form.setting_email_body}
              onChange={(val) => updateField('setting_email_body', val)}
              placeholder="Write the default body text"
              multiline
              rows={5}
            />
            {/* Toggle: Auto update status to sent */}
            <div className="flex items-center justify-between py-2.5 mt-2 border-t border-stone-100">
              <div className="flex flex-col gap-0.5 max-w-[80%]">
                <span className="text-sm font-medium text-stone-700">Auto-update to "Sent"</span>
                <span className="text-xs text-stone-400">Automatically mark invoices as Sent when you email them.</span>
              </div>
              <Toggle enabled={form.setting_email_auto_update_status} onChange={(val) => updateField('setting_email_auto_update_status', val)} />
            </div>
          </div>
        );
      case 'payment':
        return (
          <div className="flex flex-col gap-5 max-w-lg">
            <Input
              label="Bank Name"
              value={form.setting_bank_name}
              onChange={(val) => updateField('setting_bank_name', val)}
              placeholder="e.g. Commonwealth Bank"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="BSB"
                value={form.setting_bsb}
                onChange={(val) => updateField('setting_bsb', val)}
                placeholder="e.g. 062-900"
              />
              <Input
                label="Account Number"
                value={form.setting_account_number}
                onChange={(val) => updateField('setting_account_number', val)}
                placeholder="e.g. 1234 5678"
              />
            </div>
            <Input
              label={
                <span className="inline-flex items-center gap-1.5">
                  <span>Additional Payment Instructions</span>
                  <HelpBadge tooltipText="Additional terms or bank details printed at the bottom of the invoice page." />
                </span>
              }
              value={form.setting_payment_instructions}
              onChange={(val) => updateField('setting_payment_instructions', val)}
              placeholder="Payment reference instructions"
              multiline
              rows={3}
            />
          </div>
        );
    }
  };

  return (
    <div className="flex h-full bg-transparent overflow-hidden">

      {/* ── Sub Sidebar (Left side of page) ── */}
      <aside className="w-[240px] h-full flex flex-col pt-8 px-5 border-r border-stone-200 flex-shrink-0 select-none">
        {/* Category: Account & Data */}
        <div className="mb-6">
          <div className="px-2 pb-2">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Account & Org</span>
          </div>
          <nav className="flex flex-col gap-0.5">
            <button
              onClick={() => { setActiveTab('organisation'); setSaveSuccess(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-regular text-left
                ${activeTab === 'organisation'
                  ? 'bg-stone-200 text-stone-900'
                  : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'}
              `}
            >
              <RiBuildingLine className={`w-4 h-4 flex-shrink-0 ${activeTab === 'organisation' ? 'text-stone-900' : 'text-stone-400'}`} />
              <span>My Organisation</span>
            </button>
            <button
              onClick={() => { setActiveTab('payment'); setSaveSuccess(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-regular text-left
                ${activeTab === 'payment'
                  ? 'bg-stone-200 text-stone-900'
                  : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'}
              `}
            >
              <RiBankCardLine className={`w-4 h-4 flex-shrink-0 ${activeTab === 'payment' ? 'text-stone-900' : 'text-stone-400'}`} />
              <span>Payment Details</span>
            </button>
          </nav>
        </div>

        {/* Category: Preferences */}
        <div className="mb-6">
          <div className="px-2 pb-2">
            <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">Preferences</span>
          </div>
          <nav className="flex flex-col gap-0.5">
            <button
              onClick={() => { setActiveTab('personalisation'); setSaveSuccess(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-regular text-left
                ${activeTab === 'personalisation'
                  ? 'bg-stone-200 text-stone-900'
                  : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'}
              `}
            >
              <RiPaletteLine className={`w-4 h-4 flex-shrink-0 ${activeTab === 'personalisation' ? 'text-stone-900' : 'text-stone-400'}`} />
              <span>Personalisation</span>
            </button>
            <button
              onClick={() => { setActiveTab('invoice'); setSaveSuccess(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-regular text-left
                ${activeTab === 'invoice'
                  ? 'bg-stone-200 text-stone-900'
                  : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'}
              `}
            >
              <RiReceiptLine className={`w-4 h-4 flex-shrink-0 ${activeTab === 'invoice' ? 'text-stone-900' : 'text-stone-400'}`} />
              <span>Invoice Creation</span>
            </button>
            <button
              onClick={() => { setActiveTab('email'); setSaveSuccess(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-regular text-left
                ${activeTab === 'email'
                  ? 'bg-stone-200 text-stone-900'
                  : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'}
              `}
            >
              <RiMailLine className={`w-4 h-4 flex-shrink-0 ${activeTab === 'email' ? 'text-stone-900' : 'text-stone-400'}`} />
              <span>Email Preference</span>
            </button>
          </nav>
        </div>

      </aside>

      {/* ── Settings Content Panel (Right side of page) ── */}
      <main className="flex-1 h-full overflow-y-auto px-10 py-8 flex flex-col relative">
        {(() => {
          const isOrgNameSet = form.setting_org_name.trim() !== '' && form.setting_org_name.trim() !== 'Your Business';
          const isOrgAbnSet = form.setting_org_abn.trim() !== '';
          const isOrgAddressSet = form.setting_org_address.trim() !== '' && form.setting_org_address.trim() !== 'Your address here';
          const isOrgEmailSet = form.setting_org_email.trim() !== '';
          const isBankSet = form.setting_bsb.trim() !== '' && form.setting_account_number.trim() !== '';

          const completedSteps = [isOrgNameSet, isOrgAbnSet, isOrgAddressSet, isOrgEmailSet, isBankSet].filter(Boolean).length;
          const totalSteps = 5;
          const isSetupComplete = completedSteps === totalSteps;

          if (isSetupComplete || isBannerDismissed) {
            return null;
          }

          return (
            <div className="bg-white rounded-2xl p-6 mb-8 flex flex-row items-center justify-between shadow-1 relative">
              <button
                onClick={() => {
                  setIsBannerDismissed(true);
                }}
                className="absolute top-6 right-6 text-stone-400 hover:text-stone-600 transition-colors"
                title="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div>
                <h3 className="text-lg font-semibold text-stone-900 pr-8">Finish setting up</h3>
                <p className="text-sm text-stone-500 mt-1 mb-4 max-w-md">Complete your organisation details to start sending professional invoices. Click a step to complete it.</p>

                <ul className="text-sm text-stone-600 space-y-2.5">
                  <li className="flex items-center gap-2.5 cursor-pointer hover:text-stone-900 transition-colors" onClick={() => setActiveTab('organisation')}>
                    {isOrgNameSet ? <RiCheckboxCircleFill className="text-lime-500 w-4 h-4 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border border-stone-300 flex-shrink-0" />}
                    Organisation Name
                  </li>
                  <li className="flex items-center gap-2.5 cursor-pointer hover:text-stone-900 transition-colors" onClick={() => setActiveTab('organisation')}>
                    {isOrgAbnSet ? <RiCheckboxCircleFill className="text-lime-500 w-4 h-4 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border border-stone-300 flex-shrink-0" />}
                    Business Number (ABN/VAT)
                  </li>
                  <li className="flex items-center gap-2.5 cursor-pointer hover:text-stone-900 transition-colors" onClick={() => setActiveTab('organisation')}>
                    {isOrgAddressSet ? <RiCheckboxCircleFill className="text-lime-500 w-4 h-4 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border border-stone-300 flex-shrink-0" />}
                    Business Address
                  </li>
                  <li className="flex items-center gap-2.5 cursor-pointer hover:text-stone-900 transition-colors" onClick={() => setActiveTab('organisation')}>
                    {isOrgEmailSet ? <RiCheckboxCircleFill className="text-lime-500 w-4 h-4 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border border-stone-300 flex-shrink-0" />}
                    Contact Email
                  </li>
                  <li className="flex items-center gap-2.5 cursor-pointer hover:text-stone-900 transition-colors" onClick={() => setActiveTab('payment')}>
                    {isBankSet ? <RiCheckboxCircleFill className="text-lime-500 w-4 h-4 flex-shrink-0" /> : <div className="w-4 h-4 rounded-full border border-stone-300 flex-shrink-0" />}
                    Bank Details
                  </li>
                </ul>
              </div>
              <div className="pr-4 mt-2">
                <CircularProgress current={completedSteps} total={totalSteps} />
              </div>
            </div>
          );
        })()}

        <div className="flex items-center justify-between border-b border-stone-100 pb-5 mb-8">
          <div>
            <h1 className="text-xl font-semibold text-stone-900 select-none">
              {activeTab === 'organisation' && 'My Organisation'}
              {activeTab === 'personalisation' && 'Personalisation'}
              {activeTab === 'invoice' && 'Invoice Creation'}
              {activeTab === 'email' && 'Email Preference'}
              {activeTab === 'payment' && 'Payment Details'}
            </h1>
            <p className="text-xs text-stone-400 mt-1 select-none">
              {activeTab === 'organisation' && 'Configure address, business numbers, and contact info.'}
              {activeTab === 'personalisation' && 'Customise interface modes, language, and date styles.'}
              {activeTab === 'invoice' && 'Establish default values, terms, and billing templates.'}
              {activeTab === 'email' && 'Set up mail draft templates and sender parameters.'}
              {activeTab === 'payment' && 'Maintain bank account coordinates and general payment guidelines.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Animated slide-out "Settings saved" indicator */}
            {saveSuccess && (
              <div className="flex items-center gap-2 animate-slide-out-right select-none">
                <div className="w-5 h-5 rounded-full bg-lime-100 flex items-center justify-center flex-shrink-0 animate-pop-in">
                  <svg className="w-3 h-3 text-lime-600" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1.5 5 4.5 8 10.5 2" className="animate-draw-check" />
                  </svg>
                </div>
                <span className="text-xs text-lime-600 font-medium">Settings saved</span>
              </div>
            )}
            <Button
              variant={saveSuccess ? 'secondary' : 'primary'}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save settings'}
            </Button>
          </div>
        </div>

        <div className="flex-1">
          {renderForm()}
        </div>
      </main>

      <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
    </div>
  );
}
