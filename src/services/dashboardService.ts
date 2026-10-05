import { API_BASE_URL } from '../config';

export type IncidentStatusType = 
    | 'NEW_INCIDENT'
    | 'ONGOING_INCIDENT'
    | 'NEW_AND_ONGOING'
    | 'RESOLVED_TODAY';

export interface IncidentTicketItem {
    id: string;
    ticketId: string;
    header: string;
    priority: 'Low' | 'Medium' | 'High' | string;
    status: string;
    createdAt: string;
    date: string;
    isNewToday: boolean;
}

export interface CircuitIncidentItem {
    circuitId: string;
    customerCircuitId: string;
    supplierCircuitId: string | null;
    circuitType: 'PROTECTED' | 'UNPROTECTED' | string;
    clientName: string;
    vendorName: string;
    incidentStatus: IncidentStatusType;
    incidentStatusLabel: string;
    statusBadgeColor: 'rose' | 'amber' | 'purple' | 'emerald';
    agingDays: number;
    firstReportedDate: string;
    newTicketsCount: number;
    ongoingTicketsCount: number;
    totalActiveTickets: number;
    tickets: IncidentTicketItem[];
}

export interface DailyIncidentSummary {
    totalTicketsRaisedToday: number;
    totalImpactedCircuits: number;
    newIncidentsCount: number;
    ongoingIncidentsCount: number;
    resolvedTodayCount: number;
}

export interface DailyIncidentResponse {
    date: string;
    displayDate: string;
    summary: DailyIncidentSummary;
    circuits: CircuitIncidentItem[];
}

const API_URL = `${API_BASE_URL}/api/dashboard/circuit-incidents`;

const getAuthHeaders = () => {
    const userStr = localStorage.getItem('edgestone_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token || ''}`
    };
};

export const dashboardService = {
    /**
     * Fetch daily circuit incidents and summary for a specific date
     */
    getDailyCircuitIncidents: async (
        date?: string,
        status?: string,
        search?: string
    ): Promise<DailyIncidentResponse> => {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (status && status !== 'ALL') params.append('status', status);
        if (search && search.trim()) params.append('search', search.trim());

        const queryStr = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${API_URL}${queryStr}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Failed to fetch circuit incidents' }));
            throw new Error(err.message || 'Failed to fetch dashboard incidents');
        }

        return response.json();
    }
};
