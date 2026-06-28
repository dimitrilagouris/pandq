import React, { useState, useEffect } from 'react';
import { Item } from './types';

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
    <div className="flex flex-col items-center justify-center p-12 min-h-screen">
      <div className="w-full max-w-xl glass-panel p-8 shadow-2xl">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-500 bg-clip-text text-transparent">
            Mikovoice Boilerplate
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Electron + React + TypeScript + SQLite + Tailwind CSS
          </p>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 rounded bg-red-950/40 border border-red-500/20 text-red-300 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAddNewItem} className="flex gap-3 mb-8">
          <input
            type="text"
            value={nameInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNameInput(e.target.value)}
            placeholder="Enter an item name..."
            className="flex-1 px-4 py-2 rounded bg-slate-900/80 border border-slate-700/50 focus:border-teal-500 focus:outline-none transition-colors text-slate-100 placeholder-slate-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 rounded font-semibold text-slate-950 shadow-md hover:shadow-teal-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            Add Record
          </button>
        </form>

        <section>
          <h2 className="text-lg font-semibold mb-4 text-slate-200">
            SQLite Database Records
          </h2>

          {isLoading ? (
            <p className="text-slate-500 text-sm">Loading records...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-800 rounded">
              <p className="text-slate-500 text-sm">No records found. Try adding one above!</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item: Item) => (
                <li
                  key={item.id}
                  className="flex justify-between items-center px-4 py-3 rounded bg-slate-800/40 border border-slate-700/20 hover:bg-slate-800/60 transition-colors"
                >
                  <span className="font-medium text-slate-300">{item.name}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
