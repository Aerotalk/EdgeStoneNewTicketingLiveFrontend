import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, NavLink } from 'react-router-dom';
import {
    PieChart,
    Files,
    User as UserIcon,
    Building2,
    UserPlus,
    FileText,
    ChevronLeft,
    MoreVertical,
    LogOut,
    X,
    Zap,
    BookOpen
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SignaturesPage from '../../pages/dashboard/SignaturesPage';
import { useAvatar } from '../../hooks/useAvatar';

interface SidebarProps {
    agentName: string;
    isMobileOpen?: boolean;
    onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ agentName, isMobileOpen, onClose }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { isSuperAdmin, isManager, logout, user } = useAuth();
    
    const agentId = user?.id;
    const { avatarUrl } = useAvatar(agentId);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const allMenuItems = [
        { icon: PieChart, label: 'Dashboard', path: 'overview' },
        { icon: Files, label: 'Tickets', path: 'tickets' },
        { icon: UserIcon, label: 'Client', path: 'clients', restricted: true },
        { icon: Building2, label: 'Vendor', path: 'vendors', restricted: true },
        { icon: Zap, label: 'Circuits', path: 'circuits', restricted: true },
        { icon: UserPlus, label: 'Assign agent', path: 'assign-agents', superAdminOnly: true },
        { icon: FileText, label: 'SLA', path: 'sla', restricted: true },
        { icon: BookOpen, label: 'User Manual', path: 'docs' },
    ];

    // Filter menu items based on user role
    const menuItems = allMenuItems.filter(item => {
        if (item.superAdminOnly) return isSuperAdmin();
        if (item.restricted) return isSuperAdmin() || isManager();
        return true;
    });

    const handleLogoutTrigger = () => {
        setShowMenu(false);
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-[40] lg:hidden transition-opacity duration-300 print:hidden ${
                    isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            />

            <div
                className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200/70 shadow-[1px_0_12px_rgba(0,0,0,0.02)] flex flex-col transition-[width,transform] duration-300 ease-in-out lg:relative lg:z-30 h-screen will-change-[width] print:hidden ${
                    isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                } ${isCollapsed ? 'lg:w-20' : 'lg:w-72'} w-72`}
            >
                {/* Mobile Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 text-slate-400 lg:hidden hover:text-brand-red hover:bg-slate-50 rounded-lg transition-colors"
                    aria-label="Close menu"
                >
                    <X size={20} />
                </button>

                {/* Logo Area (Preserved exactly as requested) */}
                <div className={`p-4 h-[110px] flex items-center justify-center overflow-hidden transition-[padding] duration-300 ${isCollapsed ? 'lg:px-2' : 'px-4'}`}>
                    <img
                        src="/assets/logo.png"
                        alt="EdgeStone"
                        className={`h-[84px] w-auto transition-transform duration-300 ${isCollapsed ? 'scale-50' : 'scale-100'}`}
                    />
                </div>

                {/* Refined Desktop Collapse Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3.5 top-10 w-7 h-7 hidden lg:flex items-center justify-center z-50 rounded-full bg-white border border-slate-200/90 shadow-xs hover:shadow-md text-slate-400 hover:text-brand-red hover:border-slate-300 transition-all duration-200 active:scale-95 group"
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <ChevronLeft
                        size={15}
                        strokeWidth={2.4}
                        className={`transition-transform duration-300 ease-in-out ${
                            isCollapsed ? 'rotate-180 text-brand-red' : 'rotate-0'
                        }`}
                    />
                </button>

                {/* Navigation Links */}
                <nav className={`flex-1 py-4 space-y-1 transition-all duration-300 ${isCollapsed ? 'px-2 overflow-visible' : 'px-3 overflow-y-auto overflow-x-hidden'}`}>
                    {menuItems.map((item, idx) => (
                        <NavLink
                            key={idx}
                            to={`/dashboard/${id}/${item.path}`}
                            onClick={() => onClose?.()}
                            className={({ isActive }) =>
                                `relative flex items-center rounded-xl transition-all duration-200 group whitespace-nowrap ${
                                    isCollapsed
                                        ? 'justify-center w-11 h-11 mx-auto'
                                        : 'gap-3 px-3.5 py-2.5'
                                } ${
                                    isActive
                                        ? 'bg-red-50/90 text-brand-red font-semibold shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/80 font-medium'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active Left Accent Indicator (Expanded Mode) */}
                                    {isActive && !isCollapsed && (
                                        <span className="absolute left-1 top-2.5 bottom-2.5 w-1 bg-brand-red rounded-full" />
                                    )}

                                    <item.icon
                                        size={20}
                                        strokeWidth={isActive ? 2.3 : 1.9}
                                        className={`flex-shrink-0 transition-colors duration-150 ${
                                            isActive
                                                ? 'text-brand-red'
                                                : 'text-slate-400 group-hover:text-slate-700'
                                        }`}
                                    />

                                    {/* Label Container */}
                                    <div
                                        className={`transition-all duration-300 overflow-hidden ${
                                            isCollapsed ? 'w-0 opacity-0' : 'w-44 opacity-100'
                                        }`}
                                    >
                                        <span className="text-[14px] whitespace-nowrap tracking-tight transition-transform duration-150 group-hover:translate-x-0.5 inline-block">
                                            {item.label}
                                        </span>
                                    </div>

                                    {/* Collapsed Mode Floating Tooltip */}
                                    {isCollapsed && (
                                        <div className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 -translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto transition-all duration-150 whitespace-nowrap z-[100] border border-slate-800 flex items-center drop-shadow-md">
                                            <span>{item.label}</span>
                                            {/* Caret */}
                                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
                                        </div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer / Profile Section */}
                <div className={`border-t border-slate-100 relative transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-3'}`}>
                    {isCollapsed ? (
                        /* Collapsed Footer: Avatar + Logout with clean tooltips */
                        <div className="flex flex-col items-center gap-2">
                            {/* Avatar with account tooltip */}
                            <div 
                                className="relative group cursor-pointer"
                                onClick={() => setShowAccountModal(true)}
                            >
                                <div className="relative w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 font-bold text-sm overflow-hidden hover:ring-2 hover:ring-brand-red/30 transition-all">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={agentName} className="w-full h-full object-cover" />
                                    ) : (
                                        agentName.charAt(0)
                                    )}
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                                </div>
                                <div className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 -translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto transition-all duration-150 whitespace-nowrap z-[100] border border-slate-800 flex items-center drop-shadow-md">
                                    <span>{agentName}</span>
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
                                </div>
                            </div>

                            {/* Logout Button with tooltip */}
                            <div className="relative group">
                                <button
                                    onClick={handleLogoutTrigger}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-brand-red hover:bg-red-50/80 transition-colors"
                                    aria-label="Log out"
                                >
                                    <LogOut size={18} />
                                </button>
                                <div className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 -translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto transition-all duration-150 whitespace-nowrap z-[100] border border-slate-800 flex items-center drop-shadow-md">
                                    <span>Log out</span>
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Expanded Footer: Enclosed Profile Card */
                        <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/60 transition-all duration-150">
                            <div 
                                onClick={() => setShowAccountModal(true)}
                                className="flex items-center gap-2.5 overflow-hidden cursor-pointer flex-1 min-w-0 group/user"
                                title="View Account"
                            >
                                <div className="relative w-9 h-9 rounded-lg bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-700 font-bold flex-shrink-0 text-sm overflow-hidden group-hover/user:border-brand-red/40 transition-colors">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={agentName} className="w-full h-full object-cover" />
                                    ) : (
                                        agentName.charAt(0)
                                    )}
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                                </div>
                                <div className="overflow-hidden min-w-0 flex-1">
                                    <span className="text-[13.5px] font-bold text-slate-800 truncate block tracking-tight group-hover/user:text-brand-red transition-colors">
                                        {agentName}
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-400 truncate block capitalize">
                                        {user?.role || 'Support Agent'}
                                    </span>
                                </div>
                            </div>

                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-all ${
                                        showMenu ? 'bg-white text-slate-700 shadow-xs' : ''
                                    }`}
                                    aria-label="Account menu"
                                >
                                    <MoreVertical size={17} />
                                </button>

                                {showMenu && (
                                    <div
                                        className="absolute bottom-full right-0 mb-2.5 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1.5 min-w-[170px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                                    >
                                        <div className="px-3.5 py-2 border-b border-slate-100 mb-1">
                                            <p className="text-xs font-bold text-slate-900 truncate">{agentName}</p>
                                            <p className="text-[11px] text-slate-400 truncate capitalize">{user?.role || 'Support Agent'}</p>
                                        </div>
                                        <button
                                            onClick={() => { setShowMenu(false); setShowAccountModal(true); }}
                                            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors"
                                        >
                                            <UserIcon size={15} className="text-slate-400" />
                                            My Account
                                        </button>
                                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                        <button
                                            onClick={handleLogoutTrigger}
                                            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-3 py-2 text-brand-red hover:bg-red-50/80 text-xs font-semibold rounded-lg transition-colors"
                                        >
                                            <LogOut size={15} />
                                            Log out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* My Account Modal */}
            {showAccountModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#0F172A]/20 backdrop-blur-[6px] animate-in fade-in duration-500">
                    <div className="bg-white rounded-[32px] w-full max-w-[1000px] h-[85vh] shadow-[0_32px_128px_-12px_rgba(15,23,42,0.25)] border border-gray-100/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative">
                        <button onClick={() => setShowAccountModal(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all z-50">
                            <X size={20} />
                        </button>
                        <div className="flex-1 overflow-hidden relative rounded-[32px]">
                            <SignaturesPage />
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0F172A]/20 backdrop-blur-[6px] animate-in fade-in duration-500">
                    <div className="bg-white rounded-[32px] w-full max-w-[400px] shadow-[0_32px_128px_-12px_rgba(15,23,42,0.25)] border border-gray-100/50 p-10 animate-in zoom-in-95 duration-300 relative">
                        <button onClick={() => setShowLogoutModal(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all">
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-gray-50 text-brand-red rounded-2xl flex items-center justify-center mb-6">
                                <LogOut size={32} />
                            </div>
                            <h3 className="text-[24px] font-bold text-gray-900 mb-2 tracking-tight">Logging out?</h3>
                            <p className="text-[14px] text-gray-500 mb-8 font-medium">Are you sure you want to log out from your session?</p>

                            <div className="flex flex-col w-full gap-3">
                                <button
                                    onClick={confirmLogout}
                                    className="w-full h-[56px] bg-brand-red text-white font-bold rounded-2xl text-[15px] shadow-lg shadow-gray-200/50 hover:bg-[#d41c34] hover:-translate-y-0.5 transition-all active:scale-95"
                                >
                                    Confirm Log out
                                </button>
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="w-full h-[56px] bg-gray-50 text-gray-600 font-bold rounded-2xl text-[15px] hover:bg-gray-100 transition-all active:scale-95"
                                >
                                    Keep me logged in
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
