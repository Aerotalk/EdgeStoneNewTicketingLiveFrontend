import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TicketReplyView } from './TicketReplyView';
import { Topbar } from '../../components/ui/Topbar';
import { SubHeader } from '../../components/ui/SubHeader';
import { type FilterType } from '../../components/ui/DatePickerDropdown';
import {
    Rows2,
    Columns2,
    CheckSquare,
    Filter,
    Loader2,
    LayoutGrid,
    CalendarDays,
    AlertCircle,
    Clock,
    Zap,
    Wrench,
    LifeBuoy,
    FolderSync,
    CheckCircle2,
    X
} from 'lucide-react';
import { TicketCard } from '../../components/ui/TicketCard';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { toast } from 'react-hot-toast';
import { ticketService, type Ticket } from '../../services/ticketService';
import { useDashboardData } from '../../contexts/DashboardDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateIST } from '../../utils/dateUtils';

interface UITicket extends Ticket {
    name: string;
    isMaintenance?: boolean;
}

type ActivityFilterType = 
    | 'all' 
    | 'new-support' 
    | 'new-maint' 
    | 'active-today' 
    | 'needs-action' 
    | 'awaiting-response' 
    | 'carried-forward' 
    | 'resolved-today';

const toISTDateString = (date: Date | string | undefined): string => {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD in IST
    } catch {
        return '';
    }
};

