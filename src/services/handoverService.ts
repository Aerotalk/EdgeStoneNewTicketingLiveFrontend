import { API_BASE_URL } from '../config';
import type { ShiftType } from '../utils/shiftUtils';

export interface CriticalTicketItem {
    ticketNumber: string;
    summary: string;
    priority?: string;
}

export interface PendingTaskItem {
    id: string;
    text: string;
    completed: boolean;
}

export interface ShiftHandover {
    id: string | null;
    date: string; // "YYYY-MM-DD"
    shift: ShiftType;
    shiftName: string;
    timeRange?: string;
    displayTitle?: string;
    content: string;
    criticalTickets?: CriticalTicketItem[];
    pendingTasks?: PendingTaskItem[];
    status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED';
    outgoingAgent?: string | null;
    incomingAgent?: string | null;
    acknowledgedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    isNew?: boolean;
}

export interface HandoverHistoryGroup {
    date: string;
    displayDate: string;
    shifts: Record<ShiftType, ShiftHandover>;
}

export interface CarryForwardResponse {
    found: boolean;
    previousInfo?: {
        date: string;
        shift: ShiftType;
        shiftName: string;
        displayDate: string;
        title: string;
    };
    handover?: ShiftHandover;
    message?: string;
}

const API_URL = `${API_BASE_URL}/api/handovers`;

const getAuthHeaders = () => {
    const userStr = localStorage.getItem('edgestone_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token || ''}`
    };
};

export const handoverService = {
    /**
     * Fetch active handover for current IST shift and date
     */
    getCurrentHandover: async (): Promise<ShiftHandover> => {
        const response = await fetch(`${API_URL}/current`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            throw new Error('Failed to fetch current shift handover');
        }
        return response.json();
    },

    /**
     * Fetch handover for a specific date and shift
     */
    getByDateAndShift: async (date: string, shift: ShiftType): Promise<ShiftHandover> => {
        const response = await fetch(`${API_URL}/by-date-shift?date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch handover for ${date} Shift ${shift}`);
        }
        return response.json();
    },

    /**
     * Save/upsert handover notes and status
     */
    saveHandover: async (payload: {
        date: string;
        shift: ShiftType;
        content: string;
        criticalTickets?: CriticalTicketItem[];
        pendingTasks?: PendingTaskItem[];
        status?: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED';
    }): Promise<ShiftHandover> => {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Failed to save handover' }));
            throw new Error(err.message || 'Failed to save handover');
        }
        return response.json();
    },

    /**
     * Incoming agent acknowledges the handover
     */
    acknowledgeHandover: async (id: string): Promise<ShiftHandover> => {
        const response = await fetch(`${API_URL}/${id}/acknowledge`, {
            method: 'PATCH',
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            throw new Error('Failed to acknowledge handover');
        }
        return response.json();
    },

    /**
     * Retrieve chronological history with filters
     */
    getHistory: async (filters?: { shift?: string; search?: string; limit?: number }): Promise<{
        records: ShiftHandover[];
        groupedByDate: HandoverHistoryGroup[];
    }> => {
        const params = new URLSearchParams();
        if (filters?.shift) params.append('shift', filters.shift);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.limit) params.append('limit', String(filters.limit));

        const response = await fetch(`${API_URL}/history?${params.toString()}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            throw new Error('Failed to fetch handover history');
        }
        return response.json();
    },

    /**
     * Retrieve previous shift's details to carry forward
     */
    carryForwardPrevious: async (date: string, shift: ShiftType): Promise<CarryForwardResponse> => {
        const response = await fetch(`${API_URL}/carry-forward`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ date, shift })
        });
        if (!response.ok) {
            throw new Error('Failed to fetch previous shift handover data');
        }
        return response.json();
    }
};
