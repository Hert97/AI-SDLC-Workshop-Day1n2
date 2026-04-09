'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/app/components/AppHeader';
import type { Priority, RecurrencePattern, Tag, Todo } from '@/lib/db';
import { formatSingaporeDate, getSingaporeNow, toSingaporeDate } from '@/lib/timezone';
import { useNotifications } from '@/lib/hooks/useNotifications';

interface TodoWithTags extends Todo {
  tag_ids: number[];
}

interface TodoForm {
  title: string;
  priority: Priority;
  due_date: string;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern;
  reminder_minutes: '' | number;
}

interface ImportPayload {
  todos: unknown[];
  subtasks: unknown[];
  tags: unknown[];
  todo_tags: unknown[];
}

const reminderOptions = [15, 30, 60, 120, 1440, 2880, 10080] as const;

const priorityClasses: Record<Priority, string> = {
  high: 'badge badge-high',
  medium: 'badge badge-medium',
  low: 'badge badge-low',
};

function formatDueDate(value: string | null): string {
  if (!value) {
    return 'No due date';
  }

  return formatSingaporeDate(toSingaporeDate(value), 'dd MMM yyyy, HH:mm');
}

function formatReminder(value: number | null): string {
  if (!value) {
    return 'No reminder';
  }

  if (value >= 1440) {
    const days = value / 1440;
    return `${days} day${days === 1 ? '' : 's'} before`;
  }

  return `${value} minutes before`;
}

