import React, { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GlobalClock } from './GlobalClock';
import { NotificationDropdown } from './NotificationDropdown';
import { useDashboardData } from '../../contexts/DashboardDataContext';

interface TopbarProps {
    title: string;
    showSearch?: boolean;
    searchPlaceholder?: string;
    onSearch?: (query: string) => void;
    /** Optional extra refresh callback — called when the refresh button is clicked.
     *  Use this on pages that manage their own data (e.g. SLAPage). */
    onRefresh?: () => void | Promise<void>;
}

export const Topbar: React.FC<TopbarProps> = ({
    title,
    showSearch = true,
    searchPlaceholder = "Search",
    onSearch,
    onRefresh,
}) => {
    const dashboardData = useDashboardData();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        try {
            setIsRefreshing(true);
            // Run dashboard-wide refresh and any page-specific refresh in parallel
            const tasks: Promise<void>[] = [];
            if (dashboardData) tasks.push(dashboardData.refresh());
            if (onRefresh) tasks.push(Promise.resolve(onRefresh()));
            if (tasks.length === 0) { window.location.reload(); return; }
            await Promise.all(tasks);
            toast.success('Data refreshed successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to refresh data');
        } finally {
            setTimeout(() => setIsRefreshing(false), 800);
        }
    };

    return (
        <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 px-4 sm:px-8 py-4 sm:py-6 bg-white/80 backdrop-blur-md border-b border-gray-100">
            <h1 className="text-lg sm:text-xl font-bold text-gray-700 truncate sm:min-w-[120px]">{title}</h1>

            {showSearch && (
                <div className="relative flex-1 w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        onChange={(e) => onSearch?.(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/5 transition-all"
                    />
                </div>
            )}

            <div className="flex-shrink-0 mt-4 sm:mt-0 sm:ml-auto flex items-center gap-4">
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="relative p-2.5 bg-white text-gray-500 hover:bg-red-50 hover:text-brand-red shadow-sm hover:shadow-md border border-gray-100 rounded-full transition-all duration-300 focus:outline-none active:scale-95 group disabled:opacity-50"
                    title="Refresh Application Data"
                >
                    <RefreshCw size={20} className={`transition-transform duration-700 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                </button>
                <NotificationDropdown />
                <div className="w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide flex items-center">
                    <GlobalClock />
                </div>
            </div>
        </div>
    );
};
