import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  return NextResponse.json({ data: tagDB.listByUser(session.userId) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  const color = String(body?.color ?? '#3B82F6');
  if (!name) return NextResponse.json({ error: 'Tag name is required' }, { status: 422 });

  try {
    const tag = tagDB.create(session.userId, name, color);
    return NextResponse.json({ data: tag }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Tag name already exists' }, { status: 409 });
  }
}
