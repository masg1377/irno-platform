/**
 * Money utilities for Irno Platform.
 *
 * RULE: All monetary values are stored and passed as INTEGER Toman.
 *       Never use floats for money. Never use Rial in the UI.
 *
 * These helpers handle only display formatting — not calculation.
 */

/**
 * Format an integer Toman amount for Persian display.
 * e.g. formatToman(1500000) → "۱٬۵۰۰٬۰۰۰ تومان"
 */
export function formatToman(amountToman: number): string {
  if (!Number.isInteger(amountToman)) {
    throw new Error(`formatToman: expected integer, got ${amountToman}`)
  }

  const formatted = amountToman.toLocaleString('fa-IR')
  return `${formatted} تومان`
}

/**
 * Format an integer Toman amount as compact.
 * e.g. compactToman(1500000) → "۱.۵ میلیون تومان"
 */
export function compactToman(amountToman: number): string {
  if (!Number.isInteger(amountToman)) {
    throw new Error(`compactToman: expected integer, got ${amountToman}`)
  }

  if (amountToman >= 1_000_000_000) {
    const b = amountToman / 1_000_000_000
    return `${b.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیارد تومان`
  }
  if (amountToman >= 1_000_000) {
    const m = amountToman / 1_000_000
    return `${m.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیون تومان`
  }
  return formatToman(amountToman)
}
