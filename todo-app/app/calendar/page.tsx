'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/app/components/AppHeader';
import type { Holiday, Todo } from '@/lib/db';
import { formatSingaporeDate, getSingaporeNow } from '@/lib/timezone';

function toMonthKey(date: Date): string {
  return formatSingaporeDate(date, 'yyyy-MM');
}

export default function CalendarPage() {
  const [month, setMonth] = useState(() => getSingaporeNow());
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

  const holidayMap = useMemo(() => new Map(holidays.map((holiday) => [holiday.holiday_date, holiday.name])), [holidays]);
  const singaporeToday = getSingaporeNow();
  const todayKey = formatSingaporeDate(singaporeToday, 'yyyy-MM-dd');
  const monthLabel = month.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const monthTodoCount = todos.filter((todo) => todo.due_date?.startsWith(toMonthKey(month))).length;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <main className="app-shell">
      <AppHeader
        currentPage="calendar"
        eyebrow="Planning horizon"
        title="Calendar"
        description="Scan your month, public holidays, and due tasks in one place."
        onLogout={logout}
      />

      <section className="panel hero-card panel-soft">
        <div>
          <span className="eyebrow">Month overview</span>
          <h2 className="hero-title">{monthLabel}</h2>
          <p className="hero-text">Use the calendar to spot overloaded days, Singapore holidays, and the shape of your recurring schedule.</p>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <p className="stat-label">Tasks this month</p>
            <p className="stat-value">{monthTodoCount}</p>
            <p className="muted-copy">Due dates landing in the current grid window.</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Holidays</p>
            <p className="stat-value">{holidays.length}</p>
            <p className="muted-copy">Singapore public holidays returned by the API.</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Today</p>
            <p className="stat-value">{singaporeToday.getDate()}</p>
            <p className="muted-copy">Jump back anytime to re-center the month view.</p>
          </article>
        </div>
      </section>

      <section className="panel calendar-panel">
        <div className="calendar-toolbar">
          <div>
            <span className="eyebrow">Month switcher</span>
            <h2 className="section-title">{monthLabel}</h2>
          </div>
          <div className="button-row">
            <button className="secondary-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} type="button">
              Prev
            </button>
            <button className="primary-button" onClick={() => setMonth(new Date())} type="button">
              Today
            </button>
            <button className="secondary-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} type="button">
              Next
            </button>
          </div>
        </div>

        <div className="weekday-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
            <strong className="weekday-label" key={dayName}>
              {dayName}
            </strong>
          ))}
        </div>

        <div className="calendar-grid">
          {days.map((day) => {
            const key = day.toISOString().slice(0, 10);
            const dayTodos = todos.filter((todo) => todo.due_date && todo.due_date.slice(0, 10) === key);
            const holidayName = holidayMap.get(key);
            const isCurrentMonth = day.getMonth() === month.getMonth();
            const isToday = key === todayKey;

            return (
              <article className={`calendar-day${!isCurrentMonth ? ' calendar-day-muted' : ''}${isToday ? ' calendar-day-today' : ''}`} key={key}>
                <div className="day-head">
                  <strong>{day.getDate()}</strong>
                  {dayTodos.length > 0 ? <span className="day-count">{dayTodos.length}</span> : null}
                </div>
                {holidayName ? <p className="day-holiday">{holidayName}</p> : null}
                <div className="day-events">
                  {dayTodos.slice(0, 3).map((todo) => (
                    <p className="day-event" key={todo.id}>
                      {todo.title}
                    </p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
