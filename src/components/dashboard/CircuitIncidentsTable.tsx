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
    RefreshCw,
    X
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
        const cleanId = ticketId.replace(/^#+/, '').trim();
        navigate(`/dashboard/${userId}/tickets?ticketId=${encodeURIComponent(cleanId)}`);
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-200">
            {/* Table Header & Controls Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-brand-red flex items-center justify-center border border-rose-100/80 shadow-2xs">
                            <Activity size={16} strokeWidth={2.2} />
                        </div>
                        <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
                            Daily Circuit Incidents Overview
                        </h2>
                    </div>
                    <p className="text-slate-500 text-xs font-normal mt-1">
                        Circuit-level impact breakdown for <span className="font-semibold text-slate-700">{displayDate}</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search Input */}
                    <div className="relative min-w-[240px] sm:min-w-[280px] flex-1 sm:flex-none">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search circuit, client, ticket #..."
                            className="w-full pl-9 pr-8 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-normal text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-red focus:ring-1 focus:ring-brand-red/20 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                title="Clear search"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        title="Refresh Daily Incidents"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin text-brand-red' : ''} />
                    </button>
                </div>
            </div>

            {/* Filter Pills Bar */}
            <div className="px-4 sm:px-5 py-2.5 bg-slate-50/60 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                        Incident Filter:
                    </span>

                    {/* All Impacted */}
                    <button
                        onClick={() => setStatusFilter('ALL')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            statusFilter === 'ALL'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/80'
                        }`}
                    >
                        <span>All Impacted</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            statusFilter === 'ALL' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {summary.totalImpactedCircuits}
                        </span>
                    </button>

                    {/* New Incidents */}
                    <button
                        onClick={() => setStatusFilter('NEW_INCIDENT')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            statusFilter === 'NEW_INCIDENT'
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 hover:text-rose-700 hover:bg-rose-50/60 border border-slate-200/80'
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'NEW_INCIDENT' ? 'bg-white' : 'bg-rose-500'}`} />
                        <span>New Incidents</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            statusFilter === 'NEW_INCIDENT' ? 'bg-rose-700 text-rose-100' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        }`}>
                            {summary.newIncidentsCount}
                        </span>
                    </button>

                    {/* Ongoing Incidents */}
                    <button
                        onClick={() => setStatusFilter('ONGOING_INCIDENT')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            statusFilter === 'ONGOING_INCIDENT'
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 hover:text-amber-700 hover:bg-amber-50/60 border border-slate-200/80'
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'ONGOING_INCIDENT' ? 'bg-white' : 'bg-amber-500'}`} />
                        <span>Ongoing Incidents</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            statusFilter === 'ONGOING_INCIDENT' ? 'bg-amber-700 text-amber-100' : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                        }`}>
                            {summary.ongoingIncidentsCount}
                        </span>
                    </button>

                    {/* Resolved Today */}
                    <button
                        onClick={() => setStatusFilter('RESOLVED_TODAY')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            statusFilter === 'RESOLVED_TODAY'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 border border-slate-200/80'
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'RESOLVED_TODAY' ? 'bg-white' : 'bg-emerald-500'}`} />
                        <span>Resolved Today</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            statusFilter === 'RESOLVED_TODAY' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                        }`}>
                            {summary.resolvedTodayCount}
                        </span>
                    </button>
                </div>

                <div className="text-[11px] text-slate-400 font-normal hidden sm:block">
                    {filteredCircuits.length} of {circuits.length} records
                </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                            <th className="py-3 px-4 sm:px-6">Circuit Identification</th>
                            <th className="py-3 px-4">Client & Vendor</th>
                            <th className="py-3 px-4">Daily Incident Status</th>
                            <th className="py-3 px-4">Associated Tickets</th>
                            <th className="py-3 px-4">Primary Issue Summary</th>
                            <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-normal">
                        {loading && circuits.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                                        <span className="text-xs font-medium text-slate-600">Aggregating daily circuit incidents...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredCircuits.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <CheckCircle2 size={32} className="text-emerald-500/80" />
                                        <p className="font-semibold text-sm text-slate-700">No matching circuit incidents found</p>
                                        <p className="text-xs text-slate-400 max-w-sm">
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
                                        className="hover:bg-slate-50/60 transition-colors group"
                                    >
                                        {/* Circuit Identification */}
                                        <td className="py-3.5 px-4 sm:px-6 align-top">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono text-xs font-semibold text-slate-900 group-hover:text-brand-red transition-colors">
                                                        {item.customerCircuitId}
                                                    </span>
                                                    <span
                                                        className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${
                                                            item.circuitType === 'PROTECTED'
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200/70'
                                                                : 'bg-slate-100 text-slate-600 border-slate-200/80'
                                                        }`}
                                                    >
                                                        {item.circuitType}
                                                    </span>
                                                </div>

                                                {item.supplierCircuitId && (
                                                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                                                        <Network size={11} className="text-slate-400 shrink-0" />
                                                        <span>Supp: {item.supplierCircuitId}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Client & Vendor */}
                                        <td className="py-3.5 px-4 align-top">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
                                                    <Building2 size={13} className="text-slate-400 shrink-0" />
                                                    <span className="truncate max-w-[150px]">{item.clientName}</span>
                                                </div>
                                                <span className="text-[11px] text-slate-400 font-normal truncate max-w-[150px]">
                                                    Vendor: {item.vendorName}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Daily Incident Status */}
                                        <td className="py-3.5 px-4 align-top">
                                            {isNew && (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/70 w-max">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                                        </span>
                                                        New Incident Reported
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-normal pl-0.5">
                                                        Ticket logged today
                                                    </span>
                                                </div>
                                            )}

                                            {isOngoing && (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/70 w-max">
                                                        <Clock size={11} className="text-amber-600 shrink-0" />
                                                        No New Incident Reported – Ongoing Incident
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-normal pl-0.5">
                                                        Active for {item.agingDays} day{item.agingDays > 1 ? 's' : ''} (since {item.firstReportedDate})
                                                    </span>
                                                </div>
                                            )}

                                            {isNewAndOngoing && (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200/70 w-max">
                                                        <AlertCircle size={11} className="text-purple-600 shrink-0" />
                                                        New Incident & Ongoing Issue
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-normal pl-0.5">
                                                        {item.newTicketsCount} new today, {item.ongoingTicketsCount} older
                                                    </span>
                                                </div>
                                            )}

                                            {isResolved && (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/70 w-max">
                                                        <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                                                        Resolved Today
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-normal pl-0.5">
                                                        Incident cleared
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Associated Tickets */}
                                        <td className="py-3.5 px-4 align-top">
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                {item.tickets.map((t) => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => handleNavigateToTicket(t.ticketId)}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium border transition-colors cursor-pointer ${
                                                            t.isNewToday
                                                                ? 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100 hover:border-rose-300'
                                                                : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                                                        }`}
                                                        title={`Click to open ticket #${t.ticketId.replace(/^#+/, '')}: ${t.header}`}
                                                    >
                                                        <span>{t.ticketId.startsWith('#') ? t.ticketId : `#${t.ticketId}`}</span>
                                                        <ExternalLink size={9} className="opacity-50" />
                                                    </button>
                                                ))}
                                            </div>
                                        </td>

                                        {/* Primary Issue Summary */}
                                        <td className="py-3.5 px-4 align-top max-w-[260px]">
                                            {primaryTicket ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span
                                                            className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider ${
                                                                primaryTicket.priority === 'High'
                                                                    ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                                                    : primaryTicket.priority === 'Medium'
                                                                    ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                                                            }`}
                                                        >
                                                            {primaryTicket.priority}
                                                        </span>
                                                        <span className="text-slate-400 text-[10px] font-normal">
                                                            {primaryTicket.status}
                                                        </span>
                                                    </div>
                                                    <p
                                                        onClick={() => handleNavigateToTicket(primaryTicket.ticketId)}
                                                        className="text-xs text-slate-700 font-medium truncate cursor-pointer hover:text-brand-red transition-colors"
                                                        title={`Click to open ticket #${primaryTicket.ticketId.replace(/^#+/, '')}: ${primaryTicket.header}`}
                                                    >
                                                        {primaryTicket.header}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">No active tickets</span>
                                            )}
                                        </td>

                                        {/* Action */}
                                        <td className="py-3.5 px-4 sm:px-6 text-right align-top">
                                            {primaryTicket && (
                                                <button
                                                    onClick={() => handleNavigateToTicket(primaryTicket.ticketId)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-900 hover:text-white border border-slate-200/80 hover:border-slate-900 transition-all cursor-pointer shadow-2xs"
                                                    title={`Click to open ticket #${primaryTicket.ticketId.replace(/^#+/, '')}`}
                                                >
                                                    <span>View</span>
                                                    <ExternalLink size={10} />
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
            <div className="py-3 px-4 sm:px-6 bg-slate-50/70 border-t border-slate-200/70 flex flex-wrap items-center justify-between text-xs text-slate-500 font-normal">
                <span>
                    Showing <strong className="font-semibold text-slate-700">{filteredCircuits.length}</strong> of{' '}
                    <strong className="font-semibold text-slate-700">{circuits.length}</strong> impacted circuits
                </span>
                <span className="text-slate-400">
                    Calculated in Indian Standard Time (IST)
                </span>
            </div>
        </div>
    );
};
export default CircuitIncidentsTable;

