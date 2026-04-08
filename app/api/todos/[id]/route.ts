import { NextRequest, NextResponse } from 'next/server';
import { todoDB, tagDB } from '@/lib/db';
import type { Priority, RecurrencePattern } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSingaporeNow, calculateNextDueDate } from '@/lib/timezone';

const VALID_PRIORITIES = ['high', 'medium', 'low'] as const;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.getById(Number(id));
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(todo);
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.getById(Number(id));
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json() as {
    title?: string;
    completed?: boolean;
    due_date?: string | null;
    priority?: Priority;
    is_recurring?: boolean;
    recurrence_pattern?: RecurrencePattern | null;
    reminder_minutes?: number | null;
    tag_ids?: number[];
  };

  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
  }

  if (body.due_date) {
    const minDue = new Date(getSingaporeNow().getTime() + 60_000);
    if (new Date(body.due_date) < minDue) {
      return NextResponse.json({ error: 'Due date must be at least 1 minute in the future' }, { status: 400 });
    }
  }

  // Handle recurring completion: create next occurrence before marking complete
  if (body.completed && !todo.completed && todo.is_recurring && todo.due_date) {
    const nextDue = calculateNextDueDate(todo.due_date, todo.recurrence_pattern!);
    const newTodo = todoDB.create({
      user_id: session.userId,
      title: todo.title,
      due_date: nextDue,
      priority: todo.priority,
      is_recurring: 1,
      recurrence_pattern: todo.recurrence_pattern,
      reminder_minutes: todo.reminder_minutes ?? null,
    });
    // Copy current tags to the new occurrence
    todo.tags.forEach((tag) => tagDB.addToTodo(newTodo.id, tag.id));
  }

  todoDB.update(Number(id), {
    title: body.title,
    completed: body.completed !== undefined ? (body.completed ? 1 : 0) : undefined,
    due_date: body.due_date,
    priority: body.priority,
    is_recurring: body.is_recurring !== undefined ? (body.is_recurring ? 1 : 0) : undefined,
    recurrence_pattern: body.recurrence_pattern,
    reminder_minutes: body.reminder_minutes,
  });

  // Sync tag_ids when provided
  if (body.tag_ids !== undefined) {
    const currentTags = todoDB.getById(Number(id))?.tags ?? [];
    const currentIds = new Set(currentTags.map((t) => t.id));
    const newIds = new Set(body.tag_ids);

    currentIds.forEach((tid) => {
      if (!newIds.has(tid)) tagDB.removeFromTodo(Number(id), tid);
    });
    newIds.forEach((tid) => {
      if (!currentIds.has(tid)) tagDB.addToTodo(Number(id), tid);
    });
  }

  return NextResponse.json(todoDB.getById(Number(id)));
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.getById(Number(id));
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  todoDB.delete(Number(id));
  return NextResponse.json({ success: true });
}
