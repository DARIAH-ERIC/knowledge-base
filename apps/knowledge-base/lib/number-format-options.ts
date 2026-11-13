/**
 * `Intl.NumberFormat` options shared by number inputs (`NumberField`'s `formatOptions`) and by the
 * places that display the same values (`useFormatter().number`), so both read alike.
 */

/** Euro amounts, e.g. "€10,000.00". */
export const euroFormatOptions = { style: "currency", currency: "EUR" } as const;

/** Whole numbers such as counts, with digit grouping, e.g. "10,000". */
export const countFormatOptions = { maximumFractionDigits: 0 } as const;
