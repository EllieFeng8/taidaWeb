const FLOATING_POINT_PATTERN = /^[-+]?(?:\d+\.\d*|\d*\.\d+)(?:[eE][-+]?\d+)?$/;
const INTEGER_PATTERN = /^[-+]?\d+$/;

const trimTrailingZeros = (value) => value.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');

export const formatApiNumber = (value, fallback = '--') => {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            return fallback;
        }

        return Number.isInteger(value) ? String(value) : trimTrailingZeros(value.toFixed(2));
    }

    if (typeof value === 'string') {
        const trimmedValue = value.trim();

        if (!trimmedValue) {
            return fallback;
        }

        if (INTEGER_PATTERN.test(trimmedValue)) {
            return trimmedValue;
        }

        if (FLOATING_POINT_PATTERN.test(trimmedValue)) {
            const numericValue = Number(trimmedValue);

            if (!Number.isFinite(numericValue)) {
                return fallback;
            }

            return trimTrailingZeros(numericValue.toFixed(2));
        }

        return value;
    }

    return String(value);
};
