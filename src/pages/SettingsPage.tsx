import React, { useState, useEffect, useMemo } from 'react';
import {
  RiPaletteLine,
  RiBuildingLine,
  RiReceiptLine,
  RiMailLine,
  RiBankCardLine,
  RiCheckLine,
  RiCheckboxCircleFill
} from 'react-icons/ri';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { TemplatedInput } from '../components/TemplatedInput';
import { TemplateSelector } from '../components/invoice/TemplateSelector';
import { HelpBadge } from '../components/HelpBadge';
import { TutorialModal } from '../components/TutorialModal';
import { CircularProgress } from '../components/CircularProgress';
import { templates } from '../components/invoice/templates/registry';
import { Toggle } from '../components/Toggle';

type SettingsTab = 'personalisation' | 'organisation' | 'invoice' | 'email' | 'payment';

interface SettingsPageProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

/**
 * SettingsPage - provides user preferences and organisation config with persistent local storage storage.
 */
export default function SettingsPage({ onDirtyChange }: SettingsPageProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>('organisation');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [initialSettings, setInitialSettings] = useState<Record<string, string>>({});
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);

  // My Organisation State
  const [orgName, setOrgName] = useState<string>('Your Business');
  const [orgAbn, setOrgAbn] = useState<string>('');
  const [orgAddress, setOrgAddress] = useState<string>('Your address here');
  const [orgPhone, setOrgPhone] = useState<string>('');
  const [orgEmail, setOrgEmail] = useState<string>('');

  // Personalisation State
  const [language, setLanguage] = useState<string>('en-AU');
  const [displayClientNameAs, setDisplayClientNameAs] = useState<'name' | 'company'>('name');

  // Invoice Creation State
  const [defaultDueDays, setDefaultDueDays] = useState<string>('14');
  const [invoicePrefix, setInvoicePrefix] = useState<string>('INV-');
  const [defaultNotes, setDefaultNotes] = useState<string>('');
  const [defaultGstEnabled, setDefaultGstEnabled] = useState<boolean>(false);
  const [defaultDisplayDueDate, setDefaultDisplayDueDate] = useState<boolean>(true);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>('classic');

  // Email Preference State
  const [senderName, setSenderName] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('Invoice {invoiceNumber}');
  const [emailBody, setEmailBody] = useState<string>('Hi,\n\nPlease find attached invoice {invoiceNumber}.\n\nKind regards,\nYour Business');
  const [emailAutoUpdateStatus, setEmailAutoUpdateStatus] = useState<boolean>(true);

  // Payment Details State
  const [bankName, setBankName] = useState<string>('');
  const [bsb, setBsb] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [paymentInstructions, setPaymentInstructions] = useState<string>('Please pay within terms.');

  // Load all settings from SQLite database on mount
  useEffect(() => {
    window.electronAPI.getSettings().then((settings) => {
      setInitialSettings(settings);
      // Org
      setOrgName(settings['setting_org_name'] || 'Your Business');
      setOrgAbn(settings['setting_org_abn'] || '');
      setOrgAddress(settings['setting_org_address'] || 'Your address here');
      setOrgPhone(settings['setting_org_phone'] || '');
      setOrgEmail(settings['setting_org_email'] || '');

      // Personalisation
      setLanguage(settings['setting_language'] || 'en-AU');
      setDisplayClientNameAs((settings['setting_display_client_name_as'] as 'name' | 'company') || 'name');

      // Invoice
      setDefaultDueDays(settings['setting_default_due_days'] || '14');
      setInvoicePrefix(settings['setting_invoice_prefix'] || 'INV-');
      setDefaultNotes(settings['setting_default_notes'] || '');
      setDefaultGstEnabled(settings['setting_default_gst_enabled'] === 'true');
      setDefaultDisplayDueDate(settings['setting_default_display_due_date'] !== 'false');
      setDefaultTemplateId(settings['setting_default_template_id'] || 'classic');

      // Email
      setSenderName(settings['setting_sender_name'] || '');
      setEmailSubject(settings['setting_email_subject'] || 'Invoice {invoiceNumber}');
      setEmailBody(settings['setting_email_body'] || 'Hi,\n\nPlease find attached invoice {invoiceNumber}.\n\nKind regards,\nYour Business');
      setEmailAutoUpdateStatus(settings['setting_email_auto_update_status'] !== 'false');

      // Payment
      setBankName(settings['setting_bank_name'] || '');
      setBsb(settings['setting_bsb'] || '');
      setAccountNumber(settings['setting_account_number'] || '');
      setPaymentInstructions(settings['setting_payment_instructions'] || 'Please pay within terms.');
    }).catch(console.error);
  }, []);

  // Reset the "Saved" indicator whenever any form value changes
  useEffect(() => {
    if (saveSuccess) setSaveSuccess(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    orgName, orgAbn, orgAddress, orgPhone, orgEmail,
    language, displayClientNameAs,
    defaultDueDays, invoicePrefix, defaultNotes, defaultGstEnabled, defaultDisplayDueDate, defaultTemplateId,
    senderName, emailSubject, emailBody, emailAutoUpdateStatus,
    bankName, bsb, accountNumber, paymentInstructions,
  ]);

  // Compute dirty state by comparing current state with initial database values
  useEffect(() => {
    if (Object.keys(initialSettings).length === 0) {
      onDirtyChange?.(false);
      return;
    }

    const currentSettings: Record<string, string> = {
      setting_org_name: orgName,
      setting_org_abn: orgAbn,
      setting_org_address: orgAddress,
      setting_org_phone: orgPhone,
      setting_org_email: orgEmail,
      setting_language: language,
      setting_display_client_name_as: displayClientNameAs,
      setting_default_due_days: defaultDueDays,
      setting_invoice_prefix: invoicePrefix,
      setting_default_notes: defaultNotes,
      setting_default_gst_enabled: String(defaultGstEnabled),
      setting_default_display_due_date: String(defaultDisplayDueDate),
      setting_default_template_id: defaultTemplateId,
      setting_sender_name: senderName,
      setting_email_subject: emailSubject,
      setting_email_body: emailBody,
      setting_email_auto_update_status: String(emailAutoUpdateStatus),
      setting_bank_name: bankName,
      setting_bsb: bsb,
      setting_account_number: accountNumber,
      setting_payment_instructions: paymentInstructions,
    };

    let isDirty = false;
    for (const key of Object.keys(currentSettings)) {
      const initialVal = initialSettings[key];
      const currentVal = currentSettings[key];

      // Replicate default fallbacks used in mount loading to avoid false dirty alerts
      let resolvedInitial = initialVal;
      if (initialVal === undefined) {
        if (key === 'setting_org_name') resolvedInitial = 'Your Business';
        else if (key === 'setting_org_address') resolvedInitial = 'Your address here';
        else if (key === 'setting_language') resolvedInitial = 'en-AU';
        else if (key === 'setting_display_client_name_as') resolvedInitial = 'name';
        else if (key === 'setting_default_due_days') resolvedInitial = '14';
        else if (key === 'setting_invoice_prefix') resolvedInitial = 'INV-';
        else if (key === 'setting_default_gst_enabled') resolvedInitial = 'false';
        else if (key === 'setting_default_display_due_date') resolvedInitial = 'true';
        else if (key === 'setting_default_template_id') resolvedInitial = 'classic';
        else if (key === 'setting_email_subject') resolvedInitial = 'Invoice {invoiceNumber}';
        else if (key === 'setting_email_body') resolvedInitial = 'Hi,\n\nPlease find attached invoice {invoiceNumber}.\n\nKind regards,\nYour Business';
        else if (key === 'setting_email_auto_update_status') resolvedInitial = 'true';
        else if (key === 'setting_payment_instructions') resolvedInitial = 'Please pay within terms.';
        else resolvedInitial = '';
      }

      if (resolvedInitial !== currentVal) {
        isDirty = true;
        break;
      }
    }

    onDirtyChange?.(isDirty);
  }, [
    initialSettings,
    orgName, orgAbn, orgAddress, orgPhone, orgEmail,
    language,
    defaultDueDays, invoicePrefix, defaultNotes, defaultGstEnabled, defaultDisplayDueDate, defaultTemplateId,
    senderName, emailSubject, emailBody, emailAutoUpdateStatus,
    bankName, bsb, accountNumber, paymentInstructions,
    onDirtyChange, displayClientNameAs
  ]);

  /**
   * Save the settings for the currently active tab to SQLite database.
   */
  const handleSave = async (): Promise<void> => {
    const toSave: Record<string, string> = {};

    if (activeTab === 'organisation') {
      toSave['setting_org_name'] = orgName;
      toSave['setting_org_abn'] = orgAbn;
      toSave['setting_org_address'] = orgAddress;
      toSave['setting_org_phone'] = orgPhone;
      toSave['setting_org_email'] = orgEmail;
    } else if (activeTab === 'personalisation') {
      toSave['setting_language'] = language;
      toSave['setting_display_client_name_as'] = displayClientNameAs;
    } else if (activeTab === 'invoice') {
      toSave['setting_default_due_days'] = defaultDueDays;
      toSave['setting_invoice_prefix'] = invoicePrefix;
      toSave['setting_default_notes'] = defaultNotes;
      toSave['setting_default_gst_enabled'] = String(defaultGstEnabled);
      toSave['setting_default_display_due_date'] = String(defaultDisplayDueDate);
      toSave['setting_default_template_id'] = defaultTemplateId;
    } else if (activeTab === 'email') {
      toSave['setting_sender_name'] = senderName;
      toSave['setting_email_subject'] = emailSubject;
      toSave['setting_email_body'] = emailBody;
      toSave['setting_email_auto_update_status'] = String(emailAutoUpdateStatus);
    } else if (activeTab === 'payment') {
      toSave['setting_bank_name'] = bankName;
      toSave['setting_bsb'] = bsb;
      toSave['setting_account_number'] = accountNumber;
      toSave['setting_payment_instructions'] = paymentInstructions;
    }

    try {
      setIsSaving(true);
      await window.electronAPI.saveSettings(toSave);
      setInitialSettings(prev => ({
        ...prev,
        ...toSave
      }));
      setIsSaving(false);
      setSaveSuccess(true);

      // Dispatch event so other components (like Sidebar) can re-fetch settings
      window.dispatchEvent(new Event('settings-updated'));
    } catch (err) {
      setIsSaving(false);
      console.error('Failed to save settings:', err);
    }
  };

  /**
   * Render the form corresponding to the active settings tab.
   */
  const renderForm = (): React.JSX.Element => {
    switch (activeTab) {
      case 'personalisation':
        return (
          <div className="flex flex-col gap-5 max-w-lg">
            <Input
              label="Language"
              value={language}
              onChange={setLanguage}
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
                    checked={displayClientNameAs === 'name'}
                    onChange={() => setDisplayClientNameAs('name')}
                    className={`appearance-none m-0 w-4 h-4 rounded-full cursor-pointer outline-none transition-all flex-shrink-0 ${
                      displayClientNameAs === 'name'
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
                    checked={displayClientNameAs === 'company'}
                    onChange={() => setDisplayClientNameAs('company')}
                    className={`appearance-none m-0 w-4 h-4 rounded-full cursor-pointer outline-none transition-all flex-shrink-0 ${
                      displayClientNameAs === 'company'
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
              value={orgName}
              onChange={setOrgName}
              placeholder="e.g. PandQ"
            />
            <Input
              label={
                <span className="inline-flex items-center gap-1.5">
                  <span>Business Number / ABN</span>
                  <HelpBadge tooltipText="Your Australian Business Number (11 digits)." />
                </span>
              }
              value={orgAbn}
              onChange={setOrgAbn}
              placeholder="e.g. 12 345 678 901"
            />
            <Input
              label="Address"
              value={orgAddress}
              onChange={setOrgAddress}
              placeholder="Full mailing address"
              multiline
              rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                value={orgPhone}
                onChange={setOrgPhone}
                placeholder="e.g. +61 400 000 000"
              />
              <Input
                label="Public/Billing Email"
                value={orgEmail}
                onChange={setOrgEmail}
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
              value={defaultDueDays}
              onChange={setDefaultDueDays}
              placeholder="e.g. 14"
              type="number"
            />
            <Input
              label="Default Invoice Prefix"
              value={invoicePrefix}
              onChange={setInvoicePrefix}
              placeholder="e.g. INV-"
            />
            <Input
              label="Default Notes & Footers"
              value={defaultNotes}
              onChange={setDefaultNotes}
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
              <Toggle enabled={defaultGstEnabled} onChange={setDefaultGstEnabled} />
            </div>

            {/* Toggle: Default Display Due Date */}
            <div className="flex items-center justify-between py-2.5 border-b border-stone-100 mb-2">
              <div className="flex flex-col gap-0.5 max-w-[80%]">
                <span className="text-sm font-medium text-stone-700">Display Due Date to client</span>
                <span className="text-xs text-stone-400">Toggle whether the due date is visible on new client invoices.</span>
              </div>
              <Toggle enabled={defaultDisplayDueDate} onChange={setDefaultDisplayDueDate} />
            </div>

            {/* Default Template Selector */}
            <div className="flex flex-col gap-2 pt-2">
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Default Invoice Template</label>
              <TemplateSelector
                selectedTemplateId={defaultTemplateId}
                onSelect={setDefaultTemplateId}
              />
            </div>
          </div>
        );
      case 'email':
        return (
          <div className="flex flex-col gap-5 max-w-lg">
            <Input
              label="Default Sender Name"
              value={senderName}
              onChange={setSenderName}
              placeholder="e.g. PandQ Billing"
            />
            <TemplatedInput
              label={
                <span className="inline-flex items-center gap-1.5">
                  <span>Default Subject Template</span>
                  <HelpBadge tooltipText="Customise the email subject line using variables." onClick={() => setIsTutorialOpen(true)} />
                </span>
              }
              value={emailSubject}
              onChange={setEmailSubject}
              placeholder="Use tags to dynamic prefill, e.g. Invoice {invoiceNumber}"
            />
            <TemplatedInput
              label={
                <span className="inline-flex items-center gap-1.5">
                  <span>Default Message Body</span>
                  <HelpBadge tooltipText="Customise the email message body using variables." onClick={() => setIsTutorialOpen(true)} />
                </span>
              }
              value={emailBody}
              onChange={setEmailBody}
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
              <Toggle enabled={emailAutoUpdateStatus} onChange={setEmailAutoUpdateStatus} />
            </div>
          </div>
        );
      case 'payment':
        return (
          <div className="flex flex-col gap-5 max-w-lg">
            <Input
              label="Bank Name"
              value={bankName}
              onChange={setBankName}
              placeholder="e.g. Commonwealth Bank"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="BSB"
                value={bsb}
                onChange={setBsb}
                placeholder="e.g. 062-900"
              />
              <Input
                label="Account Number"
                value={accountNumber}
                onChange={setAccountNumber}
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
              value={paymentInstructions}
              onChange={setPaymentInstructions}
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
          const isOrgNameSet = orgName.trim() !== '' && orgName.trim() !== 'Your Business';
          const isOrgAbnSet = orgAbn.trim() !== '';
          const isOrgAddressSet = orgAddress.trim() !== '' && orgAddress.trim() !== 'Your address here';
          const isOrgEmailSet = orgEmail.trim() !== '';
          const isBankSet = bsb.trim() !== '' && accountNumber.trim() !== '';

          const completedSteps = [isOrgNameSet, isOrgAbnSet, isOrgAddressSet, isOrgEmailSet, isBankSet].filter(Boolean).length;
          const totalSteps = 5;
          const isSetupComplete = completedSteps === totalSteps;

          if (isSetupComplete || isBannerDismissed) return null;

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
