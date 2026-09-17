import React, { useState, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';

const TIMEZONES = [
    { value: 'Pacific/Midway', label: '(GMT-11:00) Midway Island, Samoa' },
    { value: 'Pacific/Honolulu', label: '(GMT-10:00) Hawaii' },
    { value: 'America/Anchorage', label: '(GMT-09:00) Alaska' },
    { value: 'America/Los_Angeles', label: '(GMT-08:00) Pacific Time - Los Angeles' },
    { value: 'America/Denver', label: '(GMT-07:00) Mountain Time' },
    { value: 'America/Chicago', label: '(GMT-06:00) Central Time' },
    { value: 'America/New_York', label: '(GMT-05:00) Eastern Time' },
    { value: 'America/Caracas', label: '(GMT-04:30) Caracas' },
    { value: 'America/Halifax', label: '(GMT-04:00) Atlantic Time' },
    { value: 'America/St_Johns', label: '(GMT-03:30) Newfoundland' },
    { value: 'America/Argentina/Buenos_Aires', label: '(GMT-03:00) Buenos Aires' },
    { value: 'Atlantic/Mid-Atlantic', label: '(GMT-02:00) Mid-Atlantic' },
    { value: 'Atlantic/Azores', label: '(GMT-01:00) Azores' },
    { value: 'Europe/London', label: '(GMT+00:00) London, Edinburgh, Dublin, Lisbon' },
    { value: 'Europe/Berlin', label: '(GMT+01:00) Amsterdam, Berlin, Bern, Rome' },
    { value: 'Europe/Athens', label: '(GMT+02:00) Athens, Bucharest, Istanbul' },
    { value: 'Europe/Moscow', label: '(GMT+03:00) Moscow, St. Petersburg, Volgograd' },
    { value: 'Asia/Tehran', label: '(GMT+03:30) Tehran' },
    { value: 'Asia/Dubai', label: '(GMT+04:00) Abu Dhabi, Muscat' },
    { value: 'Asia/Kabul', label: '(GMT+04:30) Kabul' },
    { value: 'Asia/Karachi', label: '(GMT+05:00) Islamabad, Karachi, Tashkent' },
    { value: 'Asia/Kolkata', label: '(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi' },
    { value: 'Asia/Kathmandu', label: '(GMT+05:45) Kathmandu' },
    { value: 'Asia/Dhaka', label: '(GMT+06:00) Astana, Dhaka' },
    { value: 'Asia/Rangoon', label: '(GMT+06:30) Yangon (Rangoon)' },
    { value: 'Asia/Bangkok', label: '(GMT+07:00) Bangkok, Hanoi, Jakarta' },
    { value: 'Asia/Hong_Kong', label: '(GMT+08:00) Beijing, Chongqing, Hong Kong, Urumqi' },
    { value: 'Asia/Tokyo', label: '(GMT+09:00) Osaka, Sapporo, Tokyo' },
    { value: 'Australia/Adelaide', label: '(GMT+09:30) Adelaide' },
    { value: 'Australia/Sydney', label: '(GMT+10:00) Canberra, Melbourne, Sydney' },
    { value: 'Asia/Magadan', label: '(GMT+11:00) Magadan, Solomon Is., New Caledonia' },
    { value: 'Pacific/Auckland', label: '(GMT+12:00) Auckland, Wellington' },
    { value: 'Pacific/Tongatapu', label: '(GMT+13:00) Nuku\'alofa' }
];

export const GlobalClock: React.FC = () => {
    const [time, setTime] = useState(new Date());
    const [selectedTimeZone, setSelectedTimeZone] = useState('Europe/London');

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Formatters
    const formatTime = (timeZone: string) => {
        try {
            return new Intl.DateTimeFormat('en-US', {
                timeZone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(time).toUpperCase();
        } catch (e) {
            return new Intl.DateTimeFormat('en-US', {
                timeZone: 'UTC',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(time).toUpperCase();
        }
    };

    return (
        <div className="flex flex-nowrap md:flex-wrap items-center justify-start md:justify-center gap-2 sm:gap-3 bg-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl sm:rounded-full border-2 border-gray-200 shadow-sm text-xs sm:text-sm font-bold text-gray-700 w-max max-w-full overflow-x-auto scrollbar-hide">
            <Globe size={16} className="text-brand-red flex-shrink-0" />

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <span className="text-[10px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-widest">IST</span>
                <span className="text-gray-900">{formatTime('Asia/Kolkata')}</span>
            </div>

            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-1 sm:mx-2 flex-shrink-0"></div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <span className="text-[10px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-widest">UTC</span>
                <span className="text-gray-900">{formatTime('UTC')}</span>
            </div>

            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-1 sm:mx-2 flex-shrink-0"></div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <span className="text-[10px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-widest">GMT</span>
                <div className="relative flex items-center bg-gray-100 hover:bg-gray-200 transition-colors rounded-md px-1.5 py-0.5 cursor-pointer">
                    <span className="text-gray-900">{formatTime(selectedTimeZone)}</span>
                    <ChevronDown size={12} className="text-gray-500 ml-1.5 pointer-events-none" />
                    <select
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        value={selectedTimeZone}
                        onChange={(e) => setSelectedTimeZone(e.target.value)}
                    >
                        {TIMEZONES.map(tz => (
                            <option key={tz.value} value={tz.value}>
                                {tz.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};
