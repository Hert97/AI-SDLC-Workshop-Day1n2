import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { subtaskDB } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { id } = await params;
  const updated = subtaskDB.update(Number(id), {
    title: body?.title,
    completed: body?.completed,
    position: body?.position,
  });

  if (!updated) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const deleted = subtaskDB.delete(Number(id));
  if (!deleted) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
