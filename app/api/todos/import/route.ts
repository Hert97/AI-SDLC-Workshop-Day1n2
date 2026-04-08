import { NextRequest, NextResponse } from 'next/server';
import { todoDB, subtaskDB, tagDB } from '@/lib/db';
import type { Priority, RecurrencePattern } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface ImportSubtask {
  title: string;
  completed?: boolean;
  position?: number;
}

interface ImportTodo {
  title?: string;
  completed?: boolean;
  priority?: Priority;
  due_date?: string | null;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
  subtasks?: ImportSubtask[];
  tags?: string[];
}

interface ImportPayload {
  todos?: ImportTodo[];
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json() as ImportPayload;
  if (!Array.isArray(body.todos)) {
    return NextResponse.json({ error: 'Invalid import format: expected { todos: [...] }' }, { status: 400 });
  }

  const VALID_PRIORITIES = new Set(['high', 'medium', 'low']);
  let imported = 0;

  for (const item of body.todos) {
    if (!item.title?.trim()) continue;
    if (item.priority && !VALID_PRIORITIES.has(item.priority)) continue;

    const todo = todoDB.create({
      user_id: session.userId,
      title: item.title.trim(),
      due_date: item.due_date ?? null,
      priority: item.priority ?? 'medium',
      is_recurring: item.is_recurring ? 1 : 0,
      recurrence_pattern: item.recurrence_pattern ?? null,
      reminder_minutes: item.reminder_minutes ?? null,
    });

    if (item.completed) {
      todoDB.update(todo.id, { completed: 1 });
    }

    if (Array.isArray(item.subtasks)) {
      item.subtasks.forEach((s, idx) => {
        if (!s.title?.trim()) return;
        const sub = subtaskDB.create(todo.id, s.title.trim(), s.position ?? idx);
        if (s.completed) subtaskDB.update(sub.id, { completed: 1 });
      });
    }

    if (Array.isArray(item.tags)) {
      item.tags.forEach((tagName) => {
        if (!tagName?.trim()) return;
        const allTags = tagDB.getAll(session.userId);
        let tag = allTags.find((t) => t.name.toLowerCase() === tagName.trim().toLowerCase());
        if (!tag) tag = tagDB.create(session.userId, tagName.trim(), '#3B82F6');
        tagDB.addToTodo(todo.id, tag.id);
      });
    }

    imported++;
  }

  return NextResponse.json({ imported }, { status: 201 });
}
