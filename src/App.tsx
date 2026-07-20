import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Button } from './components/Button';
import ClientsPage from './pages/ClientsPage';
import InvoicePage from './pages/InvoicePage';
import ProjectsPage from './pages/ProjectsPage';
import SettingsPage from './pages/SettingsPage';
import ActivitiesPage from './pages/ActivitiesPage';
import { DashboardPage } from './pages/DashboardPage';

export type Page = 'dashboard' | 'invoices' | 'clients' | 'activities' | 'settings' | 'projects';

/**
 * Main application component — manages active page and layout.
 */
export default function App(): React.JSX.Element {
  const [activePage, setActivePage] = useState<Page>('projects');
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [pendingPage, setPendingPage] = useState<Page | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState<boolean>(false);

  // Handle Escape key to close the discard confirmation modal
  useEffect(() => {
    if (!showDiscardModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDiscardModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDiscardModal]);

  const handleNavigate = (page: Page, force = false) => {
    if (page === activePage) {
      if (page === 'invoices' && editingInvoiceId !== null) {
        // transitioning from editing to new invoice
      } else {
        return;
      }
    }

    if (hasUnsavedChanges && !force) {
      setPendingPage(page);
      setShowDiscardModal(true);
    } else {
      setHasUnsavedChanges(false);
      if (page === 'invoices') setEditingInvoiceId(null);
      setActivePage(page);
    }
  };

  const renderPage = (): React.ReactNode => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'clients':
        return <ClientsPage />;
      case 'invoices':
        return (
          <InvoicePage 
            onNavigate={handleNavigate} 
            invoiceId={editingInvoiceId} 
            onDirtyChange={setHasUnsavedChanges} 
          />
        );
      case 'settings':
        return <SettingsPage onDirtyChange={setHasUnsavedChanges} />;
      case 'activities':
        return <ActivitiesPage />;
      case 'projects':
        return (
          <ProjectsPage
            onNavigate={(p) => {
              if (p === 'invoices') setEditingInvoiceId(null);
              setActivePage(p);
            }}
            onEditInvoice={(id) => {
              setEditingInvoiceId(id);
              setActivePage('invoices');
            }}
          />
        );
      default:
        return (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-stone-400 text-sm">This page is coming soon.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-stone-100 overflow-hidden font-sans">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
      />
      <main className="flex-1 overflow-hidden h-full">
        {renderPage()}
      </main>

      {/* Unsaved Changes Confirmation Modal (no blur, no click-outside close) */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40">
          <div
            className="w-full max-w-sm bg-stone-100 border border-stone-200/80 rounded-2xl shadow-22 mx-4 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[14px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex flex-col gap-2">
              <h3 className="text-[20px] font-semibold text-stone-900">Unsaved Changes</h3>
              <p className="text-[14px] text-stone-500 leading-relaxed">
                {activePage === 'settings'
                  ? 'You have unsaved changes in your settings. If you leave now, your changes will be discarded.'
                  : 'You have unsaved changes on this invoice. If you leave now, your changes will be discarded.'}
              </p>
            </div>
            <div className="px-6 pb-6 pt-2 flex justify-end gap-3">
              <Button
                variant="secondary"
                type="button"
                size="sm"
                onClick={() => setShowDiscardModal(false)}
              >
                Keep Editing
              </Button>
              <Button
                variant="danger"
                type="button"
                size="sm"
                onClick={() => {
                  setHasUnsavedChanges(false);
                  setShowDiscardModal(false);
                  if (pendingPage) {
                    if (pendingPage === 'invoices') setEditingInvoiceId(null);
                    setActivePage(pendingPage);
                  }
                }}
              >
                Discard & Leave
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

