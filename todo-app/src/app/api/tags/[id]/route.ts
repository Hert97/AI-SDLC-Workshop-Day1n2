import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { tagDB } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  const tag = tagDB.findById(id);

  if (!tag || tag.user_id !== session.userId) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  const { name, color } = await request.json();
  if (!name || !color) {
    return NextResponse.json({ error: 'Name and color are required' }, { status: 400 });
  }

  try {
    const updatedTag = tagDB.update(id, name, color);
    return NextResponse.json(updatedTag);
  } catch (error) {
    return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 409 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  const tag = tagDB.findById(id);

  if (!tag || tag.user_id !== session.userId) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  tagDB.delete(id);
  return new NextResponse(null, { status: 204 });
}
