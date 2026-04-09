import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { todoDB, RecurrencePattern } from '@/lib/db';
import { getSingaporeNow, calculateNextDueDate } from '@/lib/timezone';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  const todo = todoDB.findById(id);

  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const body = await request.json();

  // Handle recurring todo completion
  if (body.completed && todo.is_recurring && todo.recurrence_pattern && todo.due_date) {
    const nextDueDate = calculateNextDueDate(todo.due_date, todo.recurrence_pattern);
    if (nextDueDate) {
      todoDB.create({
        ...todo,
        due_date: nextDueDate.toISOString(),
        created_at: getSingaporeNow().toISOString(),
      }, todo.tags?.map(t => t.id) || []);
    }
  }

  const updatedTodo = todoDB.update(id, body);

  return NextResponse.json(updatedTodo);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  const todo = todoDB.findById(id);

  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  todoDB.delete(id);

  return new NextResponse(null, { status: 204 });
}
