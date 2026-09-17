import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../../components/ui/Topbar';
import { Plus, Check, X, Loader2, Zap, Pencil, Trash2, Eye, Mail, Copy, CheckCheck, Building2 } from 'lucide-react';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { circuitService } from '../../services/circuitService';
import type { Circuit, CreateCircuitData, UpdateCircuitData } from '../../services/circuitService';
import { vendorService } from '../../services/vendorService';
import type { Vendor } from '../../services/vendorService';
import { clientService } from '../../services/clientService';
import type { Client } from '../../services/clientService';

// ─── Blank form state helpers ─────────────────────────────────────────────────
const blankForm = (): CreateCircuitData => ({
    customerCircuitId: '',
    supplierCircuitId: '',
    type: 'UNPROTECTED',
    vendorId: '',
    clientId: '',
    poNumber: '',
    serviceDescription: '',
    contractTermMonths: undefined,
    contractType: '',
    mrc: undefined,
    supplierPoNumber: '',
    supplierServiceDescription: '',
    supplierContractTermMonths: undefined,
    supplierContractType: '',
    billingStartDate: '',
    supplierMrc: undefined,
    nrc: undefined,
    supplierNrc: undefined,
    isTemporary: false,
    isMultiVendor: false,
    vendorCircuits: [],
});

const circuitToForm = (c: Circuit): CreateCircuitData => ({
    customerCircuitId:          c.customerCircuitId,
    supplierCircuitId:          c.supplierCircuitId ?? '',
    type:                       c.type,
    vendorId:                   c.vendorId ?? '',
    clientId:                   c.clientId ?? '',
    poNumber:                   c.poNumber ?? '',
    serviceDescription:         c.serviceDescription ?? '',
    contractTermMonths:         c.contractTermMonths ?? undefined,
    contractType:               c.contractType ?? '',
    mrc:                        c.mrc,
    supplierPoNumber:           c.supplierPoNumber ?? '',
    supplierServiceDescription: c.supplierServiceDescription ?? '',
    supplierContractTermMonths: c.supplierContractTermMonths ?? undefined,
    supplierContractType:       c.supplierContractType ?? '',
    billingStartDate:           c.billingStartDate ?? '',
    supplierMrc:                c.supplierMrc,
    nrc:                        c.nrc ?? undefined,
    supplierNrc:                c.supplierNrc ?? undefined,
    isMultiVendor:              c.isMultiVendor ?? false,
    vendorCircuits:             c.vendorCircuits ?? [],
});

