'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Priority, RecurrencePattern, Todo } from '@/lib/db';
import { useNotifications } from '@/lib/hooks/useNotifications';

interface TodoForm {
  title: string;
  priority: Priority;
  due_date: string;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern;
  reminder_minutes: '' | number;
}

const reminderOptions = [15, 30, 60, 120, 1440, 2880, 10080] as const;

export default function HomePage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [tagFilter, setTagFilter] = useState<number | 'all'>('all');
  const [form, setForm] = useState<TodoForm>({
    title: '',
    priority: 'medium',
    due_date: '',
    is_recurring: false,
    recurrence_pattern: 'weekly',
    reminder_minutes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { requestPermission, canNotify } = useNotifications(notificationsEnabled);

  async function loadTodos() {
    const response = await fetch('/api/todos');
    if (!response.ok) {
      setError('Failed to load todos');
      return;
    }

    const payload = (await response.json()) as { data: Todo[] };
    setTodos(payload.data);
  }

  useEffect(() => {
    void loadTodos();
  }, []);

  const filtered = useMemo(() => {
    return todos.filter((todo) => {
      const matchesQuery = query.trim().length === 0 || todo.title.toLowerCase().includes(query.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || todo.priority === priorityFilter;
      const matchesTag = tagFilter === 'all' || true;
      return matchesQuery && matchesPriority && matchesTag;
    });
  }, [todos, query, priorityFilter, tagFilter]);

  const overdue = filtered.filter((todo) => !todo.completed && todo.due_date && new Date(todo.due_date).getTime() < Date.now());
  const active = filtered.filter((todo) => !todo.completed && (!todo.due_date || new Date(todo.due_date).getTime() >= Date.now()));
  const completed = filtered.filter((todo) => todo.completed);

  async function createTodo() {
    setError(null);
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        reminder_minutes: form.reminder_minutes === '' ? null : Number(form.reminder_minutes),
        recurrence_pattern: form.is_recurring ? form.recurrence_pattern : null,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? 'Failed to create todo');
      return;
    }

    setForm({
      title: '',
      priority: 'medium',
      due_date: '',
      is_recurring: false,
      recurrence_pattern: 'weekly',
      reminder_minutes: '',
    });
    await loadTodos();
  }

  async function toggleTodo(todo: Todo) {
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed }),
    });
    await loadTodos();
  }

  async function deleteTodo(todo: Todo) {
    if (!window.confirm(`Delete "${todo.title}"?`)) {
      return;
    }
    await fetch(`/api/todos/${todo.id}`, { method: 'DELETE' });
    await loadTodos();
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  async function enableNotifications() {
    const granted = await requestPermission();
    setNotificationsEnabled(granted);
  }

  async function exportData() {
    const response = await fetch('/api/todos/export');
    if (!response.ok) return;
    const payload = await response.json();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'todo-export.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    const text = await file.text();
    const payload = JSON.parse(text);
    await fetch('/api/todos/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadTodos();
  }

  function TodoSection({ title, items }: { title: string; items: Todo[] }) {
    return (
      <section style={{ marginBottom: 24 }}>
        <h2>{title} ({items.length})</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((todo) => (
            <article key={todo.id} style={{ background: 'var(--surface)', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="checkbox" checked={todo.completed} onChange={() => void toggleTodo(todo)} />
                  <span>{todo.title}</span>
                </label>
                <button onClick={() => void deleteTodo(todo)} style={{ color: 'var(--danger)' }}>Delete</button>
              </div>
              <div style={{ marginTop: 6, color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span>Priority: {todo.priority}</span>
                {todo.due_date ? <span>Due: {new Date(todo.due_date).toLocaleString()}</span> : null}
                {todo.is_recurring && todo.recurrence_pattern ? <span>🔄 {todo.recurrence_pattern}</span> : null}
                {todo.reminder_minutes ? <span>🔔 {todo.reminder_minutes}m</span> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h1 style={{ marginBottom: 12 }}>Todo App</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/calendar">Calendar</Link>
          <button onClick={() => void enableNotifications()}>{canNotify ? 'Notifications On' : 'Enable Notifications'}</button>
          <button onClick={() => void exportData()}>Export</button>
          <label style={{ border: '1px solid #ddd', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
            Import
            <input
              hidden
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importData(file);
              }}
            />
          </label>
          <button onClick={() => void logout()}>Logout</button>
        </div>
      </header>

      <section style={{ background: 'var(--surface)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <h2>Create Todo</h2>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 160px 220px', marginBottom: 10 }}>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="What do you need to do?"
          />
          <select value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as Priority }))}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input
            type="datetime-local"
            value={form.due_date}
            onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
          <label>
            <input
              type="checkbox"
              checked={form.is_recurring}
              onChange={(e) => setForm((prev) => ({ ...prev, is_recurring: e.target.checked }))}
            />{' '}
            Repeat
          </label>
          <select
            value={form.recurrence_pattern}
            disabled={!form.is_recurring}
            onChange={(e) => setForm((prev) => ({ ...prev, recurrence_pattern: e.target.value as RecurrencePattern }))}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select
            value={form.reminder_minutes}
            disabled={!form.due_date}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                reminder_minutes: e.target.value ? Number(e.target.value) : '',
              }))
            }
          >
            <option value="">No reminder</option>
            {reminderOptions.map((option) => (
              <option key={option} value={option}>
                {option >= 1440 ? `${option / 1440} day` : `${option} minutes`} before
              </option>
            ))}
          </select>
          <button onClick={() => void createTodo()} disabled={!form.title.trim()}>Add</button>
        </div>

        {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
      </section>

      <section style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)}>
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">All tags</option>
        </select>
      </section>

      <TodoSection title="Overdue" items={overdue} />
      <TodoSection title="Active" items={active} />
      <TodoSection title="Completed" items={completed} />
    </main>
  );
}
