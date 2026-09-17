import React, { useState, useEffect } from 'react';
import { ChevronUp, Ticket as TicketIcon, X, Send, Trash2, CheckCircle, Plus, Calendar, Clock } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { nowDateIST, nowTimeIST, formatDateWithTZ, formatTimeWithTZ } from '../../utils/dateUtils';
import { getAuthHeaders, API_URL_SLA } from '../../types/sla';
import { toast } from 'react-hot-toast';
import { clientService } from '../../services/clientService';
import { useAuth } from '../../contexts/AuthContext';

const SUPPORT_AGENTS = [
    { id: 'agent-1', name: 'Soumyajit' },
    { id: 'agent-2', name: 'Priyanshu' }
];

interface Note {
    text: string;
    time: string;
    author: string;
}

interface TicketInfoSidebarProps {
    ticket: {
        id: string;
        name: string;
        ticketId: string;
        email: string;
        header: string;
        status: string;
        date?: string;
        receivedAt?: string;
        receivedTime?: string;
        createdAt?: string;
        isSlaActive?: boolean;
        isMaintenance?: boolean;
        circuitId?: string | null;
    };
    priority?: string;
    circuit?: string;
    status?: string;
    closedAt?: string;
    activeTab?: string;
    vendorEmail?: string;
    vendorName?: string;
    onTimeZoneChangeActive?: (zone: string) => void;
}

interface ActivityLog {
    id: string;
    action: string;
    description: string;
    time: string;
    date: string;
    author: string;
    createdAt?: string; // ISO timestamp — use this for IST formatting when available
}

