import React, { useState, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import {
    BookOpen,
    ShieldCheck,
    Layers,
    Zap,
    Clock,
    Users,
    CheckCircle2,
    AlertTriangle,
    FileText,
    ArrowRight,
    Search,
    Printer,
    ChevronDown,
    Info,
    HelpCircle,
    Activity,
    Building2,
    Sliders,
    Bell,
    Calculator,
    Edit3,
    Network,
    Key,
    UserCheck,
    Headphones,
    Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Topbar } from '../components/ui/Topbar';

interface DocsPageProps {
    embedded?: boolean;
}

export const DocsPage: React.FC<DocsPageProps> = ({ embedded = false }) => {
    const navigate = useNavigate();
    const { id: paramId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<'all' | 'Super admin' | 'Manager' | 'Support crew'>('all');
    const [activeSection, setActiveSection] = useState<string>('intro');
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

    const userRole = user?.role || 'Support crew';
    const currentAgentId = user?.id || paramId;
    const dashboardHome = currentAgentId ? `/dashboard/${currentAgentId}/overview` : '/login';

    // Navigation sections definition
    const sections = useMemo(() => [
        { id: 'intro', title: '1. Executive Overview & Architecture', icon: Layers, role: 'all' },
        { id: 'auth-security', title: '2. Access & Authentication', icon: Key, role: 'all' },
        { id: 'roles-matrix', title: '3. Roles & Permissions Matrix', icon: ShieldCheck, role: 'all' },
        { id: 'lifecycle-flow', title: '4. End-to-End Incident Lifecycle', icon: Network, role: 'all' },
        { id: 'dashboard-overview', title: '5. Analytics & Dashboard Overview', icon: Activity, role: 'all' },
        { id: 'ticket-management', title: '6. Tickets & Conversation Console', icon: FileText, role: 'all' },
        { id: 'circuits-inventory', title: '7. Telecom Circuits Management', icon: Zap, role: 'all' },
        { id: 'clients-directory', title: '8. Clients Directory & Accounts', icon: Users, role: 'Manager' },
        { id: 'vendors-directory', title: '9. Vendors & Carrier Escalations', icon: Building2, role: 'Manager' },
        { id: 'sla-engine', title: '10. SLA Engine & Compliance Audits', icon: Clock, role: 'all' },
        { id: 'agent-management', title: '11. Team Workforce & Agent Admin', icon: Sliders, role: 'Super admin' },
        { id: 'noc-utilities', title: '12. NOC Productivity Suite & Tools', icon: Headphones, role: 'all' },
        { id: 'sop-guides', title: '13. Step-by-Step SOP Playbooks', icon: CheckCircle2, role: 'all' },
        { id: 'faqs', title: '14. Troubleshooting & FAQs', icon: HelpCircle, role: 'all' }
    ], []);

    const filteredSections = useMemo(() => {
        return sections.filter(sec => {
            const matchesRole = selectedRole === 'all' || sec.role === 'all' || sec.role === selectedRole;
            const matchesSearch = !searchQuery.trim() || sec.title.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesRole && matchesSearch;
        });
    }, [sections, selectedRole, searchQuery]);

    const handlePrint = () => {
        window.print();
    };

    const toggleFaq = (id: string) => {
        setExpandedFaq(prev => (prev === id ? null : id));
    };

    const scrollToSection = (sectionId: string) => {
        setActiveSection(sectionId);
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className={`flex flex-col h-full bg-[#F9FAFB] text-gray-800 font-sans selection:bg-brand-red selection:text-white ${!embedded ? 'min-h-screen' : ''}`}>
            
            {/* Embedded Header: Standard Topbar */}
            {embedded ? (
                <Topbar
                    title="User Manual"
                    searchPlaceholder="Search manual..."
                    onSearch={(query) => setSearchQuery(query)}
                />
            ) : (
                /* Standalone Mode: Clean EdgeStone Navbar */
                <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-xs print:hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                        <Link to={dashboardHome} className="flex items-center gap-3">
                            <img src="/assets/logo.png" alt="EdgeStone" className="h-8 w-auto object-contain" />
                            <div className="hidden sm:block border-l border-gray-200 pl-3">
                                <span className="text-xs font-bold text-brand-red uppercase tracking-wider block">EdgeStone NOC Suite</span>
                                <span className="text-sm font-bold text-gray-900 tracking-tight">System Manual & Operational Guide</span>
                            </div>
                        </Link>

                        <div className="flex items-center gap-3">
                            {/* Standalone Search Bar */}
                            <div className="relative w-44 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search manual..."
                                    className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/5 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={handlePrint}
                                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-2xs"
                                title="Print or Save as PDF"
                            >
                                <Printer size={15} className="text-gray-500" />
                                <span>Print / PDF</span>
                            </button>

                            <button
                                onClick={() => navigate(dashboardHome)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-red hover:bg-red-600 rounded-xl transition-all shadow-xs"
                            >
                                <span>Dashboard</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {/* Clean Sub-Header Toolbar (Role Filtering & Document Info) */}
            <div className="bg-white border-b border-gray-100 flex-shrink-0 z-10 print:hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    
                    {/* Role Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-hide py-0.5">
                        <span className="text-xs font-semibold text-gray-400 mr-1.5 shrink-0">Filter:</span>
                        {[
                            { id: 'all', label: 'All Roles' },
                            { id: 'Super admin', label: 'Super Admin' },
                            { id: 'Manager', label: 'Manager' },
                            { id: 'Support crew', label: 'Support Crew' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedRole(tab.id as any)}
                                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all shrink-0 ${
                                    selectedRole === tab.id
                                        ? 'bg-brand-red text-white shadow-2xs'
                                        : 'bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200/60'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Right side status & action */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200/80 font-medium">
                            Role: <strong className="text-gray-800">{userRole}</strong>
                        </span>

                        {embedded && (
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-2xs"
                                title="Print or Save as PDF"
                            >
                                <Printer size={13} className="text-gray-500" />
                                <span>Print Manual</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    
                    {/* Document Intro Card */}
                    <div className="bg-white p-6 sm:p-7 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand-red">
                                        NOC Operations & Knowledge Base
                                    </span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-xs font-medium text-gray-500">Official Operational Guide</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                                    EdgeStone Service Desk & Telecom Manual
                                </h1>
                                <p className="mt-1.5 text-xs sm:text-sm text-gray-500 max-w-3xl leading-relaxed">
                                    Standard Operating Procedures (SOP), architectural overview, role authority matrices, and step-by-step guides for managing leased circuits, client tickets, upstream carrier escalations, SLA audits, and shift handovers.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* Left Sticky Table of Contents (Hidden in print) */}
                        <aside className="lg:col-span-3 sticky top-6 bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 max-h-[calc(100vh-8rem)] overflow-y-auto hidden lg:block print:hidden">
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <BookOpen size={14} className="text-brand-red" />
                                    Table of Contents
                                </span>
                                <span className="text-[11px] font-semibold text-gray-400">{filteredSections.length} sections</span>
                            </div>

                            <nav className="space-y-1">
                                {filteredSections.map(sec => {
                                    const Icon = sec.icon;
                                    const isActive = activeSection === sec.id;
                                    return (
                                        <button
                                            key={sec.id}
                                            onClick={() => scrollToSection(sec.id)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-all text-left ${
                                                isActive
                                                    ? 'bg-red-50 text-brand-red font-bold'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Icon size={14} className={isActive ? 'text-brand-red shrink-0' : 'text-gray-400 shrink-0'} />
                                            <span className="truncate">{sec.title}</span>
                                        </button>
                                    );
                                })}
                            </nav>

                            <div className="mt-5 pt-3.5 border-t border-gray-100">
                                <div className="bg-red-50/60 border border-red-100 rounded-xl p-3 text-xs">
                                    <p className="font-bold text-brand-red flex items-center gap-1.5 mb-1 text-[11px]">
                                        <AlertTriangle size={13} />
                                        NOC Escalation Hotline
                                    </p>
                                    <p className="text-gray-600 text-[11px] leading-relaxed">
                                        For critical system outages, reach the 24/7 Operations Command via emergency intercom or on-call manager.
                                    </p>
                                </div>
                            </div>
                        </aside>

                        {/* Right Content Area */}
                        <main className="lg:col-span-9 space-y-6">

                            {/* SECTION 1: EXECUTIVE OVERVIEW & ARCHITECTURE */}
                            <section id="intro" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-red-50 text-brand-red flex items-center justify-center font-bold">
                                        <Layers size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">1. Executive Overview & Architecture</h2>
                                        <p className="text-xs text-gray-500 font-medium">Core purpose, design principles, and system workflow.</p>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-4">
                                    <p className="leading-relaxed">
                                        <strong>EdgeStone Service Desk</strong> is a Network Operations Center (NOC) and ticketing system engineered for telecom service providers, managed ISP operators, and IT teams managing customer leased circuits and strict Service Level Agreements (SLAs).
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-4">
                                        <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                                            <div className="text-brand-red font-bold text-xs mb-1 flex items-center gap-1.5">
                                                <Zap size={14} /> Circuit-Aware Ticketing
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                Tickets link directly to Customer Circuit IDs and Supplier Circuit IDs, eliminating manual carrier lookups during network outages.
                                            </p>
                                        </div>

                                        <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                                            <div className="text-brand-red font-bold text-xs mb-1 flex items-center gap-1.5">
                                                <ShieldCheck size={14} /> Dual-Stream Messaging
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                Keeps client communication threads distinct from upstream carrier escalations while preserving a consolidated audit log.
                                            </p>
                                        </div>

                                        <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                                            <div className="text-brand-red font-bold text-xs mb-1 flex items-center gap-1.5">
                                                <Clock size={14} /> Automated SLA Compliance
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                Calculates First Response Time (FRT) and Resolution Time in real-time, with penalty compensation computation.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/70 p-5 rounded-xl border border-gray-200/80">
                                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Network size={15} className="text-brand-red" />
                                            High-Level Incident Lifecycle Flow
                                        </h4>
                                        <p className="text-xs text-gray-500 mb-3">
                                            When an incident occurs, operations progress through four coordinated steps:
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-center">
                                            <div className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs">
                                                <span className="text-[10px] font-bold uppercase text-brand-red block mb-0.5">Step 1</span>
                                                <span className="text-xs font-bold text-gray-800 block">Incident Ingestion</span>
                                                <span className="text-[11px] text-gray-500 mt-0.5 block">Email ingestion or manual creation</span>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs">
                                                <span className="text-[10px] font-bold uppercase text-brand-red block mb-0.5">Step 2</span>
                                                <span className="text-xs font-bold text-gray-800 block">Circuit Correlation</span>
                                                <span className="text-[11px] text-gray-500 mt-0.5 block">Binds Customer & Supplier Circuit IDs</span>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs">
                                                <span className="text-[10px] font-bold uppercase text-brand-red block mb-0.5">Step 3</span>
                                                <span className="text-xs font-bold text-gray-800 block">Dual Escalation</span>
                                                <span className="text-[11px] text-gray-500 mt-0.5 block">Client update + Carrier escalation</span>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs">
                                                <span className="text-[10px] font-bold uppercase text-brand-red block mb-0.5">Step 4</span>
                                                <span className="text-xs font-bold text-gray-800 block">Audit & Handover</span>
                                                <span className="text-[11px] text-gray-500 mt-0.5 block">SLA evaluation & shift handover notes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 2: ACCESS & AUTHENTICATION */}
                            <section id="auth-security" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                        <Key size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">2. Access & Authentication Protocol</h2>
                                        <p className="text-xs text-gray-500 font-medium">Session management, credential safety, and self-service recovery.</p>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-4">
                                    <p className="leading-relaxed">
                                        Access to EdgeStone is restricted to authenticated operators. The system utilizes stateless JSON Web Token (JWT) authorization backed by client-side storage.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                            <h4 className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-1.5">
                                                <UserCheck size={14} className="text-emerald-600" />
                                                Signing In & Sessions
                                            </h4>
                                            <ul className="text-xs space-y-2 list-disc list-inside text-gray-600">
                                                <li>Navigate to <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 text-[11px]">/login</code> and enter your company email and password.</li>
                                                <li>Upon verification, a session token is issued and your profile is loaded.</li>
                                                <li>You are redirected directly to your assigned dashboard at <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 text-[11px]">/dashboard/:id/overview</code>.</li>
                                                <li>Expired sessions or 401 Unauthorized errors automatically redirect to the login screen.</li>
                                            </ul>
                                        </div>

                                        <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                            <h4 className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-1.5">
                                                <AlertTriangle size={14} className="text-amber-500" />
                                                Password Reset Procedure
                                            </h4>
                                            <ul className="text-xs space-y-2 list-disc list-inside text-gray-600">
                                                <li>Click <strong>Forgot Password?</strong> on the login screen or navigate to <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 text-[11px]">/reset-password</code>.</li>
                                                <li>Provide your registered operator email address to receive a secure recovery code.</li>
                                                <li>Input your verification token and define a new secure password.</li>
                                                <li>A <strong>Super Admin</strong> can also reset any operator’s password directly from the <em>Assign Agents</em> screen.</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                                        <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold">Security Notice: </span>
                                            Operators must never share login credentials. Every ticket reply, note edit, and circuit modification is logged under the active operator’s account.
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 3: ROLES & PERMISSIONS MATRIX */}
                            <section id="roles-matrix" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">3. User Roles & Permissions Matrix</h2>
                                        <p className="text-xs text-gray-500 font-medium">Division of operational authority across system roles.</p>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-4">
                                    <p className="leading-relaxed">
                                        The platform enforces Role-Based Access Control (RBAC) with three primary privilege tiers:
                                    </p>

                                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
                                                <tr>
                                                    <th className="p-3">Capability / Functional Scope</th>
                                                    <th className="p-3 text-center text-purple-700 bg-purple-50/40">Super Admin</th>
                                                    <th className="p-3 text-center text-blue-700 bg-blue-50/40">Operations Manager</th>
                                                    <th className="p-3 text-center text-emerald-700 bg-emerald-50/40">Support Crew</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                <tr className="hover:bg-gray-50/60">
                                                    <td className="p-3 font-medium text-gray-800">Access Overview Analytics & Charts</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                </tr>
                                                <tr className="hover:bg-gray-50/60">
                                                    <td className="p-3 font-medium text-gray-800">View, Reply, and Triage Tickets</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                </tr>
                                                <tr className="hover:bg-gray-50/60">
                                                    <td className="p-3 font-medium text-gray-800">Add / Edit Circuits Inventory</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                    <td className="p-3 text-center text-gray-400">View Only</td>
                                                </tr>
                                                <tr className="hover:bg-gray-50/60">
                                                    <td className="p-3 font-medium text-gray-800">Manage Clients & Vendor Escalations</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                    <td className="p-3 text-center text-gray-400">Restricted</td>
                                                </tr>
                                                <tr className="hover:bg-gray-50/60">
                                                    <td className="p-3 font-medium text-gray-800">Configure SLA Rules & Export Sheets</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                    <td className="p-3 text-center text-gray-400">View / Audit</td>
                                                </tr>
                                                <tr className="hover:bg-gray-50/60">
                                                    <td className="p-3 font-medium text-gray-800">Provision Agents & Assign Passwords</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Exclusive</td>
                                                    <td className="p-3 text-center text-red-500 font-bold">✖ No Access</td>
                                                    <td className="p-3 text-center text-red-500 font-bold">✖ No Access</td>
                                                </tr>
                                                <tr className="hover:bg-gray-50/60">
                                                    <td className="p-3 font-medium text-gray-800">Delete Records (Tickets, Circuits, Clients)</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Allowed</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Allowed</td>
                                                    <td className="p-3 text-center text-red-500 font-bold">✖ Blocked</td>
                                                </tr>
                                                <tr className="hover:bg-gray-50/60">
                                                    <td className="p-3 font-medium text-gray-800">Shift Handover & Sticky Notes Tool</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                    <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 4: END-TO-END INCIDENT LIFECYCLE */}
                            <section id="lifecycle-flow" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-red-50 text-brand-red flex items-center justify-center font-bold">
                                        <Network size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">4. End-to-End Incident Lifecycle</h2>
                                        <p className="text-xs text-gray-500 font-medium">Standard 6-stage operational flow from outage alarm to resolution.</p>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-4">
                                    <p className="leading-relaxed">
                                        Follow this standard 6-stage lifecycle for all incoming service tickets and network events:
                                    </p>

                                    <div className="space-y-3">
                                        {/* Phase 1 */}
                                        <div className="flex gap-3.5 p-3.5 rounded-xl bg-gray-50/80 border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-red-50 text-brand-red border border-red-200 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                1
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-xs mb-1">Incident Ingestion & Dispatch</h4>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    Tickets enter via automated email ingestion or are created manually. The system assigns a unique ticket ID (e.g. <code>#1024</code>), starts the SLA countdown clock, and sounds an audible alert to active agents.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Phase 2 */}
                                        <div className="flex gap-3.5 p-3.5 rounded-xl bg-gray-50/80 border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                2
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-xs mb-1">Triage & Priority Assignment</h4>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    The NOC triage engineer inspects the ticket in the <strong>Open</strong> tab, assesses severity, and sets the priority:
                                                    <span className="font-semibold text-red-600 ml-1">Critical</span>,
                                                    <span className="font-semibold text-amber-600 ml-1">High</span>,
                                                    <span className="font-semibold text-blue-600 ml-1">Medium</span>, or
                                                    <span className="font-semibold text-gray-600 ml-1">Low</span>.
                                                    Ticket status transitions to <strong>In Progress</strong>.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Phase 3 */}
                                        <div className="flex gap-3.5 p-3.5 rounded-xl bg-gray-50/80 border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                3
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-xs mb-1">Circuit Correlation</h4>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    In the ticket sidebar, match and link the Customer Circuit ID. The system displays the <strong>Supplier Circuit ID</strong>, carrier contact hotline, protection mode, and vendor contract terms immediately.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Phase 4 */}
                                        <div className="flex gap-3.5 p-3.5 rounded-xl bg-gray-50/80 border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                4
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-xs mb-1">Dual-Track Communication</h4>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    Communicate across two isolated tracks:
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                                                    <div className="p-2.5 bg-white rounded-lg border border-gray-200 text-xs">
                                                        <strong className="text-blue-700 block mb-0.5">Client Track</strong>
                                                        First Response acknowledgement, status updates, and estimated resolution times.
                                                    </div>
                                                    <div className="p-2.5 bg-white rounded-lg border border-gray-200 text-xs">
                                                        <strong className="text-brand-red block mb-0.5">Vendor Track</strong>
                                                        Outage escalation to upstream carriers (e.g. Tata, Airtel) with carrier #V-ticket reference.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Phase 5 */}
                                        <div className="flex gap-3.5 p-3.5 rounded-xl bg-gray-50/80 border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                5
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-xs mb-1">Restoration Verification & RFO</h4>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    Once the link is restored, verify ping stability and BGP session health. Log the Reason For Outage (RFO) in an internal note and request client confirmation.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Phase 6 */}
                                        <div className="flex gap-3.5 p-3.5 rounded-xl bg-gray-50/80 border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                6
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-xs mb-1">Ticket Closure & SLA Commit</h4>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    Mark ticket status as <strong>Closed</strong>. The SLA engine stops the timer, determines compliance (<em>Safe</em> or <em>Breached</em>), calculates any penalty credits due, and updates the historical audit record.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 5: ANALYTICS & DASHBOARD OVERVIEW */}
                            <section id="dashboard-overview" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                        <Activity size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">5. Analytics & Dashboard Overview (<code className="text-brand-red text-sm">/overview</code>)</h2>
                                        <p className="text-xs text-gray-500 font-medium">Real-time indicators, operational metrics, and trend charts.</p>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-4">
                                    <p className="leading-relaxed">
                                        The Overview screen provides real-time visibility into overall system workload, active incidents, and circuit stability.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                                            <span className="text-xs font-semibold text-gray-400 block mb-1">Total Incidents</span>
                                            <span className="text-xl font-extrabold text-gray-800 block">All Tickets</span>
                                            <p className="text-[11px] text-gray-400 mt-0.5">Aggregated count across all statuses.</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                                            <span className="text-xs font-semibold text-amber-600 block mb-1">Pending Action</span>
                                            <span className="text-xl font-extrabold text-gray-800 block">Open & In Progress</span>
                                            <p className="text-[11px] text-gray-400 mt-0.5">Active tickets requiring agent diagnosis.</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                                            <span className="text-xs font-semibold text-emerald-600 block mb-1">Resolved Today</span>
                                            <span className="text-xl font-extrabold text-gray-800 block">Closed</span>
                                            <p className="text-[11px] text-gray-400 mt-0.5">Confirmed restored within current shift cycle.</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                                            <span className="text-xs font-semibold text-brand-red block mb-1">SLA Health</span>
                                            <span className="text-xl font-extrabold text-gray-800 block">Compliance %</span>
                                            <p className="text-[11px] text-gray-400 mt-0.5">Tickets resolved within contractual limits.</p>
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-gray-900 text-xs mt-4 mb-2">Key Dashboard Widgets:</h4>
                                    <ul className="text-xs space-y-2 list-disc list-inside text-gray-600">
                                        <li><strong>Incident Volume Area Chart:</strong> Visualizes hourly incident spikes. Useful for correlating peak alarm hours with carrier fiber cuts or maintenance windows.</li>
                                        <li><strong>Daily Circuit Incident Summary Table:</strong> Grouped summary of circuits that experienced interruptions during the current Indian Standard Time (IST) calendar day.</li>
                                        <li><strong>Date Navigator:</strong> Step through past days to review historical shift performance and SLA compliance.</li>
                                    </ul>
                                </div>
                            </section>

                            {/* SECTION 6: TICKETS & CONVERSATION CONSOLE */}
                            <section id="ticket-management" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center font-bold">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">6. Tickets & Conversation Console (<code className="text-brand-red text-sm">/tickets</code>)</h2>
                                        <p className="text-xs text-gray-500 font-medium">Ticket list filtering, composer, internal notes, and attachments.</p>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-4">
                                    <p className="leading-relaxed">
                                        The Tickets module is the central workspace for shift agents, split into the <strong>Ticket Directory List</strong> and the <strong>Ticket Detail & Composer Console</strong>.
                                    </p>

                                    <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                        <h4 className="font-bold text-gray-900 text-xs mb-2">Ticket Status Tabs & Filters</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                                            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                                                <strong className="text-gray-800">Open</strong>
                                                <p className="text-[11px] text-gray-500 mt-0.5">Newly received tickets waiting for diagnosis.</p>
                                            </div>
                                            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                                                <strong className="text-blue-600">In Progress</strong>
                                                <p className="text-[11px] text-gray-500 mt-0.5">Active investigation or carrier escalation.</p>
                                            </div>
                                            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                                                <strong className="text-emerald-600">Closed</strong>
                                                <p className="text-[11px] text-gray-500 mt-0.5">Restored tickets with verified confirmation.</p>
                                            </div>
                                            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                                                <strong className="text-amber-600">Maintenance</strong>
                                                <p className="text-[11px] text-gray-500 mt-0.5">Scheduled vendor or client maintenance window.</p>
                                            </div>
                                            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                                                <strong className="text-gray-500">Spam / Junk</strong>
                                                <p className="text-[11px] text-gray-500 mt-0.5">Automated loops marked as non-operational.</p>
                                            </div>
                                            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                                                <strong className="text-gray-700">Others</strong>
                                                <p className="text-[11px] text-gray-500 mt-0.5">General inquiries and informational bulletins.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-gray-900 text-xs mt-4 mb-2">Key Conversation Features:</h4>
                                    <div className="space-y-2.5 text-xs">
                                        <div className="flex items-start gap-3 p-3 bg-gray-50/80 border border-gray-100 rounded-xl">
                                            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                                                <Users size={15} />
                                            </div>
                                            <div>
                                                <strong className="text-gray-900 block mb-0.5">Client Reply vs Vendor Reply Tabs</strong>
                                                <p className="text-gray-600 leading-relaxed">
                                                    Toggle between the <strong>Client</strong> tab to reply directly to customer contacts and the <strong>Vendor</strong> tab to escalate with upstream telecom carriers. The system maintains clean correspondence threads.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 bg-gray-50/80 border border-gray-100 rounded-xl">
                                            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                                                <Edit3 size={15} />
                                            </div>
                                            <div>
                                                <strong className="text-gray-900 block mb-0.5">Internal Private Notes</strong>
                                                <p className="text-gray-600 leading-relaxed">
                                                    Mark replies as <em>Internal Notes</em> to record traceroutes, diagnostics, and engineering observations visible only to internal team members.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-3 bg-gray-50/80 border border-gray-100 rounded-xl">
                                            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                                                <Download size={15} />
                                            </div>
                                            <div>
                                                <strong className="text-gray-900 block mb-0.5">Attachments & Email Autocomplete</strong>
                                                <p className="text-gray-600 leading-relaxed">
                                                    Attach diagnostic logs, OTDR traces, or screenshots directly into replies. Autocomplete suggests verified emails for selected clients and carriers.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 7: TELECOM CIRCUITS MANAGEMENT */}
                            <section id="circuits-inventory" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                        <Zap size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">7. Telecom Circuits Management (<code className="text-brand-red text-sm">/circuits</code>)</h2>
                                        <p className="text-xs text-gray-500 font-medium">Customer IDs, carrier IDs, protection schemes, and commercial attributes.</p>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-4">
                                    <p className="leading-relaxed">
                                        The Circuits module maintains an authoritative inventory of all customer links, linking customer identifiers with carrier backend tags.
                                    </p>

                                    <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 space-y-2 text-xs">
                                        <h4 className="font-bold text-gray-900 mb-2">Essential Circuit Parameters:</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div className="p-3 bg-white rounded-lg border border-gray-200">
                                                <strong className="text-gray-900 block">Customer Circuit ID</strong>
                                                <span className="text-gray-500 text-[11px]">The link identifier referenced by the client in SLAs and requests.</span>
                                            </div>
                                            <div className="p-3 bg-white rounded-lg border border-gray-200">
                                                <strong className="text-gray-900 block">Supplier Circuit ID</strong>
                                                <span className="text-gray-500 text-[11px]">Backend identifier assigned by the wholesale carrier (e.g. Tata, Lumen).</span>
                                            </div>
                                            <div className="p-3 bg-white rounded-lg border border-gray-200">
                                                <strong className="text-gray-900 block">Protection Type</strong>
                                                <span className="text-gray-500 text-[11px]"><code>PROTECTED</code> (Automatic redundant failover) or <code>UNPROTECTED</code>.</span>
                                            </div>
                                            <div className="p-3 bg-white rounded-lg border border-gray-200">
                                                <strong className="text-gray-900 block">Commercials (MRC & NRC)</strong>
                                                <span className="text-gray-500 text-[11px]">Monthly Recurring Charges (MRC) and Non-Recurring Charges (NRC).</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900">
                                        <h5 className="font-bold mb-1 flex items-center gap-1.5">
                                            <Info size={14} /> Multi-Vendor Circuit Handling
                                        </h5>
                                        <p className="leading-relaxed">
                                            When a composite customer link spans multiple upstream suppliers (e.g. local loop on Carrier A, backhaul on Carrier B), flag the circuit as <strong>Multi-Vendor</strong> to link multiple supplier legs to one primary Customer Circuit ID.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 8: CLIENTS DIRECTORY */}
                            <section id="clients-directory" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                        <Users size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">8. Clients Directory & Accounts (<code className="text-brand-red text-sm">/clients</code>)</h2>
                                        <p className="text-xs text-gray-500 font-medium">Enterprise account directory, contact distribution lists, and active assets.</p>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-4">
                                    <p className="leading-relaxed">
                                        The Clients directory stores profiles for enterprise customers, ensuring incoming emails are accurately mapped to the corresponding company and its assigned circuits.
                                    </p>

                                    <ul className="text-xs space-y-2 list-disc list-inside text-gray-600">
                                        <li><strong>Multi-Email Distribution Lists:</strong> Add multiple contact emails for each client company. Inbound messages from any registered address are automatically linked.</li>
                                        <li><strong>Expandable Row Inventory:</strong> Click on any client row to view active circuits, historical ticket counts, and contract status.</li>
                                        <li><strong>Role Access:</strong> Managed by <em>Super Admins</em> and <em>Managers</em>. Agents can view client contact information but cannot alter accounts.</li>
                                    </ul>
                                </div>
                            </section>

                            {/* SECTION 9: VENDORS & CARRIER ESCALATIONS */}
                            <section id="vendors-directory" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                                        <Building2 size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">9. Vendors & Carrier Escalations (<code className="text-brand-red text-sm">/vendors</code>)</h2>
                                        <p className="text-xs text-gray-500 font-medium">Telecom carriers, L1-L3 escalation contacts, and vendor ticket coordination.</p>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-4">
                                    <p className="leading-relaxed">
                                        When an outage stems from an upstream fiber cut or core transit issue, rapid escalation to the infrastructure provider is critical. The Vendors module organizes carrier contacts into actionable escalation levels.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                        <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                                            <strong className="text-gray-900 block mb-1">Level 1: NOC Helpdesk</strong>
                                            <p className="text-gray-500">Initial ticket opening email and 24/7 hotline telephone number for logging trouble tickets.</p>
                                        </div>
                                        <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                                            <strong className="text-gray-900 block mb-1">Level 2: Shift Duty Manager</strong>
                                            <p className="text-gray-500">Escalation path activated when response time from the carrier exceeds 60 minutes for high-priority outages.</p>
                                        </div>
                                        <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                                            <strong className="text-gray-900 block mb-1">Level 3: Regional Engineering</strong>
                                            <p className="text-gray-500">Executive escalation for prolonged fiber cuts, equipment outages, or major disaster scenarios.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 10: SLA ENGINE & COMPLIANCE */}
                            <section id="sla-engine" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-red-50 text-brand-red flex items-center justify-center font-bold">
                                        <Clock size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">10. SLA Engine & Compliance Audits (<code className="text-brand-red text-sm">/sla</code>)</h2>
                                        <p className="text-xs text-gray-500 font-medium">Response and resolution targets, breach detection, and penalty reporting.</p>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-4">
                                    <p className="leading-relaxed">
                                        EdgeStone features an automated SLA audit engine configured around Indian Standard Time (IST) operational shifts.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl">
                                            <span className="font-bold text-emerald-800 block text-xs mb-1">Status: SAFE</span>
                                            <p className="text-emerald-700">The ticket was diagnosed, escalated, and resolved within contractual resolution targets.</p>
                                        </div>
                                        <div className="p-3.5 bg-red-50/80 border border-red-200/80 rounded-xl">
                                            <span className="font-bold text-red-800 block text-xs mb-1">Status: BREACHED</span>
                                            <p className="text-red-700">Resolution time exceeded the contractual limit. Compensation penalty deductions apply.</p>
                                        </div>
                                        <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
                                            <span className="font-bold text-gray-800 block text-xs mb-1">Status: NO SLA</span>
                                            <p className="text-gray-600">Applied to vendor-only tickets or informational inquiries exempt from customer uptime credits.</p>
                                        </div>
                                    </div>

                                    <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100 text-xs space-y-1.5">
                                        <h5 className="font-bold text-gray-900">Exporting SLA Reports:</h5>
                                        <p className="text-gray-600 leading-relaxed">
                                            Click the <strong>Reports / Export</strong> button on the SLA page to download formatted CSV reports showing start times, close dates, duration, breach status, and compensation totals for monthly billing reconciliations.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 11: AGENT WORKFORCE MANAGEMENT */}
                            <section id="agent-management" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                        <Sliders size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">11. Team Workforce & Agent Admin (<code className="text-brand-red text-sm">/assign-agents</code>)</h2>
                                        <p className="text-xs text-gray-500 font-medium">Super Admin only: staff provisioning, role tiers, and password resets.</p>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-4">
                                    <p className="leading-relaxed">
                                        The Assign Agents screen is accessible exclusively to <strong>Super Admins</strong> for managing the engineering roster:
                                    </p>

                                    <ul className="text-xs space-y-2 list-disc list-inside text-gray-600">
                                        <li><strong>Creating Accounts:</strong> Click <em>Add Agent</em>, specify their full name (first and last name required), corporate email, role tier, and password.</li>
                                        <li><strong>Workload Balancing:</strong> Monitor active open ticket counts beside each agent to prevent overload during peak shifts.</li>
                                        <li><strong>Status Management:</strong> Set an agent to <em>Inactive</em> upon contract completion or shift handover to remove them from ticket assignment queues.</li>
                                    </ul>
                                </div>
                            </section>

                            {/* SECTION 12: NOC PRODUCTIVITY SUITE */}
                            <section id="noc-utilities" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                        <Headphones size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">12. NOC Productivity Suite & Built-in Utilities</h2>
                                        <p className="text-xs text-gray-500 font-medium">Real-time alerts, shift handover notepad, calculator, and roadmap.</p>
                                    </div>
                                </div>

                                <div className="text-sm text-gray-600 space-y-4">
                                    <p className="leading-relaxed">
                                        Built-in utilities accessible from the floating action menu (bottom-right of the dashboard):
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                                        <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-2 text-brand-red font-bold text-xs mb-1">
                                                <Bell size={15} /> Real-Time Push Alerts & Chimes
                                            </div>
                                            <p className="text-gray-600 leading-relaxed">
                                                Connected via Server-Sent Events (SSE). Plays an audible chime whenever a client replies or when a new high-priority ticket arrives.
                                            </p>
                                        </div>

                                        <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-2 text-amber-600 font-bold text-xs mb-1">
                                                <Edit3 size={15} /> Shift Handover (Sticky Note)
                                            </div>
                                            <p className="text-gray-600 leading-relaxed">
                                                Shared persistent notepad for logging priority watches, unacknowledged tickets, and handover notes between shifts.
                                            </p>
                                        </div>

                                        <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-2 text-gray-800 font-bold text-xs mb-1">
                                                <Calculator size={15} /> Scientific & Bandwidth Calculator
                                            </div>
                                            <p className="text-gray-600 leading-relaxed">
                                                Floating tool for quick bandwidth math (Mbps to Gbps conversions, packet rates, and monthly uptime calculations).
                                            </p>
                                        </div>

                                        <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs mb-1">
                                                <Network size={15} /> Topological Ticket Roadmap (<Link to="/roadmap" className="underline font-bold">/roadmap</Link>)
                                            </div>
                                            <p className="text-gray-600 leading-relaxed">
                                                Interactive graph illustrating relationships between circuits, open tickets, SLAs, and active conversation threads.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 13: STEP-BY-STEP SOP PLAYBOOKS */}
                            <section id="sop-guides" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                        <CheckCircle2 size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">13. Standard Operating Procedure (SOP) Playbooks</h2>
                                        <p className="text-xs text-gray-500 font-medium">Walkthroughs for common operational scenarios.</p>
                                    </div>
                                </div>

                                <div className="space-y-3.5 text-xs">
                                    {/* Playbook 1 */}
                                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/80">
                                        <h4 className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-2">
                                            <span className="w-4 h-4 rounded-full bg-red-100 text-brand-red flex items-center justify-center text-[10px] font-black">A</span>
                                            SOP: Major Fiber Cut / Circuit Down Alarm
                                        </h4>
                                        <ol className="list-decimal list-inside space-y-1.5 text-gray-600 ml-1">
                                            <li>Locate ticket in <strong>Open</strong> tab; inspect alarms and descriptions.</li>
                                            <li>Assign ticket to yourself and switch status to <strong>In Progress</strong>.</li>
                                            <li>Send a <strong>Client Reply</strong> acknowledging the issue within the First Response Time (FRT) window.</li>
                                            <li>In ticket sidebar, match Customer Circuit ID to fetch Supplier Circuit ID and carrier details.</li>
                                            <li>Switch to <strong>Vendor</strong> tab, dispatch escalation to carrier NOC, and record their #V-ticket reference.</li>
                                            <li>Log ping/traceroute diagnostic results in an <strong>Internal Note</strong>.</li>
                                            <li>Verify continuity upon carrier restoration and confirm with client before closing.</li>
                                        </ol>
                                    </div>

                                    {/* Playbook 2 */}
                                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/80">
                                        <h4 className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-2">
                                            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-black">B</span>
                                            SOP: Scheduled Maintenance Window Handling
                                        </h4>
                                        <ol className="list-decimal list-inside space-y-1.5 text-gray-600 ml-1">
                                            <li>When an upstream carrier announces planned maintenance, create or locate the ticket.</li>
                                            <li>Set ticket status directly to <strong>Maintenance</strong>.</li>
                                            <li>Link affected customer circuit IDs.</li>
                                            <li>Tickets under Maintenance status are exempt from false SLA breach penalization.</li>
                                            <li>Post-maintenance, verify circuits return to active status and transition to <strong>Closed</strong>.</li>
                                        </ol>
                                    </div>

                                    {/* Playbook 3 */}
                                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/80">
                                        <h4 className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-2">
                                            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">C</span>
                                            SOP: Shift Change Handover Protocol
                                        </h4>
                                        <ol className="list-decimal list-inside space-y-1.5 text-gray-600 ml-1">
                                            <li>15 minutes prior to shift end, review all open and in-progress tickets.</li>
                                            <li>Open the floating <strong>Shift Handover</strong> notepad.</li>
                                            <li>Record ticket ID, circuit ID, current carrier ETA, and required next action.</li>
                                            <li>Conduct verbal or chat review with the incoming shift lead before ending session.</li>
                                        </ol>
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 14: TROUBLESHOOTING & FAQS */}
                            <section id="faqs" className="scroll-mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                                    <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
                                        <HelpCircle size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">14. Troubleshooting & Frequently Asked Questions (FAQ)</h2>
                                        <p className="text-xs text-gray-500 font-medium">Common operational questions and edge cases.</p>
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    {[
                                        {
                                            id: 'faq-1',
                                            q: 'What happens if a customer replies to an already closed ticket?',
                                            a: 'The system automatically detects the reply and displays a high-visibility toast notification with an audible alert. The ticket re-appears in the active queue with the customer’s new message so follow-ups are never missed.'
                                        },
                                        {
                                            id: 'faq-2',
                                            q: 'Why does an agent see missing navigation items for Clients or SLA?',
                                            a: 'Access to master directories (Clients, Vendors, SLA Configuration, and Assign Agents) is governed by Role-Based Access Control. Standard Support Crew accounts are restricted to ticket handling and circuit lookups. Contact your Super Admin if your role tier requires elevation.'
                                        },
                                        {
                                            id: 'faq-3',
                                            q: 'How does the SLA engine calculate breach status when tickets span overnight?',
                                            a: 'SLA calculations use Indian Standard Time (IST) timestamps. For 24/7 mission-critical circuits, the countdown continues continuously. For business-hours-only circuits, the timer pauses outside configured business hours and resumes at the start of the next business day.'
                                        },
                                        {
                                            id: 'faq-4',
                                            q: 'How can I configure my personal email signature?',
                                            a: 'Click on your profile avatar in the sidebar and select "My Account". In the Signatures modal, compose your signature with contact information and designation. This will automatically populate when drafting ticket replies.'
                                        },
                                        {
                                            id: 'faq-5',
                                            q: 'What is the difference between Customer Circuit ID and Supplier Circuit ID?',
                                            a: 'A Customer Circuit ID is the service tag referenced on customer contracts and invoices. A Supplier Circuit ID is the identifier assigned by the upstream wholesale carrier (e.g. Airtel, Tata). EdgeStone links both so you can resolve issues quickly with both parties.'
                                        }
                                    ].map((item) => {
                                        const isOpen = expandedFaq === item.id;
                                        return (
                                            <div key={item.id} className="border border-gray-200/80 rounded-xl overflow-hidden bg-white">
                                                <button
                                                    onClick={() => toggleFaq(item.id)}
                                                    className="w-full flex items-center justify-between p-3.5 text-left font-semibold text-xs sm:text-sm text-gray-800 hover:text-brand-red transition-colors"
                                                >
                                                    <span>{item.q}</span>
                                                    <ChevronDown
                                                        size={15}
                                                        className={`text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-brand-red' : ''}`}
                                                    />
                                                </button>
                                                {isOpen && (
                                                    <div className="px-3.5 pb-3.5 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50/50">
                                                        {item.a}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Clean Document Signoff Box */}
                            <div className="p-5 sm:p-6 bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                                        <ShieldCheck size={15} className="text-brand-red" />
                                        EdgeStone NOC Suite • Operational Documentation
                                    </h4>
                                    <p className="text-[11px] text-gray-500">
                                        Developed and maintained by AeroTalk Engineering. All operational guidelines apply to active shifts.
                                    </p>
                                </div>
                                <button
                                    onClick={handlePrint}
                                    className="px-3.5 py-1.5 bg-brand-red hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs shrink-0 print:hidden"
                                >
                                    <Printer size={13} />
                                    <span>Export Printable Manual</span>
                                </button>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocsPage;
