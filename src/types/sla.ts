import { API_BASE_URL } from '../config';

export type SLAStatus = 'Breached' | 'Safe' | 'No SLA' | 'BREACHED' | 'SAFE' | (string & {});

export interface SLARecord {
    id: string;
    ticketId: string;
    startDate: string;
    displayStartDate: string;
    startTime: string;
    closedTime: string;
    closeDate: string;
    status: SLAStatus;
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

export const API_URL_SLA = `${API_BASE_URL}/api/sla-records`;
