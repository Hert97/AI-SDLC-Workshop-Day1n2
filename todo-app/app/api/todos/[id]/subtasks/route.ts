import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { subtaskDB, todoDB } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todo = todoDB.findById(Number(id), session.userId);
  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const body = await request.json();
  const title = String(body?.title ?? '').trim();
  if (!title) {
    return NextResponse.json({ error: 'Subtask title is required' }, { status: 422 });
  }

  const subtask = subtaskDB.create(todo.id, title);
  return NextResponse.json({ data: subtask }, { status: 201 });
}
