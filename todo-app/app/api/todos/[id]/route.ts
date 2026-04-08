import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import { getNextRecurrenceDate, toIsoString } from '@/lib/timezone';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todo = todoDB.findById(Number(id), session.userId);
  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  return NextResponse.json({ data: todo });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todoId = Number(id);
  const existing = todoDB.findById(todoId, session.userId);
  if (!existing) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const body = await request.json();
  const updated = todoDB.update(todoId, session.userId, {
    title: body?.title ?? existing.title,
    completed: body?.completed ?? existing.completed,
    priority: body?.priority ?? existing.priority,
    due_date: body?.due_date ?? existing.due_date,
    is_recurring: body?.is_recurring ?? existing.is_recurring,
    recurrence_pattern: body?.recurrence_pattern ?? existing.recurrence_pattern,
    reminder_minutes: body?.reminder_minutes ?? existing.reminder_minutes,
  });

  if (!updated) {
    return NextResponse.json({ error: 'Todo update failed' }, { status: 500 });
  }

  if (!existing.completed && updated.completed && updated.is_recurring && updated.due_date && updated.recurrence_pattern) {
    const nextDue = getNextRecurrenceDate(new Date(updated.due_date), updated.recurrence_pattern);
    todoDB.create({
      user_id: session.userId,
      title: updated.title,
      priority: updated.priority,
      due_date: toIsoString(nextDue),
      is_recurring: true,
      recurrence_pattern: updated.recurrence_pattern,
      reminder_minutes: updated.reminder_minutes,
    });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = todoDB.delete(Number(id), session.userId);
  if (!deleted) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
