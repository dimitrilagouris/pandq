import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import ClientsPage from './pages/ClientsPage';
import InvoicePage from './pages/InvoicePage';

export type Page = 'dashboard' | 'invoices' | 'clients' | 'activities' | 'settings';

/**
 * Main application component — manages active page and layout.
 */
export default function App(): React.JSX.Element {
  const [activePage, setActivePage] = useState<Page>('clients');

  const renderPage = (): React.ReactNode => {
    switch (activePage) {
      case 'clients':
        return <ClientsPage />;
      case 'invoices':
        return <InvoicePage onNavigate={setActivePage} />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-stone-400 text-sm">This page is coming soon.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-stone-50 overflow-hidden font-sans">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 overflow-hidden h-full">
        {renderPage()}
      </main>
    </div>
  );
}

