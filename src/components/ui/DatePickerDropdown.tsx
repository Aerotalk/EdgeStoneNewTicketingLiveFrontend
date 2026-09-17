import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { formatDateIST } from '../../utils/dateUtils';

export type FilterType = 'all' | 'today' | 'yesterday' | 'last7' | 'custom';

interface DateRange {
    start: string;
    end: string;
}

interface DatePickerDropdownProps {
    appliedFilter: FilterType;
    appliedCustomRange: DateRange;
    onApply: (filterType: FilterType, customRange: DateRange) => void;
}

export const DatePickerDropdown: React.FC<DatePickerDropdownProps> = ({
    appliedFilter,
    appliedCustomRange,
    onApply
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [pendingFilterType, setPendingFilterType] = useState<FilterType>(appliedFilter);
    const [pendingCustomRange, setPendingCustomRange] = useState<DateRange>(appliedCustomRange);

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Date validation
    const isDateRangeValid = useMemo(() => {
        if (pendingFilterType !== 'custom') return true;
        if (!pendingCustomRange.start || !pendingCustomRange.end) return false;
        return new Date(pendingCustomRange.start) <= new Date(pendingCustomRange.end);
    }, [pendingFilterType, pendingCustomRange]);

    // Sync state when dropdown opens
    useEffect(() => {
        if (isOpen) {
            setPendingFilterType(appliedFilter);
            setPendingCustomRange(appliedCustomRange);
        }
    }, [isOpen, appliedFilter, appliedCustomRange]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleApply = () => {
        if (!isDateRangeValid) return;
        onApply(pendingFilterType, pendingCustomRange);
        setIsOpen(false);
    };

    const getFilterLabel = () => {
        switch (appliedFilter) {
            case 'today': return `Today, ${formatDateIST(new Date(), { day: 'numeric', month: 'short' })}`;
            case 'yesterday': return 'Yesterday';
            case 'last7': return 'Last 7 Days';
            case 'custom': return appliedCustomRange.start ? `${appliedCustomRange.start} - ${appliedCustomRange.end}` : 'Custom Range';
            default: return 'All Dates';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-bold transition-all shadow-sm group ${isOpen ? 'bg-gray-50 border-brand-red ring-4 ring-brand-red/5' : 'bg-white border-gray-100 hover:bg-gray-50'
                    }`}
            >
                <Calendar size={16} className={appliedFilter !== 'all' ? 'text-brand-red' : 'text-gray-400'} />
                <span className="text-gray-700">{getFilterLabel()}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1 mb-4">
                        {[
                            { id: 'all', label: 'All Time' },
                            { id: 'today', label: 'Today' },
                            { id: 'yesterday', label: 'Yesterday' },
                            { id: 'last7', label: 'Last 7 Days' },
                            { id: 'custom', label: 'Custom Range' },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setPendingFilterType(opt.id as FilterType)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${pendingFilterType === opt.id
                                    ? 'bg-brand-red/5 text-brand-red'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {pendingFilterType === 'custom' && (
                        <div className="mb-4 pt-4 border-t border-gray-100 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block text-left">Start Date</label>
                                    <input
                                        type="date"
                                        value={pendingCustomRange.start}
                                        onChange={(e) => setPendingCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                        className={`w-full px-2 py-1.5 bg-gray-50 border rounded-lg text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-red/5 ${!isDateRangeValid && pendingCustomRange.end ? 'border-red-300' : 'border-gray-100 focus:border-brand-red/30'
                                            }`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block text-left">End Date</label>
                                    <input
                                        type="date"
                                        value={pendingCustomRange.end}
                                        onChange={(e) => setPendingCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                        className={`w-full px-2 py-1.5 bg-gray-50 border rounded-lg text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-red/5 ${!isDateRangeValid && pendingCustomRange.start ? 'border-red-300' : 'border-gray-100 focus:border-brand-red/30'
                                            }`}
                                    />
                                </div>
                            </div>
                            {!isDateRangeValid && pendingCustomRange.start && pendingCustomRange.end && (
                                <p className="text-[10px] font-bold text-red-500 text-left">
                                    Start date must be before end date.
                                </p>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleApply}
                        disabled={!isDateRangeValid || (pendingFilterType === 'custom' && (!pendingCustomRange.start || !pendingCustomRange.end))}
                        className={`w-full py-2.5 text-white text-xs font-bold rounded-lg transition-all shadow-lg active:scale-95 ${isDateRangeValid && (pendingFilterType !== 'custom' || (pendingCustomRange.start && pendingCustomRange.end))
                            ? 'bg-brand-red hover:bg-brand-red-hover shadow-brand-red/20'
                            : 'bg-gray-300 cursor-not-allowed shadow-none'
                            }`}
                    >
                        Apply Filter
                    </button>
                </div>
            )}
        </div>
    );
};
