import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  const color = String(body?.color ?? '#3B82F6');
  if (!name) return NextResponse.json({ error: 'Tag name is required' }, { status: 422 });

  const updated = tagDB.update(Number(id), session.userId, name, color);
  if (!updated) return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const deleted = tagDB.delete(Number(id), session.userId);
  if (!deleted) return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
