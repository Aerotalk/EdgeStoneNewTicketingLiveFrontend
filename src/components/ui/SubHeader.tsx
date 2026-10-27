import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { DatePickerDropdown, type FilterType } from './DatePickerDropdown';

export interface Tab {
    id: string;
    label: string;
    icon: LucideIcon;
    count?: number;
}

interface DateRange {
    start: string;
    end: string;
}

interface SubHeaderProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (id: string) => void;
    appliedFilter: FilterType;
    appliedCustomRange: DateRange;
    onDateApply: (filterType: FilterType, customRange: DateRange) => void;
    rightContent?: React.ReactNode;
}

export const SubHeader: React.FC<SubHeaderProps> = ({
    tabs,
    activeTab,
    onTabChange,
    appliedFilter,
    appliedCustomRange,
    onDateApply,
    rightContent
}) => {
    return (
        <div className="bg-white border-b border-gray-100 px-4 sm:px-8 flex items-center justify-between z-10 h-16">
            <div className="flex items-center gap-6 sm:gap-8 h-full overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`relative h-full flex items-center gap-2 text-[14px] font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                        {tab.label}
                        {typeof tab.count === 'number' && (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-all ${
                                activeTab === tab.id 
                                    ? 'bg-brand-red text-white' 
                                    : 'bg-gray-100 text-gray-500'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-3">
                {rightContent}
                <DatePickerDropdown
                    appliedFilter={appliedFilter}
                    appliedCustomRange={appliedCustomRange}
                    onApply={onDateApply}
                />
            </div>
        </div>
    );
};
