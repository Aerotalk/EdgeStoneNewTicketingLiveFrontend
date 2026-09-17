export interface Vendor {
    id: string;
    name: string;
    createdOn: string;
    emails: string[];
    status: 'Active' | 'In-Active';
}

export interface CreateVendorData {
    name: string;
    emails: string[];
    status?: 'Active' | 'In-Active';
}

export interface UpdateVendorData {
    name?: string;
    emails?: string[];
    status?: 'Active' | 'In-Active';
}

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/vendors`;

const getAuthHeaders = () => {
    const userStr = localStorage.getItem('edgestone_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token || ''}`
    };
};

export const vendorService = {
    getAllVendors: async (): Promise<Vendor[]> => {
        const response = await fetch(`${API_URL}`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            const error = await response.json().catch(() => ({ message: 'Failed to fetch vendors' }));
            throw new Error(error.message);
        }
        // Backend returns { success: true, data: Vendor[] }
        const result = await response.json();
        return result.data ?? result;
    },


    createVendor: async (data: CreateVendorData): Promise<Vendor> => {
        console.log('🔵 Creating vendor:', data);
        const response = await fetch(`${API_URL}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        console.log('🔵 Create vendor response status:', response.status);
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            if (response.status === 404) {
                console.error('❌ 404 Error: Vendor API endpoint not found. Did you restart the backend server?');
                throw new Error('Vendor API not found - Please restart the backend server');
            }
            const error = await response.json().catch(() => ({ message: 'Failed to create vendor' }));
            console.error('❌ Create vendor error:', error);
            throw new Error(error.message);
        }
        const result = await response.json();
        console.log('✅ Vendor created successfully:', result);
        return result;
    },

    updateVendor: async (id: string, data: UpdateVendorData): Promise<Vendor> => {
        console.log('🔵 Updating vendor:', id, data);
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        console.log('🔵 Update vendor response status:', response.status);
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            if (response.status === 404) {
                console.error('❌ 404 Error: Vendor API endpoint not found. Did you restart the backend server?');
                throw new Error('Vendor API not found - Please restart the backend server');
            }
            const error = await response.json().catch(() => ({ message: 'Failed to update vendor' }));
            console.error('❌ Update vendor error:', error);
            throw new Error(error.message);
        }
        const result = await response.json();
        console.log('✅ Vendor updated successfully:', result);
        return result;
    },

    deleteVendor: async (id: string): Promise<void> => {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('Unauthorized');
            const error = await response.json().catch(() => ({ message: 'Failed to delete vendor' }));
            throw new Error(error.message || 'Failed to delete vendor');
        }
    }
};
