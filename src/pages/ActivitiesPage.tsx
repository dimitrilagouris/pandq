import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';
import { ActivityLog } from '../types/models';
import { Table, ColumnDef } from '../components/common/Table.tsx';
import { Input } from '../components/common/Input.tsx';
import { Dropdown, DropdownOption } from '../components/common/Dropdown.tsx';
import { Badge } from '../components/common/Badge.tsx';
import { DatePicker } from '../components/common/DatePicker.tsx';

interface SearchableInvoiceDropdownProps {
  value: string;
  options: string[];
  onChange: (val: string) => void;
}

/**
 * Autocomplete dropdown component for selecting an invoice filter by number.
 */
const SearchableInvoiceDropdown: React.FC<SearchableInvoiceDropdownProps> = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()));

  let displayValue = value;
  if (value === 'all') {
    if (isOpen) {
      displayValue = searchQuery;
    } else {
      displayValue = 'All Invoices';
    }
  }

  return (
    <div className="flex flex-col gap-1 min-w-[180px] relative" ref={containerRef}>
      <span className="text-xs font-medium text-stone-500 tracking-wide select-none px-1">
        Invoice
      </span>
      <div className="relative">
        <Input
          value={displayValue}
          onChange={(val) => {
            setSearchQuery(val);
            if (!isOpen) {
              setIsOpen(true);
            }
            if (val === '') {
              onChange('all');
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            if (value === 'all') {
              setSearchQuery('');
            } else {
              setSearchQuery(value);
            }
          }}
          placeholder="Select invoice..."
          className="w-full"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
          <RiArrowDownSLine className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-stone-700/95 backdrop-blur-md border border-white/5 rounded-2xl shadow-22 max-h-60 overflow-y-auto p-1.5 flex flex-col gap-0.5 animate-dropdown-pop">
            <button
              type="button"
              onClick={() => {
                onChange('all');
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 rounded-xl transition-all duration-150 text-xs font-medium
                ${value === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-stone-200 hover:bg-white/5'}
              `}
            >
              All Invoices
            </button>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt === value;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl transition-all duration-150 text-xs font-medium
                      ${isSelected ? 'bg-white/10 text-white shadow-sm' : 'text-stone-200 hover:bg-white/5'}
                    `}
                  >
                    {opt}
                  </button>
                );
              })
            ) : (
              <span className="text-[10px] text-stone-450 italic px-3 py-1.5 select-none">
                No matching invoices
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Activity log page — displays audit trail of invoice mutations with date and category filters.
 */
export default function ActivitiesPage(): React.JSX.Element {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Advanced filters
  const [selectedInvoice, setSelectedInvoice] = useState<string>('all');
  const [activityType, setActivityType] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [error, setError] = useState<string>('');

  /** Fetches full audit logs from SQLite database. */
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

  // Get unique invoice numbers for dropdown filter
  const uniqueInvoices = useMemo(
    () =>
      Array.from(
        new Set(
          logs
            .map((l) => l.invoice_number)
            .filter((num): num is string => typeof num === 'string' && num.trim() !== '')
        )
      ).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      // 1. Activity Type filter match
      if (activityType !== 'all') {
        if (activityType === 'created' && !log.action_code?.includes('created')) {
          return false;
        }
        if (activityType === 'updated' && !log.action_code?.includes('updated') && !log.action_code?.includes('toggled')) {
          return false;
        }
        if (activityType === 'sent' && !log.action_code?.includes('sent')) {
          return false;
        }
        if (activityType === 'status_updated' && !log.action_code?.includes('status_updated')) {
          return false;
        }
        if (activityType === 'deleted' && !log.action_code?.includes('deleted') && !log.action_code?.includes('removed')) {
          return false;
        }
      }

      // 2. Invoice dropdown filter match
      if (selectedInvoice !== 'all' && log.invoice_number !== selectedInvoice) {
        return false;
      }

      // 3. Date range match
      if (startDate || endDate) {
        const logDate = new Date(log.timestamp.replace(' ', 'T') + 'Z');
        const timeMs = logDate.getTime();

        if (startDate) {
          const start = new Date(startDate + 'T00:00:00');
          if (timeMs < start.getTime()) {
            return false;
          }
        }
        if (endDate) {
          const end = new Date(endDate + 'T23:59:59.999');
          if (timeMs > end.getTime()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [logs, activityType, selectedInvoice, startDate, endDate]);

  const activityTypeOptions: DropdownOption[] = [
    { value: 'all', label: 'All Activities' },
    { value: 'created', label: 'Created' },
    { value: 'updated', label: 'Updated' },
    { value: 'sent', label: 'Sent' },
    { value: 'status_updated', label: 'Status Updated' },
    { value: 'deleted', label: 'Deleted' }
  ];

  const columns: ColumnDef<ActivityLog>[] = [
    {
      header: 'Timestamp',
      key: 'timestamp',
      width: '1.8fr',
      render: (log) => {
        let formattedDate = log.timestamp;
        try {
          const date = new Date(log.timestamp.replace(' ', 'T') + 'Z');
          if (!isNaN(date.getTime())) {
            const pad = (n: number) => String(n).padStart(2, '0');
            const hours = date.getHours();
            let ampm = 'am';
            if (hours >= 12) {
              ampm = 'pm';
            }
            const h = hours % 12 || 12;
            formattedDate = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${h}:${pad(date.getMinutes())}${ampm}`;
          }
        } catch { }
        return <span className="whitespace-nowrap">{formattedDate}</span>;
      }
    },
    {
      header: 'Invoice',
      key: 'invoice_number',
      width: '1.2fr',
      render: (log) => (
        <span>{log.invoice_number || '—'}</span>
      )
    },
    {
      header: 'Action',
      key: 'action_label',
      width: '1.5fr',
      render: (log) => {
        const code = log.action_code || '';
        return (
          <Badge activityAction={code}>
            {log.action_label || 'Activity'}
          </Badge>
        );
      }
    },
    {
      header: 'Details',
      key: 'details',
      width: '4fr',
      render: (log) => (
        <span className="leading-normal">{log.details || ''}</span>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full p-6 gap-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Activity</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {logs.length} event{logs.length === 1 ? '' : 's'} total
          </p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-end gap-4 text-xs">
        {/* Searchable Invoice Autocomplete */}
        <SearchableInvoiceDropdown
          value={selectedInvoice}
          options={uniqueInvoices}
          onChange={setSelectedInvoice}
        />

        {/* Activity Type Filter */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <span className="text-xs font-medium text-stone-500 tracking-wide select-none px-1">
            Activity Type
          </span>
          <Dropdown
            variant="input"
            value={activityType}
            placeholder="Select type..."
            options={activityTypeOptions}
            onSelect={setActivityType}
            triggerLabel={activityTypeOptions.find(opt => opt.value === activityType)?.label || 'All Activities'}
            widthClass="w-[180px]"
          />
        </div>

        {/* Start Date */}
        <div className="w-[180px]">
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
          />
        </div>

        {/* End Date */}
        <div className="w-[180px]">
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={setEndDate}
          />
        </div>

        {/* Clear Filters Button */}
        {(selectedInvoice !== 'all' || activityType !== 'all' || startDate !== '' || endDate !== '') && (
          <button
            onClick={() => {
              setSelectedInvoice('all');
              setActivityType('all');
              setStartDate('');
              setEndDate('');
            }}
            className="border border-transparent bg-stone-200 hover:bg-stone-300 text-stone-800 px-4 rounded-xl transition-all cursor-pointer text-sm font-medium h-10 flex items-center justify-center shadow-1"
          >
            Clear Filters
          </button>
        )}
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
          emptyMessage="No activities logged yet."
        />
      )}
    </div>
  );
}
