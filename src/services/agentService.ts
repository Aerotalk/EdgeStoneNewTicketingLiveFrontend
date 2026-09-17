export interface Agent {
    id: string;
    name: string;
    email: string;
    createdOn: string;
    emails: string[];
    status: 'Active' | 'In-Active';
    role: 'Super admin' | 'Manager' | 'Support crew';
    signatureConnected?: boolean;
}

export interface CreateAgentData {
    name: string;
    email: string;
    password?: string;
    status: 'Active' | 'In-Active';
    emails?: string[];
    role: 'Super admin' | 'Manager' | 'Support crew';
}

export interface UpdateAgentData {
    name?: string;
    email?: string;
    password?: string;
    status?: 'Active' | 'In-Active';
    emails?: string[];
    role?: 'Super admin' | 'Manager' | 'Support crew';
}

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/agents`;

const getAuthHeaders = () => {
    const userStr = localStorage.getItem('edgestone_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token || ''}` // Assuming token is stored in user object
    };
};

export const agentService = {
    getAllAgents: async (): Promise<Agent[]> => {
        const response = await fetch(`${API_URL}`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            const error = await response.json().catch(() => ({ message: 'Failed to fetch agents' }));
            throw new Error(error.message);
        }
        return response.json();
    },

    createAgent: async (data: CreateAgentData): Promise<Agent> => {
        const response = await fetch(`${API_URL}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            const error = await response.json().catch(() => ({ message: 'Failed to create agent' }));
            throw new Error(error.message);
        }
        return response.json();
    },

    updateAgent: async (id: string, data: UpdateAgentData): Promise<Agent> => {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            const error = await response.json().catch(() => ({ message: 'Failed to update agent' }));
            throw new Error(error.message);
        }
        return response.json();
    }
};
