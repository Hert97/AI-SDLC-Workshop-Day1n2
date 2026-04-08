import { NextRequest, NextResponse } from 'next/server';
import { tagDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const tag = tagDB.getById(Number(id));
  if (!tag || tag.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json() as { name?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const allTags = tagDB.getAll(session.userId);
  const existing = allTags.find(
    (t) => t.name.toLowerCase() === body.name!.trim().toLowerCase() && t.id !== Number(id)
  );
  if (existing) {
    return NextResponse.json({ error: 'Tag name already exists' }, { status: 409 });
  }

  tagDB.update(Number(id), { name: body.name.trim() });
  return NextResponse.json(tagDB.getById(Number(id)));
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const tag = tagDB.getById(Number(id));
  if (!tag || tag.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  tagDB.delete(Number(id));
  return NextResponse.json({ success: true });
}
