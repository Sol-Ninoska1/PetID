const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

/** 12990 → "$12.990" */
export const formatClp = (value: number) => CLP.format(value);
