import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  return NextResponse.json({ data: templateDB.listByUser(session.userId) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Template name is required' }, { status: 422 });

  const created = templateDB.create(session.userId, {
    name,
    description: body?.description ?? null,
    category: body?.category ?? null,
    title_template: body?.title_template ?? name,
    priority: body?.priority ?? 'medium',
    is_recurring: Boolean(body?.is_recurring),
    recurrence_pattern: body?.recurrence_pattern ?? null,
    reminder_minutes: body?.reminder_minutes ?? null,
    subtasks_json: JSON.stringify(body?.subtasks ?? []),
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
