import React, { useEffect, useState, useMemo } from 'react';
import { StatusDistributionCard, StatusMetric } from '../components/dashboard/StatusDistributionCard';
import { Invoice, InvoiceStatus } from '../types/models';
import { Badge, BadgeVariant } from '../components/common/Badge.tsx';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RiTimeLine, RiCheckboxCircleLine, RiReceiptLine } from 'react-icons/ri';
import { DashboardCard } from '../components/dashboard/DashboardCard';
import { DashboardChartTooltip } from '../components/dashboard/DashboardChartTooltip';
import { Table, ColumnDef } from '../components/common/Table.tsx';
import { Page } from '../App';
import { InvoiceStatusFilterPill, FilterPillOption } from '../components/invoice/InvoiceStatusFilterPill';

interface DashboardPageProps {
  onNavigate?: (page: Page) => void;
}

type TimeframeOption = 'all' | '30days' | 'year';

const TAILWIND_HEX_COLORS: Record<string, string> = {
  stone: '#78716c',
  blue: '#3b82f6',
  lime: '#84cc16',
  amber: '#f59e0b',
  rose: '#f43f5e',
  emerald: '#10b981',
  red: '#ef4444',
  purple: '#a855f7',
  orange: '#f97316',
};

/**
 * Main Dashboard page presenting business metrics, revenue history, and recent invoices.
 */
