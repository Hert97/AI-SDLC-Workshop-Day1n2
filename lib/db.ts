import Database from 'better-sqlite3';
import path from 'path';

// ── Types ──────────────────────────────────────────────────────────────────

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;
  credential_public_key: Buffer;
  counter: number;
  transports: string | null;
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: number;
  position: number;
  created_at: string;
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: number;
  due_date: string | null;
  priority: Priority;
  is_recurring: number;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
  subtasks: Subtask[];
  tags: Tag[];
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  title_template: string;
  priority: Priority;
  is_recurring: number;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  subtasks_json: string;
  created_at: string;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

// ── Database Initialisation ───────────────────────────────────────────────

const dbPath = path.join(
  process.env.RAILWAY_VOLUME_MOUNT_PATH ?? process.cwd(),
  'todos.db',
);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS authenticators (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER NOT NULL REFERENCES users(id),
    credential_id         TEXT NOT NULL UNIQUE,
    credential_public_key BLOB NOT NULL,
    counter               INTEGER NOT NULL DEFAULT 0,
    transports            TEXT
  );

  CREATE TABLE IF NOT EXISTS todos (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                 INTEGER NOT NULL REFERENCES users(id),
    title                   TEXT NOT NULL,
    completed               INTEGER NOT NULL DEFAULT 0,
    due_date                TEXT,
    priority                TEXT NOT NULL DEFAULT 'medium'
                              CHECK(priority IN ('high','medium','low')),
    is_recurring            INTEGER NOT NULL DEFAULT 0,
    recurrence_pattern      TEXT
                              CHECK(recurrence_pattern IN ('daily','weekly','monthly','yearly')),
    reminder_minutes        INTEGER,
    last_notification_sent  TEXT,
    created_at              TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id    INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    completed  INTEGER NOT NULL DEFAULT 0,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tags (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS todo_tags (
    todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS templates (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            INTEGER NOT NULL REFERENCES users(id),
    name               TEXT NOT NULL,
    description        TEXT,
    category           TEXT,
    title_template     TEXT NOT NULL,
    priority           TEXT NOT NULL DEFAULT 'medium',
    is_recurring       INTEGER NOT NULL DEFAULT 0,
    recurrence_pattern TEXT,
    reminder_minutes   INTEGER,
    subtasks_json      TEXT NOT NULL DEFAULT '[]',
    created_at         TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_todos_user_id   ON todos(user_id);
  CREATE INDEX IF NOT EXISTS idx_todos_due_date  ON todos(due_date);
  CREATE INDEX IF NOT EXISTS idx_subtasks_todo   ON subtasks(todo_id);
  CREATE INDEX IF NOT EXISTS idx_todo_tags_todo  ON todo_tags(todo_id);
  CREATE INDEX IF NOT EXISTS idx_todo_tags_tag   ON todo_tags(tag_id);
`);

// ── Helpers ───────────────────────────────────────────────────────────────

function getSubtasksForTodo(todoId: number): Subtask[] {
  return db
    .prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position, id')
    .all(todoId) as Subtask[];
}

function getTagsForTodo(todoId: number): Tag[] {
  return db
    .prepare(
      'SELECT t.* FROM tags t JOIN todo_tags tt ON t.id = tt.tag_id WHERE tt.todo_id = ?',
    )
    .all(todoId) as Tag[];
}

function hydrateTodo(row: Record<string, unknown>): Todo {
  return {
    ...(row as Omit<Todo, 'subtasks' | 'tags'>),
    subtasks: getSubtasksForTodo(row.id as number),
    tags: getTagsForTodo(row.id as number),
  };
}

// ── User DB ───────────────────────────────────────────────────────────────

export const userDB = {
  findByUsername(username: string): User | undefined {
    return db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(username) as User | undefined;
  },

  create(username: string): User {
    const info = db
      .prepare('INSERT INTO users (username) VALUES (?)')
      .run(username);
    return this.findById(info.lastInsertRowid as number)!;
  },

  findById(id: number): User | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  },
};

// ── Authenticator DB ─────────────────────────────────────────────────────

export const authenticatorDB = {
  getForUser(userId: number): Authenticator[] {
    return db
      .prepare('SELECT * FROM authenticators WHERE user_id = ?')
      .all(userId) as Authenticator[];
  },

  getByCredentialId(credentialId: string): Authenticator | undefined {
    return db
      .prepare('SELECT * FROM authenticators WHERE credential_id = ?')
      .get(credentialId) as Authenticator | undefined;
  },

  create(data: Omit<Authenticator, 'id'>): Authenticator {
    const info = db
      .prepare(
        `INSERT INTO authenticators
          (user_id, credential_id, credential_public_key, counter, transports)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        data.user_id,
        data.credential_id,
        data.credential_public_key,
        data.counter ?? 0,
        data.transports,
      );
    return { ...data, id: info.lastInsertRowid as number };
  },

  updateCounter(id: number, counter: number): void {
    db.prepare('UPDATE authenticators SET counter = ? WHERE id = ?').run(counter, id);
  },
};

// ── Todo DB ───────────────────────────────────────────────────────────────

type CreateTodoInput = {
  user_id: number;
  title: string;
  completed?: number;
  due_date?: string | null;
  priority?: Priority;
  is_recurring?: number;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
};

type UpdateTodoInput = Partial<Omit<CreateTodoInput, 'user_id'>> & {
  last_notification_sent?: string | null;
};

export const todoDB = {
  getAll(userId: number): Todo[] {
    const rows = db
      .prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Record<string, unknown>[];
    return rows.map(hydrateTodo);
  },

  getById(id: number): Todo | undefined {
    const row = db
      .prepare('SELECT * FROM todos WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    return row ? hydrateTodo(row) : undefined;
  },

  create(data: CreateTodoInput): Todo {
    const info = db
      .prepare(
        `INSERT INTO todos
          (user_id, title, completed, due_date, priority, is_recurring,
           recurrence_pattern, reminder_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.user_id,
        data.title.trim(),
        data.completed ?? 0,
        data.due_date ?? null,
        data.priority ?? 'medium',
        data.is_recurring ?? 0,
        data.recurrence_pattern ?? null,
        data.reminder_minutes ?? null,
      );
    return this.getById(info.lastInsertRowid as number)!;
  },

  update(id: number, data: UpdateTodoInput): Todo | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined)              { fields.push('title = ?');               values.push(data.title.trim()); }
    if (data.completed !== undefined)          { fields.push('completed = ?');            values.push(data.completed); }
    if (data.due_date !== undefined)           { fields.push('due_date = ?');             values.push(data.due_date); }
    if (data.priority !== undefined)           { fields.push('priority = ?');             values.push(data.priority); }
    if (data.is_recurring !== undefined)       { fields.push('is_recurring = ?');         values.push(data.is_recurring); }
    if (data.recurrence_pattern !== undefined) { fields.push('recurrence_pattern = ?');   values.push(data.recurrence_pattern); }
    if (data.reminder_minutes !== undefined)   { fields.push('reminder_minutes = ?');     values.push(data.reminder_minutes); }
    if (data.last_notification_sent !== undefined) {
      fields.push('last_notification_sent = ?');
      values.push(data.last_notification_sent);
    }

    if (fields.length === 0) return this.getById(id);

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);
    db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  },

  delete(id: number): void {
    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  },

  getPendingNotifications(userId: number, nowIso: string): Todo[] {
    const rows = db
      .prepare(
        `SELECT * FROM todos
         WHERE user_id = ?
           AND completed = 0
           AND reminder_minutes IS NOT NULL
           AND due_date IS NOT NULL
           AND last_notification_sent IS NULL
           AND datetime(due_date, '-' || reminder_minutes || ' minutes') <= datetime(?)`,
      )
      .all(userId, nowIso) as Record<string, unknown>[];
    return rows.map(hydrateTodo);
  },

  markNotificationSent(id: number, sentAt: string): void {
    db.prepare('UPDATE todos SET last_notification_sent = ? WHERE id = ?').run(sentAt, id);
  },
};

// ── Subtask DB ────────────────────────────────────────────────────────────

export const subtaskDB = {
  create(todoId: number, title: string, position?: number): Subtask {
    const maxPos = (
      db
        .prepare('SELECT MAX(position) as m FROM subtasks WHERE todo_id = ?')
        .get(todoId) as { m: number | null }
    ).m ?? -1;

    const info = db
      .prepare(
        'INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)',
      )
      .run(todoId, title.trim(), position ?? maxPos + 1);
    return db
      .prepare('SELECT * FROM subtasks WHERE id = ?')
      .get(info.lastInsertRowid as number) as Subtask;
  },

  update(id: number, data: { title?: string; completed?: number }): Subtask | undefined {
    if (data.title !== undefined) {
      db.prepare('UPDATE subtasks SET title = ? WHERE id = ?').run(data.title.trim(), id);
    }
    if (data.completed !== undefined) {
      db.prepare('UPDATE subtasks SET completed = ? WHERE id = ?').run(data.completed, id);
    }
    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Subtask | undefined;
  },

  delete(id: number): void {
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  },

  getById(id: number): Subtask | undefined {
    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Subtask | undefined;
  },
};

// ── Tag DB ────────────────────────────────────────────────────────────────

export const tagDB = {
  getAll(userId: number): Tag[] {
    return db
      .prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name')
      .all(userId) as Tag[];
  },

  getById(id: number): Tag | undefined {
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag | undefined;
  },

  create(userId: number, name: string, color: string): Tag {
    const info = db
      .prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)')
      .run(userId, name.trim(), color);
    return this.getById(info.lastInsertRowid as number)!;
  },

  update(id: number, data: { name?: string; color?: string }): Tag | undefined {
    if (data.name !== undefined) {
      db.prepare('UPDATE tags SET name = ? WHERE id = ?').run(data.name.trim(), id);
    }
    if (data.color !== undefined) {
      db.prepare('UPDATE tags SET color = ? WHERE id = ?').run(data.color, id);
    }
    return this.getById(id);
  },

  delete(id: number): void {
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  },

  addToTodo(todoId: number, tagId: number): void {
    db
      .prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)')
      .run(todoId, tagId);
  },

  removeFromTodo(todoId: number, tagId: number): void {
    db
      .prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?')
      .run(todoId, tagId);
  },
};

// ── Template DB ───────────────────────────────────────────────────────────

type CreateTemplateInput = Omit<Template, 'id' | 'created_at'>;

export const templateDB = {
  getAll(userId: number): Template[] {
    return db
      .prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY name')
      .all(userId) as Template[];
  },

  getById(id: number): Template | undefined {
    return db
      .prepare('SELECT * FROM templates WHERE id = ?')
      .get(id) as Template | undefined;
  },

  create(data: CreateTemplateInput): Template {
    const info = db
      .prepare(
        `INSERT INTO templates
          (user_id, name, description, category, title_template, priority,
           is_recurring, recurrence_pattern, reminder_minutes, subtasks_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.user_id,
        data.name.trim(),
        data.description ?? null,
        data.category ?? null,
        data.title_template.trim(),
        data.priority ?? 'medium',
        data.is_recurring ?? 0,
        data.recurrence_pattern ?? null,
        data.reminder_minutes ?? null,
        data.subtasks_json ?? '[]',
      );
    return this.getById(info.lastInsertRowid as number)!;
  },

  update(id: number, data: Partial<CreateTemplateInput>): Template | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined)               { fields.push('name = ?');               values.push(data.name.trim()); }
    if (data.description !== undefined)        { fields.push('description = ?');         values.push(data.description); }
    if (data.category !== undefined)           { fields.push('category = ?');            values.push(data.category); }
    if (data.title_template !== undefined)     { fields.push('title_template = ?');      values.push(data.title_template.trim()); }
    if (data.priority !== undefined)           { fields.push('priority = ?');            values.push(data.priority); }
    if (data.is_recurring !== undefined)       { fields.push('is_recurring = ?');        values.push(data.is_recurring); }
    if (data.recurrence_pattern !== undefined) { fields.push('recurrence_pattern = ?'); values.push(data.recurrence_pattern); }
    if (data.reminder_minutes !== undefined)   { fields.push('reminder_minutes = ?');   values.push(data.reminder_minutes); }
    if (data.subtasks_json !== undefined)      { fields.push('subtasks_json = ?');       values.push(data.subtasks_json); }
    if (!fields.length) return this.getById(id);
    values.push(id);
    db.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  },

  delete(id: number): void {
    db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  },
};

// ── Holiday DB ────────────────────────────────────────────────────────────

export const holidayDB = {
  getAll(): Holiday[] {
    return db.prepare('SELECT * FROM holidays ORDER BY date').all() as Holiday[];
  },

  upsert(date: string, name: string): void {
    db
      .prepare('INSERT OR REPLACE INTO holidays (date, name) VALUES (?, ?)')
      .run(date, name);
  },
};

export default db;
