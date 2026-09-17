import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Topbar } from '../../components/ui/Topbar';
import {
    Calendar,
    Clock,
    Upload,
    User,
    Building2,
    FileSpreadsheet,
    Filter,
    Info,
    X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { DatePickerDropdown, type FilterType } from '../../components/ui/DatePickerDropdown';
import { SLARulesModal } from '../../components/ui/SLARulesModal';

import { slaRecordService, type SLARecord } from '../../services/slaRecordService';
import { formatDateIST } from '../../utils/dateUtils';



/** Wraps the SLA table.
 *  - Fills all remaining height (flex-1).
 *  - Scrolls both axes within that fixed area — scrollbars always at visible edges.
 *  - Left/right fade shadows hint that more columns exist. */
const TableScrollWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const update = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        update();
        el.addEventListener('scroll', update, { passive: true });
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', update);
            ro.disconnect();
        };
    }, [update]);

    return (
        /* fill all available height; clip content so scrollbars stay inside the card */
        <div className="relative flex-1 flex flex-col overflow-hidden">
            {/* Left fade shadow */}
            <div
                className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 transition-opacity duration-300"
                style={{
                    opacity: canScrollLeft ? 1 : 0,
                    background: 'linear-gradient(to right, rgba(255,255,255,0.95), transparent)',
                }}
            />
            {/* Right fade shadow */}
            <div
                className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 transition-opacity duration-300"
                style={{
                    opacity: canScrollRight ? 1 : 0,
                    background: 'linear-gradient(to left, rgba(255,255,255,0.95), transparent)',
                }}
            />
            {/* The actual scrollable table area — both axes, scrollbars at visible edges */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto sla-dynamic-scrollbar"
                onScroll={update}
            >
                {children}
            </div>
        </div>
    );
};



const SLAPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [activeTab, setActiveTab] = useState<'Client' | 'Vendor' | 'Export'>('Client');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSLARulesModalOpen, setIsSLARulesModalOpen] = useState(false);

    // Status modal
    const [statusModal, setStatusModal] = useState<{ isOpen: boolean; recordId: string | null; newStatus: 'Breached' | 'Safe' | null; reason: string }>({
        isOpen: false,
        recordId: null,
        newStatus: null,
        reason: ''
    });

    // Managed Records
    const [records, setRecords] = useState<SLARecord[]>([]);

    // Applied states for filtering
    const [appliedFilter, setAppliedFilter] = useState<FilterType>('all');
    const [appliedCustomRange, setAppliedCustomRange] = useState({ start: '', end: '' });

    const fetchRecords = async () => {
        try {
            const serverRecords = await slaRecordService.getAllSLARecords({
                search: searchQuery,
                filter: appliedFilter,
                customStart: appliedCustomRange.start,
                customEnd: appliedCustomRange.end,
                type: activeTab
            });

            const adjustedRecords = serverRecords.map(record => {
                let finalClosedTime = (record.closedTime || '').replace(/^24:/, '00:');
                if (finalClosedTime && finalClosedTime !== '-' && !finalClosedTime.includes('hrs')) {
                    finalClosedTime = `${finalClosedTime} hrs`;
                }

                let newStartTime = (record.startTime || '').replace(/^24:/, '00:');
                let newDisplayStartDate = record.displayStartDate || record.startDate;
                let downtimeStr = record.downtime || '-';
                
                let finalCloseDate = record.closeDate || '';

                try {
                    const cleanStartTime = record.startTime?.replace(' hrs', '').trim().replace(/^24:/, '00:');
                    const cleanEndTime = record.closedTime?.replace(' hrs', '').trim().replace(/^24:/, '00:');

                    // Overwrite DB placeholder unset dates
                    if (finalCloseDate && (finalCloseDate.includes('2000') || finalCloseDate.includes('1970'))) {
                        finalCloseDate = '';
                        finalClosedTime = '-';
                        downtimeStr = '-';
                    }

                    if (record.startDate && cleanStartTime) {
                        const startStr = record.startDate.includes('-') ? `${record.startDate}T${cleanStartTime}:00` : `${record.startDate} ${cleanStartTime}:00`;
                        const start = new Date(startStr);

                        if (!isNaN(start.getTime())) {
                            newStartTime = newStartTime.includes('hrs') ? newStartTime : `${newDisplayStartDate ? newStartTime : newStartTime + ' hrs'}`;
                            newDisplayStartDate = record.displayStartDate || record.startDate;
                        }

                        if (finalCloseDate && cleanEndTime && !isNaN(start.getTime())) {
                            const endStr = finalCloseDate.includes('-') ? `${finalCloseDate}T${cleanEndTime}:00` : `${finalCloseDate} ${cleanEndTime}:00`;
                            const end = new Date(endStr);

                            if (!isNaN(end.getTime())) {
                                const diffMs = end.getTime() - start.getTime();
                                if (diffMs >= 0) {
                                    downtimeStr = `${Math.floor(diffMs / 60000)}`;
                                } else {
                                    downtimeStr = '0';
                                }
                                
                                // Format closeDate to match displayStartDate style
                                finalCloseDate = formatDateIST(end, { day: 'numeric', month: 'short', year: 'numeric' });
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error processing SLA times:', e);
                }

                return {
                    ...record,
                    startTime: newStartTime,
                    displayStartDate: newDisplayStartDate,
                    closeDate: finalCloseDate || '',
                    closedTime: finalClosedTime,
                    downtime: downtimeStr
                };
            });

            // Sort by ticketId descending (e.g. #1064 > #1063)
            adjustedRecords.sort((a, b) => {
                const idA = parseInt(a.ticketId.replace(/[^0-9]/g, ''), 10) || 0;
                const idB = parseInt(b.ticketId.replace(/[^0-9]/g, ''), 10) || 0;
                return idB - idA;
            });

            setRecords(adjustedRecords);
        } catch (error) {
            console.error('Failed to load SLA records:', error);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [searchQuery, appliedFilter, appliedCustomRange, activeTab]);



    const handleSaveStatus = async () => {
        if (!statusModal.reason.trim() || !statusModal.recordId || !statusModal.newStatus) {
            toast.error("Please provide a reason.");
            return;
        }

        try {
            await slaRecordService.updateSLARecordStatus(statusModal.recordId, statusModal.newStatus, statusModal.reason);
            
            // Re-fetch or manually update state
            setRecords(prev => prev.map(r => {
                if (r.id === statusModal.recordId) {
                    const updatedComp = statusModal.newStatus === 'Safe' ? '-' : r.compensation;
                    return { ...r, status: statusModal.newStatus!, statusReason: statusModal.reason, compensation: updatedComp };
                }
                return r;
            }));
            setStatusModal({ isOpen: false, recordId: null, newStatus: null, reason: '' });
            toast.success("Status updated successfully.");
        } catch (error) {
            console.error('Failed to save status', error);
            toast.error("Failed to update status. Please try again.");
        }
    };

    const handleDateApply = (type: FilterType, range: { start: string; end: string }) => {
        setAppliedFilter(type);
        setAppliedCustomRange(range);
    };

    const handleExport = async () => {
        try {
            const toastId = toast.loading('Generating Excel Report...');
            await slaRecordService.exportSLARecords({
                search: searchQuery,
                filter: appliedFilter,
                customStart: appliedCustomRange.start,
                customEnd: appliedCustomRange.end,
                type: activeTab === 'Export' ? undefined : activeTab
            });
            toast.success('Excel Report downloaded successfully!', { id: toastId });
        } catch (error) {
            toast.error("Failed to export SLA records.");
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#F9FAFB]">
            <Topbar title="SLA" showSearch={true} searchPlaceholder="Search by ticket id..." onSearch={(q) => setSearchQuery(q)} onRefresh={fetchRecords} />

            {/* SLA Rules Button Bar */}
            <div className="bg-white border-b border-gray-50 flex-shrink-0 z-10">
                <div className="px-4 sm:px-8 flex items-center h-14">
                    <button
                        onClick={() => setIsSLARulesModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-red hover:bg-[#d41c34] text-white rounded-xl text-sm font-bold transition-all active:scale-95"
                    >
                        SLA Rules
                    </button>
                </div>
            </div>

            {/* SLA Rules Modal */}
            <SLARulesModal
                isOpen={isSLARulesModalOpen}
                onClose={() => setIsSLARulesModalOpen(false)}
            />



            {/* Custom Sub-Header */}
            <div className="bg-white border-b border-gray-100 flex-shrink-0 z-10">
                <div className="px-4 sm:px-8 flex items-center justify-between h-14 sm:h-16">
                    {/* Tabs */}
                    <div className="flex items-center gap-8 h-full">
                        <button
                            onClick={() => setActiveTab('Client')}
                            className={`flex items-center gap-2 h-full px-1 text-[14px] font-bold transition-all relative ${activeTab === 'Client'
                                ? 'text-gray-900 after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand-red'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <User size={18} strokeWidth={activeTab === 'Client' ? 2.5 : 2} />
                            Client
                        </button>
                        <button
                            onClick={() => setActiveTab('Vendor')}
                            className={`flex items-center gap-2 h-full px-1 text-[14px] font-bold transition-all relative ${activeTab === 'Vendor'
                                ? 'text-gray-900 after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand-red'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <Building2 size={18} strokeWidth={activeTab === 'Vendor' ? 2.5 : 2} />
                            Vendor
                        </button>
                        <button
                            onClick={() => setActiveTab('Export')}
                            className={`flex items-center gap-2 h-full px-1 text-[14px] font-bold transition-all relative ${activeTab === 'Export'
                                ? 'text-gray-900 after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand-red'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <FileSpreadsheet size={18} strokeWidth={activeTab === 'Export' ? 2.5 : 2} />
                            Reports
                        </button>
                    </div>

                    {/* Right side controls */}
                    <div className="flex items-center gap-3 relative">
                        <button
                            onClick={handleExport}
                            className="w-9 h-9 flex items-center justify-center bg-[#FFB347] hover:bg-[#FFA327] text-white rounded-lg transition-all shadow-md shadow-orange-100 active:scale-95"
                            title="Export to Excel"
                        >
                            <Upload size={18} strokeWidth={2.5} />
                        </button>

                        <DatePickerDropdown
                            appliedFilter={appliedFilter}
                            appliedCustomRange={appliedCustomRange}
                            onApply={handleDateApply}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-gray-50/50 p-6 flex flex-col">
                {activeTab === 'Export' ? (
                    <div className="overflow-auto flex-1">
                        <div className="max-w-4xl mx-auto mt-10">
                            <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center">
                            <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <FileSpreadsheet className="text-green-600" size={40} strokeWidth={2} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Financial & SLA Excel Report</h2>
                            <p className="text-gray-500 mb-8 max-w-lg mx-auto leading-relaxed">
                                Generate a full-fledged mathematical Excel report containing all SLA records, profit/loss calculations, rule triggers, and a conditionally formatted financial dashboard.
                            </p>
                            
                            <button
                                onClick={handleExport}
                                className="px-8 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20 active:scale-95 flex items-center gap-3 mx-auto"
                            >
                                <Upload size={20} strokeWidth={2.5} />
                                Download Master Excel Report
                            </button>
                            
                            <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-3 gap-6 text-left">
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1 text-sm">Dashboard Sheet</h4>
                                    <p className="text-xs text-gray-500">Aggregated metrics, total breaches, and Profit/Loss tracking.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1 text-sm">Detailed Data</h4>
                                    <p className="text-xs text-gray-500">Filterable columns comparing Vendor vs Client compensation deltas.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1 text-sm">Automated Calculation</h4>
                                    <p className="text-xs text-gray-500">Uptime, Downtime, and actual SLA Availability mathematically mapped.</p>
                                </div>
                            </div>
                            </div>  {/* end bg-white card */}
                        </div>  {/* end max-w-4xl */}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col overflow-hidden">
                        {/* Table Section */}
                        <TableScrollWrapper>
                            <table className="w-full min-w-[1200px] text-left border-separate border-spacing-y-3 whitespace-nowrap">
                                <thead>
                                    <tr className="uppercase tracking-widest text-[11px] font-extrabold text-gray-400">
                                        <th className="px-6 py-3 bg-white/60 backdrop-blur-xl rounded-l-2xl border-y border-l border-gray-100 shadow-sm">Ticket ID</th>
                                        <th className="px-6 py-3 bg-white/60 backdrop-blur-xl border-y border-gray-100 shadow-sm">Circuit ID</th>
                                        <th className="px-6 py-3 bg-white/60 backdrop-blur-xl border-y border-gray-100 shadow-sm">Client Name</th>
                                        <th className="px-6 py-3 bg-white/60 backdrop-blur-xl border-y border-gray-100 shadow-sm">Vendor Name</th>
                                        <th className="px-6 py-3 bg-white/60 backdrop-blur-xl border-y border-gray-100 shadow-sm">SLA Start Date</th>
                                        <th className="px-6 py-3 bg-white/60 backdrop-blur-xl border-y border-gray-100 shadow-sm">SLA Start Time</th>
                                        <th className="px-6 py-3 bg-white/60 backdrop-blur-xl border-y border-gray-100 shadow-sm">SLA Closed Time</th>
                                        <th className="px-6 py-3 bg-white/60 backdrop-blur-xl border-y border-gray-100 shadow-sm">SLA Close Date</th>
                                        <th className="px-6 py-3 bg-white/60 backdrop-blur-xl border-y border-gray-100 shadow-sm">Downtime (min)</th>
                                        <th className="px-6 py-3 bg-white/60 backdrop-blur-xl border-y border-gray-100 shadow-sm">SLA Status</th>
                                        <th className="px-6 py-3 bg-white/60 backdrop-blur-xl rounded-r-2xl border-y border-r border-gray-100 shadow-sm text-right">Compensation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.length > 0 ? records.map((record, index) => (
                                        <tr key={record.id} className="bg-white group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 rounded-2xl shadow-sm cursor-default">
                                            <td className="px-6 py-5 rounded-l-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-red/10 to-brand-red/5 flex items-center justify-center text-brand-red font-bold text-[11px] shadow-inner border border-brand-red/10">
                                                        #{index + 1}
                                                    </div>
                                                    <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/dashboard/${id}/tickets?ticketId=${encodeURIComponent(record.ticketId)}`); }} className="text-[14px] font-bold text-gray-900 group-hover:text-brand-red transition-colors underline decoration-transparent hover:decoration-brand-red/30 underline-offset-4">
                                                        {record.ticketId}
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[14px] font-bold text-gray-900">{record.circuitId}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[14px] font-bold text-gray-900">{record.clientName}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[14px] font-bold text-gray-900">{record.vendorName}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3 text-[14px] font-semibold text-gray-700">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50/70 flex items-center justify-center text-blue-500 border border-blue-100/50">
                                                        <Calendar size={15} strokeWidth={2.5} />
                                                    </div>
                                                    {record.displayStartDate}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3 text-[14px] font-semibold text-gray-700">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50/70 flex items-center justify-center text-indigo-500 border border-indigo-100/50">
                                                        <Clock size={15} strokeWidth={2.5} />
                                                    </div>
                                                    {record.startTime}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3 text-[14px] font-semibold text-gray-700">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50/70 flex items-center justify-center text-indigo-500 border border-indigo-100/50">
                                                        <Clock size={15} strokeWidth={2.5} />
                                                    </div>
                                                    {record.closedTime || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3 text-[14px] font-semibold text-gray-700">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50/70 flex items-center justify-center text-blue-500 border border-blue-100/50">
                                                        <Calendar size={15} strokeWidth={2.5} />
                                                    </div>
                                                    {(record.closeDate && !record.closeDate.includes('2000') && !record.closeDate.includes('1970')) ? record.closeDate : '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {record.downtime !== '-' ? (
                                                    <div className="flex flex-col">
                                                        <span className={`text-[16px] font-extrabold ${parseInt(record.downtime) > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                                            {record.downtime}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Minutes</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 font-medium">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                {record.status ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg border shadow-sm text-[12px] font-extrabold transition-all ${
                                                            (statusModal.isOpen && statusModal.recordId === record.id ? statusModal.newStatus || record.status : record.status) === 'Breached' 
                                                                ? 'bg-red-50/80 text-red-600 border-red-100/80 group-hover:bg-red-50' 
                                                                : 'bg-emerald-50/80 text-emerald-600 border-emerald-100/80 group-hover:bg-emerald-50'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full shadow-sm ${(statusModal.isOpen && statusModal.recordId === record.id ? statusModal.newStatus || record.status : record.status) === 'Breached' ? 'bg-red-500 shadow-red-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`} />
                                                            <select
                                                                value={statusModal.isOpen && statusModal.recordId === record.id ? statusModal.newStatus || record.status : record.status}
                                                                onChange={(e) => {
                                                                    setStatusModal({ isOpen: true, recordId: record.id, newStatus: e.target.value as 'Safe' | 'Breached', reason: '' });
                                                                }}
                                                                className="bg-transparent cursor-pointer outline-none border-none appearance-none font-extrabold pr-1 focus:ring-0"
                                                            >
                                                                <option value="Safe" className="text-emerald-600">Safe</option>
                                                                <option value="Breached" className="text-red-600">Breached</option>
                                                            </select>
                                                        </div>
                                                        {record.statusReason && (
                                                            <div className="relative group/tooltip flex items-center justify-center cursor-help text-gray-300 hover:text-gray-500 transition-colors">
                                                                <Info size={18} strokeWidth={2.5} />
                                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 p-3 bg-gray-900/95 backdrop-blur-md text-white text-xs font-medium rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 shadow-xl z-50 pointer-events-none text-center transform scale-95 group-hover/tooltip:scale-100">
                                                                    {record.statusReason}
                                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 font-medium">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 rounded-r-2xl text-right">
                                                {record.compensation !== '-' && record.compensation ? (
                                                    <div className="inline-flex items-center justify-center bg-emerald-50/80 text-emerald-600 px-3.5 py-1.5 rounded-lg border border-emerald-100 shadow-sm min-w-[70px]">
                                                        <span className="text-[14px] font-extrabold">{record.compensation}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 font-medium">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={11} className="px-6 py-32 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-gray-400 font-sans">
                                                    <div className="w-20 h-20 rounded-full bg-white shadow-xl shadow-gray-200/50 flex items-center justify-center mb-2">
                                                        <Filter size={36} strokeWidth={1.5} className="text-brand-red" />
                                                    </div>
                                                    <p className="font-extrabold text-xl text-gray-800">No records found</p>
                                                    <p className="text-[15px] font-medium text-gray-500 max-w-sm">We couldn't find any SLA records matching your current filters and search term.</p>
                                                    <button
                                                        onClick={() => {
                                                            setAppliedFilter('all');
                                                            setAppliedCustomRange({ start: '', end: '' });
                                                            setSearchQuery('');
                                                        }}
                                                        className="mt-4 px-6 py-2.5 bg-brand-red/10 text-brand-red hover:text-white text-sm font-bold rounded-xl hover:bg-brand-red hover:shadow-lg hover:shadow-brand-red/30 transition-all duration-300 active:scale-95"
                                                    >
                                                        Clear all filters
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </TableScrollWrapper>
                    </div>
                )}
            </div>

            {/* Status Reason Modal */}
            {statusModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Change Status Reason</h3>
                            <button 
                                onClick={() => setStatusModal({ isOpen: false, recordId: null, newStatus: null, reason: '' })}
                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 text-sm flex flex-col gap-4">
                            <p className="text-gray-600">
                                You are changing the status to <span className={`font-bold px-2 py-0.5 rounded text-[12px] ` + (statusModal.newStatus === 'Breached' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600')}>{statusModal.newStatus}</span>. Please provide a reason for this change.
                            </p>
                            <textarea
                                autoFocus
                                value={statusModal.reason}
                                onChange={(e) => setStatusModal(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Enter reason for this change..."
                                className="w-full h-32 p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all"
                            />
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
                            <button
                                onClick={() => setStatusModal({ isOpen: false, recordId: null, newStatus: null, reason: '' })}
                                className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveStatus}
                                disabled={!statusModal.reason.trim()}
                                className="px-6 py-2 bg-gradient-to-r from-brand-red to-[#d41c34] hover:from-[#d41c34] hover:to-[#c01830] text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-red/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SLAPage;
