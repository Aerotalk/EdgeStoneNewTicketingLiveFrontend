export interface SLARecord {
    id: string;
    ticketId: string;
    startDate: string;
    displayStartDate: string;
    startTime: string;
    closedTime: string;
    closeDate: string;
    status: 'Breached' | 'Safe';
    compensation: string;
    statusReason?: string;
}

export const getAuthHeaders = () => {
    const userStr = localStorage.getItem('edgestone_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token || ''}`
    };
};

export const API_URL_SLA = `${import.meta.env.VITE_API_BASE_URL}/api/sla-records`;
