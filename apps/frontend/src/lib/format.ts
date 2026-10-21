const DATE = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const DATE_TIME = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** "15 Oct 2026" style date in the viewer's locale. */
export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

/** 0..1 score as a whole percentage, e.g. 0.574 → "57%". */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
