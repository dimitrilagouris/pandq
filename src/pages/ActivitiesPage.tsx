import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TbSearch } from 'react-icons/tb';
import { Table, ColumnDef } from '../components/Table';
import { Input } from '../components/Input';

interface ActivityLog {
  id: number;
  invoice_id: number | null;
  invoice_number: string | null;
  action_code: string;
  action_label: string;
  action_category: string;
  details: string | null;
  timestamp: string;
}

export default function ActivitiesPage(): React.JSX.Element {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string>('');

  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const loadLogs = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const data = await window.electronAPI.getActivityLogs();
      setLogs(data as ActivityLog[]);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load activities.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Recalculate slider positioning
  useEffect(() => {
    const activeBtn = buttonRefs.current[statusFilter];
    const container = containerRef.current;
    if (activeBtn && container) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      setSliderStyle({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
        opacity: 1,
      });
    }
  }, [statusFilter, logs]);

  const statusOptions = ['all', 'created', 'updated', 'sent', 'status_updated', 'deleted'];

  const getStatusCount = (statusKey: string): number => {
    if (statusKey === 'all') return logs.length;
    if (statusKey === 'created') return logs.filter((log) => log.action_code?.includes('created')).length;
    if (statusKey === 'updated') return logs.filter((log) => log.action_code?.includes('updated') || log.action_code?.includes('toggled')).length;
    if (statusKey === 'sent') return logs.filter((log) => log.action_code?.includes('sent')).length;
    if (statusKey === 'status_updated') return logs.filter((log) => log.action_code?.includes('status_updated')).length;
    if (statusKey === 'deleted') return logs.filter((log) => log.action_code?.includes('deleted') || log.action_code?.includes('removed')).length;
    return 0;
  };

  const filtered = logs.filter((log) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (log.invoice_number && log.invoice_number.toLowerCase().includes(searchLower)) ||
      (log.details && log.details.toLowerCase().includes(searchLower)) ||
      (log.action_label && log.action_label.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'created') return log.action_code?.includes('created');
    if (statusFilter === 'updated') return log.action_code?.includes('updated') || log.action_code?.includes('toggled');
    if (statusFilter === 'sent') return log.action_code?.includes('sent');
    if (statusFilter === 'status_updated') return log.action_code?.includes('status_updated');
    if (statusFilter === 'deleted') return log.action_code?.includes('deleted') || log.action_code?.includes('removed');
    return false;
  });

  const columns: ColumnDef<ActivityLog>[] = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      width: '1.8fr',
      render: (log) => {
        let formattedDate = log.timestamp;
        try {
          const date = new Date(log.timestamp.replace(' ', 'T') + 'Z');
          if (!isNaN(date.getTime())) {
            const pad = (n: number) => String(n).padStart(2, '0');
            formattedDate = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
          }
        } catch {}
        return <span className="text-stone-500 whitespace-nowrap">{formattedDate}</span>;
      }
    },
    {
      header: 'Invoice',
      accessor: 'invoice_number',
      width: '1.2fr',
      render: (log) => (
        <span className="font-mono font-medium text-stone-900">{log.invoice_number || 'N/A'}</span>
      )
    },
    {
      header: 'Action',
      accessor: 'action_label',
      width: '1.5fr',
      render: (log) => {
        let badgeClass = 'text-stone-700 bg-stone-100';
        const code = log.action_code || '';
        
        if (code.includes('created')) {
          badgeClass = 'text-blue-700 bg-blue-50';
        } else if (code.includes('updated') || code.includes('toggled')) {
          badgeClass = 'text-purple-700 bg-purple-50';
        } else if (code.includes('sent')) {
          badgeClass = 'text-orange-700 bg-orange-50';
        } else if (code.includes('status_updated')) {
          badgeClass = 'text-lime-700 bg-lime-50';
        } else if (code.includes('deleted') || code.includes('removed')) {
          badgeClass = 'text-red-700 bg-red-50';
        }

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide ${badgeClass}`}>
            {log.action_label || 'Activity'}
          </span>
        );
      }
    },
    {
      header: 'Details',
      accessor: 'details',
      width: '4fr',
      render: (log) => (
        <span className="text-stone-600 leading-normal">{log.details || ''}</span>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full p-6 gap-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Activities</h1>
          <p className="text-sm text-stone-500 mt-0.5">{logs.length} event{logs.length !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="flex items-center justify-between gap-4">
        {/* Status Filters Pill Navigation */}
        <div
          ref={containerRef}
          className="relative flex bg-stone-200 p-0.5 rounded-xl w-fit shadow-sm text-xs font-medium select-none items-center gap-0.5"
        >
          {/* Sliding background highlight */}
          <div
            style={{
              transform: `translateX(${sliderStyle.left}px)`,
              width: `${sliderStyle.width}px`,
              opacity: sliderStyle.opacity,
            }}
            className="absolute top-0.5 bottom-0.5 left-0 bg-white rounded-lg shadow-1 transition-all duration-300 ease-out pointer-events-none"
          />

          {statusOptions.map((opt) => {
            const isSelected = statusFilter === opt;
            const count = getStatusCount(opt);
            const displayLabel = opt === 'all' ? 'All' : opt.replace('_', ' ').charAt(0).toUpperCase() + opt.replace('_', ' ').slice(1);

            return (
              <button
                key={opt}
                ref={(el) => { buttonRefs.current[opt] = el; }}
                type="button"
                onClick={() => setStatusFilter(opt)}
                className={`relative z-10 flex items-center px-3 py-1.5 rounded-lg transition-all duration-150 border-0 cursor-pointer text-xs font-medium bg-transparent ${isSelected
                    ? 'text-stone-900'
                    : 'text-stone-500 hover:text-stone-900'
                  }`}
              >
                <span>{displayLabel}</span>
                <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all duration-150 ${isSelected
                    ? 'bg-stone-100 text-stone-855'
                    : 'bg-stone-300 text-stone-600'
                  }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <Input
          value={search}
          onChange={setSearch}
          placeholder="Search activities…"
          icon={<TbSearch className="w-4 h-4" />}
          className="max-w-xs"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-stone-400">Loading activities…</p>
        </div>
      ) : (
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(log) => log.id}
          emptyMessage={search ? 'No activities match your search.' : 'No activities logged yet.'}
        />
      )}
    </div>
  );
}
