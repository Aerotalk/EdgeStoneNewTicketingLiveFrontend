import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FileText,
    X,
    Save,
    ChevronLeft,
    ChevronRight,
    Sun,
    CloudSun,
    Moon,
    Clock,
    CheckCircle2,
    Copy,
    History,
    Search,
    Loader2,
    Calendar,
    Maximize2,
    Minimize2,
    Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    type ShiftType,
    SHIFT_CONFIG,
    resolveCurrentShift,
    formatDateDisplay,
    getPreviousShift,
    addDaysToDateStr,
    DEFAULT_HANDOVER_TEMPLATE
} from '../../utils/shiftUtils';
import {
    handoverService,
    type ShiftHandover,
    type HandoverHistoryGroup
} from '../../services/handoverService';

interface ShiftHandoverDrawerProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const ShiftHandoverDrawer: React.FC<ShiftHandoverDrawerProps> = ({
    isOpen = false,
    onClose
}) => {
    // Current real-time shift metadata
    const realTimeShift = useRef(resolveCurrentShift());

    // Navigation State
    const [selectedDate, setSelectedDate] = useState<string>(realTimeShift.current.date);
    const [selectedShift, setSelectedShift] = useState<ShiftType>(realTimeShift.current.shift);
    const [viewMode, setViewMode] = useState<'editor' | 'history'>('editor');
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    // Active Handover State
    const [currentData, setCurrentData] = useState<ShiftHandover | null>(null);
    const [content, setContent] = useState<string>('');
    const [status, setStatus] = useState<'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED'>('DRAFT');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isAcknowledging, setIsAcknowledging] = useState<boolean>(false);
    const [isCarryingForward, setIsCarryingForward] = useState<boolean>(false);
    const [saveState, setSaveState] = useState<'saved' | 'saving' | 'dirty'>('saved');

    // History State
    const [historyGroups, setHistoryGroups] = useState<HandoverHistoryGroup[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
    const [historySearch, setHistorySearch] = useState<string>('');
    const [historyShiftFilter, setHistoryShiftFilter] = useState<string>('');

    // Debounce timer for auto-save
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedContentRef = useRef<string>('');

    // Sync real-time on open
    useEffect(() => {
        if (isOpen) {
            const now = resolveCurrentShift();
            realTimeShift.current = now;
            loadHandover(selectedDate, selectedShift);
        }
    }, [isOpen]);

    // Fetch handover for specific date & shift
    const loadHandover = useCallback(async (date: string, shift: ShiftType) => {
        setIsLoading(true);
        setSaveState('saved');
        try {
            const data = await handoverService.getByDateAndShift(date, shift);
            setCurrentData(data);
            setContent(data.content || '');
            setStatus(data.status || 'DRAFT');
            lastSavedContentRef.current = data.content || '';
        } catch (error: any) {
            console.error('Failed to load handover:', error);
            toast.error(error.message || 'Failed to load handover notes');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Change date or shift
    const handleDateShiftChange = (newDate: string, newShift: ShiftType) => {
        if (newDate === selectedDate && newShift === selectedShift) return;
        setSelectedDate(newDate);
        setSelectedShift(newShift);
        loadHandover(newDate, newShift);
    };

    // Auto-save logic with debounce
    const triggerAutoSave = (newContent: string) => {
        setContent(newContent);
        setSaveState('dirty');

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(() => {
            saveHandoverData(newContent, status, false);
        }, 1500);
    };

    // Save handover
    const saveHandoverData = async (
        contentToSave: string,
        newStatus: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' = status,
        showToast = true
    ) => {
        if (contentToSave === lastSavedContentRef.current && newStatus === status && currentData?.id) {
            setSaveState('saved');
            return;
        }

        setIsSaving(true);
        setSaveState('saving');
        try {
            const updated = await handoverService.saveHandover({
                date: selectedDate,
                shift: selectedShift,
                content: contentToSave,
                status: newStatus
            });

            setCurrentData(updated);
            setStatus(updated.status);
            lastSavedContentRef.current = updated.content;
            setSaveState('saved');
            if (showToast) {
                toast.success('Handover notes saved successfully');
            }
        } catch (error: any) {
            console.error('Failed to save handover:', error);
            setSaveState('dirty');
            toast.error(error.message || 'Failed to save notes');
        } finally {
            setIsSaving(false);
        }
    };

    // Acknowledge handover
    const handleAcknowledge = async () => {
        if (!currentData?.id) {
            toast.error('Please save the handover first before acknowledging.');
            return;
        }

        setIsAcknowledging(true);
        try {
            const updated = await handoverService.acknowledgeHandover(currentData.id);
            setCurrentData(updated);
            setStatus('ACKNOWLEDGED');
            toast.success('Handover marked as Acknowledged');
        } catch (error: any) {
            console.error('Failed to acknowledge:', error);
            toast.error(error.message || 'Failed to acknowledge handover');
        } finally {
            setIsAcknowledging(false);
        }
    };

    // Carry forward from previous shift
    const handleCarryForward = async () => {
        setIsCarryingForward(true);
        try {
            const res = await handoverService.carryForwardPrevious(selectedDate, selectedShift);
            if (!res.found || !res.handover?.content) {
                toast(res.message || 'No notes found from previous shift to copy.', { icon: 'ℹ️' });
                return;
            }

            const prevTitle = res.previousInfo?.title || 'Previous Shift Handover';
            const appendText = `\n\n--- 📋 Carried Forward from ${prevTitle} ---\n${res.handover.content}`;
            const mergedContent = content ? `${content}${appendText}` : res.handover.content;

            setContent(mergedContent);
            triggerAutoSave(mergedContent);
            toast.success(`Copied notes from ${res.previousInfo?.shiftName || 'previous'} shift!`);
        } catch (error: any) {
            console.error('Failed to carry forward:', error);
            toast.error(error.message || 'Failed to copy previous shift notes');
        } finally {
            setIsCarryingForward(false);
        }
    };

    // Insert Default Template
    const handleInsertTemplate = () => {
        if (content.trim()) {
            if (!window.confirm('Append standard handover template to current notes?')) return;
            const updated = `${content}\n\n${DEFAULT_HANDOVER_TEMPLATE}`;
            setContent(updated);
            triggerAutoSave(updated);
        } else {
            setContent(DEFAULT_HANDOVER_TEMPLATE);
            triggerAutoSave(DEFAULT_HANDOVER_TEMPLATE);
        }
        toast.success('Template inserted');
    };

    // Load History
    const loadHistory = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const data = await handoverService.getHistory({
                shift: historyShiftFilter || undefined,
                search: historySearch || undefined,
                limit: 60
            });
            setHistoryGroups(data.groupedByDate || []);
        } catch (error: any) {
            console.error('Failed to load history:', error);
            toast.error('Failed to load handover history');
        } finally {
            setIsLoadingHistory(false);
        }
    }, [historyShiftFilter, historySearch]);

    useEffect(() => {
        if (viewMode === 'history') {
            loadHistory();
        }
    }, [viewMode, loadHistory]);

    if (!isOpen) return null;

    const currentConfig = SHIFT_CONFIG[selectedShift];
    const isCurrentRealTimeShift =
        selectedDate === realTimeShift.current.date &&
        selectedShift === realTimeShift.current.shift;

    const previousShiftInfo = getPreviousShift(selectedDate, selectedShift);

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Slide-over Drawer Container */}
            <div
                className={`relative z-10 bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 transition-all duration-300 ease-out ${
                    isExpanded ? 'w-full md:w-[920px]' : 'w-full md:w-[640px]'
                }`}
            >
                {/* Top Header */}
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                            <FileText size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-800">Shift Handover Registry</h2>
                                {isCurrentRealTimeShift && (
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        LIVE SHIFT
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                                Shift-wise & Date-wise operational transition logs (IST)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* View Switcher Button */}
                        <button
                            onClick={() => setViewMode(viewMode === 'editor' ? 'history' : 'editor')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                viewMode === 'history'
                                    ? 'bg-brand-red text-white shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                            title="Toggle between Handover Editor and History Logs"
                        >
                            <History size={14} />
                            {viewMode === 'history' ? 'Active Editor' : 'History Logs'}
                        </button>

                        {/* Maximize Toggle */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="hidden md:flex p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
                            title={isExpanded ? 'Collapse Drawer' : 'Expand Drawer'}
                        >
                            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                            title="Close Handover"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {viewMode === 'editor' ? (
                    <>
                        {/* Date Navigation Bar */}
                        <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            {/* Date Stepper */}
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                                <button
                                    onClick={() => handleDateShiftChange(addDaysToDateStr(selectedDate, -1), selectedShift)}
                                    className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-all"
                                    title="Previous Day"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                <div className="relative flex items-center px-2">
                                    <Calendar size={14} className="text-slate-400 mr-1.5 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleDateShiftChange(e.target.value, selectedShift);
                                            }
                                        }}
                                        className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                                    />
                                </div>

                                <button
                                    onClick={() => handleDateShiftChange(addDaysToDateStr(selectedDate, 1), selectedShift)}
                                    className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-all"
                                    title="Next Day"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            {/* Today Shortcut Button */}
                            <button
                                onClick={() => handleDateShiftChange(realTimeShift.current.date, realTimeShift.current.shift)}
                                className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-all ${
                                    selectedDate === realTimeShift.current.date
                                        ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                Today (Current Shift)
                            </button>

                            {/* Save Status Pill */}
                            <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 ml-auto">
                                {saveState === 'saving' && (
                                    <>
                                        <Loader2 size={12} className="animate-spin text-amber-500" />
                                        <span>Saving changes...</span>
                                    </>
                                )}
                                {saveState === 'saved' && (
                                    <>
                                        <Check size={12} className="text-emerald-500" />
                                        <span className="text-emerald-700">Auto-saved</span>
                                    </>
                                )}
                                {saveState === 'dirty' && (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                                        <span>Unsaved changes</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Shift Selector Tabs */}
                        <div className="px-5 pt-3 pb-2 bg-slate-50/70 border-b border-slate-200">
                            <div className="grid grid-cols-3 gap-2">
                                {(['A', 'B', 'C'] as ShiftType[]).map((shiftKey) => {
                                    const cfg = SHIFT_CONFIG[shiftKey];
                                    const isSelected = selectedShift === shiftKey;
                                    const isRealTime =
                                        selectedDate === realTimeShift.current.date &&
                                        realTimeShift.current.shift === shiftKey;

                                    return (
                                        <button
                                            key={shiftKey}
                                            onClick={() => handleDateShiftChange(selectedDate, shiftKey)}
                                            className={`flex flex-col p-2.5 rounded-xl border text-left transition-all relative ${
                                                isSelected
                                                    ? 'bg-white border-amber-400 shadow-sm ring-2 ring-amber-400/20'
                                                    : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-1.5">
                                                    {shiftKey === 'A' && <Sun size={14} className="text-amber-500" />}
                                                    {shiftKey === 'B' && <CloudSun size={14} className="text-blue-500" />}
                                                    {shiftKey === 'C' && <Moon size={14} className="text-indigo-500" />}
                                                    <span className={`text-xs font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                                        Shift {shiftKey}
                                                    </span>
                                                </div>
                                                {isRealTime && (
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Active Real-time Shift" />
                                                )}
                                            </div>
                                            <div className="text-[11px] font-semibold text-slate-500">
                                                {cfg.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                {cfg.timeRange.replace(' IST', '')}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Audit & Action Sub-Bar */}
                        <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">
                                    {formatDateDisplay(selectedDate)} – Shift {selectedShift} ({currentConfig.name})
                                </span>
                                <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        status === 'ACKNOWLEDGED'
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : status === 'SUBMITTED'
                                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}
                                >
                                    {status}
                                </span>
                            </div>

                            {/* Quick Helpers */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCarryForward}
                                    disabled={isCarryingForward}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors disabled:opacity-50"
                                    title={`Copy open notes from previous shift (${previousShiftInfo.shiftName})`}
                                >
                                    {isCarryingForward ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                                    Carry Forward ({previousShiftInfo.shift})
                                </button>
                                <button
                                    onClick={handleInsertTemplate}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold transition-colors"
                                    title="Insert standard structured handover template"
                                >
                                    Template
                                </button>
                            </div>
                        </div>

                        {/* Editor Body */}
                        <div className="flex-1 p-5 relative flex flex-col min-h-0 bg-[#FFFDF7]">
                            {isLoading && (
                                <div className="absolute inset-0 bg-[#FFFDF7]/80 backdrop-blur-sm z-10 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-2 text-slate-600">
                                        <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
                                        <span className="text-xs font-semibold">Loading Handover Notes...</span>
                                    </div>
                                </div>
                            )}

                            <textarea
                                value={content}
                                onChange={(e) => triggerAutoSave(e.target.value)}
                                placeholder="Type handover notes, critical tickets, pending follow-ups, and circuit observations here..."
                                className="w-full flex-1 bg-transparent resize-none text-slate-800 text-sm focus:outline-none placeholder:text-amber-800/30 font-medium leading-relaxed custom-scrollbar font-mono"
                                style={{
                                    backgroundImage:
                                        'linear-gradient(transparent, transparent 27px, rgba(245, 158, 11, 0.08) 28px)',
                                    backgroundSize: '100% 28px',
                                    lineHeight: '28px'
                                }}
                            />
                        </div>

                        {/* Footer Bar */}
                        <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            {/* Metadata */}
                            <div className="text-[11px] text-slate-500 flex flex-col gap-0.5">
                                {currentData?.outgoingAgent && (
                                    <span>
                                        Handover prepared by <strong className="text-slate-700">{currentData.outgoingAgent}</strong>
                                    </span>
                                )}
                                {currentData?.incomingAgent && (
                                    <span className="text-emerald-700">
                                        Acknowledged by <strong>{currentData.incomingAgent}</strong> at{' '}
                                        {currentData.acknowledgedAt
                                            ? new Date(currentData.acknowledgedAt).toLocaleTimeString([], {
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                              })
                                            : ''}
                                    </span>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                {status !== 'ACKNOWLEDGED' && (
                                    <button
                                        onClick={handleAcknowledge}
                                        disabled={isAcknowledging || !currentData?.id}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                                        title="Mark this shift handover as acknowledged by incoming shift"
                                    >
                                        {isAcknowledging ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <CheckCircle2 size={14} />
                                        )}
                                        Acknowledge Shift
                                    </button>
                                )}

                                <button
                                    onClick={() => saveHandoverData(content, 'SUBMITTED', true)}
                                    disabled={isSaving}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Save Handover
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* History & Audit Logs View */
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
                        {/* Filter Bar */}
                        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search handover notes, ticket IDs, or agents..."
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                                />
                            </div>

                            {/* Shift Filter Pills */}
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                                {['', 'A', 'B', 'C'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setHistoryShiftFilter(s)}
                                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                            historyShiftFilter === s
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {s ? `Shift ${s}` : 'All Shifts'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* History Records List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {isLoadingHistory ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                                    <span className="text-xs font-semibold">Loading handover logs...</span>
                                </div>
                            ) : historyGroups.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <Clock size={32} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-sm font-semibold">No handover records found.</p>
                                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search or shift filter.</p>
                                </div>
                            ) : (
                                historyGroups.map((group) => (
                                    <div
                                        key={group.date}
                                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                                    >
                                        <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-500" />
                                                <span className="font-bold text-xs text-slate-800">
                                                    {group.displayDate}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-slate-400">Date: {group.date}</span>
                                        </div>

                                        <div className="divide-y divide-slate-100">
                                            {(['C', 'B', 'A'] as ShiftType[]).map((shiftKey) => {
                                                const record = group.shifts[shiftKey];
                                                const cfg = SHIFT_CONFIG[shiftKey];

                                                if (!record) {
                                                    return (
                                                        <div
                                                            key={shiftKey}
                                                            className="px-4 py-3 flex items-center justify-between text-xs text-slate-400 opacity-60 hover:opacity-100 transition-opacity"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold">Shift {shiftKey}</span>
                                                                <span>({cfg.name})</span>
                                                                <span className="text-[11px] italic">— No entries recorded</span>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setViewMode('editor');
                                                                    handleDateShiftChange(group.date, shiftKey);
                                                                }}
                                                                className="text-amber-600 hover:text-amber-800 font-semibold text-[11px]"
                                                            >
                                                                + Create Note
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div
                                                        key={shiftKey}
                                                        onClick={() => {
                                                            setViewMode('editor');
                                                            handleDateShiftChange(group.date, shiftKey);
                                                        }}
                                                        className="px-4 py-3 hover:bg-amber-50/40 cursor-pointer transition-colors"
                                                    >
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-xs text-slate-900">
                                                                    {group.displayDate} – Shift {shiftKey} Handover
                                                                </span>
                                                                <span
                                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                                        record.status === 'ACKNOWLEDGED'
                                                                            ? 'bg-emerald-100 text-emerald-800'
                                                                            : record.status === 'SUBMITTED'
                                                                            ? 'bg-blue-100 text-blue-800'
                                                                            : 'bg-amber-100 text-amber-800'
                                                                    }`}
                                                                >
                                                                    {record.status}
                                                                </span>
                                                            </div>

                                                            <div className="text-[11px] text-slate-400">
                                                                {record.updatedAt
                                                                    ? new Date(record.updatedAt).toLocaleTimeString([], {
                                                                          hour: '2-digit',
                                                                          minute: '2-digit'
                                                                      })
                                                                    : ''}
                                                            </div>
                                                        </div>

                                                        <p className="text-xs text-slate-600 line-clamp-2 font-mono whitespace-pre-line bg-slate-50 p-2 rounded border border-slate-100">
                                                            {record.content || '(Empty notes)'}
                                                        </p>

                                                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                                                            <span>By: {record.outgoingAgent || 'Unknown'}</span>
                                                            {record.incomingAgent && (
                                                                <span className="text-emerald-700 font-medium">
                                                                    Ack: {record.incomingAgent}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
export default ShiftHandoverDrawer;
