// can convert to numeric?
export const isNumericable = (val) => !isNaN(parseFloat(n));

// is a number?
export const isNumeric = (val) => !isNaN(val) && val !== undefined && isFinite(val);

// format number as string (with decimal precision)
export const formatNumber = (val, precision) => val.toLocaleString(undefined, {maximumFractionDigits: precision});

// calculate percent based on min/max
export const calculatePct = (val, { min, max }) => 100 * ((val - min) / (max - min));

// format percentage as string
export const formatPctStr = (pct) => `${Math.floor(pct)}%`;

// ensure that value is array (if not already an array, then wrap it in array)
export const forceArray = (a) => Array.isArray(a) ? a : [a];
