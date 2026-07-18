import React, { useEffect, useState } from 'react';
import {
  RiCloseLine,
  RiCheckboxCircleFill,
  RiAddLine,
  RiMailLine,
  RiEditLine,
  RiDeleteBinLine,
  RiTimeLine,
  RiArrowDownSLine,
  RiMailSendLine,
  RiCheckLine,
  RiFileList3Line,
  RiMapPinLine,
  RiFileCopyLine,
  RiNavigationFill,
  RiSubtractLine,
  RiFullscreenLine,
  RiFocus3Line
} from 'react-icons/ri';
import { ActivityLog } from '../../types';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '../Badge';

// MapController to handle zooming and recentering from external buttons
function MapController({ zoom, center, recenterCount }: { zoom: number, center: [number, number], recenterCount: number }) {
  const map = useMap();

  useEffect(() => {
    map.setZoom(zoom);
  }, [zoom, map]);

  useEffect(() => {
    if (recenterCount > 0) {
      map.setView(center, zoom, { animate: true });
    }
  }, [recenterCount, center, zoom, map]);

  return null;
}

// Custom Marker
const customMarker = new L.DivIcon({
  html: `<div style="background-color: #ea580c; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

interface InvoiceHistoryModalProps {
  invoiceId: number;
  onClose: () => void;
}

const formatTimeAgo = (dateStr: string) => {
  const safeDateStr = dateStr.includes('Z') || dateStr.includes('+')
    ? dateStr
    : dateStr.replace(' ', 'T') + 'Z';
  const diff = Math.max(0, Date.now() - new Date(safeDateStr).getTime());
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const getTimelineIcon = (actionCode: string) => {
  if (actionCode === 'invoice_created') {
    return (
      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white border border-stone-200 z-10 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
      </div>
    );
  }
  if (actionCode.includes('sent') || actionCode.includes('emailed')) {
    return (
      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border border-blue-600 z-10 text-white flex-shrink-0 shadow-sm">
        <RiMailSendLine className="w-4 h-4" />
      </div>
    );
  }
  if (actionCode.includes('paid') || actionCode.includes('status')) {
    return (
      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 border border-stone-900 z-10 text-white flex-shrink-0 shadow-sm">
        <RiCheckLine className="w-4 h-4" />
      </div>
    );
  }
  if (actionCode === 'DRAFT') {
    return (
      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 border border-stone-900 z-10 text-white flex-shrink-0 shadow-sm">
        <RiFileList3Line className="w-4 h-4" />
      </div>
    );
  }
  // Default (Gray dot)
  return (
    <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white border border-stone-200 z-10 flex-shrink-0">
      <div className="w-2.5 h-2.5 rounded-full bg-stone-400"></div>
    </div>
  );
};

export function InvoiceHistoryModal({ invoiceId, onClose }: InvoiceHistoryModalProps): React.JSX.Element {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [invoice, setInvoice] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [invoiceStatuses, setInvoiceStatuses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'history'>('summary');
  const [mapZoom, setMapZoom] = useState(14);
  const [recenterCount, setRecenterCount] = useState(0);

  const handleZoomIn = () => setMapZoom(prev => Math.min(prev + 1, 20));
  const handleZoomOut = () => setMapZoom(prev => Math.max(prev - 1, 1));
  const handleRecenter = () => setRecenterCount(prev => prev + 1);

  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (invoice?.client_address) {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(invoice.client_address)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            setCoordinates([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          } else {
            setCoordinates(null);
          }
        })
        .catch(console.error);
    }
  }, [invoice?.client_address]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [fetchedLogs, fetchedInvoice, fetchedSettings, fetchedStatuses] = await Promise.all([
          window.electronAPI.getInvoiceActivityLogs(invoiceId),
          window.electronAPI.getInvoiceById(invoiceId),
          window.electronAPI.getSettings(),
          window.electronAPI.getInvoiceStatuses()
        ]);
        setLogs(fetchedLogs);
        setInvoice(fetchedInvoice);
        setSettings(fetchedSettings);
        setInvoiceStatuses(fetchedStatuses || []);
      } catch (err) {
        console.error('Failed to fetch invoice history data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [invoiceId]);

  const renderSummary = () => {
    if (!invoice || !settings) return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-stone-400">Loading summary…</p>
      </div>
    );

    const stages = ['Draft', 'Sent', 'Paid'];

    const currentStatus = (invoice.status || '').toLowerCase();
    let currentIndex = stages.findIndex(s => s.toLowerCase() === currentStatus);
    if (currentIndex === -1) currentIndex = 0; // Default if not found

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD'
      }).format(amount);
    };

    let dateRangeStr = '';
    const labourItems = (invoice.items || []).filter((i: any) => i.type === 'labour' && i.date);
    if (labourItems.length > 0) {
      const dates = labourItems.map((i: any) => new Date(i.date).getTime()).filter((t: number) => !isNaN(t));
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        const formatDate = (d: Date) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

        if (minDate.getTime() === maxDate.getTime()) {
          dateRangeStr = formatDate(minDate);
        } else {
          dateRangeStr = `${formatDate(minDate)} - ${formatDate(maxDate)}`;
        }
      }
    }

    const formatDateSafe = (dateString?: string) => {
      if (!dateString) return 'N/A';
      const d = new Date(dateString);
      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
      <div className="flex flex-col gap-6 w-full animate-fade-in">
        {/* Map View */}
        <div className="w-full h-[240px] bg-stone-100 rounded-2xl overflow-hidden relative border border-stone-200/60 shadow-sm">
          {invoice.client_address ? coordinates ? (
            <>
              <MapContainer
                center={coordinates}
                zoom={mapZoom}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                />
                <Marker position={coordinates} icon={customMarker} />
                <MapController zoom={mapZoom} center={coordinates} recenterCount={recenterCount} />
              </MapContainer>

              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center bg-white/95 backdrop-blur-sm rounded-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-stone-200/60 overflow-hidden divide-y divide-stone-100 z-[1000]">
                <button type="button" className="p-2 hover:bg-stone-50 transition-colors" title="Navigate">
                  <RiNavigationFill className="w-[18px] h-[18px] text-orange-600" />
                </button>
                <button type="button" onClick={handleRecenter} className="p-2 hover:bg-stone-50 transition-colors" title="Recenter">
                  <RiFocus3Line className="w-[18px] h-[18px] text-stone-500 hover:text-orange-600 transition-colors" />
                </button>
                <button type="button" onClick={handleZoomIn} className="p-2 hover:bg-stone-50 transition-colors" title="Zoom In">
                  <RiAddLine className="w-[18px] h-[18px] text-stone-500" />
                </button>
                <button type="button" onClick={handleZoomOut} className="p-2 hover:bg-stone-50 transition-colors" title="Zoom Out">
                  <RiSubtractLine className="w-[18px] h-[18px] text-stone-500" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full gap-2 bg-[#eef1f2] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-80 z-10 relative">
              <span className="text-[13px] font-medium text-stone-500">Locating address...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full gap-2 bg-[#eef1f2] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-80">
              <div className="flex flex-col items-center gap-2 bg-white/90 px-4 py-2.5 rounded-xl backdrop-blur-sm shadow-sm border border-stone-200/50">
                <RiMapPinLine className="w-5 h-5 text-stone-400" />
                <span className="text-[13px] font-medium text-stone-500">No client address available</span>
              </div>
            </div>
          )}
        </div>

        {/* Header Info */}
        <div className="px-1">
          <div className="flex items-center justify-between mb-1.5">
            <h1 className="text-[32px] font-bold text-stone-900 tracking-tight leading-none">
              {invoice.invoice_number}
            </h1>
            <Badge invoiceStatus={invoice.status || 'Draft'} size="lg">
              {invoice.status || 'Draft'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-[14px] text-stone-600 mt-2">
            <div className="flex items-center gap-1.5">
              <RiTimeLine className="w-[16px] h-[16px] text-stone-400" />
              <span>Issued: <span className="text-stone-900 font-medium">{formatDateSafe(invoice.date)}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <RiTimeLine className="w-[16px] h-[16px] text-stone-400" />
              <span>Due: <span className="text-stone-900 font-medium">{formatDateSafe(invoice.due_date)}</span></span>
            </div>
          </div>
        </div>

        {/* Progress Bar (Segmented) */}
        <div className="w-full bg-stone-200 rounded-full flex overflow-hidden shadow-sm">
          {stages.map((stage, idx) => {
            const isHighlighted = idx <= currentIndex;

            return (
              <div
                key={stage}
                className={`flex-1 py-1 text-center text-[12px] font-medium transition-colors border-r last:border-r-0 border-black/5
                  ${isHighlighted ? 'bg-orange-200 text-orange-600' :
                    'bg-stone-200 text-stone-500 hover:text-stone-700'}
                `}
              >
                {stage}
              </div>
            );
          })}
        </div>

        {/* Condensed Info Grid */}
        <div className="grid grid-cols-2 gap-y-6 gap-x-8 px-1 pb-2">
          {/* Client */}
          <div className="flex flex-col gap-0">
            <span className="text-[13px] text-stone-400 font-medium leading-none mb-1">Client</span>
            <span className="text-[14px] text-stone-900 font-medium leading-snug">{invoice.client_business_name || invoice.client_name || 'Client Name'}</span>
            {invoice.client_address && <span className="text-[14px] text-stone-900 leading-snug whitespace-pre-wrap">{invoice.client_address}</span>}
          </div>

          {/* Total Amount */}
          <div className="flex flex-col gap-0">
            <span className="text-[13px] text-stone-400 font-medium leading-none mb-1">Total Amount</span>
            <span className="text-[14px] text-stone-900 font-medium leading-snug">{formatCurrency(invoice.price || 0)}</span>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-0">
            <span className="text-[13px] text-stone-400 font-medium leading-none mb-1">Email</span>
            <a href={`mailto:${invoice.client_email}`} className="text-[14px] text-stone-900 underline underline-offset-2 hover:text-orange-600 transition-colors truncate leading-snug" title={invoice.client_email}>
              {invoice.client_email || 'client@email.com'}
            </a>
          </div>

          {/* Work Timeline */}
          {dateRangeStr && (
            <div className="flex flex-col gap-0">
              <span className="text-[13px] text-stone-400 font-medium leading-none mb-1">Work Timeline</span>
              <span className="text-[14px] text-stone-900 leading-snug">{dateRangeStr}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 animate-fade-in" onClick={onClose}>
      <div
        className="bg-stone-50 rounded-2xl shadow-xl w-full max-w-xl flex flex-col overflow-hidden h-[650px] max-h-[90vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 px-6 pb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-[17px] font-medium text-stone-900">Invoice History</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-stone-200 p-0.5 rounded-xl shadow-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 ${activeTab === 'summary' ? 'bg-white text-stone-900 shadow-1' : 'text-stone-500 hover:text-stone-900'}`}
              >
                Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 ${activeTab === 'history' ? 'bg-white text-stone-900 shadow-1' : 'text-stone-500 hover:text-stone-900'}`}
              >
                History
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
            >
              <RiCloseLine className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 relative">
          <div className="mx-auto w-full">
            {activeTab === 'summary' ? (
              renderSummary()
            ) : isLoading ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm text-stone-400">Loading history…</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-stone-900 font-medium">No history found</p>
                <p className="text-sm text-stone-500 mt-1">This invoice doesn't have any recorded activity yet.</p>
              </div>
            ) : (
              <div className="relative w-full mx-auto pl-2">
                <div className="absolute left-[23px] top-4 bottom-4 border-l border-dashed border-stone-300 z-0"></div>

                <div className="flex flex-col gap-0 relative z-10">
                  {logs.map((log, index) => {
                    const isLast = index === logs.length - 1;
                    let content = (
                      <span className="text-[14.5px] text-stone-500">
                        <span className="font-medium text-stone-900">You</span> {log.action_label?.toLowerCase() || log.action_code.replace(/_/g, ' ').toLowerCase()}
                        {log.details && ` - ${log.details}`}
                      </span>
                    );

                    if (log.action_code === 'status_updated' && log.details) {
                      const match = log.details.match(/Changed status from (.*) to (.*)/);
                      if (match) {
                        content = (
                          <span className="text-[14.5px] text-stone-500">
                            <span className="font-medium text-stone-900">You</span> changed status from <span className="font-medium text-stone-900">{match[1]}</span> to <span className="font-medium text-stone-900">{match[2]}</span>
                          </span>
                        );
                      }
                    } else if (log.action_code === 'invoice_created') {
                      content = (
                        <span className="text-[14.5px] text-stone-500">
                          <span className="font-medium text-stone-900">You</span> created this invoice
                        </span>
                      );
                    } else if (log.action_code === 'invoice_sent' || log.action_code === 'email_sent') {
                      const match = log.details?.match(/to (.*)/);
                      if (match) {
                        content = (
                          <span className="text-[14.5px] text-stone-500">
                            <span className="font-medium text-stone-900">You</span> sent invoice to <span className="font-medium text-stone-900">{match[1]}</span>
                          </span>
                        );
                      } else {
                        content = (
                          <span className="text-[14.5px] text-stone-500">
                            <span className="font-medium text-stone-900">You</span> sent this invoice
                          </span>
                        );
                      }
                    }

                    return (
                      <div key={log.id || index} className={`flex gap-4 group relative z-10 w-full ${!isLast ? 'mb-4' : ''}`}>
                        {getTimelineIcon(log.action_code)}

                        <div className="flex flex-col gap-1 pt-1.5">
                          {content}
                          <span className="text-[13.5px] text-stone-400">
                            {formatTimeAgo(log.timestamp)}
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
    </div>
  );
}
