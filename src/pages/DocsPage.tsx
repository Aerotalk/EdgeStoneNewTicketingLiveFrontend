import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

interface DocsPageProps {
    embedded?: boolean;
}

export const DocsPage: React.FC<DocsPageProps> = ({ embedded = false }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<'all' | 'Super admin' | 'Manager' | 'Support crew'>('all');
    const [activeSection, setActiveSection] = useState<string>('intro');
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

    // Filter roles
    const userRole = user?.role || 'Support crew';

    // Navigation sections definition
    const sections = [
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
    ];

    const filteredSections = useMemo(() => {
        return sections.filter(sec => {
            const matchesRole = selectedRole === 'all' || sec.role === 'all' || sec.role === selectedRole;
            const matchesSearch = !searchQuery.trim() || sec.title.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesRole && matchesSearch;
        });
    }, [selectedRole, searchQuery]);

    const handlePrint = () => {
        window.print();
    };

    const toggleFaq = (id: string) => {
        setExpandedFaq(prev => (prev === id ? null : id));
    };

    const dashboardHome = user?.id ? `/dashboard/${user.id}/overview` : '/login';

    return (
        <div className={`min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-brand-red selection:text-white ${embedded ? 'p-4 sm:p-8' : ''}`}>
            {/* Top Navigation Header (Always present; hidden in print) */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs print:hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link to={dashboardHome} className="flex items-center gap-3 group">
                            <img src="/assets/logo.png" alt="EdgeStone" className="h-9 w-auto object-contain transition-transform group-hover:scale-105" />
                            <div className="hidden sm:block border-l border-slate-200 pl-3">
                                <span className="text-xs font-bold text-brand-red uppercase tracking-wider block">EdgeStone NOC Suite</span>
                                <span className="text-sm font-extrabold text-slate-900 tracking-tight">System Manual & Operational Guide</span>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Search Bar */}
                        <div className="relative w-44 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search manual..."
                                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Print / Export PDF button */}
                        <button
                            onClick={handlePrint}
                            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
                            title="Print or Save as PDF"
                        >
                            <Printer size={15} className="text-slate-500" />
                            <span>Export PDF / Print</span>
                        </button>

                        {/* Back to Dashboard */}
                        <button
                            onClick={() => navigate(dashboardHome)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-brand-red hover:bg-red-600 active:scale-95 rounded-xl transition-all shadow-xs"
                        >
                            <span>Dashboard</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Sub-header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-800 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:text-black print:border-none print:py-2">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-red/20 text-red-300 border border-brand-red/30">
                                Enterprise Delivery Edition
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                Release v2.4
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Live System Document
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white print:text-slate-900">
                            EdgeStone Service Desk & Telecom Operations Manual
                        </h1>
                        <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed print:text-slate-600">
                            Comprehensive standard operating procedure (SOP), architectural blueprint, and end-user guide for managing telecom leased circuits, client support tickets, upstream ISP carrier escalations, SLA compliance, and 24/7 NOC shift handovers.
                        </p>
                    </div>

                    {/* Role Filter & User State */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 bg-slate-800/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/60 print:hidden shrink-0">
                        <div className="text-xs text-slate-400">
                            Logged in as: <strong className="text-white uppercase">{user?.name || 'Agent'}</strong> ({userRole})
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-300">Filter View by Role:</label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value as any)}
                                className="bg-slate-900 text-white text-xs font-semibold border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-red"
                            >
                                <option value="all">All Roles (Complete Manual)</option>
                                <option value="Super admin">Super Admin (System Governance)</option>
                                <option value="Manager">Operations Manager</option>
                                <option value="Support crew">Support Crew / NOC Agent</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Sticky Table of Contents (Hidden in print) */}
                    <aside className="lg:col-span-3 sticky top-24 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 overflow-hidden max-h-[calc(100vh-7rem)] overflow-y-auto hidden lg:block print:hidden">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <BookOpen size={14} className="text-brand-red" />
                                Table of Contents
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">{filteredSections.length} sections</span>
                        </div>
                        <nav className="space-y-1">
                            {filteredSections.map(sec => {
                                const Icon = sec.icon;
                                const isActive = activeSection === sec.id;
                                return (
                                    <a
                                        key={sec.id}
                                        href={`#${sec.id}`}
                                        onClick={() => setActiveSection(sec.id)}
                                        className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                                            isActive
                                                ? 'bg-brand-red text-white shadow-xs font-bold'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                                        <span className="truncate">{sec.title}</span>
                                    </a>
                                );
                            })}
                        </nav>

                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <div className="bg-red-50/70 border border-red-100 rounded-xl p-3 text-xs">
                                <p className="font-bold text-brand-red flex items-center gap-1.5 mb-1">
                                    <AlertTriangle size={14} />
                                    NOC Escalation Hotline
                                </p>
                                <p className="text-slate-600 text-[11px] leading-relaxed">
                                    For critical system outages, reach the EdgeStone 24/7 Operations Command via emergency intercom or on-call manager.
                                </p>
                            </div>
                        </div>
                    </aside>

                    {/* Right Content Area */}
                    <main className="lg:col-span-9 space-y-12">

                        {/* SECTION 1: EXECUTIVE OVERVIEW & ARCHITECTURE */}
                        <section id="intro" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-brand-red flex items-center justify-center font-bold">
                                    <Layers size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">1. Executive Overview & Architecture</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Core purpose, design goals, and system architecture.</p>
                                </div>
                            </div>

                            <div className="prose prose-slate max-w-none text-sm text-slate-600 space-y-4">
                                <p className="leading-relaxed">
                                    <strong>EdgeStone Ticketing & Telecom Management Portal</strong> is an enterprise-grade Network Operations Center (NOC) and Service Desk suite engineered by AeroTalk. It is tailored specifically for telecom service providers, managed ISP providers, and IT network operations teams who manage high-stakes leased circuits and strict client Service Level Agreements (SLAs).
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                                        <div className="text-brand-red font-bold text-sm mb-1 flex items-center gap-1.5">
                                            <Zap size={16} /> Circuit-Aware Ticketing
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Tickets are linked directly to Customer Circuit IDs and Supplier Circuit IDs, eliminating manual carrier lookups during network outages.
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                                        <div className="text-brand-red font-bold text-sm mb-1 flex items-center gap-1.5">
                                            <ShieldCheck size={16} /> Dual-Stream Messaging
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Segregates client communication threads from upstream ISP/carrier escalations while preserving a single consolidated audit trail.
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                                        <div className="text-brand-red font-bold text-sm mb-1 flex items-center gap-1.5">
                                            <Clock size={16} /> Strict SLA Compliance
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Automated real-time calculation of First Response Time (FRT) and Resolution Time with automatic breach penalty computation.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800">
                                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                        <Network size={16} className="text-brand-red" />
                                        High-Level Architectural Workflow
                                    </h4>
                                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                                        When an incident occurs, the lifecycle flows seamlessly across four coordinated planes:
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                                            <span className="text-[10px] font-black uppercase text-brand-red block mb-1">Step 1</span>
                                            <span className="text-xs font-bold text-white block">Incident Ingestion</span>
                                            <span className="text-[11px] text-slate-400 mt-1 block">Email parsing or manual portal creation</span>
                                        </div>
                                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                                            <span className="text-[10px] font-black uppercase text-brand-red block mb-1">Step 2</span>
                                            <span className="text-xs font-bold text-white block">Circuit Correlation</span>
                                            <span className="text-[11px] text-slate-400 mt-1 block">Binds Customer & Supplier Circuit IDs</span>
                                        </div>
                                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                                            <span className="text-[10px] font-black uppercase text-brand-red block mb-1">Step 3</span>
                                            <span className="text-xs font-bold text-white block">Dual Escalation</span>
                                            <span className="text-[11px] text-slate-400 mt-1 block">Client update + Carrier #V-ticket dispatch</span>
                                        </div>
                                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                                            <span className="text-[10px] font-black uppercase text-brand-red block mb-1">Step 4</span>
                                            <span className="text-xs font-bold text-white block">Audit & Handover</span>
                                            <span className="text-[11px] text-slate-400 mt-1 block">SLA evaluation & shift handover notes</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 2: ACCESS & AUTHENTICATION */}
                        <section id="auth-security" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                    <Key size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">2. Access & Authentication Protocol</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Session management, credential safety, and self-service recovery.</p>
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 space-y-4">
                                <p className="leading-relaxed">
                                    Access to the EdgeStone platform is restricted to authenticated enterprise operators. The system utilizes stateless JSON Web Token (JWT) authorization backed by secured client-side caching.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                                        <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                                            <UserCheck size={16} className="text-emerald-600" />
                                            Signing In & Session Storage
                                        </h4>
                                        <ul className="text-xs space-y-2 list-disc list-inside text-slate-600">
                                            <li>Navigate to <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">/login</code> and enter your company email and password.</li>
                                            <li>Upon verification, a session token is assigned and your profile details are restored.</li>
                                            <li>The user is redirected directly to their designated dashboard at <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">/dashboard/:id/overview</code>.</li>
                                            <li>Sessions that expire or encounter 401 Unauthorized automatically clear credentials and redirect to the login gateway.</li>
                                        </ul>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                                        <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                                            <AlertTriangle size={16} className="text-amber-500" />
                                            Password Reset Procedure
                                        </h4>
                                        <ul className="text-xs space-y-2 list-disc list-inside text-slate-600">
                                            <li>Click <strong>Forgot Password?</strong> on the login screen or navigate to <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">/reset-password</code>.</li>
                                            <li>Provide your registered operator email address to receive a secure recovery code.</li>
                                            <li>Input your verification token and define a new secure password adhering to corporate entropy policies.</li>
                                            <li>Alternatively, a <strong>Super Admin</strong> can reset any operator’s password directly from the <em>Assign Agents</em> console.</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
                                    <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold">Security Notice: </span>
                                        Operators must never share login credentials. Every ticket response, note modification, and circuit edit is tied permanently to the authenticated operator’s identity in the immutable audit trail.
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 3: ROLES & PERMISSIONS MATRIX */}
                        <section id="roles-matrix" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">3. User Roles & Permissions Matrix</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Clear division of operational authority across system roles.</p>
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 space-y-4">
                                <p className="leading-relaxed">
                                    The platform enforces Role-Based Access Control (RBAC) with three primary tiers of privilege:
                                </p>

                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                                            <tr>
                                                <th className="p-3.5">Capability / Functional Scope</th>
                                                <th className="p-3.5 text-center text-purple-700 bg-purple-50/50">Super Admin</th>
                                                <th className="p-3.5 text-center text-blue-700 bg-blue-50/50">Operations Manager</th>
                                                <th className="p-3.5 text-center text-emerald-700 bg-emerald-50/50">Support Crew / Agent</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-semibold text-slate-800">Access Overview Analytics & Charts</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-semibold text-slate-800">View, Reply, and Triage Tickets</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-semibold text-slate-800">Add / Edit Circuits Inventory</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                <td className="p-3 text-center text-slate-400">View Only</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-semibold text-slate-800">Manage Clients & Vendor Escalation Trees</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                <td className="p-3 text-center text-slate-400">Restricted</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-semibold text-slate-800">Configure SLA Rules & Thresholds</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Full</td>
                                                <td className="p-3 text-center text-slate-400">View / Audit</td>
                                                <td className="p-3 text-center text-slate-400">View / Audit</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-semibold text-slate-800">Provision Agents & Assign Passwords</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Exclusive</td>
                                                <td className="p-3 text-center text-red-500 font-bold">✖ No Access</td>
                                                <td className="p-3 text-center text-red-500 font-bold">✖ No Access</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-semibold text-slate-800">Delete Records (Tickets, Circuits, Clients)</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Allowed</td>
                                                <td className="p-3 text-center text-emerald-600 font-bold">✔ Allowed</td>
                                                <td className="p-3 text-center text-red-500 font-bold">✖ Blocked</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="p-3 font-semibold text-slate-800">Shift Handover & Sticky Notes Tool</td>
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
                        <section id="lifecycle-flow" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-brand-red flex items-center justify-center font-bold">
                                    <Network size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">4. End-to-End Incident Lifecycle (Step-by-Step Flow)</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">From initial outage alarm to verified circuit restoration.</p>
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 space-y-6">
                                <p className="leading-relaxed">
                                    The strength of EdgeStone lies in its disciplined, repeatable operational flow. Follow this 6-stage lifecycle for all incoming client service tickets and network events:
                                </p>

                                <div className="space-y-4">
                                    {/* Phase 1 */}
                                    <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                                        <div className="w-8 h-8 rounded-full bg-brand-red text-white flex items-center justify-center font-black text-xs shrink-0">
                                            1
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm mb-1">Incident Ingestion & Automatic Dispatch</h4>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                Tickets enter the system automatically via the email ingestion pipeline or are generated manually by an operator. The system assigns a unique ticket ID (e.g. <code>#1024</code>), activates the real-time SLA countdown clock according to the client’s SLA policy, and triggers desktop audio chime notifications to all online agents.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Phase 2 */}
                                    <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                                            2
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm mb-1">Triage, Categorization & Priority Assignment</h4>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                The NOC triage engineer inspects the ticket in the <strong>Open</strong> tab, assesses business severity, and sets the priority:
                                                <span className="inline-block mx-1 font-semibold text-red-600">Critical (Complete Circuit Down)</span>,
                                                <span className="inline-block mx-1 font-semibold text-amber-600">High (Packet Loss / Degradation)</span>,
                                                <span className="inline-block mx-1 font-semibold text-blue-600">Medium</span>, or
                                                <span className="inline-block mx-1 font-semibold text-slate-600">Low (Query / Request)</span>.
                                                Ticket status is transitioned to <strong>In Progress</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Phase 3 */}
                                    <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                                            3
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm mb-1">Circuit Correlation & Upstream Mapping</h4>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                In the ticket sidebar, the agent searches and links the customer's circuit. The platform instantly pulls the <strong>Supplier Circuit ID</strong>, carrier contact hotline, protection mode (Protected vs Unprotected), and supplier contract details, avoiding manual spreadsheet lookups.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Phase 4 */}
                                    <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                                            4
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm mb-1">Dual-Track Communication & Vendor Escalation</h4>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                The agent communicates across two isolated channels within the same ticket:
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                                                    <strong className="text-blue-700 block mb-1">Client Track (Customer Facing)</strong>
                                                    Provides First Response acknowledgement, diagnostic status, and periodic ETAs without exposing raw internal telemetry.
                                                </div>
                                                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                                                    <strong className="text-brand-red block mb-1">Vendor Track (Carrier Escalation)</strong>
                                                    Dispatches outage reports to upstream carriers (e.g. Tata, Airtel, Lumen) using their designated contact emails and links their #V-ticket reference number.
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Phase 5 */}
                                    <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                                            5
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm mb-1">Restoration Verification & Reason For Outage (RFO)</h4>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                Once physical fiber or logical routes are restored by the carrier, the agent performs ping latency checks and confirms BGP session stability. A clear Reason For Outage (RFO) is documented in the ticket notes, and the client is requested to confirm resolution.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Phase 6 */}
                                    <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                                            6
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm mb-1">Ticket Closure & SLA Audit Freezing</h4>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                Ticket status is set to <strong>Closed</strong>. The SLA engine freezes the resolution timer, evaluates final compliance against targets (marked as <em>Safe</em> or <em>Breached</em>), calculates any penalty credits due, and commits the record to the immutable audit database.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 5: ANALYTICS & DASHBOARD OVERVIEW */}
                        <section id="dashboard-overview" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">5. Analytics & Dashboard Overview (<code className="text-brand-red text-base">/overview</code>)</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Real-time health indicators, operational metrics, and trend charts.</p>
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 space-y-4">
                                <p className="leading-relaxed">
                                    The Overview screen is the mission-control dashboard for NOC team leads and managers. It provides continuous real-time visibility into overall system workload and circuit stability.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                                        <span className="text-xs font-bold text-slate-500 block mb-1">Total Incidents</span>
                                        <span className="text-2xl font-black text-slate-900 block">All Tickets</span>
                                        <p className="text-[11px] text-slate-500 mt-1">Aggregated count across all states and categories.</p>
                                    </div>
                                    <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/80">
                                        <span className="text-xs font-bold text-amber-700 block mb-1">Pending Action</span>
                                        <span className="text-2xl font-black text-amber-900 block">Open & In Progress</span>
                                        <p className="text-[11px] text-amber-700 mt-1">Currently active tickets requiring agent diagnosis.</p>
                                    </div>
                                    <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200/80">
                                        <span className="text-xs font-bold text-emerald-700 block mb-1">Resolved Today</span>
                                        <span className="text-2xl font-black text-emerald-900 block">Closed</span>
                                        <p className="text-[11px] text-emerald-700 mt-1">Tickets restored and confirmed within the current shift cycle.</p>
                                    </div>
                                    <div className="bg-red-50/70 p-4 rounded-xl border border-red-200/80">
                                        <span className="text-xs font-bold text-brand-red block mb-1">SLA Health</span>
                                        <span className="text-2xl font-black text-slate-900 block">Compliance %</span>
                                        <p className="text-[11px] text-slate-500 mt-1">Percentage of tickets resolved within strict contractual deadlines.</p>
                                    </div>
                                </div>

                                <h4 className="font-bold text-slate-900 text-sm mt-6 mb-2">Key Dashboard Widgets:</h4>
                                <ul className="text-xs space-y-2 list-disc list-inside text-slate-600">
                                    <li><strong>Incident Volume Area Chart:</strong> Visualizes hourly incident spikes. Useful for correlating peak alarm hours with carrier fiber cuts or maintenance windows.</li>
                                    <li><strong>Daily Circuit Incident Summary Table:</strong> Grouped summary of circuits that experienced interruptions during the current Indian Standard Time (IST) calendar day.</li>
                                    <li><strong>Interactive Date Navigator:</strong> Jump backward or forward across specific days to review shift performance and SLA compliance histories.</li>
                                </ul>
                            </div>
                        </section>

                        {/* SECTION 6: TICKETS & CONVERSATION CONSOLE */}
                        <section id="ticket-management" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center font-bold">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">6. Tickets & Conversation Console (<code className="text-brand-red text-base">/tickets</code>)</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Ticket list filtering, composer, internal notes, and attachments.</p>
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 space-y-4">
                                <p className="leading-relaxed">
                                    The Tickets module is the frontline operations hub where NOC agents spend the majority of their shifts. It is split into two integrated panels: the <strong>Ticket Directory List</strong> and the <strong>Ticket Detail & Composer Console</strong>.
                                </p>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                                    <h4 className="font-bold text-slate-900 text-sm mb-2">Ticket Status Tabs & Filters</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                            <strong className="text-slate-800">Open</strong>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Newly received tickets waiting for initial diagnosis.</p>
                                        </div>
                                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                            <strong className="text-blue-600">In Progress</strong>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Assigned and undergoing active investigation or carrier escalation.</p>
                                        </div>
                                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                            <strong className="text-emerald-600">Closed</strong>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Restored tickets with verified client confirmation.</p>
                                        </div>
                                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                            <strong className="text-amber-600">Maintenance</strong>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Scheduled vendor or client maintenance (exempt from SLA penalty).</p>
                                        </div>
                                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                            <strong className="text-slate-500">Spam / Junk</strong>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Marketing or automated email loops marked as non-operational.</p>
                                        </div>
                                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                            <strong className="text-slate-700">Others</strong>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Informational bulletins, receipts, and general inquiries.</p>
                                        </div>
                                    </div>
                                </div>

                                <h4 className="font-bold text-slate-900 text-sm mt-6 mb-2">Detailed Conversation View Capabilities:</h4>
                                <div className="space-y-3 text-xs">
                                    <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                                            <Users size={16} />
                                        </div>
                                        <div>
                                            <strong className="text-slate-900 text-xs block mb-0.5">Dual Tabs: Client Reply vs Vendor Reply</strong>
                                            <p className="text-slate-600 leading-relaxed">
                                                Toggle between the <strong>Client</strong> tab to reply directly to customer contacts and the <strong>Vendor</strong> tab to escalate with upstream telecom carriers. The system automatically formats headers and maintains clean correspondence threads.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                        <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                                            <Edit3 size={16} />
                                        </div>
                                        <div>
                                            <strong className="text-slate-900 text-xs block mb-0.5">Internal Private Notes (Shift Handovers & RFO Logs)</strong>
                                            <p className="text-slate-600 leading-relaxed">
                                                Mark a reply as an <em>Internal Note</em> to keep traceroutes, ping diagnostics, and sensitive engineering observations hidden from the client while sharing them with team members.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                                        <div className="p-2 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                                            <Download size={16} />
                                        </div>
                                        <div>
                                            <strong className="text-slate-900 text-xs block mb-0.5">File Attachments & Automated Email Suggestions</strong>
                                            <p className="text-slate-600 leading-relaxed">
                                                Attach diagnostic logs, OTDR optical trace images, or invoices directly into replies. Smart autocomplete suggests verified contact emails for selected clients and carriers.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 7: TELECOM CIRCUITS MANAGEMENT */}
                        <section id="circuits-inventory" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">7. Telecom Circuits Management (<code className="text-brand-red text-base">/circuits</code>)</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Customer IDs, carrier IDs, protection schemes, and commercial attributes.</p>
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 space-y-4">
                                <p className="leading-relaxed">
                                    In telecom operations, every service delivery link is designated as a <strong>Circuit</strong>. The EdgeStone Circuits module maintains an authoritative inventory of all physical and logical customer circuits.
                                </p>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 text-xs">
                                    <h4 className="font-bold text-slate-900 text-sm">Essential Circuit Parameters:</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3 bg-white rounded-lg border border-slate-200">
                                            <strong className="text-slate-900 block">Customer Circuit ID</strong>
                                            <span className="text-slate-500 text-[11px]">The link identifier referenced by the client in their SLAs and service requests.</span>
                                        </div>
                                        <div className="p-3 bg-white rounded-lg border border-slate-200">
                                            <strong className="text-slate-900 block">Supplier Circuit ID</strong>
                                            <span className="text-slate-500 text-[11px]">The backend reference ID assigned by the wholesale carrier (e.g. Tata, Lumen, Airtel).</span>
                                        </div>
                                        <div className="p-3 bg-white rounded-lg border border-slate-200">
                                            <strong className="text-slate-900 block">Circuit Protection Type</strong>
                                            <span className="text-slate-500 text-[11px]"><code>PROTECTED</code> (Automatic redundant ring failover) or <code>UNPROTECTED</code> (Single path).</span>
                                        </div>
                                        <div className="p-3 bg-white rounded-lg border border-slate-200">
                                            <strong className="text-slate-900 block">Commercials (MRC & NRC)</strong>
                                            <span className="text-slate-500 text-[11px]">Monthly Recurring Charges (MRC), Non-Recurring Charges (NRC), and contract terms.</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                                    <h5 className="font-bold mb-1 flex items-center gap-1.5">
                                        <Info size={14} /> Multi-Vendor Circuit Handling
                                    </h5>
                                    <p className="leading-relaxed">
                                        When a composite customer link spans multiple upstream suppliers (e.g. local loop on Carrier A, long-haul backhaul on Carrier B), flag the circuit as <strong>Multi-Vendor</strong>. This allows linking multiple supplier circuit legs to a single primary customer circuit ID.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 8: CLIENTS DIRECTORY */}
                        <section id="clients-directory" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">8. Clients Directory & Accounts (<code className="text-brand-red text-base">/clients</code>)</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Enterprise account directory, contact distribution lists, and active assets.</p>
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 space-y-4">
                                <p className="leading-relaxed">
                                    The Clients directory stores profiles for all enterprise customers serviced by your NOC. It ensures that incoming emails are accurately mapped to the corresponding company and its assigned circuits.
                                </p>

                                <ul className="text-xs space-y-2 list-disc list-inside text-slate-600">
                                    <li><strong>Multi-Email Distribution Lists:</strong> Add multiple contact emails for each client company (e.g. <code>noc@client.com</code>, <code>manager@client.com</code>). Inbound messages from any of these addresses are automatically linked to the account.</li>
                                    <li><strong>Expandable Row Inventory:</strong> Click on any client row to view all active circuits, historical ticket counts, and contract status.</li>
                                    <li><strong>Controlled Modification:</strong> Restricted to <em>Super Admins</em> and <em>Managers</em>. Agents can view client contact information but cannot alter enterprise accounts.</li>
                                </ul>
                            </div>
                        </section>

                        {/* SECTION 9: VENDORS & CARRIER ESCALATIONS */}
                        <section id="vendors-directory" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">9. Vendors & Carrier Escalations (<code className="text-brand-red text-base">/vendors</code>)</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Telecom carriers, L1-L3 escalation matrices, and vendor ticket synchronization.</p>
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 space-y-4">
                                <p className="leading-relaxed">
                                    When an outage stems from an upstream fiber cut or core transit issue, rapid escalation to the third-party infrastructure provider is essential. The Vendors module organizes carrier contacts into actionable escalation trees.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <strong className="text-slate-900 block mb-1">Level 1: Carrier NOC Helpdesk</strong>
                                        <p className="text-slate-500">Initial ticket opening email address and 24/7 hotline telephone number for quick trouble ticket logging.</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <strong className="text-slate-900 block mb-1">Level 2: Shift Duty Manager</strong>
                                        <p className="text-slate-500">Escalation path activated when initial response from the carrier exceeds 60 minutes for high-priority outages.</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <strong className="text-slate-900 block mb-1">Level 3: Regional Engineering Lead</strong>
                                        <p className="text-slate-500">Executive escalation for prolonged fiber cuts, equipment outages, or major disaster scenarios.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 10: SLA ENGINE & COMPLIANCE */}
                        <section id="sla-engine" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-brand-red flex items-center justify-center font-bold">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">10. SLA Engine & Compliance Audits (<code className="text-brand-red text-base">/sla</code>)</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Response and resolution targets, breach detection, and penalty reporting.</p>
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 space-y-4">
                                <p className="leading-relaxed">
                                    Service Level Agreements guarantee uptime quality to clients. EdgeStone features an automated SLA audit engine configured around Indian Standard Time (IST) operational shifts.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                                        <span className="font-bold text-emerald-800 block text-sm mb-1">Status: SAFE</span>
                                        <p className="text-emerald-700">The ticket was diagnosed, escalated, and resolved within contractual resolution time targets.</p>
                                    </div>
                                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl">
                                        <span className="font-bold text-red-800 block text-sm mb-1">Status: BREACHED</span>
                                        <p className="text-red-700">Resolution time exceeded the contractual limit. The system automatically calculates compensation penalty deductions.</p>
                                    </div>
                                    <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl">
                                        <span className="font-bold text-slate-800 block text-sm mb-1">Status: NO SLA</span>
                                        <p className="text-slate-600">Applied to vendor-only tickets (#V-tickets) or informational inquiries exempt from customer uptime credits.</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
                                    <h5 className="font-bold text-slate-900">Exporting SLA Reports for Client Reviews:</h5>
                                    <p className="text-slate-600 leading-relaxed">
                                        Managers can click the <strong>Export / Spreadsheet</strong> button on the SLA page to download formatted CSV reports showing start times, close dates, duration, breach status, and compensation penalty totals for monthly billing reconciliations.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 11: AGENT WORKFORCE MANAGEMENT */}
                        <section id="agent-management" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                    <Sliders size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">11. Team Workforce & Agent Admin (<code className="text-brand-red text-base">/assign-agents</code>)</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Super Admin only: staff provisioning, role changes, and workload management.</p>
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 space-y-4">
                                <p className="leading-relaxed">
                                    The Assign Agents screen is accessible exclusively to <strong>Super Admins</strong>. It provides centralized control over the engineering roster:
                                </p>

                                <ul className="text-xs space-y-2 list-disc list-inside text-slate-600">
                                    <li><strong>Creating New Accounts:</strong> Click <em>Add Agent</em>, specify their full name (first and last name required), corporate email, role tier, and temporary password.</li>
                                    <li><strong>Workload Balancing:</strong> Monitor the active open ticket counter beside each agent to prevent task overload during high-traffic shifts.</li>
                                    <li><strong>Instant Status Toggling:</strong> Set an agent to <em>Inactive</em> upon contract completion or shift handover to remove them from automatic ticket distribution queues.</li>
                                </ul>
                            </div>
                        </section>

                        {/* SECTION 12: NOC PRODUCTIVITY SUITE */}
                        <section id="noc-utilities" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                    <Headphones size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">12. NOC Productivity Suite & Built-in Utilities</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Real-time alerts, shift handover notepad, calculator, and topological roadmap.</p>
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 space-y-4">
                                <p className="leading-relaxed">
                                    EdgeStone includes built-in operational utilities in the floating action menu (bottom-right of every dashboard screen):
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-2 text-brand-red font-bold text-sm mb-1">
                                            <Bell size={16} /> Real-Time Push Alerts & Chimes
                                        </div>
                                        <p className="text-slate-600 leading-relaxed">
                                            Connected via Server-Sent Events (SSE). Plays an audible chime whenever a client replies to a ticket or when a new high-priority issue arrives.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-2 text-amber-600 font-bold text-sm mb-1">
                                            <Edit3 size={16} /> Shift Handover (Sticky Note)
                                        </div>
                                        <p className="text-slate-600 leading-relaxed">
                                            A persistent shared notepad for logging high-priority watches, unacknowledged carrier tickets, and shift notes between outgoing and incoming NOC teams.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
                                            <Calculator size={16} /> Scientific & Bandwidth Calculator
                                        </div>
                                        <p className="text-slate-600 leading-relaxed">
                                            Floating tool for quick bandwidth math (Mbps to Gbps conversions, packet rate calculations, and monthly uptime percentage calculations).
                                        </p>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-1">
                                            <Network size={16} /> Topological Ticket Roadmap (<Link to="/roadmap" className="underline font-bold">/roadmap</Link>)
                                        </div>
                                        <p className="text-slate-600 leading-relaxed">
                                            Interactive React Flow graph illustrating topological relationships between Customer Circuits, Open Tickets, SLAs, and active conversation threads.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 13: STEP-BY-STEP SOP PLAYBOOKS */}
                        <section id="sop-guides" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">13. Standard Operating Procedure (SOP) Playbooks</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Actionable walkthroughs for daily operational scenarios.</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-xs">
                                {/* Playbook 1 */}
                                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                                    <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-red-100 text-brand-red flex items-center justify-center text-xs font-black">A</span>
                                        SOP: Handling a Major Fiber Cut / Circuit Down Alarm
                                    </h4>
                                    <ol className="list-decimal list-inside space-y-1.5 text-slate-600 ml-1">
                                        <li>Locate the ticket in the <strong>Open</strong> tab; inspect alarms and customer descriptions.</li>
                                        <li>Assign the ticket to yourself and switch status to <strong>In Progress</strong>.</li>
                                        <li>Send a <strong>Client Reply</strong> acknowledging the issue within the First Response Time (FRT) window.</li>
                                        <li>In the ticket sidebar, match the Customer Circuit ID to fetch the Supplier Circuit ID and carrier details.</li>
                                        <li>Switch to the <strong>Vendor</strong> tab and send an escalation dispatch to the carrier's NOC. Log the carrier's external ticket reference.</li>
                                        <li>Record ping/traceroute test outputs in an <strong>Internal Note</strong>.</li>
                                        <li>Once the carrier restores physical continuity, verify link health and request client confirmation before closing the ticket.</li>
                                    </ol>
                                </div>

                                {/* Playbook 2 */}
                                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                                    <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black">B</span>
                                        SOP: Scheduled Maintenance Window Handling
                                    </h4>
                                    <ol className="list-decimal list-inside space-y-1.5 text-slate-600 ml-1">
                                        <li>When an upstream carrier announces planned maintenance (e.g. fiber rerouting 01:00 - 05:00 IST), create a new ticket.</li>
                                        <li>Set the ticket status directly to <strong>Maintenance</strong>.</li>
                                        <li>Link the affected customer circuit IDs.</li>
                                        <li>Tickets under the Maintenance status are exempted from false SLA breach penalization.</li>
                                        <li>Post-maintenance, verify circuits return to active status and transition ticket to <strong>Closed</strong>.</li>
                                    </ol>
                                </div>

                                {/* Playbook 3 */}
                                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                                    <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">C</span>
                                        SOP: NOC Shift Change Handover Protocol
                                    </h4>
                                    <ol className="list-decimal list-inside space-y-1.5 text-slate-600 ml-1">
                                        <li>Fifteen minutes prior to shift end, review all tickets remaining in <strong>Open</strong> or <strong>In Progress</strong> state.</li>
                                        <li>Open the floating <strong>Shift Handover</strong> notepad (pencil icon in bottom-right).</li>
                                        <li>Record the ticket ID, circuit ID, current carrier ETA, and required next action.</li>
                                        <li>Conduct a verbal or chat review with the incoming shift lead before ending your session.</li>
                                    </ol>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 14: TROUBLESHOOTING & FAQS */}
                        <section id="faqs" className="scroll-mt-24 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                                    <HelpCircle size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">14. Troubleshooting & Frequently Asked Questions (FAQ)</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Resolving common operational hurdles and edge-case questions.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {[
                                    {
                                        id: 'faq-1',
                                        q: 'What happens if a customer replies to an already closed ticket?',
                                        a: 'The system automatically detects the reply and streams an urgent high-visibility amber toast notification with an audible alert. The ticket re-appears in the active queue with the client’s new message, ensuring follow-up queries or recurring flaps are never missed.'
                                    },
                                    {
                                        id: 'faq-2',
                                        q: 'Why does an agent see "Access Denied" or missing navigation items for Clients or SLA?',
                                        a: 'Access to master directories (Clients, Vendors, SLA Configuration, and Assign Agents) is governed by Role-Based Access Control. Standard Support Crew / Agent accounts are restricted to ticket handling and circuit lookups. Contact your Super Admin if your role tier requires elevation.'
                                    },
                                    {
                                        id: 'faq-3',
                                        q: 'How does the SLA engine calculate breach status when tickets span across night hours?',
                                        a: 'SLA calculations use Indian Standard Time (IST) timestamps. For 24/7 mission-critical circuits, the countdown continues continuously. For business-hours-only circuits, the timer pauses outside configured business windows and resumes at the start of the next business day.'
                                    },
                                    {
                                        id: 'faq-4',
                                        q: 'How can I configure my personal email signature with my title and direct phone number?',
                                        a: 'Click on your profile avatar in the bottom-left sidebar and select "My Account". In the Signatures modal, compose your personalized signature with contact information and designation. This signature will automatically populate when drafting ticket replies.'
                                    },
                                    {
                                        id: 'faq-5',
                                        q: 'What is the difference between a Customer Circuit ID and a Supplier Circuit ID?',
                                        a: 'A Customer Circuit ID is the service tag your client sees on their contract and invoices. A Supplier Circuit ID is the identifier assigned by the upstream wholesale telco (e.g. Airtel, Tata, Lumen). EdgeStone links both so you can resolve issues quickly with both parties.'
                                    }
                                ].map((item) => {
                                    const isOpen = expandedFaq === item.id;
                                    return (
                                        <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                                            <button
                                                onClick={() => toggleFaq(item.id)}
                                                className="w-full flex items-center justify-between p-4 text-left font-bold text-xs sm:text-sm text-slate-800 hover:text-brand-red transition-colors"
                                            >
                                                <span>{item.q}</span>
                                                <ChevronDown
                                                    size={16}
                                                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-red' : ''}`}
                                                />
                                            </button>
                                            {isOpen && (
                                                <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 bg-white">
                                                    {item.a}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Formal Document Signoff Box */}
                        <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-brand-red" />
                                    Authorized Delivery Document
                                </h4>
                                <p className="text-xs text-slate-400">
                                    EdgeStone NOC Operations Suite • Developed & Maintained by AeroTalk Engineering • Confidential Client Material
                                </p>
                            </div>
                            <button
                                onClick={handlePrint}
                                className="px-4 py-2 bg-brand-red hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs shrink-0 print:hidden"
                            >
                                <Printer size={14} />
                                Export Printable Manual
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default DocsPage;
