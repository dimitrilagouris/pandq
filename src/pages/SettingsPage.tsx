import React, { useState, useEffect } from 'react';
import {
  TbPalette,
  TbBuilding,
  TbReceipt,
  TbMail,
  TbCreditCard,
  TbCheck
} from 'react-icons/tb';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { TemplatedInput } from '../components/TemplatedInput';

type SettingsTab = 'personalisation' | 'organisation' | 'invoice' | 'email' | 'payment';

/**
 * SettingsPage - provides user preferences and organisation config with persistent local storage storage.
 */
export default function SettingsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>('organisation');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // My Organisation State
  const [orgName, setOrgName] = useState<string>('Your Business');
  const [orgAbn, setOrgAbn] = useState<string>('');
  const [orgAddress, setOrgAddress] = useState<string>('Your address here');
  const [orgPhone, setOrgPhone] = useState<string>('');
  const [orgEmail, setOrgEmail] = useState<string>('');

  // Personalisation State
  const [language, setLanguage] = useState<string>('en-AU');

  // Invoice Creation State
  const [defaultDueDays, setDefaultDueDays] = useState<string>('14');
  const [invoicePrefix, setInvoicePrefix] = useState<string>('INV-');
  const [defaultNotes, setDefaultNotes] = useState<string>('');
  const [defaultGstEnabled, setDefaultGstEnabled] = useState<boolean>(false);
  const [defaultDisplayDueDate, setDefaultDisplayDueDate] = useState<boolean>(true);

  // Email Preference State
  const [senderName, setSenderName] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('Invoice {invoiceNumber}');
  const [emailBody, setEmailBody] = useState<string>('Hi,\n\nPlease find attached invoice {invoiceNumber}.\n\nKind regards,\nYour Business');

  // Payment Details State
  const [bankName, setBankName] = useState<string>('');
  const [bsb, setBsb] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [paymentInstructions, setPaymentInstructions] = useState<string>('Please pay within terms.');

  // Load all settings from SQLite database on mount
  useEffect(() => {
    window.electronAPI.getSettings().then((settings) => {
      // Org
      setOrgName(settings['setting_org_name'] || 'Your Business');
      setOrgAbn(settings['setting_org_abn'] || '');
      setOrgAddress(settings['setting_org_address'] || 'Your address here');
      setOrgPhone(settings['setting_org_phone'] || '');
      setOrgEmail(settings['setting_org_email'] || '');

      // Personalisation
      setLanguage(settings['setting_language'] || 'en-AU');

      // Invoice
      setDefaultDueDays(settings['setting_default_due_days'] || '14');
      setInvoicePrefix(settings['setting_invoice_prefix'] || 'INV-');
      setDefaultNotes(settings['setting_default_notes'] || '');
      setDefaultGstEnabled(settings['setting_default_gst_enabled'] === 'true');
      setDefaultDisplayDueDate(settings['setting_default_display_due_date'] !== 'false');

      // Email
      setSenderName(settings['setting_sender_name'] || '');
      setEmailSubject(settings['setting_email_subject'] || 'Invoice {invoiceNumber}');
      setEmailBody(settings['setting_email_body'] || 'Hi,\n\nPlease find attached invoice {invoiceNumber}.\n\nKind regards,\nYour Business');

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
    language,
    defaultDueDays, invoicePrefix, defaultNotes, defaultGstEnabled, defaultDisplayDueDate,
    senderName, emailSubject, emailBody,
    bankName, bsb, accountNumber, paymentInstructions,
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
    } else if (activeTab === 'invoice') {
      toSave['setting_default_due_days'] = defaultDueDays;
      toSave['setting_invoice_prefix'] = invoicePrefix;
      toSave['setting_default_notes'] = defaultNotes;
      toSave['setting_default_gst_enabled'] = String(defaultGstEnabled);
      toSave['setting_default_display_due_date'] = String(defaultDisplayDueDate);
    } else if (activeTab === 'email') {
      toSave['setting_sender_name'] = senderName;
      toSave['setting_email_subject'] = emailSubject;
      toSave['setting_email_body'] = emailBody;
    } else if (activeTab === 'payment') {
      toSave['setting_bank_name'] = bankName;
      toSave['setting_bsb'] = bsb;
      toSave['setting_account_number'] = accountNumber;
      toSave['setting_payment_instructions'] = paymentInstructions;
    }

    try {
      setIsSaving(true);
      await window.electronAPI.saveSettings(toSave);
      setIsSaving(false);
      setSaveSuccess(true);
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
          </div>
        );
      case 'organisation':
        return (
          <div className="flex flex-col gap-5 max-w-lg">
            <Input
              label="Organisation Name"
              value={orgName}
              onChange={setOrgName}
              placeholder="e.g. Acme Corp"
            />
            <Input
              label="Business Number / ABN"
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
                placeholder="e.g. accounts@acme.com"
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
                <span className="text-sm font-medium text-stone-700">Enable GST by default</span>
                <span className="text-xs text-stone-400">Enable GST calculations automatically on all new invoices.</span>
              </div>
              <button
                type="button"
                onClick={() => setDefaultGstEnabled(!defaultGstEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2
                  ${defaultGstEnabled ? 'bg-stone-800' : 'bg-stone-200'}
                `}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${defaultGstEnabled ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>

            {/* Toggle: Default Display Due Date */}
            <div className="flex items-center justify-between py-2.5 border-b border-stone-100">
              <div className="flex flex-col gap-0.5 max-w-[80%]">
                <span className="text-sm font-medium text-stone-700">Display Due Date to client</span>
                <span className="text-xs text-stone-400">Toggle whether the due date is visible on new client invoices.</span>
              </div>
              <button
                type="button"
                onClick={() => setDefaultDisplayDueDate(!defaultDisplayDueDate)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2
                  ${defaultDisplayDueDate ? 'bg-stone-800' : 'bg-stone-200'}
                `}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${defaultDisplayDueDate ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
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
              placeholder="e.g. Acme Billing"
            />
            <TemplatedInput
              label="Default Subject Template"
              value={emailSubject}
              onChange={setEmailSubject}
              placeholder="Use tags to dynamic prefill, e.g. Invoice {invoiceNumber}"
            />
            <TemplatedInput
              label="Default Message Body"
              value={emailBody}
              onChange={setEmailBody}
              placeholder="Write the default body text"
              multiline
              rows={5}
            />
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
              label="Additional Payment Instructions"
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
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium text-left
                ${activeTab === 'organisation'
                  ? 'bg-stone-100 text-stone-900'
                  : 'text-stone-600 hover:bg-stone-100/50 hover:text-stone-900'}
              `}
            >
              <TbBuilding className={`w-4 h-4 flex-shrink-0 ${activeTab === 'organisation' ? 'text-stone-900' : 'text-stone-400'}`} />
              <span>My Organisation</span>
            </button>
            <button
              onClick={() => { setActiveTab('payment'); setSaveSuccess(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium text-left
                ${activeTab === 'payment'
                  ? 'bg-stone-100 text-stone-900'
                  : 'text-stone-600 hover:bg-stone-100/50 hover:text-stone-900'}
              `}
            >
              <TbCreditCard className={`w-4 h-4 flex-shrink-0 ${activeTab === 'payment' ? 'text-stone-900' : 'text-stone-400'}`} />
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
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium text-left
                ${activeTab === 'personalisation'
                  ? 'bg-stone-100 text-stone-900'
                  : 'text-stone-600 hover:bg-stone-100/50 hover:text-stone-900'}
              `}
            >
              <TbPalette className={`w-4 h-4 flex-shrink-0 ${activeTab === 'personalisation' ? 'text-stone-900' : 'text-stone-400'}`} />
              <span>Personalisation</span>
            </button>
            <button
              onClick={() => { setActiveTab('invoice'); setSaveSuccess(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium text-left
                ${activeTab === 'invoice'
                  ? 'bg-stone-100 text-stone-900'
                  : 'text-stone-600 hover:bg-stone-100/50 hover:text-stone-900'}
              `}
            >
              <TbReceipt className={`w-4 h-4 flex-shrink-0 ${activeTab === 'invoice' ? 'text-stone-900' : 'text-stone-400'}`} />
              <span>Invoice Creation</span>
            </button>
            <button
              onClick={() => { setActiveTab('email'); setSaveSuccess(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm font-medium text-left
                ${activeTab === 'email'
                  ? 'bg-stone-100 text-stone-900'
                  : 'text-stone-600 hover:bg-stone-100/50 hover:text-stone-900'}
              `}
            >
              <TbMail className={`w-4 h-4 flex-shrink-0 ${activeTab === 'email' ? 'text-stone-900' : 'text-stone-400'}`} />
              <span>Email Preference</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* ── Settings Content Panel (Right side of page) ── */}
      <main className="flex-1 h-full overflow-y-auto px-10 py-8 flex flex-col">
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
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className={`transition-all duration-300 ${
                saveSuccess ? 'bg-lime-600 hover:bg-lime-700 text-white' : ''
              }`}
            >
              {isSaving ? 'Saving…' : saveSuccess ? 'Saved' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="flex-1">
          {renderForm()}
        </div>
      </main>

    </div>
  );
}
