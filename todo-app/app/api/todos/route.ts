import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTodoTags, todoDB } from '@/lib/db';
import { fromSingaporeLocalString, isAtLeastOneMinuteInFuture } from '@/lib/timezone';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const todos = todoDB.listByUser(session.userId).map((todo) => ({
    ...todo,
    tag_ids: getTodoTags(todo.id),
  }));
  return NextResponse.json({ data: todos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const title = String(body?.title ?? '').trim();
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 422 });
  }

  const dueDateRaw = body?.due_date ? String(body.due_date) : null;
  if (dueDateRaw) {
    const parsed = fromSingaporeLocalString(dueDateRaw);
    if (!isAtLeastOneMinuteInFuture(parsed)) {
      return NextResponse.json({ error: 'Due date must be at least 1 minute in the future' }, { status: 422 });
    }
  }

  const todo = todoDB.create({
    user_id: session.userId,
    title,
    priority: body?.priority,
    due_date: dueDateRaw,
    is_recurring: Boolean(body?.is_recurring),
    recurrence_pattern: body?.recurrence_pattern ?? null,
    reminder_minutes: body?.reminder_minutes ?? null,
  });

  return NextResponse.json({ data: todo }, { status: 201 });
}
