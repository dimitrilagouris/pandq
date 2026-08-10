import React, { useState, useEffect } from 'react';
import { RiCloseLine, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PageData {
  title: string;
  description: React.ReactNode;
  content: React.ReactNode;
}

/** Renders the invoice ID icon. */
const InvoiceIdIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline-block shrink-0">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
    <path d="M16 8H8" />
    <path d="M16 12H8" />
    <path d="M15 16H8" />
  </svg>
);

/** Renders the client name icon. */
const ClientNameIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline-block shrink-0">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/** Renders the organisation name icon. */
const OrgNameIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline-block shrink-0">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="16" />
    <line x1="15" y1="22" x2="15" y2="16" />
    <line x1="9" y1="16" x2="15" y2="16" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M8 10h.01" />
    <path d="M16 10h.01" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
  </svg>
);

/** Renders the due date icon. */
const DueDateIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline-block shrink-0">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

/** Renders the grand total icon. */
const GrandTotalIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline-block shrink-0">
    <circle cx="8" cy="8" r="6" />
    <circle cx="18" cy="18" r="4" />
    <path d="M12 18a6 6 0 0 0-6-6" />
  </svg>
);

/** Renders the close icon. */
const CloseIcon: React.FC = () => (
  <span className="ml-1.5 text-stone-400 inline-flex items-center justify-center p-0.5 rounded-full hover:bg-stone-300/60 transition-colors cursor-pointer align-middle">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[10px] h-[10px]">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </span>
);

/** Renders a display tag chip with icon and label. */
const DisplayTag: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <span className="inline-flex items-center gap-1 bg-stone-200 text-stone-855 pl-2 pr-1 py-0.5 rounded-lg text-xs font-medium select-none mx-0.5 cursor-default border-0 shadow-sm align-middle">
    {icon}
    <span>{label}</span>
    <CloseIcon />
  </span>
);