const TicketsPage: React.FC = () => {
    const { refresh: refreshDashboard } = useDashboardData();
    const { canDelete } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const urlTicketId = searchParams.get('ticketId') || searchParams.get('search');
    const [activeTab, setActiveTab] = useState('open');
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedFilter, setAppliedFilter] = useState<FilterType>('all');
    const [appliedCustomRange, setAppliedCustomRange] = useState({ start: '', end: '' });
    const [activityFilter, setActivityFilter] = useState<ActivityFilterType>('all');
    const [isGroupedByDay, setIsGroupedByDay] = useState(false);
    const [tickets, setTickets] = useState<UITicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ticketToDelete, setTicketToDelete] = useState<UITicket | null>(null);
    const [isDeletingTicket, setIsDeletingTicket] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<UITicket | null>(null);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const data = await ticketService.getAllTickets();

            const formattedTickets = data.map(t => ({
                ...t,
                name: t.ticketType === 'Vendor' 
                    ? (t.vendor?.name || t.email.split('@')[0])
                    : (t.client?.name || t.email.split('@')[0]),
                status: t.status.toLowerCase(),
                isMaintenance: (t as any).isMaintenance
            }));

            setTickets(formattedTickets);
            setSelectedTicket(prev => {
                if (!prev) return null;
                const updated = formattedTickets.find(t => t.id === prev.id);
                return updated ? { ...prev, ...updated, replies: updated.replies || prev.replies } : prev;
            });
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch tickets:', err);
            setError('Failed to load tickets. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log("TicketsPage Mounted - Fetching tickets...");
        fetchTickets();

        const interval = setInterval(fetchTickets, 30000);

        const handleNewNotification = () => {
            fetchTickets();
        };
        window.addEventListener('new_notification', handleNewNotification);

        return () => {
            clearInterval(interval);
            window.removeEventListener('new_notification', handleNewNotification);
        };
    }, []);

    const handleDateApply = (type: FilterType, range: { start: string; end: string }) => {
        setAppliedFilter(type);
        setAppliedCustomRange(range);
    };

    const tabs = [
        { id: 'open', label: 'Open', icon: Rows2 },
        { id: 'in-progress', label: 'In Progress', icon: Columns2 },
        { id: 'closed', label: 'Closed', icon: CheckSquare },
        { id: 'spam', label: 'Spam', icon: Filter },
        { id: 'others', label: 'Others', icon: Filter },
        { id: 'maintenance', label: 'Maintenance', icon: Filter },
    ];

    useEffect(() => {
        if (urlTicketId && tickets.length > 0) {
            const cleanUrlId = urlTicketId.toLowerCase().replace(/^#+/, '').trim();
            const matched = tickets.find(t => 
                (t.ticketId && t.ticketId.toLowerCase().replace(/^#+/, '').trim() === cleanUrlId) ||
                (t.id && String(t.id).toLowerCase() === cleanUrlId)
            );
            if (matched) {
                setSelectedTicket(matched);
                if (matched.status) {
                    setActiveTab(matched.status.toLowerCase().replace(/\s+/g, '-'));
                }
            }
        }
    }, [urlTicketId, tickets]);

    const handleConfirmDeleteTicket = async () => {
        if (!ticketToDelete) return;
        try {
            setIsDeletingTicket(true);
            await ticketService.deleteTicket(ticketToDelete.id);
            toast.success('Ticket deleted successfully');
            setTicketToDelete(null);
            await fetchTickets();
            refreshDashboard();
        } catch (err: any) {
            console.error('Failed to delete ticket:', err);
            toast.error(err.response?.data?.message || 'Failed to delete ticket');
        } finally {
            setIsDeletingTicket(false);
        }
    };

    // Calculate metadata for each ticket relative to today's date in IST
    const todayStr = useMemo(() => toISTDateString(new Date()), []);

    const getTicketMeta = (t: UITicket) => {
        const createdDateStr = toISTDateString(t.createdAt || t.date);
        const isCreatedToday = createdDateStr === todayStr;

        const replies = t.replies || [];
        const latestReply = replies.length > 0 ? replies[replies.length - 1] : null;
        const latestActivityDate = latestReply ? (latestReply.createdAt || latestReply.date) : (t.createdAt || t.date);
        const latestActivityDateStr = toISTDateString(latestActivityDate);
        const hasActivityToday = latestActivityDateStr === todayStr || isCreatedToday;

        const lastAuthorType = latestReply ? latestReply.type : (t.ticketType === 'Vendor' ? 'vendor' : 'client');
        const statusLower = (t.status || '').toLowerCase();
        const isOpenOrInProgress = ['open', 'in-progress', 'in progress', 'maintenance'].includes(statusLower);

        const needsAgentAction = isOpenOrInProgress && (lastAuthorType === 'client' || lastAuthorType === 'vendor');
        const awaitingResponse = isOpenOrInProgress && lastAuthorType === 'agent';
        const isCarriedForward = isOpenOrInProgress && createdDateStr < todayStr;
        const isResolvedToday = ['closed', 'resolved'].includes(statusLower) && latestActivityDateStr === todayStr;
        const isMaint = !!(t.isMaintenance || t.ticketType === 'Vendor');

        return {
            createdDateStr,
            isCreatedToday,
            latestActivityDate,
            latestActivityDateStr,
            latestActivityType: lastAuthorType as 'client' | 'vendor' | 'agent',
            hasActivityToday,
            needsAgentAction,
            awaitingResponse,
            isCarriedForward,
            isResolvedToday,
            isMaint
        };
    };

    // Day-Wise Intelligence Metrics
    const dayWiseMetrics = useMemo(() => {
        let newSupport = 0;
        let newMaint = 0;
        let activeToday = 0;
        let needsAction = 0;
        let awaitingResp = 0;
        let carriedForward = 0;
        let resolvedToday = 0;

        tickets.forEach(t => {
            const meta = getTicketMeta(t);
            if (!meta.isMaint && meta.isCreatedToday) newSupport++;
            if (meta.isMaint && meta.isCreatedToday) newMaint++;
            if (meta.hasActivityToday) activeToday++;
            if (meta.needsAgentAction) needsAction++;
            if (meta.awaitingResponse) awaitingResp++;
            if (meta.isCarriedForward) carriedForward++;
            if (meta.isResolvedToday) resolvedToday++;
        });

        return {
            newSupport,
            newMaint,
            activeToday,
            needsAction,
            awaitingResp,
            carriedForward,
            resolvedToday
        };
    }, [tickets, todayStr]);

    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            const currentStatus = (t.status || '').toLowerCase().replace(/\s+/g, '-');
            const meta = getTicketMeta(t);

            // Tab filter
            if (activeTab === 'maintenance') {
                if (!t.isMaintenance) return false;
            } else if (activeTab === 'spam' || activeTab === 'others') {
                if (t.isMaintenance) return false;
                if (currentStatus !== activeTab) return false;
            } else {
                if (t.isMaintenance) return false;
                if (currentStatus !== activeTab) return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const cleanQuery = query.replace(/^#+/, '');
                const matchesId = t.ticketId ? t.ticketId.toLowerCase().replace(/^#+/, '').includes(cleanQuery) : false;
                const matchesName = t.name ? t.name.toLowerCase().includes(query) : false;
                const matchesCircuit = t.circuitId ? t.circuitId.toLowerCase().includes(query) : false;
                const matchesHeader = t.header ? t.header.toLowerCase().includes(query) : false;
                if (!matchesId && !matchesName && !matchesCircuit && !matchesHeader) return false;
            }

            // Date Range filter (IST based)
            const ticketDateStr = meta.createdDateStr;

            if (appliedFilter === 'today') {
                if (ticketDateStr !== todayStr) return false;
            } else if (appliedFilter === 'yesterday') {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (ticketDateStr !== toISTDateString(yesterday)) return false;
            } else if (appliedFilter === 'last7') {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                if (!(ticketDateStr >= toISTDateString(sevenDaysAgo) && ticketDateStr <= todayStr)) return false;
            } else if (appliedFilter === 'custom') {
                if (appliedCustomRange.start && appliedCustomRange.end) {
                    if (!(ticketDateStr >= appliedCustomRange.start && ticketDateStr <= appliedCustomRange.end)) return false;
                }
            }

            // Day-Wise Activity Filter Chip
            if (activityFilter === 'new-support') {
                if (!(!meta.isMaint && meta.isCreatedToday)) return false;
            } else if (activityFilter === 'new-maint') {
                if (!(meta.isMaint && meta.isCreatedToday)) return false;
            } else if (activityFilter === 'active-today') {
                if (!meta.hasActivityToday) return false;
            } else if (activityFilter === 'needs-action') {
                if (!meta.needsAgentAction) return false;
            } else if (activityFilter === 'awaiting-response') {
                if (!meta.awaitingResponse) return false;
            } else if (activityFilter === 'carried-forward') {
                if (!meta.isCarriedForward) return false;
            } else if (activityFilter === 'resolved-today') {
                if (!meta.isResolvedToday) return false;
            }

            return true;
        });
    }, [tickets, activeTab, searchQuery, appliedFilter, appliedCustomRange, activityFilter, todayStr]);

    // Grouping by Day for Timeline View
    const groupedTickets = useMemo(() => {
        if (!isGroupedByDay) return null;

        const groups: Record<string, { label: string; dateStr: string; items: UITicket[] }> = {};

        filteredTickets.forEach(ticket => {
            const meta = getTicketMeta(ticket);
            const dateKey = meta.latestActivityDateStr || meta.createdDateStr || 'Earlier';

            if (!groups[dateKey]) {
                let label = dateKey;
                if (dateKey === todayStr) {
                    label = `Today (${formatDateIST(dateKey, { day: 'numeric', month: 'short' })})`;
                } else {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (dateKey === toISTDateString(yesterday)) {
                        label = `Yesterday (${formatDateIST(dateKey, { day: 'numeric', month: 'short' })})`;
                    } else {
                        label = formatDateIST(dateKey, { day: 'numeric', month: 'short', year: 'numeric' });
                    }
                }
                groups[dateKey] = { label, dateStr: dateKey, items: [] };
            }

            groups[dateKey].items.push(ticket);
        });

        // Sort groups descending by date
        return Object.values(groups).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    }, [filteredTickets, isGroupedByDay, todayStr]);

    if (selectedTicket) {
        return (
            <div className="flex flex-col h-full overflow-hidden bg-white">
                <TicketReplyView
                    ticket={selectedTicket}
                    onBack={() => {
                        setSelectedTicket(null);
                        let hasChanges = false;
                        if (searchParams.has('ticketId')) {
                            searchParams.delete('ticketId');
                            hasChanges = true;
                        }
                        if (searchParams.has('search')) {
                            searchParams.delete('search');
                            hasChanges = true;
                        }
                        if (hasChanges) {
                            setSearchParams(searchParams);
                        }
                        fetchTickets();
                        refreshDashboard();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#FDFBF9]">
            <Topbar title="Tickets" searchPlaceholder="Search by Ticket ID, circuit, name..." onSearch={setSearchQuery} />

            <SubHeader
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                appliedFilter={appliedFilter}
                appliedCustomRange={appliedCustomRange}
                onDateApply={handleDateApply}
            />

            {/* Smart Day-Wise Intelligence & Activity Tracking Bar */}
            <div className="px-4 sm:px-8 pt-4 pb-2">
                <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-gray-800 flex items-center gap-1.5 uppercase tracking-wider">
                                <Zap size={14} className="text-orange-500 fill-orange-500" />
                                Day-Wise Ticket Intelligence
                            </span>
                            <span className="text-[12px] font-medium text-gray-400">
                                (IST: {formatDateIST(new Date(), { day: 'numeric', month: 'short', year: 'numeric' })})
                            </span>
                        </div>

                        {/* View Mode Toggle: Grid vs Day-Wise Timeline */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                                <button
                                    onClick={() => setIsGroupedByDay(false)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold rounded-md transition-all ${
                                        !isGroupedByDay ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <LayoutGrid size={13} />
                                    Grid
                                </button>
                                <button
                                    onClick={() => setIsGroupedByDay(true)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold rounded-md transition-all ${
                                        isGroupedByDay ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <CalendarDays size={13} />
                                    Group by Day
                                </button>
                            </div>

                            {activityFilter !== 'all' && (
                                <button
                                    onClick={() => setActivityFilter('all')}
                                    className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 px-2 py-1 rounded-md transition-all"
                                >
                                    <X size={12} />
                                    Clear Filter
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick Activity Filter Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-3">
                        {/* New Support Today */}
                        <button
                            onClick={() => setActivityFilter(prev => prev === 'new-support' ? 'all' : 'new-support')}
                            className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                                activityFilter === 'new-support' 
                                    ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-100' 
                                    : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                            }`}
                        >
                            <span className="text-[11px] font-bold text-blue-700 flex items-center justify-between">
                                <span>Support Today</span>
                                <LifeBuoy size={12} className="text-blue-500" />
                            </span>
                            <span className="text-lg font-bold text-gray-900 mt-0.5">{dayWiseMetrics.newSupport}</span>
                        </button>

                        {/* New Maintenance Today */}
                        <button
                            onClick={() => setActivityFilter(prev => prev === 'new-maint' ? 'all' : 'new-maint')}
                            className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                                activityFilter === 'new-maint' 
                                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-100' 
                                    : 'bg-white border-gray-200 hover:border-amber-200 hover:bg-amber-50/30'
                            }`}
                        >
                            <span className="text-[11px] font-bold text-amber-800 flex items-center justify-between">
                                <span>Maint. Today</span>
                                <Wrench size={12} className="text-amber-600" />
                            </span>
                            <span className="text-lg font-bold text-gray-900 mt-0.5">{dayWiseMetrics.newMaint}</span>
                        </button>

                        {/* Active Updates Today */}
                        <button
                            onClick={() => setActivityFilter(prev => prev === 'active-today' ? 'all' : 'active-today')}
                            className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                                activityFilter === 'active-today' 
                                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-100' 
                                    : 'bg-white border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/30'
                            }`}
                        >
                            <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-between">
                                <span>Active Today</span>
                                <Zap size={12} className="text-emerald-500" />
                            </span>
                            <span className="text-lg font-bold text-gray-900 mt-0.5">{dayWiseMetrics.activeToday}</span>
                        </button>

                        {/* Needs Agent Action */}
                        <button
                            onClick={() => setActivityFilter(prev => prev === 'needs-action' ? 'all' : 'needs-action')}
                            className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                                activityFilter === 'needs-action' 
                                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-100' 
                                    : 'bg-white border-gray-200 hover:border-rose-200 hover:bg-rose-50/30'
                            }`}
                        >
                            <span className="text-[11px] font-bold text-rose-600 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                    Needs Action
                                </span>
                                <AlertCircle size={12} className="text-rose-500" />
                            </span>
                            <span className="text-lg font-bold text-rose-700 mt-0.5">{dayWiseMetrics.needsAction}</span>
                        </button>

                        {/* Awaiting Response */}
                        <button
                            onClick={() => setActivityFilter(prev => prev === 'awaiting-response' ? 'all' : 'awaiting-response')}
                            className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                                activityFilter === 'awaiting-response' 
                                    ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-100' 
                                    : 'bg-white border-gray-200 hover:border-purple-200 hover:bg-purple-50/30'
                            }`}
                        >
                            <span className="text-[11px] font-bold text-purple-700 flex items-center justify-between">
                                <span>Awaiting Reply</span>
                                <Clock size={12} className="text-purple-500" />
                            </span>
                            <span className="text-lg font-bold text-gray-900 mt-0.5">{dayWiseMetrics.awaitingResp}</span>
                        </button>

                        {/* Carried Forward */}
                        <button
                            onClick={() => setActivityFilter(prev => prev === 'carried-forward' ? 'all' : 'carried-forward')}
                            className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                                activityFilter === 'carried-forward' 
                                    ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-100' 
                                    : 'bg-white border-gray-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <span className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                                <span>Carry Forward</span>
                                <FolderSync size={12} className="text-slate-500" />
                            </span>
                            <span className="text-lg font-bold text-gray-900 mt-0.5">{dayWiseMetrics.carriedForward}</span>
                        </button>

                        {/* Resolved Today */}
                        <button
                            onClick={() => setActivityFilter(prev => prev === 'resolved-today' ? 'all' : 'resolved-today')}
                            className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                                activityFilter === 'resolved-today' 
                                    ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-100' 
                                    : 'bg-white border-gray-200 hover:border-teal-200 hover:bg-teal-50/30'
                            }`}
                        >
                            <span className="text-[11px] font-bold text-teal-700 flex items-center justify-between">
                                <span>Resolved Today</span>
                                <CheckCircle2 size={12} className="text-teal-500" />
                            </span>
                            <span className="text-lg font-bold text-gray-900 mt-0.5">{dayWiseMetrics.resolvedToday}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tickets Grid / Grouped Timeline Container */}
            <div className="px-4 sm:px-8 pb-8 flex-1 overflow-auto mt-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <p className="text-red-500 font-medium mb-2">{error}</p>
                            <button
                                onClick={fetchTickets}
                                className="text-sm text-gray-600 hover:text-gray-900 underline"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : filteredTickets.length > 0 ? (
                    isGroupedByDay && groupedTickets ? (
                        <div className="space-y-8">
                            {groupedTickets.map(group => (
                                <div key={group.dateStr} className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                                            <CalendarDays size={16} className="text-orange-500" />
                                            {group.label}
                                        </h2>
                                        <span className="text-[12px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                            {group.items.length} ticket{group.items.length !== 1 ? 's' : ''}
                                        </span>
                                        <div className="h-px bg-gray-200 flex-1 ml-2" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {group.items.map(ticket => {
                                            const meta = getTicketMeta(ticket);
                                            return (
                                                <TicketCard
                                                    key={ticket.id}
                                                    name={ticket.name}
                                                    ticketId={ticket.ticketId}
                                                    email={ticket.email}
                                                    header={ticket.circuitId || ticket.header}
                                                    date={ticket.createdAt || ticket.date}
                                                    priority={ticket.priority || localStorage.getItem(`confirmed_priority_${ticket.id}`) || undefined}
                                                    ticketType={ticket.ticketType}
                                                    isMaintenance={ticket.isMaintenance}
                                                    circuitId={ticket.circuitId}
                                                    latestActivityDate={meta.latestActivityDate}
                                                    latestActivityType={meta.latestActivityType}
                                                    needsAction={meta.needsAgentAction}
                                                    awaitingResponse={meta.awaitingResponse}
                                                    onReply={() => setSelectedTicket(ticket)}
                                                    onDelete={canDelete() ? () => setTicketToDelete(ticket) : undefined}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredTickets.map(ticket => {
                                const meta = getTicketMeta(ticket);
                                return (
                                    <TicketCard
                                        key={ticket.id}
                                        name={ticket.name}
                                        ticketId={ticket.ticketId}
                                        email={ticket.email}
                                        header={ticket.circuitId || ticket.header}
                                        date={ticket.createdAt || ticket.date}
                                        priority={ticket.priority || localStorage.getItem(`confirmed_priority_${ticket.id}`) || undefined}
                                        ticketType={ticket.ticketType}
                                        isMaintenance={ticket.isMaintenance}
                                        circuitId={ticket.circuitId}
                                        latestActivityDate={meta.latestActivityDate}
                                        latestActivityType={meta.latestActivityType}
                                        needsAction={meta.needsAgentAction}
                                        awaitingResponse={meta.awaitingResponse}
                                        onReply={() => setSelectedTicket(ticket)}
                                        onDelete={canDelete() ? () => setTicketToDelete(ticket) : undefined}
                                    />
                                );
                            })}
                        </div>
                    )
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-20 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mb-4">
                            <Filter size={32} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No tickets found</h3>
                        <p className="text-gray-500 max-w-xs"> There are no tickets matching the current category and day-wise filter.</p>
                        {activityFilter !== 'all' && (
                            <button
                                onClick={() => setActivityFilter('all')}
                                className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all"
                            >
                                Reset Activity Filter
                            </button>
                        )}
                    </div>
                )}
            </div>

            <DeleteConfirmModal
                isOpen={!!ticketToDelete}
                title="Delete Ticket"
                itemName={ticketToDelete?.ticketId ? `${ticketToDelete.ticketId} - ${ticketToDelete.header}` : ''}
                itemType="Ticket"
                isLoading={isDeletingTicket}
                onConfirm={handleConfirmDeleteTicket}
                onClose={() => setTicketToDelete(null)}
            />
        </div>
    );
};

export default TicketsPage;

