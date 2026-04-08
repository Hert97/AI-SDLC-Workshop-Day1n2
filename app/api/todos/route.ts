import { NextRequest, NextResponse } from 'next/server';
import { todoDB, tagDB } from '@/lib/db';
import type { Priority, RecurrencePattern } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSingaporeNow } from '@/lib/timezone';

const VALID_PRIORITIES = ['high', 'medium', 'low'] as const;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const todos = todoDB.getAll(session.userId);
  return NextResponse.json(todos);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json() as {
    title?: string;
    due_date?: string | null;
    priority?: Priority;
    is_recurring?: boolean;
    recurrence_pattern?: RecurrencePattern | null;
    reminder_minutes?: number | null;
    tag_ids?: number[];
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
  }

  if (body.due_date) {
    const minDue = new Date(getSingaporeNow().getTime() + 60_000);
    if (new Date(body.due_date) < minDue) {
      return NextResponse.json({ error: 'Due date must be at least 1 minute in the future' }, { status: 400 });
    }
  }

  if (body.is_recurring && !body.due_date) {
    return NextResponse.json({ error: 'Recurring todos must have a due date' }, { status: 400 });
  }

  const todo = todoDB.create({
    user_id: session.userId,
    title: body.title,
    due_date: body.due_date ?? null,
    priority: body.priority ?? 'medium',
    is_recurring: body.is_recurring ? 1 : 0,
    recurrence_pattern: body.is_recurring ? (body.recurrence_pattern ?? null) : null,
    reminder_minutes: body.reminder_minutes ?? null,
  });

  // Assign tags
  if (body.tag_ids?.length) {
    body.tag_ids.forEach((tagId) => tagDB.addToTodo(todo.id, tagId));
  }

  return NextResponse.json(todoDB.getById(todo.id), { status: 201 });
}
