import { NextRequest, NextResponse } from 'next/server';
import { subtaskDB, todoDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const subtask = subtaskDB.getById(Number(id));
  if (!subtask) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const todo = todoDB.getById(subtask.todo_id);
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json() as { title?: string; completed?: boolean };
  subtaskDB.update(Number(id), {
    title: body.title,
    completed: body.completed !== undefined ? (body.completed ? 1 : 0) : undefined,
  });

  return NextResponse.json(subtaskDB.getById(Number(id)));
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const subtask = subtaskDB.getById(Number(id));
  if (!subtask) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const todo = todoDB.getById(subtask.todo_id);
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  subtaskDB.delete(Number(id));
  return NextResponse.json({ success: true });
}