export const TicketInfoSidebar: React.FC<TicketInfoSidebarProps> = ({ ticket, priority, circuit, status, closedAt, activeTab, vendorEmail, vendorName, onTimeZoneChangeActive }) => {
    const { id } = useParams();
    const { canDelete } = useAuth();
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

    const [slaId, setSlaId] = useState('');
    const [slaCloseDate, setSlaCloseDate] = useState('');
    const [slaCloseTime, setSlaCloseTime] = useState('');
    const [slaCompensation, setSlaCompensation] = useState('-');
    const [slaStatus, setSlaStatus] = useState('Safe');
    const [slaStartDate, setSlaStartDate] = useState('');
    const [slaStartTime, setSlaStartTime] = useState('');
    const isVendorTicket = Boolean(ticket.ticketId?.startsWith('#V') || ticket.ticketType === 'Vendor');
    const [isSlaActive, setIsSlaActive] = useState(isVendorTicket ? false : (ticket.isSlaActive !== undefined ? ticket.isSlaActive : true));

    useEffect(() => {
        if (isVendorTicket) {
            setIsSlaActive(false);
        } else {
            setIsSlaActive(ticket.isSlaActive !== undefined ? ticket.isSlaActive : true);
        }
    }, [ticket.id, isVendorTicket, ticket.isSlaActive]);

    const [fullCircuitDetails, setFullCircuitDetails] = useState<any>(null);
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');

    // Modal states
    const [showDateModal, setShowDateModal] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [showStartDateModal, setShowStartDateModal] = useState(false);
    const [showStartTimeModal, setShowStartTimeModal] = useState(false);

    const [tempDate, setTempDate] = useState('');
    const [tempTime, setTempTime] = useState('');
    const [tempStartDate, setTempStartDate] = useState('');
    const [tempStartTime, setTempStartTime] = useState('');

    const currentAgentName = SUPPORT_AGENTS.find(a => a.id === id)?.name || 'Agent';

    useEffect(() => {
        const savedNotes = localStorage.getItem(`ticket_notes_${ticket.id}`);
        if (savedNotes) {
            setNotes(JSON.parse(savedNotes));
        } else {
            setNotes([]);
        }

        // Fetch activity logs from backend
        const fetchActivityLogs = async () => {
            try {
                const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/tickets`;

                // Get token
                const userStr = localStorage.getItem('edgestone_user');
                const user = userStr ? JSON.parse(userStr) : null;
                const token = user?.token || '';

                const response = await fetch(`${API_URL}/${ticket.id}/activity-logs`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const logs = await response.json();
                    setActivityLogs(logs);
                }
            } catch (error) {
                console.error('Failed to fetch activity logs:', error);
            }
        };

        fetchActivityLogs();

        // Fetch SLA Record from Backend
        const fetchSLARecord = async () => {
            try {
                const response = await fetch(`${API_URL_SLA}/ticket/${ticket.id}`, { headers: getAuthHeaders() });
                if (!response.ok || response.status === 404) return;

                const result = await response.json();
                const records = result.data; // Array of SLAs
                if (records && Array.isArray(records)) {
                    // Match SLA type to active tab (CLIENT vs VENDOR)
                    const targetType = activeTab?.startsWith('vendor') ? 'VENDOR' : 'CLIENT';
                    const record = records.find(r => r.type === targetType);

                    if (record) {
                        setSlaId(record.id);
                        setSlaStartDate(record.startDate || '');
                        setSlaStartTime(record.startTime || '');
                        setSlaCloseDate(record.closeDate || '');
                        setSlaCloseTime(record.closedTime || ''); // Note: property is closedTime
                        if (record.timeZone) {
                            setSlaTimeZone(record.timeZone);
                            if (onTimeZoneChangeActive) onTimeZoneChangeActive(record.timeZone);
                        }
                        setSlaCompensation(record.compensation || '-');
                        setSlaStatus(record.status || 'Safe');
                    } else {
                        // Reset if no SLA exists for this tab
                        setSlaId('');
                        setSlaStartDate('');
                        setSlaStartTime('');
                        setSlaCloseDate('');
                        setSlaCloseTime('');
                        setSlaCompensation('-');
                        setSlaStatus('Safe');
                    }
                }
            } catch (error) {
                console.error('Failed to fetch SLA details:', error);
            }
        };

        const fetchCircuitDetails = async () => {
            const currentCircuit = circuit || ticket.circuitId;
            if (!currentCircuit) {
                setFullCircuitDetails(null);
                return;
            }
            try {
                const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/circuits`;
                const userStr = localStorage.getItem('edgestone_user');
                const user = userStr ? JSON.parse(userStr) : null;
                const token = user?.token || '';

                const response = await fetch(API_URL, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const result = await response.json();
                    const allCircuits = Array.isArray(result) ? result : (result.data || []);
                    const currentCircuit = circuit || ticket.circuitId;
                    const matched = allCircuits.find((c: any) => c.customerCircuitId === currentCircuit || c.supplierCircuitId === currentCircuit || c.id === currentCircuit);
                    if (matched) {
                        setFullCircuitDetails(matched);
                        if (matched.client) {
                            setClientName(matched.client.name);
                            clientService.getAllClients().then(clients => {
                                const found = clients.find(c => c.id === matched.clientId);
                                if (found && found.emails && found.emails.length > 0) {
                                    setClientEmail(found.emails[0]);
                                }
                            }).catch(() => { });
                        } else {
                            setClientName('');
                            setClientEmail('');
                        }
                    } else {
                        setFullCircuitDetails(null);
                        setClientName('');
                        setClientEmail('');
                    }
                }
            } catch (error) {
                console.error('Failed to fetch circuit details:', error);
            }
        };

        fetchSLARecord();
        fetchCircuitDetails();
    }, [ticket.id, circuit, ticket.circuitId, activeTab]);

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        const timeStr = nowTimeIST();
        const dateStr = nowDateIST();
        const updatedNotes: Note[] = [...notes, {
            text: newNote.trim(),
            time: `${dateStr} • ${timeStr}`,
            author: currentAgentName
        }];
        setNotes(updatedNotes);
        localStorage.setItem(`ticket_notes_${ticket.id}`, JSON.stringify(updatedNotes));
        setNewNote('');
    };

    const handleDeleteNote = (index: number) => {
        if (!canDelete()) return;
        const updatedNotes = notes.filter((_, i) => i !== index);
        setNotes(updatedNotes);
        localStorage.setItem(`ticket_notes_${ticket.id}`, JSON.stringify(updatedNotes));
    };

    const handleManualUpdate = async (payload: any) => {
        if (!slaId) {
            toast.error('No active SLA to update');
            return false;
        }
        try {
            const response = await fetch(`${API_URL_SLA}/${slaId}/manual-update`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('API failed');
            return true;
        } catch (error) {
            console.error('Failed to manually update SLA', error);
            return false;
        }
    };

    const handleSaveDate = async () => {
        const offsets: Record<string, string> = { 'UTC': '+0000', 'GMT': '+0000', 'IST': '+0530' };
        const offset = offsets[slaTimeZone] || '+0000';
        const timePart = dynamicSlaClose.time !== '-' ? dynamicSlaClose.time.replace(' hrs', '') : '00:00';
        const dateObj = new Date(`${tempDate} ${timePart} GMT${offset}`);

        if (!isNaN(dateObj.getTime())) {
            const istDate = formatDateWithTZ(dateObj, 'IST', { day: 'numeric', month: 'short', year: 'numeric' });
            const istTime = formatTimeWithTZ(dateObj, 'IST') + ' hrs';
            setSlaCloseDate(istDate);
            setSlaCloseTime(istTime);
            setShowDateModal(false);
            if (await handleManualUpdate({ closeDate: istDate, closedTime: istTime })) {
                toast.success('SLA close date updated manually');
            }
        } else {
            setShowDateModal(false);
            toast.error('Invalid date format');
        }
    };

    const handleSaveTime = async () => {
        const offsets: Record<string, string> = { 'UTC': '+0000', 'GMT': '+0000', 'IST': '+0530' };
        const offset = offsets[slaTimeZone] || '+0000';
        let datePart = dynamicSlaClose.date;
        if (datePart === '-') {
            const now = new Date();
            datePart = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        const dateObj = new Date(`${datePart} ${tempTime} GMT${offset}`);

        if (!isNaN(dateObj.getTime())) {
            const istDate = formatDateWithTZ(dateObj, 'IST', { day: 'numeric', month: 'short', year: 'numeric' });
            const istTime = formatTimeWithTZ(dateObj, 'IST') + ' hrs';
            setSlaCloseDate(istDate);
            setSlaCloseTime(istTime);
            setShowTimeModal(false);
            if (await handleManualUpdate({ closeDate: istDate, closedTime: istTime })) {
                toast.success('SLA close time updated manually');
            }
        } else {
            setShowTimeModal(false);
            toast.error('Invalid time format');
        }
    };

    const handleSaveStartDate = async () => {
        const offsets: Record<string, string> = { 'UTC': '+0000', 'GMT': '+0000', 'IST': '+0530' };
        const offset = offsets[slaTimeZone] || '+0000';
        const timePart = dynamicSlaStart.time !== '-' ? dynamicSlaStart.time.replace(' hrs', '') : '00:00';
        const dateObj = new Date(`${tempStartDate} ${timePart} GMT${offset}`);

        if (!isNaN(dateObj.getTime())) {
            const istDate = formatDateWithTZ(dateObj, 'IST', { day: 'numeric', month: 'short', year: 'numeric' });
            const istTime = formatTimeWithTZ(dateObj, 'IST') + ' hrs';
            setSlaStartDate(istDate);
            setSlaStartTime(istTime);
            setShowStartDateModal(false);
            if (await handleManualUpdate({ startDate: istDate, startTime: istTime })) {
                toast.success('SLA start date updated manually');
            }
        } else {
            setShowStartDateModal(false);
            toast.error('Invalid date format');
        }
    };

    const handleSaveStartTime = async () => {
        const offsets: Record<string, string> = { 'UTC': '+0000', 'GMT': '+0000', 'IST': '+0530' };
        const offset = offsets[slaTimeZone] || '+0000';
        let datePart = dynamicSlaStart.date;
        if (datePart === '-') {
            const now = new Date();
            datePart = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        const dateObj = new Date(`${datePart} ${tempStartTime} GMT${offset}`);

        if (!isNaN(dateObj.getTime())) {
            const istDate = formatDateWithTZ(dateObj, 'IST', { day: 'numeric', month: 'short', year: 'numeric' });
            const istTime = formatTimeWithTZ(dateObj, 'IST') + ' hrs';
            setSlaStartDate(istDate);
            setSlaStartTime(istTime);
            setShowStartTimeModal(false);
            if (await handleManualUpdate({ startDate: istDate, startTime: istTime })) {
                toast.success('SLA start time updated manually');
            }
        } else {
            setShowStartTimeModal(false);
            toast.error('Invalid time format');
        }
    };

    const handleSaveTimeZone = async (zone: string) => {
        setSlaTimeZone(zone);
        if (onTimeZoneChangeActive) onTimeZoneChangeActive(zone);

        if (await handleManualUpdate({ timeZone: zone })) {
            toast.success('SLA timezone updated');
        } else {
            toast.error('Failed to update timezone');
        }
    };

    const handleSlaToggle = async () => {
        if (isVendorTicket) {
            toast.error('SLA is disabled for Vendor (#V) tickets. Only Client tickets support SLA.');
            return;
        }
        const newValue = !isSlaActive;
        setIsSlaActive(newValue);
        try {
            const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/tickets`;
            const userStr = localStorage.getItem('edgestone_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token || '';
            const response = await fetch(`${API_URL}/${ticket.id}/sla-toggle`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isSlaActive: newValue })
            });

            if (response.ok) {
                toast.success(`SLA has been ${newValue ? 'Actived' : 'Deactivated'}`);
            } else {
                toast.error('Failed to update SLA status on server');
                setIsSlaActive(!newValue); // revert on failure
            }
        } catch (e) {
            setIsSlaActive(!newValue);
            toast.error('Failed to update SLA status');
        }
    };

    const getDynamicSlaTime = (dateStr: string, timeStr: string) => {
        if (!dateStr || !timeStr || dateStr === '-' || timeStr === '-') return { date: dateStr || '-', time: timeStr || '-' };
        try {
            const cleanTime = timeStr.replace(' hrs', '').trim();
            // The database stores these strings natively in IST (+05:30)
            const dateObj = new Date(`${dateStr} ${cleanTime} GMT+0530`);
            if (isNaN(dateObj.getTime())) return { date: dateStr, time: timeStr };
            return {
                date: formatDateWithTZ(dateObj, slaTimeZone, { day: 'numeric', month: 'short', year: 'numeric' }),
                time: formatTimeWithTZ(dateObj, slaTimeZone) + ' hrs'
            };
        } catch (e) {
            return { date: dateStr, time: timeStr };
        }
    };

    const dynamicSlaStart = getDynamicSlaTime(slaStartDate, slaStartTime);
    const dynamicSlaClose = getDynamicSlaTime(slaCloseDate, slaCloseTime);

    return (
        <div className="w-full lg:w-[340px] border-t lg:border-t-0 border-l-0 lg:border-l border-gray-100 bg-white flex flex-col h-auto lg:h-full font-sans shrink-0 relative">
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* Profile Section */}
                <div className="p-8 border-b border-gray-50">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-16 h-16 rounded-full bg-[#E5DCC3] flex items-center justify-center text-[#5C5648] font-bold text-2xl shadow-sm flex-shrink-0">
                            {activeTab?.startsWith('vendor') ? (vendorName ? vendorName.slice(0, 2).toUpperCase() : 'VN') : (clientName ? clientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : ticket.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2))}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h3 className="text-[20px] font-bold text-gray-900 leading-tight truncate">
                                {activeTab?.startsWith('vendor') ? (vendorName || 'EdgeStone Vendor') : (clientName || ticket.name)}
                            </h3>
                            <p className="text-[13px] text-gray-500 font-medium mt-0.5 truncate">
                                {activeTab?.startsWith('vendor') ? (vendorEmail || 'Fetching vendor...') : (clientEmail || ticket.email)}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="flex justify-between items-center text-[14px]">
                            <span className="text-gray-400 font-medium">Profile</span>
                            <span className="text-gray-600 font-bold">{activeTab?.startsWith('vendor') ? 'Vendor' : 'Customer'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[14px]">
                            <span className="text-gray-400 font-medium">Date</span>
                            <span className="text-gray-600 font-bold">
                                {formatDateWithTZ(ticket.createdAt || ticket.date || '', slaTimeZone, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[14px]">
                            <span className="text-gray-400 font-medium">Time</span>
                            <span className="text-gray-600 font-bold">{formatTimeWithTZ(ticket.receivedAt || ticket.createdAt || new Date(), slaTimeZone)} hrs</span>
                        </div>
                        <div className="flex justify-between items-center text-[14px]">
                            <span className="text-gray-400 font-medium">Priority</span>
                            <span className={`font-bold ${priority ? 'text-gray-900' : 'text-gray-600'}`}>
                                {priority || '-'}
                            </span>
                        </div>
                        {/* <div className="flex justify-between items-center text-[14px]">
                            <span className="text-gray-400 font-medium">Maintenance Mode</span>
                            <button
                                onClick={async () => {
                                    try {
                                        const newStatus = !ticket.isMaintenance;
                                        await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/tickets/${ticket.id}`, {
                                            method: 'PUT',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${JSON.parse(localStorage.getItem('edgestone_user') || '{}').token}`
                                            },
                                            body: JSON.stringify({ isMaintenance: newStatus })
                                        });
                                        toast.success(`Ticket marked as ${newStatus ? 'Maintenance' : 'Normal'}. Please refresh to reflect changes.`);
                                    } catch(e) {
                                        toast.error('Failed to update maintenance status');
                                    }
                                }}
                                className={`w-8 h-4 rounded-full transition-colors relative ${ticket.isMaintenance ? 'bg-orange-500' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${ticket.isMaintenance ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div> */}
                    </div>
                </div>

                {/* SLA Calculator Section */}
                <div className="p-8 border-b border-gray-50">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h4 className="text-[14px] font-bold text-gray-900 tracking-tight">SLA calculator</h4>
                            {isVendorTicket && (
                                <p className="text-[11px] text-gray-400 font-medium mt-0.5">Disabled for Vendor tickets</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-gray-400 uppercase">
                                {isVendorTicket ? 'SLA DISABLED' : (isSlaActive ? 'SLA ON' : 'SLA OFF')}
                            </span>
                            <button
                                onClick={handleSlaToggle}
                                disabled={isVendorTicket}
                                title={isVendorTicket ? 'SLA is disabled for Vendor (#V) tickets' : ''}
                                className={`w-8 h-4 rounded-full transition-colors relative ${isVendorTicket ? 'bg-gray-200 cursor-not-allowed opacity-60' : (isSlaActive ? 'bg-orange-500' : 'bg-gray-200')}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${!isVendorTicket && isSlaActive ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    <div className={`space-y-4 ${(!isSlaActive || isVendorTicket) ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex justify-between items-center pb-1">
                            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Circuit ID</span>
                            <span className={`text-[14px] font-bold ${circuit || ticket.circuitId ? 'text-gray-900' : 'text-gray-400'}`}>
                                {activeTab?.startsWith('vendor')
                                    ? (fullCircuitDetails?.supplierCircuitId || circuit || ticket.circuitId || 'None')
                                    : (fullCircuitDetails?.customerCircuitId || circuit || ticket.circuitId || 'None')
                                }
                            </span>
                        </div>

                        {!activeTab?.startsWith('vendor') && (
                            <div className="flex justify-between items-center pb-1">
                                <span className="text-[12px] font-bold text-orange-400 uppercase tracking-wider">Supplier ID</span>
                                <span className={`text-[14px] font-bold ${fullCircuitDetails?.supplierCircuitId ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {fullCircuitDetails?.supplierCircuitId || 'None'}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-[14px]">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-medium">SLA start time</span>
                                <button
                                    onClick={() => { setTempStartTime(dynamicSlaStart.time !== '-' ? dynamicSlaStart.time.replace(' hrs', '') : ''); setShowStartTimeModal(true); }}
                                    className="p-1 hover:bg-orange-50 rounded-full text-orange-400 hover:text-orange-600 transition-all border border-transparent hover:border-orange-100 shadow-sm hover:shadow active:scale-90"
                                >
                                    <Plus size={12} strokeWidth={3} />
                                </button>
                            </div>
                            <span className={`text-[14px] font-bold ${slaStartTime ? 'text-gray-900' : 'text-gray-600'}`}>
                                {dynamicSlaStart.time !== '-' ? dynamicSlaStart.time : '-'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[14px]">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-medium">SLA start date</span>
                                <button
                                    onClick={() => { setTempStartDate(dynamicSlaStart.date !== '-' ? dynamicSlaStart.date : ''); setShowStartDateModal(true); }}
                                    className="p-1 hover:bg-orange-50 rounded-full text-orange-400 hover:text-orange-600 transition-all border border-transparent hover:border-orange-100 shadow-sm hover:shadow active:scale-90"
                                >
                                    <Plus size={12} strokeWidth={3} />
                                </button>
                            </div>
                            <span className={`text-[14px] font-bold ${slaStartDate ? 'text-gray-900' : 'text-gray-600'}`}>
                                {dynamicSlaStart.date !== '-' ? dynamicSlaStart.date : '-'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[14px]">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-medium">SLA close at</span>
                                <button
                                    onClick={() => { setTempTime(dynamicSlaClose.time !== '-' ? dynamicSlaClose.time.replace(' hrs', '') : ''); setShowTimeModal(true); }}
                                    className="p-1 hover:bg-orange-50 rounded-full text-orange-400 hover:text-orange-600 transition-all border border-transparent hover:border-orange-100 shadow-sm hover:shadow active:scale-90"
                                >
                                    <Plus size={12} strokeWidth={3} />
                                </button>
                            </div>
                            <span className={`text-[14px] font-bold ${slaCloseTime ? 'text-gray-900' : 'text-gray-600'}`}>
                                {dynamicSlaClose.time !== '-' ? dynamicSlaClose.time : '-'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[14px]">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-medium">SLA close date</span>
                                <button
                                    onClick={() => { setTempDate(dynamicSlaClose.date !== '-' ? dynamicSlaClose.date : ''); setShowDateModal(true); }}
                                    className="p-1 hover:bg-orange-50 rounded-full text-orange-400 hover:text-orange-600 transition-all border border-transparent hover:border-orange-100 shadow-sm hover:shadow active:scale-90"
                                >
                                    <Plus size={12} strokeWidth={3} />
                                </button>
                            </div>
                            <span className={`text-[14px] font-bold ${slaCloseDate ? 'text-gray-900' : 'text-gray-600'}`}>
                                {dynamicSlaClose.date !== '-' ? dynamicSlaClose.date : '-'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[14px]">
                            <span className="text-gray-400 font-medium">Time Zone</span>
                            <select
                                value={slaTimeZone}
                                onChange={(e) => handleSaveTimeZone(e.target.value)}
                                className="bg-gray-50 border border-gray-100 rounded-md px-2 py-1 outline-none text-[12px] font-bold text-gray-700"
                            >
                                <option value="UTC">UTC</option>
                                <option value="GMT">GMT</option>
                                <option value="IST">IST</option>
                            </select>
                        </div>

                        {/* Compensation Row */}
                        <div className="mt-2 pt-4 border-t border-gray-50">
                            <div className="flex justify-between items-center text-[14px] mb-1">
                                <span className="text-gray-400 font-medium">SLA Status</span>
                                <span className={`text-[13px] font-black px-2 py-0.5 rounded-full ${slaStatus === 'Breached' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                    }`}>
                                    {slaStatus}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[14px]">
                                <span className="text-gray-400 font-medium">Compensation</span>
                                <span className={`text-[14px] font-black ${slaCompensation !== '-' ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                    {slaCompensation}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activity Log Section */}
                <div className="p-8 space-y-8">
                    <h4 className="text-[14px] font-bold text-gray-900 mb-6 tracking-tight">Activity log</h4>

                    {status?.toLowerCase() === 'closed' && (
                        <div className="flex gap-4 animate-in fade-in slide-in-from-left-2 duration-500">
                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-500 flex-shrink-0">
                                <CheckCircle size={18} />
                            </div>
                            <div className="flex-1">
                                <div className="space-y-1">
                                    <span className="text-[13px] font-bold text-gray-900 block">Ticket closed</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase">
                                            {closedAt ? closedAt.split(' • ')[0] : 'Pending'}
                                        </span>
                                        {closedAt && <div className="w-1 h-1 rounded-full bg-gray-200" />}
                                        <span className="text-[11px] font-bold text-gray-400 uppercase">
                                            {closedAt ? closedAt.split(' • ')[1] : ''}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-green-500 font-bold mt-2">Ticket resolution confirmed</p>
                            </div>
                        </div>
                    )}

                    {/* Activity Logs from Backend */}
                    {activityLogs.length > 0 ? (
                        activityLogs.slice().reverse().map((log) => (
                            <div key={log.id} className="flex gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${log.action === 'created' ? 'bg-[#F5F2F9] text-[#A688C4]' :
                                    log.action === 'auto_replied' ? 'bg-orange-50 text-orange-500' :
                                        log.action === 'replied' ? 'bg-blue-50 text-blue-500' :
                                            'bg-gray-50 text-gray-500'
                                    }`}>
                                    <TicketIcon size={18} />
                                </div>
                                <div className="flex-1">
                                    <div className="space-y-1">
                                        <span className="text-[13px] font-bold text-gray-900 block">{log.description}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                                                {log.createdAt ? formatDateWithTZ(log.createdAt, slaTimeZone) : log.date}
                                            </span>
                                            <div className="w-1 h-1 rounded-full bg-gray-200" />
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{log.createdAt ? formatTimeWithTZ(log.createdAt, slaTimeZone) : log.time} hrs</span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-gray-500 font-bold mt-2">By {log.author}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#F5F2F9] flex items-center justify-center text-[#A688C4] flex-shrink-0">
                                <TicketIcon size={18} />
                            </div>
                            <div className="flex-1">
                                <div className="space-y-1">
                                    <span className="text-[13px] font-bold text-gray-900 block">Ticket opened</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                                            {formatDateWithTZ(ticket.createdAt || ticket.date || '', slaTimeZone)}
                                        </span>
                                        <div className="w-1 h-1 rounded-full bg-gray-200" />
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{formatTimeWithTZ(ticket.receivedAt || ticket.createdAt || new Date(), slaTimeZone)} hrs</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-[#A688C4] font-bold mt-2">Ticket #{ticket.ticketId} created</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Notes Footer */}
            <div className="px-6 pb-6 relative">
                {/* Notes Container */}
                {isNotesOpen && (
                    <div className="absolute bottom-full left-6 right-6 mb-3 bg-white border border-gray-100 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col z-50 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Header */}
                        <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between bg-white">
                            <h5 className="text-[13px] font-bold text-gray-900">Notes</h5>
                            <button
                                onClick={() => setIsNotesOpen(false)}
                                className="p-1 hover:bg-gray-50 rounded-lg transition-colors text-gray-400"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* List - "Different Box" 1 */}
                        <div className="max-h-[220px] overflow-y-auto p-4 space-y-3 bg-[#FCFCFD]">
                            {notes.length > 0 ? (
                                notes.map((note, i) => (
                                    <div key={i} className="group relative">
                                        <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-red-100 transition-colors">
                                            <p className="text-[12px] text-gray-600 font-medium leading-relaxed break-words whitespace-pre-wrap pr-4">{note.text}</p>
                                            <div className="mt-2 flex justify-between items-center">
                                                {canDelete() && (
                                                    <button
                                                        onClick={() => handleDeleteNote(i)}
                                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title="Delete note"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-orange-500/70">{note.author || 'Agent'}</span>
                                                    <span className="text-[10px] font-bold text-gray-400">{note.time}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 flex flex-col items-center justify-center text-center opacity-40">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mb-2">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">No notes yet</p>
                                </div>
                            )}
                        </div>

                        {/* Input Area - "Different Box" 2 */}
                        <div className="p-4 bg-white border-t border-gray-50">
                            <div className="relative group">
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Add a private note..."
                                    className="w-full min-h-[80px] p-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[12px] font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-orange-200 focus:bg-white transition-all resize-none scrollbar-hide break-words"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddNote();
                                        }
                                    }}
                                />
                                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                    <button
                                        onClick={handleAddNote}
                                        disabled={!newNote.trim()}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all shadow-sm ${newNote.trim() ? 'bg-orange-500 text-white hover:bg-orange-600 scale-100' : 'bg-gray-100 text-gray-300 scale-95 cursor-not-allowed'}`}
                                    >
                                        <span className="text-[11px] font-bold">Add note</span>
                                        <Send size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => setIsNotesOpen(!isNotesOpen)}
                    className={`w-full flex items-center justify-between px-5 py-4 bg-[#FFF9F1] text-[#B87C3D] rounded-xl font-bold text-[14px] hover:bg-[#FFF4E4] transition-all border border-transparent active:scale-[0.98] outline-none group ${isNotesOpen ? 'border-orange-200 shadow-sm' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center opacity-80 relative">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                        <span className="relative">
                            Create notes
                            {notes.length > 0 && (
                                <span className="absolute -right-7 top-1/2 -translate-y-1/2 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full shadow-sm ring-2 ring-[#FFF9F1] animate-in zoom-in duration-300">
                                    {notes.length}
                                </span>
                            )}
                        </span>
                    </div>
                    <ChevronUp size={16} className={`opacity-60 transition-transform duration-300 ${isNotesOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Set Time Modal */}
            {showTimeModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0F172A]/20 backdrop-blur-[6px] animate-in fade-in duration-500">
                    <div className="bg-white rounded-[32px] w-full max-w-[400px] shadow-[0_32px_128px_-12px_rgba(15,23,42,0.25)] border border-gray-100/50 p-10 animate-in zoom-in-95 duration-300 relative">
                        <button onClick={() => setShowTimeModal(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all">
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                                <Clock size={32} />
                            </div>
                            <h3 className="text-[24px] font-bold text-gray-900 mb-2 tracking-tight">Set SLA Time</h3>
                            <p className="text-[14px] text-gray-500 mb-8 font-medium">Please enter the closure time</p>

                            <div className="w-full mb-8 group">
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-left px-1">Time (24h format)</label>
                                <input
                                    type="time"
                                    value={tempTime}
                                    onChange={(e) => setTempTime(e.target.value)}
                                    className="w-full h-[56px] border border-gray-100 bg-gray-50/50 rounded-2xl px-6 text-[16px] font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all"
                                />
                            </div>

                            <button
                                onClick={handleSaveTime}
                                className="w-full h-[56px] bg-[#0F172A] text-white font-bold rounded-2xl text-[15px] shadow-[0_8px_32px_rgba(15,23,42,0.2)] hover:bg-[#1E293B] hover:-translate-y-0.5 transition-all active:scale-95"
                            >
                                Confirm Time
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Set Start Time Modal */}
            {showStartTimeModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0F172A]/20 backdrop-blur-[6px] animate-in fade-in duration-500">
                    <div className="bg-white rounded-[32px] w-full max-w-[400px] shadow-[0_32px_128px_-12px_rgba(15,23,42,0.25)] border border-gray-100/50 p-10 animate-in zoom-in-95 duration-300 relative">
                        <button onClick={() => setShowStartTimeModal(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all">
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                                <Clock size={32} />
                            </div>
                            <h3 className="text-[24px] font-bold text-gray-900 mb-2 tracking-tight">Set SLA Start Time</h3>
                            <p className="text-[14px] text-gray-500 mb-8 font-medium">Please enter the start time</p>

                            <div className="w-full mb-8 group">
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-left px-1">Time (24h format)</label>
                                <input
                                    type="time"
                                    value={tempStartTime}
                                    onChange={(e) => setTempStartTime(e.target.value)}
                                    className="w-full h-[56px] border border-gray-100 bg-gray-50/50 rounded-2xl px-6 text-[16px] font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all"
                                />
                            </div>

                            <button
                                onClick={handleSaveStartTime}
                                className="w-full h-[56px] bg-[#0F172A] text-white font-bold rounded-2xl text-[15px] shadow-[0_8px_32px_rgba(15,23,42,0.2)] hover:bg-[#1E293B] hover:-translate-y-0.5 transition-all active:scale-95"
                            >
                                Confirm Time
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Set Date Modal */}
            {showDateModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0F172A]/20 backdrop-blur-[6px] animate-in fade-in duration-500">
                    <div className="bg-white rounded-[32px] w-full max-w-[400px] shadow-[0_32px_128px_-12px_rgba(15,23,42,0.25)] border border-gray-100/50 p-10 animate-in zoom-in-95 duration-300 relative">
                        <button onClick={() => setShowDateModal(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all">
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6">
                                <Calendar size={32} />
                            </div>
                            <h3 className="text-[24px] font-bold text-gray-900 mb-2 tracking-tight">Set SLA Date</h3>
                            <p className="text-[14px] text-gray-500 mb-8 font-medium">Please select the closure date</p>

                            <div className="w-full mb-8 group">
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-left px-1">Select Date</label>
                                <input
                                    type="date"
                                    value={tempDate}
                                    onChange={(e) => setTempDate(e.target.value)}
                                    className="w-full h-[56px] border border-gray-100 bg-gray-50/50 rounded-2xl px-6 text-[16px] font-bold text-gray-900 outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 focus:bg-white transition-all"
                                />
                            </div>

                            <button
                                onClick={handleSaveDate}
                                className="w-full h-[56px] bg-[#0F172A] text-white font-bold rounded-2xl text-[15px] shadow-[0_8px_32px_rgba(15,23,42,0.2)] hover:bg-[#1E293B] hover:-translate-y-0.5 transition-all active:scale-95"
                            >
                                Confirm Date
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Set Start Date Modal */}
            {showStartDateModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0F172A]/20 backdrop-blur-[6px] animate-in fade-in duration-500">
                    <div className="bg-white rounded-[32px] w-full max-w-[400px] shadow-[0_32px_128px_-12px_rgba(15,23,42,0.25)] border border-gray-100/50 p-10 animate-in zoom-in-95 duration-300 relative">
                        <button onClick={() => setShowStartDateModal(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all">
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6">
                                <Calendar size={32} />
                            </div>
                            <h3 className="text-[24px] font-bold text-gray-900 mb-2 tracking-tight">Set SLA Start Date</h3>
                            <p className="text-[14px] text-gray-500 mb-8 font-medium">Please select the start date</p>

                            <div className="w-full mb-8 group">
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-left px-1">Select Date</label>
                                <input
                                    type="date"
                                    value={tempStartDate}
                                    onChange={(e) => setTempStartDate(e.target.value)}
                                    className="w-full h-[56px] border border-gray-100 bg-gray-50/50 rounded-2xl px-6 text-[16px] font-bold text-gray-900 outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 focus:bg-white transition-all"
                                />
                            </div>

                            <button
                                onClick={handleSaveStartDate}
                                className="w-full h-[56px] bg-[#0F172A] text-white font-bold rounded-2xl text-[15px] shadow-[0_8px_32px_rgba(15,23,42,0.2)] hover:bg-[#1E293B] hover:-translate-y-0.5 transition-all active:scale-95"
                            >
                                Confirm Date
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
