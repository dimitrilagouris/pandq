import React, { useState, useEffect } from 'react';
import { Item } from './types';
import { Sidebar } from './components/Sidebar';

/**
 * Main application component containing a SQLite database demonstration interface.
 */
export default function App(): React.JSX.Element {
  const [items, setItems] = useState<Item[]>([]);
  const [nameInput, setNameInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  /**
   * Fetch all records from the SQLite database.
   */
  const loadDatabaseItems = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const fetchedItems: Item[] = await window.electronAPI.getItems();
      setItems(fetchedItems);
      setErrorMsg('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to query database');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle form submission to create a new item.
   */
  const handleAddNewItem = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!nameInput.trim()) {
      return;
    }

    try {
      await window.electronAPI.addItem(nameInput.trim());
      setNameInput('');
      await loadDatabaseItems();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to insert row');
    }
  };

  useEffect((): void => {
    loadDatabaseItems();
  }, []);

  return (
    <div className="flex h-screen w-full bg-stone-50 overflow-hidden font-sans">
      <Sidebar />
      
      <main className="flex-1 overflow-auto p-4 flex flex-col items-center">
        <div className="w-full max-w-xl bg-white p-8 shadow-sm border border-stone-200 rounded-[12px] mt-8">
          <header className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Mikovoice Boilerplate
            </h1>
            <p className="text-stone-500 text-sm mt-1">
              Electron + React + TypeScript + SQLite + Tailwind CSS
            </p>
          </header>

          {errorMsg && (
            <div className="mb-6 p-4 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAddNewItem} className="flex gap-3 mb-8">
            <input
              type="text"
              value={nameInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNameInput(e.target.value)}
              placeholder="Enter an item name..."
              className="flex-1 px-4 py-2 rounded-[8px] bg-stone-50 border border-stone-200 focus:border-stone-900 focus:outline-none transition-colors text-stone-900 placeholder-stone-400 text-sm"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-stone-900 hover:bg-stone-950 rounded-[8px] font-medium text-stone-50 shadow-sm transition-all text-sm"
            >
              Add Record
            </button>
          </form>

          <section>
            <h2 className="text-sm font-semibold mb-3 text-stone-700">
              SQLite Database Records
            </h2>

            {isLoading ? (
              <p className="text-stone-500 text-sm">Loading records...</p>
            ) : items.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-stone-200 rounded-[8px]">
                <p className="text-stone-500 text-sm">No records found. Try adding one above!</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((item: Item) => (
                  <li
                    key={item.id}
                    className="flex justify-between items-center px-4 py-3 rounded-[8px] bg-stone-50 border border-stone-200"
                  >
                    <span className="font-medium text-sm text-stone-900">{item.name}</span>
                    <span className="text-xs text-stone-500">
                      {new Date(item.created_at).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
