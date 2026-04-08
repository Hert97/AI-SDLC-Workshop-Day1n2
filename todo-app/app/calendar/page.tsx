'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Holiday, Todo } from '@/lib/db';

function toMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export default function CalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const monthKey = toMonthKey(month);
    void fetch(`/api/holidays?month=${monthKey}`).then(async (res) => {
      if (!res.ok) return;
      const payload = (await res.json()) as { data: Holiday[] };
      setHolidays(payload.data);
    });

    void fetch('/api/todos').then(async (res) => {
      if (!res.ok) return;
      const payload = (await res.json()) as { data: Todo[] };
      setTodos(payload.data);
    });
  }, [month]);

  const days = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const rows: Date[] = [];
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() - cursor.getDay());

    while (cursor <= end || cursor.getDay() !== 0) {
      rows.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return rows;
  }, [month]);

  const holidayMap = new Map(holidays.map((h) => [h.holiday_date, h.name]));

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>Calendar</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/">Back to Todos</Link>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Prev</button>
          <button onClick={() => setMonth(new Date())}>Today</button>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</button>
        </div>
      </header>

      <h2>{month.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <strong key={d} style={{ textAlign: 'center' }}>{d}</strong>
        ))}

        {days.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const dayTodos = todos.filter((t) => t.due_date && t.due_date.slice(0, 10) === key);
          const holidayName = holidayMap.get(key);
          const isCurrentMonth = day.getMonth() === month.getMonth();

          return (
            <article key={key} style={{ minHeight: 110, padding: 8, borderRadius: 10, background: isCurrentMonth ? 'var(--surface)' : 'var(--surface-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{day.getDate()}</strong>
                {dayTodos.length > 0 ? <span>{dayTodos.length}</span> : null}
              </div>
              {holidayName ? <p style={{ margin: '6px 0', color: '#a14100', fontSize: 12 }}>{holidayName}</p> : null}
              {dayTodos.slice(0, 2).map((todo) => (
                <p key={todo.id} style={{ margin: '4px 0', fontSize: 12 }}>{todo.title}</p>
              ))}
            </article>
          );
        })}
      </div>
    </main>
  );
}
