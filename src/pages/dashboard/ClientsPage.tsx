import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../../components/ui/Topbar';
import { Plus, Calendar, Edit3, Check, X, Loader2, Trash2 } from 'lucide-react';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { clientService } from '../../services/clientService';
import type { Client } from '../../services/clientService';
import { useDashboardData } from '../../contexts/DashboardDataContext';

const ClientsPage: React.FC = () => {
    const navigate = useNavigate();
    const { isSupportCrew, canDelete } = useAuth();
    const { refresh: refreshDashboard } = useDashboardData();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<Client>>({});
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('Details Updated Successfully');
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [isDeletingClient, setIsDeletingClient] = useState(false);

    // Add Client Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newClientData, setNewClientData] = useState({ name: '', emails: [] as string[] });
    const [currentEmail, setCurrentEmail] = useState('');
    const [editEmailInput, setEditEmailInput] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Row expansion state
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const data = await clientService.getAllClients();
            setClients(data);
        } catch (error: any) {
            console.error('Failed to fetch clients:', error);
            if (error.message === 'Unauthorized') {
                localStorage.removeItem('edgestone_user');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(client => {
        const query = searchQuery.toLowerCase();
        return (
            client.name.toLowerCase().includes(query) ||
            client.emails.some(email => email.toLowerCase().includes(query))
        );
    });

    const handleEditClick = (client: Client) => {
        setEditingId(client.id);
        setEditFormData({ ...client });
        setEditEmailInput('');
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditFormData({});
        setEditEmailInput('');
    };

    const handleSave = async () => {
        if (!editingId) return;

        try {
            await clientService.updateClient(editingId, editFormData);
            await fetchClients();
            await refreshDashboard();
            setEditingId(null);

            setSuccessMessage('Details Updated Successfully');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error: any) {
            console.error('Failed to update client:', error);
            if (error.message === 'Unauthorized') {
                localStorage.removeItem('edgestone_user');
                navigate('/login');
            }
        }
    };

    const handleDeleteClient = async () => {
        if (!clientToDelete) return;
        try {
            setIsDeletingClient(true);
            await clientService.deleteClient(clientToDelete.id);
            setSuccessMessage(`Client ${clientToDelete.name} Deleted Successfully`);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
            await fetchClients();
            await refreshDashboard();
            setClientToDelete(null);
        } catch (error: any) {
            console.error('Failed to delete client:', error);
            if (error.message === 'Unauthorized') {
                localStorage.removeItem('edgestone_user');
                navigate('/login');
            } else {
                alert(error.message || 'Failed to delete client');
            }
        } finally {
            setIsDeletingClient(false);
        }
    };

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClientData.name || newClientData.emails.length === 0) return;

        try {
            setSubmitting(true);
            await clientService.createClient(newClientData);
            await fetchClients();
            await refreshDashboard();
            setIsAddModalOpen(false);
            setNewClientData({ name: '', emails: [] });
            setCurrentEmail('');

            setSuccessMessage('Client Added Successfully');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error: any) {
            console.error('Failed to create client:', error);
            if (error.message === 'Unauthorized') {
                localStorage.removeItem('edgestone_user');
                navigate('/login');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const addEmailToModal = () => {
        if (!currentEmail || !currentEmail.includes('@')) return;
        if (!newClientData.emails.includes(currentEmail)) {
            setNewClientData(prev => ({ ...prev, emails: [...prev.emails, currentEmail] }));
        }
        setCurrentEmail('');
    };

    const removeEmailFromModal = (email: string) => {
        setNewClientData(prev => ({ ...prev, emails: prev.emails.filter(e => e !== email) }));
    };

    const startEditingNewEmail = (email: string) => {
        setCurrentEmail(email);
        removeEmailFromModal(email);
    };

    const toggleRowExpansion = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleInputChange = (field: keyof Client, value: any) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    const addEmailToEdit = () => {
        if (!editEmailInput || !editEmailInput.includes('@')) return;
        const currentEmails = editFormData.emails || [];
        if (!currentEmails.includes(editEmailInput)) {
            setEditFormData(prev => ({
                ...prev,
                emails: [...(prev.emails || []), editEmailInput]
            }));
        }
        setEditEmailInput('');
    };

    const removeEmailFromEdit = (email: string) => {
        setEditFormData(prev => ({
            ...prev,
            emails: (prev.emails || []).filter(e => e !== email)
        }));
    };

    const startEditingEmail = (email: string) => {
        setEditEmailInput(email);
        removeEmailFromEdit(email);
    };
    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#F9FAFB] relative transition-all duration-500">
            {/* Custom Styles for Gradual Notification */}
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
                title="Clients"
                searchPlaceholder="Search by name or email..."
                onSearch={(query) => setSearchQuery(query)}
            />

            {/* Success Notification - Moved outside scrollable area to prevent clipping */}
            {showSuccess && (
                <div className="absolute top-[72px] left-1/2 -translate-x-[50%] z-50 animate-gradual">
                    <div className="bg-white px-8 py-3 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-gray-100 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                            <Check size={18} className="text-white" strokeWidth={3.5} />
                        </div>
                        <span className="text-sm font-bold text-gray-800 tracking-tight text-nowrap">{successMessage}</span>
                    </div>
                </div>
            )}

            {/* Add Client Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Add New Client</h2>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleAddClient} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Client Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newClientData.name}
                                    onChange={e => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter client name"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Email IDs</label>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="email"
                                        value={currentEmail}
                                        onChange={e => setCurrentEmail(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addEmailToModal();
                                            }
                                        }}
                                        placeholder="Enter email address"
                                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={addEmailToModal}
                                        className="px-4 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all"
                                    >
                                        Add
                                    </button>
                                </div>

                                {newClientData.emails.length > 0 && (
                                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200 min-h-[50px]">
                                        {newClientData.emails.map((email, i) => (
                                            <span
                                                key={i}
                                                onClick={() => startEditingNewEmail(email)}
                                                className="group flex items-center gap-1.5 px-2.5 py-1 bg-white text-gray-700 rounded-lg text-xs font-bold border border-gray-100 shadow-sm animate-in zoom-in-95 duration-200 cursor-pointer hover:border-brand-red/30 hover:bg-brand-red/5 transition-all"
                                                title="Click to edit"
                                            >
                                                {email}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeEmailFromModal(email);
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all font-sans"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newClientData.name || newClientData.emails.length === 0 || submitting}
                                    className={`flex-1 py-2.5 bg-brand-red text-white font-bold rounded-xl hover:bg-brand-red-hover shadow-lg shadow-brand-red/20 transition-all font-sans flex items-center justify-center gap-2 ${(!newClientData.name || newClientData.emails.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        "Add Client"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="px-4 sm:px-8 pt-4 sm:pt-6 pb-8 flex-1 overflow-auto relative">
                {!isSupportCrew() && (
                    <div className="mb-6">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-red/20 active:scale-95"
                        >
                            <Plus size={18} />
                            Add Client
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
                    </div>
                ) : (
                    <>
                        {/* Mobile/Tablet Card View */}
                        <div className="grid grid-cols-1 gap-4 md:hidden mb-8">
                            {filteredClients.map((client) => (
                                <div key={client.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                    {editingId === client.id ? (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Client Name</label>
                                                <input
                                                    type="text"
                                                    value={editFormData.name || ''}
                                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red text-sm font-bold"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Email IDs</label>
                                                <div className="flex gap-2 mb-2">
                                                    <input
                                                        type="email"
                                                        value={editEmailInput}
                                                        onChange={(e) => setEditEmailInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                addEmailToEdit();
                                                            }
                                                        }}
                                                        placeholder="Add email..."
                                                        className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-red text-sm"
                                                    />
                                                    <button
                                                        onClick={addEmailToEdit}
                                                        className="p-1 px-2.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50/50 rounded-lg border border-dashed border-gray-200 min-h-[40px]">
                                                    {(editFormData.emails || []).map((email, i) => (
                                                        <span
                                                            key={i}
                                                            onClick={() => startEditingEmail(email)}
                                                            className="group flex items-center gap-1 px-2 py-0.5 bg-white text-gray-700 rounded text-[11px] font-bold border border-gray-100 shadow-sm whitespace-nowrap cursor-pointer hover:border-brand-red/30 hover:bg-brand-red/5 transition-all"
                                                            title="Click to edit"
                                                        >
                                                            {email}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeEmailFromEdit(email);
                                                                }}
                                                                className="text-gray-400 hover:text-red-500"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </span>
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
                                                    <h3 className="font-bold text-gray-900 text-lg">{client.name}</h3>
                                                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                                                        <Calendar size={12} />
                                                        Created: {client.createdOn}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${client.status === 'Active'
                                                    ? 'bg-green-50 text-green-600'
                                                    : 'bg-red-50 text-red-600'
                                                    }`}>
                                                    {client.status}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5">
                                                {(expandedRows.has(client.id) ? client.emails : client.emails.slice(0, 2)).map((email, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-orange-50 text-[#D97706] rounded text-[11px] border border-orange-100/50 font-medium whitespace-nowrap">
                                                        {email}
                                                    </span>
                                                ))}
                                                {client.emails.length > 2 && (
                                                    <button
                                                        onClick={(e) => toggleRowExpansion(client.id, e)}
                                                        className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-[11px] border border-gray-100 font-bold hover:bg-gray-100 transition-colors"
                                                    >
                                                        {expandedRows.has(client.id) ? 'Show less' : `+${client.emails.length - 2} more`}
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 pt-1">
                                                {!isSupportCrew() && (
                                                    <button
                                                        onClick={() => handleEditClick(client)}
                                                        className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                                    >
                                                        <Edit3 size={16} />
                                                        Edit Client
                                                    </button>
                                                )}
                                                {canDelete() && (
                                                    <button
                                                        onClick={() => setClientToDelete(client)}
                                                        className="py-2.5 px-3 flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-brand-red bg-gray-50 hover:bg-red-50 rounded-xl transition-colors"
                                                        title="Delete Client"
                                                    >
                                                        <Trash2 size={16} />
                                                        <span>Delete Client</span>
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/30">
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                Client Name
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                Created on
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredClients.map((client) => (
                                            <tr key={client.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-5 text-sm font-bold text-gray-800">
                                                    {editingId === client.id ? (
                                                        <input
                                                            type="text"
                                                            value={editFormData.name || ''}
                                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 text-sm"
                                                        />
                                                    ) : (
                                                        client.name
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-gray-400" />
                                                        {client.createdOn}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-sm text-gray-600">
                                                    {editingId === client.id ? (
                                                        <div className="max-w-[300px]">
                                                            <div className="flex gap-2 mb-2">
                                                                <input
                                                                    type="email"
                                                                    value={editEmailInput}
                                                                    onChange={(e) => setEditEmailInput(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            addEmailToEdit();
                                                                        }
                                                                    }}
                                                                    placeholder="Add email..."
                                                                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-red text-xs"
                                                                />
                                                                <button
                                                                    onClick={addEmailToEdit}
                                                                    className="p-1 px-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
                                                                >
                                                                    <Check size={12} />
                                                                </button>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5 p-1.5 bg-gray-50/50 rounded-lg border border-dashed border-gray-200 min-h-[36px]">
                                                                {(editFormData.emails || []).map((email, i) => (
                                                                    <span
                                                                        key={i}
                                                                        onClick={() => startEditingEmail(email)}
                                                                        className="group flex items-center gap-1 px-1.5 py-0.5 bg-white text-gray-700 rounded text-[10px] font-bold border border-gray-100 shadow-sm whitespace-nowrap cursor-pointer hover:border-brand-red/30 hover:bg-brand-red/5 transition-all"
                                                                        title="Click to edit"
                                                                    >
                                                                        {email}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                removeEmailFromEdit(email);
                                                                            }}
                                                                            className="text-gray-400 hover:text-red-500"
                                                                        >
                                                                            <X size={10} />
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2 max-w-[300px]">
                                                            {(expandedRows.has(client.id) ? client.emails : client.emails.slice(0, 2)).map((email, i) => (
                                                                <span key={i} className="px-2 py-1 bg-orange-50 text-[#D97706] rounded text-[12px] border border-orange-100/50 font-medium whitespace-nowrap">
                                                                    {email}
                                                                </span>
                                                            ))}
                                                            {client.emails.length > 2 && (
                                                                <button
                                                                    onClick={(e) => toggleRowExpansion(client.id, e)}
                                                                    className="px-2 py-1 bg-gray-50 text-gray-500 rounded text-[12px] border border-gray-100 font-bold hover:bg-gray-100 transition-colors"
                                                                >
                                                                    {expandedRows.has(client.id) ? 'Show less' : `+${client.emails.length - 2} more`}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    {editingId === client.id ? (
                                                        <select
                                                            value={editFormData.status}
                                                            onChange={(e) => handleInputChange('status', e.target.value)}
                                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 text-sm bg-white"
                                                        >
                                                            <option value="Active">Active</option>
                                                            <option value="In-Active">In-Active</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${client.status === 'Active'
                                                            ? 'bg-green-50 text-green-600'
                                                            : 'bg-red-50 text-red-600'
                                                            }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${client.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                                                                }`} />
                                                            {client.status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {editingId === client.id ? (
                                                            <>
                                                                <button
                                                                    onClick={handleSave}
                                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                    title="Save"
                                                                >
                                                                    <Check size={20} />
                                                                </button>
                                                                <button
                                                                    onClick={handleCancel}
                                                                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                                                    title="Cancel"
                                                                >
                                                                    <X size={20} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-2">
                                                                {!isSupportCrew() && (
                                                                    <button
                                                                        onClick={() => handleEditClick(client)}
                                                                        className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-brand-red transition-all group"
                                                                        title="Edit Client"
                                                                    >
                                                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                                                                        <div className="p-2 group-hover:bg-brand-red/5 rounded-lg transition-colors">
                                                                            <Edit3 size={18} />
                                                                        </div>
                                                                    </button>
                                                                )}
                                                                {canDelete() && (
                                                                    <button
                                                                        onClick={() => setClientToDelete(client)}
                                                                        className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-brand-red transition-all group"
                                                                        title="Delete Client"
                                                                    >
                                                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-red">Delete</span>
                                                                        <div className="p-2 text-gray-400 group-hover:text-brand-red group-hover:bg-brand-red/5 rounded-lg transition-colors">
                                                                            <Trash2 size={18} />
                                                                        </div>
                                                                    </button>
                                                                )}
                                                            </div>
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

            <DeleteConfirmModal
                isOpen={!!clientToDelete}
                title="Delete Client"
                itemName={clientToDelete?.name || ''}
                itemType="Client"
                isLoading={isDeletingClient}
                onConfirm={handleDeleteClient}
                onClose={() => setClientToDelete(null)}
            />
        </div>
    );
};

export default ClientsPage;