function isImportPayload(value: unknown): value is ImportPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.todos) && Array.isArray(candidate.subtasks) && Array.isArray(candidate.tags) && Array.isArray(candidate.todo_tags);
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function HomePage() {
  const [todos, setTodos] = useState<TodoWithTags[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
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
  const deferredQuery = useDeferredValue(query);

  const loadDashboard = useCallback(async () => {
    try {
      const [todoResponse, tagResponse] = await Promise.all([fetch('/api/todos'), fetch('/api/tags')]);

      if (!todoResponse.ok || !tagResponse.ok) {
        setError('Failed to load your workspace');
        return;
      }

      const todoPayload = (await todoResponse.json()) as { data: TodoWithTags[] };
      const tagPayload = (await tagResponse.json()) as { data: Tag[] };
      setTodos(todoPayload.data);
      setTags(tagPayload.data);
    } catch {
      setError('Failed to load your workspace');
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const tagMap = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);

  const filtered = useMemo(() => {
    return todos.filter((todo) => {
      const matchesQuery = deferredQuery.trim().length === 0 || todo.title.toLowerCase().includes(deferredQuery.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || todo.priority === priorityFilter;
      const matchesTag = tagFilter === 'all' || todo.tag_ids.includes(tagFilter);
      return matchesQuery && matchesPriority && matchesTag;
    });
  }, [todos, deferredQuery, priorityFilter, tagFilter]);

  const singaporeNow = getSingaporeNow().getTime();
  const overdue = filtered.filter((todo) => !todo.completed && todo.due_date && new Date(todo.due_date).getTime() < singaporeNow);
  const active = filtered.filter((todo) => !todo.completed && (!todo.due_date || new Date(todo.due_date).getTime() >= singaporeNow));
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
    await loadDashboard();
  }

  async function toggleTodo(todo: TodoWithTags) {
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, 'Failed to update task'));
        return;
      }

      await loadDashboard();
    } catch {
      setError('Failed to update task');
    }
  }

  async function deleteTodo(todo: TodoWithTags) {
    if (!window.confirm(`Delete "${todo.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/todos/${todo.id}`, { method: 'DELETE' });
      if (!response.ok) {
        setError(await readErrorMessage(response, 'Failed to delete task'));
        return;
      }

      await loadDashboard();
    } catch {
      setError('Failed to delete task');
    }
  }

  async function logout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        setError(await readErrorMessage(response, 'Failed to logout'));
        return;
      }

      window.location.href = '/login';
    } catch {
      setError('Failed to logout');
    }
  }

  async function enableNotifications() {
    const granted = await requestPermission();
    setNotificationsEnabled(granted);
  }

  async function exportData() {
    try {
      const response = await fetch('/api/todos/export');
      if (!response.ok) {
        setError(await readErrorMessage(response, 'Export failed'));
        return;
      }

      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'todo-export.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed');
    }
  }

  async function importData(file: File) {
    try {
      const text = await file.text();
      if (text.length > 2_000_000) {
        setError('Import file is too large');
        return;
      }

      const payload = JSON.parse(text) as unknown;
      if (!isImportPayload(payload)) {
        setError('Import file has an invalid structure');
        return;
      }

      const response = await fetch('/api/todos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, 'Import failed'));
        return;
      }

      await loadDashboard();
    } catch {
      setError('Import file must be valid JSON');
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void importData(file);
    }
    event.target.value = '';
  }

  function TodoSection({ title, items, subtitle }: { title: string; items: TodoWithTags[]; subtitle: string }) {
    return (
      <section className="panel section-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Task lane</span>
            <h2 className="section-title">{title}</h2>
            <p className="section-subtitle">{subtitle}</p>
          </div>
          <span className="count-pill">{items.length}</span>
        </div>

        <div className="todo-list">
          {items.length === 0 ? (
            <div className="empty-state">No tasks in this lane right now.</div>
          ) : (
            items.map((todo) => {
              const todoTags = todo.tag_ids.map((tagId) => tagMap.get(tagId)).filter((tag): tag is Tag => Boolean(tag));

              return (
                <article className="todo-card" key={todo.id}>
                  <div className="todo-row">
                    <label className="checkbox-label">
                      <input checked={todo.completed} onChange={() => void toggleTodo(todo)} type="checkbox" />
                      <span className="todo-title">{todo.title}</span>
                    </label>
                    <button className="danger-button" onClick={() => void deleteTodo(todo)} type="button">
                      Delete
                    </button>
                  </div>

                  <div className="pill-row" style={{ marginTop: 14 }}>
                    <span className={priorityClasses[todo.priority]}>{todo.priority} priority</span>
                    <span className="badge">{formatDueDate(todo.due_date)}</span>
                    {todo.is_recurring && todo.recurrence_pattern ? <span className="badge">Repeats {todo.recurrence_pattern}</span> : null}
                    {todo.reminder_minutes ? <span className="badge">{formatReminder(todo.reminder_minutes)}</span> : null}
                    {todoTags.map((tag) => (
                      <span className="badge" key={tag.id}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    );
  }

  return (
    <main className="app-shell">
      <AppHeader
        currentPage="todos"
        eyebrow="Daily system"
        title="Focus board"
        description="Plan, sort, and finish work with reminders, recurring routines, and calendar context in a single flow."
        actions={
          <>
            <button className={canNotify ? 'secondary-button' : 'primary-button'} onClick={() => void enableNotifications()} type="button">
              {canNotify ? 'Notifications ready' : 'Enable notifications'}
            </button>
            <button className="secondary-button" onClick={() => void exportData()} type="button">
              Export
            </button>
            <label className="file-button">
              Import
              <input aria-label="Import todo data" accept="application/json" hidden onChange={handleFileInput} type="file" />
            </label>
          </>
        }
        onLogout={logout}
      />

      <section className="panel panel-elevated hero-card">
        <div>
          <span className="eyebrow">Today at a glance</span>
          <h2 className="hero-title">Turn scattered work into a deliberate daily queue.</h2>
          <p className="hero-text">
            Capture tasks, give them priority, set reminders in Singapore time, then work through overdue, active, and finished lanes.
          </p>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <p className="stat-label">Overdue</p>
            <p className="stat-value">{overdue.length}</p>
            <p className="muted-copy">Tasks that need intervention now.</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Active</p>
            <p className="stat-value">{active.length}</p>
            <p className="muted-copy">Live tasks that are scheduled or open-ended.</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Completed</p>
            <p className="stat-value">{completed.length}</p>
            <p className="muted-copy">Finished work kept for review and exports.</p>
          </article>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel composer-card panel-elevated">
          <span className="eyebrow">Compose</span>
          <h2 className="section-title">Create a task</h2>
          <p className="section-subtitle">Start with the task name, then add timing and recurrence only when you need them.</p>

          <div className="form-grid">
            <label className="field-label">
              Title
              <input
                className="control"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="What needs to happen next?"
              />
            </label>

            <label className="field-label">
              Priority
              <select className="control" value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as Priority }))}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>

            <label className="field-label">
              Due date
              <input
                className="control"
                type="datetime-local"
                value={form.due_date}
                onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
              />
            </label>
          </div>

          <div className="filter-grid" style={{ marginTop: 12 }}>
            <label className="field-label">
              Repeat
              <span className="inline-toggle">
                <input
                  checked={form.is_recurring}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_recurring: e.target.checked }))}
                  type="checkbox"
                />
                Enable recurrence
              </span>
            </label>

            <label className="field-label">
              Pattern
              <select
                className="control"
                disabled={!form.is_recurring}
                value={form.recurrence_pattern}
                onChange={(e) => setForm((prev) => ({ ...prev, recurrence_pattern: e.target.value as RecurrencePattern }))}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>

            <label className="field-label">
              Reminder
              <select
                className="control"
                disabled={!form.due_date}
                value={form.reminder_minutes}
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
                    {formatReminder(option)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="primary-button" disabled={!form.title.trim()} onClick={() => void createTodo()} type="button">
              Add task
            </button>
            <p className="small-note">Due dates and reminder validation follow Asia/Singapore time.</p>
          </div>

          {error ? <p className="error-banner" style={{ marginTop: 14 }}>{error}</p> : null}
        </section>

        <aside className="panel panel-soft info-card section-stack">
          <div>
            <span className="eyebrow">Workflow notes</span>
            <h2 className="section-title">Keep the board readable.</h2>
          </div>
          <ul className="info-list">
            <li>Use high priority for same-day commitments and blockers.</li>
            <li>Enable recurrence only for routines that truly repeat on schedule.</li>
            <li>Import existing data sets to rebuild your board quickly.</li>
          </ul>
          <div className="pill-row">
            <span className="badge">{tags.length} tags available</span>
            <span className="badge">{canNotify ? 'Browser alerts enabled' : 'Alerts off'}</span>
            <span className="badge">{todos.length} total tasks</span>
          </div>
        </aside>
      </div>

      <section className="panel filter-panel panel-soft">
        <span className="eyebrow">Filters</span>
        <div className="filter-grid" style={{ marginTop: 12 }}>
          <label className="field-label">
            Search
            <input className="control" placeholder="Search tasks by title" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>

          <label className="field-label">
            Priority
            <select className="control" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)}>
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>

          <label className="field-label">
            Tag
            <select className="control" value={tagFilter} onChange={(e) => setTagFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
              <option value="all">All tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="section-stack">
        <TodoSection items={overdue} subtitle="Needs attention first. These tasks have passed their due time." title="Overdue" />
        <TodoSection items={active} subtitle="Current work that is scheduled, queued, or waiting to be completed." title="Active" />
        <TodoSection items={completed} subtitle="Finished work, ready for review, export, or cleanup." title="Completed" />
      </div>
    </main>
  );
}
