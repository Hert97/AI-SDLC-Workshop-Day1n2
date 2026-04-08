import path from 'node:path';
import Database from 'better-sqlite3';

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  title_template: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  subtasks_json: string;
}

export interface Holiday {
  id: number;
  holiday_date: string;
  name: string;
}

const dbPath = path.join(process.cwd(), 'todos.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS authenticators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_pattern TEXT,
  reminder_minutes INTEGER,
  last_notification_sent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  todo_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  UNIQUE (user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS todo_tags (
  todo_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (todo_id, tag_id),
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  title_template TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_pattern TEXT,
  reminder_minutes INTEGER,
  subtasks_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS holidays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  holiday_date TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
`);

const priorityOrder: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function mapTodo(row: Record<string, unknown>): Todo {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    title: String(row.title),
    completed: Number(row.completed) === 1,
    priority: row.priority as Priority,
    due_date: row.due_date ? String(row.due_date) : null,
    is_recurring: Number(row.is_recurring) === 1,
    recurrence_pattern: (row.recurrence_pattern as RecurrencePattern | null) ?? null,
    reminder_minutes: row.reminder_minutes === null || row.reminder_minutes === undefined ? null : Number(row.reminder_minutes),
    last_notification_sent: row.last_notification_sent ? String(row.last_notification_sent) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export const userDB = {
  findOrCreate(username: string): User {
    const cleaned = username.trim();
    const found = db.prepare('SELECT * FROM users WHERE username = ?').get(cleaned) as User | undefined;
    if (found) {
      return found;
    }
    const result = db.prepare('INSERT INTO users (username) VALUES (?)').run(cleaned);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
  },
  findById(id: number): User | null {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    return row ?? null;
  },
  findByUsername(username: string): User | null {
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim()) as User | undefined;
    return row ?? null;
  },
};

export const todoDB = {
  listByUser(userId: number): Todo[] {
    const rows = db.prepare('SELECT * FROM todos WHERE user_id = ?').all(userId) as Record<string, unknown>[];
    return rows.map(mapTodo).sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return a.id - b.id;
    });
  },
  findById(id: number, userId: number): Todo | null {
    const row = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(id, userId) as Record<string, unknown> | undefined;
    return row ? mapTodo(row) : null;
  },
  create(input: {
    user_id: number;
    title: string;
    priority?: Priority;
    due_date?: string | null;
    is_recurring?: boolean;
    recurrence_pattern?: RecurrencePattern | null;
    reminder_minutes?: number | null;
  }): Todo {
    const result = db.prepare(
      `INSERT INTO todos (user_id, title, priority, due_date, is_recurring, recurrence_pattern, reminder_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.user_id,
      input.title.trim(),
      input.priority ?? 'medium',
      input.due_date ?? null,
      input.is_recurring ? 1 : 0,
      input.recurrence_pattern ?? null,
      input.reminder_minutes ?? null
    );
    const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
    return mapTodo(row);
  },
  update(id: number, userId: number, patch: Partial<Todo>): Todo | null {
    const current = this.findById(id, userId);
    if (!current) return null;

    const next = {
      ...current,
      ...patch,
      updated_at: new Date().toISOString(),
    };

    db.prepare(
      `UPDATE todos
       SET title = ?, completed = ?, priority = ?, due_date = ?, is_recurring = ?, recurrence_pattern = ?,
           reminder_minutes = ?, last_notification_sent = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    ).run(
      next.title,
      next.completed ? 1 : 0,
      next.priority,
      next.due_date,
      next.is_recurring ? 1 : 0,
      next.recurrence_pattern,
      next.reminder_minutes,
      next.last_notification_sent,
      next.updated_at,
      id,
      userId
    );

    return this.findById(id, userId);
  },
  delete(id: number, userId: number): boolean {
    const result = db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(id, userId);
    return result.changes > 0;
  },
  markNotified(todoId: number, userId: number, sentAt: string): void {
    db.prepare('UPDATE todos SET last_notification_sent = ? WHERE id = ? AND user_id = ?').run(sentAt, todoId, userId);
  },
};

export const subtaskDB = {
  listForTodo(todoId: number): Subtask[] {
    return db.prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC, id ASC').all(todoId) as Subtask[];
  },
  create(todoId: number, title: string): Subtask {
    const pos = db.prepare('SELECT COALESCE(MAX(position), -1) as max_pos FROM subtasks WHERE todo_id = ?').get(todoId) as { max_pos: number };
    const result = db.prepare('INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)').run(todoId, title.trim(), pos.max_pos + 1);
    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid) as Subtask;
  },
  update(id: number, patch: Partial<Subtask>): Subtask | null {
    const current = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Subtask | undefined;
    if (!current) return null;
    const next = { ...current, ...patch };
    db.prepare('UPDATE subtasks SET title = ?, completed = ?, position = ? WHERE id = ?').run(next.title, next.completed ? 1 : 0, next.position, id);
    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Subtask;
  },
  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

export const tagDB = {
  listByUser(userId: number): Tag[] {
    return db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC').all(userId) as Tag[];
  },
  create(userId: number, name: string, color: string): Tag {
    const result = db.prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)').run(userId, name.trim(), color);
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid) as Tag;
  },
  update(id: number, userId: number, name: string, color: string): Tag | null {
    const result = db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ? AND user_id = ?').run(name.trim(), color, id, userId);
    if (result.changes === 0) return null;
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag;
  },
  delete(id: number, userId: number): boolean {
    const result = db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, userId);
    return result.changes > 0;
  },
  addTagToTodo(todoId: number, tagId: number): void {
    db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)').run(todoId, tagId);
  },
  removeTagFromTodo(todoId: number, tagId: number): void {
    db.prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?').run(todoId, tagId);
  },
};

export const templateDB = {
  listByUser(userId: number): Template[] {
    return db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY id DESC').all(userId) as Template[];
  },
  findById(id: number, userId: number): Template | null {
    const row = db.prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?').get(id, userId) as Template | undefined;
    return row ?? null;
  },
  create(userId: number, payload: Omit<Template, 'id' | 'user_id'>): Template {
    const result = db.prepare(
      `INSERT INTO templates (user_id, name, description, category, title_template, priority, is_recurring, recurrence_pattern, reminder_minutes, subtasks_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      payload.name,
      payload.description,
      payload.category,
      payload.title_template,
      payload.priority,
      payload.is_recurring ? 1 : 0,
      payload.recurrence_pattern,
      payload.reminder_minutes,
      payload.subtasks_json
    );
    return db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid) as Template;
  },
  update(id: number, userId: number, payload: Partial<Template>): Template | null {
    const current = this.findById(id, userId);
    if (!current) return null;
    const next = { ...current, ...payload };
    db.prepare(
      `UPDATE templates
       SET name = ?, description = ?, category = ?, title_template = ?, priority = ?, is_recurring = ?, recurrence_pattern = ?, reminder_minutes = ?, subtasks_json = ?
       WHERE id = ? AND user_id = ?`
    ).run(
      next.name,
      next.description,
      next.category,
      next.title_template,
      next.priority,
      next.is_recurring ? 1 : 0,
      next.recurrence_pattern,
      next.reminder_minutes,
      next.subtasks_json,
      id,
      userId
    );
    return this.findById(id, userId);
  },
  delete(id: number, userId: number): boolean {
    const result = db.prepare('DELETE FROM templates WHERE id = ? AND user_id = ?').run(id, userId);
    return result.changes > 0;
  },
};

export const holidayDB = {
  listByMonth(monthPrefix: string): Holiday[] {
    return db.prepare('SELECT * FROM holidays WHERE holiday_date LIKE ? ORDER BY holiday_date ASC').all(`${monthPrefix}%`) as Holiday[];
  },
  upsert(date: string, name: string): void {
    db.prepare('INSERT INTO holidays (holiday_date, name) VALUES (?, ?) ON CONFLICT(holiday_date) DO UPDATE SET name = excluded.name').run(date, name);
  },
};

export function getTagsForTodo(todoId: number): Tag[] {
  return db
    .prepare(
      `SELECT t.* FROM tags t
       INNER JOIN todo_tags tt ON tt.tag_id = t.id
       WHERE tt.todo_id = ?
       ORDER BY t.name ASC`
    )
    .all(todoId) as Tag[];
}

export function getTodosRequiringReminder(userId: number, nowIso: string): Todo[] {
  const rows = db
    .prepare(
      `SELECT * FROM todos
       WHERE user_id = ?
         AND completed = 0
         AND due_date IS NOT NULL
         AND reminder_minutes IS NOT NULL`
    )
    .all(userId) as Record<string, unknown>[];

  const now = new Date(nowIso).getTime();
  return rows
    .map(mapTodo)
    .filter((todo) => {
      if (!todo.due_date || todo.reminder_minutes === null) return false;
      const dueMs = new Date(todo.due_date).getTime();
      const reminderAt = dueMs - todo.reminder_minutes * 60_000;
      const notYetSent = !todo.last_notification_sent || new Date(todo.last_notification_sent).getTime() < reminderAt;
      return now >= reminderAt && notYetSent;
    });
}

export function getTodoTags(todoId: number): number[] {
  const rows = db.prepare('SELECT tag_id FROM todo_tags WHERE todo_id = ?').all(todoId) as Array<{ tag_id: number }>;
  return rows.map((row) => row.tag_id);
}

export function exportDataForUser(userId: number): {
  todos: Todo[];
  subtasks: Subtask[];
  tags: Tag[];
  todo_tags: Array<{ todo_id: number; tag_id: number }>;
} {
  const todos = db.prepare('SELECT * FROM todos WHERE user_id = ?').all(userId) as Record<string, unknown>[];
  const tags = db.prepare('SELECT * FROM tags WHERE user_id = ?').all(userId) as Tag[];
  const todoIds = todos.map((todo) => Number(todo.id));

  const subtasks =
    todoIds.length > 0
      ? (db
          .prepare(`SELECT * FROM subtasks WHERE todo_id IN (${todoIds.map(() => '?').join(',')})`)
          .all(...todoIds) as Subtask[])
      : [];

  const todoTags =
    todoIds.length > 0
      ? (db
          .prepare(`SELECT todo_id, tag_id FROM todo_tags WHERE todo_id IN (${todoIds.map(() => '?').join(',')})`)
          .all(...todoIds) as Array<{ todo_id: number; tag_id: number }>)
      : [];

  return {
    todos: todos.map(mapTodo),
    subtasks,
    tags,
    todo_tags: todoTags,
  };
}

export const rawDb = db;
