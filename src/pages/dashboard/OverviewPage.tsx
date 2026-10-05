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
    Building2
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
import { addDaysToDateStr, getISTComponents } from '../../utils/shiftUtils';

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
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-[13px] font-semibold text-gray-400">{title}</p>
                        {badge && (
                            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${badgeBg || 'bg-gray-100 text-gray-700'}`}>
                                {badge}
                            </span>
                        )}
                    </div>
                    {loading ? (
                        <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse my-1" />
                    ) : (
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-tight">{value}</h3>
                    )}
                </div>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
                    <div style={{ color: iconColor }}>{icon}</div>
                </div>
            </div>

            {subtitle && (
                <p className="text-[11px] font-medium text-gray-400 truncate">{subtitle}</p>
            )}

            {trend && trendType && trendLabel && (
                <div className="flex items-center gap-1.5 mt-2">
                    <div className={`flex items-center gap-0.5 text-[12px] font-bold ${trendType === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {trendType === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {trend}
                    </div>
                    <span className="text-[12px] font-medium text-gray-400">{trendLabel}</span>
                </div>
            )}
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
    const { tickets, totalClients, totalVendors, loading: contextLoading } = useDashboardData();

    // Current IST date calculation for daily scoping
    const todayIST = useMemo(() => {
        const { istDateStr } = getISTComponents(new Date());
        return istDateStr;
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

            <div className="p-4 sm:p-8 pt-4 sm:pt-6 overflow-y-auto flex-1 text-left space-y-6 sm:space-y-8">
                {/* 1. Date Navigator Bar */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/10">
                            <Calendar size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-black text-gray-800 tracking-tight">
                                    Operational Overview: {displayDate}
                                </h1>
                                {isToday && (
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        LIVE TODAY
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 font-medium">
                                Incident tracking & circuit impact overview anchored to Indian Standard Time (IST)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Stepper */}
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200/80">
                            <button
                                onClick={() => handleStepDate(-1)}
                                className="p-1.5 hover:bg-white text-gray-600 hover:text-gray-900 rounded-lg transition-all"
                                title="Previous Day"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    if (e.target.value) setSelectedDate(e.target.value);
                                }}
                                className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer px-2"
                            />

                            <button
                                onClick={() => handleStepDate(1)}
                                className="p-1.5 hover:bg-white text-gray-600 hover:text-gray-900 rounded-lg transition-all"
                                title="Next Day"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* Today Shortcut */}
                        <button
                            onClick={() => setSelectedDate(todayIST)}
                            className={`text-xs px-3 py-2 rounded-xl font-bold border transition-all ${
                                isToday
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* 2. Daily Incident Stat Cards Grid (5 Column on XL) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
                    {/* Total Tickets Raised Today */}
                    <StatCard
                        title="Tickets Raised"
                        value={summary.totalTicketsRaisedToday}
                        subtitle={`Logged on ${displayDate}`}
                        icon={<Ticket size={22} />}
                        iconBg="bg-blue-50"
                        iconColor="#3B82F6"
                        loading={loadingIncidents}
                    />

                    {/* Total Impacted Circuits */}
                    <StatCard
                        title="Impacted Circuits"
                        value={summary.totalImpactedCircuits}
                        subtitle="Circuits with active issues"
                        icon={<Activity size={22} />}
                        iconBg="bg-orange-50"
                        iconColor="#FF8A65"
                        loading={loadingIncidents}
                    />

                    {/* New Incidents Reported */}
                    <StatCard
                        title="New Incidents"
                        value={summary.newIncidentsCount}
                        subtitle="Reported today"
                        badge="New Today"
                        badgeBg="bg-rose-100 text-rose-800"
                        icon={<AlertCircle size={22} />}
                        iconBg="bg-rose-50"
                        iconColor="#F43F5E"
                        loading={loadingIncidents}
                    />

                    {/* Ongoing Incidents */}
                    <StatCard
                        title="Ongoing Incidents"
                        value={summary.ongoingIncidentsCount}
                        subtitle="Carried over from prior days"
                        badge="Prior Days"
                        badgeBg="bg-amber-100 text-amber-800"
                        icon={<Clock size={22} />}
                        iconBg="bg-amber-50"
                        iconColor="#F59E0B"
                        loading={loadingIncidents}
                    />

                    {/* Resolved Today */}
                    <StatCard
                        title="Resolved Today"
                        value={summary.resolvedTodayCount}
                        subtitle="Incidents cleared today"
                        badge="Cleared"
                        badgeBg="bg-emerald-100 text-emerald-800"
                        icon={<CheckCircle2 size={22} />}
                        iconBg="bg-emerald-50"
                        iconColor="#10B981"
                        loading={loadingIncidents}
                    />
                </div>

                {/* 3. Daily Affected Circuits & Incident Status Table */}
                <CircuitIncidentsTable
                    circuits={circuits}
                    summary={summary}
                    selectedDate={selectedDate}
                    displayDate={displayDate}
                    loading={loadingIncidents}
                    onRefresh={() => fetchDailyIncidents(selectedDate)}
                />

                {/* 4. Monthly Ticket Volume Trend & Global Entities */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Monthly Analytics Chart (3 Cols) */}
                    <div className="lg:col-span-3 bg-white p-5 sm:p-7 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-left relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                            <div>
                                <h2 className="text-lg sm:text-xl font-black text-gray-800 tracking-tight">Monthly Ticket Trends</h2>
                                <p className="text-gray-400 text-xs sm:text-sm font-medium mt-0.5">Historical ticket distribution</p>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Month Dropdown */}
                                <div className="relative group min-w-[130px]">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 pr-8 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        {MONTH_NAMES.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>

                                {/* Year Dropdown */}
                                <div className="relative group min-w-[90px]">
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 pr-8 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        {YEARS.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="h-[240px] sm:h-[300px] w-full">
                            {contextLoading ? (
                                <div className="w-full h-full bg-gray-50 rounded-2xl animate-pulse" />
                            ) : chartData.every(d => d.count === 0) ? (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                    <Ticket size={40} strokeWidth={1.5} />
                                    <p className="mt-2 text-xs font-semibold">No tickets in {selectedMonth} {selectedYear}</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#F24444" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#F24444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="day"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 600 }}
                                            interval="preserveStartEnd"
                                            minTickGap={20}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }}
                                            domain={[0, yMax]}
                                            ticks={yTicks}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-[#F24444] text-white px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-lg border border-white/20">
                                                            <p className="text-white/70 text-[9px] uppercase tracking-wider">{payload[0].payload.day}</p>
                                                            <p className="text-xs">{payload[0].value} Tickets</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                            cursor={{ stroke: '#F24444', strokeDasharray: '4 4' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#F24444"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorCount)"
                                            activeDot={{ r: 4, fill: '#F24444', stroke: '#fff', strokeWidth: 2 }}
                                            dot={(props: any) => {
                                                const { cx, cy, payload } = props;
                                                if (payload.day !== '') {
                                                    return <Dot cx={cx} cy={cy} r={3} fill="#F24444" stroke="#fff" strokeWidth={1.5} />;
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
                    <div className="flex flex-col gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400">Total Registered</p>
                                    <h4 className="text-2xl font-black text-gray-800">{totalClients} Clients</h4>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-400">Customer organizations under SLA management</p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400">Total Connected</p>
                                    <h4 className="text-2xl font-black text-gray-800">{totalVendors} Vendors</h4>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-400">Upstream carriers and infrastructure providers</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewPage;
