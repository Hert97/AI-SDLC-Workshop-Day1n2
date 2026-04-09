import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { tagDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const tags = tagDB.findAllByUserId(session.userId);
  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { name, color } = await request.json();
  if (!name || !color) {
    return NextResponse.json({ error: 'Name and color are required' }, { status: 400 });
  }

  try {
    const newTag = tagDB.create(session.userId, name, color);
    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 409 });
  }
}
