/**
 * HE-SYSTEM — Shared Formatters
 * packages/shared/utils/format.ts
 */

export function formatCurrency(amount: number, currency = 'MYR', locale = 'en-MY'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatStudentNumber(num: string): string {
  return num.toUpperCase().replace(/\s+/g, '')
}

export function generateInvoiceNumber(year: number, sequence: number): string {
  return `HE-${year}-${String(sequence).padStart(4, '0')}`
}
