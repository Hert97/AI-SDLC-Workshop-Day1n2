import { NextRequest, NextResponse } from 'next/server';
import { todoDB, tagDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.getById(Number(id));
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json() as { tag_id?: number };
  if (!body.tag_id) {
    return NextResponse.json({ error: 'tag_id is required' }, { status: 400 });
  }

  tagDB.addToTodo(Number(id), body.tag_id);
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.getById(Number(id));
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json() as { tag_id?: number };
  if (!body.tag_id) {
    return NextResponse.json({ error: 'tag_id is required' }, { status: 400 });
  }

  tagDB.removeFromTodo(Number(id), body.tag_id);
  return NextResponse.json({ success: true });
}