export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceStatuses, setInvoiceStatuses] = useState<InvoiceStatus[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Timeframe selector state
  const [timeFilter, setTimeFilter] = useState<TimeframeOption>('all');

  const timeOptions: FilterPillOption<TimeframeOption>[] = [
    { key: 'all', label: 'All time' },
    { key: '30days', label: 'Last 30 days' },
    { key: 'year', label: 'This year' },
  ];

  // Compute filtered invoices based on timeframe selection
  const filteredInvoices: Invoice[] = useMemo(() => {
    const now: Date = new Date();
    return invoices.filter((inv: Invoice) => {
      if (timeFilter === 'all') {
        return true;
      }
      if (!inv.date) {
        return false;
      }
      const invDate: Date = new Date(inv.date);
      if (isNaN(invDate.getTime())) {
        return false;
      }

      if (timeFilter === '30days') {
        const thirtyDaysAgo: Date = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return invDate >= thirtyDaysAgo && invDate <= now;
      }
      if (timeFilter === 'year') {
        const startOfYear: Date = new Date(now.getFullYear(), 0, 1);
        const endOfYear: Date = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        return invDate >= startOfYear && invDate <= endOfYear;
      }
      return true;
    });
  }, [invoices, timeFilter]);

  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        const [invData, statusData, settingsData] = await Promise.all([
          window.electronAPI.getInvoices(),
          window.electronAPI.getInvoiceStatuses(),
          window.electronAPI.getSettings(),
        ]);
        setInvoices(invData || []);
        setInvoiceStatuses(statusData || []);
        setSettings(settingsData || {});
      } catch (err: unknown) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  /** Returns hex colour string for status badge matching database settings. */
  const getStatusHexColor = (name: string, defaultColor: string): string => {
    const status: InvoiceStatus | undefined = invoiceStatuses.find(
      (s: InvoiceStatus) => s.name.toLowerCase() === name.toLowerCase()
    );
    if (status) {
      return TAILWIND_HEX_COLORS[status.color] ?? defaultColor;
    }
    return defaultColor;
  };

  /** Maps status name to corresponding BadgeVariant. */
  const getStatusVariant = (statusName: string): BadgeVariant => {
    const norm: string = statusName.toLowerCase();
    const found: InvoiceStatus | undefined = invoiceStatuses.find(
      (s: InvoiceStatus) => s.name.toLowerCase() === norm
    );
    return (found?.color as BadgeVariant) ?? 'gray';
  };

  const metrics: StatusMetric[] = useMemo(() => {
    let totalDraft = 0;
    let totalSent = 0;
    let totalPaid = 0;
    let totalOverdue = 0;
    let countDraft = 0;
    let countSent = 0;
    let countPaid = 0;
    let countOverdue = 0;

    const now: Date = new Date();
    const today: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    filteredInvoices.forEach((inv: Invoice) => {
      const price: number = Number(inv.price) || 0;
      const rawStatus: string = (inv.status || 'draft').split('|')[0].trim().toLowerCase();

      let isOverdue = false;
      if (rawStatus === 'overdue') {
        isOverdue = true;
      } else if (rawStatus === 'sent' && inv.due_date) {
        const dueDate: Date = new Date(inv.due_date);
        if (dueDate < today) {
          isOverdue = true;
        }
      }

      if (isOverdue) {
        totalOverdue += price;
        countOverdue++;
      } else if (rawStatus === 'paid') {
        totalPaid += price;
        countPaid++;
      } else if (rawStatus === 'sent') {
        totalSent += price;
        countSent++;
      } else {
        totalDraft += price;
        countDraft++;
      }
    });

    const totalCount: number = countDraft + countSent + countPaid + countOverdue;
    const safeTotalCount: number = totalCount === 0 ? 1 : totalCount;

    return [
      {
        id: 'draft',
        label: 'Draft Invoices',
        colorHex: getStatusHexColor('draft', '#78716c'),
        colorName: invoiceStatuses.find(s => s.name.toLowerCase() === 'draft')?.color || 'stone',
        value: totalDraft,
        count: countDraft,
        percentage: (countDraft / safeTotalCount) * 100,
      },
      {
        id: 'sent',
        label: 'Sent Invoices',
        colorHex: getStatusHexColor('sent', '#3b82f6'),
        colorName: invoiceStatuses.find(s => s.name.toLowerCase() === 'sent')?.color || 'blue',
        value: totalSent,
        count: countSent,
        percentage: (countSent / safeTotalCount) * 100,
      },
      {
        id: 'paid',
        label: 'Paid Invoices',
        colorHex: getStatusHexColor('paid', '#84cc16'),
        colorName: invoiceStatuses.find(s => s.name.toLowerCase() === 'paid')?.color || 'lime',
        value: totalPaid,
        count: countPaid,
        percentage: (countPaid / safeTotalCount) * 100,
      },
      {
        id: 'overdue',
        label: 'Overdue Invoices',
        colorHex: getStatusHexColor('overdue', '#f59e0b'),
        colorName: invoiceStatuses.find(s => s.name.toLowerCase() === 'overdue')?.color || 'amber',
        value: totalOverdue,
        count: countOverdue,
        percentage: (countOverdue / safeTotalCount) * 100,
      }
    ];
  }, [filteredInvoices, invoiceStatuses]);

  // Aggregate totals
  const totalPaidVal: number = metrics.find(m => m.id === 'paid')?.value || 0;
  const totalPendingVal: number = (metrics.find(m => m.id === 'sent')?.value || 0) + (metrics.find(m => m.id === 'overdue')?.value || 0);

  // Compute metrics for the comparison period (previous 30 days or previous year)
  const comparisonMetrics = useMemo(() => {
    if (timeFilter === 'all') {
      return null;
    }

    const now: Date = new Date();
    const today: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let prevStart: Date;
    let prevEnd: Date;

    if (timeFilter === '30days') {
      prevStart = new Date();
      prevStart.setDate(now.getDate() - 60);
      prevEnd = new Date();
      prevEnd.setDate(now.getDate() - 30);
    } else { // 'year'
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    }

    // Filter all invoices that fall into the previous comparison period
    const prevInvoices: Invoice[] = invoices.filter((inv: Invoice) => {
      if (!inv.date) {
        return false;
      }
      const invDate: Date = new Date(inv.date);
      if (isNaN(invDate.getTime())) {
        return false;
      }
      return invDate >= prevStart && invDate <= prevEnd;
    });

    let prevPaid = 0;
    let prevPending = 0;

    prevInvoices.forEach((inv: Invoice) => {
      const price: number = Number(inv.price) || 0;
      const rawStatus: string = (inv.status || 'draft').split('|')[0].trim().toLowerCase();
      let isOverdue = false;
      if (rawStatus === 'overdue') {
        isOverdue = true;
      } else if (rawStatus === 'sent' && inv.due_date) {
        const dueDate: Date = new Date(inv.due_date);
        if (dueDate < today) {
          isOverdue = true;
        }
      }

      if (rawStatus === 'paid') {
        prevPaid += price;
      } else if (rawStatus === 'sent' || isOverdue) {
        prevPending += price;
      }
    });

    return {
      revenue: prevPaid + prevPending,
      paid: prevPaid,
      pending: prevPending,
      count: prevInvoices.length,
      hasData: prevInvoices.length > 0,
    };
  }, [invoices, timeFilter]);

  /** Calculates percentage change label and direction compared to prior timeframe. */
  const getChangePercent = (current: number, previous: number | undefined): { label: string; isPositive: boolean } => {
    if (previous === undefined || !comparisonMetrics || !comparisonMetrics.hasData) {
      return { label: '—', isPositive: true };
    }
    if (previous === 0) {
      if (current > 0) {
        return { label: '+100%', isPositive: true };
      }
      return { label: '0%', isPositive: true };
    }

    const diff: number = current - previous;
    const percent: number = (diff / previous) * 100;
    const sign: string = percent >= 0 ? '+' : '';
    return {
      label: `${sign}${percent.toFixed(0)}%`,
      isPositive: percent >= 0,
    };
  };

  const countChange = getChangePercent(filteredInvoices.length, comparisonMetrics?.count);
  const paidChange = getChangePercent(totalPaidVal, comparisonMetrics?.paid);
  const pendingChange = getChangePercent(totalPendingVal, comparisonMetrics?.pending);

  /** Transforms paid invoices into formatted chart dataset for payment history chart. */
  const chartData = useMemo(() => {
    const paidInvoices: Invoice[] = filteredInvoices
      .filter((inv: Invoice) => (inv.status || 'draft').split('|')[0].trim().toLowerCase() === 'paid' && inv.paid_at)
      .sort((a: Invoice, b: Invoice) => new Date(a.paid_at!).getTime() - new Date(b.paid_at!).getTime());

    if (paidInvoices.length === 0) {
      return [{ name: 'No Payments', Amount: 0, monthYear: 'No Payments' }];
    }

    const recentPaid: Invoice[] = paidInvoices.slice(-10);

    return recentPaid.map((inv: Invoice) => {
      const d: Date = new Date(inv.paid_at!);
      const name: string = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
      const monthYear: string = d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      return {
        name,
        Amount: Number(inv.price) || 0,
        monthYear,
      };
    });
  }, [filteredInvoices]);

  const recentPaidInvoices: Invoice[] = useMemo(
    () =>
      filteredInvoices
        .filter((inv: Invoice) => (inv.status || 'draft').split('|')[0].trim().toLowerCase() === 'paid')
        .slice(0, 5),
    [filteredInvoices]
  );

  const columns: ColumnDef<Invoice>[] = useMemo(
    () => [
      {
        key: 'invoice_number',
        header: 'Invoice',
        width: '1fr',
        render: (inv: Invoice) => <span className="text-stone-700">{inv.invoice_number}</span>,
      },
      {
        key: 'client_name',
        header: 'Client',
        width: '1.5fr',
        render: (inv: Invoice) => {
          const clientName: string = settings['setting_display_client_name_as'] === 'company' && inv.client_business_name
            ? inv.client_business_name
            : (inv.client_name || inv.client_business_name || 'No Client');
          return <span className="text-stone-700">{clientName}</span>;
        },
      },
      {
        key: 'date',
        header: 'Date',
        width: '1fr',
        render: (inv: Invoice) => <span className="text-stone-500">{inv.date}</span>,
      },
      {
        key: 'price',
        header: 'Amount',
        width: '1fr',
        render: (inv: Invoice) => <div className="text-right text-stone-700 w-full pr-4">${(Number(inv.price) || 0).toFixed(2)}</div>,
      },
      {
        key: 'status',
        header: 'Status',
        width: '1fr',
        render: (inv: Invoice) => {
          const status: string = inv.status ? inv.status.split('|')[0] : 'draft';
          return (
            <div className="flex justify-end pr-2">
              <Badge variant={getStatusVariant(status)}>
                {status}
              </Badge>
            </div>
          );
        },
      },
    ],
    [settings, invoiceStatuses]
  );

  return (
    <div className="flex flex-col h-full p-6 gap-4 bg-transparent overflow-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Dashboard</h1>
          <p className="text-sm text-stone-500 mt-0.5">Overview of your business metrics</p>
        </div>

        {/* Timeframe Selection Slider */}
        <InvoiceStatusFilterPill
          options={timeOptions}
          value={timeFilter}
          onChange={setTimeFilter}
        />
      </div>

      <main className="flex-1 min-h-0 overflow-hidden flex flex-col gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-stone-500">Loading metrics...</div>
        ) : (
          <>
            {/* Section 1: Overview Cards Grid (Full width, 3 cards) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-shrink-0">
              <DashboardCard
                icon={<RiReceiptLine className="w-4 h-4" />}
                label="Invoices Created"
                value={String(filteredInvoices.length)}
                changePercent={countChange.label}
                changePositive={countChange.isPositive}
                description="Number of invoices generated"
              />

              <DashboardCard
                icon={<RiCheckboxCircleLine className="w-4 h-4" />}
                label="Money Received"
                value={`$${totalPaidVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                changePercent={paidChange.label}
                changePositive={paidChange.isPositive}
                description="Total payments collected"
              />

              <DashboardCard
                icon={<RiTimeLine className="w-4 h-4" />}
                label="Pending / Overdue"
                value={`$${totalPendingVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                changePercent={pendingChange.label}
                changePositive={pendingChange.isPositive}
                description="Outstanding client balances"
              />
            </div>

            {/* Main Content Section below KPI cards */}
            <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
              {/* Row 1: Payment History & Invoice Statuses side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-[3] min-h-0">
                <div className="lg:col-span-2 bg-stone-50 border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col h-full overflow-hidden">
                  <div className="mb-3 flex-shrink-0">
                    <h3 className="text-base text-black font-medium">Payment History</h3>
                    <p className="text-xs text-stone-500 mt-0.5">Revenue collected over time</p>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                        <XAxis dataKey="name" stroke="#a8a29e" fontSize={11} tickLine={false} />
                        <YAxis stroke="#a8a29e" fontSize={11} tickLine={false} />
                        <Tooltip content={<DashboardChartTooltip />} />
                        <Area type="monotone" dataKey="Amount" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorPaid)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-1 h-full overflow-hidden">
                  <StatusDistributionCard metrics={metrics} className="h-full" />
                </div>
              </div>

              {/* Row 2: Recent Invoices Table */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col flex-[2] min-h-0 overflow-hidden">
                <div className="flex justify-between items-center mb-3 flex-shrink-0">
                  <h3 className="text-base text-black font-medium">Recent Invoices</h3>
                  <span
                    onClick={() => onNavigate?.('invoices')}
                    className="text-xs font-semibold text-stone-400 cursor-pointer hover:text-stone-600 transition-colors"
                  >
                    View All
                  </span>
                </div>
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <Table
                    columns={columns}
                    data={recentPaidInvoices}
                    keyExtractor={(inv: Invoice) => inv.id}
                    emptyMessage="No recent paid invoices."
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
