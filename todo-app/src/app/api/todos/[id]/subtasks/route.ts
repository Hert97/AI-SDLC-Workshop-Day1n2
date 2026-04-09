import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { todoDB, subtaskDB } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id: idStr } = await params;
  const todoId = parseInt(idStr, 10);
  const todo = todoDB.findById(todoId);

  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const { title } = await request.json();
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const newSubtask = subtaskDB.create(todoId, title);
  return NextResponse.json(newSubtask, { status: 201 });
}
