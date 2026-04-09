import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { RecurrencePattern } from './db';

const TIMEZONE = 'Asia/Singapore';

export function getSingaporeNow(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

export function toSingaporeTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateObj, TIMEZONE);
}

export function formatInSingaporeTime(date: Date | string, formatString: string): string {
  const zonedDate = toSingaporeTime(date);
  return format(zonedDate, formatString, { timeZone: TIMEZONE });
}

export function formatSingaporeDate(date: Date | string): string {
  return formatInSingaporeTime(date, 'yyyy-MM-dd HH:mm:ss');
}

export function formatForDB(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
}

export function parseFromDB(dateString: string): Date {
  return new Date(dateString);
}

export function calculateNextDueDate(currentDueDate: string, pattern: RecurrencePattern): Date | null {
  if (!currentDueDate) return null;

  const date = toSingaporeTime(currentDueDate);

  switch (pattern) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'monthly':
      return addMonths(date, 1);
    case 'yearly':
      return addYears(date, 1);
    default:
      return null;
  }
}
