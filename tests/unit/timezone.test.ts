import {
  calculateNextDueDate,
  formatDateKey,
  formatRelativeTime,
  formatSingaporeDate,
  getSingaporeNow,
  getTodayKey,
  isOverdue,
} from '@/lib/timezone';

describe('timezone utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-09T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a valid Singapore date object', () => {
    const now = getSingaporeNow();
    expect(now).toBeInstanceOf(Date);
    expect(Number.isNaN(now.getTime())).toBe(false);
  });

  it('formats date for Singapore locale from string and Date input', () => {
    const iso = '2026-04-09T08:30:00.000Z';
    const fromString = formatSingaporeDate(iso);
    const fromDate = formatSingaporeDate(new Date(iso));

    expect(fromString).toContain('2026');
    expect(fromDate).toContain('2026');
  });

  it('returns YYYY-MM-DD keys', () => {
    const key = formatDateKey(new Date('2026-04-09T00:00:00.000Z'));
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const today = getTodayKey();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formats relative overdue times', () => {
    const now = getSingaporeNow();

    expect(formatRelativeTime(new Date(now.getTime() - 30 * 60_000).toISOString())).toEqual({
      text: '30m overdue',
      color: 'text-red-600',
    });

    expect(formatRelativeTime(new Date(now.getTime() - 2 * 60 * 60_000).toISOString())).toEqual({
      text: '2h overdue',
      color: 'text-red-600',
    });

    expect(formatRelativeTime(new Date(now.getTime() - 2 * 24 * 60 * 60_000).toISOString())).toEqual({
      text: '2d overdue',
      color: 'text-red-600',
    });
  });

  it('formats relative future times', () => {
    const now = getSingaporeNow();

    expect(formatRelativeTime(new Date(now.getTime() + 45 * 60_000).toISOString())).toEqual({
      text: 'Due in 45m',
      color: 'text-red-500',
    });

    expect(formatRelativeTime(new Date(now.getTime() + 2 * 60 * 60_000).toISOString())).toEqual({
      text: 'Due in 2h',
      color: 'text-orange-500',
    });

    expect(formatRelativeTime(new Date(now.getTime() + 2 * 24 * 60 * 60_000).toISOString())).toEqual({
      text: 'Due in 2d',
      color: 'text-yellow-600',
    });

    const farFuture = new Date(now.getTime() + 10 * 24 * 60 * 60_000).toISOString();
    expect(formatRelativeTime(farFuture)).toEqual({
      text: formatSingaporeDate(farFuture),
      color: 'text-blue-600',
    });
  });

  it('evaluates overdue status', () => {
    const now = getSingaporeNow();
    expect(isOverdue(null)).toBe(false);
    expect(isOverdue(new Date(now.getTime() - 60_000).toISOString())).toBe(true);
    expect(isOverdue(new Date(now.getTime() + 60_000).toISOString())).toBe(false);
  });

  it('calculates next due date for all recurrence patterns', () => {
    const base = '2026-04-09T00:00:00.000Z';

    expect(calculateNextDueDate(base, 'daily')).toBe('2026-04-10T00:00:00.000Z');
    expect(calculateNextDueDate(base, 'weekly')).toBe('2026-04-16T00:00:00.000Z');
    expect(calculateNextDueDate(base, 'monthly')).toBe('2026-05-09T00:00:00.000Z');
    expect(calculateNextDueDate(base, 'yearly')).toBe('2027-04-09T00:00:00.000Z');
  });
});
