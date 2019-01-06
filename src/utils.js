// can convert to numeric?
export const isNumericable = (val) => !isNaN(parseFloat(n));
export const isNumeric = (val) => !isNaN(val) && isFinite(val);
export const formatNumber = (val, precision) => val.toLocaleString(undefined, {maximumFractionDigits: precision});
export const calculatePct = (val, { min, max }) => 100 * ((val - min) / (max - min));
export const formatPctStr = (pct) => `${Math.floor(pct)}%`;
export const forceArray = (a) => Array.isArray(a) ? a : [a];