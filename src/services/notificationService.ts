export interface Notification {
    id: string;
    title: string | null;
    message: string;
    type: string;
    isRead: boolean;
    ticketId: string | null;
    createdAt: string;
    updatedAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const notificationService = {
    getNotifications: async (): Promise<Notification[]> => {
        const response = await fetch(`${API_BASE_URL}/api/notifications`);
        if (!response.ok) throw new Error('Failed to fetch notifications');
        return response.json();
    },

    markAsRead: async (id: string): Promise<Notification> => {
        const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
            method: 'PUT'
        });
        if (!response.ok) throw new Error('Failed to mark as read');
        return response.json();
    },

    markAllAsRead: async (): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
            method: 'PUT'
        });
        if (!response.ok) throw new Error('Failed to mark all as read');
    }
};
