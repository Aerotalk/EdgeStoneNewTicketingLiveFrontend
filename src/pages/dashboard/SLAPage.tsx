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
    AlertTriangle,
    ShieldCheck,
    ShieldAlert,
    Activity,
    Copy,
    Check,
    SlidersHorizontal,
    Globe,
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

    // Copied circuit feedback
    const [copiedCircuitId, setCopiedCircuitId] = useState<string | null>(null);

    const handleCopyCircuit = (circuitId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(circuitId);
        setCopiedCircuitId(circuitId);
        toast.success(`Copied Circuit: ${circuitId}`, { duration: 1500 });
        setTimeout(() => {
            setCopiedCircuitId(prev => prev === circuitId ? null : prev);
        }, 1500);
    };

    const formatTimeIST = (timeStr?: string) => {
        if (!timeStr || timeStr === '-' || timeStr.trim() === '') return '-';
        const clean = timeStr.replace(/hrs/gi, '').trim();
        if (!clean || clean === '-') return '-';
        return `${clean} IST`;
    };

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
        if (!statusModal.reason.trim() || statusModal.reason.trim().length < 10 || !statusModal.recordId || !statusModal.newStatus) {
            toast.error("Please provide a detailed reason (minimum 10 characters).");
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

    // Computed executive KPI metrics
    const totalTickets = records.length;
    const safeTickets = records.filter(r => r.status?.toUpperCase() === 'SAFE').length;
    const breachedTickets = records.filter(r => r.status?.toUpperCase() === 'BREACHED').length;
    const resolvedWithSLA = safeTickets + breachedTickets;
    const complianceRate = resolvedWithSLA > 0 ? ((safeTickets / resolvedWithSLA) * 100).toFixed(1) : '100.0';

    const totalDowntimeMinutes = records.reduce((acc, r) => {
        const val = parseInt(r.downtime || '0', 10);
        return acc + (isNaN(val) || val <= 0 ? 0 : val);
    }, 0);

    const compensationTicketsCount = records.filter(r => r.compensation && r.compensation !== '-' && r.compensation !== '0').length;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#F9FAFB]">
            <Topbar title="SLA" showSearch={true} searchPlaceholder="Search by ticket id..." onSearch={(q) => setSearchQuery(q)} onRefresh={fetchRecords} />

            {/* SLA Rules Modal - Left intact */}
            <SLARulesModal
                isOpen={isSLARulesModalOpen}
                onClose={() => {
                    setIsSLARulesModalOpen(false);
                    fetchRecords();
                }}
            />

            {/* Unified Merged Toolbar */}
            <div className="bg-white border-b border-slate-200/80 flex-shrink-0 z-10">
                <div className="px-4 sm:px-8 flex flex-wrap items-center justify-between gap-3 min-h-[58px] py-2">
                    {/* Left: Modern Segmented Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
                        <button
                            type="button"
                            onClick={() => setActiveTab('Client')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                                activeTab === 'Client'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                            }`}
                        >
                            <User size={15} strokeWidth={activeTab === 'Client' ? 2.5 : 2} />
                            <span>Client</span>
                            {activeTab === 'Client' && records.length > 0 && (
                                <span className="ml-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px] font-extrabold">
                                    {records.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('Vendor')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                                activeTab === 'Vendor'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                            }`}
                        >
                            <Building2 size={15} strokeWidth={activeTab === 'Vendor' ? 2.5 : 2} />
                            <span>Vendor</span>
                            {activeTab === 'Vendor' && records.length > 0 && (
                                <span className="ml-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px] font-extrabold">
                                    {records.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('Export')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                                activeTab === 'Export'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                            }`}
                        >
                            <FileSpreadsheet size={15} strokeWidth={activeTab === 'Export' ? 2.5 : 2} />
                            <span>Reports</span>
                        </button>
                    </div>

                    {/* Right: SLA Rules + Excel Export + DatePicker */}
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsSLARulesModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95"
                            title="Configure SLA Thresholds and Rules"
                        >
                            <SlidersHorizontal size={14} strokeWidth={2.5} />
                            <span>SLA Rules</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-2xs"
                            title="Export filtered records to Excel"
                        >
                            <Upload size={14} strokeWidth={2.5} />
                            <span className="hidden md:inline">Export</span>
                        </button>

                        <DatePickerDropdown
                            appliedFilter={appliedFilter}
                            appliedCustomRange={appliedCustomRange}
                            onApply={handleDateApply}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-slate-50/70 p-4 sm:p-6 flex flex-col gap-4">
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
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Executive KPI Metric Strip */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 flex-shrink-0">
                            {/* Card 1: Total Monitored Tickets */}
                            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Monitored</span>
                                    <span className="text-2xl font-black text-slate-900 mt-1">{totalTickets}</span>
                                    <span className="text-[11px] text-slate-500 font-medium mt-0.5">{activeTab} scope</span>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                                    <Activity size={20} strokeWidth={2.5} />
                                </div>
                            </div>

                            {/* Card 2: SLA Compliance Rate */}
                            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Compliance Rate</span>
                                    <span className="text-2xl font-black text-slate-900 mt-1">{complianceRate}%</span>
                                    <span className="text-[11px] text-emerald-600 font-bold mt-0.5">{safeTickets} Safe · {breachedTickets} Breached</span>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                    <ShieldCheck size={20} strokeWidth={2.5} />
                                </div>
                            </div>

                            {/* Card 3: Breached Tickets */}
                            <div className={`rounded-xl p-4 border shadow-2xs flex items-center justify-between transition-colors ${
                                breachedTickets > 0 ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-slate-200/80'
                            }`}>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">SLA Breaches</span>
                                    <span className={`text-2xl font-black mt-1 ${breachedTickets > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                        {breachedTickets}
                                    </span>
                                    <span className="text-[11px] font-medium mt-0.5 text-slate-500">
                                        {breachedTickets > 0 ? 'Threshold exceeded' : 'Zero breaches recorded'}
                                    </span>
                                </div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                    breachedTickets > 0 ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                    <ShieldAlert size={20} strokeWidth={2.5} />
                                </div>
                            </div>

                            {/* Card 4: Accumulated Outage */}
                            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Downtime</span>
                                    <span className="text-2xl font-black text-slate-900 mt-1">{totalDowntimeMinutes} <span className="text-xs font-semibold text-slate-400 uppercase">min</span></span>
                                    <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                                        {compensationTicketsCount} penalty ticket{compensationTicketsCount === 1 ? '' : 's'}
                                    </span>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                                    <Clock size={20} strokeWidth={2.5} />
                                </div>
                            </div>
                        </div>

                        {/* Professional Table Grid */}
                        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col overflow-hidden">
                            {/* Table Control & Timezone Header */}
                            <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800">{activeTab} SLA Grid</span>
                                    <span className="text-slate-300">·</span>
                                    <span>{records.length} {records.length === 1 ? 'ticket' : 'tickets'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200/70 shadow-2xs">
                                    <Globe size={13} className="text-indigo-500" />
                                    <span>Timezone: <strong>Indian Standard Time (IST · UTC+05:30)</strong></span>
                                </div>
                            </div>

                            {/* Table Scrollable Container */}
                            <TableScrollWrapper>
                                <table className="w-full min-w-[1200px] text-left border-collapse whitespace-nowrap">
                                    <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
                                        <tr className="uppercase text-[11px] font-bold tracking-wider text-slate-500 select-none">
                                            <th className="px-4 py-3.5">Ticket ID</th>
                                            <th className="px-4 py-3.5">Circuit ID</th>
                                            <th className="px-4 py-3.5">Client Name</th>
                                            <th className="px-4 py-3.5">Vendor Name</th>
                                            <th className="px-4 py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span>SLA Start</span>
                                                    <span className="px-1.5 py-0.5 bg-slate-200/80 text-slate-600 rounded text-[9px] font-extrabold tracking-normal">IST</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span>SLA Closed</span>
                                                    <span className="px-1.5 py-0.5 bg-slate-200/80 text-slate-600 rounded text-[9px] font-extrabold tracking-normal">IST</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-3.5">Downtime</th>
                                            <th className="px-4 py-3.5">SLA Status</th>
                                            <th className="px-4 py-3.5 text-right">Compensation</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {records.length > 0 ? records.map((record, index) => (
                                            <tr key={record.id} className="hover:bg-slate-50/80 transition-colors cursor-default group">
                                                {/* Ticket ID */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-[11px] font-bold text-slate-400 font-mono w-6">
                                                            #{index + 1}
                                                        </span>
                                                        <a
                                                            href="#"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                navigate(`/dashboard/${id}/tickets?ticketId=${encodeURIComponent(record.ticketId)}`);
                                                            }}
                                                            className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand-red transition-colors underline decoration-transparent group-hover:decoration-brand-red/40 underline-offset-2"
                                                        >
                                                            {record.ticketId}
                                                        </a>
                                                    </div>
                                                </td>

                                                {/* Circuit ID */}
                                                <td className="px-4 py-3">
                                                    <div className="inline-flex items-center gap-1.5 group/circuit">
                                                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded-md border border-slate-200/80">
                                                            {record.circuitId}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleCopyCircuit(record.circuitId, e)}
                                                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors opacity-0 group-hover/circuit:opacity-100 focus:opacity-100"
                                                            title="Copy Circuit ID"
                                                        >
                                                            {copiedCircuitId === record.circuitId ? (
                                                                <Check size={13} className="text-emerald-600" />
                                                            ) : (
                                                                <Copy size={13} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Client Name */}
                                                <td className="px-4 py-3">
                                                    <span className="text-xs sm:text-sm font-semibold text-slate-800">{record.clientName}</span>
                                                </td>

                                                {/* Vendor Name */}
                                                <td className="px-4 py-3">
                                                    <span className="text-xs sm:text-sm font-medium text-slate-600">{record.vendorName}</span>
                                                </td>

                                                {/* SLA Start (IST) */}
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                                            <Calendar size={13} className="text-blue-500 shrink-0" />
                                                            {record.displayStartDate || '-'}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 font-medium pl-4 flex items-center gap-1">
                                                            <Clock size={11} className="text-slate-400 shrink-0" />
                                                            {formatTimeIST(record.startTime)}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* SLA Closed (IST) */}
                                                <td className="px-4 py-3">
                                                    {(record.closeDate && !record.closeDate.includes('2000') && !record.closeDate.includes('1970')) ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                                                <Calendar size={13} className="text-indigo-500 shrink-0" />
                                                                {record.closeDate}
                                                            </span>
                                                            <span className="text-[11px] text-slate-500 font-medium pl-4 flex items-center gap-1">
                                                                <Clock size={11} className="text-slate-400 shrink-0" />
                                                                {formatTimeIST(record.closedTime)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                            Active Outage
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Downtime */}
                                                <td className="px-4 py-3">
                                                    {record.downtime !== '-' ? (
                                                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                                            parseInt(record.downtime) > 0 
                                                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                                                : 'bg-slate-50 text-slate-700 border-slate-200'
                                                        }`}>
                                                            <span>{record.downtime}</span>
                                                            <span className="text-[10px] font-normal uppercase opacity-75">min</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 font-medium">-</span>
                                                    )}
                                                </td>

                                                {/* SLA Status */}
                                                <td className="px-4 py-3">
                                                    {(() => {
                                                        const isUnconfigured = record.status === 'No SLA' || record.statusReason?.toLowerCase().includes('no active');
                                                        if (isUnconfigured) {
                                                            return (
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setIsSLARulesModalOpen(true)}
                                                                        title="Click to configure SLA rules for this circuit"
                                                                        className="group/btn flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold shadow-2xs transition-all active:scale-95"
                                                                    >
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-2xs shadow-amber-500/50 group-hover/btn:scale-125 transition-transform" />
                                                                        <span>No SLA Set</span>
                                                                    </button>
                                                                    <div className="relative group/tooltip flex items-center justify-center cursor-help text-amber-400 hover:text-amber-600 transition-colors">
                                                                        <Info size={15} strokeWidth={2.5} />
                                                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-gray-900/95 backdrop-blur-md text-white text-xs font-medium rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 shadow-xl z-50 pointer-events-none text-center transform scale-95 group-hover/tooltip:scale-100">
                                                                            No active SLA rules configured for this circuit yet. Click "No SLA Set" to define SLA tiers.
                                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        if (!record.status) {
                                                            return <span className="text-gray-300 font-medium">-</span>;
                                                        }

                                                        const currentStatus = statusModal.isOpen && statusModal.recordId === record.id ? statusModal.newStatus || record.status : record.status;
                                                        const isBreached = currentStatus?.toUpperCase() === 'BREACHED';

                                                        return (
                                                            <div className="flex items-center gap-1.5">
                                                                <div className={`relative flex items-center gap-2 px-2.5 py-1 rounded-lg border shadow-2xs text-[11px] font-bold transition-all ${
                                                                    isBreached 
                                                                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/70' 
                                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70'
                                                                }`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full shadow-2xs ${isBreached ? 'bg-rose-500 shadow-rose-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`} />
                                                                    <select
                                                                        value={isBreached ? 'Breached' : 'Safe'}
                                                                        onChange={(e) => {
                                                                            setStatusModal({ isOpen: true, recordId: record.id, newStatus: e.target.value as 'Safe' | 'Breached', reason: '' });
                                                                        }}
                                                                        className="bg-transparent cursor-pointer outline-none border-none appearance-none font-bold pr-1 focus:ring-0"
                                                                    >
                                                                        <option value="Safe" className="text-emerald-700 bg-white">Safe</option>
                                                                        <option value="Breached" className="text-rose-700 bg-white">Breached</option>
                                                                    </select>
                                                                </div>
                                                                {record.statusReason && (
                                                                    <div className="relative group/tooltip flex items-center justify-center cursor-help text-slate-300 hover:text-slate-500 transition-colors">
                                                                        <Info size={15} strokeWidth={2.5} />
                                                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 p-3 bg-gray-900/95 backdrop-blur-md text-white text-xs font-medium rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 shadow-xl z-50 pointer-events-none text-center transform scale-95 group-hover/tooltip:scale-100">
                                                                            {record.statusReason}
                                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>

                                                {/* Compensation */}
                                                <td className="px-4 py-3 text-right">
                                                    {record.compensation !== '-' && record.compensation ? (
                                                        <div className="inline-flex items-center justify-center bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs min-w-[65px]">
                                                            <span className="text-xs font-bold">{record.compensation}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 font-medium">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={9} className="px-6 py-24 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                                                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-1">
                                                            <Filter size={28} strokeWidth={1.5} className="text-slate-400" />
                                                        </div>
                                                        <p className="font-bold text-base text-slate-800">No records found</p>
                                                        <p className="text-xs text-slate-500 max-w-sm">No SLA records match your current filters and search query.</p>
                                                        <button
                                                            onClick={() => {
                                                                setAppliedFilter('all');
                                                                setAppliedCustomRange({ start: '', end: '' });
                                                                setSearchQuery('');
                                                            }}
                                                            className="mt-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all shadow-xs active:scale-95"
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

                            {/* Table Status Footer */}
                            <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
                                <span>Showing <strong>{records.length}</strong> monitored records</span>
                                <span className="text-[11px] text-slate-400 font-medium">All SLA timestamps displayed in 24-hr IST</span>
                            </div>
                        </div>
                    </>
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
                            {/* Proactive Caution Banner */}
                            {(() => {
                                const currentRecord = records.find(r => r.id === statusModal.recordId);
                                const isCurrentBreached = currentRecord?.status === 'Breached' || currentRecord?.status === 'BREACHED';
                                const isWaivingBreach = isCurrentBreached && statusModal.newStatus === 'Safe';
                                const isManualBreach = !isCurrentBreached && statusModal.newStatus === 'Breached';
                                
                                if (isWaivingBreach) {
                                    return (
                                        <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl text-amber-800 text-xs flex items-start gap-2.5">
                                            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="font-bold text-amber-900 block mb-0.5">⚠️ Caution: Waiving SLA Breach</strong>
                                                <span>Changing status to <strong>Safe</strong> will cancel the breach penalty and reset compensation from <strong>{currentRecord?.compensation}</strong> to <strong>"-"</strong> (waived). Ensure this override is formally authorized.</span>
                                            </div>
                                        </div>
                                    );
                                }
                                if (isManualBreach) {
                                    return (
                                        <div className="p-3.5 bg-red-50 border border-red-200/90 rounded-xl text-red-800 text-xs flex items-start gap-2.5">
                                            <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="font-bold text-red-900 block mb-0.5">⚠️ Manual Breach Override</strong>
                                                <span>You are manually declaring an SLA breach. A clear and detailed justification is required for the audit log.</span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <p className="text-gray-600">
                                You are changing the status to <span className={`font-bold px-2 py-0.5 rounded text-[12px] ` + (statusModal.newStatus === 'Breached' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600')}>{statusModal.newStatus}</span>. Please provide a reason for this change.
                            </p>
                            <textarea
                                autoFocus
                                value={statusModal.reason}
                                onChange={(e) => setStatusModal(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Enter detailed reason for this change (minimum 10 characters)..."
                                className="w-full h-28 p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all text-sm"
                            />
                            {statusModal.reason.trim().length > 0 && statusModal.reason.trim().length < 10 && (
                                <p className="text-xs text-amber-600 font-medium">
                                    ⚠️ Reason is too short ({statusModal.reason.trim().length}/10 chars minimum). Please provide more context.
                                </p>
                            )}
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
                                disabled={statusModal.reason.trim().length < 10}
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
