'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Todo } from '@/lib/db';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns';
import { getSingaporeNow } from '@/lib/timezone';

export default function CalendarPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [currentDate, setCurrentDate] = useState(getSingaporeNow());
  const [holidays, setHolidays] = useState<any[]>([]);
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', description: '', recurring: false });
  const [showEditHoliday, setShowEditHoliday] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', date: '', description: '', recurring: false });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/todos').then(res => { if (!res.ok) { router.push('/login'); return Promise.reject(); } return res.json(); }).then(setTodos).catch(() => {});
    fetch('/api/holidays').then(res => res.ok ? res.json() : []).then(setHolidays).catch(() => {});
  }, [router]);

  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start, end });
  const startingDayIndex = getDay(start);

  const priorityDotColor: { [key: string]: string } = {
    high: '#ef4444',
    medium: '#eab308',
    low: '#3b82f6',
  };

  const today = getSingaporeNow();

  const openAddHoliday = (day: Date) => {
    setSelectedDay(day);
    setHolidayForm({ name: '', date: format(day, 'yyyy-MM-dd'), description: '', recurring: false });
    setShowAddHoliday(true);
  };

  const closeAddHoliday = () => {
    setShowAddHoliday(false);
    setSelectedDay(null);
  };

  const openEditHoliday = (holiday: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingHoliday(holiday);
    setEditForm({
      name: holiday.name,
      date: holiday.date,
      description: holiday.description ?? '',
      recurring: Boolean(holiday.recurring),
    });
    setShowEditHoliday(true);
  };

  const closeEditHoliday = () => {
    setShowEditHoliday(false);
    setEditingHoliday(null);
  };

  const submitEditHoliday = async () => {
    if (!editingHoliday || !editForm.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/holidays/${editingHoliday.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await fetch('/api/holidays').then(r => r.ok ? r.json() : holidays);
        setHolidays(updated);
        closeEditHoliday();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteHoliday = async () => {
    if (!editingHoliday) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/holidays/${editingHoliday.id}`, { method: 'DELETE' });
      if (res.ok) {
        setHolidays(prev => prev.filter(h => h.id !== editingHoliday.id));
        closeEditHoliday();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitAddHoliday = async () => {
    if (!holidayForm.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayForm),
      });
      if (res.ok) {
        const updated = await fetch('/api/holidays').then(r => r.ok ? r.json() : holidays);
        setHolidays(updated);
        closeAddHoliday();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a2332' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 shadow-lg" style={{ backgroundColor: '#1a2332', borderBottom: '1px solid #2d4160' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Todo App</h1>
            <p className="text-xs" style={{ color: '#60a5fa' }}>Calendar View</p>
          </div>
          <button onClick={() => router.push('/')}
            style={{ backgroundColor: '#374151', border: '1px solid #4b5563' }}
            className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">
            ← Back to Todos
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Month navigation */}
        <div style={{ backgroundColor: '#243447', border: '1px solid #2d4160' }} className="rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              style={{ backgroundColor: '#374151' }}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm">&lt; Prev</button>
            <h2 className="text-xl font-bold text-white">{format(currentDate, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              style={{ backgroundColor: '#374151' }}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm">Next &gt;</button>
          </div>
        </div>

        {/* Calendar grid */}
        <div style={{ backgroundColor: '#243447', border: '1px solid #2d4160' }} className="rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ borderBottom: '1px solid #2d4160', backgroundColor: '#1e2d3d' }}
                className="py-3 text-center text-xs font-semibold text-slate-400 uppercase">{day}</div>
            ))}
          </div>
          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {Array.from({ length: startingDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} style={{ borderRight: '1px solid #2d4160', borderBottom: '1px solid #2d4160' }} className="h-28" />
            ))}
            {days.map(day => {
              const dayTodos = todos.filter(t => t.due_date && !t.completed && isSameDay(new Date(t.due_date), day));
              const holiday = holidays.find(h => {
                const hDate = new Date(h.date);
                if (h.recurring) {
                  return hDate.getMonth() === day.getMonth() && hDate.getDate() === day.getDate();
                }
                return isSameDay(hDate, day);
              });
              const isToday = isSameDay(day, today);
              const isPast = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const isHovered = hoveredDay ? isSameDay(day, hoveredDay) : false;

              let cellBg = 'transparent';
              if (isToday) cellBg = '#1e3a8a';
              else if (isHovered) cellBg = '#2d4a6a';

              return (
                <div key={day.toString()}
                  style={{
                    borderRight: '1px solid #2d4160', borderBottom: '1px solid #2d4160',
                    backgroundColor: cellBg,
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    outline: isToday ? '2px solid #3b82f6' : isHovered ? '1px solid #3b82f6' : 'none',
                    outlineOffset: '-1px',
                  }}
                  className="h-28 p-1.5 overflow-hidden"
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => openAddHoliday(day)}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{
                      width: '24px', height: '24px', lineHeight: '24px',
                      display: 'inline-block', textAlign: 'center',
                      fontSize: '12px', fontWeight: isToday ? '700' : '400',
                      color: isToday ? 'white' : isPast ? '#475569' : '#cbd5e1',
                    }}>{format(day, 'd')}</span>
                  </div>
                  {holiday && (
                    <div
                      className="text-xs truncate leading-tight mb-0.5"
                      style={{ color: '#4ade80', cursor: 'pointer' }}
                      title={holiday.name}
                      onClick={e => openEditHoliday(holiday, e)}>
                      🗓 {holiday.name}
                    </div>
                  )}
                  <div className="space-y-0.5 overflow-hidden">
                    {dayTodos.slice(0, 3).map(todo => (
                      <div key={todo.id} className="flex items-center gap-1 text-xs truncate leading-tight">
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, backgroundColor: priorityDotColor[todo.priority] || '#94a3b8' }} />
                        <span className="truncate" style={{ color: '#cbd5e1' }}>{todo.title}</span>
                      </div>
                    ))}
                    {dayTodos.length > 3 && (
                      <div className="text-xs" style={{ color: '#64748b' }}>+{dayTodos.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ backgroundColor: '#243447', border: '1px solid #2d4160' }} className="rounded-xl p-4 mt-4 flex flex-wrap gap-4">
          {[
            { color: '#ef4444', label: 'High Priority' },
            { color: '#eab308', label: 'Medium Priority' },
            { color: '#3b82f6', label: 'Low Priority' },
            { color: '#4ade80', label: 'Public Holiday' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Edit Holiday Modal */}
      {showEditHoliday && editingHoliday && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160', borderRadius: '12px', width: '100%', maxWidth: '400px', padding: '28px' }}>
            <h2 className="text-xl font-bold text-white mb-5">Edit Holiday</h2>

            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', backgroundColor: '#243447', border: '1px solid #2d4160', borderRadius: '6px', color: 'white', padding: '8px 12px', outline: 'none' }}
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={editForm.date}
                onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: '100%', backgroundColor: '#243447', border: '1px solid #2d4160', borderRadius: '6px', color: 'white', padding: '8px 12px', outline: 'none', colorScheme: 'dark' }}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-1">Description (optional)</label>
              <textarea
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                style={{ width: '100%', backgroundColor: '#243447', border: '1px solid #3b82f6', borderRadius: '6px', color: 'white', padding: '8px 12px', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div className="mb-6 flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-recurring"
                checked={editForm.recurring}
                onChange={e => setEditForm(f => ({ ...f, recurring: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
              <label htmlFor="edit-recurring" className="text-sm text-slate-300 cursor-pointer">Recurring holiday</label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitEditHoliday}
                disabled={submitting || !editForm.name.trim()}
                style={{ flex: 1, backgroundColor: '#3b82f6', borderRadius: '6px', padding: '9px 0', color: 'white', fontWeight: '600', opacity: (submitting || !editForm.name.trim()) ? 0.6 : 1, cursor: (submitting || !editForm.name.trim()) ? 'not-allowed' : 'pointer' }}>
                Update
              </button>
              <button
                onClick={deleteHoliday}
                disabled={submitting}
                style={{ backgroundColor: '#ef4444', borderRadius: '6px', padding: '9px 16px', color: 'white', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
                Delete
              </button>
              <button
                onClick={closeEditHoliday}
                style={{ backgroundColor: '#374151', border: '1px solid #4b5563', borderRadius: '6px', padding: '9px 16px', color: 'white', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {showAddHoliday && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160', borderRadius: '12px', width: '100%', maxWidth: '400px', padding: '28px' }}>
            <h2 className="text-xl font-bold text-white mb-5">Add Holiday</h2>

            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={holidayForm.name}
                onChange={e => setHolidayForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', backgroundColor: '#243447', border: '1px solid #2d4160', borderRadius: '6px', color: 'white', padding: '8px 12px', outline: 'none' }}
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={holidayForm.date}
                onChange={e => setHolidayForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: '100%', backgroundColor: '#243447', border: '1px solid #2d4160', borderRadius: '6px', color: 'white', padding: '8px 12px', outline: 'none', colorScheme: 'dark' }}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-1">Description (optional)</label>
              <textarea
                value={holidayForm.description}
                onChange={e => setHolidayForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                style={{ width: '100%', backgroundColor: '#243447', border: '1px solid #2d4160', borderRadius: '6px', color: 'white', padding: '8px 12px', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div className="mb-6 flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={holidayForm.recurring}
                onChange={e => setHolidayForm(f => ({ ...f, recurring: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
              <label htmlFor="recurring" className="text-sm text-slate-300 cursor-pointer">Recurring holiday</label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitAddHoliday}
                disabled={submitting || !holidayForm.name.trim()}
                style={{ flex: 1, backgroundColor: '#3b82f6', borderRadius: '6px', padding: '9px 0', color: 'white', fontWeight: '600', opacity: (submitting || !holidayForm.name.trim()) ? 0.6 : 1, cursor: (submitting || !holidayForm.name.trim()) ? 'not-allowed' : 'pointer' }}>
                Add
              </button>
              <button
                onClick={closeAddHoliday}
                style={{ backgroundColor: '#374151', border: '1px solid #4b5563', borderRadius: '6px', padding: '9px 20px', color: 'white', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

