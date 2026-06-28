import React from 'react';
import { Sidebar } from './components/Sidebar';

/**
 * Main application component.
 */
export default function App(): React.JSX.Element {
  return (
    <div className="flex h-screen w-full bg-stone-50 overflow-hidden font-sans">
      <Sidebar />
      
      <main className="flex-1 overflow-auto p-4 flex flex-col items-center">
        <div className="w-full max-w-xl bg-white p-8 shadow-sm border border-stone-200 rounded-[12px] mt-8">
          <header className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Invoices Dashboard
            </h1>
            <p className="text-stone-500 text-sm mt-1">
              Select a page from the sidebar to get started.
            </p>
          </header>
          
          <div className="text-center py-6 border border-dashed border-stone-200 rounded-[8px]">
            <p className="text-stone-500 text-sm">Dashboard content will appear here.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
