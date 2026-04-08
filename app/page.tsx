'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Todo, Tag, Template, Priority, RecurrencePattern } from '@/lib/db';
import { getSingaporeNow, formatRelativeTime, isOverdue, calculateNextDueDate } from '@/lib/timezone';
import { useNotifications } from '@/lib/hooks/useNotifications';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string; order: number }> = {
  high:   { label: 'High',   className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',         order: 0 },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', order: 1 },
  low:    { label: 'Low',    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',      order: 2 },
};

const REMINDER_OPTIONS = [
  { value: 15,    label: '15 minutes before' },
  { value: 30,    label: '30 minutes before' },
  { value: 60,    label: '1 hour before' },
  { value: 120,   label: '2 hours before' },
  { value: 1440,  label: '1 day before' },
  { value: 2880,  label: '2 days before' },
  { value: 10080, label: '1 week before' },
];

const REMINDER_LABELS: Record<number, string> = {
  15: '15m', 30: '30m', 60: '1h', 120: '2h', 1440: '1d', 2880: '2d', 10080: '1w',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    const pa = PRIORITY_CONFIG[a.priority].order;
    const pb = PRIORITY_CONFIG[b.priority].order;
    if (pa !== pb) return pa - pb;
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function calcProgress(subtasks: Todo['subtasks']): { completed: number; total: number; pct: number } {
  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.completed).length;
  return { completed, total, pct: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterState {
  search: string;
  priority: string;
  tagId: string;
  completionStatus: string;
  dateFrom: string;
  dateTo: string;
}

interface SavedPreset extends FilterState { name: string; }

const EMPTY_FILTER: FilterState = { search: '', priority: '', tagId: '', completionStatus: '', dateFrom: '', dateTo: '' };
const PRESETS_KEY = 'todo-filter-presets';

function applyFilters(todos: Todo[], f: FilterState): Todo[] {
  const q = f.search.toLowerCase().trim();
  return todos.filter((t) => {
    if (q) {
      const inTitle    = t.title.toLowerCase().includes(q);
      const inSubtasks = t.subtasks?.some((s) => s.title.toLowerCase().includes(q));
      if (!inTitle && !inSubtasks) return false;
    }
    if (f.priority && t.priority !== f.priority) return false;
    if (f.tagId && !t.tags?.some((tg) => String(tg.id) === f.tagId)) return false;
    if (f.completionStatus === 'incomplete' && t.completed) return false;
    if (f.completionStatus === 'completed' && !t.completed) return false;
    if (f.dateFrom && t.due_date && t.due_date < f.dateFrom) return false;
    if (f.dateTo && t.due_date && t.due_date > f.dateTo + 'T23:59:59') return false;
    return true;
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();

  // Auth
  const [userId, setUserId]     = useState<number | null>(null);
  const [username, setUsername] = useState('');

  // Todos / Tags / Templates
  const [todos, setTodos]             = useState<Todo[]>([]);
  const [tags, setTags]               = useState<Tag[]>([]);
  const [templates, setTemplates]     = useState<Template[]>([]);
  const [loading, setLoading]         = useState(true);

  // Create-form state
  const [newTitle, setNewTitle]                 = useState('');
  const [newPriority, setNewPriority]           = useState<Priority>('medium');
  const [newDueDate, setNewDueDate]             = useState('');
  const [newIsRecurring, setNewIsRecurring]     = useState(false);
  const [newRecPattern, setNewRecPattern]       = useState<RecurrencePattern>('weekly');
  const [newReminder, setNewReminder]           = useState<number | ''>('');
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [showDataMenu, setShowDataMenu]         = useState(false);
  const [newSelectedTags, setNewSelectedTags]   = useState<number[]>([]);

  // Edit state
  const [editTodo, setEditTodo]                       = useState<Todo | null>(null);
  const [editTitle, setEditTitle]                     = useState('');
  const [editPriority, setEditPriority]               = useState<Priority>('medium');
  const [editDueDate, setEditDueDate]                 = useState('');
  const [editIsRecurring, setEditIsRecurring]         = useState(false);
  const [editRecPattern, setEditRecPattern]           = useState<RecurrencePattern>('weekly');
  const [editReminder, setEditReminder]               = useState<number | ''>('');
  const [editSelectedTags, setEditSelectedTags]       = useState<number[]>([]);

  // Expanded subtasks
  const [expandedTodos, setExpandedTodos]     = useState<Set<number>>(new Set());
  const [subtaskInputs, setSubtaskInputs]     = useState<Record<number, string>>({});

  // Tag management
  const [showTagModal, setShowTagModal]       = useState(false);
  const [newTagName, setNewTagName]           = useState('');
  const [newTagColor, setNewTagColor]         = useState('#3B82F6');
  const [editingTag, setEditingTag]           = useState<Tag | null>(null);
  const [editTagName, setEditTagName]         = useState('');
  const [editTagColor, setEditTagColor]       = useState('');

  // Template management
  const [showTemplateModal, setShowTemplateModal]           = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal]   = useState(false);
  const [templateName, setTemplateName]                     = useState('');
  const [templateDesc, setTemplateDesc]                     = useState('');
  const [templateCategory, setTemplateCategory]             = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('');

  // Filters
  const [filters, setFilters]         = useState<FilterState>(EMPTY_FILTER);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [presets, setPresets]           = useState<SavedPreset[]>([]);
  const [presetName, setPresetName]     = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  // Notifications
  const { permission, requestPermission } = useNotifications(userId);

  // ── Data fetching ───────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    const [todosRes, tagsRes, templatesRes] = await Promise.all([
      fetch('/api/todos'),
      fetch('/api/tags'),
      fetch('/api/templates'),
    ]);
    if (todosRes.ok)     setTodos(await todosRes.json());
    if (tagsRes.ok)      setTags(await tagsRes.json());
    if (templatesRes.ok) setTemplates(await templatesRes.json());
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.userId) {
          setUserId(data.userId);
          setUsername(data.username);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    fetchAll().finally(() => setLoading(false));
  }, [userId, fetchAll]);

  useEffect(() => {
    const stored = localStorage.getItem(PRESETS_KEY);
    if (stored) {
      try { setPresets(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  // ── Derived: filtered + sectioned todos ────────────────────────────────

  const filteredTodos = useMemo(() => applyFilters(todos, filters), [todos, filters]);

  const overdueTodos    = useMemo(() => sortTodos(filteredTodos.filter((t) => !t.completed && isOverdue(t.due_date))), [filteredTodos]);
  const pendingTodos    = useMemo(() => sortTodos(filteredTodos.filter((t) => !t.completed && !isOverdue(t.due_date))), [filteredTodos]);
  const completedTodos  = useMemo(() => filteredTodos.filter((t) => t.completed).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()), [filteredTodos]);

  const isAnyFilterActive = Object.values(filters).some(Boolean);

  // ── CRUD helpers ────────────────────────────────────────────────────────

  async function createTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const minDue = new Date(getSingaporeNow().getTime() + 60_000).toISOString();
    if (newDueDate && newDueDate < minDue) {
      alert('Due date must be at least 1 minute in the future');
      return;
    }
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        priority: newPriority,
        due_date: newDueDate || null,
        is_recurring: newIsRecurring,
        recurrence_pattern: newIsRecurring ? newRecPattern : null,
        reminder_minutes: newReminder || null,
        tag_ids: newSelectedTags,
      }),
    });
    if (res.ok) {
      setNewTitle(''); setNewDueDate(''); setNewIsRecurring(false);
      setNewReminder(''); setNewSelectedTags([]); setNewPriority('medium');
      await fetchAll();
    }
  }

  async function toggleTodo(todo: Todo) {
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed }),
    });
    await fetchAll();
  }

  async function deleteTodo(id: number) {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    await fetchAll();
  }

  function openEdit(todo: Todo) {
    setEditTodo(todo);
    setEditTitle(todo.title);
    setEditPriority(todo.priority);
    setEditDueDate(todo.due_date ? todo.due_date.slice(0, 16) : '');
    setEditIsRecurring(Boolean(todo.is_recurring));
    setEditRecPattern(todo.recurrence_pattern ?? 'weekly');
    setEditReminder(todo.reminder_minutes ?? '');
    setEditSelectedTags(todo.tags.map((t) => t.id));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTodo) return;
    await fetch(`/api/todos/${editTodo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        priority: editPriority,
        due_date: editDueDate || null,
        is_recurring: editIsRecurring,
        recurrence_pattern: editIsRecurring ? editRecPattern : null,
        reminder_minutes: editReminder || null,
        tag_ids: editSelectedTags,
      }),
    });
    setEditTodo(null);
    await fetchAll();
  }

  // ── Subtasks ────────────────────────────────────────────────────────────

  async function addSubtask(todoId: number) {
    const title = subtaskInputs[todoId]?.trim();
    if (!title) return;
    await fetch(`/api/todos/${todoId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setSubtaskInputs((prev) => ({ ...prev, [todoId]: '' }));
    await fetchAll();
  }

  async function toggleSubtask(subtaskId: number) {
    const todo = todos.find((t) => t.subtasks.some((s) => s.id === subtaskId));
    const subtask = todo?.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return;
    await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !subtask.completed }),
    });
    await fetchAll();
  }

  async function deleteSubtask(subtaskId: number) {
    await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
    await fetchAll();
  }

  // ── Tags ────────────────────────────────────────────────────────────────

  async function createTag() {
    if (!newTagName.trim()) return;
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName, color: newTagColor }),
    });
    setNewTagName(''); setNewTagColor('#3B82F6');
    await fetchAll();
  }

  async function updateTag() {
    if (!editingTag) return;
    await fetch(`/api/tags/${editingTag.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editTagName, color: editTagColor }),
    });
    setEditingTag(null);
    await fetchAll();
  }

  async function deleteTag(id: number) {
    await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    await fetchAll();
  }

  // ── Templates ───────────────────────────────────────────────────────────

  async function saveTemplate() {
    if (!templateName.trim()) return;
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: templateName,
        description: templateDesc || null,
        category: templateCategory || null,
        title_template: newTitle,
        priority: newPriority,
        is_recurring: newIsRecurring,
        recurrence_pattern: newIsRecurring ? newRecPattern : null,
        reminder_minutes: newReminder || null,
        subtasks_json: '[]',
      }),
    });
    setTemplateName(''); setTemplateDesc(''); setTemplateCategory('');
    setShowSaveTemplateModal(false);
    await fetchAll();
  }

  async function useTemplate(templateId: number) {
    const res = await fetch(`/api/templates/${templateId}/use`, { method: 'POST' });
    if (res.ok) { setShowTemplateModal(false); await fetchAll(); }
  }

  async function deleteTemplate(id: number) {
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    await fetchAll();
  }

  // ── Import ──────────────────────────────────────────────────────────────

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/todos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      alert(result.message);
      await fetchAll();
    } catch (err) {
      alert(`Failed to import: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    e.target.value = '';
  }

  // ── Presets ─────────────────────────────────────────────────────────────

  function savePreset() {
    if (!presetName.trim()) return;
    const updated = [...presets, { ...filters, name: presetName }];
    setPresets(updated);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
    setPresetName(''); setShowSavePreset(false);
  }

  function applyPreset(p: SavedPreset) {
    const { name: _n, ...f } = p;
    setFilters(f);
  }

  function deletePreset(i: number) {
    const updated = presets.filter((_, idx) => idx !== i);
    setPresets(updated);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
  }

  // ── Logout ──────────────────────────────────────────────────────────────

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  // ── Render helpers ───────────────────────────────────────────────────────

  function TodoItem({ todo }: { todo: Todo }) {
    const expanded = expandedTodos.has(todo.id);
    const { completed: doneCount, total, pct } = calcProgress(todo.subtasks);
    const rel = todo.due_date ? formatRelativeTime(todo.due_date) : null;

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border ${todo.completed ? 'opacity-60' : ''}`}>
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={Boolean(todo.completed)}
            onChange={() => toggleTodo(todo)}
            className="mt-1 h-4 w-4 accent-blue-600 cursor-pointer"
            data-testid={`todo-checkbox-${todo.id}`}
          />

          {/* Body */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`font-medium ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-white'}`}>
                {todo.title}
              </span>
              {/* Priority badge */}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CONFIG[todo.priority].className}`}>
                {PRIORITY_CONFIG[todo.priority].label}
              </span>
              {/* Recurrence badge */}
              {Boolean(todo.is_recurring) && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900 dark:text-purple-200">
                  🔄 {todo.recurrence_pattern}
                </span>
              )}
              {/* Reminder badge */}
              {todo.reminder_minutes && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  🔔 {REMINDER_LABELS[todo.reminder_minutes]}
                </span>
              )}
              {/* Tag pills */}
              {todo.tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setFilters((f) => ({ ...f, tagId: String(tag.id) }))}
                  style={{ backgroundColor: tag.color }}
                  className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
                >
                  {tag.name}
                </button>
              ))}
            </div>

            {/* Due date */}
            {rel && (
              <p className={`text-xs mt-1 ${rel.color}`}>{rel.text}</p>
            )}

            {/* Progress bar */}
            {total > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{doneCount}/{total} subtasks</p>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setExpandedTodos((s) => { const n = new Set(s); expanded ? n.delete(todo.id) : n.add(todo.id); return n; })}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
              data-testid={`subtasks-toggle-${todo.id}`}
            >
              {expanded ? '▼' : '▶'} Subtasks
            </button>
            <button onClick={() => openEdit(todo)} className="text-xs text-blue-600 hover:text-blue-800" data-testid={`edit-todo-${todo.id}`}>Edit</button>
            <button onClick={() => deleteTodo(todo.id)} className="text-xs text-red-500 hover:text-red-700" data-testid={`delete-todo-${todo.id}`}>Delete</button>
          </div>
        </div>

        {/* Subtasks panel */}
        {expanded && (
          <div className="mt-3 pl-7 space-y-2">
            {todo.subtasks.map((sub) => (
              <div key={sub.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(sub.completed)}
                  onChange={() => toggleSubtask(sub.id)}
                  className="accent-blue-600"
                  data-testid={`subtask-checkbox-${sub.id}`}
                />
                <span className={`flex-1 text-sm ${sub.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                  {sub.title}
                </span>
                <button onClick={() => deleteSubtask(sub.id)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="Add subtask…"
                value={subtaskInputs[todo.id] ?? ''}
                onChange={(e) => setSubtaskInputs((prev) => ({ ...prev, [todo.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addSubtask(todo.id)}
                className="flex-1 text-sm px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                data-testid={`subtask-input-${todo.id}`}
              />
              <button onClick={() => addSubtask(todo.id)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600">Add</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function Section({ title, items, bg }: { title: string; items: Todo[]; bg?: string }) {
    if (items.length === 0) return null;
    return (
      <section>
        <h2 className={`text-lg font-semibold mb-3 px-4 py-2 rounded-lg ${bg ?? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
          {title} ({items.length})
        </h2>
        <div className="space-y-3">
          {items.map((t) => <TodoItem key={t.id} todo={t} />)}
        </div>
      </section>
    );
  }

  const uniqueTemplateCategories = useMemo(() =>
    [...new Set(templates.map((t) => t.category).filter(Boolean))] as string[],
    [templates],
  );

  const filteredTemplates = templateCategoryFilter
    ? templates.filter((t) => t.category === templateCategoryFilter)
    : templates;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
        <div className="text-white text-2xl">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-3xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Todos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Hello, {username}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Data (Export / Import) */}
            <div className="relative">
              <button
                onClick={() => setShowDataMenu((v) => !v)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
                data-testid="data-menu-button"
              >
                📂 Data <span className="text-xs">{showDataMenu ? '▴' : '▾'}</span>
              </button>
              {showDataMenu && (
                <>
                  {/* Click-outside overlay */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowDataMenu(false)} />
                  <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-50 py-1">
                    <a
                      href="/api/todos/export?format=json"
                      download
                      onClick={() => setShowDataMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      data-testid="export-json-button"
                    >
                      ⬇ Export JSON
                    </a>
                    <a
                      href="/api/todos/export?format=csv"
                      download
                      onClick={() => setShowDataMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      data-testid="export-csv-button"
                    >
                      ⬇ Export CSV
                    </a>
                    <hr className="border-gray-200 dark:border-gray-600 my-1" />
                    <label
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      data-testid="import-button"
                    >
                      ⬆ Import JSON
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => { setShowDataMenu(false); handleImport(e); }}
                        data-testid="import-file-input"
                      />
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Calendar */}
            <button onClick={() => router.push('/calendar')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700">
              📅 Calendar
            </button>

            {/* Templates */}
            <button onClick={() => setShowTemplateModal(true)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700" data-testid="templates-btn">
              📋 Templates
            </button>

            {/* Notifications */}
            <button
              onClick={requestPermission}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium text-white ${permission === 'granted' ? 'bg-green-500' : 'bg-orange-500 hover:bg-orange-600'}`}
              data-testid="notifications-btn"
            >
              🔔 {permission === 'granted' ? 'Notifications On' : 'Enable Notifications'}
            </button>

            {/* Logout */}
            <button onClick={logout} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300">
              Logout
            </button>
          </div>
        </header>

        {/* ── Create Form ────────────────────────────────────────────── */}
        <form onSubmit={createTodo} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 mb-6 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="What needs to be done?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="new-todo-input"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              data-testid="new-todo-priority"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input
              type="datetime-local"
              value={newDueDate}
              onChange={(e) => { setNewDueDate(e.target.value); if (!e.target.value) { setNewIsRecurring(false); setNewReminder(''); } }}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              data-testid="new-todo-due-date"
            />
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              data-testid="add-todo-btn"
            >
              Add
            </button>
          </div>

          {/* Advanced options toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedForm((v) => !v)}
              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>{showAdvancedForm ? '▾' : '▸'}</span>
              {showAdvancedForm ? 'Hide advanced options' : 'Show advanced options'}
            </button>

            {showAdvancedForm && (
              <div className="mt-3 space-y-3 pl-1">
                {/* Recurring */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={newIsRecurring}
                      disabled={!newDueDate}
                      onChange={(e) => setNewIsRecurring(e.target.checked)}
                      data-testid="new-todo-recurring"
                    />
                    Repeat
                  </label>
                  {newIsRecurring && (
                    <select
                      value={newRecPattern}
                      onChange={(e) => setNewRecPattern(e.target.value as RecurrencePattern)}
                      className="px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm dark:text-white"
                      data-testid="new-todo-recurrence-pattern"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  )}
                </div>

                {/* Reminder */}
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <span>Reminder:</span>
                  <select
                    value={newReminder}
                    disabled={!newDueDate}
                    onChange={(e) => setNewReminder(e.target.value ? Number(e.target.value) : '')}
                    className="px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm dark:text-white disabled:opacity-40"
                    data-testid="new-todo-reminder"
                  >
                    <option value="">No reminder</option>
                    {REMINDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {!newDueDate && <span className="text-xs text-gray-400">(set a due date first)</span>}
                </div>

                {/* Use template */}
                <div className="flex items-center gap-2">
                  {templates.length > 0 && (
                    <select
                      onChange={(e) => e.target.value && useTemplate(Number(e.target.value))}
                      className="px-3 py-1 text-sm border rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                      defaultValue=""
                      data-testid="use-template-select"
                    >
                      <option value="">Use template…</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}{t.category ? ` (${t.category})` : ''}</option>
                      ))}
                    </select>
                  )}
                  {newTitle.trim() && (
                    <button type="button" onClick={() => setShowSaveTemplateModal(true)} className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200">
                      💾 Save as Template
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tag selection */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setNewSelectedTags((s) => s.includes(tag.id) ? s.filter((id) => id !== tag.id) : [...s, tag.id])}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    newSelectedTags.includes(tag.id) ? 'text-white ring-2 ring-offset-1' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                  style={newSelectedTags.includes(tag.id) ? { backgroundColor: tag.color, outlineColor: tag.color } : {}}
                >
                  {newSelectedTags.includes(tag.id) ? '✓ ' : ''}{tag.name}
                </button>
              ))}
            </div>
          )}

          {/* Bottom actions */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowTagModal(true)} className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200" data-testid="manage-tags-btn">
              + Manage Tags
            </button>
          </div>
        </form>

        {/* ── Search & Filters ───────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 mb-6 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search todos and subtasks..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full pl-10 pr-8 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="search-input"
            />
            {filters.search && (
              <button onClick={() => setFilters((f) => ({ ...f, search: '' }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
            )}
          </div>

          {/* Quick filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.priority}
              onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white"
              data-testid="priority-filter"
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {tags.length > 0 && (
              <select
                value={filters.tagId}
                onChange={(e) => setFilters((f) => ({ ...f, tagId: e.target.value }))}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white"
                data-testid="tag-filter"
              >
                <option value="">All Tags</option>
                {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${showAdvanced ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              {showAdvanced ? '▼' : '▶'} Advanced
            </button>

            {isAnyFilterActive && (
              <>
                <button onClick={() => setFilters(EMPTY_FILTER)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600" data-testid="clear-filters-btn">Clear All</button>
                <button onClick={() => setShowSavePreset(true)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600">💾 Save Filter</button>
              </>
            )}
          </div>

          {/* Advanced panel */}
          {showAdvanced && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-3">
              <div className="flex flex-wrap gap-2">
                <select
                  value={filters.completionStatus}
                  onChange={(e) => setFilters((f) => ({ ...f, completionStatus: e.target.value }))}
                  className="px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white"
                  data-testid="completion-filter"
                >
                  <option value="">All Todos</option>
                  <option value="incomplete">Incomplete Only</option>
                  <option value="completed">Completed Only</option>
                </select>
                <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} className="px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white" data-testid="date-from-filter" />
                <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} className="px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white" data-testid="date-to-filter" />
              </div>

              {presets.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Saved Filter Presets</p>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p, i) => (
                      <span key={i} className="flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900 rounded-full text-sm">
                        <button onClick={() => applyPreset(p)} className="text-blue-700 dark:text-blue-200 hover:underline">{p.name}</button>
                        <button onClick={() => deletePreset(i)} className="text-gray-400 hover:text-red-500">✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save preset inline */}
          {showSavePreset && (
            <div className="flex gap-2 pt-2 border-t">
              <input
                type="text"
                placeholder="Preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="flex-1 px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white"
              />
              <button onClick={savePreset} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm">Save</button>
              <button onClick={() => setShowSavePreset(false)} className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm">Cancel</button>
            </div>
          )}
        </div>

        {/* ── Todo Sections ──────────────────────────────────────────── */}
        <div className="space-y-8">
          <Section title="⚠️ Overdue" items={overdueTodos} bg="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100" />
          <Section title="📋 Pending" items={pendingTodos} />
          <Section title="✅ Completed" items={completedTodos} />

          {filteredTodos.length === 0 && todos.length > 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-lg">No todos match your filters</p>
              <button onClick={() => setFilters(EMPTY_FILTER)} className="mt-2 text-blue-500 hover:underline text-sm">Clear filters</button>
            </div>
          )}

          {todos.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-lg">No todos yet. Add one above!</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      {editTodo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" data-testid="edit-modal">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Edit Todo</h2>
            <form onSubmit={saveEdit} className="space-y-3">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                data-testid="edit-title-input"
              />
              <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as Priority)} className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white" data-testid="edit-priority-select">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <input type="datetime-local" value={editDueDate} onChange={(e) => { setEditDueDate(e.target.value); if (!e.target.value) { setEditIsRecurring(false); setEditReminder(''); } }} className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white" data-testid="edit-due-date" />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input type="checkbox" checked={editIsRecurring} disabled={!editDueDate} onChange={(e) => setEditIsRecurring(e.target.checked)} />
                  Repeat
                </label>
                {editIsRecurring && (
                  <select value={editRecPattern} onChange={(e) => setEditRecPattern(e.target.value as RecurrencePattern)} className="px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm dark:text-white">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                )}
                <select value={editReminder} disabled={!editDueDate} onChange={(e) => setEditReminder(e.target.value ? Number(e.target.value) : '')} className="px-2 py-1 border rounded bg-white dark:bg-gray-700 text-sm dark:text-white disabled:opacity-40">
                  <option value="">No reminder</option>
                  {REMINDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {/* Tag selection */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setEditSelectedTags((s) => s.includes(tag.id) ? s.filter((id) => id !== tag.id) : [...s, tag.id])}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${editSelectedTags.includes(tag.id) ? 'text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                      style={editSelectedTags.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                    >
                      {editSelectedTags.includes(tag.id) ? '✓ ' : ''}{tag.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditTodo(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm" data-testid="edit-cancel-btn">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700" data-testid="edit-save-btn">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Tag Management Modal ──────────────────────────────────────── */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" data-testid="tag-modal">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Manage Tags</h2>
              <button onClick={() => setShowTagModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            {/* Create tag */}
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="Tag name" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white" data-testid="new-tag-name" />
              <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="w-10 h-10 p-0.5 border rounded-lg cursor-pointer" data-testid="new-tag-color" />
              <button onClick={createTag} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700" data-testid="create-tag-btn">Create</button>
            </div>
            {/* Tag list */}
            <div className="space-y-2">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-2">
                  {editingTag?.id === tag.id ? (
                    <>
                      <input type="text" value={editTagName} onChange={(e) => setEditTagName(e.target.value)} className="flex-1 px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:text-white" data-testid={`edit-tag-name-${tag.id}`} />
                      <input type="color" value={editTagColor} onChange={(e) => setEditTagColor(e.target.value)} className="w-8 h-8 p-0.5 border rounded cursor-pointer" data-testid={`edit-tag-color-${tag.id}`} />
                      <button onClick={updateTag} className="px-2 py-1 bg-green-500 text-white rounded text-xs">Save</button>
                      <button onClick={() => setEditingTag(null)} className="px-2 py-1 bg-gray-200 rounded text-xs">Cancel</button>
                    </>
                  ) : (
                    <>
                      <span style={{ backgroundColor: tag.color }} className="px-3 py-0.5 rounded-full text-white text-sm">{tag.name}</span>
                      <span className="flex-1" />
                      <button onClick={() => { setEditingTag(tag); setEditTagName(tag.name); setEditTagColor(tag.color); }} className="text-xs text-blue-600 hover:text-blue-800" data-testid={`edit-tag-btn-${tag.id}`}>Edit</button>
                      <button onClick={() => deleteTag(tag.id)} className="text-xs text-red-500 hover:text-red-700" data-testid={`delete-tag-btn-${tag.id}`}>Delete</button>
                    </>
                  )}
                </div>
              ))}
              {tags.length === 0 && <p className="text-gray-400 text-sm text-center">No tags yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Save Template Modal ───────────────────────────────────────── */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Save as Template</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Template name *" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white" data-testid="template-name-input" />
              <input type="text" placeholder="Description (optional)" value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white" />
              <input type="text" placeholder="Category (optional)" value={templateCategory} onChange={(e) => setTemplateCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowSaveTemplateModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm">Cancel</button>
              <button onClick={saveTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700" data-testid="save-template-btn">Save Template</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Templates Manager Modal ───────────────────────────────────── */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" data-testid="template-modal">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Templates</h2>
              <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            {/* Category filter */}
            {uniqueTemplateCategories.length > 0 && (
              <select value={templateCategoryFilter} onChange={(e) => setTemplateCategoryFilter(e.target.value)} className="mb-4 px-3 py-1.5 border rounded-lg text-sm w-full bg-white dark:bg-gray-700 dark:text-white">
                <option value="">All Categories</option>
                {uniqueTemplateCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <div className="space-y-3">
              {filteredTemplates.map((t) => (
                <div key={t.id} className="border border-gray-200 dark:border-gray-600 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{t.name}</p>
                      {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.category && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">{t.category}</span>}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CONFIG[t.priority].className}`}>{t.priority}</span>
                        {Boolean(t.is_recurring) && <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">🔄 {t.recurrence_pattern}</span>}
                        {t.reminder_minutes && <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">🔔 {REMINDER_LABELS[t.reminder_minutes]}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => useTemplate(t.id)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700" data-testid={`use-template-${t.id}`}>Use</button>
                      <button onClick={() => deleteTemplate(t.id)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600" data-testid={`delete-template-${t.id}`}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredTemplates.length === 0 && <p className="text-center text-gray-400">No templates yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
