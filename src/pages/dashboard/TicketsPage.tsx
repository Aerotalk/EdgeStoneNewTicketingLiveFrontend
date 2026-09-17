import React, { useState, useEffect } from 'react';
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
    Loader2
} from 'lucide-react';
import { TicketCard } from '../../components/ui/TicketCard';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { toast } from 'react-hot-toast';
import { ticketService, type Ticket } from '../../services/ticketService';
import { useDashboardData } from '../../contexts/DashboardDataContext';
import { useAuth } from '../../contexts/AuthContext';

interface UITicket extends Ticket {
    name: string;
    isMaintenance?: boolean;
}

const TicketsPage: React.FC = () => {
    const { refresh: refreshDashboard } = useDashboardData();
    const { canDelete } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const urlTicketId = searchParams.get('ticketId');
    const [activeTab, setActiveTab] = useState('open');
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedFilter, setAppliedFilter] = useState<FilterType>('all');
    const [appliedCustomRange, setAppliedCustomRange] = useState({ start: '', end: '' });
    const [tickets, setTickets] = useState<UITicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ticketToDelete, setTicketToDelete] = useState<UITicket | null>(null);
    const [isDeletingTicket, setIsDeletingTicket] = useState(false);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const data = await ticketService.getAllTickets();

            const formattedTickets = data.map(t => ({
                ...t,
                name: t.ticketType === 'Vendor' 
                    ? (t.vendor?.name || t.email.split('@')[0])
                    : (t.client?.name || t.email.split('@')[0]), // Use actual client or vendor name
                status: t.status.toLowerCase(), // Ensure lowercase for tab matching
                isMaintenance: (t as any).isMaintenance // Map isMaintenance field from backend
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

        // Optional: Poll for new tickets every 30s
        const interval = setInterval(fetchTickets, 30000);

        // Listen for real-time notification events
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

    const [selectedTicket, setSelectedTicket] = useState<UITicket | null>(null);

    useEffect(() => {
        if (urlTicketId && tickets.length > 0) {
            const cleanUrlId = urlTicketId.toLowerCase().replace(/^#+/, '');
            const matched = tickets.find(t => t.ticketId && t.ticketId.toLowerCase().replace(/^#+/, '') === cleanUrlId);
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

    const filteredTickets = tickets.filter(t => {
        // Use DB status as source of truth — normalise "In Progress" → "in-progress"
        const currentStatus = (t.status || '').toLowerCase().replace(/\s+/g, '-');

        if (activeTab === 'maintenance') {
            if (!t.isMaintenance) return false;
        } else if (activeTab === 'spam' || activeTab === 'others') {
            if (t.isMaintenance) return false;
            if (currentStatus !== activeTab) return false;
        } else {
            if (t.isMaintenance) return false;
            if (currentStatus !== activeTab) return false;
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const cleanQuery = query.replace(/^#+/, '');
            const matchesId = t.ticketId ? t.ticketId.toLowerCase().replace(/^#+/, '').includes(cleanQuery) : false;
            const matchesName = t.name ? t.name.toLowerCase().includes(query) : false;
            if (!matchesId && !matchesName) return false;
        }

        // Date filter — all comparisons done in IST to avoid UTC midnight shift bugs.
        // We derive a comparable YYYY-MM-DD string in IST for both the ticket and today.
        const toISTDateString = (date: Date): string =>
            date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // 'en-CA' gives YYYY-MM-DD

        // Use createdAt ISO timestamp if available; fall back to t.date string
        const rawDate = t.createdAt || t.date;
        const ticketDateStr = toISTDateString(new Date(rawDate));
        const todayStr = toISTDateString(new Date());

        if (appliedFilter === 'all') return true;

        if (appliedFilter === 'today') {
            return ticketDateStr === todayStr;
        }

        if (appliedFilter === 'yesterday') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return ticketDateStr === toISTDateString(yesterday);
        }

        if (appliedFilter === 'last7') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return ticketDateStr >= toISTDateString(sevenDaysAgo) && ticketDateStr <= todayStr;
        }

        if (appliedFilter === 'custom') {
            if (!appliedCustomRange.start || !appliedCustomRange.end) return true;
            return ticketDateStr >= appliedCustomRange.start && ticketDateStr <= appliedCustomRange.end;
        }

        return true;
    });

    if (selectedTicket) {
        return (
            <div className="flex flex-col h-full overflow-hidden bg-white">
                <TicketReplyView
                    ticket={selectedTicket}
                    onBack={() => {
                        setSelectedTicket(null);
                        if (searchParams.has('ticketId')) {
                            searchParams.delete('ticketId');
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
            <Topbar title="Tickets" searchPlaceholder="Search tickets..." onSearch={setSearchQuery} />

            <SubHeader
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                appliedFilter={appliedFilter}
                appliedCustomRange={appliedCustomRange}
                onDateApply={handleDateApply}
            />

            <div className="px-4 sm:px-8 pb-8 flex-1 overflow-auto mt-6">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredTickets.map(ticket => (
                            <TicketCard
                                key={ticket.id}
                                name={ticket.name}
                                ticketId={ticket.ticketId}
                                email={ticket.email}
                                header={ticket.circuitId || ticket.header}
                                date={ticket.createdAt || ticket.date}
                                priority={ticket.priority || localStorage.getItem(`confirmed_priority_${ticket.id}`) || undefined}
                                onReply={() => setSelectedTicket(ticket)}
                                onDelete={canDelete() ? () => setTicketToDelete(ticket) : undefined}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-20 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mb-4">
                            <Filter size={32} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No tickets found</h3>
                        <p className="text-gray-500 max-w-xs"> There are no tickets in this category for the selected date range.</p>
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
