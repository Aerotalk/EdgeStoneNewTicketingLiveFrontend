const IST = 'Asia/Kolkata';

// Map simple UI strings to valid IANA timezone identifiers
const getIANA = (tzStr: string) => {
    switch (tzStr) {
        case 'IST': return 'Asia/Kolkata';
        case 'GMT': return 'GMT';
        case 'UTC': return 'UTC';
        default: return 'UTC'; // Fallback
    }
};

/**
 * Format a date string or Date object to a localized IST date string.
 */
export function formatDateIST(
    date: string | Date,
    options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
): string {
    return new Date(date).toLocaleDateString('en-GB', { ...options, timeZone: IST });
}

export function formatDateWithTZ(
    date: string | Date,
    tzCode: string = 'UTC',
    options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
): string {
    return new Date(date).toLocaleDateString('en-GB', { ...options, timeZone: getIANA(tzCode) });
}

/**
 * Format a date string or Date object to a localized IST time string (24hr).
 */
export function formatTimeIST(date: string | Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: IST,
    });
}

export function formatTimeWithTZ(date: string | Date, tzCode: string = 'UTC'): string {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: getIANA(tzCode),
    });
}

/**
 * Get current date formatted in IST.
 */
export function nowDateIST(
    options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
): string {
    return formatDateIST(new Date(), options);
}

export function nowDateWithTZ(tzCode: string = 'UTC', options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
    return formatDateWithTZ(new Date(), tzCode, options);
}

/**
 * Get current time formatted in IST (24hr) with "hrs" suffix.
 */
export function nowTimeIST(): string {
    return `${formatTimeIST(new Date())} hrs`;
}

export function nowTimeWithTZ(tzCode: string = 'UTC'): string {
    return `${formatTimeWithTZ(new Date(), tzCode)} hrs`;
}
