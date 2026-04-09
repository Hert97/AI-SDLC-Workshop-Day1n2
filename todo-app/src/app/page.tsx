'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Todo, Priority, Tag, Subtask, RecurrencePattern, Template } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

// ─── Constants ───────────────────────────────────────────────────────────────

const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
  { value: 2880, label: '2 days before' },
  { value: 10080, label: '1 week before' },
];

const REMINDER_LABELS: { [key: number]: string } = {
  15: '15m', 30: '30m', 60: '1h', 120: '2h', 1440: '1d', 2880: '2d', 10080: '1w',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSGDatetimeLocal(isoString: string): string {
  const d = new Date(isoString);
  const sg = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${sg.getFullYear()}-${pad(sg.getMonth() + 1)}-${pad(sg.getDate())}T${pad(sg.getHours())}:${pad(sg.getMinutes())}`;
}

function fromSGDatetimeLocal(local: string): string {
  if (!local) return '';
  return new Date(local + ':00+08:00').toISOString();
}

function minDatetimeLocal(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  return toSGDatetimeLocal(now.toISOString());
}

function formatDueDate(dueDateISO: string): { text: string; color: string } {
  const now = getSingaporeNow();
  const due = new Date(dueDateISO);
  const diffMs = due.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const timeStr = due.toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  if (diffMs < 0) {
    const a = Math.abs(diffMins);
    if (a < 60) return { text: `${a}m overdue`, color: 'text-red-400' };
    if (Math.abs(diffHours) < 24) return { text: `${Math.abs(diffHours)}h overdue`, color: 'text-red-400' };
    return { text: `${Math.abs(diffDays)}d overdue`, color: 'text-red-400' };
  }
  if (diffMins < 60) return { text: `Due in ${diffMins}m`, color: 'text-red-400' };
  if (diffHours < 24) return { text: `Due in ${diffHours}h (${timeStr})`, color: 'text-orange-400' };
  if (diffDays < 7) return { text: `Due in ${diffDays}d (${timeStr})`, color: 'text-yellow-400' };
  return { text: timeStr, color: 'text-blue-400' };
}

function isOverdue(todo: Todo): boolean {
  if (!todo.due_date || todo.completed) return false;
  return new Date(todo.due_date) < getSingaporeNow();
}

// ─── SubtaskList ──────────────────────────────────────────────────────────────

function SubtaskList({ todo, onSubtaskUpdate, onSubtaskAdd, onSubtaskDelete }: {
  todo: Todo;
  onSubtaskUpdate: (id: number, data: Partial<Subtask>) => Promise<void>;
  onSubtaskAdd: (todoId: number, title: string) => Promise<void>;
  onSubtaskDelete: (todoId: number, subtaskId: number) => Promise<void>;
}) {
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = async () => {
    if (!val.trim()) return;
    await onSubtaskAdd(todo.id, val.trim());
    setVal('');
    inputRef.current?.focus();
  };

  return (
    <div className="mt-3 pl-4 border-l-2" style={{ borderColor: '#2d4160' }}>
      {todo.subtasks?.map(st => (
        <div key={st.id} className="flex items-center gap-2 py-1.5 group">
          <input type="checkbox" checked={!!st.completed}
            onChange={() => onSubtaskUpdate(st.id, { completed: st.completed ? 0 : 1 })}
            className="w-4 h-4 cursor-pointer accent-blue-500" />
          <span className={`flex-1 text-sm ${st.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{st.title}</span>
          <button onClick={() => onSubtaskDelete(todo.id, st.id)}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs w-5">✕</button>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <input ref={inputRef} type="text" placeholder="Add subtask..." value={val}
          onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          style={{ backgroundColor: '#1a2332', border: '1px solid #2d4160' }}
          className="flex-1 px-3 py-1.5 rounded text-white text-sm focus:outline-none focus:border-blue-500" />
        <button onClick={add} style={{ backgroundColor: '#22c55e' }}
          className="px-3 py-1.5 text-white rounded text-sm font-medium hover:opacity-90">Add</button>
      </div>
    </div>
  );
}

// ─── TagManagerModal ──────────────────────────────────────────────────────────

function TagManagerModal({ tags, onTagCreate, onTagUpdate, onTagDelete, onClose }: {
  tags: Tag[];
  onTagCreate: (name: string, color: string) => Promise<void>;
  onTagUpdate: (id: number, name: string, color: string) => Promise<void>;
  onTagDelete: (id: number) => Promise<void>;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [editing, setEditing] = useState<Tag | null>(null);

  const create = async () => {
    if (!newName.trim()) return;
    await onTagCreate(newName.trim(), newColor);
    setNewName(''); setNewColor('#3B82F6');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div style={{ backgroundColor: '#243447', border: '1px solid #2d4160' }}
        className="rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-5 border-b" style={{ borderColor: '#2d4160' }}>
          <h2 className="text-xl font-bold text-white">Manage Tags</h2>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Create New Tag</p>
            <div className="flex gap-2">
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && create()} placeholder="Tag name"
                style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
                className="flex-1 px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0" style={{ padding: '2px' }} />
              <button onClick={create} style={{ backgroundColor: '#3b82f6' }}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90">Create</button>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Existing Tags ({tags.length})</p>
            {tags.length === 0 && <p className="text-slate-500 text-sm">No tags yet</p>}
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#2d4160' }}>
                {editing?.id === tag.id ? (
                  <div className="flex gap-2 items-center flex-1">
                    <input type="text" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                      style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
                      className="flex-1 px-2 py-1 rounded text-white text-sm" />
                    <input type="color" value={editing.color} onChange={e => setEditing({ ...editing, color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer" style={{ padding: '2px' }} />
                    <button onClick={() => { onTagUpdate(editing.id, editing.name, editing.color); setEditing(null); }}
                      style={{ backgroundColor: '#22c55e' }} className="px-2 py-1 text-white rounded text-sm">Save</button>
                    <button onClick={() => setEditing(null)} style={{ backgroundColor: '#374151' }}
                      className="px-2 py-1 text-white rounded text-sm">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span style={{ backgroundColor: tag.color }} className="px-3 py-1 text-white rounded-full text-sm font-medium">{tag.name}</span>
                    <div className="flex gap-3">
                      <button onClick={() => setEditing(tag)} className="text-blue-400 text-sm hover:text-blue-300">Edit</button>
                      <button onClick={() => onTagDelete(tag.id)} className="text-red-400 text-sm hover:text-red-300">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t" style={{ borderColor: '#2d4160' }}>
          <button onClick={onClose} style={{ backgroundColor: '#374151' }}
            className="w-full py-2 text-white rounded-lg hover:opacity-90">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── SaveAsTemplateModal ────────────────────────────────────────────────────

function SaveAsTemplateModal({ title, priority, isRecurring, recurrencePattern, reminderMinutes, onSave, onClose }: {
  title: string;
  priority: Priority;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  reminderMinutes?: number;
  onSave: (data: Omit<Template, 'id' | 'user_id'>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        title_template: title,
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        priority,
        is_recurring: isRecurring ? 1 : 0,
        recurrence_pattern: isRecurring ? recurrencePattern : undefined,
        reminder_minutes: reminderMinutes,
      });
      window.alert('Template saved successfully!');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160', borderRadius: '12px', width: '100%', maxWidth: '400px', padding: '28px' }}>
        <h2 className="text-xl font-bold text-white mb-5">Save as Template</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Template Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Weekly Meeting"
              style={{ backgroundColor: '#243447', border: '1px solid #2d4160' }}
              className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the template"
              rows={3}
              style={{ backgroundColor: '#243447', border: '1px solid #2d4160', resize: 'vertical' }}
              className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Category (optional)</label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g., Work, Personal, Health"
              style={{ backgroundColor: '#243447', border: '1px solid #2d4160' }}
              className="w-full px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          {/* Summary */}
          <div style={{ backgroundColor: '#243447', border: '1px solid #2d4160', borderRadius: '8px' }} className="p-3 text-sm">
            <p className="text-slate-400 mb-2">Template will save:</p>
            <ul className="space-y-1 text-slate-300 list-disc list-inside">
              <li>Title: {title}</li>
              <li>Priority: {priority}</li>
              {isRecurring && <li>Recurrence: {recurrencePattern}</li>}
              {reminderMinutes && <li>Reminder: {REMINDER_LABELS[reminderMinutes] ?? `${reminderMinutes}m`}</li>}
            </ul>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            style={{ backgroundColor: '#059669' }}
            className="flex-1 py-2 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Template'}
          </button>
          <button
            onClick={onClose}
            style={{ backgroundColor: '#374151', border: '1px solid #4b5563' }}
            className="px-5 py-2 text-white rounded-lg hover:opacity-90">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TemplateManagerModal ─────────────────────────────────────────────────────

function TemplateManagerModal({ templates, onUseTemplate, onCreateTemplate, onDeleteTemplate, onClose }: {
  templates: Template[];
  onUseTemplate: (template: Template) => Promise<void>;
  onCreateTemplate: (data: Omit<Template, 'id' | 'user_id'>) => Promise<void>;
  onDeleteTemplate: (id: number) => Promise<void>;
  onClose: () => void;
}) {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [name, setName] = useState('');
  const [titleTemplate, setTitleTemplate] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('weekly');
  const [reminderMinutes, setReminderMinutes] = useState<number | undefined>();
  const [subtasksText, setSubtasksText] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !titleTemplate.trim()) return;
    const subtasks = subtasksText.split('\n').filter(s => s.trim()).map((s, i) => ({ title: s.trim(), position: i }));
    await onCreateTemplate({
      name: name.trim(), title_template: titleTemplate.trim(),
      category: category.trim() || undefined, description: description.trim() || undefined,
      priority, is_recurring: isRecurring ? 1 : 0,
      recurrence_pattern: isRecurring ? recurrencePattern : undefined,
      reminder_minutes: reminderMinutes,
      subtasks_json: subtasks.length > 0 ? JSON.stringify(subtasks) : undefined,
    });
    setView('list'); setName(''); setTitleTemplate(''); setCategory('');
    setDescription(''); setSubtasksText(''); setIsRecurring(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div style={{ backgroundColor: '#243447', border: '1px solid #2d4160' }}
        className="rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: '#2d4160' }}>
          <h2 className="text-xl font-bold text-white">📋 Templates</h2>
          <div className="flex gap-2">
            {(['list', 'create'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ backgroundColor: view === v ? '#3b82f6' : '#374151' }}
                className="px-3 py-1 text-white rounded text-sm capitalize hover:opacity-90">{v}</button>
            ))}
          </div>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          {view === 'list' ? (
            <div>
              {templates.length === 0 && <p className="text-slate-400 text-sm">No templates yet. Create one to reuse todo patterns.</p>}
              {templates.map(t => (
                <div key={t.id} style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }} className="rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{t.name}</p>
                      {t.category && <p className="text-xs text-slate-400">{t.category}</p>}
                      <p className="text-slate-300 text-sm mt-1 truncate">"{t.title_template}"</p>
                      {t.description && <p className="text-slate-500 text-xs mt-1">{t.description}</p>}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span style={{ backgroundColor: t.priority === 'high' ? '#7f1d1d' : t.priority === 'low' ? '#1e3a5f' : '#713f12' }}
                          className="text-xs px-2 py-0.5 rounded text-white capitalize">{t.priority}</span>
                        {t.is_recurring ? <span style={{ backgroundColor: '#4c1d95' }} className="text-xs px-2 py-0.5 rounded text-white">🔄 {t.recurrence_pattern}</span> : null}
                        {t.reminder_minutes ? <span style={{ backgroundColor: '#78350f' }} className="text-xs px-2 py-0.5 rounded text-white">🔔 {REMINDER_LABELS[t.reminder_minutes]}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => onUseTemplate(t)} style={{ backgroundColor: '#3b82f6' }}
                        className="px-3 py-1 text-white rounded text-sm hover:opacity-90 whitespace-nowrap">Use</button>
                      <button onClick={() => onDeleteTemplate(t.id)}
                        style={{ border: '1px solid #7f1d1d', color: '#f87171' }}
                        className="px-3 py-1 rounded text-sm hover:bg-red-900/20">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: 'Template Name *', val: name, set: setName, ph: 'e.g., Weekly Report' },
                { label: 'Todo Title *', val: titleTemplate, set: setTitleTemplate, ph: 'e.g., Weekly meeting notes' },
                { label: 'Category', val: category, set: setCategory, ph: 'e.g., Work' },
                { label: 'Description', val: description, set: setDescription, ph: 'Optional description' },
              ].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <label className="text-slate-400 text-sm">{label}</label>
                  <input type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              ))}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-slate-400 text-sm">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
                    style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-white text-sm">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-slate-400 text-sm">Reminder</label>
                  <select value={reminderMinutes ?? ''} onChange={e => setReminderMinutes(e.target.value ? Number(e.target.value) : undefined)}
                    style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
                    className="w-full mt-1 px-3 py-2 rounded-lg text-white text-sm">
                    <option value="">None</option>
                    {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="tplRecurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                <label htmlFor="tplRecurring" className="text-slate-300 text-sm">Recurring</label>
                {isRecurring && (
                  <select value={recurrencePattern} onChange={e => setRecurrencePattern(e.target.value as RecurrencePattern)}
                    style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
                    className="px-3 py-1 rounded text-white text-sm">
                    <option value="daily">Daily</option><option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
                  </select>
                )}
              </div>
              <div>
                <label className="text-slate-400 text-sm">Subtasks (one per line)</label>
                <textarea value={subtasksText} onChange={e => setSubtasksText(e.target.value)}
                  placeholder={"First subtask\nSecond subtask\nThird subtask"}
                  style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-white text-sm h-24 resize-none focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex gap-3" style={{ borderColor: '#2d4160' }}>
          {view === 'create' && (
            <button onClick={handleCreate} style={{ backgroundColor: '#3b82f6' }}
              className="flex-1 py-2 text-white rounded-lg font-medium hover:opacity-90">Create Template</button>
          )}
          <button onClick={onClose} style={{ backgroundColor: '#374151' }}
            className="flex-1 py-2 text-white rounded-lg hover:opacity-90">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── DataModal ────────────────────────────────────────────────────────────────

function DataModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setMessage('');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/todos/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      const result = await res.json();
      setMessage(result.message || 'Import completed');
      onImported();
    } catch {
      setMessage('Import failed: Invalid file format');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div style={{ backgroundColor: '#243447', border: '1px solid #2d4160' }}
        className="rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b" style={{ borderColor: '#2d4160' }}>
          <h2 className="text-xl font-bold text-white">� Import Todos</h2>
        </div>
        <div className="p-5">
          <label style={{ backgroundColor: '#1e2d3d', border: '2px dashed #2d4160', cursor: 'pointer' }}
            className="flex flex-col items-center justify-center w-full py-8 rounded-lg text-slate-400 text-sm hover:border-blue-500 transition-colors">
            <span className="text-3xl mb-2">📁</span>
            <span>{importing ? 'Importing...' : 'Click to select JSON file'}</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
          </label>
          {message && (
            <p className={`text-sm mt-2 ${message.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>
          )}
        </div>
        <div className="p-4 border-t" style={{ borderColor: '#2d4160' }}>
          <button onClick={onClose} style={{ backgroundColor: '#374151' }}
            className="w-full py-2 text-white rounded-lg hover:opacity-90">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── EditTodoModal ────────────────────────────────────────────────────────────

function EditTodoModal({ todo, tags, onSave, onClose }: {
  todo: Todo;
  tags: Tag[];
  onSave: (id: number, data: Partial<Todo>, tagIds: number[]) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [dueDate, setDueDate] = useState(todo.due_date ? toSGDatetimeLocal(todo.due_date) : '');
  const [isRecurring, setIsRecurring] = useState(!!todo.is_recurring);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>(todo.recurrence_pattern || 'weekly');
  const [reminderMinutes, setReminderMinutes] = useState<number | undefined>(todo.reminder_minutes);
  const [selectedTags, setSelectedTags] = useState<number[]>(todo.tags?.map(t => t.id) || []);

  const toggleTag = (id: number) => setSelectedTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const save = async () => {
    if (!title.trim()) return;
    await onSave(todo.id, {
      title: title.trim(), priority,
      due_date: dueDate ? fromSGDatetimeLocal(dueDate) : undefined,
      is_recurring: isRecurring ? 1 : 0,
      recurrence_pattern: isRecurring ? recurrencePattern : undefined,
      reminder_minutes: reminderMinutes,
      tags: selectedTags.map(id => ({ id } as Tag)),
    }, selectedTags);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div style={{ backgroundColor: '#243447', border: '1px solid #2d4160' }}
        className="rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-5 border-b" style={{ borderColor: '#2d4160' }}>
          <h2 className="text-xl font-bold text-white">Edit Todo</h2>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="text-slate-400 text-sm">Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
              className="w-full mt-1 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-slate-400 text-sm">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
                style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
                className="w-full mt-1 px-3 py-2 rounded-lg text-white">
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-slate-400 text-sm">Due Date</label>
              <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
                min={minDatetimeLocal()}
                style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160', colorScheme: 'dark' }}
                className="w-full mt-1 px-3 py-2 rounded-lg text-white" />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="editRec" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-4 h-4 accent-blue-500" />
              <label htmlFor="editRec" className="text-slate-300 text-sm">Recurring</label>
            </div>
            {isRecurring && (
              <select value={recurrencePattern} onChange={e => setRecurrencePattern(e.target.value as RecurrencePattern)}
                style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
                className="px-3 py-1.5 rounded text-white text-sm">
                <option value="daily">Daily</option><option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
              </select>
            )}
          </div>
          <div>
            <label className="text-slate-400 text-sm">Reminder</label>
            <select value={reminderMinutes ?? ''} onChange={e => setReminderMinutes(e.target.value ? Number(e.target.value) : undefined)}
              disabled={!dueDate}
              style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
              className="w-full mt-1 px-3 py-2 rounded-lg text-white disabled:opacity-50">
              <option value="">None</option>
              {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {tags.length > 0 && (
            <div>
              <label className="text-slate-400 text-sm">Tags</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(tag => (
                  <button key={tag.id} onClick={() => toggleTag(tag.id)}
                    style={{
                      backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent',
                      borderColor: tag.color, color: selectedTags.includes(tag.id) ? 'white' : tag.color,
                    }}
                    className="px-3 py-1 rounded-full text-sm border transition-colors">
                    {selectedTags.includes(tag.id) ? '✓ ' : ''}{tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex gap-3" style={{ borderColor: '#2d4160' }}>
          <button onClick={save} style={{ backgroundColor: '#3b82f6' }}
            className="flex-1 py-2 text-white rounded-lg font-medium hover:opacity-90">Save Changes</button>
          <button onClick={onClose} style={{ backgroundColor: '#374151' }}
            className="flex-1 py-2 text-white rounded-lg hover:opacity-90">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── TodoItem ─────────────────────────────────────────────────────────────────

function TodoItem({ todo, expandedTodos, onToggleExpand, onToggleComplete, onDelete, onEdit, onSubtaskAdd, onSubtaskUpdate, onSubtaskDelete }: {
  todo: Todo;
  expandedTodos: Set<number>;
  onToggleExpand: (id: number) => void;
  onToggleComplete: (id: number, completed: number) => void;
  onDelete: (id: number) => void;
  onEdit: (todo: Todo) => void;
  onSubtaskAdd: (todoId: number, title: string) => Promise<void>;
  onSubtaskUpdate: (subtaskId: number, data: Partial<Subtask>) => Promise<void>;
  onSubtaskDelete: (todoId: number, subtaskId: number) => Promise<void>;
}) {
  const completedSubs = todo.subtasks?.filter(st => st.completed).length || 0;
  const totalSubs = todo.subtasks?.length || 0;
  const expanded = expandedTodos.has(todo.id);
  const overdue = isOverdue(todo);

  const priorityStyle = {
    high: { bg: '#7f1d1d', text: '#fca5a5', border: '#991b1b' },
    medium: { bg: '#92400e', text: '#fde68a', border: '#b45309' },
    low: { bg: '#1e40af', text: '#93c5fd', border: '#1d4ed8' },
  }[todo.priority];

  const dueDateInfo = todo.due_date && !todo.completed ? formatDueDate(todo.due_date) : null;

  const PriorityBadge = () => (
    <span style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.text, border: `1px solid ${priorityStyle.border}` }}
      className="text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0">
      {todo.priority}
    </span>
  );

  return (
    <div style={{
      backgroundColor: todo.completed ? '#1a2d1a' : '#1e2d3d',
      border: `1px solid ${overdue && !todo.completed ? '#991b1b' : todo.completed ? '#1e3a1e' : '#2d4160'}`,
    }} className="rounded-lg p-3 mb-2 transition-all">

      {todo.completed ? (
        /* ── Completed layout: checkbox + title + badges inline ── */
        <>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked
              onChange={() => onToggleComplete(todo.id, todo.completed)}
              className="w-5 h-5 cursor-pointer flex-shrink-0 accent-blue-500" />
            <span className="flex-1 font-medium line-through text-slate-500 break-words min-w-0">{todo.title}</span>
            <PriorityBadge />
            <span className="text-slate-500 text-xs flex-shrink-0">{totalSubs}</span>
            <div className="flex items-center gap-1 flex-shrink-0 ml-1">
              <button onClick={() => onToggleExpand(todo.id)}
                style={{ color: '#94a3b8' }} className="text-xs px-2 py-1 rounded hover:text-white whitespace-nowrap">
                ▶ Subtasks
              </button>
              <button onClick={() => onDelete(todo.id)} style={{ color: '#f87171' }}
                className="text-xs px-2 py-1 rounded hover:text-red-300">Delete</button>
            </div>
          </div>
          {todo.due_date && (
            <p className="text-xs mt-1 pl-7 text-slate-500">
              {new Date(todo.due_date).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </>
      ) : (
        /* ── Pending layout: title on top, checkbox + badges below ── */
        <>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`font-medium break-words ${overdue ? 'text-red-300' : 'text-white'}`}>{todo.title}</span>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <button onClick={() => onToggleExpand(todo.id)}
                style={{ color: '#94a3b8' }} className="text-xs px-1.5 py-1 rounded hover:text-white">▶</button>
              <button onClick={() => onEdit(todo)} style={{ color: '#60a5fa' }}
                className="text-xs px-1.5 py-1 rounded hover:text-blue-300">Edit</button>
              <button onClick={() => onDelete(todo.id)} style={{ color: '#f87171' }}
                className="text-xs px-1.5 py-1 rounded hover:text-red-300">Del</button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="checkbox" checked={false}
              onChange={() => onToggleComplete(todo.id, todo.completed)}
              className="w-5 h-5 cursor-pointer flex-shrink-0 accent-blue-500" />
            <PriorityBadge />
            <span className="text-slate-400 text-xs">{totalSubs}</span>
            {!!todo.is_recurring && todo.recurrence_pattern && (
              <span style={{ backgroundColor: '#4c1d9533', color: '#c4b5fd', border: '1px solid #6d28d9' }}
                className="text-xs px-2 py-0.5 rounded-full flex-shrink-0">🔄 {todo.recurrence_pattern}</span>
            )}
            {todo.reminder_minutes && (
              <span style={{ backgroundColor: '#78350f33', color: '#fde68a', border: '1px solid #92400e' }}
                className="text-xs px-2 py-0.5 rounded-full flex-shrink-0">🔔 {REMINDER_LABELS[todo.reminder_minutes] ?? `${todo.reminder_minutes}m`}</span>
            )}
            {todo.tags?.map(tag => (
              <span key={tag.id} style={{ backgroundColor: tag.color + '33', color: tag.color, border: `1px solid ${tag.color}66` }}
                className="text-xs px-2 py-0.5 rounded-full flex-shrink-0">{tag.name}</span>
            ))}
            {dueDateInfo && (
              <span className={`text-xs flex-shrink-0 ${dueDateInfo.color}`}>{dueDateInfo.text}</span>
            )}
          </div>
          {totalSubs > 0 && completedSubs > 0 && (
            <div className="flex items-center gap-2 mt-1.5 pl-7">
              <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: '#2d4160' }}>
                <div className="h-1 rounded-full" style={{ width: `${(completedSubs / totalSubs) * 100}%`, backgroundColor: '#3b82f6' }} />
              </div>
              <span className="text-xs text-slate-500">{completedSubs}/{totalSubs}</span>
            </div>
          )}
        </>
      )}

      {expanded && (
        <SubtaskList todo={todo} onSubtaskAdd={onSubtaskAdd}
          onSubtaskUpdate={onSubtaskUpdate} onSubtaskDelete={onSubtaskDelete} />
      )}
    </div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();

  // Data state
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [username, setUsername] = useState('');

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTags, setNewTags] = useState<number[]>([]);
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newRecurrencePattern, setNewRecurrencePattern] = useState<RecurrencePattern>('weekly');
  const [newReminderMinutes, setNewReminderMinutes] = useState<number | undefined>();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<number | 'all'>('all');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [completionFilter, setCompletionFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');

  // UI state
  const [expandedTodos, setExpandedTodos] = useState<Set<number>>(new Set());
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showDataDropdown, setShowDataDropdown] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const [todosRes, tagsRes, templatesRes, meRes] = await Promise.all([
        fetch('/api/todos'), fetch('/api/tags'), fetch('/api/templates'), fetch('/api/auth/me'),
      ]);
      if (!todosRes.ok || !tagsRes.ok) { router.push('/login'); return; }
      const [todosData, tagsData, templatesData] = await Promise.all([
        todosRes.json(), tagsRes.json(), templatesRes.ok ? templatesRes.json() : [],
      ]);
      setTodos(todosData.map((t: Todo) => ({ ...t, subtasks: t.subtasks || [] })));
      setTags(tagsData);
      setTemplates(templatesData);
      if (meRes.ok) { const me = await meRes.json(); setUsername(me.username || ''); }
      setLoading(false);
    };
    load();
  }, [router]);

  // ── Notification polling ──────────────────────────────────────────────────
  useEffect(() => {
    if (!notificationsEnabled) return;
    const poll = async () => {
      try {
        const res = await fetch('/api/notifications/check');
        if (!res.ok) return;
        const notifications: Todo[] = await res.json();
        notifications.forEach(todo => {
          new Notification(`⏰ Reminder: ${todo.title}`, {
            body: todo.due_date ? `Due: ${new Date(todo.due_date).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}` : '',
            icon: '/favicon.ico',
          });
        });
      } catch { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 60000);
    return () => clearInterval(interval);
  }, [notificationsEnabled]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEnableNotifications = async () => {
    if (notificationsEnabled) { setNotificationsEnabled(false); return; }
    if (!('Notification' in window)) { alert('Browser does not support notifications'); return; }
    const perm = await Notification.requestPermission();
    setNotificationsEnabled(perm === 'granted');
  };

  const handleAddTodo = async () => {
    if (!newTitle.trim()) return;
    const res = await fetch('/api/todos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(), priority: newPriority,
        due_date: newDueDate ? fromSGDatetimeLocal(newDueDate) : null,
        tags: newTags,
        is_recurring: newIsRecurring ? 1 : 0,
        recurrence_pattern: newIsRecurring ? newRecurrencePattern : null,
        reminder_minutes: newReminderMinutes ?? null,
      }),
    });
    if (res.ok) {
      const todo = await res.json();
      setTodos(prev => [...prev, { ...todo, subtasks: todo.subtasks || [] }]);
      setNewTitle(''); setNewDueDate(''); setNewTags([]); setNewReminderMinutes(undefined);
      setNewIsRecurring(false); setShowAdvanced(false);
    }
  };

  const handleToggleComplete = async (id: number, completed: number) => {
    const res = await fetch(`/api/todos/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: completed ? 0 : 1 }),
    });
    if (res.ok) {
      const updated = await res.json();
      // May create a new recurring todo - reload all
      if (updated) {
        const todosRes = await fetch('/api/todos');
        if (todosRes.ok) {
          const data = await todosRes.json();
          setTodos(data.map((t: Todo) => ({ ...t, subtasks: t.subtasks || [] })));
        }
      }
    }
  };

  const handleDeleteTodo = async (id: number) => {
    const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      setTodos(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleSaveTodo = async (id: number, data: Partial<Todo>, tagIds: number[]) => {
    const res = await fetch(`/api/todos/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, tags: tagIds.map(tid => ({ id: tid })) }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTodos(prev => prev.map(t => t.id === id ? { ...updated, subtasks: updated.subtasks || [] } : t));
    }
  };

  const handleSubtaskAdd = async (todoId: number, title: string): Promise<void> => {
    const res = await fetch(`/api/todos/${todoId}/subtasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const sub = await res.json();
      setTodos(prev => prev.map(t => t.id === todoId ? { ...t, subtasks: [...(t.subtasks || []), sub] } : t));
    }
  };

  const handleSubtaskUpdate = async (subtaskId: number, data: Partial<Subtask>): Promise<void> => {
    const res = await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setTodos(prev => prev.map(t => ({ ...t, subtasks: t.subtasks?.map(st => st.id === subtaskId ? updated : st) })));
    }
  };

  const handleSubtaskDelete = async (todoId: number, subtaskId: number): Promise<void> => {
    const res = await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      setTodos(prev => prev.map(t => t.id === todoId ? { ...t, subtasks: t.subtasks?.filter(st => st.id !== subtaskId) } : t));
    }
  };

  const handleTagCreate = async (name: string, color: string): Promise<void> => {
    const res = await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) });
    if (res.ok) { const tag = await res.json(); setTags(prev => [...prev, tag]); }
  };

  const handleTagUpdate = async (id: number, name: string, color: string): Promise<void> => {
    const res = await fetch(`/api/tags/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) });
    if (res.ok) { const tag = await res.json(); setTags(prev => prev.map(t => t.id === id ? tag : t)); }
  };

  const handleTagDelete = async (id: number): Promise<void> => {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      setTags(prev => prev.filter(t => t.id !== id));
      setTodos(prev => prev.map(t => ({ ...t, tags: t.tags?.filter(tag => tag.id !== id) })));
    }
  };

  const handleCreateTemplate = async (data: Omit<Template, 'id' | 'user_id'>): Promise<void> => {
    const res = await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) { const t = await res.json(); setTemplates(prev => [...prev, t]); }
  };

  const handleDeleteTemplate = async (id: number): Promise<void> => {
    const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) { setTemplates(prev => prev.filter(t => t.id !== id)); }
  };

  const handleApplyTemplate = (templateId: string) => {
    if (!templateId) return;
    const template = templates.find(t => t.id === Number(templateId));
    if (!template) return;
    setNewTitle(template.title_template);
    setNewPriority(template.priority || 'medium');
    setNewIsRecurring(!!template.is_recurring);
    if (template.recurrence_pattern) setNewRecurrencePattern(template.recurrence_pattern);
    setNewReminderMinutes(template.reminder_minutes ?? undefined);
  };

  const handleSaveAsTemplate = () => {
    setShowSaveTemplateModal(true);
  };

  const handleUseTemplate = async (template: Template): Promise<void> => {
    const res = await fetch(`/api/templates/${template.id}/use`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ due_date: null, tags: [] }),
    });
    if (res.ok) {
      const newTodo = await res.json();
      setTodos(prev => [...prev, { ...newTodo, subtasks: newTodo.subtasks || [] }]);
    }
    setShowTemplateManager(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const toggleExpanded = useCallback((id: number) => {
    setExpandedTodos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleNewTag = (id: number) => setNewTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Filtered & sectioned todos ────────────────────────────────────────────
  const { overdueTodos, activeTodos, completedTodos } = useMemo(() => {
    const filtered = todos.filter(todo => {
      if (completionFilter === 'pending' && todo.completed) return false;
      if (completionFilter === 'completed' && !todo.completed) return false;
      if (dueDateFrom && todo.due_date && new Date(todo.due_date) < new Date(dueDateFrom)) return false;
      if (dueDateTo && todo.due_date && new Date(todo.due_date) > new Date(dueDateTo + 'T23:59:59+08:00')) return false;
      const matchSearch = !searchText || todo.title.toLowerCase().includes(searchText.toLowerCase()) ||
        todo.subtasks?.some(st => st.title.toLowerCase().includes(searchText.toLowerCase())) ||
        todo.tags?.some(tag => tag.name.toLowerCase().includes(searchText.toLowerCase()));
      const matchPriority = priorityFilter === 'all' || todo.priority === priorityFilter;
      const matchTag = tagFilter === 'all' || todo.tags?.some(t => t.id === tagFilter);
      return matchSearch && matchPriority && matchTag;
    });
    return {
      overdueTodos: filtered.filter(t => isOverdue(t)),
      activeTodos: filtered.filter(t => !t.completed && !isOverdue(t)),
      completedTodos: filtered.filter(t => !!t.completed),
    };
  }, [todos, searchText, priorityFilter, tagFilter, completionFilter, dueDateFrom, dueDateTo]);

  const todoItemProps = { expandedTodos, onToggleExpand: toggleExpanded, onToggleComplete: handleToggleComplete, onDelete: handleDeleteTodo, onEdit: setEditingTodo, onSubtaskAdd: handleSubtaskAdd, onSubtaskUpdate: handleSubtaskUpdate, onSubtaskDelete: handleSubtaskDelete };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a2332' }}>
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a2332' }}>
      {/* Modals */}
      {showTagManager && <TagManagerModal tags={tags} onTagCreate={handleTagCreate} onTagUpdate={handleTagUpdate} onTagDelete={handleTagDelete} onClose={() => setShowTagManager(false)} />}
      {showTemplateManager && <TemplateManagerModal templates={templates} onUseTemplate={handleUseTemplate} onCreateTemplate={handleCreateTemplate} onDeleteTemplate={handleDeleteTemplate} onClose={() => setShowTemplateManager(false)} />}
      {showSaveTemplateModal && (
        <SaveAsTemplateModal
          title={newTitle}
          priority={newPriority}
          isRecurring={newIsRecurring}
          recurrencePattern={newRecurrencePattern}
          reminderMinutes={newReminderMinutes}
          onSave={handleCreateTemplate}
          onClose={() => setShowSaveTemplateModal(false)}
        />
      )}
      {showDataModal && <DataModal onClose={() => setShowDataModal(false)} onImported={async () => { const r = await fetch('/api/todos'); if (r.ok) { const d = await r.json(); setTodos(d.map((t: Todo) => ({ ...t, subtasks: t.subtasks || [] }))); } }} />}
      {editingTodo && <EditTodoModal todo={editingTodo} tags={tags} onSave={handleSaveTodo} onClose={() => setEditingTodo(null)} />}

      {/* Header */}
      <header className="sticky top-0 z-10 shadow-lg" style={{ backgroundColor: '#1a2332', borderBottom: '1px solid #2d4160' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">Todo App</h1>
            {username && <p className="text-xs" style={{ color: '#60a5fa' }}>Welcome, {username}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="relative">
              <button onClick={() => setShowDataDropdown(prev => !prev)}
                style={{ backgroundColor: '#374151', border: '1px solid #4b5563' }}
                className="px-3 py-1.5 text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1">
                <span>⊞</span> Data
              </button>
              {showDataDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDataDropdown(false)} />
                  <div style={{ backgroundColor: '#243447', border: '1px solid #2d4160', zIndex: 50 }}
                    className="absolute right-0 mt-1 rounded-lg shadow-xl min-w-[140px] overflow-hidden">
                    <a href="/api/todos/export?format=json"
                      onClick={() => setShowDataDropdown(false)}
                      style={{ color: '#e2e8f0' }}
                      className="block px-4 py-2.5 text-sm hover:bg-white/10 cursor-pointer">
                      Export JSON
                    </a>
                    <a href="/api/todos/export?format=csv"
                      onClick={() => setShowDataDropdown(false)}
                      style={{ color: '#e2e8f0' }}
                      className="block px-4 py-2.5 text-sm hover:bg-white/10 cursor-pointer">
                      Export CSV
                    </a>
                    <button
                      onClick={() => { setShowDataDropdown(false); setShowDataModal(true); }}
                      style={{ color: '#e2e8f0' }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10">
                      Import JSON
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => router.push('/calendar')}
              style={{ backgroundColor: '#a855f7' }}
              className="px-3 py-1.5 text-white rounded-lg text-sm font-medium hover:opacity-90">
              Calendar
            </button>
            <button onClick={() => setShowTemplateManager(true)}
              style={{ backgroundColor: '#6366f1' }}
              className="px-3 py-1.5 text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1">
              <span>📋</span> Templates
            </button>
            <button onClick={handleEnableNotifications}
              title={notificationsEnabled ? 'Notifications On (click to disable)' : 'Enable Notifications'}
              style={{ backgroundColor: notificationsEnabled ? '#f59e0b' : '#374151', border: '1px solid #4b5563' }}
              className="px-3 py-1.5 text-white rounded-lg text-sm font-medium hover:opacity-90">
              🔔
            </button>
            <button onClick={handleLogout}
              style={{ backgroundColor: '#374151', border: '1px solid #4b5563' }}
              className="px-3 py-1.5 text-white rounded-lg text-sm font-medium hover:opacity-90">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* ── Add Todo Form ────────────────────────────────────────────────── */}
        <div style={{ backgroundColor: '#243447', border: '1px solid #2d4160' }} className="rounded-xl p-5">
          {/* Title row */}
          <div className="mb-3">
            <input type="text" placeholder="Add a new todo..." value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !showAdvanced && handleAddTodo()}
              style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
              className="w-full px-4 py-3 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-base" />
          </div>
          {/* Controls row */}
          <div className="flex gap-2">
            <select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)}
              style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
              className="px-3 py-2 rounded-lg text-white text-sm min-w-0">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input type="datetime-local" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
              min={minDatetimeLocal()}
              style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160', colorScheme: 'dark' }}
              className="flex-1 px-3 py-2 rounded-lg text-white text-sm min-w-0" />
            <button onClick={handleAddTodo}
              style={{ backgroundColor: '#3b82f6' }}
              className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90 whitespace-nowrap">
              Add
            </button>
          </div>
          {/* Advanced options toggle */}
          <button onClick={() => setShowAdvanced(prev => !prev)}
            style={{ color: '#3b82f6' }}
            className="mt-3 text-sm flex items-center gap-1 hover:opacity-80">
            <span>{showAdvanced ? '▼' : '▶'}</span>
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
          </button>
          {/* Advanced options panel */}
          {showAdvanced && (
            <div style={{ borderTop: '1px solid #2d4160' }} className="mt-3 pt-3 space-y-3">
              {/* Recurring + Reminder */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="newRecurring" checked={newIsRecurring}
                    onChange={e => setNewIsRecurring(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                  <label htmlFor="newRecurring" className="text-slate-300 text-sm">Repeat</label>
                </div>
                {newIsRecurring && (
                  <select value={newRecurrencePattern} onChange={e => setNewRecurrencePattern(e.target.value as RecurrencePattern)}
                    style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
                    className="px-3 py-1.5 rounded text-white text-sm">
                    <option value="daily">Daily</option><option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
                  </select>
                )}
                <div className="flex-1" />
                <span className="text-slate-300 text-sm">Reminder:</span>
                <select value={newReminderMinutes ?? ''} onChange={e => setNewReminderMinutes(e.target.value ? Number(e.target.value) : undefined)}
                  disabled={!newDueDate}
                  style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
                  className="px-3 py-1.5 rounded text-white text-sm disabled:opacity-50">
                  <option value="">None</option>
                  {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {/* Use Template + Save as Template */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-slate-300 text-sm">Use Template:</span>
                <select
                  defaultValue=""
                  onChange={e => { handleApplyTemplate(e.target.value); e.target.value = ''; }}
                  style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
                  className="px-3 py-1.5 rounded text-white text-sm">
                  <option value="" disabled>Select a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {newTitle.trim() && (
                  <button onClick={handleSaveAsTemplate}
                    style={{ backgroundColor: '#059669' }}
                    className="px-3 py-1.5 text-white rounded text-sm font-medium hover:opacity-90 flex items-center gap-1 whitespace-nowrap">
                    💾 Save as Template
                  </button>
                )}
              </div>
              {/* Tags */}
              {tags.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <button key={tag.id} onClick={() => toggleNewTag(tag.id)}
                        style={{
                          backgroundColor: newTags.includes(tag.id) ? tag.color : 'transparent',
                          borderColor: tag.color, color: newTags.includes(tag.id) ? 'white' : tag.color,
                        }}
                        className="px-3 py-1 rounded-full text-sm border transition-colors">
                        {newTags.includes(tag.id) ? '✓ ' : ''}{tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <button onClick={() => setShowTagManager(true)} style={{ color: '#60a5fa' }} className="text-sm hover:opacity-80">+ Manage Tags</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Search ──────────────────────────────────────────────────────────── */}
        <div style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }} className="rounded-lg flex items-center px-4 gap-2">
          <span className="text-slate-500 text-lg">🔍</span>
          <input type="text" placeholder="Search todos and subtasks..." value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ backgroundColor: 'transparent' }}
            className="w-full py-3 text-white placeholder-slate-500 focus:outline-none text-sm" />
          {searchText && (
            <button onClick={() => setSearchText('')} className="text-slate-500 hover:text-white text-lg">✕</button>
          )}
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap items-center">
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as Priority | 'all')}
            style={{ backgroundColor: '#243447', border: '1px solid #2d4160' }}
            className="px-3 py-2 rounded-lg text-white text-sm">
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button onClick={() => setShowAdvancedFilter(prev => !prev)}
            style={{ backgroundColor: showAdvancedFilter ? '#3b82f6' : '#374151', border: '1px solid #4b5563' }}
            className="px-3 py-2 text-white rounded-lg text-sm hover:opacity-90 flex items-center gap-1">
            <span>{showAdvancedFilter ? '▼' : '▶'}</span> Advanced
          </button>
        </div>
        {showAdvancedFilter && (
          <div style={{ backgroundColor: '#243447', border: '1px solid #2d4160' }} className="rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4">Advanced Filters</h3>
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">Completion Status</label>
              <select value={completionFilter} onChange={e => setCompletionFilter(e.target.value as 'all' | 'pending' | 'completed')}
                style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
                className="w-full px-3 py-2 rounded-lg text-white text-sm">
                <option value="all">All Todos</option>
                <option value="pending">Pending Only</option>
                <option value="completed">Completed Only</option>
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-slate-400 mb-1">Due Date From</label>
                <input type="date" value={dueDateFrom} onChange={e => setDueDateFrom(e.target.value)}
                  style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160', colorScheme: 'dark' }}
                  className="w-full px-3 py-2 rounded-lg text-white text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-slate-400 mb-1">Due Date To</label>
                <input type="date" value={dueDateTo} onChange={e => setDueDateTo(e.target.value)}
                  style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160', colorScheme: 'dark' }}
                  className="w-full px-3 py-2 rounded-lg text-white text-sm" />
              </div>
            </div>
          </div>
        )}

        {/* ── Overdue Section ─────────────────────────────────────────────────── */}
        {overdueTodos.length > 0 && (
          <div>
            <div style={{ backgroundColor: '#7f1d1d33', border: '1px solid #991b1b' }} className="rounded-lg px-4 py-2 mb-2 flex items-center gap-2">
              <span className="text-red-400">⚠️</span>
              <h2 className="text-red-400 font-semibold text-sm">Overdue ({overdueTodos.length})</h2>
            </div>
            {overdueTodos.map(todo => <TodoItem key={todo.id} todo={todo} {...todoItemProps} />)}
          </div>
        )}

        {/* ── Active / Pending Section ─────────────────────────────────────────── */}
        {activeTodos.length > 0 && (
          <div>
            <div className="mb-2">
              <h2 style={{ color: '#60a5fa' }} className="font-bold text-base">Pending ({activeTodos.length})</h2>
            </div>
            {activeTodos.map(todo => <TodoItem key={todo.id} todo={todo} {...todoItemProps} />)}
          </div>
        )}

        {/* ── Empty State ─────────────────────────────────────────────────────── */}
        {overdueTodos.length === 0 && activeTodos.length === 0 && completedTodos.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-slate-500 text-base">No todos yet. Add one above!</p>
          </div>
        )}

        {/* ── Stats Bar ───────────────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid #2d4160' }} className="pt-4 mt-2 flex justify-center gap-12">
          <div className="text-center">
            <p style={{ color: '#ef4444' }} className="text-2xl font-bold">{overdueTodos.length}</p>
            <p className="text-sm text-slate-400">Overdue</p>
          </div>
          <div className="text-center">
            <p style={{ color: '#60a5fa' }} className="text-2xl font-bold">{activeTodos.length}</p>
            <p className="text-sm text-slate-400">Pending</p>
          </div>
          <div className="text-center">
            <p style={{ color: '#4ade80' }} className="text-2xl font-bold">{completedTodos.length}</p>
            <p className="text-sm text-slate-400">Completed</p>
          </div>
        </div>

        {/* ── Completed Section ───────────────────────────────────────────────── */}
        {completionFilter !== 'pending' && completedTodos.length > 0 && (
          <div>
            <div className="mb-2">
              <h2 style={{ color: '#4ade80' }} className="font-bold text-base">Completed ({completedTodos.length})</h2>
            </div>
            {completedTodos.map(todo => <TodoItem key={todo.id} todo={todo} {...todoItemProps} />)}
          </div>
        )}
      </main>
    </div>
  );
}


// (End of file)
