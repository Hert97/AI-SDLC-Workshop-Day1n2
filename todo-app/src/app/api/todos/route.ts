import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { todoDB } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const todos = todoDB.findAllByUserId(session.userId);
  return NextResponse.json(todos);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { title, due_date, priority, tags } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const newTodo = todoDB.create({
    user_id: session.userId,
    title,
    due_date,
    priority,
    is_recurring: 0,
    created_at: getSingaporeNow().toISOString(),
  }, tags);

  return NextResponse.json(newTodo, { status: 201 });
}
