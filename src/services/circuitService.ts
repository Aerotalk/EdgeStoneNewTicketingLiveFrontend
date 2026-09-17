/** Circuit entity returned by GET /api/circuits */
export interface Circuit {
    id: string;
    customerCircuitId: string;
    supplierCircuitId: string | null;
    type: 'PROTECTED' | 'UNPROTECTED';
    vendorId: string | null;
    vendor: { id: string; name: string; status: string; emails?: string[] } | null;
    clientId: string | null;
    client: { id: string; name: string; status: string; emails?: string[] } | null;
    // Detail fields
    poNumber: string | null;
    serviceDescription: string | null;
    contractTermMonths: number | null;
    contractType: string | null;
    mrc: number;
    supplierPoNumber: string | null;
    supplierServiceDescription: string | null;
    supplierContractTermMonths: number | null;
    supplierContractType: string | null;
    billingStartDate: string | null;
    supplierMrc: number;
    nrc?: number;
    supplierNrc?: number;
    isMultiVendor?: boolean;
    vendorCircuits?: VendorCircuitData[];
}

export interface VendorCircuitData {
    id?: string;
    vendorId?: string | null;
    vendor?: { id: string; name: string; status: string; emails?: string[] } | null;
    supplierCircuitId?: string | null;
    supplierPoNumber?: string | null;
    supplierServiceDescription?: string | null;
    supplierContractTermMonths?: number | null;
    supplierContractType?: string | null;
    billingStartDate?: string | null;
    supplierMrc?: number;
    supplierNrc?: number;
}

export interface CreateCircuitData {
    customerCircuitId: string;
    supplierCircuitId?: string | null;
    isTemporary?: boolean;
    type?: 'PROTECTED' | 'UNPROTECTED';
    vendorId?: string | null;
    clientId?: string | null;
    poNumber?: string | null;
    serviceDescription?: string | null;
    contractTermMonths?: number | null;
    contractType?: string | null;
    mrc?: number;
    supplierPoNumber?: string | null;
    supplierServiceDescription?: string | null;
    supplierContractTermMonths?: number | null;
    supplierContractType?: string | null;
    billingStartDate?: string | null;
    supplierMrc?: number;
    nrc?: number;
    supplierNrc?: number;
    isMultiVendor?: boolean;
    vendorCircuits?: VendorCircuitData[];
}

export type UpdateCircuitData = Partial<CreateCircuitData>;

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/circuits`;

const getAuthHeaders = () => {
    const userStr = localStorage.getItem('edgestone_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token || ''}`
    };
};

export const circuitService = {
    getAllCircuits: async (filters?: { vendorId?: string; clientId?: string }): Promise<Circuit[]> => {
        let qs = '';
        if (filters && (filters.vendorId || filters.clientId)) {
            const params = new URLSearchParams();
            if (filters.vendorId) params.append('vendorId', filters.vendorId);
            if (filters.clientId) params.append('clientId', filters.clientId);
            qs = `?${params.toString()}`;
        }
        const response = await fetch(`${API_URL}${qs}`, { headers: getAuthHeaders() });
        if (!response.ok) {
            if (response.status === 401) throw new Error('Unauthorized');
            const err = await response.json().catch(() => ({ message: 'Failed to fetch circuits' }));
            throw new Error(err.message);
        }
        const result = await response.json();
        return result.data ?? result;
    },

    createCircuit: async (data: CreateCircuitData): Promise<Circuit> => {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('Unauthorized');
            const err = await response.json().catch(() => ({ message: 'Failed to create circuit' }));
            throw new Error(err.message);
        }
        const result = await response.json();
        return result.data ?? result;
    },

    updateCircuit: async (id: string, data: UpdateCircuitData): Promise<Circuit> => {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('Unauthorized');
            const err = await response.json().catch(() => ({ message: 'Failed to update circuit' }));
            throw new Error(err.message);
        }
        const result = await response.json();
        return result.data ?? result;
    },

    deleteCircuit: async (id: string): Promise<void> => {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('Unauthorized');
            const err = await response.json().catch(() => ({ message: 'Failed to delete circuit' }));
            throw new Error(err.message || 'Failed to delete circuit');
        }
    },
};
