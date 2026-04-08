/**
 * lib/timezone.ts
 * All date/time operations use Singapore timezone (Asia/Singapore, UTC+8).
 */

const TIMEZONE = 'Asia/Singapore';

/** Returns current time as a Date object adjusted for Singapore timezone. */
export function getSingaporeNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/** Formats a date string/Date for display in Singapore timezone. */
export function formatSingaporeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-SG', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Returns 'YYYY-MM-DD' string in Singapore timezone. */
export function formatDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // en-CA gives YYYY-MM-DD
}

/** Returns today as 'YYYY-MM-DD' in Singapore timezone. */
export function getTodayKey(): string {
  return formatDateKey(new Date());
}

/** Returns a human-readable relative time string for due dates. */
export function formatRelativeTime(due: string): { text: string; color: string } {
  const now = getSingaporeNow();
  const dueDate = new Date(due);
  const diffMs = dueDate.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMin < 0) {
    const abs = Math.abs(diffMin);
    if (abs < 60) return { text: `${abs}m overdue`, color: 'text-red-600' };
    if (abs < 1440) return { text: `${Math.round(abs / 60)}h overdue`, color: 'text-red-600' };
    return { text: `${Math.round(abs / 1440)}d overdue`, color: 'text-red-600' };
  }
  if (diffMin < 60) return { text: `Due in ${diffMin}m`, color: 'text-red-500' };
  if (diffMin < 1440) return { text: `Due in ${Math.round(diffMin / 60)}h`, color: 'text-orange-500' };
  if (diffMin < 10080) return { text: `Due in ${Math.round(diffMin / 1440)}d`, color: 'text-yellow-600' };
  return { text: formatSingaporeDate(due), color: 'text-blue-600' };
}

/** Returns true if the given ISO date string is past due in Singapore time. */
export function isOverdue(due: string | null): boolean {
  if (!due) return false;
  return new Date(due) < getSingaporeNow();
}

/** Calculates next due date for a recurring todo. */
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function calculateNextDueDate(currentDueDate: string, pattern: RecurrencePattern): string {
  const d = new Date(currentDueDate);
  switch (pattern) {
    case 'daily':   d.setDate(d.getDate() + 1); break;
    case 'weekly':  d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString();
}
