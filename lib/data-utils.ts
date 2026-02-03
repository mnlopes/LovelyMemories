/**
 * Safely extracts a numeric value from various input types.
 * Handles numbers directly, parses strings, and extracts values from localized objects.
 */
export const safeCount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseInt(val, 10) || 0;
    if (typeof val === 'object' && val !== null) {
        // Try known language keys
        const num = val.en || val.pt || val.he || Object.values(val)[0] || '0';
        return typeof num === 'number' ? num : parseInt(String(num), 10) || 0;
    }
    return 0;
};

/**
 * Safely extracts a string for the current locale from a potentially localized object.
 */
export const getLocalizedStr = (val: any, locale: string = 'en'): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        const preferred = val[locale] || val['en'] || val['pt'] || Object.values(val)[0];
        return typeof preferred === 'string' ? preferred : String(preferred || '');
    }
    return String(val || '');
};
