import { addDays, addMonths, addWeeks, addYears, formatISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

export const SINGAPORE_TZ = 'Asia/Singapore';

export function getSingaporeNow(): Date {
  return toZonedTime(new Date(), SINGAPORE_TZ);
}

export function formatSingaporeDate(date: Date, pattern = 'yyyy-MM-dd HH:mm:ssXXX'): string {
  return formatInTimeZone(date, SINGAPORE_TZ, pattern);
}

export function toSingaporeDate(dateInput: string | Date): Date {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return toZonedTime(date, SINGAPORE_TZ);
}

export function fromSingaporeLocalString(value: string): Date {
  return fromZonedTime(value, SINGAPORE_TZ);
}

export function isAtLeastOneMinuteInFuture(date: Date): boolean {
  return date.getTime() - Date.now() >= 60_000;
}

export function getNextRecurrenceDate(baseDate: Date, pattern: 'daily' | 'weekly' | 'monthly' | 'yearly'): Date {
  if (pattern === 'daily') return addDays(baseDate, 1);
  if (pattern === 'weekly') return addWeeks(baseDate, 1);
  if (pattern === 'monthly') return addMonths(baseDate, 1);
  return addYears(baseDate, 1);
}

export function toIsoString(date: Date): string {
  return formatISO(date);
}
