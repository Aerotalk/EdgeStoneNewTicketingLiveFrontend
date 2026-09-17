export interface EmailSuggestion {
    name: string;
    email: string;
    source: string;
    category: 'recent' | 'client' | 'vendor' | 'crew' | 'history';
    count?: number;
}

const API_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/email`;

const getAuthHeaders = () => {
    const userStr = localStorage.getItem('edgestone_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token || ''}`
    };
};

export const emailSuggestionService = {
    getSuggestions: async (query = '', limit = 15): Promise<EmailSuggestion[]> => {
        try {
            const params = new URLSearchParams();
            if (query) params.append('q', query);
            params.append('limit', limit.toString());

            const response = await fetch(`${API_URL}/suggestions?${params.toString()}`, {
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                console.warn(`Failed to fetch email suggestions: ${response.status}`);
                return [];
            }

            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching email suggestions:', error);
            return [];
        }
    }
};
