import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { Sidebar } from './layout/Sidebar';
import { Button } from './components/common/Button.tsx';
import InvoicesPage from './pages/InvoicesPage';
import type { PageKey } from './routes/routes';

const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const InvoicePage = lazy(() => import('./pages/InvoicePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ActivitiesPage = lazy(() => import('./pages/ActivitiesPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));

/** Re-export so existing consumers importing `Page` from App.tsx still work. */
export type Page = PageKey;

/** localStorage key — persists first-launch state across app sessions. */
const ONBOARDING_KEY = 'miko_onboarding_complete';

/**
 * Main application component — manages active page and layout.
 */

export default function App(): React.JSX.Element {
  const [activePage, setActivePage] = useState<Page>('invoices');
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [pendingPage, setPendingPage] = useState<Page | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    // VITE_SHOW_ONBOARDING=true in .env.development.local forces the wizard on every launch for debugging.
    () => import.meta.env.VITE_SHOW_ONBOARDING === 'true' || localStorage.getItem(ONBOARDING_KEY) !== 'true'
  );

  /** Mark onboarding done so it never appears again. */
  const handleOnboardingComplete = (): void => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  // Handle Escape key to close the discard confirmation modal
  useEffect(() => {
    if (!showDiscardModal) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDiscardModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDiscardModal]);

  const handleNavigate = useCallback((page: Page, force = false) => {
    if (page === activePage) {
      if (page === 'invoice-editor' && editingInvoiceId !== null) {
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

      if (page === 'invoice-editor' && page !== activePage) {
        setEditingInvoiceId(null);
      }

      setActivePage(page);
    }
  }, [activePage, editingInvoiceId, hasUnsavedChanges]);

  const handleEditInvoice = useCallback((id: number) => {
    setEditingInvoiceId(id);
    setActivePage('invoice-editor');
  }, []);

  const renderPage = (): React.ReactNode => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;

      case 'clients':
        return <ClientsPage />;

      case 'invoices':
        return (
          <InvoicesPage
            onNavigate={handleNavigate}
            onEditInvoice={handleEditInvoice}
          />
        );

      case 'invoice-editor':
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
      {showOnboarding && <OnboardingWizard onComplete={handleOnboardingComplete} />}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
      />
      <main className="flex-1 overflow-hidden h-full">
        <Suspense
          fallback={
            <div className="flex-1 h-full flex items-center justify-center">
              <p className="text-sm text-stone-400">Loading page…</p>
            </div>
          }
        >
          {renderPage()}
        </Suspense>
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
                    if (pendingPage === 'invoice-editor') {
                      setEditingInvoiceId(null);
                    }

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
