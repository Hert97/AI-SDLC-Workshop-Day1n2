import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB, todoDB } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.findById(Number(id), session.userId);
  if (!todo) return NextResponse.json({ error: 'Todo not found' }, { status: 404 });

  const body = await request.json();
  const tagId = Number(body?.tagId);
  if (!tagId) return NextResponse.json({ error: 'tagId is required' }, { status: 422 });

  tagDB.addTagToTodo(todo.id, tagId);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.findById(Number(id), session.userId);
  if (!todo) return NextResponse.json({ error: 'Todo not found' }, { status: 404 });

  const body = await request.json();
  const tagId = Number(body?.tagId);
  if (!tagId) return NextResponse.json({ error: 'tagId is required' }, { status: 422 });

  tagDB.removeTagFromTodo(todo.id, tagId);
  return NextResponse.json({ success: true });
}
