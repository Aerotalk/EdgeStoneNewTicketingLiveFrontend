import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../../components/ui/Topbar';
import { Plus, Calendar, Edit3, Check, X, ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { agentService } from '../../services/agentService';
import type { Agent, CreateAgentData } from '../../services/agentService';

const AssignAgentsPage: React.FC = () => {
    const navigate = useNavigate();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<Agent>>({});
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('Details Updated Successfully');
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Add Agent Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [newAgentData, setNewAgentData] = useState<CreateAgentData>({
        name: '',
        email: '',
        password: '',
        status: 'Active',
        role: 'Support crew'
    });
    const [submitting, setSubmitting] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            setLoading(true);
            const data = await agentService.getAllAgents();
            setAgents(data);
        } catch (error: any) {
            console.error('Failed to fetch agents:', error);
            if (error.message === 'Unauthorized') {
                // Clear session and redirect to login
                localStorage.removeItem('edgestone_user');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const isNameValid = (name: string) => {
        const words = name.trim().split(/\s+/).filter(word => word.length > 0);
        return words.length >= 2;
    };

    const getAgentRole = (agent: any): string => {
        const roleStr = agent.role || agent.userRole || agent.access?.role;
        if (roleStr) {
            if (roleStr === 'super_admin' || roleStr === 'Super admin') return 'Super admin';
            if (roleStr.toLowerCase() === 'manager') return 'Manager';
            if (roleStr.toLowerCase() === 'support crew') return 'Support crew';
            return roleStr;
        }
        if (agent.access?.superAdmin || agent.isSuperAdmin) {
            return 'Super admin';
        }
        return 'Support crew';
    };

    const filteredAgents = agents.filter(agent => {
        const query = searchQuery.toLowerCase();
        return (
            agent.name.toLowerCase().includes(query) ||
            agent.emails.some(email => email.toLowerCase().includes(query))
        );
    });

    const handleEditClick = (agent: Agent) => {
        setEditingId(agent.id);
        setEditFormData({ ...agent, role: getAgentRole(agent) as any });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditFormData({});
    };

    const handleSave = async () => {
        if (!editingId) return;

        try {
            await agentService.updateAgent(editingId, editFormData);

            // Re-fetch or update local state
            await fetchAgents();

            setEditingId(null);

            // Show success notification
            setSuccessMessage('Details Updated Successfully');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error: any) {
            console.error('Failed to update agent:', error);
            setErrorMessage(error.message || 'Failed to update user assigned role');
            if (error.message === 'Unauthorized') {
                localStorage.removeItem('edgestone_user');
                navigate('/login');
            }
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
        }
    };

    const handleAddAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAgentData.name || !newAgentData.email) return;

        try {
            setSubmitting(true);
            await agentService.createAgent(newAgentData);

            await fetchAgents();

            setIsAddModalOpen(false);
            setNewAgentData({
                name: '',
                email: '',
                password: '',
                status: 'Active',
                role: 'Support crew'
            });
            setShowPassword(false);

            setSuccessMessage('Agent Assigned Successfully');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error: any) {
            console.error('Failed to create agent:', error);
            setErrorMessage(error.message || 'Failed to assign a new agent');
            if (error.message === 'Unauthorized') {
                localStorage.removeItem('edgestone_user');
                navigate('/login');
            }
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (field: keyof Agent, value: any) => {
        if (field === 'emails') {
            const emails = value.split(',').map((e: string) => e.trim()).filter((e: string) => e !== '');
            setEditFormData(prev => ({ ...prev, emails }));
        } else {
            setEditFormData(prev => ({ ...prev, [field]: value }));
        }
    };



    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#F9FAFB] relative transition-all duration-500">
            <style>{`
                @keyframes gradual-fade {
                    0% { opacity: 0; transform: translate(-50%, -15px); }
                    15% { opacity: 1; transform: translate(-50%, 0); }
                    85% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, -15px); }
                }
                .animate-gradual {
                    animation: gradual-fade 2s ease-in-out forwards;
                }
            `}</style>

            <Topbar
                title="Assign Agents"
                searchPlaceholder="Search agents..."
                onSearch={(query) => setSearchQuery(query)}
            />

            {/* Success Notification */}
            {showSuccess && (
                <div className="absolute top-[72px] left-1/2 -translate-x-[50%] z-[70] animate-gradual">
                    <div className="bg-white px-8 py-3 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-gray-100 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                            <Check size={18} className="text-white" strokeWidth={3.5} />
                        </div>
                        <span className="text-sm font-bold text-gray-800 tracking-tight text-nowrap">{successMessage}</span>
                    </div>
                </div>
            )}

            {/* Error Notification */}
            {showError && (
                <div className="absolute top-[72px] left-1/2 -translate-x-[50%] z-[70] animate-gradual">
                    <div className="bg-white px-8 py-3 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-red-100 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                            <X size={18} className="text-white" strokeWidth={3.5} />
                        </div>
                        <span className="text-sm font-bold text-gray-800 tracking-tight text-nowrap">{errorMessage}</span>
                    </div>
                </div>
            )}

            {/* Add Agent Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
                    <div className="bg-white w-full max-w-[550px] max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-6 sm:p-10 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Add Agent</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleAddAgent} className="space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Name */}
                                <div className="space-y-2">
                                    <label className="block text-[13px] font-bold text-gray-400 uppercase tracking-wider">Name</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            autoComplete="off"
                                            value={newAgentData.name}
                                            onChange={e => setNewAgentData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Agent Name"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all text-[15px] font-semibold text-gray-700"
                                        />
                                        {isNameValid(newAgentData.name) && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-green-50 rounded-full flex items-center justify-center">
                                                <Check size={14} className="text-green-500" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Login Email */}
                                <div className="space-y-2">
                                    <label className="block text-[13px] font-bold text-gray-400 uppercase tracking-wider">Login email</label>
                                    <input
                                        type="email"
                                        required
                                        autoComplete="off"
                                        value={newAgentData.email}
                                        onChange={e => setNewAgentData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="login@email.com"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all text-[15px] font-semibold text-gray-700"
                                    />
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <label className="block text-[13px] font-bold text-gray-400 uppercase tracking-wider">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            value={newAgentData.password}
                                            onChange={e => setNewAgentData(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all text-[15px] font-semibold text-gray-700"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-brand-red transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="space-y-2">
                                    <label className="block text-[13px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
                                    <div className="relative">
                                        <select
                                            value={newAgentData.status}
                                            onChange={e => setNewAgentData(prev => ({ ...prev, status: e.target.value as 'Active' | 'In-Active' }))}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all appearance-none text-[15px] font-bold text-gray-700"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="In-Active">In-Active</option>
                                        </select>
                                        <ChevronLeft size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 -rotate-90 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50">
                                <h3 className="text-[15px] font-black text-gray-900 mb-6 uppercase tracking-wider">Assign access</h3>
                                <div className="space-y-2">
                                    <label className="block text-[13px] font-bold text-gray-400 uppercase tracking-wider">Role</label>
                                    <div className="relative">
                                        <select
                                            value={newAgentData.role}
                                            onChange={e => setNewAgentData(prev => ({ ...prev, role: e.target.value as any }))}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all appearance-none text-[15px] font-bold text-gray-700"
                                        >
                                            <option value="Super admin">Super admin</option>
                                            <option value="Manager">Manager</option>
                                            <option value="Support crew">Support crew</option>
                                        </select>
                                        <ChevronLeft size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 -rotate-90 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-4 bg-brand-red text-white font-black rounded-2xl hover:bg-brand-red-hover shadow-xl shadow-brand-red/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        "Add Agent"
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-8 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="px-4 sm:px-8 pt-4 sm:pt-6 pb-8 flex-1 overflow-auto relative">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-red/20 active:scale-95"
                    >
                        <Plus size={18} />
                        Add Agent
                    </button>
                    {!loading && (
                        <span className="text-sm font-semibold text-gray-400 whitespace-nowrap">
                            Showing <span className="text-gray-700 font-bold">{filteredAgents.length}</span> {filteredAgents.length === 1 ? 'result' : 'results'}
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
                    </div>
                ) : (
                    <>
                        {/* Mobile/Tablet Card View */}
                        <div className="grid grid-cols-1 gap-4 lg:hidden mb-8">
                            {filteredAgents.map((agent) => (
                                <div key={agent.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                    {editingId === agent.id ? (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Agent Name</label>
                                                <p className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-500 select-none">{editFormData.name || ''}</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Email IDs</label>
                                                <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl flex flex-wrap gap-1.5 min-h-[38px]">
                                                    {(editFormData.emails || []).map((email, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-orange-50 text-[#D97706] rounded text-[11px] border border-orange-100/50 font-medium">{email}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Status</label>
                                                    <select
                                                        value={editFormData.status}
                                                        onChange={(e) => handleInputChange('status', e.target.value)}
                                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red text-sm bg-white"
                                                    >
                                                        <option value="Active">Active</option>
                                                        <option value="In-Active">In-Active</option>
                                                    </select>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Role</label>
                                                    <select
                                                        value={editFormData.role}
                                                        onChange={(e) => handleInputChange('role', e.target.value)}
                                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red text-sm bg-white"
                                                    >
                                                        <option value="Super admin">Super admin</option>
                                                        <option value="Manager">Manager</option>
                                                        <option value="Support crew">Support crew</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    onClick={handleCancel}
                                                    className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-gray-400 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                                >
                                                    <X size={16} />
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSave}
                                                    className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-white bg-green-500 rounded-xl hover:bg-green-600 transition-colors"
                                                >
                                                    <Check size={16} />
                                                    Save Changes
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg">{agent.name}</h3>
                                                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                                                        <Calendar size={12} />
                                                        Joined: {agent.createdOn}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${agent.status === 'Active'
                                                    ? 'bg-green-50 text-green-600'
                                                    : 'bg-red-50 text-red-600'
                                                    }`}>
                                                    {agent.status}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600">
                                                    {getAgentRole(agent)}
                                                </span>
                                                {agent.signatureConnected ? (
                                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold bg-green-50 text-green-600 border border-green-100">
                                                        <Check size={12} className="mr-1" /> Sig Connected
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold bg-gray-50 text-gray-500 border border-gray-200">
                                                        No Sig
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {agent.emails.map((email, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-orange-50 text-[#D97706] rounded text-[11px] border border-orange-100/50 font-medium">
                                                        {email}
                                                    </span>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => handleEditClick(agent)}
                                                className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                            >
                                                <Edit3 size={16} />
                                                Edit Agent
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[900px]">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/30">
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Agent Name</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Created on</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Signature</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAgents.map((agent) => (
                                            <tr key={agent.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-5 text-sm font-bold text-gray-800">
                                                    {editingId === agent.id ? (
                                                        <span className="text-gray-500">{agent.name}</span>
                                                    ) : (
                                                        agent.name
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-gray-400" />
                                                        {agent.createdOn}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                    {editingId === agent.id ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {(editFormData.emails || []).map((email, i) => (
                                                                <span key={i} className="px-2 py-1 bg-orange-50 text-[#D97706] rounded text-[12px] border border-orange-100/50 font-medium">{email}</span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {agent.emails.map((email, i) => (
                                                                <span key={i} className="px-2 py-1 bg-orange-50 text-[#D97706] rounded text-[12px] border border-orange-100/50 font-medium">
                                                                    {email}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    {editingId === agent.id ? (
                                                        <select
                                                            value={editFormData.status}
                                                            onChange={(e) => handleInputChange('status', e.target.value)}
                                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 text-sm bg-white"
                                                        >
                                                            <option value="Active">Active</option>
                                                            <option value="In-Active">In-Active</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${agent.status === 'Active'
                                                            ? 'bg-green-50 text-green-600'
                                                            : 'bg-red-50 text-red-600'
                                                            }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                                                                }`} />
                                                            {agent.status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    {agent.signatureConnected ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-100">
                                                            <Check size={14} /> Done
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-500 border border-gray-200">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    {editingId === agent.id ? (
                                                        <select
                                                            value={editFormData.role}
                                                            onChange={(e) => handleInputChange('role', e.target.value)}
                                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 text-sm bg-white"
                                                        >
                                                            <option value="Super admin">Super admin</option>
                                                            <option value="Manager">Manager</option>
                                                            <option value="Support crew">Support crew</option>
                                                        </select>
                                                    ) : (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600">
                                                            {getAgentRole(agent)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {editingId === agent.id ? (
                                                            <>
                                                                <button onClick={handleSave} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                                                    <Check size={20} />
                                                                </button>
                                                                <button onClick={handleCancel} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                                                                    <X size={20} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button onClick={() => handleEditClick(agent)} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-brand-red transition-all group">
                                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                                                                <div className="p-2 group-hover:bg-brand-red/5 rounded-lg transition-colors">
                                                                    <Edit3 size={18} />
                                                                </div>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AssignAgentsPage;
