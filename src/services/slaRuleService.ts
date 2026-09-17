/**
 * SLA Rule Condition — stored as computable data for calculation.
 * 
 * Each condition defines a range for the availability factor:
 *   upperLimit [upperOperator] Av [lowerOperator] lowerLimit → compensationPercentage
 */
export interface SlaRule {
    upperLimit: number | null;
    upperOperator: string | null;   // "<" | "<="
    lowerLimit: number | null;
    lowerOperator: string | null;   // ">" | ">="
    compensationPercentage: number; // % of MRC
}

export interface Sla {
    id: string;
    circuitId: string;
    appliesTo: 'VENDOR' | 'CUSTOMER';
    vendorId: string | null;
    customerId: string | null;
    totalDowntimeMinutes: number;
    availabilityFactor: number | null;
    compensationAmount: number;
    status: string;
    statusReason: string | null;
    createdAt: string;
    totalPrice?: number | null;

    // Relations
    circuit: { id: string; customerCircuitId: string; supplierCircuitId: string; type: string; mrc?: number; supplierMrc?: number; };
    vendor?: { id: string; name: string; status: string };
    customer?: { id: string; name: string; status: string };
    rules: (SlaRule & { id: string, slaId: string })[];
}

export interface CreateSlaData {
    circuitId: string;
    appliesTo: 'VENDOR' | 'CUSTOMER';
    vendorId?: string;
    customerId?: string;
    totalPrice?: number | null;
    rules: SlaRule[];
}

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/sla`;

const getAuthHeaders = () => {
    const userStr = localStorage.getItem('edgestone_user');
    const user = userStr ? JSON.parse(userStr) : null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token || ''}`
    };
};

export const slaService = {
    getAllSlas: async (): Promise<Sla[]> => {
        try {
            const response = await fetch(API_URL, { headers: getAuthHeaders() });
            if (!response.ok) throw new Error('Failed to fetch SLAs');
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching SLAs:', error);
            throw error;
        }
    },

    getGroupedSlas: async (): Promise<Record<string, { circuitDisplayId: string; circuitId: string; vendorSlas: Sla[]; customerSlas: Sla[] }>> => {
        try {
            const response = await fetch(`${API_URL}/grouped`, { headers: getAuthHeaders() });
            if (!response.ok) throw new Error('Failed to fetch grouped SLAs');
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching grouped SLAs:', error);
            throw error;
        }
    },

    createSla: async (data: CreateSlaData): Promise<Sla> => {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.message || 'Failed to create SLA');
            }
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error creating SLA:', error);
            throw error;
        }
    },

    updateSla: async (id: string, data: CreateSlaData): Promise<Sla> => {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.message || 'Failed to update SLA');
            }
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error updating SLA:', error);
            throw error;
        }
    }
};