// ─── Reusable labeled input ───────────────────────────────────────────────────
const Field: React.FC<{
    label: string;
    children: React.ReactNode;
}> = ({ label, children }) => (
    <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all";
const selectCls = "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all appearance-none";

const typeBadge = (type: string) =>
    type === 'PROTECTED'
        ? 'bg-blue-50 text-blue-600 border-blue-100'
        : 'bg-orange-50 text-orange-600 border-orange-100';

// ─── Circuit Form Modal (shared for Add & Edit) ───────────────────────────────
interface CircuitFormModalProps {
    mode: 'add' | 'edit';
    form: CreateCircuitData;
    onChange: (key: keyof CreateCircuitData, value: any) => void;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    submitting: boolean;
    vendors: Vendor[];
    clients: Client[];
}

const CircuitFormModal: React.FC<CircuitFormModalProps> = ({
    mode, form, onChange, onSubmit, onClose, submitting, vendors, clients
}) => {
    const [activeTab, setActiveTab] = React.useState(0);

    const addVendorTab = () => {
        if ((form.vendorCircuits || []).length >= 4) {
            return;
        }
        const newVc = { supplierMrc: 800 };
        onChange('vendorCircuits', [...(form.vendorCircuits || []), newVc]);
        setActiveTab((form.vendorCircuits?.length || 0));
    };

    const updateVendor = (idx: number, key: string, value: any) => {
        const arr = [...(form.vendorCircuits || [])];
        arr[idx] = { ...arr[idx], [key]: value };
        onChange('vendorCircuits', arr);
    };

    const removeVendor = (idx: number) => {
        const arr = [...(form.vendorCircuits || [])];
        arr.splice(idx, 1);
        onChange('vendorCircuits', arr);
        if (activeTab >= arr.length) setActiveTab(Math.max(0, arr.length - 1));
    };

    return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    {mode === 'add' ? <Zap size={18} className="text-brand-red" /> : <Pencil size={18} className="text-brand-red" />}
                    {mode === 'add' ? 'Add New Circuit' : 'Edit Circuit'}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={18} className="text-gray-400" />
                </button>
            </div>

            {/* Scrollable body */}
            <form onSubmit={onSubmit} className="overflow-y-auto flex-1">
                <div className="px-8 py-6 space-y-6">

                    {/* ── Section: Circuit IDs ─────────────────────────── */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Circuit Identifiers</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Customer Circuit ID *">
                                <input
                                    required
                                    type="text"
                                    value={form.customerCircuitId}
                                    onChange={e => onChange('customerCircuitId', e.target.value)}
                                    placeholder="e.g. N1/LON-MUM/ESPL-006"
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="Supplier Circuit ID">
                                <input
                                    type="text"
                                    value={form.supplierCircuitId ?? ''}
                                    onChange={e => onChange('supplierCircuitId', e.target.value)}
                                    placeholder="Auto-generated if blank"
                                    className={inputCls}
                                />
                            </Field>
                            {mode === 'add' && (
                                <div className="sm:col-span-2 flex items-center gap-2 mt-2">
                                    <input
                                        type="checkbox"
                                        id="isTemporary"
                                        checked={form.isTemporary ?? false}
                                        onChange={e => onChange('isTemporary', e.target.checked)}
                                        className="w-4 h-4 text-brand-red border-gray-300 rounded focus:ring-brand-red cursor-pointer"
                                    />
                                    <label htmlFor="isTemporary" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                        Temporary Circuit
                                    </label>
                                </div>
                            )}
                            <div className="sm:col-span-2 flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    id="isMultiVendor"
                                    checked={form.isMultiVendor ?? false}
                                    onChange={e => onChange('isMultiVendor', e.target.checked)}
                                    className="w-4 h-4 text-brand-red border-gray-300 rounded focus:ring-brand-red cursor-pointer"
                                />
                                <label htmlFor="isMultiVendor" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                    Multi-Vendor Circuit
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* ── Section: Circuit Type ────────────────────────── */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Circuit Type</p>
                        <div className="flex gap-6">
                            {(['UNPROTECTED', 'PROTECTED'] as const).map(t => (
                                <label key={t} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="circuitType"
                                        value={t}
                                        checked={form.type === t}
                                        onChange={() => onChange('type', t)}
                                        className="w-4 h-4 text-brand-red focus:ring-brand-red border-gray-300"
                                    />
                                    <span className="text-sm text-gray-700 font-medium capitalize">{t.charAt(0) + t.slice(1).toLowerCase()}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* ── Section: Associations ────────────────────────── */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Associations</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {!form.isMultiVendor && (
                                <Field label="Vendor">
                                    <select value={form.vendorId ?? ''} onChange={e => onChange('vendorId', e.target.value)} className={selectCls}>
                                        <option value="">Select a Vendor</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </Field>
                            )}
                            <Field label="Client">
                                <select value={form.clientId ?? ''} onChange={e => onChange('clientId', e.target.value)} className={selectCls}>
                                    <option value="">Select a Client</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </Field>
                        </div>
                    </div>

                    {/* ── Section: Customer Contract Details ───────────── */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Customer Contract</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="PO Number">
                                <input type="text" value={form.poNumber ?? ''} onChange={e => onChange('poNumber', e.target.value)} placeholder="PO-XXXXX" className={inputCls} />
                            </Field>
                            <Field label="Contract Type">
                                <input type="text" value={form.contractType ?? ''} onChange={e => onChange('contractType', e.target.value)} placeholder="e.g. Annual" className={inputCls} />
                            </Field>
                            <Field label="Contract Term (Months)">
                                <input type="number" min={1} value={form.contractTermMonths ?? ''} onChange={e => onChange('contractTermMonths', e.target.value ? Number(e.target.value) : null)} placeholder="12" className={inputCls} />
                            </Field>
                            <Field label="MRC (Monthly Recurring Charge)">
                                <input type="number" min={0} step="0.01" value={form.mrc ?? ''} onChange={e => onChange('mrc', e.target.value ? Number(e.target.value) : null)} placeholder="1000.00" className={inputCls} />
                            </Field>
                            <Field label="NRC (Non-Recurring Charge)">
                                <input type="number" min={0} step="0.01" value={form.nrc ?? ''} onChange={e => onChange('nrc', e.target.value ? Number(e.target.value) : null)} placeholder="50.00" className={inputCls} />
                            </Field>
                            <Field label="Service Description">
                                <input type="text" value={form.serviceDescription ?? ''} onChange={e => onChange('serviceDescription', e.target.value)} placeholder="Service description" className={`${inputCls} sm:col-span-2`} />
                            </Field>
                        </div>
                    </div>

                    {/* ── Section: Supplier Contract Details ───────────── */}
                    {!form.isMultiVendor ? (
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Supplier Contract</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Supplier PO Number">
                                    <input type="text" value={form.supplierPoNumber ?? ''} onChange={e => onChange('supplierPoNumber', e.target.value)} placeholder="SUP-PO-XXXXX" className={inputCls} />
                                </Field>
                                <Field label="Supplier Contract Type">
                                    <input type="text" value={form.supplierContractType ?? ''} onChange={e => onChange('supplierContractType', e.target.value)} placeholder="e.g. Annual" className={inputCls} />
                                </Field>
                                <Field label="Supplier Contract Term (Months)">
                                    <input type="number" min={1} value={form.supplierContractTermMonths ?? ''} onChange={e => onChange('supplierContractTermMonths', e.target.value ? Number(e.target.value) : null)} placeholder="12" className={inputCls} />
                                </Field>
                                <Field label="Supplier MRC">
                                    <input type="number" min={0} step="0.01" value={form.supplierMrc ?? ''} onChange={e => onChange('supplierMrc', e.target.value ? Number(e.target.value) : null)} placeholder="800.00" className={inputCls} />
                                </Field>
                                <Field label="Supplier NRC">
                                    <input type="number" min={0} step="0.01" value={form.supplierNrc ?? ''} onChange={e => onChange('supplierNrc', e.target.value ? Number(e.target.value) : null)} placeholder="40.00" className={inputCls} />
                                </Field>
                                <Field label="Billing Start Date">
                                    <input type="date" value={form.billingStartDate ?? ''} onChange={e => onChange('billingStartDate', e.target.value)} className={inputCls} />
                                </Field>
                                <Field label="Supplier Service Description">
                                    <input type="text" value={form.supplierServiceDescription ?? ''} onChange={e => onChange('supplierServiceDescription', e.target.value)} placeholder="Supplier service description" className={inputCls} />
                                </Field>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Multi-Vendor Suppliers (Max 4)</p>
                                <span className="text-[11px] font-semibold text-gray-500">{(form.vendorCircuits || []).length}/4 Vendors</span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                {form.vendorCircuits?.map((_, idx) => (
                                    <div key={idx} className="relative group">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab(idx)}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === idx ? 'bg-white shadow-sm border border-gray-200 text-brand-red' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}
                                        >
                                            Vendor {idx + 1}
                                        </button>
                                        <button type="button" onClick={() => removeVendor(idx)} className="absolute -top-1 -right-1 bg-red-100 text-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {(!form.vendorCircuits || form.vendorCircuits.length < 4) ? (
                                    <button
                                        type="button"
                                        onClick={addVendorTab}
                                        className="px-4 py-2 rounded-lg text-sm font-semibold text-brand-red bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1"
                                    >
                                        <Plus size={14} /> Add Vendor
                                    </button>
                                ) : (
                                    <span className="px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-100 border border-gray-200 rounded-lg">
                                        Max 4 Vendors Reached
                                    </span>
                                )}
                            </div>

                            {form.vendorCircuits && form.vendorCircuits.length > 0 && form.vendorCircuits[activeTab] && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                                    <Field label="Vendor *">
                                        <select value={form.vendorCircuits[activeTab].vendorId ?? ''} onChange={e => updateVendor(activeTab, 'vendorId', e.target.value)} className={selectCls} required>
                                            <option value="">Select a Vendor</option>
                                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Supplier Circuit ID">
                                        <input type="text" value={form.vendorCircuits[activeTab].supplierCircuitId ?? ''} onChange={e => updateVendor(activeTab, 'supplierCircuitId', e.target.value)} placeholder="Auto-generated if blank" className={inputCls} />
                                    </Field>
                                    <Field label="Supplier PO Number">
                                        <input type="text" value={form.vendorCircuits[activeTab].supplierPoNumber ?? ''} onChange={e => updateVendor(activeTab, 'supplierPoNumber', e.target.value)} placeholder="SUP-PO-XXXXX" className={inputCls} />
                                    </Field>
                                    <Field label="Supplier Contract Type">
                                        <input type="text" value={form.vendorCircuits[activeTab].supplierContractType ?? ''} onChange={e => updateVendor(activeTab, 'supplierContractType', e.target.value)} placeholder="e.g. Annual" className={inputCls} />
                                    </Field>
                                    <Field label="Supplier Contract Term (Months)">
                                        <input type="number" min={1} value={form.vendorCircuits[activeTab].supplierContractTermMonths ?? ''} onChange={e => updateVendor(activeTab, 'supplierContractTermMonths', e.target.value ? Number(e.target.value) : null)} placeholder="12" className={inputCls} />
                                    </Field>
                                    <Field label="Supplier MRC">
                                        <input type="number" min={0} step="0.01" value={form.vendorCircuits[activeTab].supplierMrc ?? ''} onChange={e => updateVendor(activeTab, 'supplierMrc', e.target.value ? Number(e.target.value) : null)} placeholder="800.00" className={inputCls} />
                                    </Field>
                                    <Field label="Supplier NRC">
                                        <input type="number" min={0} step="0.01" value={form.vendorCircuits[activeTab].supplierNrc ?? ''} onChange={e => updateVendor(activeTab, 'supplierNrc', e.target.value ? Number(e.target.value) : null)} placeholder="40.00" className={inputCls} />
                                    </Field>
                                    <Field label="Billing Start Date">
                                        <input type="date" value={form.vendorCircuits[activeTab].billingStartDate ?? ''} onChange={e => updateVendor(activeTab, 'billingStartDate', e.target.value)} className={inputCls} />
                                    </Field>
                                    <Field label="Supplier Service Description">
                                        <input type="text" value={form.vendorCircuits[activeTab].supplierServiceDescription ?? ''} onChange={e => updateVendor(activeTab, 'supplierServiceDescription', e.target.value)} placeholder="Supplier service description" className={`${inputCls} sm:col-span-2`} />
                                    </Field>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-gray-100 flex gap-3 bg-gray-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-all text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!form.customerCircuitId || submitting}
                        className={`flex-1 py-2.5 bg-brand-red text-white font-bold rounded-xl hover:bg-brand-red-hover shadow-lg shadow-brand-red/20 transition-all text-sm flex items-center justify-center gap-2 ${(!form.customerCircuitId || submitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" />{mode === 'add' ? 'Adding...' : 'Saving...'}</>
                            : mode === 'add' ? 'Add Circuit' : 'Save Changes'
                        }
                    </button>
                </div>
            </form>
        </div>
    </div>
);
};

// ─── Circuit Detail Modal (View Vendors & Emails) ─────────────────────────────
interface CircuitDetailModalProps {
    circuit: Circuit;
    vendors: Vendor[];
    clients: Client[];
    onClose: () => void;
}

const CircuitDetailModal: React.FC<CircuitDetailModalProps> = ({
    circuit, vendors, clients, onClose
}) => {
    const [activeVendorTab, setActiveVendorTab] = useState(0);
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

    const handleCopyEmail = (email: string) => {
        navigator.clipboard.writeText(email);
        setCopiedEmail(email);
        setTimeout(() => setCopiedEmail(null), 2000);
    };

    const clientObj = clients.find(c => c.id === circuit.clientId) || circuit.client;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gray-50/50">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <span className="p-2 bg-red-50 text-brand-red rounded-xl">
                                <Building2 size={18} />
                            </span>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    {circuit.customerCircuitId}
                                </h2>
                                <p className="text-xs text-gray-400 font-medium">
                                    {circuit.supplierCircuitId ? `Supplier Circuit ID: ${circuit.supplierCircuitId}` : 'Circuit Details & Vendor Directory'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase border ${typeBadge(circuit.type)}`}>
                            {circuit.type}
                        </span>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200/60 rounded-full transition-colors">
                            <X size={18} className="text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-8 space-y-6">

                    {/* Section: Associated Vendors & Contacts */}
                    <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200/70">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <Mail size={14} className="text-brand-red" />
                                    Vendor NOC Contacts & Details
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {circuit.isMultiVendor 
                                        ? `This circuit is configured with ${circuit.vendorCircuits?.length || 0} upstream vendors.` 
                                        : 'Primary supplier assigned to this circuit.'}
                                </p>
                            </div>
                            {circuit.isMultiVendor && (
                                <span className="px-2.5 py-1 text-xs font-bold text-brand-red bg-red-100/60 border border-red-200 rounded-lg">
                                    Multi-Vendor ({circuit.vendorCircuits?.length || 0})
                                </span>
                            )}
                        </div>

                        {circuit.isMultiVendor && circuit.vendorCircuits && circuit.vendorCircuits.length > 0 ? (
                            <div>
                                {/* Vendor Tabs */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {circuit.vendorCircuits.map((vc, idx) => {
                                        const vendorName = vc.vendor?.name || vendors.find(v => v.id === vc.vendorId)?.name || `Vendor ${idx + 1}`;
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setActiveVendorTab(idx)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                                    activeVendorTab === idx
                                                        ? 'bg-white shadow-sm border border-gray-200 text-brand-red'
                                                        : 'bg-transparent text-gray-500 hover:bg-gray-200/50'
                                                }`}
                                            >
                                                {vendorName}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Active Vendor Details Card */}
                                {(() => {
                                    const activeVc = circuit.vendorCircuits[activeVendorTab] || circuit.vendorCircuits[0];
                                    const fullVendor = vendors.find(v => v.id === activeVc.vendorId) || activeVc.vendor;
                                    const vendorEmails = fullVendor?.emails || [];

                                    return (
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                                                <div>
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor Name</span>
                                                    <p className="text-base font-bold text-gray-900">{fullVendor?.name || 'Unknown Vendor'}</p>
                                                </div>
                                                {activeVc.supplierCircuitId && (
                                                    <div className="sm:text-right">
                                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Supplier Circuit ID</span>
                                                        <p className="text-sm font-semibold text-gray-800 font-mono">{activeVc.supplierCircuitId}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Vendor Emails */}
                                            <div>
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                                                    NOC / Escalation Emails
                                                </span>
                                                {vendorEmails.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {vendorEmails.map((email: string) => (
                                                            <div
                                                                key={email}
                                                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200/70 rounded-lg text-xs font-semibold text-blue-900"
                                                            >
                                                                <Mail size={12} className="text-blue-600 flex-shrink-0" />
                                                                <a
                                                                    href={`mailto:${email}`}
                                                                    className="hover:underline select-all"
                                                                    title="Click to draft email"
                                                                >
                                                                    {email}
                                                                </a>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopyEmail(email)}
                                                                    className="p-1 hover:bg-blue-100 rounded text-blue-500 hover:text-blue-800 transition-colors"
                                                                    title="Copy email address"
                                                                >
                                                                    {copiedEmail === email ? (
                                                                        <CheckCheck size={12} className="text-emerald-600" />
                                                                    ) : (
                                                                        <Copy size={12} />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">
                                                        No contact emails configured for this vendor in the Vendors database.
                                                    </p>
                                                )}
                                            </div>

                                            {/* Contract Info */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100 text-xs">
                                                <div>
                                                    <span className="text-gray-400 font-medium">Supplier PO:</span>
                                                    <p className="font-semibold text-gray-800 mt-0.5">{activeVc.supplierPoNumber || '—'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 font-medium">Contract Type:</span>
                                                    <p className="font-semibold text-gray-800 mt-0.5">{activeVc.supplierContractType || '—'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 font-medium">Supplier MRC:</span>
                                                    <p className="font-semibold text-gray-800 mt-0.5">
                                                        {activeVc.supplierMrc != null ? `$${activeVc.supplierMrc.toLocaleString()}` : '—'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 font-medium">Term:</span>
                                                    <p className="font-semibold text-gray-800 mt-0.5">
                                                        {activeVc.supplierContractTermMonths ? `${activeVc.supplierContractTermMonths} Months` : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : circuit.vendor || circuit.vendorId ? (
                            (() => {
                                const fullVendor = vendors.find(v => v.id === circuit.vendorId) || circuit.vendor;
                                const vendorEmails = fullVendor?.emails || [];

                                return (
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor Name</span>
                                                <p className="text-base font-bold text-gray-900">{fullVendor?.name || 'Unknown Vendor'}</p>
                                            </div>
                                            {circuit.supplierCircuitId && (
                                                <div className="sm:text-right">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Supplier Circuit ID</span>
                                                    <p className="text-sm font-semibold text-gray-800 font-mono">{circuit.supplierCircuitId}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Vendor Emails */}
                                        <div>
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                                                NOC / Escalation Emails
                                            </span>
                                            {vendorEmails.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {vendorEmails.map((email: string) => (
                                                        <div
                                                            key={email}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200/70 rounded-lg text-xs font-semibold text-blue-900"
                                                        >
                                                            <Mail size={12} className="text-blue-600 flex-shrink-0" />
                                                            <a
                                                                href={`mailto:${email}`}
                                                                className="hover:underline select-all"
                                                                title="Click to draft email"
                                                            >
                                                                {email}
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyEmail(email)}
                                                                className="p-1 hover:bg-blue-100 rounded text-blue-500 hover:text-blue-800 transition-colors"
                                                                title="Copy email address"
                                                            >
                                                                {copiedEmail === email ? (
                                                                    <CheckCheck size={12} className="text-emerald-600" />
                                                                ) : (
                                                                    <Copy size={12} />
                                                                )}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400 italic">
                                                    No contact emails configured for this vendor in the Vendors database.
                                                </p>
                                            )}
                                        </div>

                                        {/* Contract Details */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100 text-xs">
                                            <div>
                                                <span className="text-gray-400 font-medium">Supplier PO:</span>
                                                <p className="font-semibold text-gray-800 mt-0.5">{circuit.supplierPoNumber || '—'}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 font-medium">Contract Type:</span>
                                                <p className="font-semibold text-gray-800 mt-0.5">{circuit.supplierContractType || '—'}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 font-medium">Supplier MRC:</span>
                                                <p className="font-semibold text-gray-800 mt-0.5">
                                                    {circuit.supplierMrc != null ? `$${circuit.supplierMrc.toLocaleString()}` : '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 font-medium">Term:</span>
                                                <p className="font-semibold text-gray-800 mt-0.5">
                                                    {circuit.supplierContractTermMonths ? `${circuit.supplierContractTermMonths} Months` : '—'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs text-gray-400 italic">
                                No vendor assigned to this circuit.
                            </div>
                        )}
                    </div>

                    {/* Section: Client & Customer Details */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 space-y-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Client & Customer Contract</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-xs text-gray-400 font-medium">Client Name:</span>
                                <p className="font-bold text-gray-800">{clientObj?.name || '—'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 font-medium">Customer PO Number:</span>
                                <p className="font-bold text-gray-800">{circuit.poNumber || '—'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 font-medium">Monthly Recurring Charge (MRC):</span>
                                <p className="font-bold text-gray-800">
                                    {circuit.mrc != null ? `$${circuit.mrc.toLocaleString()}` : '—'}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 font-medium">Contract Type & Term:</span>
                                <p className="font-bold text-gray-800">
                                    {circuit.contractType || '—'} {circuit.contractTermMonths ? `(${circuit.contractTermMonths} Mo)` : ''}
                                </p>
                            </div>
                            {circuit.serviceDescription && (
                                <div className="sm:col-span-2">
                                    <span className="text-xs text-gray-400 font-medium">Service Description:</span>
                                    <p className="text-xs text-gray-600 mt-0.5">{circuit.serviceDescription}</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CircuitsPage: React.FC = () => {
    const navigate   = useNavigate();
    const { isSuperAdmin, canDelete } = useAuth();

    const [circuits,  setCircuits]  = useState<Circuit[]>([]);
    const [vendors,   setVendors]   = useState<Vendor[]>([]);
    const [clients,   setClients]   = useState<Client[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // ── Success toast ──────────────────────────────────────────────────────
    const [showSuccess,    setShowSuccess]    = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // ── Detail modal ────────────────────────────────────────────────────────
    const [detailCircuit,  setDetailCircuit]  = useState<Circuit | null>(null);

    // ── Add modal ──────────────────────────────────────────────────────────
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addForm,        setAddForm]        = useState<CreateCircuitData>(blankForm());
    const [addSubmitting,  setAddSubmitting]  = useState(false);

    // ── Edit modal ─────────────────────────────────────────────────────────
    const [editCircuit,    setEditCircuit]    = useState<Circuit | null>(null);
    const [editForm,       setEditForm]       = useState<CreateCircuitData>(blankForm());
    const [editSubmitting, setEditSubmitting] = useState(false);

    // ── Delete modal ───────────────────────────────────────────────────────
    const [circuitToDelete, setCircuitToDelete] = useState<Circuit | null>(null);
    const [isDeletingCircuit, setIsDeletingCircuit] = useState(false);

    const handleDeleteCircuit = async () => {
        if (!circuitToDelete) return;
        try {
            setIsDeletingCircuit(true);
            await circuitService.deleteCircuit(circuitToDelete.id);
            toast(`Circuit ${circuitToDelete.customerCircuitId} Deleted Successfully`);
            await fetchData();
            setCircuitToDelete(null);
        } catch (error: any) {
            console.error('Failed to delete circuit:', error);
            if (error.message === 'Unauthorized') {
                localStorage.removeItem('edgestone_user');
                navigate('/login');
            } else {
                alert(error.message || 'Failed to delete circuit');
            }
        } finally {
            setIsDeletingCircuit(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────
    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [circuitsData, vendorsData, clientsData] = await Promise.all([
                circuitService.getAllCircuits(),
                vendorService.getAllVendors(),
                clientService.getAllClients(),
            ]);
            setCircuits(circuitsData);
            setVendors(vendorsData);
            setClients(clientsData);
        } catch (error: any) {
            console.error('Failed to fetch data:', error);
            if (error.message === 'Unauthorized') {
                localStorage.removeItem('edgestone_user');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const toast = (msg: string) => {
        setSuccessMessage(msg);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    // ── Add handlers ───────────────────────────────────────────────────────
    const handleAddChange = (key: keyof CreateCircuitData, value: any) => {
        setAddForm(prev => {
            const next = { ...prev, [key]: value };
            
            // Auto-fill logic for temporary circuit
            if (next.isTemporary && next.customerCircuitId && (key === 'isTemporary' || key === 'customerCircuitId')) {
                const searchId = next.customerCircuitId.trim().toLowerCase();
                const existing = circuits.find(c => c.customerCircuitId.trim().toLowerCase() === searchId);
                if (existing) {
                    const mapped = circuitToForm(existing);
                    return {
                        ...mapped,
                        customerCircuitId: next.customerCircuitId,
                        supplierCircuitId: next.supplierCircuitId || mapped.supplierCircuitId,
                        isTemporary: true,
                    };
                }
            }
            return next;
        });
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (addForm.isMultiVendor && (addForm.vendorCircuits || []).length > 4) {
            alert('A Multi-Vendor circuit can have at most 4 vendors.');
            return;
        }
        try {
            setAddSubmitting(true);
            await circuitService.createCircuit(addForm);
            await fetchData();
            setIsAddModalOpen(false);
            setAddForm(blankForm());
            toast('Circuit Added Successfully');
        } catch (error: any) {
            console.error('Failed to create circuit:', error);
            if (error.message === 'Unauthorized') { localStorage.removeItem('edgestone_user'); navigate('/login'); }
            else alert(error.message || 'Failed to create circuit');
        } finally {
            setAddSubmitting(false);
        }
    };

    // ── Edit handlers ──────────────────────────────────────────────────────
    const openEdit = (circuit: Circuit) => {
        setEditCircuit(circuit);
        setEditForm(circuitToForm(circuit));
    };

    const handleEditChange = (key: keyof CreateCircuitData, value: any) =>
        setEditForm(prev => ({ ...prev, [key]: value }));

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editCircuit) return;
        if (editForm.isMultiVendor && (editForm.vendorCircuits || []).length > 4) {
            alert('A Multi-Vendor circuit can have at most 4 vendors.');
            return;
        }
        try {
            setEditSubmitting(true);
            const payload: UpdateCircuitData = { ...editForm };
            await circuitService.updateCircuit(editCircuit.id, payload);
            await fetchData();
            setEditCircuit(null);
            toast('Circuit Updated Successfully');
        } catch (error: any) {
            console.error('Failed to update circuit:', error);
            if (error.message === 'Unauthorized') { localStorage.removeItem('edgestone_user'); navigate('/login'); }
            else alert(error.message || 'Failed to update circuit');
        } finally {
            setEditSubmitting(false);
        }
    };

    // ── Filter ─────────────────────────────────────────────────────────────
    const filteredCircuits = circuits.filter(c => {
        const q = searchQuery.toLowerCase();
        return (
            c.customerCircuitId.toLowerCase().includes(q) ||
            (c.vendor?.name?.toLowerCase().includes(q) ?? false) ||
            (c.client?.name?.toLowerCase().includes(q) ?? false) ||
            (c.isMultiVendor && c.vendorCircuits?.some(vc => vc.vendor?.name?.toLowerCase().includes(q)))
        );
    });

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#F9FAFB] relative transition-all duration-500">
            <style>{`
                @keyframes gradual-fade {
                    0%   { opacity: 0; transform: translate(-50%, -15px); }
                    15%  { opacity: 1; transform: translate(-50%, 0); }
                    85%  { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, -15px); }
                }
                .animate-gradual { animation: gradual-fade 2s ease-in-out forwards; }
            `}</style>

            <Topbar
                title="Circuits"
                searchPlaceholder="Search circuits by ID, vendor or client..."
                onSearch={setSearchQuery}
            />

            {/* Toast */}
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

            {/* Add Modal */}
            {isAddModalOpen && (
                <CircuitFormModal
                    mode="add"
                    form={addForm}
                    onChange={handleAddChange}
                    onSubmit={handleAddSubmit}
                    onClose={() => { setIsAddModalOpen(false); setAddForm(blankForm()); }}
                    submitting={addSubmitting}
                    vendors={vendors}
                    clients={clients}
                />
            )}

            {/* Edit Modal */}
            {editCircuit && (
                <CircuitFormModal
                    mode="edit"
                    form={editForm}
                    onChange={handleEditChange}
                    onSubmit={handleEditSubmit}
                    onClose={() => setEditCircuit(null)}
                    submitting={editSubmitting}
                    vendors={vendors}
                    clients={clients}
                />
            )}

            {/* Detail Modal (View Vendors & Emails) */}
            {detailCircuit && (
                <CircuitDetailModal
                    circuit={detailCircuit}
                    vendors={vendors}
                    clients={clients}
                    onClose={() => setDetailCircuit(null)}
                />
            )}

            <div className="px-4 sm:px-8 pt-4 sm:pt-6 pb-8 flex-1 overflow-auto relative">
                {isSuperAdmin() && (
                    <div className="mb-6">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-red/20 active:scale-95"
                        >
                            <Plus size={18} />
                            Add Circuit
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
                        <div className="grid grid-cols-1 gap-4 lg:hidden mb-8">
                            {filteredCircuits.map((circuit) => (
                                <div key={circuit.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg break-all">{circuit.customerCircuitId}</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase border ${typeBadge(circuit.type)}`}>
                                                {circuit.type}
                                            </span>
                                            <button
                                                onClick={() => setDetailCircuit(circuit)}
                                                className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                                                title="View vendor details & emails"
                                            >
                                                <Eye size={14} />
                                            </button>
                                            {isSuperAdmin() && (
                                                <button
                                                    onClick={() => openEdit(circuit)}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="Edit circuit"
                                                >
                                                    <Pencil size={14} className="text-gray-400" />
                                                </button>
                                            )}
                                            {canDelete() && (
                                                <button
                                                    onClick={() => setCircuitToDelete(circuit)}
                                                    className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-brand-red rounded-lg transition-colors"
                                                    title="Delete circuit"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 pt-2 border-t border-gray-50">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 font-medium">Vendor:</span>
                                            <button
                                                type="button"
                                                onClick={() => setDetailCircuit(circuit)}
                                                className="font-bold text-gray-800 text-right hover:text-brand-red transition-colors flex items-center gap-1.5"
                                                title="Click to view vendor details & emails"
                                            >
                                                {circuit.isMultiVendor ? (
                                                    <span className="text-brand-red underline decoration-dotted">
                                                        Multi-Vendor ({circuit.vendorCircuits?.length || 0})
                                                    </span>
                                                ) : (
                                                    <span>{circuit.vendor?.name || '—'}</span>
                                                )}
                                                <Eye size={12} className="text-gray-400" />
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 font-medium">Client:</span>
                                            <span className="font-bold text-gray-800">{circuit.client?.name || '—'}</span>
                                        </div>
                                        {circuit.mrc > 0 && !circuit.isMultiVendor && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 font-medium">MRC:</span>
                                                <span className="font-bold text-gray-800">${circuit.mrc.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {circuit.isMultiVendor && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 font-medium">Total MRC:</span>
                                                <span className="font-bold text-gray-800">
                                                    ${circuit.vendorCircuits?.reduce((sum, vc) => sum + (vc.supplierMrc || 0), 0).toLocaleString() || 0}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/30">
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Circuit ID</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Client</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">MRC</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right w-28">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCircuits.map((circuit) => (
                                            <tr key={circuit.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold text-gray-800">{circuit.customerCircuitId}</span>
                                                    {circuit.supplierCircuitId && (
                                                        <p className="text-xs text-gray-400 font-medium mt-0.5">{circuit.supplierCircuitId}</p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase border ${typeBadge(circuit.type)}`}>
                                                        {circuit.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                                                    {circuit.isMultiVendor ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDetailCircuit(circuit)}
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-brand-red font-semibold text-xs transition-all border border-red-200/60 shadow-xs cursor-pointer group/btn"
                                                            title="Click to view all vendors & NOC emails"
                                                        >
                                                            <div className="w-2 h-2 rounded-full bg-brand-red" />
                                                            <span>Multi-Vendor ({circuit.vendorCircuits?.length || 0})</span>
                                                            <Eye size={12} className="opacity-60 group-hover/btn:opacity-100 transition-opacity" />
                                                        </button>
                                                    ) : circuit.vendor?.name ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDetailCircuit(circuit)}
                                                            className="text-left group/btn hover:text-brand-red transition-colors cursor-pointer block"
                                                            title="Click to view vendor details & NOC emails"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                                                <span className="text-gray-800 font-semibold group-hover/btn:text-brand-red transition-colors">{circuit.vendor.name}</span>
                                                                <Eye size={12} className="text-gray-400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                                            </div>
                                                            {circuit.vendor.emails && circuit.vendor.emails.length > 0 && (
                                                                <p className="text-[11px] text-gray-400 font-normal pl-4 truncate max-w-[200px]">
                                                                    {circuit.vendor.emails[0]}
                                                                </p>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 font-normal italic">None</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                                                    {circuit.client?.name
                                                        ? <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" />{circuit.client.name}</span>
                                                        : <span className="text-gray-400 font-normal italic">None</span>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {circuit.isMultiVendor 
                                                        ? `$${circuit.vendorCircuits?.reduce((sum, vc) => sum + (vc.supplierMrc || 0), 0).toLocaleString() || 0}`
                                                        : (circuit.mrc ? `$${circuit.mrc.toLocaleString()}` : '—')}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => setDetailCircuit(circuit)}
                                                            className="p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-all"
                                                            title="View vendor details & emails"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        {isSuperAdmin() && (
                                                            <button
                                                                onClick={() => openEdit(circuit)}
                                                                className="p-2 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded-lg transition-all"
                                                                title="Edit circuit"
                                                            >
                                                                <Pencil size={14} className="text-gray-500" />
                                                            </button>
                                                        )}
                                                        {canDelete() && (
                                                            <button
                                                                onClick={() => setCircuitToDelete(circuit)}
                                                                className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-brand-red rounded-lg transition-all"
                                                                title="Delete circuit"
                                                            >
                                                                <Trash2 size={14} />
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

            <DeleteConfirmModal
                isOpen={!!circuitToDelete}
                title="Delete Circuit"
                itemName={circuitToDelete?.customerCircuitId || ''}
                itemType="Circuit"
                isLoading={isDeletingCircuit}
                onConfirm={handleDeleteCircuit}
                onClose={() => setCircuitToDelete(null)}
            />
        </div>
    );
};

export default CircuitsPage;
