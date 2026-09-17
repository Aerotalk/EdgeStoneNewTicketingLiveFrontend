import React from 'react';
import { useParams } from 'react-router-dom';
import { Topbar } from '../../components/ui/Topbar';
import {
    Ticket,
    Package,
    Users,
    Building2,
    TrendingUp,
    TrendingDown,
    ChevronDown
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

interface StatCardProps {
    title: string;
    value: string | number;
    trend?: string;
    trendType?: 'up' | 'down';
    trendLabel?: string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, trendType, trendLabel, icon, iconBg, iconColor, loading }) => {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-[14px] font-semibold text-gray-400 mb-1">{title}</p>
                    {loading ? (
                        <div className="h-9 w-20 bg-gray-100 rounded-lg animate-pulse" />
                    ) : (
                        <h3 className="text-3xl font-bold text-gray-800 tracking-tight">{value}</h3>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg}`}>
                    <div style={{ color: iconColor }}>{icon}</div>
                </div>
            </div>
            {trend && trendType && trendLabel && (
                <div className="flex items-center gap-1.5">
                    <div className={`flex items-center gap-0.5 text-[13px] font-bold ${trendType === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {trendType === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {trend}
                    </div>
                    <span className="text-[13px] font-medium text-gray-400">{trendLabel}</span>
                </div>
            )}
        </div>
    );
}

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

    const { tickets, openCount, inProgressCount, totalClients, totalVendors, loading } = useDashboardData();

    const currentMonthIndex = new Date().getMonth();
    const currentYear = String(new Date().getFullYear());

    const [selectedMonth, setSelectedMonth] = React.useState(MONTH_NAMES[currentMonthIndex]);
    const [selectedYear, setSelectedYear] = React.useState(currentYear);

    const chartData = React.useMemo(
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

            <div className="p-4 sm:p-8 pt-4 sm:pt-6 overflow-y-auto flex-1 text-left">
                {/* Stat Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <StatCard
                        title="Open tickets"
                        value={openCount}
                        icon={<Ticket size={24} />}
                        iconBg="bg-orange-50"
                        iconColor="#FF8A65"
                        loading={loading}
                    />
                    <StatCard
                        title="In Progress tickets"
                        value={inProgressCount}
                        icon={<Package size={24} />}
                        iconBg="bg-yellow-50"
                        iconColor="#FFD54F"
                        loading={loading}
                    />
                    <StatCard
                        title="Total Clients"
                        value={totalClients}
                        icon={<Users size={24} />}
                        iconBg="bg-indigo-50"
                        iconColor="#7986CB"
                        loading={loading}
                    />
                    <StatCard
                        title="Total Vendor"
                        value={totalVendors}
                        icon={<Building2 size={24} />}
                        iconBg="bg-emerald-50"
                        iconColor="#4DB6AC"
                        loading={loading}
                    />
                </div>

                {/* Main Chart Card */}
                <div className="bg-white p-4 sm:p-8 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-left relative overflow-hidden">
                    <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-8 sm:mb-12 relative z-10">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight">Ticket raised</h2>
                            <p className="text-gray-400 text-sm font-medium mt-1">Analytics for ticket distribution</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Month Dropdown */}
                            <div className="relative group min-w-[140px] flex-1 sm:flex-none">
                                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10px] font-bold text-gray-400 uppercase tracking-wider z-10">Month</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full appearance-none bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-gray-700 focus:outline-none focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/5 transition-all cursor-pointer hover:bg-gray-50 hover:border-gray-200"
                                >
                                    {MONTH_NAMES.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-brand-red transition-colors" />
                            </div>

                            {/* Year Dropdown */}
                            <div className="relative group min-w-[110px] flex-1 sm:flex-none">
                                <label className="absolute -top-2.5 left-3 px-1.5 bg-white text-[10px] font-bold text-gray-400 uppercase tracking-wider z-10">Year</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="w-full appearance-none bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-gray-700 focus:outline-none focus:border-brand-red/30 focus:ring-4 focus:ring-brand-red/5 transition-all cursor-pointer hover:bg-gray-50 hover:border-gray-200"
                                >
                                    {YEARS.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-brand-red transition-colors" />
                            </div>
                        </div>
                    </div>

                    <div className="h-[250px] sm:h-[400px] w-full">
                        {loading ? (
                            <div className="w-full h-full bg-gray-50 rounded-2xl animate-pulse" />
                        ) : chartData.every(d => d.count === 0) ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                <Ticket size={48} strokeWidth={1.5} />
                                <p className="mt-3 text-sm font-semibold">No tickets in {selectedMonth} {selectedYear}</p>
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
                                        dy={15}
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
                                                    <div className="bg-[#F24444] text-white px-4 py-2 rounded-xl text-[11px] font-bold shadow-[0_10px_30px_rgba(242,68,68,0.2)] border border-white/20 animate-in fade-in zoom-in-95 duration-200">
                                                        <p className="text-white/70 text-[9px] uppercase tracking-wider mb-0.5">{payload[0].payload.day}</p>
                                                        <p className="text-[14px] leading-tight">{payload[0].value} Tickets</p>
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
            </div>
        </div>
    );
};

export default OverviewPage;
