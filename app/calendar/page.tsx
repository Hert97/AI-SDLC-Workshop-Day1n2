'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Todo } from '@/lib/db';
import { getSingaporeNow, formatDateKey, getTodayKey } from '@/lib/timezone';

interface Holiday { id: number; date: string; name: string; }

const PRIORITY_CLASS: Record<string, string> = {
  high:   'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low:    'bg-blue-100 text-blue-800',
};

function buildWeeks(year: number, month: number): Date[][] {
  const first = new Date(year, month - 1, 1);
  const last  = new Date(year, month, 0);
  const weeks: Date[][] = [];
  let week: Date[] = [];

  // Pad start
  for (let i = 0; i < first.getDay(); i++) {
    week.push(new Date(year, month - 1, 1 - first.getDay() + i));
  }

  for (let d = 1; d <= last.getDate(); d++) {
    week.push(new Date(year, month - 1, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }

  // Pad end
  while (week.length > 0 && week.length < 7) {
    week.push(new Date(year, month, week.length));
  }
  if (week.length) weeks.push(week);

  return weeks;
}

function CalendarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [todos, setTodos]         = useState<Todo[]>([]);
  const [holidays, setHolidays]   = useState<Holiday[]>([]);
  const [loading, setLoading]     = useState(true);
  const [dayModal, setDayModal]   = useState<{ date: Date; todos: Todo[] } | null>(null);

  const now = getSingaporeNow();
  const monthParam = searchParams.get('month');
  const [year, month] = monthParam
    ? monthParam.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  useEffect(() => {
    Promise.all([fetch('/api/todos'), fetch('/api/holidays')])
      .then(async ([tr, hr]) => {
        if (tr.ok) setTodos(await tr.json());
        if (hr.ok) setHolidays(await hr.json());
      })
      .finally(() => setLoading(false));
  }, []);

  const todosByDate = useMemo(() => {
    const map: Record<string, Todo[]> = {};
    todos.forEach((t) => {
      if (!t.due_date) return;
      const key = t.due_date.slice(0, 10);
      map[key] = [...(map[key] ?? []), t];
    });
    return map;
  }, [todos]);

  const holidaysByDate = useMemo(() => {
    const map: Record<string, Holiday> = {};
    holidays.forEach((h) => { map[h.date] = h; });
    return map;
  }, [holidays]);

  const weeks = useMemo(() => buildWeeks(year, month), [year, month]);
  const todayKey = getTodayKey();
  const monthLabel = new Date(year, month - 1, 1).toLocaleString('en-SG', { month: 'long' });

  function navigate(y: number, m: number) {
    if (m < 1)  { y -= 1; m = 12; }
    if (m > 12) { y += 1; m = 1; }
    router.push(`/calendar?month=${y}-${String(m).padStart(2, '0')}`);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/')} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-300">← Back</button>
          <button onClick={() => navigate(year, month - 1)} className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-700 dark:text-gray-200 hover:bg-gray-50" data-testid="prev-month-btn">◀</button>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white min-w-[200px] text-center" data-testid="calendar-month-label">{monthLabel} {year}</h2>
          <button onClick={() => navigate(year, month + 1)} className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-700 dark:text-gray-200 hover:bg-gray-50" data-testid="next-month-btn">▶</button>
          <button onClick={() => { const n = getSingaporeNow(); navigate(n.getFullYear(), n.getMonth() + 1); }} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600" data-testid="today-btn">Today</button>
        </div>

        {/* Calendar grid */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <div key={d} className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 py-3">{d}</div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700 last:border-0">
              {week.map((day) => {
                const dateStr = formatDateKey(day);
                const dayTodos = todosByDate[dateStr] ?? [];
                const holiday = holidaysByDate[dateStr];
                const isToday = dateStr === todayKey;
                const isCurMonth = day.getMonth() === month - 1;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div
                    key={dateStr}
                    onClick={() => setDayModal({ date: day, todos: dayTodos })}
                    className={[
                      'min-h-[90px] p-2 border-r border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer transition-colors',
                      'hover:bg-blue-50 dark:hover:bg-blue-900/30',
                      isToday ? 'bg-blue-50 dark:bg-blue-900/20' : '',
                      !isCurMonth ? 'bg-gray-50 dark:bg-gray-900/50' : '',
                      isWeekend && isCurMonth ? 'bg-amber-50/50 dark:bg-amber-900/10' : '',
                    ].filter(Boolean).join(' ')}
                    data-testid={`calendar-day-${dateStr}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${!isCurMonth ? 'text-gray-300 dark:text-gray-600' : ''} ${isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                      {isToday ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs">{day.getDate()}</span> : day.getDate()}
                    </div>
                    {holiday && isCurMonth && (
                      <div className="text-xs text-green-700 dark:text-green-400 truncate mb-0.5">🏖️ {holiday.name}</div>
                    )}
                    {dayTodos.slice(0, 3).map((t) => (
                      <div key={t.id} className={`text-xs truncate rounded px-1 mb-0.5 ${PRIORITY_CLASS[t.priority] ?? ''}`}>
                        {t.completed ? '✓ ' : ''}{t.title}
                      </div>
                    ))}
                    {dayTodos.length > 3 && (
                      <div className="text-xs text-gray-400">+{dayTodos.length - 3} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Day Modal */}
      {dayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setDayModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} data-testid="day-modal">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {dayModal.date.toLocaleDateString('en-SG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              <button onClick={() => setDayModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            {holidaysByDate[formatDateKey(dayModal.date)] && (
              <p className="text-green-700 dark:text-green-400 text-sm mb-3">
                🏖️ {holidaysByDate[formatDateKey(dayModal.date)].name}
              </p>
            )}
            {dayModal.todos.length === 0 ? (
              <p className="text-gray-400 text-sm">No todos due on this day.</p>
            ) : (
              <div className="space-y-2">
                {dayModal.todos.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CLASS[t.priority]}`}>{t.priority}</span>
                    <span className={`flex-1 text-sm ${t.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{t.title}</span>
                    {t.completed && <span className="text-green-500 text-xs">✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
      <CalendarPageContent />
    </Suspense>
  );
}
