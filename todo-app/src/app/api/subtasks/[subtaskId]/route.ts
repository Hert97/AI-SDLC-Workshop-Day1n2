import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { subtaskDB, todoDB } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ subtaskId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { subtaskId: subtaskIdStr } = await params;
  const subtaskId = parseInt(subtaskIdStr, 10);
  const subtask = subtaskDB.findById(subtaskId);

  if (!subtask) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  const todo = todoDB.findById(subtask.todo_id);
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const body = await request.json();
  const updatedSubtask = subtaskDB.update(subtaskId, body);

  return NextResponse.json(updatedSubtask);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ subtaskId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { subtaskId: subtaskIdStr } = await params;
  const subtaskId = parseInt(subtaskIdStr, 10);
  const subtask = subtaskDB.findById(subtaskId);

  if (!subtask) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  const todo = todoDB.findById(subtask.todo_id);
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  subtaskDB.delete(subtaskId);

  return new NextResponse(null, { status: 204 });
}
