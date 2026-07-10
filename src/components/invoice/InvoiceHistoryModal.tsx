import React, { useEffect, useState } from 'react';
import { RiCloseLine, RiCheckboxCircleFill } from 'react-icons/ri';
import { ActivityLog } from '../../types';

interface InvoiceHistoryModalProps {
  invoiceId: number;
  onClose: () => void;
}

export function InvoiceHistoryModal({ invoiceId, onClose }: InvoiceHistoryModalProps): React.JSX.Element {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const fetchedLogs = await window.electronAPI.getInvoiceActivityLogs(invoiceId);
        setLogs(fetchedLogs);
      } catch (err) {
        console.error('Failed to fetch invoice history:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLogs();
  }, [invoiceId]);

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp.replace(' ', 'T') + 'Z');
      if (!isNaN(date.getTime())) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const hours = date.getHours();
        const ampm = hours >= 12 ? 'pm' : 'am';
        const h = hours % 12 || 12;
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${h}:${pad(date.getMinutes())}${ampm}`;
      }
    } catch {
      // fallback
    }
    return timestamp;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden m-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/50">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Invoice History</h2>
            <p className="text-sm text-stone-500 mt-0.5">Timeline of all recorded activity</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-200 text-stone-500 transition-colors"
          >
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-white relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm text-stone-400">Loading history…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-stone-900 font-medium">No history found</p>
              <p className="text-sm text-stone-500 mt-1">This invoice doesn't have any recorded activity yet.</p>
            </div>
          ) : (
            <div className="relative max-w-xl mx-auto pl-4">
              {/* Vertical line spanning all items */}
              <div className="absolute left-[27px] top-4 bottom-4 w-0.5 border-l-2 border-dashed border-stone-200 z-0"></div>
              
              <div className="flex flex-col gap-8 relative z-10">
                {logs.map((log, index) => {
                  return (
                    <div key={log.id || index} className="flex gap-6 group">
                      {/* Timeline Dot/Icon */}
                      <div className="relative flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-stone-300 mt-1 transition-colors group-hover:border-stone-400">
                        {/* Inner dot */}
                        <div className="w-2.5 h-2.5 rounded-full bg-stone-300 group-hover:bg-stone-400 transition-colors"></div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 flex flex-col pt-1 -mt-1">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-base font-medium text-stone-900 capitalize leading-tight">
                            {log.action_label || log.action_code.replace('_', ' ')}
                          </h3>
                          <span className="text-xs font-medium text-lime-700 bg-lime-50 px-2 py-0.5 rounded flex items-center gap-1.5 flex-shrink-0">
                            <RiCheckboxCircleFill className="w-3.5 h-3.5" />
                            Completed
                          </span>
                        </div>
                        <p className="text-sm text-stone-500 mt-1.5 leading-relaxed pr-8">
                          {log.details || 'No additional details provided.'}
                        </p>
                        <span className="text-xs text-stone-400 mt-3 font-medium">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
