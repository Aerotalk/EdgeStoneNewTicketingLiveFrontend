// ─────────────────────────────────────────────────────────────────────────────
// Frontend Signature Service
// Matches Outlook's per-agent signature management API
// ─────────────────────────────────────────────────────────────────────────────

export interface Signature {
    id: string;
    agentId: string;
    name: string;
    content: string; // HTML string (may contain <img> tags)
    defaultFor: 'new' | 'reply' | 'both' | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSignatureData {
    agentId: string;
    name: string;
    content: string;
    defaultFor?: 'new' | 'reply' | 'both' | null;
}

export interface UpdateSignatureData {
    name?: string;
    content?: string;
    defaultFor?: 'new' | 'reply' | 'both' | null;
}

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/signatures`;

const getAuthHeaders = () => {
    const userStr = localStorage.getItem('edgestone_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token || ''}`,
    };
};

export const signatureService = {
    /**
     * Get all signatures for a given agent
     */
    getSignatures: async (agentId: string): Promise<Signature[]> => {
        const res = await fetch(`${API_URL}?agentId=${encodeURIComponent(agentId)}`, {
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Failed to fetch signatures' }));
            throw new Error(err.error || 'Failed to fetch signatures');
        }
        return res.json();
    },

    /**
     * Create a new signature
     */
    createSignature: async (data: CreateSignatureData): Promise<Signature> => {
        const res = await fetch(`${API_URL}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Failed to create signature' }));
            throw new Error(err.error || 'Failed to create signature');
        }
        return res.json();
    },

    /**
     * Update an existing signature (name, content, or defaultFor)
     */
    updateSignature: async (id: string, data: UpdateSignatureData): Promise<Signature> => {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Failed to update signature' }));
            throw new Error(err.error || 'Failed to update signature');
        }
        return res.json();
    },

    /**
     * Delete a signature by ID
     */
    deleteSignature: async (id: string): Promise<void> => {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Failed to delete signature' }));
            throw new Error(err.error || 'Failed to delete signature');
        }
    },

    /**
     * Set the default signature for new messages, replies, or both
     */
    setDefault: async (id: string, defaultFor: 'new' | 'reply' | 'both' | null): Promise<Signature> => {
        const res = await fetch(`${API_URL}/${id}/set-default`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ defaultFor }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Failed to set default' }));
            throw new Error(err.error || 'Failed to set default');
        }
        return res.json();
    },

    /**
     * Upload an image and get back a base64 data URL for embedding in signature HTML
     */
    uploadImage: async (file: File): Promise<string> => {
        const userStr = localStorage.getItem('edgestone_user');
        const user = userStr ? JSON.parse(userStr) : null;

        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch(`${API_URL}/upload-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${user?.token || ''}`,
                // NOTE: do NOT set Content-Type — browser must set it with boundary for multipart
            },
            body: formData,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Failed to upload image' }));
            throw new Error(err.error || 'Failed to upload image');
        }
        const data = await res.json();
        return data.url; // base64 data URL
    },
};
