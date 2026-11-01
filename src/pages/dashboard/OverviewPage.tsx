import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Topbar } from '../../components/ui/Topbar';
import {
    Ticket,
    Activity,
    AlertCircle,
    Clock,
    CheckCircle2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    ChevronDown,
    Users,
    Building2,
    AlertTriangle,
    ShieldCheck,
    Network,
    Layers
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Dot
} from 'recharts';
import { useDashboardData } from '../../contexts/DashboardDataContext';
import {
    dashboardService,
    type CircuitIncidentItem,
    type DailyIncidentSummary
} from '../../services/dashboardService';
import { CircuitIncidentsTable } from '../../components/dashboard/CircuitIncidentsTable';
import {
    addDaysToDateStr,
    getISTComponents,
    resolveCurrentShift,
    SHIFT_CONFIG
} from '../../utils/shiftUtils';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: string;
    trendType?: 'up' | 'down';
    trendLabel?: string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    loading?: boolean;
    badge?: string;
    badgeBg?: string;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtitle,
    trend,
    trendType,
    trendLabel,
    icon,
    iconBg,
    iconColor,
    loading,
    badge,
    badgeBg
}) => {
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-200 flex flex-col justify-between group">
            <div>
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">{title}</p>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg} border border-black/5`}>
                        <div style={{ color: iconColor }}>{icon}</div>
                    </div>
                </div>

                {/* Metric Value & Badge */}
                <div className="flex items-baseline gap-2 flex-wrap">
                    {loading ? (
                        <div className="h-8 w-16 bg-slate-100 rounded-md animate-pulse my-0.5" />
                    ) : (
                        <h3 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight tabular-nums">
                            {value}
                        </h3>
                    )}
                    {badge && !loading && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badgeBg || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {badge}
                        </span>
                    )}
                </div>
            </div>

            {/* Subtitle / Trend */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                {subtitle && (
                    <p className="text-[11px] text-slate-500 font-normal truncate">{subtitle}</p>
                )}
                {trend && trendType && trendLabel && (
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                        <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${trendType === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {trendType === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {trend}
                        </span>
                        <span className="text-[10px] text-slate-400">{trendLabel}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const YEARS = ['2023', '2024', '2025', '2026'];

interface ChartPoint {
    day: string;
    count: number;
}

function buildChartData(tickets: { createdAt: string }[], month: string, year: string): ChartPoint[] {
    const monthIndex = MONTH_NAMES.indexOf(month);
    const yearNum = parseInt(year, 10);
    const daysInMonth = new Date(yearNum, monthIndex + 1, 0).getDate();

    const counts: Record<number, number> = {};
    for (let d = 1; d <= daysInMonth; d++) counts[d] = 0;

    tickets.forEach(t => {
        if (!t.createdAt) return;
        const date = new Date(t.createdAt);
        if (date.getFullYear() === yearNum && date.getMonth() === monthIndex) {
            const day = date.getDate();
            counts[day] = (counts[day] || 0) + 1;
        }
    });

    return Object.entries(counts).map(([d, count]) => ({
        day: `${month.slice(0, 3)} ${d}`,
        count,
    }));
}

const OverviewPage: React.FC = () => {
    useParams<{ id: string }>();

    // Global context data for long-term monthly analytics & totals
    const {
        tickets,
        totalClients,
        totalVendors,
        openCount,
        inProgressCount,
        loading: contextLoading
    } = useDashboardData();

    // Current IST date calculation for daily scoping
    const todayIST = useMemo(() => {
        const { istDateStr } = getISTComponents(new Date());
        return istDateStr;
    }, []);

    // Active IST NOC Shift
    const currentShiftInfo = useMemo(() => {
        try {
            const info = resolveCurrentShift(new Date());
            const config = SHIFT_CONFIG[info.shift];
            return { ...info, config };
        } catch {
            return null;
        }
    }, []);

    // Daily incident state
    const [selectedDate, setSelectedDate] = useState<string>(todayIST);
    const [displayDate, setDisplayDate] = useState<string>('Today');
    const [circuits, setCircuits] = useState<CircuitIncidentItem[]>([]);
    const [summary, setSummary] = useState<DailyIncidentSummary>({
        totalTicketsRaisedToday: 0,
        totalImpactedCircuits: 0,
        newIncidentsCount: 0,
        ongoingIncidentsCount: 0,
        resolvedTodayCount: 0
    });
    const [loadingIncidents, setLoadingIncidents] = useState<boolean>(true);

    // Monthly chart states
    const currentMonthIndex = new Date().getMonth();
    const currentYear = String(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(MONTH_NAMES[currentMonthIndex]);
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Fetch daily circuit incidents from backend
    const fetchDailyIncidents = useCallback(async (dateToFetch: string) => {
        setLoadingIncidents(true);
        try {
            const res = await dashboardService.getDailyCircuitIncidents(dateToFetch);
            setCircuits(res.circuits || []);
            setSummary(res.summary || {
                totalTicketsRaisedToday: 0,
                totalImpactedCircuits: 0,
                newIncidentsCount: 0,
                ongoingIncidentsCount: 0,
                resolvedTodayCount: 0
            });
            setDisplayDate(res.displayDate || dateToFetch);
        } catch (error) {
            console.error('Failed to fetch daily circuit incidents:', error);
        } finally {
            setLoadingIncidents(false);
        }
    }, []);

    useEffect(() => {
        fetchDailyIncidents(selectedDate);
    }, [selectedDate, fetchDailyIncidents]);

    // Step date by +/- days
    const handleStepDate = (days: number) => {
        const nextDate = addDaysToDateStr(selectedDate, days);
        setSelectedDate(nextDate);
    };

    const isToday = selectedDate === todayIST;

    // Outage Priority breakdown across daily impacted circuits
    const dailyPriorityBreakdown = useMemo(() => {
        let high = 0;
        let medium = 0;
        let low = 0;
        circuits.forEach(c => {
            c.tickets?.forEach(t => {
                const p = (t.priority || '').toLowerCase();
                if (p === 'high' || p === 'urgent' || p === 'critical') high++;
                else if (p === 'medium') medium++;
                else if (p === 'low') low++;
            });
        });
        const total = high + medium + low;
        return { high, medium, low, total };
    }, [circuits]);

    // Circuit redundancy status (Protected vs Unprotected)
    const redundancyStats = useMemo(() => {
        const total = circuits.length;
        const protectedCount = circuits.filter(c => (c.circuitType || '').toUpperCase() === 'PROTECTED').length;
        const unprotectedCount = total - protectedCount;
        const protectedRatio = total > 0 ? Math.round((protectedCount / total) * 100) : 0;
        return { protectedCount, unprotectedCount, protectedRatio, total };
    }, [circuits]);

    // Carrier / Vendor outage concentration
    const topImpactedVendors = useMemo(() => {
        const map: Record<string, number> = {};
        circuits.forEach(c => {
            const v = (c.vendorName || '').trim() || 'Unassigned Vendor';
            map[v] = (map[v] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
    }, [circuits]);

    const chartData = useMemo(
        () => buildChartData(tickets, selectedMonth, selectedYear),
        [tickets, selectedMonth, selectedYear]
    );

    const maxCount = Math.max(...chartData.map(d => d.count), 10);
    const yMax = Math.ceil(maxCount / 10) * 10 + 10;
    const yTicks: number[] = [];
    const step = Math.max(Math.ceil(yMax / 6), 1);
    for (let i = 0; i <= yMax; i += step) yTicks.push(i);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#F9FAFB]">
            <Topbar title="Dashboard" showSearch={false} />

            <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 overflow-y-auto flex-1 text-left space-y-5 sm:space-y-6">
                {/* 1. Date Navigator & NOC Shift Bar */}
                <div className="bg-white px-5 py-4 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-2xs shrink-0">
                            <Calendar size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
                                    Operational Overview: <span className="font-medium text-slate-600">{displayDate}</span>
                                </h1>
                                {isToday ? (
                                    <>
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            LIVE TODAY
                                        </span>
                                        {currentShiftInfo && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                                                <Clock size={11} className="text-slate-500" />
                                                <span>{currentShiftInfo.config?.name || 'Active'} Shift</span>
                                                <span className="text-slate-400 font-normal">({currentShiftInfo.config?.timeRange})</span>
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                                        Historical Archive
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 font-normal mt-0.5">
                                Incident tracking &amp; circuit impact overview anchored to Indian Standard Time (IST)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Stepper */}
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                            <button
                                onClick={() => handleStepDate(-1)}
                                className="p-1.5 hover:bg-white text-slate-500 hover:text-slate-800 rounded-md transition-all cursor-pointer"
                                title="Previous Day"
                            >
                                <ChevronLeft size={15} />
                            </button>

                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    if (e.target.value) setSelectedDate(e.target.value);
                                }}
                                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer px-2 py-0.5 tracking-tight"
                            />

                            <button
                                onClick={() => handleStepDate(1)}
                                className="p-1.5 hover:bg-white text-slate-500 hover:text-slate-800 rounded-md transition-all cursor-pointer"
                                title="Next Day"
                            >
                                <ChevronRight size={15} />
                            </button>
                        </div>

                        {/* Today Shortcut */}
                        <button
                            onClick={() => setSelectedDate(todayIST)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all cursor-pointer ${
                                isToday
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* 2. Daily Incident Stat Cards Grid (5 Column on XL) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
                    {/* Total Tickets Raised Today */}
                    <StatCard
                        title="Tickets Raised"
                        value={summary.totalTicketsRaisedToday}
                        subtitle={`Logged on ${displayDate}`}
                        icon={<Ticket size={15} strokeWidth={2.2} />}
                        iconBg="bg-blue-50/80"
                        iconColor="#2563EB"
                        loading={loadingIncidents}
                    />

                    {/* Total Impacted Circuits */}
                    <StatCard
                        title="Impacted Circuits"
                        value={summary.totalImpactedCircuits}
                        subtitle="Circuits with active issues"
                        icon={<Activity size={15} strokeWidth={2.2} />}
                        iconBg="bg-orange-50/80"
                        iconColor="#EA580C"
                        loading={loadingIncidents}
                    />

                    {/* New Incidents Reported */}
                    <StatCard
                        title="New Incidents"
                        value={summary.newIncidentsCount}
                        subtitle="Reported today"
                        badge="New Today"
                        badgeBg="bg-rose-50 text-rose-700 border-rose-200/70"
                        icon={<AlertCircle size={15} strokeWidth={2.2} />}
                        iconBg="bg-rose-50/80"
                        iconColor="#E11D48"
                        loading={loadingIncidents}
                    />

                    {/* Ongoing Incidents */}
                    <StatCard
                        title="Ongoing Incidents"
                        value={summary.ongoingIncidentsCount}
                        subtitle="Carried over from prior days"
                        badge="Prior Days"
                        badgeBg="bg-amber-50 text-amber-800 border-amber-200/70"
                        icon={<Clock size={15} strokeWidth={2.2} />}
                        iconBg="bg-amber-50/80"
                        iconColor="#D97706"
                        loading={loadingIncidents}
                    />

                    {/* Resolved Today */}
                    <StatCard
                        title="Resolved Today"
                        value={summary.resolvedTodayCount}
                        subtitle="Incidents cleared today"
                        badge="Cleared"
                        badgeBg="bg-emerald-50 text-emerald-800 border-emerald-200/70"
                        icon={<CheckCircle2 size={15} strokeWidth={2.2} />}
                        iconBg="bg-emerald-50/80"
                        iconColor="#059669"
                        loading={loadingIncidents}
                    />
                </div>

                {/* 3. NOC Operational Telemetry & Infrastructure Health (3 Columns) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                    {/* Outage Urgency / Priority Breakdown */}
                    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <AlertTriangle size={13} className="text-rose-500" />
                                    Incident Priority Breakdown
                                </p>
                                <span className="text-[10px] font-semibold text-slate-400">
                                    {dailyPriorityBreakdown.total} {dailyPriorityBreakdown.total === 1 ? 'ticket' : 'tickets'}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 my-2.5">
                                <div className="bg-rose-50/60 border border-rose-200/60 rounded-lg p-2 text-center">
                                    <span className="text-[10px] font-semibold text-rose-700 block uppercase tracking-wider">High</span>
                                    <span className="text-lg font-semibold text-rose-800 tabular-nums">{dailyPriorityBreakdown.high}</span>
                                </div>
                                <div className="bg-amber-50/60 border border-amber-200/60 rounded-lg p-2 text-center">
                                    <span className="text-[10px] font-semibold text-amber-700 block uppercase tracking-wider">Medium</span>
                                    <span className="text-lg font-semibold text-amber-800 tabular-nums">{dailyPriorityBreakdown.medium}</span>
                                </div>
                                <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-lg p-2 text-center">
                                    <span className="text-[10px] font-semibold text-emerald-700 block uppercase tracking-wider">Low</span>
                                    <span className="text-lg font-semibold text-emerald-800 tabular-nums">{dailyPriorityBreakdown.low}</span>
                                </div>
                            </div>

                            {/* Proportion Bar */}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex mt-2">
                                {dailyPriorityBreakdown.total > 0 ? (
                                    <>
                                        <div style={{ width: `${(dailyPriorityBreakdown.high / dailyPriorityBreakdown.total) * 100}%` }} className="bg-rose-500 h-full transition-all" />
                                        <div style={{ width: `${(dailyPriorityBreakdown.medium / dailyPriorityBreakdown.total) * 100}%` }} className="bg-amber-500 h-full transition-all" />
                                        <div style={{ width: `${(dailyPriorityBreakdown.low / dailyPriorityBreakdown.total) * 100}%` }} className="bg-emerald-500 h-full transition-all" />
                                    </>
                                ) : (
                                    <div className="w-full bg-slate-200 h-full" />
                                )}
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-400 font-normal mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <span>{dailyPriorityBreakdown.high > 0 ? `${dailyPriorityBreakdown.high} critical outage(s) active` : 'No critical severity issues'}</span>
                            <span className="text-slate-300">•</span>
                            <span>{dailyPriorityBreakdown.medium} standard priority</span>
                        </p>
                    </div>

                    {/* Circuit Redundancy Status */}
                    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <ShieldCheck size={13} className="text-blue-600" />
                                    Circuit Resiliency Status
                                </p>
                                <span className="text-[10px] font-semibold text-slate-400">
                                    {redundancyStats.total} impacted
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 my-2.5">
                                <div className="bg-blue-50/60 border border-blue-200/60 rounded-lg p-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Protected</span>
                                        <span className="text-[10px] text-blue-600 font-medium">Failover OK</span>
                                    </div>
                                    <span className="text-lg font-semibold text-blue-900 tabular-nums block mt-0.5">
                                        {redundancyStats.protectedCount}
                                    </span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Unprotected</span>
                                        <span className="text-[10px] text-rose-500 font-medium">Single Point</span>
                                    </div>
                                    <span className="text-lg font-semibold text-slate-800 tabular-nums block mt-0.5">
                                        {redundancyStats.unprotectedCount}
                                    </span>
                                </div>
                            </div>

                            {/* Proportion Bar */}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex mt-2">
                                {redundancyStats.total > 0 ? (
                                    <>
                                        <div style={{ width: `${redundancyStats.protectedRatio}%` }} className="bg-blue-500 h-full transition-all" />
                                        <div style={{ width: `${100 - redundancyStats.protectedRatio}%` }} className="bg-slate-300 h-full transition-all" />
                                    </>
                                ) : (
                                    <div className="w-full bg-slate-200 h-full" />
                                )}
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-400 font-normal mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <span>{redundancyStats.total > 0 ? `${redundancyStats.protectedRatio}% have link redundancy` : 'All circuits fully redundant'}</span>
                            <span className="text-slate-300">•</span>
                            <span>{redundancyStats.unprotectedCount} without backup</span>
                        </p>
                    </div>

                    {/* Carrier & Vendor Outage Concentration */}
                    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <Network size={13} className="text-indigo-600" />
                                    Carrier Impact Hotspots
                                </p>
                                <span className="text-[10px] font-semibold text-slate-400">
                                    Top Affected
                                </span>
                            </div>

                            <div className="space-y-1.5 my-2">
                                {topImpactedVendors.length > 0 ? (
                                    topImpactedVendors.map((v, i) => (
                                       <div key={v.name} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50/80 border border-slate-150">
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="w-4 text-[10px] font-bold text-slate-400">#{i + 1}</span>
                                                <span className="font-medium text-slate-700 truncate max-w-[150px]">{v.name}</span>
                                            </div>
                                            <span className="font-mono text-[11px] font-semibold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                                {v.count} {v.count === 1 ? 'circuit' : 'circuits'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-5 text-center text-slate-400 text-xs">
                                        No carrier-side anomalies detected
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-400 font-normal mt-3 pt-2.5 border-t border-slate-100 truncate">
                            {topImpactedVendors[0]?.count > 1
                                ? `Multiple circuit drops on ${topImpactedVendors[0]?.name} indicate carrier event`
                                : 'Isolated circuit-level anomalies detected'}
                        </p>
                    </div>
                </div>

                {/* 4. Daily Affected Circuits & Incident Status Table */}
                <CircuitIncidentsTable
                    circuits={circuits}
                    summary={summary}
                    selectedDate={selectedDate}
                    displayDate={displayDate}
                    loading={loadingIncidents}
                    onRefresh={() => fetchDailyIncidents(selectedDate)}
                />

                {/* 5. Monthly Ticket Volume Trend & Global Entities */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                    {/* Monthly Analytics Chart (3 Cols) */}
                    <div className="lg:col-span-3 bg-white p-5 sm:p-6 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] text-left relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-5">
                            <div>
                                <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">Monthly Ticket Trends</h2>
                                <p className="text-slate-500 text-xs font-normal mt-0.5">Historical ticket distribution</p>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Month Dropdown */}
                                <div className="relative group min-w-[130px]">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:border-brand-red focus:bg-white transition-colors cursor-pointer"
                                    >
                                        {MONTH_NAMES.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>

                                {/* Year Dropdown */}
                                <div className="relative group min-w-[85px]">
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:border-brand-red focus:bg-white transition-colors cursor-pointer"
                                    >
                                        {YEARS.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="h-[240px] sm:h-[280px] w-full">
                            {contextLoading ? (
                                <div className="w-full h-full bg-slate-50 rounded-lg animate-pulse" />
                            ) : chartData.every(d => d.count === 0) ? (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                    <Ticket size={36} strokeWidth={1.5} />
                                    <p className="mt-2 text-xs font-medium text-slate-400">No tickets recorded in {selectedMonth} {selectedYear}</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#F24444" stopOpacity={0.12} />
                                                <stop offset="95%" stopColor="#F24444" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} strokeDasharray="0" stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="day"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748B', fontSize: 10, fontWeight: 500 }}
                                            interval="preserveStartEnd"
                                            minTickGap={20}
                                            dy={8}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748B', fontSize: 10, fontWeight: 500 }}
                                            domain={[0, yMax]}
                                            ticks={yTicks}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs shadow-lg border border-slate-800">
                                                            <p className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider">{payload[0].payload.day}</p>
                                                            <p className="font-semibold text-sm mt-0.5">{payload[0].value} <span className="font-normal text-slate-300 text-xs">Tickets</span></p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                            cursor={{ stroke: '#F24444', strokeWidth: 1, strokeDasharray: '3 3' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#F24444"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorCount)"
                                            activeDot={{ r: 4, fill: '#F24444', stroke: '#fff', strokeWidth: 2 }}
                                            dot={(props: { cx?: number; cy?: number; payload?: { day?: string } }) => {
                                                const { cx, cy, payload } = props;
                                                if (cx !== undefined && cy !== undefined && payload?.day) {
                                                    return <Dot cx={cx} cy={cy} r={2.5} fill="#F24444" stroke="#fff" strokeWidth={1.5} />;
                                                }
                                                return null;
                                            }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Global Organization Context Cards (1 Col) */}
                    <div className="flex flex-col gap-3.5">
                        {/* Active NOC Backlog Card */}
                        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active NOC Backlog</p>
                                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-brand-red flex items-center justify-center border border-rose-100/80">
                                        <Layers size={15} />
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-3 mt-1">
                                    <h4 className="text-2xl font-semibold text-slate-900 tracking-tight tabular-nums">
                                        {openCount + inProgressCount}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="inline-flex items-center gap-1 font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60 text-[10px]">
                                            {openCount} Open
                                        </span>
                                        <span className="inline-flex items-center gap-1 font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 text-[10px]">
                                            {inProgressCount} In Progress
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 font-normal mt-2.5 pt-2 border-t border-slate-100">
                                System-wide pending tickets across all clients
                            </p>
                        </div>

                        {/* Total Registered Clients */}
                        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Registered</p>
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80">
                                        <Users size={15} />
                                    </div>
                                </div>
                                <h4 className="text-2xl font-semibold text-slate-900 tracking-tight tabular-nums mt-0.5">
                                    {totalClients} <span className="text-xs font-normal text-slate-500">Clients</span>
                                </h4>
                            </div>
                            <p className="text-xs text-slate-400 font-normal mt-2 pt-2 border-t border-slate-100">
                                Managed SLA enterprise accounts
                            </p>
                        </div>

                        {/* Total Connected Vendors */}
                        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Connected</p>
                                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80">
                                        <Building2 size={15} />
                                    </div>
                                </div>
                                <h4 className="text-2xl font-semibold text-slate-900 tracking-tight tabular-nums mt-0.5">
                                    {totalVendors} <span className="text-xs font-normal text-slate-500">Vendors</span>
                                </h4>
                            </div>
                            <p className="text-xs text-slate-400 font-normal mt-2 pt-2 border-t border-slate-100">
                                Upstream transit &amp; circuit providers
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewPage;

