import { NextRequest, NextResponse } from 'next/server';
import { tagDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const tags = tagDB.getAll(session.userId);
  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json() as { name?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const allTags = tagDB.getAll(session.userId);
  const existing = allTags.find((t) => t.name.toLowerCase() === body.name!.trim().toLowerCase());
  if (existing) {
    return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
  }

  const tag = tagDB.create(session.userId, body.name.trim(), '#3B82F6');
  return NextResponse.json(tag, { status: 201 });
}
