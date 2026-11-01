import React, { useState, useEffect } from 'react';
import { 
    ChevronUp, 
    ChevronDown, 
    Ticket as TicketIcon, 
    X, 
    Send, 
    Trash2, 
    CheckCircle, 
    Plus, 
    Calendar, 
    Clock, 
    AlertTriangle, 
    Loader2,
    Copy,
    Check
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { nowDateIST, nowTimeIST, formatDateWithTZ, formatTimeWithTZ } from '../../utils/dateUtils';
import { getAuthHeaders, API_URL_SLA } from '../../types/sla';
import { toast } from 'react-hot-toast';
import { clientService } from '../../services/clientService';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config';

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
        ticketType?: string;
        vendor?: { id?: string; name?: string; emails?: string[] };
        client?: { id?: string; name?: string; emails?: string[] };
    };
    priority?: string;
    circuit?: string;
    status?: string;
    closedAt?: string;
    activeTab?: string;
    vendorEmail?: string;
    vendorName?: string;
    onTimeZoneChangeActive?: (zone: string) => void;
    onPriorityChange?: (newPriority: string) => void;
    isUpdatingPriority?: boolean;
    onStatusChange?: (newStatus: string) => void;
    isUpdatingStatus?: boolean;
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

export const TicketInfoSidebar: React.FC<TicketInfoSidebarProps> = ({
    ticket,
    priority,
    circuit,
    status,
    closedAt,
    activeTab,
    vendorEmail,
    vendorName,
    onTimeZoneChangeActive,
    onPriorityChange,
    isUpdatingPriority = false,
    onStatusChange,
    isUpdatingStatus = false
}) => {
    const { id } = useParams();
    const { canDelete } = useAuth();
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

    const [isSlaCollapsed, setIsSlaCollapsed] = useState(false);
    const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = (text: string, label: string) => {
        if (!text || text === '-' || text === 'None') return;
        navigator.clipboard.writeText(text);
        setCopiedField(label);
        toast.success(`${label} copied to clipboard`);
        setTimeout(() => {
            setCopiedField(null);
        }, 2000);
    };

    const [slaId, setSlaId] = useState('');
    const [slaCloseDate, setSlaCloseDate] = useState('');
    const [slaCloseTime, setSlaCloseTime] = useState('');
    const [slaCompensation, setSlaCompensation] = useState('-');
    const [slaStatus, setSlaStatus] = useState('Safe');
    const [slaStartDate, setSlaStartDate] = useState('');
    const [slaStartTime, setSlaStartTime] = useState('');
    const [slaTimeZone, setSlaTimeZone] = useState('UTC');
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
                const API_URL = `${API_BASE_URL}/api/tickets`;

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
                const API_URL = `${API_BASE_URL}/api/circuits`;
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
        const targetId = slaId || ticket.id;
        try {
            const targetType = activeTab?.startsWith('vendor') ? 'VENDOR' : 'CLIENT';
            const response = await fetch(`${API_URL_SLA}/${targetId}/manual-update`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ticketId: ticket.id,
                    type: targetType,
                    timeZone: slaTimeZone,
                    ...payload
                })
            });
            if (!response.ok) throw new Error('API failed');
            const resData = await response.json();
            if (resData.success && resData.data) {
                const rec = resData.data;
                setSlaId(rec.id);
                setSlaStartDate(rec.startDate || '');
                setSlaStartTime(rec.startTime || '');
                setSlaCloseDate(rec.closeDate || '');
                setSlaCloseTime(rec.closedTime || '');
                setSlaCompensation(rec.compensation || '-');
                setSlaStatus(rec.status || 'Safe');
                if (rec.timeZone) {
                    setSlaTimeZone(rec.timeZone);
                    if (onTimeZoneChangeActive) onTimeZoneChangeActive(rec.timeZone);
                }
            }
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
            // Proactive safeguard: validate closure is not earlier than start
            if (slaStartDate && slaStartTime && slaStartTime !== '-') {
                const cleanStart = slaStartTime.replace(' hrs', '').trim();
                const startObj = new Date(`${slaStartDate} ${cleanStart} GMT+0530`);
                if (!isNaN(startObj.getTime()) && dateObj.getTime() < startObj.getTime()) {
                    toast.error(`⚠️ Invalid Close Date: Closure cannot be earlier than SLA start time (${slaStartDate} ${slaStartTime})`, { duration: 5000 });
                    return;
                }
            }

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
            // Proactive safeguard: validate closure is not earlier than start
            if (slaStartDate && slaStartTime && slaStartTime !== '-') {
                const cleanStart = slaStartTime.replace(' hrs', '').trim();
                const startObj = new Date(`${slaStartDate} ${cleanStart} GMT+0530`);
                if (!isNaN(startObj.getTime()) && dateObj.getTime() < startObj.getTime()) {
                    toast.error(`⚠️ Invalid Close Time: Closure cannot be earlier than SLA start time (${slaStartDate} ${slaStartTime})`, { duration: 5000 });
                    return;
                }
            }

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
            // Proactive safeguard: validate start is not later than close
            if (slaCloseDate && slaCloseTime && slaCloseTime !== '-' && slaCloseDate !== '-') {
                const cleanClose = slaCloseTime.replace(' hrs', '').trim();
                const closeObj = new Date(`${slaCloseDate} ${cleanClose} GMT+0530`);
                if (!isNaN(closeObj.getTime()) && dateObj.getTime() > closeObj.getTime()) {
                    toast.error(`⚠️ Invalid Start Date: Start time cannot be later than SLA closure time (${slaCloseDate} ${slaCloseTime})`, { duration: 5000 });
                    return;
                }
            }

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
            // Proactive safeguard: validate start is not later than close
            if (slaCloseDate && slaCloseTime && slaCloseTime !== '-' && slaCloseDate !== '-') {
                const cleanClose = slaCloseTime.replace(' hrs', '').trim();
                const closeObj = new Date(`${slaCloseDate} ${cleanClose} GMT+0530`);
                if (!isNaN(closeObj.getTime()) && dateObj.getTime() > closeObj.getTime()) {
                    toast.error(`⚠️ Invalid Start Time: Start time cannot be later than SLA closure time (${slaCloseDate} ${slaCloseTime})`, { duration: 5000 });
                    return;
                }
            }

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
            const API_URL = `${API_BASE_URL}/api/tickets`;
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
        <div className="w-full lg:w-[350px] border-t lg:border-t-0 border-l-0 lg:border-l border-slate-200/80 bg-white flex flex-col h-auto lg:h-full font-sans shrink-0 relative">
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* Customer / Vendor Profile Header */}
                <div className="p-5 border-b border-slate-100 bg-white">
                    <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300/70 flex items-center justify-center text-slate-700 font-bold text-sm shadow-2xs flex-shrink-0 mt-0.5">
                            {activeTab?.startsWith('vendor') 
                                ? (vendorName ? vendorName.slice(0, 2).toUpperCase() : 'VN') 
                                : (clientName ? clientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : ticket.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2))
                            }
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <h3 className="text-[15.5px] font-bold text-slate-900 leading-snug break-words" title={
                                activeTab?.startsWith('vendor') ? (vendorName || 'EdgeStone Vendor') : (clientName || ticket.name)
                            }>
                                {activeTab?.startsWith('vendor') ? (vendorName || 'EdgeStone Vendor') : (clientName || ticket.name)}
                            </h3>
                            {(() => {
                                const emailStr = activeTab?.startsWith('vendor') 
                                    ? (vendorEmail || (ticket.vendor?.emails ? ticket.vendor.emails.join(', ') : (ticket.ticketType === 'Vendor' ? ticket.email : 'Fetching vendor...'))) 
                                    : (clientEmail || (ticket.client?.emails ? ticket.client.emails.join(', ') : ticket.email));
                                return (
                                    <div 
                                        className="flex items-center gap-1.5 mt-1 group/email cursor-pointer"
                                        onClick={() => handleCopy(emailStr, 'Email')}
                                        title="Click to copy email"
                                    >
                                        <p className="text-[12px] text-slate-500 font-medium truncate flex-1 hover:text-slate-800 transition-colors">
                                            {emailStr}
                                        </p>
                                        {copiedField === 'Email' ? (
                                            <Check size={13} className="text-emerald-600 flex-shrink-0" />
                                        ) : (
                                            <Copy size={13} className="text-slate-400 group-hover/email:text-slate-700 flex-shrink-0 opacity-0 group-hover/email:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Ticket Properties Inset Card */}
                <div className="p-4 border-b border-slate-100">
                    <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 space-y-3">
                        {/* Profile Type */}
                        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/50">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Profile</span>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-700 border border-slate-200/80 shadow-2xs">
                                {activeTab?.startsWith('vendor') ? 'Vendor' : 'Customer'}
                            </span>
                        </div>

                        {/* Created Date & Time */}
                        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/50">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Created</span>
                            <span className="text-slate-700 font-bold text-[12px]">
                                {formatDateWithTZ(ticket.createdAt || ticket.date || '', slaTimeZone, { day: 'numeric', month: 'short', year: 'numeric' })}
                                <span className="text-slate-400 font-normal mx-1">•</span>
                                {formatTimeWithTZ(ticket.receivedAt || ticket.createdAt || new Date(), slaTimeZone)} hrs
                            </span>
                        </div>

                        {/* Priority Dropdown */}
                        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/50">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Priority</span>
                            {onPriorityChange ? (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => !isUpdatingPriority && setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
                                        disabled={isUpdatingPriority}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                            priority === 'High'
                                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                                : priority === 'Low'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                                : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                                        } ${isUpdatingPriority ? 'opacity-70 cursor-wait' : ''}`}
                                        title="Click to change ticket priority"
                                    >
                                        <div className="flex items-end gap-[2px] h-3 w-3">
                                            {[1, 2, 3].map((bar) => {
                                                const active =
                                                    priority === 'High' ? true :
                                                    priority === 'Medium' ? bar <= 2 :
                                                    bar === 1;
                                                const barColor =
                                                    priority === 'High' ? 'bg-red-500' :
                                                    priority === 'Medium' ? 'bg-amber-500' :
                                                    'bg-emerald-500';
                                                return (
                                                    <div
                                                        key={bar}
                                                        className={`w-0.5 rounded-full transition-all ${active ? barColor : 'bg-gray-200'}`}
                                                        style={{ height: `${bar * 33.3}%` }}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <span>{priority || 'Medium'}</span>
                                        <ChevronDown size={12} className={`text-gray-400 transition-transform ${isPriorityDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isPriorityDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsPriorityDropdownOpen(false)} />
                                            <div className="absolute right-0 mt-1.5 w-36 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden p-1 animate-in fade-in slide-in-from-top-1">
                                                {(['High', 'Medium', 'Low'] as const).map((p) => (
                                                    <button
                                                        key={p}
                                                        type="button"
                                                        onClick={() => {
                                                            onPriorityChange(p);
                                                            setIsPriorityDropdownOpen(false);
                                                        }}
                                                        className={`w-full px-2.5 py-1.5 text-left text-xs font-bold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                                            priority === p
                                                                ? 'bg-gray-100 text-gray-900'
                                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                        }`}
                                                    >
                                                        <span className={
                                                            p === 'High' ? 'text-red-600' :
                                                            p === 'Medium' ? 'text-amber-600' :
                                                            'text-emerald-600'
                                                        }>{p}</span>
                                                        {priority === p && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <span className={`font-bold text-xs ${priority ? 'text-slate-900' : 'text-slate-600'}`}>
                                    {priority || '-'}
                                </span>
                            )}
                        </div>

                        {/* Status Dropdown */}
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Status</span>
                            {onStatusChange ? (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => !isUpdatingStatus && setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                        disabled={isUpdatingStatus}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                            (status || ticket.status || 'In Progress').toLowerCase() === 'closed'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                                : (status || ticket.status || 'In Progress').toLowerCase() === 'maintenance'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                                    : (status || ticket.status || 'In Progress').toLowerCase() === 'spam' || (status || ticket.status || 'In Progress').toLowerCase() === 'others'
                                                        ? 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                                        : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                                        } ${isUpdatingStatus ? 'opacity-70 cursor-wait' : ''}`}
                                        title="Click to change ticket status / maintenance mode"
                                    >
                                        {isUpdatingStatus ? (
                                            <>
                                                <Loader2 size={12} className="animate-spin text-gray-500" />
                                                <span>Updating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{status || ticket.status || 'In Progress'}</span>
                                                <ChevronDown size={12} className={`text-gray-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                                            </>
                                        )}
                                    </button>

                                    {isStatusDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)} />
                                            <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden p-1.5 animate-in fade-in slide-in-from-top-1">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2.5 py-1 border-b border-gray-50 mb-1">
                                                    Change Status
                                                </div>
                                                {(status || ticket.status || 'In Progress').toLowerCase() !== 'closed' && (status || ticket.status || 'In Progress').toLowerCase() !== 'spam' && (status || ticket.status || 'In Progress').toLowerCase() !== 'others' && (status || ticket.status || 'In Progress').toLowerCase() !== 'maintenance' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onStatusChange('Closed');
                                                            setIsStatusDropdownOpen(false);
                                                        }}
                                                        className="w-full px-2.5 py-2 text-left text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                                                    >
                                                        <span>Close Ticket</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onStatusChange('In Progress');
                                                            setIsStatusDropdownOpen(false);
                                                        }}
                                                        className="w-full px-2.5 py-2 text-left text-xs font-bold text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                                                    >
                                                        <span>Re-Open Ticket as Support</span>
                                                    </button>
                                                )}
                                                {(status || ticket.status || 'In Progress').toLowerCase() !== 'maintenance' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onStatusChange('Maintenance');
                                                            setIsStatusDropdownOpen(false);
                                                        }}
                                                        className="w-full px-2.5 py-2 text-left text-xs font-bold text-purple-700 hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                                                    >
                                                        <span>Mark as Maintenance</span>
                                                    </button>
                                                )}
                                                {(status || ticket.status || 'In Progress').toLowerCase() !== 'spam' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onStatusChange('Spam');
                                                            setIsStatusDropdownOpen(false);
                                                        }}
                                                        className="w-full px-2.5 py-2 text-left text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                                                    >
                                                        <span>Mark as Spam</span>
                                                    </button>
                                                )}
                                                {(status || ticket.status || 'In Progress').toLowerCase() !== 'others' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onStatusChange('Others');
                                                            setIsStatusDropdownOpen(false);
                                                        }}
                                                        className="w-full px-2.5 py-2 text-left text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                                                    >
                                                        <span>Mark as Others</span>
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <span className="font-bold text-xs text-slate-700">
                                    {status || ticket.status || 'In Progress'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* SLA Calculator Collapsible Section */}
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            type="button"
                            onClick={() => setIsSlaCollapsed(!isSlaCollapsed)}
                            className="flex items-center gap-2 text-left group/slatoggle cursor-pointer select-none"
                        >
                            <ChevronDown 
                                size={16} 
                                className={`text-slate-400 group-hover/slatoggle:text-slate-700 transition-transform duration-200 ${isSlaCollapsed ? '-rotate-90' : 'rotate-0'}`} 
                            />
                            <div>
                                <h4 className="text-[13.5px] font-bold text-slate-900 tracking-tight group-hover/slatoggle:text-slate-700">
                                    SLA Calculator
                                </h4>
                                {isVendorTicket && (
                                    <p className="text-[10px] text-slate-400 font-medium">Disabled for Vendor tickets</p>
                                )}
                            </div>
                        </button>

                        <div className="flex items-center gap-2">
                            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                                {isVendorTicket ? 'Disabled' : (isSlaActive ? 'SLA ON' : 'SLA OFF')}
                            </span>
                            <button
                                onClick={handleSlaToggle}
                                disabled={isVendorTicket}
                                title={isVendorTicket ? 'SLA is disabled for Vendor (#V) tickets' : ''}
                                className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                                    isVendorTicket 
                                        ? 'bg-slate-200 cursor-not-allowed opacity-60' 
                                        : (isSlaActive ? 'bg-orange-500' : 'bg-slate-200')
                                }`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                                    !isVendorTicket && isSlaActive ? 'translate-x-4' : 'translate-x-0'
                                }`} />
                            </button>
                        </div>
                    </div>

                    {!isSlaCollapsed && (
                        <div className={`space-y-3.5 pt-1 animate-in fade-in duration-200 ${(!isSlaActive || isVendorTicket) ? 'opacity-50 pointer-events-none' : ''}`}>
                            {/* Circuit & Supplier Monospace Chips */}
                            <div className="space-y-2">
                                {/* Circuit ID */}
                                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between group/circ hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-col min-w-0 pr-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Circuit ID</span>
                                        <span className="font-mono text-[12.5px] font-bold text-slate-800 truncate select-all">
                                            {activeTab?.startsWith('vendor')
                                                ? (fullCircuitDetails?.supplierCircuitId || circuit || ticket.circuitId || 'None')
                                                : (fullCircuitDetails?.customerCircuitId || circuit || ticket.circuitId || 'None')
                                            }
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(
                                            activeTab?.startsWith('vendor')
                                                ? (fullCircuitDetails?.supplierCircuitId || circuit || ticket.circuitId || '')
                                                : (fullCircuitDetails?.customerCircuitId || circuit || ticket.circuitId || ''),
                                            'Circuit ID'
                                        )}
                                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all flex-shrink-0 cursor-pointer"
                                        title="Copy Circuit ID"
                                    >
                                        {copiedField === 'Circuit ID' ? (
                                            <Check size={14} className="text-emerald-600" />
                                        ) : (
                                            <Copy size={14} />
                                        )}
                                    </button>
                                </div>

                                {/* Supplier ID */}
                                {!activeTab?.startsWith('vendor') && (
                                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between group/supp hover:bg-slate-50 transition-colors">
                                        <div className="flex flex-col min-w-0 pr-2">
                                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Supplier ID</span>
                                            <span className="font-mono text-[12.5px] font-bold text-slate-800 truncate select-all">
                                                {fullCircuitDetails?.supplierCircuitId || 'None'}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(fullCircuitDetails?.supplierCircuitId || '', 'Supplier ID')}
                                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all flex-shrink-0 cursor-pointer"
                                            title="Copy Supplier ID"
                                        >
                                            {copiedField === 'Supplier ID' ? (
                                                <Check size={14} className="text-emerald-600" />
                                            ) : (
                                                <Copy size={14} />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* SLA Timestamps Box */}
                            <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3 space-y-2.5 text-xs">
                                {/* Start Time */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-500 font-medium">SLA start time</span>
                                        <button
                                            onClick={() => { setTempStartTime(dynamicSlaStart.time !== '-' ? dynamicSlaStart.time.replace(' hrs', '') : ''); setShowStartTimeModal(true); }}
                                            className="p-1 hover:bg-orange-50 rounded-md text-orange-500 hover:text-orange-600 transition-all border border-slate-200/80 hover:border-orange-200 bg-white shadow-2xs"
                                            title="Edit start time"
                                        >
                                            <Plus size={11} strokeWidth={2.6} />
                                        </button>
                                    </div>
                                    <span className={`font-mono text-[12px] font-bold ${slaStartTime ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {dynamicSlaStart.time !== '-' ? dynamicSlaStart.time : '-'}
                                    </span>
                                </div>

                                {/* Start Date */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-500 font-medium">SLA start date</span>
                                        <button
                                            onClick={() => { setTempStartDate(dynamicSlaStart.date !== '-' ? dynamicSlaStart.date : ''); setShowStartDateModal(true); }}
                                            className="p-1 hover:bg-orange-50 rounded-md text-orange-500 hover:text-orange-600 transition-all border border-slate-200/80 hover:border-orange-200 bg-white shadow-2xs"
                                            title="Edit start date"
                                        >
                                            <Plus size={11} strokeWidth={2.6} />
                                        </button>
                                    </div>
                                    <span className={`text-[12px] font-bold ${slaStartDate ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {dynamicSlaStart.date !== '-' ? dynamicSlaStart.date : '-'}
                                    </span>
                                </div>

                                {/* Close Time */}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-500 font-medium">SLA close at</span>
                                        <button
                                            onClick={() => { setTempTime(dynamicSlaClose.time !== '-' ? dynamicSlaClose.time.replace(' hrs', '') : ''); setShowTimeModal(true); }}
                                            className="p-1 hover:bg-orange-50 rounded-md text-orange-500 hover:text-orange-600 transition-all border border-slate-200/80 hover:border-orange-200 bg-white shadow-2xs"
                                            title="Edit close time"
                                        >
                                            <Plus size={11} strokeWidth={2.6} />
                                        </button>
                                    </div>
                                    <span className={`font-mono text-[12px] font-bold ${slaCloseTime ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {dynamicSlaClose.time !== '-' ? dynamicSlaClose.time : '-'}
                                    </span>
                                </div>

                                {/* Close Date */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-500 font-medium">SLA close date</span>
                                        <button
                                            onClick={() => { setTempDate(dynamicSlaClose.date !== '-' ? dynamicSlaClose.date : ''); setShowDateModal(true); }}
                                            className="p-1 hover:bg-orange-50 rounded-md text-orange-500 hover:text-orange-600 transition-all border border-slate-200/80 hover:border-orange-200 bg-white shadow-2xs"
                                            title="Edit close date"
                                        >
                                            <Plus size={11} strokeWidth={2.6} />
                                        </button>
                                    </div>
                                    <span className={`text-[12px] font-bold ${slaCloseDate ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {dynamicSlaClose.date !== '-' ? dynamicSlaClose.date : '-'}
                                    </span>
                                </div>

                                {/* Timezone */}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                                    <span className="text-slate-500 font-medium">Time Zone</span>
                                    <select
                                        value={slaTimeZone}
                                        onChange={(e) => handleSaveTimeZone(e.target.value)}
                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none text-[11.5px] font-bold text-slate-700 shadow-2xs cursor-pointer hover:border-slate-300"
                                    >
                                        <option value="UTC">UTC</option>
                                        <option value="GMT">GMT</option>
                                        <option value="IST">IST</option>
                                    </select>
                                </div>
                            </div>

                            {/* SLA Status & Compensation */}
                            <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3 space-y-2 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">SLA Status</span>
                                    <span className={`text-[12px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                        slaStatus === 'Breached' || slaStatus === 'BREACHED'
                                            ? 'bg-red-50 text-red-600 border border-red-200'
                                            : slaStatus === 'No SLA'
                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                    }`}>
                                        {slaStatus === 'No SLA' ? 'No SLA Set' : slaStatus}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">Compensation</span>
                                    <span className={`text-[13px] font-black ${
                                        slaCompensation !== '-' ? 'text-red-600' : 'text-emerald-600'
                                    }`}>
                                        {slaCompensation}
                                    </span>
                                </div>
                                {slaStatus === 'No SLA' && (
                                    <div className="p-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-amber-800 text-[11px] flex items-start gap-2 mt-2 shadow-2xs">
                                        <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-amber-900">⚠️ No SLA Rules Configured</p>
                                            <p className="text-[10.5px] text-amber-700 mt-0.5 leading-relaxed">
                                                This circuit has no active SLA rules. Go to <strong>Dashboard &gt; SLA</strong> to define rules.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Activity Log Collapsible Section */}
                <div className="p-4 border-b border-slate-100">
                    <button
                        type="button"
                        onClick={() => setIsActivityCollapsed(!isActivityCollapsed)}
                        className="flex items-center justify-between w-full group/act cursor-pointer select-none mb-2"
                    >
                        <div className="flex items-center gap-2">
                            <ChevronDown 
                                size={16} 
                                className={`text-slate-400 group-hover/act:text-slate-700 transition-transform duration-200 ${isActivityCollapsed ? '-rotate-90' : 'rotate-0'}`} 
                            />
                            <h4 className="text-[13.5px] font-bold text-slate-900 tracking-tight group-hover/act:text-slate-700">
                                Activity Log
                            </h4>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {activityLogs.length + (status?.toLowerCase() === 'closed' ? 1 : 0)}
                        </span>
                    </button>

                    {!isActivityCollapsed && (
                        <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                            {status?.toLowerCase() === 'closed' && (
                                <div className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
                                        <CheckCircle size={15} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="space-y-0.5">
                                            <span className="text-[12.5px] font-bold text-slate-900 block">Ticket closed</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10.5px] font-bold text-slate-400 uppercase">
                                                    {closedAt ? closedAt.split(' • ')[0] : 'Pending'}
                                                </span>
                                                {closedAt && <div className="w-1 h-1 rounded-full bg-slate-300" />}
                                                <span className="text-[10.5px] font-bold text-slate-400 uppercase">
                                                    {closedAt ? closedAt.split(' • ')[1] : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-emerald-600 font-semibold mt-1">Ticket resolution confirmed</p>
                                    </div>
                                </div>
                            )}

                            {/* Activity Logs from Backend */}
                            {activityLogs.length > 0 ? (
                                activityLogs.slice().reverse().map((log) => (
                                    <div key={log.id} className="flex gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                            log.action === 'created' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                                            log.action === 'auto_replied' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                                            log.action === 'replied' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                            'bg-slate-50 text-slate-600 border border-slate-200'
                                        }`}>
                                            <TicketIcon size={14} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="space-y-0.5">
                                                <span className="text-[12.5px] font-bold text-slate-800 block leading-snug">{log.description}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-tight">
                                                        {log.createdAt ? formatDateWithTZ(log.createdAt, slaTimeZone) : log.date}
                                                    </span>
                                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-tight">
                                                        {log.createdAt ? formatTimeWithTZ(log.createdAt, slaTimeZone) : log.time} hrs
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium mt-1">By <span className="font-semibold text-slate-700">{log.author}</span></p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 flex-shrink-0 mt-0.5">
                                        <TicketIcon size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="space-y-0.5">
                                            <span className="text-[12.5px] font-bold text-slate-900 block">Ticket opened</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-tight">
                                                    {formatDateWithTZ(ticket.createdAt || ticket.date || '', slaTimeZone)}
                                                </span>
                                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-tight">
                                                    {formatTimeWithTZ(ticket.receivedAt || ticket.createdAt || new Date(), slaTimeZone)} hrs
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-purple-600 font-medium mt-1">Ticket #{ticket.ticketId} created</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Notes Footer */}
            <div className="p-4 relative">
                {/* Notes Container */}
                {isNotesOpen && (
                    <div className="absolute bottom-full left-4 right-4 mb-2.5 bg-white border border-slate-200 rounded-2xl shadow-[0_12px_40px_rgba(15,23,42,0.15)] overflow-hidden flex flex-col z-50 animate-in slide-in-from-bottom-2 duration-200">
                        {/* Header */}
                        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-2">
                                <h5 className="text-[13px] font-bold text-slate-900">Internal Notes</h5>
                                {notes.length > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                                        {notes.length}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setIsNotesOpen(false)}
                                className="p-1 hover:bg-slate-200/60 rounded-lg transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                                aria-label="Close notes"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="max-h-[220px] overflow-y-auto p-3.5 space-y-2.5 bg-slate-50/30">
                            {notes.length > 0 ? (
                                notes.map((note, i) => (
                                    <div key={i} className="group relative">
                                        <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs hover:border-slate-300 transition-colors">
                                            <p className="text-[12px] text-slate-700 font-medium leading-relaxed break-words whitespace-pre-wrap pr-4">{note.text}</p>
                                            <div className="mt-1.5 flex justify-between items-center">
                                                {canDelete() && (
                                                    <button
                                                        onClick={() => handleDeleteNote(i)}
                                                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                        title="Delete note"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <span className="text-[10px] font-bold text-slate-600">{note.author || 'Agent'}</span>
                                                    <span className="text-[10px] font-medium text-slate-400">{note.time}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-6 flex flex-col items-center justify-center text-center opacity-50">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mb-1.5">
                                        <TicketIcon size={14} className="text-slate-400" />
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">No notes yet</p>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-slate-100">
                            <div className="relative group">
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Add a private note (Press Enter to send)..."
                                    className="w-full min-h-[70px] p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all resize-none scrollbar-hide break-words"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddNote();
                                        }
                                    }}
                                />
                                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
                                    <button
                                        onClick={handleAddNote}
                                        disabled={!newNote.trim()}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer ${
                                            newNote.trim() 
                                                ? 'bg-slate-900 text-white hover:bg-slate-800 scale-100' 
                                                : 'bg-slate-100 text-slate-300 scale-95 cursor-not-allowed'
                                        }`}
                                    >
                                        <span className="text-[11px] font-bold">Add note</span>
                                        <Send size={11} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notes Trigger Button */}
                <button
                    onClick={() => setIsNotesOpen(!isNotesOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-[13px] hover:bg-slate-800 shadow-xs hover:shadow transition-all active:scale-[0.98] outline-none group cursor-pointer ${
                        isNotesOpen ? 'ring-2 ring-slate-900/20' : ''
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>Internal Notes</span>
                        {notes.length > 0 && (
                            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-brand-red text-white text-[10px] font-bold rounded-full shadow-2xs">
                                {notes.length}
                            </span>
                        )}
                    </div>
                    <ChevronUp size={15} className={`text-slate-400 transition-transform duration-300 ${isNotesOpen ? 'rotate-180' : ''}`} />
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

                            {(() => {
                                if (!tempTime || !slaStartDate || !slaStartTime || slaStartTime === '-') return null;
                                const offsets: Record<string, string> = { 'UTC': '+0000', 'GMT': '+0000', 'IST': '+0530' };
                                const offset = offsets[slaTimeZone] || '+0000';
                                let datePart = dynamicSlaClose.date;
                                if (datePart === '-') {
                                    const now = new Date();
                                    datePart = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                }
                                const candidateObj = new Date(`${datePart} ${tempTime} GMT${offset}`);
                                const cleanStart = slaStartTime.replace(' hrs', '').trim();
                                const startObj = new Date(`${slaStartDate} ${cleanStart} GMT+0530`);
                                if (!isNaN(candidateObj.getTime()) && !isNaN(startObj.getTime()) && candidateObj.getTime() < startObj.getTime()) {
                                    return (
                                        <div className="w-full mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs text-left flex items-start gap-2 animate-in fade-in duration-200">
                                            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                            <span><strong>Warning:</strong> Selected time is earlier than SLA start time ({slaStartDate} {slaStartTime}).</span>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

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

                            {(() => {
                                if (!tempStartTime || !slaCloseDate || !slaCloseTime || slaCloseDate === '-' || slaCloseTime === '-') return null;
                                const offsets: Record<string, string> = { 'UTC': '+0000', 'GMT': '+0000', 'IST': '+0530' };
                                const offset = offsets[slaTimeZone] || '+0000';
                                let datePart = dynamicSlaStart.date;
                                if (datePart === '-') {
                                    const now = new Date();
                                    datePart = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                }
                                const candidateObj = new Date(`${datePart} ${tempStartTime} GMT${offset}`);
                                const cleanClose = slaCloseTime.replace(' hrs', '').trim();
                                const closeObj = new Date(`${slaCloseDate} ${cleanClose} GMT+0530`);
                                if (!isNaN(candidateObj.getTime()) && !isNaN(closeObj.getTime()) && candidateObj.getTime() > closeObj.getTime()) {
                                    return (
                                        <div className="w-full mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs text-left flex items-start gap-2 animate-in fade-in duration-200">
                                            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                            <span><strong>Warning:</strong> Selected start time is later than SLA closure time ({slaCloseDate} {slaCloseTime}).</span>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

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

                            {(() => {
                                if (!tempDate || !slaStartDate || !slaStartTime || slaStartTime === '-') return null;
                                const offsets: Record<string, string> = { 'UTC': '+0000', 'GMT': '+0000', 'IST': '+0530' };
                                const offset = offsets[slaTimeZone] || '+0000';
                                const timePart = dynamicSlaClose.time !== '-' ? dynamicSlaClose.time.replace(' hrs', '') : '00:00';
                                const candidateObj = new Date(`${tempDate} ${timePart} GMT${offset}`);
                                const cleanStart = slaStartTime.replace(' hrs', '').trim();
                                const startObj = new Date(`${slaStartDate} ${cleanStart} GMT+0530`);
                                if (!isNaN(candidateObj.getTime()) && !isNaN(startObj.getTime()) && candidateObj.getTime() < startObj.getTime()) {
                                    return (
                                        <div className="w-full mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs text-left flex items-start gap-2 animate-in fade-in duration-200">
                                            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                            <span><strong>Warning:</strong> Selected closure date is earlier than SLA start date ({slaStartDate}).</span>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

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

                            {(() => {
                                if (!tempStartDate || !slaCloseDate || !slaCloseTime || slaCloseDate === '-' || slaCloseTime === '-') return null;
                                const offsets: Record<string, string> = { 'UTC': '+0000', 'GMT': '+0000', 'IST': '+0530' };
                                const offset = offsets[slaTimeZone] || '+0000';
                                const timePart = dynamicSlaStart.time !== '-' ? dynamicSlaStart.time.replace(' hrs', '') : '00:00';
                                const candidateObj = new Date(`${tempStartDate} ${timePart} GMT${offset}`);
                                const cleanClose = slaCloseTime.replace(' hrs', '').trim();
                                const closeObj = new Date(`${slaCloseDate} ${cleanClose} GMT+0530`);
                                if (!isNaN(candidateObj.getTime()) && !isNaN(closeObj.getTime()) && candidateObj.getTime() > closeObj.getTime()) {
                                    return (
                                        <div className="w-full mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs text-left flex items-start gap-2 animate-in fade-in duration-200">
                                            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                            <span><strong>Warning:</strong> Selected start date is later than SLA closure date ({slaCloseDate}).</span>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

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
