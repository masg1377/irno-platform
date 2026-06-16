/**
 * Utility for combining class names cleanly.
 * Lightweight replacement for clsx — no dependency needed.
 *
 * Usage: cn('base-class', condition && 'conditional-class', 'another')
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
