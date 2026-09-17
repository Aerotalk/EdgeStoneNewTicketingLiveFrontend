import React, { useState, useEffect } from 'react';
import {
    X,
    Shield,
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
    Loader2,
    Check,
    Building2,
    User,
    Eye,
    ArrowLeft,
    AlertCircle,
    Zap,
    Edit2,
    Info
} from 'lucide-react';
import { circuitService } from '../../services/circuitService';
import { slaService } from '../../services/slaRuleService';
import type { Circuit } from '../../services/circuitService';
import type { Sla, SlaRule } from '../../services/slaRuleService';

interface SLARulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AddStep = 'idle' | 'select-circuit' | 'select-type' | 'select-entity' | 'define-rules' | 'saving' | 'saved';

const OPERATORS = [
    { value: '>', label: '>' },
    { value: '>=', label: '≥' },
    { value: '<', label: '<' },
    { value: '<=', label: '≤' },
];

const emptyCondition: SlaRule = {
    upperLimit: null,
    upperOperator: '>',
    lowerLimit: null,
    lowerOperator: '>=',
    compensationPercentage: 0,
};

export const SLARulesModal: React.FC<SLARulesModalProps> = ({ isOpen, onClose }) => {
    // Data states
    const [slas, setSlas] = useState<Sla[]>([]);
    const [groupedSlas, setGroupedSlas] = useState<Record<string, { circuitDisplayId: string; circuitId: string; vendorSlas: Sla[]; customerSlas: Sla[] }>>({});
    const [circuits, setCircuits] = useState<Circuit[]>([]);

    // Loading states
    const [loadingRules, setLoadingRules] = useState(true);
    const [loadingCircuits, setLoadingCircuits] = useState(false);

    // View SLA expanded state
    const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

    // Add SLA flow states
    const [addStep, setAddStep] = useState<AddStep>('idle');
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null);
    const [targetType, setTargetType] = useState<'vendor' | 'customer' | null>(null);
    const [selectedEntityId, setSelectedEntityId] = useState('');
    const [selectedEntityName, setSelectedEntityName] = useState('');
    const [conditions, setConditions] = useState<SlaRule[]>([{ ...emptyCondition }]);
    const [totalPrice, setTotalPrice] = useState<number>(100000);

    // Dropdown open states
    const [circuitDropdownOpen, setCircuitDropdownOpen] = useState(false);

    // Error state
    const [error, setError] = useState('');

    // Fetch SLA rules on mount
    useEffect(() => {
        if (isOpen) {
            fetchSLARules();
        }
    }, [isOpen]);

    const fetchSLARules = async () => {
        try {
            setLoadingRules(true);
            setError('');
            const data = await slaService.getAllSlas();
            const grouped = await slaService.getGroupedSlas();
            setSlas(data);
            setGroupedSlas(grouped);
        } catch (err: any) {
            console.error('Failed to fetch SLAs:', err);
            setError('Failed to load SLAs');
            setSlas([]);
            setGroupedSlas({});
        } finally {
            setLoadingRules(false);
        }
    };

    const startAddFlow = async () => {
        setAddStep('select-type');
        setEditingRuleId(null);
        setSelectedCircuit(null);
        setTargetType(null);
        setSelectedEntityId('');
        setSelectedEntityName('');
        setConditions([{ ...emptyCondition }]);
        setTotalPrice(100000);
        setError('');

        try {
            setLoadingCircuits(true);
            const data = await circuitService.getAllCircuits();
            setCircuits(data);
        } catch (err: any) {
            console.error('Failed to fetch circuits:', err);
            setError('Failed to load circuits');
        } finally {
            setLoadingCircuits(false);
        }
    };

    const handleTypeSelect = async (type: 'vendor' | 'customer') => {
        setTargetType(type);
        setAddStep('select-circuit');
        setSelectedEntityId('');
        setSelectedEntityName('');
    };

    const handleCircuitSelect = (circuit: Circuit) => {
        setSelectedCircuit(circuit);
        setCircuitDropdownOpen(false);
        
        if (targetType === 'vendor' && circuit.vendorId && circuit.vendor) {
            setSelectedEntityId(circuit.vendorId);
            setSelectedEntityName(circuit.vendor.name);
        } else if (targetType === 'customer' && circuit.clientId && circuit.client) {
            setSelectedEntityId(circuit.clientId);
            setSelectedEntityName(circuit.client.name);
        }
        
        setAddStep('define-rules');
    };

    const addConditionRow = () => {
        setConditions(prev => [...prev, { ...emptyCondition }]);
    };

    const removeConditionRow = (index: number) => {
        setConditions(prev => prev.filter((_, i) => i !== index));
    };

    const loadStandardTemplate = () => {
        setConditions([
            { upperLimit: null, upperOperator: '>', lowerLimit: 99.9, lowerOperator: '>=', compensationPercentage: 0 },
            { upperLimit: 99.9, upperOperator: '<', lowerLimit: 99.0, lowerOperator: '>=', compensationPercentage: 5 },
            { upperLimit: 99.0, upperOperator: '<', lowerLimit: null, lowerOperator: '>=', compensationPercentage: 15 }
        ]);
    };

    const updateCondition = (index: number, field: keyof SlaRule, value: any) => {
        setConditions(prev => prev.map((c, i) => {
            if (i !== index) return c;
            return { ...c, [field]: value };
        }));
    };

    const handleSave = async () => {
        if (!selectedCircuit || !targetType || !selectedEntityId) return;

        setAddStep('saving');
        setError('');

        try {
            const appliesTo = targetType === 'vendor' ? 'VENDOR' : 'CUSTOMER';
            if (editingRuleId) {
                await slaService.updateSla(editingRuleId, {
                    circuitId: selectedCircuit.id,
                    appliesTo,
                    vendorId: targetType === 'vendor' ? selectedEntityId : undefined,
                    customerId: targetType === 'customer' ? selectedEntityId : undefined,
                    totalPrice,
                    rules: conditions,
                });
            } else {
                await slaService.createSla({
                    circuitId: selectedCircuit.id,
                    appliesTo,
                    vendorId: targetType === 'vendor' ? selectedEntityId : undefined,
                    customerId: targetType === 'customer' ? selectedEntityId : undefined,
                    totalPrice,
                    rules: conditions,
                });
            }
            setAddStep('saved');
            // Refresh rules list
            await fetchSLARules();
            // Auto-dismiss after 2s
            setTimeout(() => {
                setAddStep('idle');
            }, 2000);
        } catch (err: any) {
            console.error('Failed to save SLA rule:', err);
            setError(err.message || 'Failed to save SLA rule. Please try again.');
            setAddStep('define-rules');
        }
    };

    const resetAddFlow = () => {
        setAddStep('idle');
        setSelectedCircuit(null);
        setTargetType(null);
        setSelectedEntityId('');
        setSelectedEntityName('');
        setConditions([{ ...emptyCondition }]);
        setTotalPrice(100000);
        setError('');
        setEditingRuleId(null);
    };

    const startEditFlow = (sla: Sla) => {
        setEditingRuleId(sla.id);
        setSelectedCircuit(sla.circuit as Circuit);
        setTargetType(sla.appliesTo === 'VENDOR' ? 'vendor' : 'customer');
        setSelectedEntityId(sla.appliesTo === 'VENDOR' ? sla.vendorId! : sla.customerId!);
        setSelectedEntityName(sla.appliesTo === 'VENDOR' ? (sla.vendor?.name || '') : (sla.customer?.name || ''));
        setConditions(sla.rules.map(r => ({ ...r })));
        setTotalPrice(sla.totalPrice ?? 100000);
        setAddStep('define-rules');
    };

    const goBack = () => {
        switch (addStep) {
            case 'select-type': resetAddFlow(); break;
            case 'select-circuit': setAddStep('select-type'); break;
            case 'define-rules': setAddStep('select-circuit'); break;
            default: break;
        }
    };

    if (!isOpen) return null;

    const renderConditionTable = (ruleConditions: SlaRule[]) => (
        <div className="mb-4 last:mb-0">
            <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/80">
                            <th className="px-4 py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Upper Limit</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Op</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Av</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Op</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Lower Limit</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Service Credit %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ruleConditions.map((c, i) => (
                            <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-2.5 text-sm font-semibold text-gray-700">
                                    {c.upperLimit !== null ? `${c.upperLimit}%` : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-sm font-bold text-gray-500 text-center">
                                    {c.upperOperator ? OPERATORS.find(o => o.value === c.upperOperator)?.label || c.upperOperator : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[11px] font-bold">Av</span>
                                </td>
                                <td className="px-4 py-2.5 text-sm font-bold text-gray-500 text-center">
                                    {c.lowerOperator ? OPERATORS.find(o => o.value === c.lowerOperator)?.label || c.lowerOperator : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-sm font-semibold text-gray-700">
                                    {c.lowerLimit !== null ? `${c.lowerLimit}%` : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-bold ${c.compensationPercentage === 0
                                        ? 'bg-green-50 text-green-600'
                                        : 'bg-red-50 text-red-600'
                                        }`}>
                                        {c.compensationPercentage}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <>
            {/* Custom styles */}
            <style>{`
                @keyframes sla-modal-in {
                    0% { opacity: 0; transform: scale(0.95) translateY(10px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes sla-fade-in {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                @keyframes sla-slide-up {
                    0% { opacity: 0; transform: translateY(12px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes sla-checkmark {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes sla-pulse-ring {
                    0% { transform: scale(0.8); opacity: 1; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
                .sla-modal-enter { animation: sla-modal-in 0.3s ease-out forwards; }
                .sla-fade-enter { animation: sla-fade-in 0.2s ease-out forwards; }
                .sla-slide-enter { animation: sla-slide-up 0.3s ease-out forwards; }
                .sla-checkmark-enter { animation: sla-checkmark 0.5s ease-out forwards; }
                .sla-pulse-ring { animation: sla-pulse-ring 1s ease-out infinite; }
            `}</style>

            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] sla-fade-enter"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-[0_32px_128px_-12px_rgba(0,0,0,0.25)] border border-gray-100/50 flex flex-col pointer-events-auto sla-modal-enter overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            {addStep !== 'idle' && addStep !== 'saving' && addStep !== 'saved' && (
                                <button
                                    onClick={goBack}
                                    className="p-1.5 -ml-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
                                >
                                    <ArrowLeft size={20} strokeWidth={2.5} />
                                </button>
                            )}
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-red/10 to-brand-red/5 text-brand-red rounded-xl flex items-center justify-center">
                                <Shield size={22} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 tracking-tight">SLA Rules</h2>
                                <p className="text-[12px] text-gray-400 font-medium">
                                    {addStep === 'idle' && 'Manage service level agreement rules'}
                                    {addStep === 'select-type' && 'Step 1 — Vendor or Customer?'}
                                    {addStep === 'select-circuit' && 'Step 2 — Select a circuit'}
                                    {addStep === 'define-rules' && 'Step 3 — Define SLA conditions'}
                                    {addStep === 'saving' && editingRuleId && 'Updating SLA rule...'}
                                    {addStep === 'saving' && !editingRuleId && 'Saving SLA rule...'}
                                    {addStep === 'saved' && editingRuleId && 'SLA rule updated successfully!'}
                                    {addStep === 'saved' && !editingRuleId && 'SLA rule saved successfully!'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-6">
                        {/* Error */}
                        {error && (
                            <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl sla-slide-enter">
                                <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                                <p className="text-sm font-semibold text-red-600">{error}</p>
                            </div>
                        )}

                        {/* =================== IDLE VIEW: Show existing rules + Add button =================== */}
                        {addStep === 'idle' && (
                            <>
                                {/* Add SLA Button */}
                                <button
                                    onClick={startAddFlow}
                                    className="w-full flex items-center justify-center gap-2 px-5 py-3 mb-6 bg-brand-red hover:bg-[#d41c34] text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-red/20 active:scale-[0.98]"
                                >
                                    <Plus size={18} strokeWidth={2.5} />
                                    Add SLA Rule
                                </button>

                                {/* Existing SLA Rules */}
                                {loadingRules ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
                                        <p className="text-sm font-medium text-gray-400">Loading SLA rules...</p>
                                    </div>
                                ) : Object.keys(groupedSlas).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                                        <Shield size={48} strokeWidth={1} className="text-gray-200" />
                                        <p className="font-bold text-lg text-gray-300">No SLA rules defined</p>
                                        <p className="text-sm">Click "Add SLA Rule" to create your first rule.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {Object.entries(groupedSlas).map(([circuitId, group]) => (
                                            <div key={circuitId} className="border border-gray-100 rounded-2xl overflow-hidden transition-all sla-slide-enter">
                                                {/* Card header */}
                                                <div className="px-5 py-4 bg-white">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                                            <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <Zap size={18} className="text-gray-400" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-sm font-bold text-gray-900 truncate">{group.circuitDisplayId}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                                    {group.vendorSlas.length > 0 && (
                                                                        <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                                                                            <Building2 size={12} />
                                                                            {group.vendorSlas.map(s => s.vendor?.name).filter(Boolean).join(', ')}
                                                                        </span>
                                                                    )}
                                                                    {group.customerSlas.length > 0 && (
                                                                        <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                                                                            <User size={12} />
                                                                            {group.customerSlas.map(s => s.customer?.name).filter(Boolean).join(', ')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setExpandedRuleId(expandedRuleId === circuitId ? null : circuitId)}
                                                            className="flex items-center gap-2 px-3.5 py-2 text-[12px] font-bold text-brand-red bg-brand-red/5 hover:bg-brand-red/10 rounded-lg transition-all active:scale-95 flex-shrink-0"
                                                        >
                                                            <Eye size={14} />
                                                            {expandedRuleId === circuitId ? 'Hide' : 'View SLA'}
                                                            {expandedRuleId === circuitId ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Expanded SLA details */}
                                                {expandedRuleId === circuitId && (
                                                    <div className="px-5 pb-5 border-t border-gray-50 bg-gray-50/30 sla-slide-enter">
                                                        <div className="pt-4 space-y-5">
                                                            {/* Vendor Side Rules */}
                                                            {group.vendorSlas.length > 0 && (
                                                                <div>
                                                                    {group.vendorSlas.map(sla => (
                                                                        <div key={sla.id} className="mb-3 last:mb-0">
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <div className="flex items-center gap-2">
                                                                                    <Building2 size={15} className="text-blue-500" />
                                                                                    <h4 className="text-[13px] font-bold text-gray-700">Vendor Side SLA</h4>
                                                                                    <span className="text-[11px] font-medium text-gray-400">({sla.vendor?.name})</span>
                                                                                </div>
                                                                                <button 
                                                                                    onClick={() => startEditFlow(sla)}
                                                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-gray-500 hover:text-brand-red bg-white border border-gray-200 hover:border-brand-red/30 hover:bg-brand-red/5 rounded-lg transition-all"
                                                                                >
                                                                                    <Edit2 size={12} />
                                                                                    Edit
                                                                                </button>
                                                                            </div>
                                                                            {renderConditionTable(sla.rules)}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Customer Side Rules */}
                                                            {group.customerSlas.length > 0 && (
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <User size={15} className="text-emerald-500" />
                                                                        <h4 className="text-[13px] font-bold text-gray-700">Customer Side SLA</h4>
                                                                    </div>
                                                                    {group.customerSlas.map(sla => (
                                                                        <div key={sla.id} className="mb-3 last:mb-0">
                                                                            <div className="flex items-center justify-between mb-1.5 px-1">
                                                                                <p className="text-[11px] font-semibold text-gray-400">{sla.customer?.name}</p>
                                                                                <button 
                                                                                    onClick={() => startEditFlow(sla)}
                                                                                    className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-brand-red bg-white border border-gray-100 hover:border-brand-red/30 hover:bg-brand-red/5 rounded-md transition-all"
                                                                                >
                                                                                    <Edit2 size={12} />
                                                                                    Edit
                                                                                </button>
                                                                            </div>
                                                                            {renderConditionTable(sla.rules)}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {group.vendorSlas.length === 0 && group.customerSlas.length === 0 && (
                                                                <p className="text-sm text-gray-400 text-center py-4">No rules defined for this circuit yet.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* =================== STEP 1: Select Type (Vendor/Customer) =================== */}
                        {addStep === 'select-type' && (
                            <div className="sla-slide-enter">
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                                    Define SLA for
                                </label>
                                <p className="text-sm text-gray-500 mb-5 px-1">
                                    Choose whether this SLA rule applies to a Vendor or Customer circuit.
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleTypeSelect('vendor')}
                                        className="group flex flex-col items-center gap-3 p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-300 hover:bg-blue-50/30 transition-all active:scale-[0.97]"
                                    >
                                        <div className="w-14 h-14 bg-blue-50 group-hover:bg-blue-100 text-blue-500 rounded-xl flex items-center justify-center transition-colors">
                                            <Building2 size={28} />
                                        </div>
                                        <span className="text-[14px] font-bold text-gray-700 group-hover:text-blue-700">Vendor</span>
                                    </button>

                                    <button
                                        onClick={() => handleTypeSelect('customer')}
                                        className="group flex flex-col items-center gap-3 p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-all active:scale-[0.97]"
                                    >
                                        <div className="w-14 h-14 bg-emerald-50 group-hover:bg-emerald-100 text-emerald-500 rounded-xl flex items-center justify-center transition-colors">
                                            <User size={28} />
                                        </div>
                                        <span className="text-[14px] font-bold text-gray-700 group-hover:text-emerald-700">Customer</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* =================== STEP 2: Select Circuit =================== */}
                        {addStep === 'select-circuit' && (
                            <div className="sla-slide-enter">
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                                    Select Circuit
                                </label>
                                <p className="text-sm text-gray-500 mb-5 px-1">
                                    Target: <span className="font-bold text-gray-800 capitalize">{targetType}</span>
                                </p>

                                {loadingCircuits ? (
                                    <div className="flex items-center justify-center py-12 gap-3">
                                        <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
                                        <p className="text-sm font-medium text-gray-400">Loading circuits...</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <button
                                            onClick={() => setCircuitDropdownOpen(!circuitDropdownOpen)}
                                            className={`w-full h-[56px] border rounded-2xl px-4 flex items-center justify-between transition-all active:scale-[0.98] ${circuitDropdownOpen
                                                ? 'bg-white border-[#0F172A] ring-4 ring-[#0F172A]/5'
                                                : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'
                                                }`}
                                        >
                                            <span className={`text-[14px] font-bold truncate ${selectedCircuit ? 'text-gray-900' : 'text-gray-400'}`}>
                                                {selectedCircuit
                                                    ? `${targetType === 'vendor' ? (selectedCircuit.supplierCircuitId || selectedCircuit.customerCircuitId) : selectedCircuit.customerCircuitId} (${selectedCircuit.type === 'PROTECTED' ? 'Protected' : 'Unprotected'})`
                                                    : 'Choose a circuit...'
                                                }
                                            </span>
                                            <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${circuitDropdownOpen ? 'rotate-180 text-gray-900' : ''}`} />
                                        </button>

                                        {circuitDropdownOpen && (
                                            <div className="mt-2 bg-white border border-gray-100 rounded-2xl shadow-lg max-h-[260px] overflow-y-auto p-2 sla-slide-enter">
                                                {(() => {
                                                    const existingIds = slas
                                                        .filter(s => s.appliesTo === (targetType === 'vendor' ? 'VENDOR' : 'CUSTOMER'))
                                                        .map(s => s.circuitId);

                                                    const filteredCircuits = circuits.filter(c => {
                                                        if (existingIds.includes(c.id)) return false;
                                                        if (targetType === 'vendor') return !!c.vendorId;
                                                        if (targetType === 'customer') return !!c.clientId;
                                                        return true;
                                                    });

                                                    if (filteredCircuits.length === 0) {
                                                        return <p className="text-sm text-gray-400 text-center py-4">No eligible circuits found</p>;
                                                    }
                                                    
                                                    return filteredCircuits.map(circuit => (
                                                        <button
                                                            key={circuit.id}
                                                            onClick={() => handleCircuitSelect(circuit)}
                                                            className="w-full px-3.5 py-3 text-left rounded-xl transition-all flex items-center justify-between mb-0.5 last:mb-0 hover:bg-gray-50 active:bg-gray-100"
                                                        >
                                                            <div>
                                                                <span className="text-[13px] font-bold text-gray-900 block">{targetType === 'vendor' ? (circuit.supplierCircuitId || circuit.customerCircuitId) : circuit.customerCircuitId}</span>
                                                                <span className="text-[11px] text-gray-400 font-medium">
                                                                    {targetType === 'vendor' ? (circuit.vendor?.name ?? '—') : (circuit.client?.name ?? '—')}
                                                                </span>
                                                            </div>
                                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${circuit.type === 'PROTECTED'
                                                                ? 'bg-green-50 text-green-600'
                                                                : 'bg-orange-50 text-orange-600'
                                                                }`}>
                                                                {circuit.type === 'PROTECTED' ? 'Protected' : 'Unprotected'}
                                                            </span>
                                                        </button>
                                                    ));
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* =================== STEP 4: Define Rules =================== */}
                        {addStep === 'define-rules' && (
                            <div className="sla-slide-enter">
                                {/* Summary breadcrumb */}
                                <div className="flex items-center gap-2 flex-wrap text-[12px] text-gray-400 font-medium mb-5 px-1">
                                    <span className="font-bold text-gray-600">{selectedCircuit ? (targetType === 'vendor' ? (selectedCircuit.supplierCircuitId || selectedCircuit.customerCircuitId) : selectedCircuit.customerCircuitId) : ''}</span>
                                    <ChevronRight size={12} />
                                    <span className="capitalize font-bold text-gray-600">{targetType}</span>
                                    <ChevronRight size={12} />
                                    <span className="font-bold text-gray-800">{selectedEntityName}</span>
                                </div>

                                <div className="mb-5">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                                        Total Price
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Enter total price"
                                        value={totalPrice}
                                        onChange={e => setTotalPrice(parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all text-gray-800"
                                    />
                                </div>

                                <div className="flex items-center justify-between mb-3 px-1">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                        Define Availability Factor Ranges
                                    </label>
                                    <button
                                        onClick={loadStandardTemplate}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[11px] font-bold transition-all active:scale-95 border border-blue-100"
                                    >
                                        <Zap size={14} />
                                        Load Standard Template (99.9%)
                                    </button>
                                </div>

                                <div className="mb-5 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                   <div className="flex items-start gap-3">
                                       <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                       <div className="text-sm text-blue-800">
                                           <h4 className="font-bold mb-1.5">How to setup an SLA without overlapping errors:</h4>
                                           <ul className="list-disc list-inside space-y-1 mb-2">
                                               <li><span className="font-semibold text-gray-700">Safe Tier (0% Credit):</span> Leave Upper Limit blank. Set Lower to <span className="font-mono bg-blue-100 px-1 rounded text-blue-700 font-bold">&ge; 99.9</span></li>
                                               <li><span className="font-semibold text-gray-700">Minor Breach (5% Credit):</span> Set Upper to <span className="font-mono bg-blue-100 px-1 rounded text-blue-700 font-bold">&lt; 99.9</span> and Lower to <span className="font-mono bg-blue-100 px-1 rounded text-blue-700 font-bold">&ge; 99.0</span></li>
                                               <li><span className="font-semibold text-gray-700">Major Breach (15% Credit):</span> Set Upper to <span className="font-mono bg-blue-100 px-1 rounded text-blue-700 font-bold">&lt; 99.0</span>. Leave Lower Limit blank.</li>
                                           </ul>
                                           <p className="text-[11px] font-semibold text-blue-600 bg-blue-100/50 inline-block px-2 py-1 rounded-md">
                                               ⚠️ Use &lt; for upper limits and &ge; for lower limits to ensure ranges don't overlap!
                                           </p>
                                       </div>
                                   </div>
                                </div>

                                <div className="space-y-3 mb-5">
                                    {conditions.map((cond, index) => (
                                        <div key={index} className="bg-gray-50/70 rounded-xl p-4 border border-gray-100 sla-slide-enter" style={{ animationDelay: `${index * 50}ms` }}>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[11px] font-bold text-gray-400 uppercase">Range {index + 1}</span>
                                                {conditions.length > 1 && (
                                                    <button
                                                        onClick={() => removeConditionRow(index)}
                                                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-12 gap-2 items-center">
                                                {/* Upper Limit */}
                                                <div className="col-span-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Upper %"
                                                        value={cond.upperLimit ?? ''}
                                                        onChange={e => updateCondition(index, 'upperLimit', e.target.value === '' ? null : parseFloat(e.target.value))}
                                                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all placeholder:text-gray-300"
                                                    />
                                                </div>

                                                {/* Upper Operator */}
                                                <div className="col-span-2">
                                                    <select
                                                        value={cond.upperOperator || '>'}
                                                        onChange={e => updateCondition(index, 'upperOperator', e.target.value)}
                                                        className="w-full px-2 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-center text-gray-700 focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all appearance-none cursor-pointer"
                                                    >
                                                        {OPERATORS.map(op => (
                                                            <option key={op.value} value={op.value}>{op.label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Av label */}
                                                <div className="col-span-1 flex items-center justify-center">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[11px] font-bold">Av</span>
                                                </div>

                                                {/* Lower Operator */}
                                                <div className="col-span-2">
                                                    <select
                                                        value={cond.lowerOperator || '>='}
                                                        onChange={e => updateCondition(index, 'lowerOperator', e.target.value)}
                                                        className="w-full px-2 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-center text-gray-700 focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all appearance-none cursor-pointer"
                                                    >
                                                        {OPERATORS.map(op => (
                                                            <option key={op.value} value={op.value}>{op.label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Lower Limit */}
                                                <div className="col-span-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Lower %"
                                                        value={cond.lowerLimit ?? ''}
                                                        onChange={e => updateCondition(index, 'lowerLimit', e.target.value === '' ? null : parseFloat(e.target.value))}
                                                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all placeholder:text-gray-300"
                                                    />
                                                </div>

                                                {/* Delete spacer for alignment */}
                                                <div className="col-span-1" />
                                            </div>

                                            {/* Compensation row */}
                                        <div className="mt-3 flex items-center gap-3">
                                                <label className="text-[11px] font-bold text-gray-400 uppercase whitespace-nowrap">Service Credit:</label>
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        placeholder="0"
                                                        value={cond.compensationPercentage || ''}
                                                        onChange={e => updateCondition(index, 'compensationPercentage', parseFloat(e.target.value) || 0)}
                                                        className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all placeholder:text-gray-300"
                                                    />
                                                    <span className="text-sm font-bold text-gray-400">% of MRC</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Add more row button */}
                                <button
                                    onClick={addConditionRow}
                                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 hover:border-brand-red/30 text-gray-400 hover:text-brand-red rounded-xl text-sm font-bold transition-all hover:bg-brand-red/5 active:scale-[0.98]"
                                >
                                    <Plus size={16} strokeWidth={2.5} />
                                    Add Range
                                </button>
                            </div>
                        )}

                        {/* =================== SAVING STATE =================== */}
                        {addStep === 'saving' && (
                            <div className="flex flex-col items-center justify-center py-16 gap-4 sla-fade-enter">
                                <div className="relative">
                                    <Loader2 className="w-12 h-12 animate-spin text-brand-red" />
                                </div>
                                <p className="text-sm font-bold text-gray-500">Saving SLA rule...</p>
                                <p className="text-[12px] text-gray-400">Please wait while we save your configuration</p>
                            </div>
                        )}

                        {/* =================== SAVED STATE =================== */}
                        {addStep === 'saved' && (
                            <div className="flex flex-col items-center justify-center py-16 gap-4 sla-fade-enter">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-green-400/20 rounded-full sla-pulse-ring" />
                                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200 sla-checkmark-enter">
                                        <Check size={32} className="text-white" strokeWidth={3} />
                                    </div>
                                </div>
                                <p className="text-lg font-bold text-gray-900">SLA Rule Saved!</p>
                                <p className="text-sm text-gray-400">The rule has been added successfully</p>
                            </div>
                        )}
                    </div>

                    {/* Footer - Save button (only in define-rules step) */}
                    {addStep === 'define-rules' && (
                        <div className="px-8 py-5 border-t border-gray-100 flex-shrink-0 bg-white">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={resetAddFlow}
                                    className="flex-1 h-[48px] bg-gray-50 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-all active:scale-[0.98] text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={conditions.length === 0 || conditions.some(c => c.upperLimit === null && c.lowerLimit === null)}
                                    className={`flex-1 h-[48px] bg-brand-red text-white font-bold rounded-xl shadow-lg shadow-brand-red/20 hover:bg-[#d41c34] transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2 ${(conditions.length === 0 || conditions.some(c => c.upperLimit === null && c.lowerLimit === null)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Shield size={16} />
                                    Save SLA Rule
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
