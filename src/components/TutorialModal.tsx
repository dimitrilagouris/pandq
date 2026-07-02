import React, { useState, useEffect } from 'react';
import { TbX, TbChevronLeft, TbChevronRight } from 'react-icons/tb';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PageData {
  title: string;
  description: string;
  content: React.ReactNode;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentPage, setCurrentPage] = useState(0);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pages: PageData[] = [
    {
      title: "Email Template Variables",
      description: "Learn how to dynamically insert invoice details into your outgoing email subject lines and messages.",
      content: (
        <div className="flex flex-col gap-3.5">
          <p className="text-xs text-stone-600 leading-relaxed">
            By default, Telos populates email content automatically. You can customise these templates using brackets to dynamically reference fields.
          </p>
          <div className="flex flex-col gap-2">
            <div className="bg-stone-50 border border-stone-200/50 rounded-xl p-3 flex flex-col gap-1.5 shadow-sm">
              <span className="text-[11px] font-bold text-stone-700 tracking-wide uppercase">Supported Placeholders</span>
              <ul className="flex flex-col gap-1 text-xs text-stone-600 pl-4 list-disc">
                <li><strong className="font-semibold text-stone-900">{`{invoiceNumber}`}</strong> - Renders invoice IDs (e.g. <code className="bg-stone-200/60 px-1 py-0.5 rounded text-[10px]">INV-1002</code>)</li>
                <li><strong className="font-semibold text-stone-900">{`{clientName}`}</strong> - Renders client or business names</li>
                <li><strong className="font-semibold text-stone-900">{`{grandTotal}`}</strong> - Renders currency format amount (e.g. <code className="bg-stone-200/60 px-1 py-0.5 rounded text-[10px]">$250.00</code>)</li>
                <li><strong className="font-semibold text-stone-900">{`{dueDate}`}</strong> - Renders formatted due date (e.g. <code className="bg-stone-200/60 px-1 py-0.5 rounded text-[10px]">31/07/2026</code>)</li>
                <li><strong className="font-semibold text-stone-900">{`{orgName}`}</strong> - Renders your organization name from settings</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Creating Subject Templates",
      description: "Customise how subjects appear in Mail.app to grab clients' attention.",
      content: (
        <div className="flex flex-col gap-3.5">
          <p className="text-xs text-stone-600 leading-relaxed">
            Subject templates are one-line strings where tags are swapped dynamically on dispatch. Keep them clean and informative.
          </p>
          <div className="flex flex-col gap-2">
            <div className="bg-stone-50 border border-stone-200/50 rounded-xl p-3 shadow-sm flex flex-col gap-1">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Example Subject Template</span>
              <p className="text-xs font-mono text-stone-900 bg-stone-150/50 px-2 py-1 rounded select-all border border-stone-200/30">
                {`Invoice {invoiceNumber} for {clientName}`}
              </p>
            </div>
            <div className="bg-stone-50 border border-stone-200/50 rounded-xl p-3 shadow-sm flex flex-col gap-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Resulting Subject Line</span>
              <p className="text-xs text-stone-800 italic">
                "Invoice INV-1002 for Telos Billing"
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Writing Message Templates",
      description: "Write personalised messages that automatically compute the total and due dates.",
      content: (
        <div className="flex flex-col gap-3.5">
          <p className="text-xs text-stone-600 leading-relaxed">
            Write message bodies with markdown-friendly spaces. Brackets are automatically replaced before opening Mail.app.
          </p>
          <div className="flex flex-col gap-2">
            <div className="bg-stone-50 border border-stone-200/50 rounded-xl p-3 shadow-sm flex flex-col gap-1">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Example Message Template</span>
              <pre className="text-[11px] font-mono text-stone-900 whitespace-pre-wrap leading-relaxed">
{`Hi {clientName},

Please find attached invoice {invoiceNumber} for the amount of {grandTotal}. It is due on {dueDate}.

Kind regards,
{orgName}`}
              </pre>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handlePrev = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentPage(prev => Math.min(pages.length - 1, prev + 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40">
      <div
        className="w-full max-w-md bg-stone-100 border border-stone-200/80 rounded-2xl shadow-22 mx-4 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-base font-semibold text-stone-900">
            {pages[currentPage].title}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors border-0 bg-transparent cursor-pointer">
            <TbX className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <div className="px-6 pb-2">
          <p className="text-xs text-stone-500 leading-normal">
            {pages[currentPage].description}
          </p>
        </div>

        {/* Content Body */}
        <div className="px-6 py-4 flex-1">
          {pages[currentPage].content}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 pb-6 pt-3 flex items-center justify-between">
          {/* Arrow Left */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentPage === 0}
            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition-all border-0 bg-transparent cursor-pointer"
            aria-label="Previous page"
          >
            <TbChevronLeft className="w-5 h-5" />
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {pages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentPage(idx)}
                className={`w-2 h-2 rounded-full transition-all border-0 cursor-pointer ${
                  idx === currentPage
                    ? 'bg-stone-900 w-4'
                    : 'bg-stone-300 hover:bg-stone-450'
                }`}
                aria-label={`Go to page ${idx + 1}`}
              />
            ))}
          </div>

          {/* Arrow Right */}
          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage === pages.length - 1}
            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition-all border-0 bg-transparent cursor-pointer"
            aria-label="Next page"
          >
            <TbChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
