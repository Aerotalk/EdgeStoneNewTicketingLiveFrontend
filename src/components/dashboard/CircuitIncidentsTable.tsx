import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    Search,
    ExternalLink,
    Building2,
    Network,
    RefreshCw
} from 'lucide-react';
import type {
    CircuitIncidentItem,
    DailyIncidentSummary,
    IncidentStatusType
} from '../../services/dashboardService';

interface CircuitIncidentsTableProps {
    circuits: CircuitIncidentItem[];
    summary: DailyIncidentSummary;
    selectedDate: string;
    displayDate: string;
    loading: boolean;
    onRefresh: () => void;
}

export const CircuitIncidentsTable: React.FC<CircuitIncidentsTableProps> = ({
    circuits,
    summary,
    displayDate,
    loading,
    onRefresh
}) => {
    const navigate = useNavigate();
    const { id: routeUserId } = useParams<{ id: string }>();

    const [statusFilter, setStatusFilter] = useState<'ALL' | IncidentStatusType>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Client-side filtering
    const filteredCircuits = useMemo(() => {
        return circuits.filter((c) => {
            // Status match
            if (statusFilter !== 'ALL') {
                if (statusFilter === 'NEW_INCIDENT') {
                    if (c.incidentStatus !== 'NEW_INCIDENT' && c.incidentStatus !== 'NEW_AND_ONGOING') {
                        return false;
                    }
                } else if (statusFilter === 'ONGOING_INCIDENT') {
                    if (c.incidentStatus !== 'ONGOING_INCIDENT' && c.incidentStatus !== 'NEW_AND_ONGOING') {
                        return false;
                    }
                } else if (statusFilter === 'RESOLVED_TODAY') {
                    if (c.incidentStatus !== 'RESOLVED_TODAY') {
                        return false;
                    }
                }
            }

            // Search query match
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const custMatch = c.customerCircuitId && c.customerCircuitId.toLowerCase().includes(q);
                const suppMatch = c.supplierCircuitId && c.supplierCircuitId.toLowerCase().includes(q);
                const clientMatch = c.clientName && c.clientName.toLowerCase().includes(q);
                const vendorMatch = c.vendorName && c.vendorName.toLowerCase().includes(q);
                const ticketMatch = c.tickets && c.tickets.some(t =>
                    t.ticketId.toLowerCase().includes(q) || t.header.toLowerCase().includes(q)
                );
                return custMatch || suppMatch || clientMatch || vendorMatch || ticketMatch;
            }

            return true;
        });
    }, [circuits, statusFilter, searchQuery]);

    const handleNavigateToTicket = (ticketId: string) => {
        const userId = routeUserId || 'default';
        navigate(`/dashboard/${userId}/tickets?search=${encodeURIComponent(ticketId)}`);
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300">
            {/* Table Header & Controls Bar */}
            <div className="p-5 sm:p-7 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-brand-red">
                            <Activity size={18} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-gray-800 tracking-tight">
                            Daily Circuit Incidents Overview
                        </h2>
                    </div>
                    <p className="text-gray-400 text-xs sm:text-sm font-medium mt-1">
                        Circuit-level impact breakdown for <span className="font-bold text-gray-700">{displayDate}</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative min-w-[240px] flex-1 sm:flex-none">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search circuit, client, ticket #..."
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
                        />
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={onRefresh}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                        title="Refresh Daily Incidents"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin text-brand-red' : ''} />
                    </button>
                </div>
            </div>

            {/* Filter Pills Bar */}
            <div className="px-5 sm:px-7 py-3 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-gray-400 text-[11px] uppercase tracking-wider mr-1">
                    Incident Filter:
                </span>

                <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                        statusFilter === 'ALL'
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                >
                    All Impacted ({summary.totalImpactedCircuits})
                </button>

                <button
                    onClick={() => setStatusFilter('NEW_INCIDENT')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                        statusFilter === 'NEW_INCIDENT'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                    }`}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    New Incidents ({summary.newIncidentsCount})
                </button>

                <button
                    onClick={() => setStatusFilter('ONGOING_INCIDENT')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                        statusFilter === 'ONGOING_INCIDENT'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                    }`}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Ongoing Incidents ({summary.ongoingIncidentsCount})
                </button>

                <button
                    onClick={() => setStatusFilter('RESOLVED_TODAY')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                        statusFilter === 'RESOLVED_TODAY'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                    }`}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Resolved Today ({summary.resolvedTodayCount})
                </button>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-white">
                            <th className="py-3.5 px-5 sm:px-7">Circuit Identification</th>
                            <th className="py-3.5 px-4">Client & Vendor</th>
                            <th className="py-3.5 px-4">Daily Incident Status</th>
                            <th className="py-3.5 px-4">Associated Tickets</th>
                            <th className="py-3.5 px-4">Primary Issue Summary</th>
                            <th className="py-3.5 px-5 sm:px-7 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs font-medium">
                        {loading && circuits.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                                        <span className="text-xs font-semibold">Aggregating daily circuit incidents...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredCircuits.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <CheckCircle2 size={36} className="text-emerald-400" />
                                        <p className="font-bold text-sm text-gray-700">No matching circuit incidents found</p>
                                        <p className="text-xs text-gray-400">
                                            {searchQuery
                                                ? 'No circuits matched your search filter.'
                                                : `All circuits operated smoothly on ${displayDate}.`}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredCircuits.map((item) => {
                                const isNew = item.incidentStatus === 'NEW_INCIDENT';
                                const isOngoing = item.incidentStatus === 'ONGOING_INCIDENT';
                                const isNewAndOngoing = item.incidentStatus === 'NEW_AND_ONGOING';
                                const isResolved = item.incidentStatus === 'RESOLVED_TODAY';

                                const primaryTicket = item.tickets[0];

                                return (
                                    <tr
                                        key={item.circuitId}
                                        className="hover:bg-gray-50/80 transition-colors group"
                                    >
                                        {/* Circuit Identification */}
                                        <td className="py-4 px-5 sm:px-7">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800 font-mono text-sm tracking-tight group-hover:text-brand-red transition-colors">
                                                        {item.customerCircuitId}
                                                    </span>
                                                    <span
                                                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                                                            item.circuitType === 'PROTECTED'
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                                        }`}
                                                    >
                                                        {item.circuitType}
                                                    </span>
                                                </div>

                                                {item.supplierCircuitId && (
                                                    <div className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
                                                        <Network size={11} className="text-gray-400" />
                                                        <span>Supp: {item.supplierCircuitId}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Client & Vendor */}
                                        <td className="py-4 px-4">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5 text-gray-800 font-bold">
                                                    <Building2 size={13} className="text-gray-400" />
                                                    <span>{item.clientName}</span>
                                                </div>
                                                <span className="text-[11px] text-gray-400 font-medium">
                                                    Vendor: {item.vendorName}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Daily Incident Status */}
                                        <td className="py-4 px-4">
                                            {isNew && (
                                                <div className="flex flex-col gap-1">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 w-max shadow-sm shadow-rose-500/5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                        New Incident Reported
                                                    </span>
                                                    <span className="text-[10px] text-rose-600/80 font-semibold pl-1">
                                                        Ticket logged today
                                                    </span>
                                                </div>
                                            )}

                                            {isOngoing && (
                                                <div className="flex flex-col gap-1">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80 w-max">
                                                        <Clock size={12} className="text-amber-600" />
                                                        No New Incident Reported – Ongoing Incident
                                                    </span>
                                                    <span className="text-[10px] text-amber-700 font-semibold pl-1">
                                                        Active for {item.agingDays} day{item.agingDays > 1 ? 's' : ''} (since {item.firstReportedDate})
                                                    </span>
                                                </div>
                                            )}

                                            {isNewAndOngoing && (
                                                <div className="flex flex-col gap-1">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200/80 w-max">
                                                        <AlertCircle size={12} className="text-purple-600" />
                                                        New Incident & Ongoing Issue
                                                    </span>
                                                    <span className="text-[10px] text-purple-700 font-semibold pl-1">
                                                        {item.newTicketsCount} new today, {item.ongoingTicketsCount} older
                                                    </span>
                                                </div>
                                            )}

                                            {isResolved && (
                                                <div className="flex flex-col gap-1">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 w-max">
                                                        <CheckCircle2 size={12} className="text-emerald-600" />
                                                        Resolved Today
                                                    </span>
                                                    <span className="text-[10px] text-emerald-700 font-semibold pl-1">
                                                        Incident cleared
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Associated Tickets */}
                                        <td className="py-4 px-4">
                                            <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                                {item.tickets.map((t) => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => handleNavigateToTicket(t.ticketId)}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-all ${
                                                            t.isNewToday
                                                                ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                                                                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                                        }`}
                                                        title={`Click to open ${t.ticketId}: ${t.header}`}
                                                    >
                                                        <span>{t.ticketId}</span>
                                                        <ExternalLink size={10} className="opacity-60" />
                                                    </button>
                                                ))}
                                            </div>
                                        </td>

                                        {/* Primary Issue Summary */}
                                        <td className="py-4 px-4 max-w-[260px]">
                                            {primaryTicket ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                                                primaryTicket.priority === 'High'
                                                                    ? 'bg-red-100 text-red-800'
                                                                    : primaryTicket.priority === 'Medium'
                                                                    ? 'bg-yellow-100 text-yellow-800'
                                                                    : 'bg-green-100 text-green-800'
                                                            }`}
                                                        >
                                                            {primaryTicket.priority}
                                                        </span>
                                                        <span className="text-gray-400 text-[10px]">
                                                            {primaryTicket.status}
                                                        </span>
                                                    </div>
                                                    <p
                                                        className="text-xs text-gray-700 font-semibold truncate"
                                                        title={primaryTicket.header}
                                                    >
                                                        {primaryTicket.header}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">No active tickets</span>
                                            )}
                                        </td>

                                        {/* Action */}
                                        <td className="py-4 px-5 sm:px-7 text-right">
                                            {primaryTicket && (
                                                <button
                                                    onClick={() => handleNavigateToTicket(primaryTicket.ticketId)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-brand-red hover:text-white text-gray-700 text-xs font-bold transition-all duration-200 shadow-sm"
                                                >
                                                    <span>View</span>
                                                    <ExternalLink size={12} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 px-5 sm:px-7 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500 font-medium">
                <span>
                    Showing <strong className="text-gray-700">{filteredCircuits.length}</strong> of{' '}
                    <strong className="text-gray-700">{circuits.length}</strong> impacted circuits
                </span>
                <span className="text-gray-400">
                    Calculated in Indian Standard Time (IST)
                </span>
            </div>
        </div>
    );
};
export default CircuitIncidentsTable;
