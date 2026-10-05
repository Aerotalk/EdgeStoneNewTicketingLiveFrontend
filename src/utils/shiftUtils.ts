export type ShiftType = 'A' | 'B' | 'C';

export interface ShiftConfigItem {
    key: ShiftType;
    name: string;
    timeRange: string;
    periodLabel: string;
    color: string;
    bgColor: string;
    borderColor: string;
    badgeBg: string;
    badgeText: string;
}

export const SHIFT_CONFIG: Record<ShiftType, ShiftConfigItem> = {
    A: {
        key: 'A',
        name: 'Morning',
        timeRange: '06:00 – 14:00 IST',
        periodLabel: 'Morning Shift',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-800'
    },
    B: {
        key: 'B',
        name: 'Afternoon',
        timeRange: '14:00 – 22:00 IST',
        periodLabel: 'Afternoon Shift',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-800'
    },
    C: {
        key: 'C',
        name: 'Night',
        timeRange: '22:00 – 06:00 IST',
        periodLabel: 'Night Shift',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        badgeBg: 'bg-indigo-100',
        badgeText: 'text-indigo-800'
    }
};

export interface ShiftInfo {
    date: string; // "YYYY-MM-DD"
    shift: ShiftType;
    shiftName: string;
    timeRange: string;
    displayTitle: string;
    displayDate: string;
}

/**
 * Returns IST date components (date string "YYYY-MM-DD" and decimal hours)
 */
export const getISTComponents = (targetDate: Date = new Date()) => {
    const formatterDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const formatterTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const dateParts = formatterDate.format(targetDate); // "YYYY-MM-DD"
    const timeParts = formatterTime.format(targetDate); // "HH:mm:ss"
    const [hours, minutes] = timeParts.split(':').map(Number);
    const decimalHours = hours + minutes / 60;

    return {
        istDateStr: dateParts,
        decimalHours
    };
};

/**
 * Auto-detects the operational date and shift in IST
 */
export const resolveCurrentShift = (targetDate: Date = new Date()): ShiftInfo => {
    const { istDateStr, decimalHours } = getISTComponents(targetDate);

    let shift: ShiftType = 'A';
    let [yyyy, mm, dd] = istDateStr.split('-').map(Number);
    let operationalDate = new Date(Date.UTC(yyyy, mm - 1, dd));

    if (decimalHours >= 6 && decimalHours < 14) {
        shift = 'A';
    } else if (decimalHours >= 14 && decimalHours < 22) {
        shift = 'B';
    } else {
        shift = 'C';
        // Midnight crossover: 00:00 to 05:59 IST belongs to the night shift started yesterday at 22:00
        if (decimalHours < 6) {
            operationalDate.setUTCDate(operationalDate.getUTCDate() - 1);
        }
    }

    const opYear = operationalDate.getUTCFullYear();
    const opMonth = String(operationalDate.getUTCMonth() + 1).padStart(2, '0');
    const opDay = String(operationalDate.getUTCDate()).padStart(2, '0');
    const resolvedDateStr = `${opYear}-${opMonth}-${opDay}`;

    const config = SHIFT_CONFIG[shift];
    const displayDate = formatDateDisplay(resolvedDateStr);

    return {
        date: resolvedDateStr,
        shift,
        shiftName: config.name,
        timeRange: config.timeRange,
        displayDate,
        displayTitle: `${displayDate} – ${shift} Shift Handover (${config.name})`
    };
};

/**
 * Formats "YYYY-MM-DD" into "DD Month YYYY" (e.g. "01 October 2026")
 */
export const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const [yyyy, mm, dd] = dateStr.split('-');
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = months[parseInt(mm, 10) - 1] || mm;
    return `${dd} ${monthName} ${yyyy}`;
};

/**
 * Returns previous chronological shift and date
 */
export const getPreviousShift = (dateStr: string, currentShift: ShiftType) => {
    const [yyyy, mm, dd] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(yyyy, mm - 1, dd));

    if (currentShift === 'C') {
        return { date: dateStr, shift: 'B' as ShiftType, shiftName: SHIFT_CONFIG.B.name };
    } else if (currentShift === 'B') {
        return { date: dateStr, shift: 'A' as ShiftType, shiftName: SHIFT_CONFIG.A.name };
    } else {
        dateObj.setUTCDate(dateObj.getUTCDate() - 1);
        const prevYear = dateObj.getUTCFullYear();
        const prevMonth = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const prevDay = String(dateObj.getUTCDate()).padStart(2, '0');
        return {
            date: `${prevYear}-${prevMonth}-${prevDay}`,
            shift: 'C' as ShiftType,
            shiftName: SHIFT_CONFIG.C.name
        };
    }
};

/**
 * Returns next chronological shift and date
 */
export const getNextShift = (dateStr: string, currentShift: ShiftType) => {
    const [yyyy, mm, dd] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(yyyy, mm - 1, dd));

    if (currentShift === 'A') {
        return { date: dateStr, shift: 'B' as ShiftType, shiftName: SHIFT_CONFIG.B.name };
    } else if (currentShift === 'B') {
        return { date: dateStr, shift: 'C' as ShiftType, shiftName: SHIFT_CONFIG.C.name };
    } else {
        dateObj.setUTCDate(dateObj.getUTCDate() + 1);
        const nextYear = dateObj.getUTCFullYear();
        const nextMonth = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const nextDay = String(dateObj.getUTCDate()).padStart(2, '0');
        return {
            date: `${nextYear}-${nextMonth}-${nextDay}`,
            shift: 'A' as ShiftType,
            shiftName: SHIFT_CONFIG.A.name
        };
    }
};

/**
 * Adjust date by +/- days
 */
export const addDaysToDateStr = (dateStr: string, days: number): string => {
    const [yyyy, mm, dd] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(yyyy, mm - 1, dd));
    dateObj.setUTCDate(dateObj.getUTCDate() + days);
    const nextYear = dateObj.getUTCFullYear();
    const nextMonth = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const nextDay = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${nextYear}-${nextMonth}-${nextDay}`;
};

export const DEFAULT_HANDOVER_TEMPLATE = `### 🚨 Critical Incidents / Outages
- [List critical tickets, customer impacts or link cuts]

### ⚠️ Circuits Under Observation
- [Circuit ID: issue summary, monitoring status]

### 📌 Follow-ups For Next Shift
- [Specific actions requested from the incoming team]

### 📝 General Shift Notes
- [General observations, vendor coordination, team updates]`;
