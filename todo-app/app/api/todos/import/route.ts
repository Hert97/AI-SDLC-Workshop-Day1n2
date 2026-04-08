import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { rawDb, tagDB, todoDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  if (!body || typeof body !== 'object' || !Array.isArray(body.todos)) {
    return NextResponse.json({ error: 'Invalid import payload' }, { status: 422 });
  }

  const todoIdMap = new Map<number, number>();
  const tagIdMap = new Map<number, number>();

  const tx = rawDb.transaction(() => {
    const tags = Array.isArray(body.tags) ? body.tags : [];
    tags.forEach((t: { id: number; name: string; color: string }) => {
      const existing = tagDB.listByUser(session.userId).find((x) => x.name === t.name);
      const tag = existing ?? tagDB.create(session.userId, t.name, t.color || '#3B82F6');
      tagIdMap.set(Number(t.id), tag.id);
    });

    body.todos.forEach((todo: { id: number; title: string; priority?: 'high' | 'medium' | 'low'; due_date?: string | null; is_recurring?: boolean; recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null; reminder_minutes?: number | null; completed?: boolean }) => {
      const created = todoDB.create({
        user_id: session.userId,
        title: todo.title,
        priority: todo.priority ?? 'medium',
        due_date: todo.due_date ?? null,
        is_recurring: Boolean(todo.is_recurring),
        recurrence_pattern: todo.recurrence_pattern ?? null,
        reminder_minutes: todo.reminder_minutes ?? null,
      });
      if (todo.completed) {
        todoDB.update(created.id, session.userId, { completed: true });
      }
      todoIdMap.set(Number(todo.id), created.id);
    });

    const subtasks = Array.isArray(body.subtasks) ? body.subtasks : [];
    subtasks.forEach((s: { todo_id: number; title: string; completed?: boolean; position?: number }) => {
      const newTodoId = todoIdMap.get(Number(s.todo_id));
      if (!newTodoId) return;
      rawDb
        .prepare('INSERT INTO subtasks (todo_id, title, completed, position) VALUES (?, ?, ?, ?)')
        .run(newTodoId, s.title, s.completed ? 1 : 0, s.position ?? 0);
    });

    const links = Array.isArray(body.todo_tags) ? body.todo_tags : [];
    links.forEach((link: { todo_id: number; tag_id: number }) => {
      const newTodoId = todoIdMap.get(Number(link.todo_id));
      const newTagId = tagIdMap.get(Number(link.tag_id));
      if (!newTodoId || !newTagId) return;
      rawDb.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)').run(newTodoId, newTagId);
    });
  });

  tx();

  return NextResponse.json({
    success: true,
    imported: {
      todos: body.todos.length,
      subtasks: Array.isArray(body.subtasks) ? body.subtasks.length : 0,
      tags: Array.isArray(body.tags) ? body.tags.length : 0,
    },
  });
}
