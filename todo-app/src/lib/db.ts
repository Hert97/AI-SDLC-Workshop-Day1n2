import Database from 'better-sqlite3';
import { getSingaporeNow } from './timezone';

const db = new Database('todos.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    current_challenge TEXT
  );

  CREATE TABLE IF NOT EXISTS authenticators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    credential_id TEXT UNIQUE,
    credential_public_key TEXT,
    counter INTEGER,
    transports TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    due_date TEXT,
    priority TEXT DEFAULT 'medium',
    is_recurring INTEGER DEFAULT 0,
    recurrence_pattern TEXT,
    reminder_minutes INTEGER,
    created_at TEXT,
    completed_at TEXT,
    last_notification_sent TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    position INTEGER,
    FOREIGN KEY (todo_id) REFERENCES todos (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    UNIQUE(user_id, name),
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS todo_tags (
    todo_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (todo_id, tag_id),
    FOREIGN KEY (todo_id) REFERENCES todos (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    title_template TEXT NOT NULL,
    priority TEXT,
    is_recurring INTEGER,
    recurrence_pattern TEXT,
    reminder_minutes INTEGER,
    subtasks_json TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL UNIQUE,
    description TEXT,
    recurring INTEGER NOT NULL DEFAULT 0
  );
`);

// Migrations for existing databases
try { db.exec(`ALTER TABLE holidays ADD COLUMN description TEXT`); } catch {}
try { db.exec(`ALTER TABLE holidays ADD COLUMN recurring INTEGER NOT NULL DEFAULT 0`); } catch {}

// Interfaces
export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface User {
  id: number;
  username: string;
  current_challenge?: string;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;
  credential_public_key: string;
  counter: number;
  transports: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: number;
  due_date?: string;
  priority: Priority;
  is_recurring: number;
  recurrence_pattern?: RecurrencePattern;
  reminder_minutes?: number;
  created_at: string;
  completed_at?: string;
  last_notification_sent?: string;
  tags?: Tag[];
  subtasks?: Subtask[];
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: number;
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
  description?: string;
  category?: string;
  title_template: string;
  priority?: Priority;
  is_recurring?: number;
  recurrence_pattern?: RecurrencePattern;
  reminder_minutes?: number;
  subtasks_json?: string;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  description?: string;
  recurring: number;
}

// Database operations
export const userDB = {
  findByUsername: (username: string): User | undefined => {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as User | undefined;
  },
  create: (username: string): User => {
    const stmt = db.prepare('INSERT INTO users (username) VALUES (?)');
    const result = stmt.run(username);
    return { id: result.lastInsertRowid as number, username };
  },
  updateChallenge: (userId: number, challenge: string): void => {
    const stmt = db.prepare('UPDATE users SET current_challenge = ? WHERE id = ?');
    stmt.run(challenge, userId);
  },
  findUserById: (userId: number): User | undefined => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(userId) as User | undefined;
  },
  findAuthenticatorByCredentialId: (credentialId: string): Authenticator | undefined => {
    const stmt = db.prepare('SELECT * FROM authenticators WHERE credential_id = ?');
    return stmt.get(credentialId) as Authenticator | undefined;
  },
  createAuthenticator: (authenticator: Omit<Authenticator, 'id'>): void => {
    const stmt = db.prepare('INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter, transports) VALUES (?, ?, ?, ?, ?)');
    stmt.run(authenticator.user_id, authenticator.credential_id, authenticator.credential_public_key, authenticator.counter, authenticator.transports);
  },
  findAuthenticatorsByUserId: (userId: number): Authenticator[] => {
    const stmt = db.prepare('SELECT * FROM authenticators WHERE user_id = ?');
    return stmt.all(userId) as Authenticator[];
  },
  updateAuthenticatorCounter: (authenticatorId: number, newCounter: number): void => {
    const stmt = db.prepare('UPDATE authenticators SET counter = ? WHERE id = ?');
    stmt.run(newCounter, authenticatorId);
  }
};

export const todoDB = {
  findAllByUserId: (userId: number): Todo[] => {
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE user_id = ? 
      ORDER BY 
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END, 
        due_date, 
        created_at DESC
    `);
    const todos = stmt.all(userId) as Todo[];
    return todos.map(todo => ({
      ...todo,
      tags: tagDB.findAllByTodoId(todo.id),
      subtasks: subtaskDB.findAllByTodoId(todo.id),
    }));
  },
  findById: (id: number): Todo | undefined => {
    const stmt = db.prepare('SELECT * FROM todos WHERE id = ?');
    const todo = stmt.get(id) as Todo | undefined;
    if (todo) {
      return {
        ...todo,
        tags: tagDB.findAllByTodoId(todo.id),
        subtasks: subtaskDB.findAllByTodoId(todo.id),
      };
    }
    return undefined;
  },
  create: (todo: Omit<Todo, 'id' | 'completed' | 'tags' | 'subtasks'>, tagIds: number[] = []): Todo => {
    const { user_id, title, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes, created_at } = todo;
    const stmt = db.prepare('INSERT INTO todos (user_id, title, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(user_id, title, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes, created_at);
    const newTodoId = result.lastInsertRowid as number;

    if (tagIds.length > 0) {
      const tagStmt = db.prepare('INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
      for (const tagId of tagIds) {
        tagStmt.run(newTodoId, tagId);
      }
    }
    
    return todoDB.findById(newTodoId)!;
  },
  update: (id: number, data: Partial<Omit<Todo, 'id' | 'user_id' | 'created_at'>>): Todo => {
    const { title, completed, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes, completed_at, tags } = data;
    
    if (title !== undefined) db.prepare('UPDATE todos SET title = ? WHERE id = ?').run(title, id);
    if (completed !== undefined) db.prepare('UPDATE todos SET completed = ? WHERE id = ?').run(completed, id);
    if (due_date !== undefined) db.prepare('UPDATE todos SET due_date = ? WHERE id = ?').run(due_date, id);
    if (priority !== undefined) db.prepare('UPDATE todos SET priority = ? WHERE id = ?').run(priority, id);
    if (is_recurring !== undefined) db.prepare('UPDATE todos SET is_recurring = ? WHERE id = ?').run(is_recurring, id);
    if (recurrence_pattern !== undefined) db.prepare('UPDATE todos SET recurrence_pattern = ? WHERE id = ?').run(recurrence_pattern, id);
    if (reminder_minutes !== undefined) db.prepare('UPDATE todos SET reminder_minutes = ? WHERE id = ?').run(reminder_minutes, id);
    if (completed_at !== undefined) db.prepare('UPDATE todos SET completed_at = ? WHERE id = ?').run(completed_at, id);

    if (tags !== undefined) {
      db.prepare('DELETE FROM todo_tags WHERE todo_id = ?').run(id);
      const tagStmt = db.prepare('INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
      for (const tag of tags) {
        tagStmt.run(id, tag.id);
      }
    }

    return todoDB.findById(id)!;
  },
  delete: (id: number): void => {
    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  },
  createSubtask: (todoId: number, title: string): Subtask => {
    return subtaskDB.create(todoId, title);
  },
  findTodosForNotification: (userId: number, now: string): Todo[] => {
    const stmt = db.prepare(`
      SELECT * FROM todos
      WHERE user_id = ? 
      AND completed = 0 
      AND reminder_minutes IS NOT NULL 
      AND due_date IS NOT NULL
      AND datetime(due_date, '-' || reminder_minutes || ' minutes') <= ?
    `);
    return stmt.all(userId, now) as Todo[];
  }
};

export const subtaskDB = {
  findAllByTodoId: (todoId: number): Subtask[] => {
    const stmt = db.prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position');
    return stmt.all(todoId) as Subtask[];
  },
  findById: (id: number): Subtask | undefined => {
    const stmt = db.prepare('SELECT * FROM subtasks WHERE id = ?');
    return stmt.get(id) as Subtask | undefined;
  },
  create: (todoId: number, title: string): Subtask => {
    const posStmt = db.prepare('SELECT MAX(position) as max_pos FROM subtasks WHERE todo_id = ?');
    const { max_pos } = posStmt.get(todoId) as { max_pos: number | null };
    const position = (max_pos ?? -1) + 1;

    const stmt = db.prepare('INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)');
    const result = stmt.run(todoId, title, position);
    return { id: result.lastInsertRowid as number, todo_id: todoId, title, completed: 0, position };
  },
  update: (id: number, data: Partial<Omit<Subtask, 'id' | 'todo_id'>>): Subtask => {
    if (data.completed !== undefined) {
      db.prepare('UPDATE subtasks SET completed = ? WHERE id = ?').run(data.completed, id);
    }
    if (data.title !== undefined) {
      db.prepare('UPDATE subtasks SET title = ? WHERE id = ?').run(data.title, id);
    }
    return subtaskDB.findById(id)!;
  },
  delete: (id: number): void => {
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  }
};

export const tagDB = {
  findAllByUserId: (userId: number): Tag[] => {
    const stmt = db.prepare('SELECT * FROM tags WHERE user_id = ?');
    return stmt.all(userId) as Tag[];
  },
  findAllByTodoId: (todoId: number): Tag[] => {
    const stmt = db.prepare(`
      SELECT t.* FROM tags t
      JOIN todo_tags tt ON t.id = tt.tag_id
      WHERE tt.todo_id = ?
    `);
    return stmt.all(todoId) as Tag[];
  },
  findById: (id: number): Tag | undefined => {
    const stmt = db.prepare('SELECT * FROM tags WHERE id = ?');
    return stmt.get(id) as Tag | undefined;
  },
  create: (userId: number, name: string, color: string): Tag => {
    const stmt = db.prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)');
    const result = stmt.run(userId, name, color);
    return { id: result.lastInsertRowid as number, user_id: userId, name, color };
  },
  update: (id: number, name: string, color: string): Tag => {
    const stmt = db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?');
    stmt.run(name, color, id);
    return tagDB.findById(id)!;
  },
  delete: (id: number): void => {
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  }
};

export const templateDB = {
  findAllByUserId: (userId: number): Template[] => {
    const stmt = db.prepare('SELECT * FROM templates WHERE user_id = ?');
    return stmt.all(userId) as Template[];
  },
  findById: (id: number): Template | undefined => {
    const stmt = db.prepare('SELECT * FROM templates WHERE id = ?');
    return stmt.get(id) as Template | undefined;
  },
  create: (userId: number, template: Omit<Template, 'id' | 'user_id'>): Template => {
    const { name, description, category, title_template, priority, is_recurring, recurrence_pattern, reminder_minutes, subtasks_json } = template;
    const stmt = db.prepare('INSERT INTO templates (user_id, name, description, category, title_template, priority, is_recurring, recurrence_pattern, reminder_minutes, subtasks_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(userId, name, description, category, title_template, priority, is_recurring, recurrence_pattern, reminder_minutes, subtasks_json);
    return { id: result.lastInsertRowid as number, user_id: userId, ...template };
  },
  delete: (id: number): void => {
    db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  }
};

export const holidayDB = {
  findAll: (): Holiday[] => {
    const stmt = db.prepare('SELECT * FROM holidays');
    return stmt.all() as Holiday[];
  },
  create: (name: string, date: string, description?: string, recurring?: boolean): void => {
    const stmt = db.prepare('INSERT OR IGNORE INTO holidays (name, date, description, recurring) VALUES (?, ?, ?, ?)');
    stmt.run(name, date, description ?? null, recurring ? 1 : 0);
  },
  update: (id: number, name: string, date: string, description?: string, recurring?: boolean): void => {
    const stmt = db.prepare('UPDATE holidays SET name = ?, date = ?, description = ?, recurring = ? WHERE id = ?');
    stmt.run(name, date, description ?? null, recurring ? 1 : 0, id);
  },
  deleteById: (id: number): void => {
    const stmt = db.prepare('DELETE FROM holidays WHERE id = ?');
    stmt.run(id);
  },
};

export default db;
