/** PKR with thousands separator (rounded to whole rupees). */
export function formatPkr(n: number): string {
  return `PKR ${Math.round(n).toLocaleString()}`
}

/** Same rounding/locale, no prefix — PDF cells, autoTable, etc. */
export function formatMoneyAmount(n: number): string {
  return Math.round(n).toLocaleString()
}
