import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ticketService, type Ticket } from '../services/ticketService';
import { clientService, type Client } from '../services/clientService';
import { vendorService, type Vendor } from '../services/vendorService';

interface DashboardDataContextType {
    tickets: Ticket[];
    clients: Client[];
    vendors: Vendor[];
    openCount: number;
    inProgressCount: number;
    totalClients: number;
    totalVendors: number;
    loading: boolean;
    refresh: () => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export const DashboardDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const fetchAll = useCallback(async () => {
        try {
            const [ticketData, clientData, vendorData] = await Promise.all([
                ticketService.getAllTickets(),
                clientService.getAllClients(),
                vendorService.getAllVendors(),
            ]);
            if (!mountedRef.current) return;
            setTickets(ticketData);
            setClients(clientData);
            setVendors(vendorData);
        } catch (err) {
            console.error('[DashboardData] Failed to fetch dashboard data:', err);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, []);

    // Initial fetch + polling
    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchAll]);

    // Derived counts — computed directly from DB status (ticket.status is the source of truth).
    const openCount = tickets.filter(t =>
        (t.status || '').toLowerCase() === 'open'
    ).length;

    const inProgressCount = tickets.filter(t =>
        (t.status || '').toLowerCase().replace(/\s+/g, '-') === 'in-progress'
    ).length;

    const totalClients = clients.length;
    const totalVendors = vendors.length;

    return (
        <DashboardDataContext.Provider value={{
            tickets,
            clients,
            vendors,
            openCount,
            inProgressCount,
            totalClients,
            totalVendors,
            loading,
            refresh: fetchAll,
        }}>
            {children}
        </DashboardDataContext.Provider>
    );
};

export const useDashboardData = () => {
    const context = useContext(DashboardDataContext);
    if (context === undefined) {
        throw new Error('useDashboardData must be used within a DashboardDataProvider');
    }
    return context;
};
