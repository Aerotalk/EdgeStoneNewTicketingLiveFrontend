const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/sla-records`;

const getAuthHeaders = () => {
    const userStr = localStorage.getItem('edgestone_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token || ''}`
    };
};

export interface SLARecord {
    id: string;
    ticketId: string;
    circuitId: string;
    clientName: string;
    vendorName: string;
    startDate: string;
    displayStartDate: string;
    startTime: string;
    closedTime: string;
    closeDate: string;
    status: 'Breached' | 'Safe';
    compensation: string;
    statusReason?: string;
    downtime: string; // Provided straight from backend now
}

export interface SLARecordFilters {
    search?: string;
    filter?: string;
    customStart?: string;
    customEnd?: string;
    type?: string;
}

export const slaRecordService = {
    getAllSLARecords: async (filters?: SLARecordFilters): Promise<SLARecord[]> => {
        try {
            const query = new URLSearchParams();
            if (filters?.search) query.append('search', filters.search);
            if (filters?.filter) query.append('filter', filters.filter);
            if (filters?.customStart) query.append('customStart', filters.customStart);
            if (filters?.customEnd) query.append('customEnd', filters.customEnd);
            if (filters?.type) query.append('type', filters.type);

            const url = query.toString() ? `${API_URL}?${query.toString()}` : API_URL;
            const response = await fetch(url, { headers: getAuthHeaders() });
            if (!response.ok) {
                return [];
            }
            const result = await response.json();
            return result.data || [];
        } catch (error) {
            console.error('Error fetching SLA records:', error);
            return [];
        }
    },

    exportSLARecords: async (filters?: SLARecordFilters): Promise<void> => {
        try {
            const query = new URLSearchParams();
            if (filters?.search) query.append('search', filters.search);
            if (filters?.filter) query.append('filter', filters.filter);
            if (filters?.customStart) query.append('customStart', filters.customStart);
            if (filters?.customEnd) query.append('customEnd', filters.customEnd);
            if (filters?.type) query.append('type', filters.type);

            const url = query.toString() ? `${API_URL}/export?${query.toString()}` : `${API_URL}/export`;
            const response = await fetch(url, { headers: getAuthHeaders() });
            
            if (!response.ok) throw new Error('Export failed');
            
            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `SLA_Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Error exporting SLA records:', error);
            throw error;
        }
    },

    getSLARecordByTicketId: async (ticketId: string): Promise<SLARecord | null> => {
        try {
            const response = await fetch(`${API_URL}/ticket/${ticketId}`, { headers: getAuthHeaders() });
            if (!response.ok || response.status === 404) {
                return null;
            }
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching SLA record:', error);
            return null;
        }
    },

    createSLARecord: async (id: string, ticketId: string, startDate: string, startTime: string): Promise<SLARecord> => {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ id, ticketId, startDate, startTime })
            });
            if (!response.ok) throw new Error('Failed to create SLA record');
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error creating SLA record:', error);
            throw error;
        }
    },

    updateSLAClosure: async (ticketId: string, closeDate: string, closedTime: string): Promise<SLARecord> => {
        try {
            const response = await fetch(`${API_URL}/ticket/${ticketId}/closure`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ closeDate, closedTime })
            });
            if (!response.ok) throw new Error('Failed to update SLA closure');
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error updating SLA closure:', error);
            throw error;
        }
    },

    updateSLARecordStatus: async (id: string, status: 'Breached' | 'Safe', reason: string): Promise<SLARecord> => {
        try {
            const response = await fetch(`${API_URL}/${id}/status`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status, reason })
            });
            if (!response.ok) throw new Error('Failed to update SLA record status');
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error updating SLA record status:', error);
            throw error;
        }
    }
};
