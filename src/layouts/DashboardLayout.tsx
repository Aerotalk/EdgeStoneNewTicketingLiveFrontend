import React, { useEffect, useState } from 'react';
import { Outlet, useParams, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Plus, Calculator as CalcIcon, Edit3 } from 'lucide-react';
import { Sidebar } from '../components/ui/Sidebar';
import { Calculator } from '../components/ui/Calculator';
import { GlobalStickyNote } from '../components/ui/GlobalStickyNote';
import { useAuth } from '../contexts/AuthContext';
import { DashboardDataProvider } from '../contexts/DashboardDataContext';

const DashboardLayout: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user, isLoading } = useAuth();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeWidget, setActiveWidget] = useState<'calculator' | 'stickynote' | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        document.title = 'EdgeStone - Dashboard';
    }, []);

    // Notifications Stream — with auto-reconnect & chime sound
    useEffect(() => {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        let eventSource: EventSource | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let retryDelay = 3000;

        const playChime = () => {
            try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
                frequencies.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    const startTime = ctx.currentTime + i * 0.15;
                    gain.gain.setValueAtTime(0, startTime);
                    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
                    osc.start(startTime);
                    osc.stop(startTime + 0.4);
                });
            } catch (_) { /* AudioContext may be blocked before user interaction */ }
        };

        const connect = () => {
            eventSource = new EventSource(`${apiBase}/api/notifications/stream`);

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'connected') {
                        retryDelay = 3000; // Reset backoff on successful connect
                        return;
                    }

                    // Toast notification
                    if (data.type === 'closed_ticket_reply') {
                        toast(data.message, {
                            duration: 9000,
                            icon: '⚠️',
                            style: { background: '#451a03', color: '#fef3c7', border: '1px solid #d97706', borderRadius: '12px', fontWeight: '600' }
                        });
                    } else {
                        toast.success(data.message, {
                            duration: 6000,
                            icon: '🔔',
                            style: { background: '#1e1e2e', color: '#fff', borderRadius: '12px', fontWeight: '600' }
                        });
                    }

                    // Chime
                    playChime();

                    // Dispatch custom event to trigger Notification panel refresh
                    window.dispatchEvent(new CustomEvent('new_notification', { detail: data }));

                } catch (error) {
                    console.error('[Keery] Error parsing notification:', error);
                }
            };

            eventSource.onerror = () => {
                eventSource?.close();
                // Reconnect with backoff (max 30s)
                retryDelay = Math.min(retryDelay * 1.5, 30000);
                reconnectTimer = setTimeout(connect, retryDelay);
            };
        };

        connect();

        return () => {
            eventSource?.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, []);

    // Wait for auth state to be restored from localStorage before redirecting
    if (isLoading) {
        return null;
    }

    // Check if user is authenticated and the ID matches
    if (!user || user.id !== id) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="h-screen w-full bg-white flex flex-col lg:flex-row font-sans selection:bg-brand-red selection:text-white overflow-hidden relative">
            <Sidebar
                agentName={user.name}
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <DashboardDataProvider>
                <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                    {/* Mobile Header */}
                    <header className="lg:hidden flex items-center justify-between px-4 h-16 border-b border-gray-100 bg-white flex-shrink-0">
                        <img src="/assets/logo.png" alt="EdgeStone" className="h-8 w-auto" />
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 text-gray-500 hover:text-brand-red"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                            </svg>
                        </button>
                    </header>

                    <main className="flex-1 overflow-y-auto bg-[#F9FAFB]">
                        <Outlet />
                    </main>
                </div>
            </DashboardDataProvider>
            
            <Calculator
                isOpen={activeWidget === 'calculator'}
                onClose={() => setActiveWidget(null)}
                showFloatingButton={false}
            />
            <GlobalStickyNote
                isOpen={activeWidget === 'stickynote'}
                onClose={() => setActiveWidget(null)}
                showFloatingButton={false}
            />

            {/* Unified FAB Menu */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
                {/* Floating Action Menu Stack */}
                <div 
                    className={`flex flex-col items-end gap-3 mb-4 transition-all duration-300 origin-bottom ${
                        isMenuOpen 
                            ? 'opacity-100 scale-100 translate-y-0' 
                            : 'opacity-0 scale-75 translate-y-8 pointer-events-none absolute'
                    }`}
                >
                    {/* Shift Handover (Sticky Note) Button */}
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => { setActiveWidget(activeWidget === 'stickynote' ? null : 'stickynote'); setIsMenuOpen(false); }}>
                        <span className="opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg transition-opacity duration-200 whitespace-nowrap border border-slate-800">
                            Shift Handover
                        </span>
                        <button
                            className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20 hover:scale-110 active:scale-95 transition-all duration-200"
                        >
                            <Edit3 size={20} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Scientific Calculator Button */}
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => { setActiveWidget(activeWidget === 'calculator' ? null : 'calculator'); setIsMenuOpen(false); }}>
                        <span className="opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg transition-opacity duration-200 whitespace-nowrap border border-slate-800">
                            Calculator
                        </span>
                        <button
                            className="w-12 h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg shadow-slate-900/30 hover:scale-110 active:scale-95 transition-all duration-200 border border-slate-700"
                        >
                            <CalcIcon className="w-5 h-5 text-gray-100" />
                        </button>
                    </div>
                </div>

                {/* Main FAB Trigger */}
                <button
                    onClick={() => {
                        setIsMenuOpen(!isMenuOpen);
                    }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 z-50 relative ${
                        isMenuOpen 
                            ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-500/20' 
                            : 'bg-slate-900 hover:bg-slate-950 text-white ring-4 ring-slate-900/10'
                    }`}
                >
                    <Plus className={`w-6 h-6 transition-transform duration-300 ${isMenuOpen ? 'rotate-45' : ''}`} />
                </button>
            </div>
        </div>
    );
};

export default DashboardLayout;
