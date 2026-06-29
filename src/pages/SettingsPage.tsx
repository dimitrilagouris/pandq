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

type SettingsTab = 'personalisation' | 'organisation' | 'invoice' | 'email' | 'payment';

/**
 * SettingsPage - provides user preferences and organisation config with persistent local storage storage.
 */
export default function SettingsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>('organisation');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // My Organisation State
  const [orgName, setOrgName] = useState<string>('Your Business');
  const [orgAbn, setOrgAbn] = useState<string>('');
  const [orgAddress, setOrgAddress] = useState<string>('Your address here');
  const [orgPhone, setOrgPhone] = useState<string>('');
  const [orgEmail, setOrgEmail] = useState<string>('');

  // Personalisation State
  const [theme, setTheme] = useState<string>('system');
  const [language, setLanguage] = useState<string>('en-AU');
  const [dateFormat, setDateFormat] = useState<string>('DD/MM/YYYY');

  // Invoice Creation State
  const [defaultDueDays, setDefaultDueDays] = useState<string>('14');
  const [invoicePrefix, setInvoicePrefix] = useState<string>('INV-');
  const [defaultNotes, setDefaultNotes] = useState<string>('');

  // Email Preference State
  const [senderName, setSenderName] = useState<string>('');
  const [replyTo, setReplyTo] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('Invoice {invoiceNumber}');
  const [emailBody, setEmailBody] = useState<string>('Hi,\n\nPlease find attached invoice {invoiceNumber}.\n\nKind regards,\nYour Business');

  // Payment Details State
  const [bankName, setBankName] = useState<string>('');
  const [bsb, setBsb] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [paymentInstructions, setPaymentInstructions] = useState<string>('Please pay within terms.');

  // Load all settings from localStorage on mount
  useEffect(() => {
    // Org
    setOrgName(localStorage.getItem('setting_org_name') || 'Your Business');
    setOrgAbn(localStorage.getItem('setting_org_abn') || '');
    setOrgAddress(localStorage.getItem('setting_org_address') || 'Your address here');
    setOrgPhone(localStorage.getItem('setting_org_phone') || '');
    setOrgEmail(localStorage.getItem('setting_org_email') || '');

    // Personalisation
    setTheme(localStorage.getItem('setting_theme') || 'system');
    setLanguage(localStorage.getItem('setting_language') || 'en-AU');
    setDateFormat(localStorage.getItem('setting_date_format') || 'DD/MM/YYYY');

    // Invoice
    setDefaultDueDays(localStorage.getItem('setting_default_due_days') || '14');
    setInvoicePrefix(localStorage.getItem('setting_invoice_prefix') || 'INV-');
    setDefaultNotes(localStorage.getItem('setting_default_notes') || '');

    // Email
    setSenderName(localStorage.getItem('setting_sender_name') || '');
    setReplyTo(localStorage.getItem('setting_reply_to') || '');
    setEmailSubject(localStorage.getItem('setting_email_subject') || 'Invoice {invoiceNumber}');
    setEmailBody(localStorage.getItem('setting_email_body') || 'Hi,\n\nPlease find attached invoice {invoiceNumber}.\n\nKind regards,\nYour Business');

    // Payment
    setBankName(localStorage.getItem('setting_bank_name') || '');
    setBsb(localStorage.getItem('setting_bsb') || '');
    setAccountNumber(localStorage.getItem('setting_account_number') || '');
    setPaymentInstructions(localStorage.getItem('setting_payment_instructions') || 'Please pay within terms.');
  }, []);

  /**
   * Save the settings for the currently active tab to localStorage.
   */
  const handleSave = (): void => {
    if (activeTab === 'organisation') {
      localStorage.setItem('setting_org_name', orgName);
      localStorage.setItem('setting_org_abn', orgAbn);
      localStorage.setItem('setting_org_address', orgAddress);
      localStorage.setItem('setting_org_phone', orgPhone);
      localStorage.setItem('setting_org_email', orgEmail);
    } else if (activeTab === 'personalisation') {
      localStorage.setItem('setting_theme', theme);
      localStorage.setItem('setting_language', language);
      localStorage.setItem('setting_date_format', dateFormat);
    } else if (activeTab === 'invoice') {
      localStorage.setItem('setting_default_due_days', defaultDueDays);
      localStorage.setItem('setting_invoice_prefix', invoicePrefix);
      localStorage.setItem('setting_default_notes', defaultNotes);
    } else if (activeTab === 'email') {
      localStorage.setItem('setting_sender_name', senderName);
      localStorage.setItem('setting_reply_to', replyTo);
      localStorage.setItem('setting_email_subject', emailSubject);
      localStorage.setItem('setting_email_body', emailBody);
    } else if (activeTab === 'payment') {
      localStorage.setItem('setting_bank_name', bankName);
      localStorage.setItem('setting_bsb', bsb);
      localStorage.setItem('setting_account_number', accountNumber);
      localStorage.setItem('setting_payment_instructions', paymentInstructions);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  /**
   * Render the form corresponding to the active settings tab.
   */
  const renderForm = (): React.JSX.Element => {
    switch (activeTab) {
      case 'personalisation':
        return (
          <div className="flex flex-col gap-5 max-w-lg">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Appearance Mode</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
                <option value="system">System Default</option>
              </select>
            </div>
            <Input
              label="Language"
              value={language}
              onChange={setLanguage}
              placeholder="e.g. en-AU"
            />
            <Input
              label="Date Display Format"
              value={dateFormat}
              onChange={setDateFormat}
              placeholder="e.g. DD/MM/YYYY"
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
          </div>
        );
      case 'email':
        return (
          <div className="flex flex-col gap-5 max-w-lg">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Default Sender Name"
                value={senderName}
                onChange={setSenderName}
                placeholder="e.g. Acme Billing"
              />
              <Input
                label="Default Reply-To Email"
                value={replyTo}
                onChange={setReplyTo}
                placeholder="e.g. hello@acme.com"
                type="email"
              />
            </div>
            <Input
              label="Default Subject Template"
              value={emailSubject}
              onChange={setEmailSubject}
              placeholder="Use {invoiceNumber} as placeholder"
            />
            <Input
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
          <div className="px-3 pb-2">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Account & Org</span>
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
          </nav>
        </div>

        {/* Category: Preferences */}
        <div className="mb-6">
          <div className="px-3 pb-2">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Preferences</span>
          </div>
          <nav className="flex flex-col gap-0.5">
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
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium animate-fade-in select-none">
                <TbCheck className="w-4 h-4" /> Saved successfully
              </span>
            )}
            <Button variant="primary" size="sm" onClick={handleSave}>
              Save Changes
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
