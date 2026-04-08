import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const updated = templateDB.update(Number(id), session.userId, {
    name: body?.name,
    description: body?.description,
    category: body?.category,
    title_template: body?.title_template,
    priority: body?.priority,
    is_recurring: body?.is_recurring,
    recurrence_pattern: body?.recurrence_pattern,
    reminder_minutes: body?.reminder_minutes,
    subtasks_json: body?.subtasks_json,
  });

  if (!updated) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const deleted = templateDB.delete(Number(id), session.userId);
  if (!deleted) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