/** Renders the tutorial modal walkthrough dialog. */
export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const pages: PageData[] = [
    {
      title: "Using Template Commands",
      description: "Insert dynamic invoice variables into your subject lines and email messages.",
      content: (
        <div className="flex flex-col gap-3">
          {/* Walkthrough video tutorial */}
          <div className="w-full h-[210px] rounded-xl border border-stone-200/80 bg-stone-200/50 overflow-hidden shadow-sm flex items-center justify-center">
            <video
              src="/social%20mp4%2030.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-[14px] text-stone-600 leading-relaxed">
            When editing email subjects or messages, press the <kbd className="inline-flex items-center justify-center w-5 h-5 bg-white rounded-md shadow-1 text-stone-900 font-bold border border-stone-200/50 text-[14px] mx-1 align-middle select-none">/</kbd> key. An autocomplete menu will pop up showing all available template commands.
          </p>
        </div>
      )
    },
    {
      title: "Dynamic Commands List",
      description: (
        <span className="inline-flex items-center gap-1.5 flex-wrap">
          <span>Available variables you can insert with the</span>
          <kbd className="inline-flex items-center justify-center w-4 h-4 bg-white rounded shadow-1 text-stone-900 font-bold border border-stone-200/50 text-[10px] align-middle select-none">/</kbd>
          <span>autocomplete menu:</span>
        </span>
      ),
      content: (
        <div className="flex flex-col gap-2 text-stone-800">
          <p className="text-[14px] text-stone-600 leading-relaxed">
            Selecting a command from the slash menu automatically inserts a smart chip that computes fields dynamically:
          </p>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[190px] pr-1">
            <div className="flex items-center justify-between border-b border-stone-200/50 pb-1.5">
              <DisplayTag icon={<InvoiceIdIcon />} label="Invoice ID" />
              <span className="text-[11px] text-stone-500">Unique invoice code (e.g. <code className="bg-stone-150 px-1 py-0.5 rounded text-[10px]">INV-1002</code>)</span>
            </div>
            <div className="flex items-center justify-between border-b border-stone-200/50 pb-1.5">
              <DisplayTag icon={<ClientNameIcon />} label="Client Name" />
              <span className="text-[11px] text-stone-500">Name of the billed client</span>
            </div>
            <div className="flex items-center justify-between border-b border-stone-200/50 pb-1.5">
              <DisplayTag icon={<GrandTotalIcon />} label="Grand Total" />
              <span className="text-[11px] text-stone-500">Total invoice price (e.g. <code className="bg-stone-150 px-1 py-0.5 rounded text-[10px]">$250.00</code>)</span>
            </div>
            <div className="flex items-center justify-between border-b border-stone-200/50 pb-1.5">
              <DisplayTag icon={<DueDateIcon />} label="Due Date" />
              <span className="text-[11px] text-stone-500">Payment due date (e.g. <code className="bg-stone-150 px-1 py-0.5 rounded text-[10px]">31/07/2026</code>)</span>
            </div>
            <div className="flex items-center justify-between pb-0.5">
              <DisplayTag icon={<OrgNameIcon />} label="Organisation Name" />
              <span className="text-[11px] text-stone-500">Your organisation name</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Subject & Message Examples",
      description: "How templates look when composed with variable command chips.",
      content: (
        <div className="flex flex-col gap-3 text-stone-850">
          <p className="text-[14px] text-stone-600 leading-relaxed">
            Visual badges represent active commands. Here is how subject lines and message bodies look:
          </p>
          <div className="flex flex-col gap-2">
            <div className="bg-stone-50 border border-stone-200/50 rounded-xl p-3 shadow-sm flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Example Subject Template</span>
              <div className="text-xs text-stone-850 flex items-center flex-wrap gap-1">
                <span>Invoice</span>
                <DisplayTag icon={<InvoiceIdIcon />} label="Invoice ID" />
                <span>for</span>
                <DisplayTag icon={<ClientNameIcon />} label="Client Name" />
              </div>
            </div>
            <div className="bg-stone-50 border border-stone-200/50 rounded-xl p-3 shadow-sm flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Example Message Body</span>
              <div className="text-[11px] leading-relaxed text-stone-850 flex flex-col gap-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span>Hi</span>
                  <DisplayTag icon={<ClientNameIcon />} label="Client Name" />
                  <span>,</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap mt-1">
                  <span>Please find attached invoice</span>
                  <DisplayTag icon={<InvoiceIdIcon />} label="Invoice ID" />
                  <span>for the amount of</span>
                  <DisplayTag icon={<GrandTotalIcon />} label="Grand Total" />
                  <span>.</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span>It is due on</span>
                  <DisplayTag icon={<DueDateIcon />} label="Due Date" />
                  <span>.</span>
                </div>
                <div className="flex flex-col mt-2">
                  <span>Kind regards,</span>
                  <div className="mt-0.5">
                    <DisplayTag icon={<OrgNameIcon />} label="Organisation Name" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  /** Handles navigation to the previous tutorial page. */
  const handlePrev = (): void => {
    setCurrentPage((prev: number) => Math.max(0, prev - 1));
  };

  /** Handles navigation to the next tutorial page. */
  const handleNext = (): void => {
    setCurrentPage((prev: number) => Math.min(pages.length - 1, prev + 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40">
      <div
        className="w-full max-w-md h-[525px] bg-stone-100 text-stone-800 border border-stone-200/80 rounded-2xl shadow-22 mx-4 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[14px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">
          <h2 className="text-[20px] font-semibold text-stone-900">
            {pages[currentPage].title}
          </h2>
          <div className="flex items-center justify-center">
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors border-0 bg-transparent cursor-pointer flex items-center justify-center">
              <RiCloseLine className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 pb-2 flex-shrink-0">
          <p className="text-[14px] text-stone-500 leading-normal">
            {pages[currentPage].description}
          </p>
        </div>

        {/* Content Body */}
        <div className="px-6 py-2 flex-1 flex flex-col justify-start overflow-hidden text-stone-700">
          {pages[currentPage].content}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 pb-6 pt-3 flex items-center justify-between flex-shrink-0">
          {/* Arrow Left */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentPage === 0}
            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition-all border-0 bg-transparent cursor-pointer"
            aria-label="Previous page"
          >
            <RiArrowLeftSLine className="w-5 h-5" />
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {pages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentPage(idx)}
                className={`w-2 h-2 rounded-full transition-all border-0 cursor-pointer ${idx === currentPage
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
            <RiArrowRightSLine className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
