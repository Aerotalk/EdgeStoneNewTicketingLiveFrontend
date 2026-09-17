export interface Reply {
    id: string;
    text: string;
    time: string;
    date: string;
    author: string;
    type: 'agent' | 'client' | 'vendor';
    category: 'client' | 'vendor';
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    attachments?: any[];
    createdAt: string;
}

export interface Ticket {
    id: string;
    ticketId: string;
    header: string;
    email: string;
    status: string;
    priority: string;
    circuitId?: string;
    cc?: string[];
    date: string; // Formatted date string
    receivedAt?: string; // ISO timestamp from email
    receivedTime?: string; // Display time (24-hour format HH:MM)
    replies: Reply[];
    createdAt: string;
    updatedAt: string;
    isSlaActive?: boolean;
    ticketType?: string;
    clientId?: string;
    vendorId?: string;
    client?: { id?: string; name: string };
    vendor?: { id?: string; name: string };
    // Add other fields as needed
}

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/tickets`;

const getAuthHeaders = () => {
    const userStr = localStorage.getItem('edgestone_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token || ''}`
    };
};

export const ticketService = {
    getAllTickets: async (): Promise<Ticket[]> => {
        const response = await fetch(`${API_URL}`, {
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Handle unauthorized (maybe redirect to logic, but for service just throw)
                throw new Error('Unauthorized');
            }
            const error = await response.json().catch(() => ({ message: 'Failed to fetch tickets' }));
            throw new Error(error.message);
        }

        return response.json();
    },

    replyToTicket: async (id: string, message: string, htmlContent?: string, attachments?: any[], emailData?: any): Promise<Reply> => {
        const response = await fetch(`${API_URL}/${id}/reply`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ message, htmlContent, attachments, ...(emailData || {}) }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            const error = await response.json().catch(() => ({ message: 'Failed to send reply' }));
            throw new Error(error.message);
        }

        const result = await response.json();
        return result.reply;
    },

    replyToVendor: async (id: string, emailData: any): Promise<Reply> => {
        const response = await fetch(`${API_URL}/${id}/vendor-reply`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(emailData),
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Unauthorized');
            const error = await response.json().catch(() => ({ message: 'Failed to send vendor reply' }));
            throw new Error(error.message);
        }

        const result = await response.json();
        return result.reply;
    },

    uploadAttachments: async (files: File[]): Promise<any[]> => {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files', file);
        });

        // Use standard non-JSON headers for multipart/form-data
        const userStr = localStorage.getItem('edgestone_user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        const headers: HeadersInit = {
            'Authorization': `Bearer ${user?.token || ''}`
        };

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/upload/attachments`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Unauthorized');
            const error = await response.json().catch(() => ({ message: 'Failed to upload attachments' }));
            throw new Error(error.message);
        }

        const result = await response.json();
        return result.attachments;
    },

    updateTicket: async (id: string, data: Partial<Ticket>): Promise<Ticket> => {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PATCH',  // Backend route is PATCH /:id (not PUT)
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            const error = await response.json().catch(() => ({ message: 'Failed to update ticket' }));
            throw new Error(error.message);
        }

        return response.json();
    },

    getVendorEmails: async (id: string, vendorId?: string): Promise<string[]> => {
        const query = vendorId ? `?vendorId=${encodeURIComponent(vendorId)}` : '';
        const response = await fetch(`${API_URL}/${id}/vendor-emails${query}`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.emails || [];
    },

    sendAutoReply: async (id: string, toEmails: string[]): Promise<Ticket> => {
        const response = await fetch(`${API_URL}/${id}/auto-reply`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ toEmails }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            const error = await response.json().catch(() => ({ message: 'Failed to send auto-reply' }));
            throw new Error(error.message);
        }

        const result = await response.json();
        return result.ticket;
    },

    deleteTicket: async (id: string): Promise<void> => {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Unauthorized');
            const err = await response.json().catch(() => ({ message: 'Failed to delete ticket' }));
            throw new Error(err.message || 'Failed to delete ticket');
        }
    }
};
